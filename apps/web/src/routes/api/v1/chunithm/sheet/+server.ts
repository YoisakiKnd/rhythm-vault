import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authApiKey } from '$lib/server/auth';
import { errorResponse, resolveQueryTarget } from '$lib/server/api';
import { parseSheetSearch, queryChartSheet } from '$lib/server/completion';

/** 谱面完成表：GET /api/v1/chunithm/sheet */
export const GET: RequestHandler = async ({ request, url }) => {
	try {
		const identity = await authApiKey(request);
		const target = await resolveQueryTarget(identity, url);
		return json(await queryChartSheet(target, 'chunithm', parseSheetSearch('chunithm', url)));
	} catch (err) {
		return errorResponse(err);
	}
};
