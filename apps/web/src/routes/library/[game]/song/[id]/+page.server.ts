import { error } from '@sveltejs/kit';
import { getSessionUser, SESSION_COOKIE } from '$lib/server/auth';
import { parseCatalogSrc } from '$lib/catalog-nav';
import { catalogSrcToSource } from '$lib/server/channel';
import { GAME_LABEL, isGameKey } from '$lib/server/library';
import { getSongDetail } from '$lib/server/song-detail';
import { libraryListHref } from '$lib/library-query';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies, url }) => {
	const game = params.game;
	if (!isGameKey(game)) error(404, '未知游戏');
	const user = await getSessionUser(cookies.get(SESSION_COOKIE));
	const source =
		game === 'djmax' ? undefined : catalogSrcToSource(parseCatalogSrc(url.searchParams.get('src')));
	const detail = await getSongDetail(game, params.id, user?.id ?? null, source);
	if (!detail) error(404, '曲目不存在');

	const groups =
		game === 'djmax'
			? [4, 5, 6, 8]
					.map((button) => ({
						button,
						charts: detail.charts.filter((c) => c.button === button)
					}))
					.filter((g) => g.charts.length > 0)
			: [{ button: null as number | null, charts: detail.charts }];

	return {
		...detail,
		gameLabel: GAME_LABEL[game],
		loggedIn: !!user,
		listHref: libraryListHref(game, url.searchParams),
		focusDiff: url.searchParams.get('diff') ?? '',
		loginHref: `/login?next=${encodeURIComponent(url.pathname + url.search)}`,
		groups
	};
};
