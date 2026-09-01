import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authApiKey } from '$lib/server/auth';
import { errorResponse, resolveQueryTarget } from '$lib/server/api';
import { chunithmB30 } from '$lib/server/scores';
import { scoreChannelFromParam } from '$lib/server/channel';

/** b30：GET /api/v1/chunithm/b30（默认查自己，?qq=123456 按查询账号检索；?src=lxns 切落雪） */
export const GET: RequestHandler = async ({ request, url }) => {
	try {
		const identity = await authApiKey(request);
		const target = await resolveQueryTarget(identity, url);
		return json(await chunithmB30(target, scoreChannelFromParam(url.searchParams.get('src'))));
	} catch (err) {
		return errorResponse(err);
	}
};
