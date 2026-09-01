import { getDb, linkedAccounts, and, eq } from '@rhythm-vault/db';
import {
	divingFishAuthorizeUrl,
	divingFishExchangeToken,
	divingFishOnBehalfOf,
	divingFishQueryPlayer,
	divingFishRefreshToken,
	divingFishRevoke,
	divingFishUserinfo,
	generatePkce,
	lxnsAuthorizeUrl,
	lxnsChunithmPlayer,
	lxnsDeveloperToken,
	lxnsExchangeToken,
	lxnsFriendCode,
	lxnsMaimaiPlayer,
	lxnsPlayerByFriendCode,
	lxnsPlayerName,
	lxnsRefreshToken,
	PrivacyForbiddenError,
	randomToken,
	UpstreamError,
	vaRecords
} from '@rhythm-vault/adapters';
import type { TokenResponse } from '@rhythm-vault/adapters';
import { ENCRYPTION_KEY_DENY, assertEncryptionKey, getAppConfig } from './config';
import { decryptSecret, encryptSecret, safeEqual } from './crypto';
import { AuthError } from './auth';

export { ENCRYPTION_KEY_DENY };

export const LINK_SOURCES = ['divingfish', 'lxns', 'varchive'] as const;
export type LinkSource = (typeof LINK_SOURCES)[number];

export const SOURCE_LABEL: Record<LinkSource, string> = {
	divingfish: '水鱼查分器',
	lxns: '落雪查分器',
	varchive: 'V-ARCHIVE'
};

const SOURCE_ALIASES: Record<string, LinkSource> = {
	divingfish: 'divingfish',
	'diving-fish': 'divingfish',
	diving_fish: 'divingfish',
	lxns: 'lxns',
	varchive: 'varchive'
};

export function assertSource(source: string): LinkSource {
	const mapped = SOURCE_ALIASES[source];
	if (!mapped) throw new AuthError(404, `未知的数据源: ${source}`);
	return mapped;
}

export function encryptionKeyRequired(): string {
	try {
		return assertEncryptionKey();
	} catch {
		throw new AuthError(500, 'ENCRYPTION_KEY 未配置、太短或仍为占位值，无法处理 OAuth 令牌');
	}
}

export async function getLinked(userId: number, source: LinkSource) {
	const [row] = await getDb()
		.select({
			externalId: linkedAccounts.externalId,
			hasTokens: linkedAccounts.accessTokenEnc,
			needsReauth: linkedAccounts.needsReauth,
			scope: linkedAccounts.scope,
			externalVerified: linkedAccounts.externalVerified,
			updatedAt: linkedAccounts.updatedAt
		})
		.from(linkedAccounts)
		.where(and(eq(linkedAccounts.userId, userId), eq(linkedAccounts.source, source)))
		.limit(1);
	return row
		? {
				source,
				externalId: row.externalId,
				hasOAuth: !!row.hasTokens,
				needsReauth: row.hasTokens ? row.needsReauth : false,
				scope: row.scope,
				externalVerified: row.externalVerified,
				updatedAt: row.updatedAt
			}
		: null;
}

export function validateExternalId(source: LinkSource, externalId: string): string {
	const id = externalId.trim();
	if (!id || id.length > 64) throw new AuthError(400, '外部 ID 需 1–64 字符');
	if (source === 'lxns' && !/^\d{8,16}$/.test(id)) {
		throw new AuthError(400, '落雪好友码应为 8–16 位数字');
	}
	if (source === 'divingfish' && !/^[A-Za-z0-9_\-]{1,64}$/.test(id)) {
		throw new AuthError(400, '水鱼用户名格式无效');
	}
	if (source === 'varchive' && !/^[A-Za-z0-9_\-]{1,64}$/.test(id)) {
		throw new AuthError(400, 'V-ARCHIVE ID 格式无效');
	}
	return id;
}

export interface BindPreview {
	source: LinkSource;
	sourceLabel: string;
	externalId: string;
	nickname: string | null;
	warning: string | null;
}

/** 绑定前向上游拉昵称，让用户二次确认归属 */
export async function previewExternal(source: LinkSource, externalId: string): Promise<BindPreview> {
	const id = validateExternalId(source, externalId);
	const base = { source, sourceLabel: SOURCE_LABEL[source], externalId: id };
	if (source === 'divingfish') {
		try {
			const resp = await divingFishQueryPlayer('maimai', { username: id });
			const nickname = typeof resp.nickname === 'string' ? resp.nickname : null;
			return { ...base, nickname, warning: null };
		} catch (err) {
			if (err instanceof PrivacyForbiddenError) {
				return { ...base, nickname: null, warning: '该账号存在但未开放第三方查询，确认仍要绑定？' };
			}
			throw new AuthError(400, '找不到该水鱼用户或暂时无法核验');
		}
	}
	if (source === 'lxns') {
		const token = lxnsDeveloperToken();
		if (!token) {
			return {
				...base,
				nickname: null,
				warning: '站点未配置落雪开发者 Token，无法在线核验昵称。请确认好友码无误后绑定。'
			};
		}
		try {
			const player = await lxnsPlayerByFriendCode('maimai', id, token);
			return { ...base, nickname: lxnsPlayerName(player), warning: null };
		} catch {
			throw new AuthError(400, '找不到该落雪好友码或对方未开放第三方查询');
		}
	}
	try {
		const data = await vaRecords(id, 4, { limit: 1 });
		return { ...base, nickname: data.nickname || null, warning: null };
	} catch {
		throw new AuthError(400, '找不到该 V-ARCHIVE 用户');
	}
}

