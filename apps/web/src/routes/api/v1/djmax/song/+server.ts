import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authApiKey } from '$lib/server/auth';
import { assertNumericId, errorResponse, resolveQueryTarget } from '$lib/server/api';
import { djmaxSong } from '$lib/server/scores';
import { songDetailOrThrow } from '$lib/server/song-detail';

export const GET: RequestHandler = async ({ request, url }) => {
	try {
		const identity = await authApiKey(request);
		const target = await resolveQueryTarget(identity, url);
		const song = url.searchParams.get('id') ?? url.searchParams.get('song');
		const pattern = url.searchParams.get('pattern');
		const button = Number(url.searchParams.get('button') ?? '4');
		if (!song) return json({ error: '缺少 id 或 song 参数（V-ARCHIVE 曲目数字 ID）' }, { status: 400 });
		assertNumericId(song, 'id');
		if (!pattern) return json(await songDetailOrThrow('djmax', song, target));
		const result = await djmaxSong(target, Number(song), pattern, button);
		return json(result);
	} catch (err) {
		return errorResponse(err);
	}
};
