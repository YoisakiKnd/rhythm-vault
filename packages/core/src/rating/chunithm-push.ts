import { chuniRatingOf } from './chunithm';

export interface ChuniPushChart {
	chartId: string;
	/** 谱面定数 */
	ds: number;
	isNew: boolean;
	/** 当前分数（未游玩为 null/undefined） */
	score?: number | null;
}

export interface ChuniPushSuggestion {
	chartId: string;
	ds: number;
	isNew: boolean;
	/** 当前分数（未游玩为 null） */
	score: number | null;
	/** 当前单曲 rating（未游玩为 null） */
	currentRating: number | null;
	/** 建议目标分数 */
	target: number;
	/** 目标分数下的单曲 rating */
	targetRating: number;
	/** 预期 rating 增量（未游玩曲目按挤入 best50 计算） */
	gain: number;
	/** 分数还差多少；未游玩为 null */
	effort: number | null;
}

export interface ChuniPushBestChart {
	ds: number;
	score: number;
	rating: number;
}

export interface ChuniPushComfort {
	/** 推荐定数下限 */
	dsLo: number;
	/** 推荐定数上限（未打谱不会超过这个） */
	dsHi: number;
	/** B30+B20 分数中位数，用来定未打谱的目标档 */
	typicalScore: number;
}

export interface ChuniPushResult {
	/** 已游玩：离下一档近、定数也在自己水平内 */
	improve: ChuniPushSuggestion[];
	/** 未游玩：定数接近 best50，目标按你现在常见分数 */
	unplayed: ChuniPushSuggestion[];
	comfort: ChuniPushComfort | null;
}

/** 推分目标分数档（从高到低）；跨档会改 rating 公式 */
const DEFAULT_TARGETS = [1009000, 1007500, 1005000, 1000000, 990000, 975000];
/** 再涨超过这么多分就不算「顺手推一档」 */
const MAX_IMPROVE_EFFORT = 15000;
/** SSS+ 加成，用来从总评反推等价定数 */
const SSS_PLUS_ADD = 2.15;
/** 低于此分的已打谱不参与 improve */
const MIN_IMPROVE_SCORE = 975000;

function round1(n: number): number {
	return Math.round(n * 10) / 10;
}

function round2(n: number): number {
	return Math.round(n * 100) / 100;
}

/** 用 B30+B20 估「打得过」的定数带。按 rating 反推 SSS+ 等价定数，再用已经 SS 过的谱封顶。 */
export function comfortFromBest50(best: ChuniPushBestChart[]): ChuniPushComfort | null {
	if (best.length === 0) return null;
	const avgRating = best.reduce((s, x) => s + x.rating, 0) / best.length;
	const ratingDs = round1(avgRating - SSS_PLUS_ADD);
	const scoreSorted = best.map((x) => x.score).sort((a, b) => a - b);
	const typicalScore = scoreSorted[Math.floor(scoreSorted.length / 2)] ?? 0;
	const solid = best.filter((x) => x.score >= 1000000);
	const solidMax = solid.length > 0 ? Math.max(...solid.map((x) => x.ds)) : ratingDs;
	const dsHi = round1(Math.min(16, Math.max(solidMax + 0.3, ratingDs + 0.5)));
	const dsLo = round1(Math.max(1, Math.min(ratingDs, solidMax) - 0.3));
	return { dsLo, dsHi, typicalScore };
}

function deriveBest50(charts: ChuniPushChart[]): ChuniPushBestChart[] {
	return charts
		.filter((c) => typeof c.score === 'number' && c.score > 0)
		.map((c) => ({
			ds: c.ds,
			score: c.score as number,
			rating: chuniRatingOf(c.ds, c.score as number)
		}))
		.sort((a, b) => b.rating - a.rating)
		.slice(0, 50);
}

/** 比当前常见分数最多再高半档，不当成「去打 15+ AJC」。 */
export function chuniRealisticTarget(typicalScore: number, targets: number[]): number {
	const stretch = typicalScore + 5000;
	const hit = targets.find((t) => t <= stretch);
	return hit ?? targets[targets.length - 1] ?? 1000000;
}

/**
 * 中二节奏推分建议：
 * - 先用 B30+B20 估玩家能打的定数和常见分数
 * - improve：已经打过、离下一档很近、定数不超过自己水平
 * - unplayed：未打谱只出这条定数带里、按常见分数当目标的
 */
export function chuniPushSuggestions(
	charts: ChuniPushChart[],
	bestMin: number,
	opts?: { limit?: number; targets?: number[]; best50?: ChuniPushBestChart[] }
): ChuniPushResult {
	const limit = opts?.limit ?? 20;
	const targets = opts?.targets ?? DEFAULT_TARGETS;
	const comfort = comfortFromBest50(opts?.best50 ?? deriveBest50(charts));

	const improve: ChuniPushSuggestion[] = [];
	const unplayed: ChuniPushSuggestion[] = [];
	const realistic = comfort ? chuniRealisticTarget(comfort.typicalScore, targets) : 1009000;

	for (const chart of charts) {
		const played = typeof chart.score === 'number' && chart.score > 0;
		if (played) {
			const score = chart.score as number;
			if (score < MIN_IMPROVE_SCORE) continue;
			if (comfort && chart.ds > comfort.dsHi + 0.2 && score < 1000000) continue;
			const currentRating = chuniRatingOf(chart.ds, score);
			const target = [...targets]
				.reverse()
				.find((t) => t > score && chuniRatingOf(chart.ds, t) > currentRating);
			if (target === undefined) continue;
			const effort = target - score;
			if (effort > MAX_IMPROVE_EFFORT) continue;
			const targetRating = chuniRatingOf(chart.ds, target);
			improve.push({
				chartId: chart.chartId,
				ds: chart.ds,
				isNew: chart.isNew,
				score,
				currentRating,
				target,
				targetRating,
				gain: round2(targetRating - currentRating),
				effort
			});
		} else {
			if (comfort && (chart.ds < comfort.dsLo || chart.ds > comfort.dsHi)) continue;
			const targetRating = chuniRatingOf(chart.ds, realistic);
			if (targetRating <= bestMin) continue;
			unplayed.push({
				chartId: chart.chartId,
				ds: chart.ds,
				isNew: chart.isNew,
				score: null,
				currentRating: null,
				target: realistic,
				targetRating,
				gain: round2(targetRating - bestMin),
				effort: null
			});
		}
	}

	improve.sort((a, b) => {
		const ea = a.gain / Math.max((a.effort ?? 500) / 1000, 0.05);
		const eb = b.gain / Math.max((b.effort ?? 500) / 1000, 0.05);
		return eb - ea || (a.effort ?? 0) - (b.effort ?? 0) || b.gain - a.gain;
	});
	unplayed.sort((a, b) => b.gain - a.gain || a.ds - b.ds);
	return {
		improve: improve.slice(0, limit),
		unplayed: unplayed.slice(0, limit),
		comfort
	};
}
