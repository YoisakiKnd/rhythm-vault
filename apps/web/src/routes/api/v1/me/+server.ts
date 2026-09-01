import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authApiKey } from '$lib/server/auth';
import { errorResponse } from '$lib/server/api';

/** 当前 API Key 对应的账号与绑定情况 */
export const GET: RequestHandler = async ({ request }) => {
	try {
		const identity = await authApiKey(request);
		return json({
			username: identity.username,
			scope: identity.scope,
			// 供 Bot 端判断可查询范围
			endpoints: [
				'/api/v1/maimai/b50',
				'/api/v1/maimai/song?id=',
				'/api/v1/maimai/song?chart=',
				'/api/v1/maimai/push',
				'/api/v1/maimai/progress',
				'/api/v1/chunithm/b30',
				'/api/v1/chunithm/song?id=',
				'/api/v1/chunithm/song?chart=',
				'/api/v1/chunithm/progress',
				'/api/v1/djmax/b100',
				'/api/v1/djmax/song?id=',
				'/api/v1/djmax/song',
				'/api/v1/djmax/progress',
				'/api/v1/maimai/sheet',
				'/api/v1/chunithm/sheet',
				'/api/v1/djmax/sheet',
				'POST /api/v1/identities/verify'
			]
		});
	} catch (err) {
		return errorResponse(err);
	}
};
