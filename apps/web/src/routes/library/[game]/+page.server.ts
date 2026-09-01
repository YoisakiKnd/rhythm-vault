import { error } from '@sveltejs/kit';
import { parseCatalogSrc } from '$lib/catalog-nav';
import { parseDlcParam } from '$lib/library-query';
import { getLibrary, isGameKey, GAME_LABEL, libraryFilterOptions, queryLibrary } from '$lib/server/library';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, url }) => {
	const game = params.game;
	if (!isGameKey(game)) error(404, '未知游戏');

	const q = url.searchParams.get('q') ?? '';
	const src = parseCatalogSrc(url.searchParams.get('src'));
	const dlcs = parseDlcParam(url.searchParams.get('dlc'));
	let diff = url.searchParams.get('diff') ?? '';
	if (game === 'djmax' && !diff) diff = '4B';
	const pattern = url.searchParams.get('pattern') ?? '';
	const level = url.searchParams.get('level') ?? '';
	const onlyNew = url.searchParams.get('new') === '1';
	const filters = libraryFilterOptions(game);
	const result = queryLibrary(game, {
		q,
		diff,
		pattern,
		level,
		onlyNew,
		src: game === 'djmax' ? undefined : src,
		dlcs,
		page: Number(url.searchParams.get('page') ?? '1') || 1
	});

	return {
		game,
		gameLabel: GAME_LABEL[game],
		totalSongs: getLibrary(game).songs.length,
		filters,
		q,
		diff,
		pattern,
		level,
		onlyNew,
		src,
		dlcs,
		...result
	};
};
