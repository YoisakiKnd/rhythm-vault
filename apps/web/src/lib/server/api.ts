import { json } from '@sveltejs/kit';
import type { Cookies } from '@sveltejs/kit';
import { PrivacyForbiddenError, UpstreamError } from '@rhythm-vault/adapters';
import { AuthError, getSessionUser, SESSION_COOKIE, type ApiErrorCode, type ApiIdentity } from './auth';
import { allowUnverifiedQq } from './config';
import { normalizeQq, resolveIdentityForQuery, type QueryTargetRecord } from './identities';
import { lastSuccessfulSyncAt } from './scores';

export async function requireSessionUser(cookies: Cookies) {
	const user = await getSessionUser(cookies.get(SESSION_COOKIE));
	if (!user) throw new AuthError(401, '未登录');
	return user;
}

export const QUERY_TARGET_HIDDEN = '查询账号未注册或不存在';
export const KEY_SCOPE_DENIED = '该 Key 无跨账号查询权限';

/**
 * `?qq=` 判定（纯函数，便于单测）：
 * - 自己的 QQ：self / bot Key 都放行（须已验证，除非 RV_ALLOW_UNVERIFIED_QQ=1）
 * - 别人的 QQ：必须 bot scope；目标已验证且开启了 Bot 查询
 * - 非 bot Key 查别人一律 403，不泄露 QQ 是否存在
 * - bot Key 对越权/不存在统一 404，防枚举
 */
export function decideQueryTarget(
	identity: Pick<ApiIdentity, 'userId' | 'scope'>,
	record: QueryTargetRecord | null,
	opts: { allowUnverified: boolean }
): number {
	if (record && record.userId === identity.userId) {
		if (record.verified || opts.allowUnverified) return record.userId;
		throw new AuthError(404, QUERY_TARGET_HIDDEN, 'qq_unavailable');
	}
	if (identity.scope !== 'bot') {
		throw new AuthError(403, KEY_SCOPE_DENIED, 'forbidden');
	}
	if (!record || (!record.verified && !opts.allowUnverified) || !record.botQueryPublic) {
		throw new AuthError(404, QUERY_TARGET_HIDDEN, 'qq_unavailable');
	}
	return record.userId;
}

export interface ResolvedQuery {
	userId: number;
	username: string;
	qq: string | null;
}

/**
 * 解析查询目标。不带 `qq` 时只查 Key 主人。
 * 带 `qq` 时必须对上已验证的查询账号；查别人还要 Bot Key，且对方打开了「允许 Bot 查询」。
 */
export async function resolveQueryTarget(identity: ApiIdentity, url: URL): Promise<ResolvedQuery> {
	const qqRaw = url.searchParams.get('qq');
	if (qqRaw === null) {
		return { userId: identity.userId, username: identity.username, qq: null };
	}
	const qq = normalizeQq(qqRaw);
	if (!qq) throw new AuthError(400, 'QQ 号需为 4–12 位数字', 'bad_request');
	const record = await resolveIdentityForQuery('qq', qq);
	const userId = decideQueryTarget(identity, record, { allowUnverified: allowUnverifiedQq() });
	const username = record?.userId === userId && record.username ? record.username : identity.username;
	return { userId, username, qq };
}

export type ScoreGame = 'maimai' | 'chunithm' | 'djmax';

/** 查分响应补上 Bot 发消息需要的玩家、QQ、游戏、渠道和同步时间。 */
export async function scoreJson(
	body: object,
	query: ResolvedQuery,
	opts: { game: ScoreGame; src: string }
) {
	const record = body as Record<string, unknown>;
	const dbGame = opts.game === 'maimai' ? 'maimai_dx' : opts.game;
	const source = opts.game === 'djmax' ? 'varchive' : opts.src;
	const syncedAt =
		typeof record.syncedAt === 'string' || record.syncedAt === null
			? (record.syncedAt as string | null)
			: await lastSuccessfulSyncAt(query.userId, dbGame, source);
	return json({
		...record,
		player: { username: query.username },
		qq: query.qq,
		game: opts.game,
		src: opts.src,
		syncedAt
	});
}

export function apiError(status: number, error: string, code: ApiErrorCode) {
	return json({ error, code }, { status });
}

export function assertNumericId(id: string | null, label = 'id'): string {
	if (!id || !/^\d+$/.test(id)) throw new AuthError(400, `${label} 须为数字`);
	return id;
}

/** 统一错误映射：AuthError → 其状态码，上游错误脱敏，未知 → 500 */
export function errorResponse(err: unknown, requestId?: string): Response {
	if (err instanceof AuthError) {
		return json({ error: err.message, code: err.code }, { status: err.status });
	}
	if (err instanceof PrivacyForbiddenError) {
		return json({ error: '对方未开放第三方查询', code: 'forbidden' }, { status: 403 });
	}
	if (err instanceof UpstreamError) {
		console.error('[api] 上游错误', requestId ?? '', err.status, err.message);
		return json({ error: '上游服务暂时不可用，请稍后再试', code: 'upstream' }, { status: 502 });
	}
	console.error('[api] 未处理错误', requestId ?? '', err);
	return json({ error: '服务器内部错误', code: 'internal' }, { status: 500 });
}
