import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authApiKey } from '$lib/server/auth';
import { errorResponse, resolveQueryTarget } from '$lib/server/api';
import { maimaiPush } from '$lib/server/scores';

/** 推分建议：GET /api/v1/maimai/push（可加 ?qq= 按查询账号检索） */
export const GET: RequestHandler = async ({ request, url }) => {
	try {
		const identity = await authApiKey(request);
		const target = await resolveQueryTarget(identity, url);
		return json(await maimaiPush(target));
	} catch (err) {
		return errorResponse(err);
	}
};
