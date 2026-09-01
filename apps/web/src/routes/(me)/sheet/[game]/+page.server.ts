import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { parseCatalogSrc, parseDjmaxDiff } from '$lib/catalog-nav';
import {
	isGameKey,
	libraryFilterOptions,
	GAME_LABEL,
	parseSheetSearch,
	queryChartSheet
} from '$lib/server/completion';

export const load: PageServerLoad = async ({ params, url, parent }) => {
	const { user } = await parent();
	if (!isGameKey(params.game)) error(404, '未知游戏');
	const game = params.game;
	const opts = parseSheetSearch(game, url);
	const loaded = await queryChartSheet(user.id, game, opts);
	const src = game === 'djmax' ? 'df' : parseCatalogSrc(url.searchParams.get('src'));
	const button =
		game === 'djmax' ? Number(parseDjmaxDiff(opts.diff).replace('B', '')) : undefined;
	return {
		game,
		gameLabel: GAME_LABEL[game],
		filters: libraryFilterOptions(game),
		src,
		button,
		username: user.username,
		q: opts.q ?? '',
		diff: opts.diff ?? '',
		pattern: opts.pattern ?? '',
		level: opts.level ?? '',
		onlyNew: opts.onlyNew ?? false,
		dlcs: opts.dlcs ?? [],
		resultFilter: opts.resultFilter ?? 'all',
		...loaded
	};
};
