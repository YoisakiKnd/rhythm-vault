import { fetchWithPolicy } from './http';
import { buildAuthorizeUrl, postTokenForm, UpstreamError } from './oauth';
import type { OAuthConfig, TokenResponse } from './oauth';

export const LXNS_API = 'https://maimai.lxns.net/api/v0';
export const LXNS_AUTHORIZE = 'https://maimai.lxns.net/oauth/authorize';

/**
 * 落雪咖啡屋 OAuth：access token 15 分钟，refresh token 30 天且每次刷新轮换
 * （旧令牌立即作废，必须持久化新令牌后再用）。
 * 文档: https://maimai.lxns.net/docs/oauth-guide
 */
export function lxnsAuthorizeUrl(
	cfg: OAuthConfig,
	p: { state: string; scope?: string }
): string {
	return buildAuthorizeUrl(LXNS_AUTHORIZE, {
		response_type: 'code',
		client_id: cfg.clientId,
		redirect_uri: cfg.redirectUri,
		scope: p.scope ?? 'openid read_user_profile read_player',
		state: p.state
	});
}

export function lxnsExchangeToken(
	cfg: OAuthConfig,
	p: { code: string }
): Promise<TokenResponse> {
	return postTokenForm(`${LXNS_API}/oauth/token`, {
		grant_type: 'authorization_code',
		code: p.code,
		redirect_uri: cfg.redirectUri,
		client_id: cfg.clientId,
		...(cfg.clientSecret ? { client_secret: cfg.clientSecret } : {})
	});
}

export function lxnsRefreshToken(cfg: OAuthConfig, refreshToken: string): Promise<TokenResponse> {
	return postTokenForm(`${LXNS_API}/oauth/token`, {
		grant_type: 'refresh_token',
		refresh_token: refreshToken,
		client_id: cfg.clientId,
		...(cfg.clientSecret ? { client_secret: cfg.clientSecret } : {})
	});
}

async function lxnsGet(path: string, accessToken: string): Promise<unknown> {
	const res = await fetchWithPolicy(`${LXNS_API}${path}`, {
		headers: { Authorization: `Bearer ${accessToken}` }
	});
	if (res.status === 404) return null;
	if (!res.ok) throw new UpstreamError(`lxns ${path} 请求失败: ${res.status}`, res.status);
	return res.json();
}

/** 落雪响应可能是裸数组、{ data } 或 { scores } */
export function lxnsArray(body: unknown): Record<string, unknown>[] {
	if (Array.isArray(body)) {
		return body.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object');
	}
	if (body && typeof body === 'object') {
		const o = body as Record<string, unknown>;
		if (Array.isArray(o.data)) return lxnsArray(o.data);
		if (Array.isArray(o.scores)) return lxnsArray(o.scores);
	}
	return [];
}

/** 解包 { data: object }；否则返回原对象 */
export function lxnsData(body: unknown): Record<string, unknown> | null {
	if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
	const o = body as Record<string, unknown>;
	if (o.data && typeof o.data === 'object' && !Array.isArray(o.data)) {
		return o.data as Record<string, unknown>;
	}
	return o;
}

export function lxnsFriendCode(body: unknown): string | null {
	const o = lxnsData(body);
	const fc = o?.friend_code;
	if (typeof fc === 'number' && Number.isFinite(fc) && fc > 0) return String(Math.trunc(fc));
	if (typeof fc === 'string' && /^\d{8,16}$/.test(fc.trim())) return fc.trim();
	return null;
}

/** 舞萌 Best 50：{ standard, dx } */
export function lxnsMaimaiBests(body: unknown): Record<string, unknown>[] {
	const o = lxnsData(body);
	if (!o) return lxnsArray(body);
	const standard = Array.isArray(o.standard) ? o.standard : [];
	const dx = Array.isArray(o.dx) ? o.dx : [];
	const merged = [...standard, ...dx];
	return merged.length > 0 ? lxnsArray(merged) : lxnsArray(body);
}

/** 中二 Rating 构成：b30 + 新曲 b20 */
export function lxnsChuniBests(body: unknown): Record<string, unknown>[] {
	const o = lxnsData(body);
	if (!o) return lxnsArray(body);
	const bests = Array.isArray(o.bests) ? o.bests : [];
	const newBests = Array.isArray(o.new_bests) ? o.new_bests : [];
	const merged = [...bests, ...newBests];
	return merged.length > 0 ? lxnsArray(merged) : lxnsArray(body);
}

export function lxnsDeveloperToken(): string | null {
	const t = process.env.LXNS_DEVELOPER_TOKEN?.trim();
	return t || null;
}

async function lxnsDevGet(
	path: string,
	developerToken: string,
	opts?: { emptyOn404?: boolean }
): Promise<unknown> {
	const res = await fetchWithPolicy(`${LXNS_API}${path}`, {
		headers: { Authorization: developerToken }
	});
	if (res.status === 404 && opts?.emptyOn404) return null;
	if (!res.ok) throw new UpstreamError(`lxns ${path} 请求失败: ${res.status}`, res.status);
	return res.json();
}

