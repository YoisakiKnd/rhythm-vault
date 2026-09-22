import type { RequestHandler } from './$types';
import { authApiKey } from '$lib/server/auth';
import { errorResponse, resolveQueryTarget, scoreJson } from '$lib/server/api';
import { parseSheetSearch, queryChartSheet } from '$lib/server/completion';

/** 谱面完成表：GET /api/v1/djmax/sheet（button/diff / pattern / level / dlc / new / filter / qq） */
export const GET: RequestHandler = async ({ request, url }) => {
	try {
		const identity = await authApiKey(request);
		const query = await resolveQueryTarget(identity, url);
		return scoreJson(await queryChartSheet(query.userId, 'djmax', parseSheetSearch('djmax', url)), query, {
			game: 'djmax',
			src: 'varchive'
		});
	} catch (err) {
		return errorResponse(err);
	}
};