export async function bindExternal(userId: number, source: LinkSource, externalId: string): Promise<void> {
	const id = validateExternalId(source, externalId);
	const db = getDb();
	await db
		.insert(linkedAccounts)
		.values({ userId, source, externalId: id, externalVerified: false })
		.onConflictDoUpdate({
			target: [linkedAccounts.userId, linkedAccounts.source],
			set: { externalId: id, externalVerified: false, updatedAt: new Date() }
		});
}

export async function unbind(userId: number, source: LinkSource): Promise<void> {
	const db = getDb();
	const [row] = await db
		.select()
		.from(linkedAccounts)
		.where(and(eq(linkedAccounts.userId, userId), eq(linkedAccounts.source, source)))
		.limit(1);
	if (row && source === 'divingfish') {
		try {
			const cfg = getAppConfig().divingFish;
			const key = encryptionKeyRequired();
			const token = row.refreshTokenEnc
				? decryptSecret(row.refreshTokenEnc, key)
				: row.accessTokenEnc
					? decryptSecret(row.accessTokenEnc, key)
					: null;
			if (cfg && token) await divingFishRevoke(cfg, token);
		} catch (err) {
			console.error('[oauth] 水鱼 revoke 失败', err);
		}
	}
	await db.delete(linkedAccounts).where(and(eq(linkedAccounts.userId, userId), eq(linkedAccounts.source, source)));
}

export interface OAuthFlow {
	url: string;
	state: string;
	codeVerifier?: string;
}

export async function startOAuth(source: LinkSource): Promise<OAuthFlow> {
	const cfg = getAppConfig();
	const state = randomToken(16);
	if (source === 'divingfish') {
		if (!cfg.divingFish) throw new AuthError(400, '站点未配置水鱼 OAuth（.env 缺少 DIVING_FISH_*）');
		const pkce = await generatePkce();
		return {
			url: await divingFishAuthorizeUrl(cfg.divingFish, { state, codeChallenge: pkce.codeChallenge }),
			state,
			codeVerifier: pkce.codeVerifier
		};
	}
	if (source === 'lxns') {
		if (!cfg.lxns) throw new AuthError(400, '站点未配置落雪 OAuth（.env 缺少 LXNS_*）');
		return { url: lxnsAuthorizeUrl(cfg.lxns, { state }), state };
	}
	throw new AuthError(400, '该数据源不支持 OAuth，请使用手动绑定');
}

export interface PendingFlow {
	source: LinkSource;
	state: string;
	codeVerifier?: string;
	exp: number;
}

export const OAUTH_COOKIE = 'rv_oauth';
export const OAUTH_COOKIE_OPTS = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax',
	maxAge: 600
} as const;

export async function completeOAuth(
	userId: number,
	source: LinkSource,
	code: string,
	state: string,
	pending: PendingFlow
): Promise<void> {
	if (pending.source !== source || pending.exp < Date.now()) {
		throw new AuthError(400, '授权会话已过期，请重新发起授权');
	}
	if (!safeEqual(pending.state, state)) {
		throw new AuthError(400, '授权会话校验失败，请重新发起授权');
	}
	const cfg = getAppConfig();
	let tokens: TokenResponse;
	if (source === 'divingfish') {
		if (!cfg.divingFish) throw new AuthError(400, '站点未配置水鱼 OAuth');
		if (!pending.codeVerifier) throw new AuthError(400, 'PKCE 上下文缺失，请重新发起授权');
		tokens = await divingFishExchangeToken(cfg.divingFish, { code, codeVerifier: pending.codeVerifier });
	} else if (source === 'lxns') {
		if (!cfg.lxns) throw new AuthError(400, '站点未配置落雪 OAuth');
		tokens = await lxnsExchangeToken(cfg.lxns, { code });
	} else {
		throw new AuthError(400, '该数据源不支持 OAuth');
	}
	await upsertTokens(userId, source, tokens, { dropRefresh: source === 'divingfish' });
	if (source === 'lxns') await persistLxnsFriendCode(userId, tokens.access_token);
	if (source === 'divingfish') await persistDivingFishUserinfo(userId, tokens.access_token);
}

async function persistDivingFishUserinfo(userId: number, accessToken: string): Promise<void> {
	try {
		const info = await divingFishUserinfo(accessToken);
		const username = info.preferred_username?.trim();
		if (!username) return;
		await getDb()
			.insert(linkedAccounts)
			.values({
				userId,
				source: 'divingfish',
				externalId: username,
				externalVerified: true
			})
			.onConflictDoUpdate({
				target: [linkedAccounts.userId, linkedAccounts.source],
				set: { externalId: username, externalVerified: true, updatedAt: new Date() }
			});
	} catch (err) {
		console.error('[oauth] 水鱼 userinfo 回填失败', err);
	}
}

