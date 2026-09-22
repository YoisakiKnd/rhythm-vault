import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AuthError, authApiKey } from '$lib/server/auth';
import { errorResponse } from '$lib/server/api';
import { clampSearchLimit, isGameKey, searchLibrary } from '$lib/server/library';

/** 曲名搜索：GET /api/v1/library/{game}/search?q=&limit=5 */
export const GET: RequestHandler = async ({ params, request, url }) => {
	try {
		await authApiKey(request);
		if (!isGameKey(params.game)) throw new AuthError(400, '未知游戏', 'bad_request');
		const q = url.searchParams.get('q') ?? '';
		if (!q.trim()) throw new AuthError(400, '需要 q 参数（曲名）', 'bad_request');
		if (q.trim().length > 80) throw new AuthError(400, 'q 最长 80 字符', 'bad_request');
		const limit = clampSearchLimit(Number(url.searchParams.get('limit') ?? '5'));
		return json({ results: searchLibrary(params.game, q, limit) });
	} catch (err) {
		if (err instanceof AuthError) return errorResponse(err);
		console.error('[library/search]', err);
		return json({ error: '曲库暂时不可用', code: 'internal' }, { status: 500 });
	}
};
