import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authApiKey } from '$lib/server/auth';
import { errorResponse, resolveQueryTarget } from '$lib/server/api';
import { maimaiB50 } from '$lib/server/scores';
import { scoreChannelFromParam } from '$lib/server/channel';

/** b50：GET /api/v1/maimai/b50（默认查自己，?qq=123456 按查询账号检索；?src=lxns 切落雪） */
export const GET: RequestHandler = async ({ request, url }) => {
	try {
		const identity = await authApiKey(request);
		const target = await resolveQueryTarget(identity, url);
		return json(await maimaiB50(target, scoreChannelFromParam(url.searchParams.get('src'))));
	} catch (err) {
		return errorResponse(err);
	}
};
