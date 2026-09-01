import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authApiKey } from '$lib/server/auth';
import { errorResponse, resolveQueryTarget } from '$lib/server/api';
import { djmaxB100 } from '$lib/server/scores';

/** b100：GET /api/v1/djmax/b100?button=4（默认查自己，?qq=123456 按查询账号检索） */
export const GET: RequestHandler = async ({ request, url }) => {
	try {
		const identity = await authApiKey(request);
		const target = await resolveQueryTarget(identity, url);
		const button = Number(url.searchParams.get('button') ?? '4');
		return json(await djmaxB100(target, button));
	} catch (err) {
		return errorResponse(err);
	}
};
