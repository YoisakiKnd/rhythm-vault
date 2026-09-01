import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { findPublicPlayer } from '$lib/server/identities';
import { loadScoreView, parseButtonParam, parseCatalogSrc, parseGameParam } from '$lib/server/score-view';
import { viewSections, type BestEntry } from '$lib/score-types';

function bestList(view: { kind: string } | null): BestEntry[] {
	if (!view) return [];
	return viewSections(view as Parameters<typeof viewSections>[0]).flatMap((s) => s.list);
}

export const load: PageServerLoad = async ({ url }) => {
	const game = parseGameParam(url.searchParams.get('game'));
	const button = parseButtonParam(url.searchParams.get('button'));
	const src = parseCatalogSrc(url.searchParams.get('src'));
	const aName = (url.searchParams.get('a') ?? '').trim();
	const bName = (url.searchParams.get('b') ?? '').trim();

	if (!aName || !bName) {
		return { game, button, src, aName, bName, ready: false as const };
	}
	if (aName === bName) error(400, '请选择两位不同的玩家对比');

	const aPlayer = await findPublicPlayer(aName);
	const bPlayer = await findPublicPlayer(bName);
	if (!aPlayer || !bPlayer) error(404, '玩家不存在或未公开（需在控制台打开档案公开）');

	const [a, b] = await Promise.all([
		loadScoreView(aPlayer.id, game, button, { includeHistory: false, src }),
		loadScoreView(bPlayer.id, game, button, { includeHistory: false, src })
	]);

	const bMap = new Map(bestList(b.view).map((r) => [r.chartKey, r]));
	const overlap = [];
	for (const row of bestList(a.view)) {
		const other = bMap.get(row.chartKey);
		if (!other) continue;
		overlap.push({
			chartKey: row.chartKey,
			title: row.title,
			label: row.label,
			cover: row.cover,
			aScore: row.score,
			bScore: other.score,
			aRating: row.rating,
			bRating: other.rating,
			delta: (row.score ?? 0) - (other.score ?? 0)
		});
	}
	overlap.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));

	return {
		game,
		button,
		src,
		aName: aPlayer.username,
		bName: bPlayer.username,
		ready: true as const,
		a,
		b,
		overlap
	};
};
