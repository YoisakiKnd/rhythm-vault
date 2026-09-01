import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { parseCatalogSrc } from '$lib/catalog-nav';
import { parseDlcParam } from '$lib/library-query';
import { isGameKey, queryLibrary } from '$lib/server/library';

/** 曲库列表分页 JSON（无限滚动用，公开端点） */
export const GET: RequestHandler = ({ params, url }) => {
	try {
		if (!isGameKey(params.game)) return json({ error: '未知游戏' }, { status: 400 });
		const game = params.game;
		let diff = url.searchParams.get('diff') ?? '';
		if (game === 'djmax' && !diff) diff = '4B';
		const result = queryLibrary(game, {
			q: url.searchParams.get('q') ?? '',
			diff,
			pattern: url.searchParams.get('pattern') ?? '',
			level: url.searchParams.get('level') ?? '',
			onlyNew: url.searchParams.get('new') === '1',
			src: game === 'djmax' ? undefined : parseCatalogSrc(url.searchParams.get('src')),
			dlcs: parseDlcParam(url.searchParams.get('dlc')),
			page: Number(url.searchParams.get('page') ?? '1') || 1
		});
		return json(result);
	} catch {
		return json({ error: '曲库暂时不可用' }, { status: 500 });
	}
};
