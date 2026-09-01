import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authApiKey } from '$lib/server/auth';
import { errorResponse, resolveQueryTarget } from '$lib/server/api';
import { djmaxProgress } from '$lib/server/progress';

/** 完成度进度：GET /api/v1/djmax/progress（可加 ?qq= 按查询账号检索） */
export const GET: RequestHandler = async ({ request, url }) => {
	try {
		const identity = await authApiKey(request);
		const target = await resolveQueryTarget(identity, url);
		return json(await djmaxProgress(target));
	} catch (err) {
		return errorResponse(err);
	}
};
