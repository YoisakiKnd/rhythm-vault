import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authApiKey } from '$lib/server/auth';
import { errorResponse, resolveQueryTarget } from '$lib/server/api';
import { scoreChannelFromParam } from '$lib/server/channel';
import { chunithmPush } from '$lib/server/scores';

/** 推分建议：GET /api/v1/chunithm/push（可加 ?qq=；?src=lxns 切落雪） */
export const GET: RequestHandler = async ({ request, url }) => {
	try {
		const identity = await authApiKey(request);
		const target = await resolveQueryTarget(identity, url);
		return json(await chunithmPush(target, scoreChannelFromParam(url.searchParams.get('src'))));
	} catch (err) {
		return errorResponse(err);
	}
};
