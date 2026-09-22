import type { RequestHandler } from './$types';
import { authApiKey } from '$lib/server/auth';
import { apiError, assertNumericId, errorResponse, resolveQueryTarget, scoreJson } from '$lib/server/api';
import { djmaxSong } from '$lib/server/scores';
import { songDetailOrThrow } from '$lib/server/song-detail';

export const GET: RequestHandler = async ({ request, url }) => {
	try {
		const identity = await authApiKey(request);
		const query = await resolveQueryTarget(identity, url);
		const song = url.searchParams.get('id') ?? url.searchParams.get('song');
		const pattern = url.searchParams.get('pattern');
		const button = Number(url.searchParams.get('button') ?? '4');
		if (!song) return apiError(400, '缺少 id 或 song 参数（V-ARCHIVE 曲目数字 ID）', 'bad_request');
		assertNumericId(song, 'id');
		if (!pattern) {
			return scoreJson(await songDetailOrThrow('djmax', song, query.userId), query, {
				game: 'djmax',
				src: 'varchive'
			});
		}
		const result = await djmaxSong(query.userId, Number(song), pattern, button);
		return scoreJson(result, query, { game: 'djmax', src: 'varchive' });
	} catch (err) {
		return errorResponse(err);
	}
};
