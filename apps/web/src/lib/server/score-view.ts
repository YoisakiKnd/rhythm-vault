import { AuthError } from './auth';
import { catalogSrcLabel, catalogSrcToSource } from './channel';
import { chartMetaMap, GAME_LABEL, type ChartMeta } from './library';
import {
	chunithmB30,
	djmaxB100,
	maimaiB50,
	maimaiPush,
	ratingHistory,
	type MaimaiPushResult,
	type RatingHistoryPoint
} from './scores';
import {
	type BestEntry,
	type GameViewKey,
	type ScoreView,
	parseButtonParam,
	parseGameParam
} from '../score-types';
import { parseCatalogSrc, type CatalogSrc } from '../catalog-nav';

export type { BestEntry, GameViewKey, ScoreView };
export { parseButtonParam, parseGameParam, viewSections } from '../score-types';
export { parseCatalogSrc } from '../catalog-nav';

export function decorateBest(
	entries: Array<{ chartKey: string; score: number | null; rating: number | null }>,
	meta: Map<string, ChartMeta>
): BestEntry[] {
	return entries.map((e) => {
		const m = meta.get(e.chartKey);
		return {
			chartKey: e.chartKey,
			title: m?.title ?? e.chartKey,
			label: m?.label ?? '',
			value: m?.value ?? 0,
			cover: m?.cover ?? '',
			score: e.score,
			rating: e.rating
		};
	});
}

export async function loadScoreView(
	userId: number,
	game: GameViewKey,
	button: number,
	opts?: { includePush?: boolean; includeHistory?: boolean; src?: CatalogSrc }
): Promise<{
	view: ScoreView | null;
	error: string | null;
	push: MaimaiPushResult | null;
	history: RatingHistoryPoint[];
	gameLabel: string;
	src: CatalogSrc;
	srcLabel: string;
}> {
	const src = game === 'djmax' ? 'df' : parseCatalogSrc(opts?.src);
	const srcLabel = game === 'djmax' ? '' : catalogSrcLabel(src);
	let view: ScoreView | null = null;
	let error: string | null = null;
	let push: MaimaiPushResult | null = null;
	try {
		if (game === 'maimai') {
			const source = catalogSrcToSource(src);
			const b50 = await maimaiB50(userId, source);
			const meta = chartMetaMap('maimai');
			view = {
				kind: 'maimai',
				rating: b50.rating,
				oldBest: decorateBest(b50.oldBest, meta),
				newBest: decorateBest(b50.newBest, meta),
				syncedAt: b50.syncedAt
			};
			if (opts?.includePush) {
				try {
					push = await maimaiPush(userId, source);
				} catch (err) {
					console.warn('[scores] 推分建议计算失败', err);
				}
			}
		} else if (game === 'chunithm') {
			const b30 = await chunithmB30(userId, catalogSrcToSource(src));
			view = {
				kind: 'chunithm',
				rating: b30.rating,
				oldBest: b30.oldBest,
				newBest: b30.newBest,
				syncedAt: b30.syncedAt
			};
		} else {
			const b100 = await djmaxB100(userId, button);
			const meta = chartMetaMap('djmax');
			view = {
				kind: 'djmax',
				button: b100.button,
				rating: b100.rating,
				basic: decorateBest(b100.basic, meta),
				new: decorateBest(b100.new, meta),
				syncedAt: b100.syncedAt
			};
		}
	} catch (err) {
		error = err instanceof AuthError ? err.message : '加载失败，请稍后再试';
	}

	const dbGame = game === 'maimai' ? 'maimai_dx' : game;
	const history = opts?.includeHistory === false ? [] : await ratingHistory(userId, dbGame);
	return { view, error, push, history, gameLabel: GAME_LABEL[game], src, srcLabel };
}
