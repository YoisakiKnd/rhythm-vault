import { z } from 'zod';
import { fetchWithPolicy, readJson } from './http';
import { buildAuthorizeUrl, postTokenForm, UpstreamError, type OAuthConfig, type TokenResponse } from './oauth';

export const DF_AUTH = 'https://auth.diving-fish.com';
export const DF_API = 'https://www.diving-fish.com/api';

export type DFGame = 'maimai' | 'chunithm';

const PROBER: Record<DFGame, string> = { maimai: 'maimaidxprober', chunithm: 'chunithmprober' };

interface DfEndpoints {
	authorization_endpoint: string;
	token_endpoint: string;
	userinfo_endpoint: string;
	revocation_endpoint: string;
}

const DF_ENDPOINTS_FALLBACK: DfEndpoints = {
	authorization_endpoint: `${DF_AUTH}/oauth/authorize`,
	token_endpoint: `${DF_AUTH}/oauth/token`,
	userinfo_endpoint: `${DF_AUTH}/oauth/userinfo`,
	revocation_endpoint: `${DF_AUTH}/oauth/revoke`
};

let dfEndpointsCache: DfEndpoints | null = null;

/** 发现文档缓存；失败时回落到硬编码路径 */
export async function divingFishEndpoints(): Promise<DfEndpoints> {
	if (dfEndpointsCache) return dfEndpointsCache;
	try {
		const res = await fetchWithPolicy(`${DF_AUTH}/.well-known/oauth-authorization-server`);
		if (res.ok) {
			const body = (await res.json()) as Partial<DfEndpoints>;
			dfEndpointsCache = {
				authorization_endpoint: body.authorization_endpoint ?? DF_ENDPOINTS_FALLBACK.authorization_endpoint,
				token_endpoint: body.token_endpoint ?? DF_ENDPOINTS_FALLBACK.token_endpoint,
				userinfo_endpoint: body.userinfo_endpoint ?? DF_ENDPOINTS_FALLBACK.userinfo_endpoint,
				revocation_endpoint: body.revocation_endpoint ?? DF_ENDPOINTS_FALLBACK.revocation_endpoint
			};
			return dfEndpointsCache;
		}
	} catch {
		/* 发现失败用回落 */
	}
	dfEndpointsCache = DF_ENDPOINTS_FALLBACK;
	return dfEndpointsCache;
}

/**
 * 水鱼账号 OAuth：PKCE 强制（不接受 plain），授权码 60s 一次性。
 * 业务侧优先 on-behalf-of 换票，不再依赖 refresh token 轮换。
 */
export async function divingFishAuthorizeUrl(
	cfg: OAuthConfig,
	p: { state: string; codeChallenge: string; scope?: string }
): Promise<string> {
	const ep = await divingFishEndpoints();
	return buildAuthorizeUrl(ep.authorization_endpoint, {
		response_type: 'code',
		client_id: cfg.clientId,
		redirect_uri: cfg.redirectUri,
		scope: p.scope ?? 'openid profile prober.records.read chunithm.records.read',
		state: p.state,
		code_challenge: p.codeChallenge,
		code_challenge_method: 'S256'
	});
}

export async function divingFishExchangeToken(
	cfg: OAuthConfig,
	p: { code: string; codeVerifier: string }
): Promise<TokenResponse> {
	const ep = await divingFishEndpoints();
	return postTokenForm(ep.token_endpoint, {
		grant_type: 'authorization_code',
		code: p.code,
		redirect_uri: cfg.redirectUri,
		client_id: cfg.clientId,
		code_verifier: p.codeVerifier,
		...(cfg.clientSecret ? { client_secret: cfg.clientSecret } : {})
	});
}

export async function divingFishRefreshToken(cfg: OAuthConfig, refreshToken: string): Promise<TokenResponse> {
	const ep = await divingFishEndpoints();
	return postTokenForm(ep.token_endpoint, {
		grant_type: 'refresh_token',
		refresh_token: refreshToken,
		client_id: cfg.clientId,
		...(cfg.clientSecret ? { client_secret: cfg.clientSecret } : {})
	});
}

/** 服务端用 client_secret + 用户标识换短期令牌，响应不含 refresh token */
export async function divingFishOnBehalfOf(cfg: OAuthConfig, subject: string): Promise<TokenResponse> {
	if (!cfg.clientSecret) throw new UpstreamError('on-behalf-of 需要 client_secret', 500);
	const ep = await divingFishEndpoints();
	return postTokenForm(ep.token_endpoint, {
		grant_type: 'urn:diving-fish:params:oauth:grant-type:on-behalf-of',
		client_id: cfg.clientId,
		client_secret: cfg.clientSecret,
		subject
	});
}

export interface DivingFishUserinfo {
	sub: string;
	preferred_username?: string;
}

export async function divingFishUserinfo(accessToken: string): Promise<DivingFishUserinfo> {
	const ep = await divingFishEndpoints();
	const res = await fetchWithPolicy(ep.userinfo_endpoint, {
		headers: { Authorization: `Bearer ${accessToken}` }
	});
	if (!res.ok) throw new UpstreamError(`userinfo 请求失败: ${res.status}`, res.status);
	const body = (await res.json()) as { sub?: string; preferred_username?: string };
	if (!body.sub) throw new UpstreamError('userinfo 缺少 sub', 502);
	return { sub: body.sub, preferred_username: body.preferred_username };
}

