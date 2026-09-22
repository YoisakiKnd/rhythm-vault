import type { RequestHandler } from './$types';
import { authApiKey } from '$lib/server/auth';
import { apiError, assertNumericId, errorResponse, resolveQueryTarget, scoreJson } from '$lib/server/api';
import { scoreChannelFromParam } from '$lib/server/channel';
import { chunithmSong } from '$lib/server/scores';
import { songDetailOrThrow } from '$lib/server/song-detail';

export const GET: RequestHandler = async ({ request, url }) => {
	try {
		const identity = await authApiKey(request);
		const query = await resolveQueryTarget(identity, url);
		const source = scoreChannelFromParam(url.searchParams.get('src'));
		const id = url.searchParams.get('id');
		const chart = url.searchParams.get('chart');
		if (id && chart) return apiError(400, 'id 与 chart 不能同时传', 'bad_request');
		if (id) {
			assertNumericId(id);
			return scoreJson(await songDetailOrThrow('chunithm', id, query.userId, source), query, {
				game: 'chunithm',
				src: source
			});
		}
		if (!chart) {
			return apiError(400, '缺少 id（整曲）或 chart（曲目ID:难度序号）参数', 'bad_request');
		}
		if (!/^\d+:\d+$/.test(chart)) {
			return apiError(400, 'chart 格式须为 数字ID:难度序号', 'bad_request');
		}
		return scoreJson(await chunithmSong(query.userId, chart, source), query, {
			game: 'chunithm',
			src: source
		});
	} catch (err) {
		return errorResponse(err);
	}
};