async function persistLxnsFriendCode(userId: number, accessToken: string): Promise<void> {
	for (const fetchPlayer of [lxnsMaimaiPlayer, lxnsChunithmPlayer]) {
		try {
			const fc = lxnsFriendCode(await fetchPlayer(accessToken));
			if (fc) {
				await getDb()
					.insert(linkedAccounts)
					.values({ userId, source: 'lxns', externalId: fc, externalVerified: true })
					.onConflictDoUpdate({
						target: [linkedAccounts.userId, linkedAccounts.source],
						set: { externalId: fc, externalVerified: true, updatedAt: new Date() }
					});
				return;
			}
		} catch {
			/* 玩家资料接口失败不阻断授权 */
		}
	}
}

async function upsertTokens(
	userId: number,
	source: LinkSource,
	tokens: TokenResponse,
	opts?: { dropRefresh?: boolean }
): Promise<void> {
	const key = encryptionKeyRequired();
	const values = {
		accessTokenEnc: encryptSecret(tokens.access_token, key),
		refreshTokenEnc:
			opts?.dropRefresh || !tokens.refresh_token ? null : encryptSecret(tokens.refresh_token, key),
		tokenExpiresAt: new Date(Date.now() + (tokens.expires_in ?? 900) * 1000),
		scope: tokens.scope ?? null,
		needsReauth: false,
		updatedAt: new Date()
	};
	await getDb()
		.insert(linkedAccounts)
		.values({ userId, source, ...values })
		.onConflictDoUpdate({
			target: [linkedAccounts.userId, linkedAccounts.source],
			set: values
		});
}

const refreshInflight = new Map<number, Promise<string>>();

function isInvalidGrant(err: unknown): boolean {
	if (!(err instanceof UpstreamError)) return false;
	return err.status === 400 || err.status === 401;
}

/** 取可用 access token。水鱼优先 on-behalf-of；令牌缓存到过期。 */
export async function getAccessToken(userId: number, source: 'divingfish' | 'lxns'): Promise<string> {
	const db = getDb();
	const [row] = await db
		.select()
		.from(linkedAccounts)
		.where(and(eq(linkedAccounts.userId, userId), eq(linkedAccounts.source, source)))
		.limit(1);
	if (!row) throw new AuthError(400, `未完成 ${SOURCE_LABEL[source]} OAuth 授权`);

	if (row.accessTokenEnc && row.tokenExpiresAt && row.tokenExpiresAt.getTime() > Date.now() + 15_000) {
		return decryptSecret(row.accessTokenEnc, encryptionKeyRequired());
	}

	if (source === 'divingfish') {
		const cfg = getAppConfig().divingFish;
		if (!cfg) throw new AuthError(400, '站点未配置水鱼 OAuth');
		const username = row.externalId?.trim();
		if (username) {
			try {
				const tokens = await divingFishOnBehalfOf(cfg, `username:${username}`);
				await upsertTokens(userId, source, tokens, { dropRefresh: true });
				return tokens.access_token;
			} catch (err) {
				if (isInvalidGrant(err)) {
					await markNeedsReauth(row.id);
					throw new AuthError(400, '水鱼查分器授权已过期，请到控制台重新授权');
				}
				throw err;
			}
		}
	}

	if (!row.refreshTokenEnc) {
		if (!row.accessTokenEnc) throw new AuthError(400, `未完成 ${SOURCE_LABEL[source]} OAuth 授权`);
		await markNeedsReauth(row.id);
		throw new AuthError(400, `${SOURCE_LABEL[source]}授权已过期，请到控制台重新授权`);
	}

	const existing = refreshInflight.get(row.id);
	if (existing) return existing;

	const task = (async () => {
		try {
			const cfg = getAppConfig();
			const refreshToken = decryptSecret(row.refreshTokenEnc!, encryptionKeyRequired());
			const tokens =
				source === 'divingfish'
					? await divingFishRefreshToken(cfg.divingFish!, refreshToken)
					: await lxnsRefreshToken(cfg.lxns!, refreshToken);
			await upsertTokens(userId, source, tokens, { dropRefresh: source === 'divingfish' });
			return tokens.access_token;
		} catch (err) {
			if (isInvalidGrant(err)) {
				await markNeedsReauth(row.id);
				throw new AuthError(400, `${SOURCE_LABEL[source]}授权已过期，请到控制台重新授权`);
			}
			throw new AuthError(502, `${SOURCE_LABEL[source]}令牌刷新失败，请稍后再试`);
		}
	})().finally(() => refreshInflight.delete(row.id));
	refreshInflight.set(row.id, task);
	return task;
}

async function markNeedsReauth(linkId: number): Promise<void> {
	await getDb().update(linkedAccounts).set({ needsReauth: true }).where(eq(linkedAccounts.id, linkId));
}
