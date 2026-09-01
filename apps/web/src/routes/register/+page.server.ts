import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	AuthError,
	createSession,
	registerUser,
	sessionCookieOptions,
	SESSION_COOKIE
} from '$lib/server/auth';
import { clientKey, takeToken } from '$lib/server/rate-limit';
import { registerPasswordMismatch } from '$lib/server/http-guard';
import { assertTurnstile, turnstileSiteKey, turnstileTokenFromForm } from '$lib/server/turnstile';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(302, '/dashboard');
	return { turnstileSiteKey: turnstileSiteKey() };
};

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		if (!takeToken(`register:${clientKey({ request, getClientAddress })}`, 5, 15 * 60_000)) {
			return fail(429, { error: '尝试次数过多，请 15 分钟后再试' });
		}
		const form = await request.formData();
		try {
			await assertTurnstile(turnstileTokenFromForm(form), getClientAddress());
		} catch (err) {
			if (err instanceof AuthError) return fail(err.status, { error: err.message });
			throw err;
		}
		const username = String(form.get('username') ?? '');
		const password = String(form.get('password') ?? '');
		const confirm = String(form.get('confirm') ?? '');
		const mismatch = registerPasswordMismatch(password, confirm);
		if (mismatch) return fail(400, { error: mismatch });
		try {
			const user = await registerUser(username, password);
			const session = await createSession(user.id);
			cookies.set(SESSION_COOKIE, session.token, sessionCookieOptions(session.expiresAt));
		} catch (err) {
			if (err instanceof AuthError) return fail(err.status, { error: err.message });
			throw err;
		}
		redirect(302, '/dashboard');
	}
};
