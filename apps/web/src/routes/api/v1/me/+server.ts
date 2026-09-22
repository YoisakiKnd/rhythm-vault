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
			canQueryByQq: identity.scope === 'bot',
			query:
				identity.scope === 'bot'
					? '查别人只能带 ?qq=。该 QQ 须已在网站验证，并且打开了「允许 Bot 查询」。不能用网站用户名查人。'
					: '这把 Key 只能查自己。查别人需要 Bot Key，并带已验证且允许 Bot 查询的 ?qq=。',
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
				'/api/v1/library/{game}/search?q=',
				'POST /api/v1/identities/verify'
			]
		});
	} catch (err) {
		return errorResponse(err);
	}
};