export async function divingFishRevoke(cfg: OAuthConfig, token: string): Promise<void> {
	const ep = await divingFishEndpoints();
	const res = await fetchWithPolicy(ep.revocation_endpoint, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			token,
			client_id: cfg.clientId,
			...(cfg.clientSecret ? { client_secret: cfg.clientSecret } : {})
		})
	});
	if (!res.ok && res.status !== 200) {
		throw new UpstreamError(`revoke 失败: ${res.status}`, res.status);
	}
}

/** 全量曲库（公开端点，支持 ETag） */
export async function divingFishMusicData(
	game: DFGame,
	etag?: string
): Promise<{ status: 200 | 304; data?: unknown[]; etag?: string }> {
	const res = await fetchWithPolicy(`${DF_API}/${PROBER[game]}/music_data`, {
		headers: etag ? { 'If-None-Match': etag } : {}
	});
	if (res.status === 304) return { status: 304 };
	if (!res.ok) throw new UpstreamError(`music_data 请求失败: ${res.status}`, res.status);
	return { status: 200, data: await readJson<unknown[]>(res), etag: res.headers.get('etag') ?? undefined };
}

export class PrivacyForbiddenError extends UpstreamError {
	constructor(message: string) {
		super(message, 403);
		this.name = 'PrivacyForbiddenError';
	}
}

const jsonRecord = z.record(z.string(), z.unknown());

function parseDf<T>(schema: z.ZodType<T>, body: unknown, label: string): T {
	const parsed = schema.safeParse(body);
	if (!parsed.success) {
		const issue = parsed.error.issues[0];
		const path = issue?.path.length ? issue.path.join('.') : '';
		throw new UpstreamError(
			`${label} 响应结构不符${path ? `（${path}）` : ''}: ${issue?.message ?? 'unknown'}`,
			502
		);
	}
	return parsed.data;
}

/**
 * 解包水鱼 OAuth `/player/records`：
 * maimai 的 records 是数组；chunithm 的 records 是 `{ best, r10 }`（r10 已废弃）。
 */
export function unpackDivingFishPlayerRecords(
	game: DFGame,
	body: unknown
): Record<string, unknown>[] {
	if (game === 'maimai') {
		return parseDf(
			z.object({ records: z.array(jsonRecord) }),
			body,
			'水鱼 maimai player/records'
		).records;
	}
	return parseDf(
		z.object({ records: z.object({ best: z.array(jsonRecord), r10: z.array(z.unknown()).optional() }) }),
		body,
		'水鱼 chunithm player/records'
	).records.best;
}

/**
 * 解包水鱼公开 `/query/player`：
 * maimai 实际是 `charts.sd` + `charts.dx`（源码 query_player）；文档写的 records 数组作兼容。
 * chunithm 的 records 是 `{ b30, n20, r10 }`（r10 已废弃）。
 */
export function unpackDivingFishQueryPlayer(game: DFGame, body: unknown): Record<string, unknown>[] {
	if (game === 'maimai') {
		const parsed = parseDf(
			z.object({
				records: z.array(jsonRecord).optional(),
				charts: z
					.object({
						sd: z.array(jsonRecord).optional(),
						dx: z.array(jsonRecord).optional()
					})
					.optional()
			}),
			body,
			'水鱼 maimai query/player'
		);
		const fromCharts = [...(parsed.charts?.sd ?? []), ...(parsed.charts?.dx ?? [])];
		if (fromCharts.length > 0) return fromCharts;
		if (parsed.records) return parsed.records;
		if (parsed.charts) return [];
		throw new UpstreamError('水鱼 maimai query/player 缺少 charts 或 records', 502);
	}
	const { b30, n20 } = parseDf(
		z.object({
			records: z.object({
				b30: z.array(jsonRecord).optional().default([]),
				n20: z.array(jsonRecord).optional().default([]),
				r10: z.array(z.unknown()).optional()
			})
		}),
		body,
		'水鱼 chunithm query/player'
	).records;
	return [...b30, ...n20];
}

/**
 * 公开 b50 / b30+n20 查询（无需鉴权，但要求对方在水鱼侧同意用户协议并允许第三方查询）。
 * 返回体里的 `records` 已被解包为成绩数组（中二合并 b30+n20）。
 */
export async function divingFishQueryPlayer(
	game: DFGame,
	body: { username?: string; qq?: string; b50?: boolean; b30?: boolean }
): Promise<Record<string, unknown>> {
	const res = await fetchWithPolicy(`${DF_API}/${PROBER[game]}/query/player`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	if (res.status === 403) {
		throw new PrivacyForbiddenError('对方未在水鱼查分器同意用户协议或关闭了第三方查询');
	}
	if (!res.ok) throw new UpstreamError(`query/player 请求失败: ${res.status}`, res.status);
	const raw: unknown = await res.json();
	const records = unpackDivingFishQueryPlayer(game, raw);
	return {
		...(typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {}),
		records
	};
}

/** 完整成绩（需 OAuth Bearer，scope: prober.records.read / chunithm.records.read） */
export async function divingFishPlayerRecords(
	game: DFGame,
	accessToken: string,
	filter?: Record<string, string>
): Promise<Record<string, unknown>[]> {
	const url = new URL(`${DF_API}/${PROBER[game]}/player/records`);
	if (filter) for (const [k, v] of Object.entries(filter)) url.searchParams.set(k, v);
	const res = await fetchWithPolicy(url, { headers: { Authorization: `Bearer ${accessToken}` } });
	if (!res.ok) throw new UpstreamError(`player/records 请求失败: ${res.status}`, res.status);
	return unpackDivingFishPlayerRecords(game, await res.json());
}
