import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authApiKey } from '$lib/server/auth';
import { errorResponse, resolveQueryTarget } from '$lib/server/api';
import { maimaiProgress } from '$lib/server/progress';
import { parseCatalogSrc } from '$lib/catalog-nav';

/** 完成度进度：GET /api/v1/maimai/progress（可加 ?qq= 按查询账号检索；?src=lxns 切落雪） */
export const GET: RequestHandler = async ({ request, url }) => {
	try {
		const identity = await authApiKey(request);
		const target = await resolveQueryTarget(identity, url);
		return json(await maimaiProgress(target, parseCatalogSrc(url.searchParams.get('src'))));
	} catch (err) {
		return errorResponse(err);
	}
};