/** 开发者 API：按好友码拉舞萌 b50（需玩家开放第三方查询）；未建档 404 视为空 */
export async function lxnsMaimaiPlayerBests(
	friendCode: string,
	developerToken: string
): Promise<Record<string, unknown>[]> {
	return lxnsMaimaiBests(
		await lxnsDevGet(`/maimai/player/${friendCode}/bests`, developerToken, { emptyOn404: true })
	);
}

/** 开发者 API：按好友码拉中二 b30+n20；未建档 404 视为空 */
export async function lxnsChunithmPlayerBests(
	friendCode: string,
	developerToken: string
): Promise<Record<string, unknown>[]> {
	return lxnsChuniBests(
		await lxnsDevGet(`/chunithm/player/${friendCode}/bests`, developerToken, { emptyOn404: true })
	);
}

/** 开发者 API：按好友码取玩家资料（绑定前核验昵称） */
export async function lxnsPlayerByFriendCode(
	game: 'maimai' | 'chunithm',
	friendCode: string,
	developerToken: string
): Promise<Record<string, unknown> | null> {
	return lxnsData(await lxnsDevGet(`/${game}/player/${friendCode}`, developerToken));
}

export function lxnsPlayerName(body: unknown): string | null {
	const o = lxnsData(body);
	const name = o?.name;
	return typeof name === 'string' && name.trim() ? name.trim() : null;
}

/** 舞萌 DX 玩家数据（scope: read_player）；未建档时上游 404，返回 null */
export function lxnsMaimaiPlayer(accessToken: string): Promise<unknown> {
	return lxnsGet('/user/maimai/player', accessToken);
}

/** 中二节奏玩家数据（scope: read_player）；未建档时上游 404，返回 null */
export function lxnsChunithmPlayer(accessToken: string): Promise<unknown> {
	return lxnsGet('/user/chunithm/player', accessToken);
}

/** 舞萌 DX 全部成绩（个人 API，OAuth Bearer）；未建档时上游 404，视为空列表 */
export async function lxnsMaimaiScores(accessToken: string): Promise<Record<string, unknown>[]> {
	const body = await lxnsGet('/user/maimai/player/scores', accessToken);
	return body == null ? [] : lxnsArray(body);
}

/** 中二节奏全部成绩（个人 API，OAuth Bearer）；未建档时上游 404，视为空列表 */
export async function lxnsChunithmScores(accessToken: string): Promise<Record<string, unknown>[]> {
	const body = await lxnsGet('/user/chunithm/player/scores', accessToken);
	return body == null ? [] : lxnsArray(body);
}

export interface LxnsChart {
	type?: string;
	difficulty: number;
	level: string;
	level_value: number;
	version?: number;
	/** 仅 WORLD'S END */
	origin_id?: number;
	kanji?: string;
}

export interface LxnsMaimaiDifficulties {
	standard?: LxnsChart[];
	dx?: LxnsChart[];
	utage?: LxnsChart[];
}

export interface LxnsMaimaiSong {
	id: number;
	title: string;
	artist?: string;
	genre?: string;
	version?: number;
	/** true 时不计入 Best 50 / Rating */
	disabled?: boolean;
	locked?: boolean;
	difficulties?: LxnsMaimaiDifficulties;
}

export interface LxnsChuniSong {
	id: number;
	title: string;
	artist?: string;
	genre?: string;
	/** 曲目首次出现版本（版本码，如 23000） */
	version?: number;
	disabled?: boolean;
	locked?: boolean;
	difficulties?: LxnsChart[];
}

export interface LxnsVersion {
	id: number;
	title: string;
	version: number;
}

/**
 * 舞萌 DX 全曲库（公共端点，无需鉴权），含谱面定数与 versions 对照。
 * 文档: https://maimai.lxns.net/docs/api/maimai
 */
export async function lxnsMaimaiSongList(): Promise<{
	songs: LxnsMaimaiSong[];
	versions: LxnsVersion[];
}> {
	const res = await fetchWithPolicy(`${LXNS_API}/maimai/song/list`);
	if (!res.ok) throw new UpstreamError(`lxns maimai song/list 请求失败: ${res.status}`, res.status);
	const body = (await res.json()) as {
		songs?: LxnsMaimaiSong[];
		versions?: LxnsVersion[];
		data?: { songs?: LxnsMaimaiSong[]; versions?: LxnsVersion[] };
	};
	return {
		songs: body.songs ?? body.data?.songs ?? [],
		versions: body.versions ?? body.data?.versions ?? []
	};
}

/**
 * 中二节奏全曲库（公共端点，无需鉴权），含谱面定数与 version。
 * 文档: https://maimai.lxns.net/docs/api/chunithm
 */
export async function lxnsChuniSongList(): Promise<LxnsChuniSong[]> {
	const res = await fetchWithPolicy(`${LXNS_API}/chunithm/song/list`);
	if (!res.ok) throw new UpstreamError(`lxns chuni song/list 请求失败: ${res.status}`, res.status);
	const body = (await res.json()) as { songs?: LxnsChuniSong[]; data?: { songs?: LxnsChuniSong[] } };
	return body.songs ?? body.data?.songs ?? [];
}
