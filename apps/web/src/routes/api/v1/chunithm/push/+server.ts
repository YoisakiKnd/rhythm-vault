import type { RequestHandler } from './$types';
import { authApiKey } from '$lib/server/auth';
import { errorResponse, resolveQueryTarget, scoreJson } from '$lib/server/api';
import { scoreChannelFromParam } from '$lib/server/channel';
import { chunithmPush } from '$lib/server/scores';

/** 推分建议：GET /api/v1/chunithm/push（可加 ?qq=；?src=lxns 切落雪） */
export const GET: RequestHandler = async ({ request, url }) => {
	try {
		const identity = await authApiKey(request);
		const query = await resolveQueryTarget(identity, url);
		const src = scoreChannelFromParam(url.searchParams.get('src'));
		return scoreJson(await chunithmPush(query.userId, src), query, { game: 'chunithm', src });
	} catch (err) {
		return errorResponse(err);
	}
};
