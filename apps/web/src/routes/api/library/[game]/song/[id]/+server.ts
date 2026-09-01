import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isGameKey, getSongCatalog } from '$lib/server/library';
import { songDetailJson } from '$lib/server/song-detail';

/** 公开曲库单曲（无成绩）：GET /api/library/{game}/song/{id} */
export const GET: RequestHandler = ({ params }) => {
	try {
		if (!isGameKey(params.game)) return json({ error: '未知游戏' }, { status: 400 });
		const catalog = getSongCatalog(params.game, params.id);
		if (!catalog) return json({ error: '曲目不存在' }, { status: 404 });
		return json(
			songDetailJson({
				...catalog,
				charts: catalog.charts.map((c) => ({ ...c, mine: null })),
				syncedAt: null
			})
		);
	} catch {
		return json({ error: '曲库暂时不可用' }, { status: 500 });
	}
};
