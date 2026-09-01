import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	AuthError,
	createSession,
	loginUser,
	sessionCookieOptions,
	SESSION_COOKIE
} from '$lib/server/auth';
import { errorResponse } from '$lib/server/api';
import { clientKey, takeToken } from '$lib/server/rate-limit';
import { assertTurnstile } from '$lib/server/turnstile';

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
	try {
		if (!takeToken(`login:${clientKey({ request, getClientAddress })}`, 5, 15 * 60_000)) {
			throw new AuthError(429, '尝试次数过多，请 15 分钟后再试');
		}
		const body = (await request.json()) as {
			username?: unknown;
			password?: unknown;
			turnstileToken?: unknown;
			'cf-turnstile-response'?: unknown;
		};
		await assertTurnstile(body.turnstileToken ?? body['cf-turnstile-response'], getClientAddress());
		if (typeof body.username !== 'string' || typeof body.password !== 'string') {
			throw new AuthError(400, '需要 username 和 password');
		}
		const user = await loginUser(body.username, body.password);
		const session = await createSession(user.id);
		cookies.set(SESSION_COOKIE, session.token, sessionCookieOptions(session.expiresAt));
		return json({ ok: true, user: { id: user.id, username: user.username } });
	} catch (err) {
		return errorResponse(err);
	}
};
