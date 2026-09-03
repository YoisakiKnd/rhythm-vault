import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { USERNAME_RE } from '$lib/server/auth';
import { findPlayerForViewer } from '$lib/server/identities';
import { loadScoreView, parseButtonParam, parseCatalogSrc, parseGameParam } from '$lib/server/score-view';
import { latestRatingsByGame } from '$lib/server/scores';

export const load: PageServerLoad = async ({ params, url, locals }) => {
	const username = params.username;
	if (!USERNAME_RE.test(username)) error(404, '玩家不存在');
	const player = await findPlayerForViewer(username, locals.user?.id ?? null);
	if (!player) error(404, '玩家不存在或未公开（需在控制台打开档案公开）');

	const game = parseGameParam(url.searchParams.get('game'));
	const button = parseButtonParam(url.searchParams.get('button'));
	const src = parseCatalogSrc(url.searchParams.get('src'));
	const [loaded, ratings] = await Promise.all([
		loadScoreView(player.id, game, button, { src, visitor: !player.isOwner }),
		latestRatingsByGame(player.id)
	]);
	return {
		game,
		button,
		username: player.username,
		createdAt: player.createdAt,
		profilePublic: player.profilePublic,
		isOwner: player.isOwner,
		ratings,
		...loaded
	};
};
