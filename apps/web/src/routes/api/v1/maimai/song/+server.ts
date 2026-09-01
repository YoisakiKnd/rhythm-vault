import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authApiKey } from '$lib/server/auth';
import { assertNumericId, errorResponse, resolveQueryTarget } from '$lib/server/api';
import { maimaiSong } from '$lib/server/scores';
import { songDetailOrThrow } from '$lib/server/song-detail';
import { scoreChannelFromParam } from '$lib/server/channel';

export const GET: RequestHandler = async ({ request, url }) => {
	try {
		const identity = await authApiKey(request);
		const target = await resolveQueryTarget(identity, url);
		const source = scoreChannelFromParam(url.searchParams.get('src'));
		const id = url.searchParams.get('id');
		const chart = url.searchParams.get('chart');
		if (id && chart) return json({ error: 'id 与 chart 不能同时传' }, { status: 400 });
		if (id) {
			assertNumericId(id);
			return json(await songDetailOrThrow('maimai', id, target, source));
		}
		if (!chart) {
			return json({ error: '缺少 id（整曲）或 chart（曲目ID:难度序号，如 1145:3）参数' }, { status: 400 });
		}
		if (!/^\d+:\d+$/.test(chart)) {
			return json({ error: 'chart 格式须为 数字ID:难度序号' }, { status: 400 });
		}
		return json(await maimaiSong(target, chart, source));
	} catch (err) {
		return errorResponse(err);
	}
};
