import type { PageServerLoad } from './$types';
import { loadScoreView, parseButtonParam, parseCatalogSrc, parseGameParam } from '$lib/server/score-view';

export const load: PageServerLoad = async ({ url, parent }) => {
	const { user } = await parent();
	const game = parseGameParam(url.searchParams.get('game'));
	const button = parseButtonParam(url.searchParams.get('button'));
	const src = parseCatalogSrc(url.searchParams.get('src'));
	const loaded = await loadScoreView(user.id, game, button, { includePush: true, src });
	return { game, button, username: user.username, ...loaded };
};
