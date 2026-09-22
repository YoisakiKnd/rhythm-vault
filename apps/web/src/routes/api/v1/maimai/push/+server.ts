import type { RequestHandler } from './$types';
import { authApiKey } from '$lib/server/auth';
import { errorResponse, resolveQueryTarget, scoreJson } from '$lib/server/api';
import { scoreChannelFromParam } from '$lib/server/channel';
import { maimaiPush } from '$lib/server/scores';

/** 推分建议：GET /api/v1/maimai/push（可加 ?qq= 按查询账号检索） */
export const GET: RequestHandler = async ({ request, url }) => {
	try {
		const identity = await authApiKey(request);
		const query = await resolveQueryTarget(identity, url);
		const src = scoreChannelFromParam(url.searchParams.get('src'));
		return scoreJson(await maimaiPush(query.userId, src), query, { game: 'maimai', src });
	} catch (err) {
		return errorResponse(err);
	}
};
