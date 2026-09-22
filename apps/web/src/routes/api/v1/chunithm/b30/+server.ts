import type { RequestHandler } from './$types';
import { authApiKey } from '$lib/server/auth';
import { errorResponse, resolveQueryTarget, scoreJson } from '$lib/server/api';
import { scoreChannelFromParam } from '$lib/server/channel';
import { chunithmB30 } from '$lib/server/scores';

/** b30：GET /api/v1/chunithm/b30（默认查自己，?qq=123456 按查询账号检索；?src=lxns 切落雪） */
export const GET: RequestHandler = async ({ request, url }) => {
	try {
		const identity = await authApiKey(request);
		const query = await resolveQueryTarget(identity, url);
		const src = scoreChannelFromParam(url.searchParams.get('src'));
		return scoreJson(await chunithmB30(query.userId, src), query, { game: 'chunithm', src });
	} catch (err) {
		return errorResponse(err);
	}
};
