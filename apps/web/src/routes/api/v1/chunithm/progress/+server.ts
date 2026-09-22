import type { RequestHandler } from './$types';
import { authApiKey } from '$lib/server/auth';
import { errorResponse, resolveQueryTarget, scoreJson } from '$lib/server/api';
import { scoreChannelFromParam } from '$lib/server/channel';
import { chunithmProgress } from '$lib/server/progress';

/** 完成度进度：GET /api/v1/chunithm/progress（可加 ?qq= 按查询账号检索；?src=lxns 切落雪） */
export const GET: RequestHandler = async ({ request, url }) => {
	try {
		const identity = await authApiKey(request);
		const query = await resolveQueryTarget(identity, url);
		const src = scoreChannelFromParam(url.searchParams.get('src'));
		return scoreJson(await chunithmProgress(query.userId, src === 'lxns' ? 'lxns' : 'df'), query, {
			game: 'chunithm',
			src
		});
	} catch (err) {
		return errorResponse(err);
	}
};
