import { json } from '@sveltejs/kit';
import type { Cookies } from '@sveltejs/kit';
import { PrivacyForbiddenError, UpstreamError } from '@rhythm-vault/adapters';
import { AuthError, getSessionUser, SESSION_COOKIE, type ApiIdentity } from './auth';
import { allowUnverifiedQq } from './config';
import { normalizeQq, resolveIdentityForQuery, type QueryTargetRecord } from './identities';

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
		throw new AuthError(404, QUERY_TARGET_HIDDEN);
	}
	if (identity.scope !== 'bot') {
		throw new AuthError(403, KEY_SCOPE_DENIED);
	}
	if (!record || (!record.verified && !opts.allowUnverified) || !record.botQueryPublic) {
		throw new AuthError(404, QUERY_TARGET_HIDDEN);
	}
	return record.userId;
}

/**
 * 解析查询目标：带查询账号参数（如 ?qq=123456）时把请求路由到该身份绑定的账号，
 * 否则查询调用者自己的数据。
 */
export async function resolveQueryTarget(identity: ApiIdentity, url: URL): Promise<number> {
	const qqRaw = url.searchParams.get('qq');
	if (qqRaw === null) return identity.userId;
	const qq = normalizeQq(qqRaw);
	if (!qq) throw new AuthError(400, 'QQ 号需为 4–12 位数字');
	const record = await resolveIdentityForQuery('qq', qq);
	return decideQueryTarget(identity, record, { allowUnverified: allowUnverifiedQq() });
}

export function assertNumericId(id: string | null, label = 'id'): string {
	if (!id || !/^\d+$/.test(id)) throw new AuthError(400, `${label} 须为数字`);
	return id;
}

/** 统一错误映射：AuthError → 其状态码，上游错误脱敏，未知 → 500 */
export function errorResponse(err: unknown, requestId?: string): Response {
	if (err instanceof AuthError) return json({ error: err.message }, { status: err.status });
	if (err instanceof PrivacyForbiddenError) {
		return json({ error: '对方未开放第三方查询' }, { status: 403 });
	}
	if (err instanceof UpstreamError) {
		console.error('[api] 上游错误', requestId ?? '', err.status, err.message);
		return json({ error: '上游服务暂时不可用，请稍后再试' }, { status: 502 });
	}
	console.error('[api] 未处理错误', requestId ?? '', err);
	return json({ error: '服务器内部错误' }, { status: 500 });
}
