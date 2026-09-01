import { redirect } from '@sveltejs/kit';
import type { RequestEvent, RequestHandler } from './$types';
import { AuthError } from '$lib/server/auth';
import {
	assertSource,
	completeOAuth,
	OAUTH_COOKIE,
	type PendingFlow
} from '$lib/server/links';
import { requireSessionUser } from '$lib/server/api';
import { oauthFailLocation, oauthProviderErrorMessage } from '$lib/server/http-guard';

async function handle(event: RequestEvent): Promise<string> {
	const { params, url, cookies } = event;
	const source = assertSource(params.source);
	const raw = cookies.get(OAUTH_COOKIE);
	cookies.delete(OAUTH_COOKIE, { path: '/' });
	if (!raw) throw new AuthError(400, '授权会话不存在或已过期，请重新发起授权');
	const providerMsg = oauthProviderErrorMessage(url.searchParams.get('error'));
	if (providerMsg) throw new AuthError(400, providerMsg);
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	if (!code || !state) throw new AuthError(400, '回调缺少 code/state 参数');
	const pending = JSON.parse(raw) as PendingFlow;
	const user = await requireSessionUser(cookies);
	await completeOAuth(user.id, source, code, state, pending);
	return '/dashboard/links?ok=1';
}

export const GET: RequestHandler = async (event) => {
	let location: string;
	try {
		location = await handle(event);
	} catch (err) {
		location = oauthFailLocation(err);
	}
	redirect(302, location);
};
