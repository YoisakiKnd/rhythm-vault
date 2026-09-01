import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { errorResponse, requireSessionUser } from '$lib/server/api';
import { assertSource, OAUTH_COOKIE, OAUTH_COOKIE_OPTS, startOAuth, type PendingFlow } from '$lib/server/links';

export const GET: RequestHandler = async ({ params, cookies }) => {
	let target: string;
	try {
		const source = assertSource(params.source);
		await requireSessionUser(cookies);
		const flow = await startOAuth(source);
		const pending: PendingFlow = {
			source,
			state: flow.state,
			codeVerifier: flow.codeVerifier,
			exp: Date.now() + 600_000
		};
		cookies.set(OAUTH_COOKIE, JSON.stringify(pending), OAUTH_COOKIE_OPTS);
		target = flow.url;
	} catch (err) {
		return errorResponse(err);
	}
	redirect(302, target);
};
