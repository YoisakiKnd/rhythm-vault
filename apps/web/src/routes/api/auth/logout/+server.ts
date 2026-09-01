import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { destroySession, SESSION_COOKIE } from '$lib/server/auth';
import { errorResponse } from '$lib/server/api';

export const POST: RequestHandler = async ({ cookies }) => {
	try {
		await destroySession(cookies.get(SESSION_COOKIE));
		cookies.delete(SESSION_COOKIE, { path: '/' });
		return json({ ok: true });
	} catch (err) {
		return errorResponse(err);
	}
};
