import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authApiKey, AuthError } from '$lib/server/auth';
import { errorResponse } from '$lib/server/api';
import { normalizeQq, verifyIdentityByCode } from '$lib/server/identities';
import { takeToken } from '$lib/server/rate-limit';

/**
 * Bot 提交 QQ 验证码：POST /api/v1/identities/verify
 * Body: { qq, code }。需要 bot scope Key。
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const identity = await authApiKey(request);
		if (identity.scope !== 'bot') {
			throw new AuthError(403, '该 Key 无跨账号查询权限');
		}
		const body = (await request.json()) as { qq?: unknown; code?: unknown };
		const qq = typeof body.qq === 'string' ? normalizeQq(body.qq) : null;
		if (!qq) throw new AuthError(400, 'QQ 号需为 4–12 位数字');
		if (!takeToken(`verify:${qq}`, 10, 15 * 60_000)) {
			throw new AuthError(429, '验证尝试过多，请稍后再试');
		}
		const code = typeof body.code === 'string' ? body.code : '';
		const result = await verifyIdentityByCode('qq', qq, code);
		return json({ ok: true, username: result.username });
	} catch (err) {
		return errorResponse(err);
	}
};
