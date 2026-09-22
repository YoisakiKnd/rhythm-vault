import type { RequestHandler } from './$types';
import { authApiKey } from '$lib/server/auth';
import { errorResponse, resolveQueryTarget, scoreJson } from '$lib/server/api';
import { scoreChannelFromParam } from '$lib/server/channel';
import { parseSheetSearch, queryChartSheet } from '$lib/server/completion';

/** 谱面完成表：GET /api/v1/maimai/sheet（level / diff / new / filter / src / qq） */
export const GET: RequestHandler = async ({ request, url }) => {
	try {
		const identity = await authApiKey(request);
		const query = await resolveQueryTarget(identity, url);
		const src = scoreChannelFromParam(url.searchParams.get('src'));
		return scoreJson(await queryChartSheet(query.userId, 'maimai', parseSheetSearch('maimai', url)), query, {
			game: 'maimai',
			src
		});
	} catch (err) {
		return errorResponse(err);
	}
};
