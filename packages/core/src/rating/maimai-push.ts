import { maimaiRatingOf } from './maimai';

export interface PushChart {
	chartId: string;
	/** 谱面定数 */
	ds: number;
	isNew: boolean;
	/** 当前达成率（未游玩为 null/undefined） */
	achievement?: number | null;
}

export interface PushSuggestion {
	chartId: string;
	ds: number;
	isNew: boolean;
	/** 当前达成率（未游玩为 null） */
	achievement: number | null;
	/** 当前单曲 rating（未游玩为 null） */
	currentRating: number | null;
	/** 建议目标达成率 */
	target: number;
	/** 目标达成率下的单曲 rating */
	targetRating: number;
	/** 预期 rating 增量（未游玩曲目按挤入 b50 计算） */
	gain: number;
	/** 达成率还差多少个百分点；未游玩为 null */
	effort: number | null;
}

export interface PushB50Chart {
	ds: number;
	achievement: number;
	rating: number;
}

export interface PushComfort {
	/** 推荐定数下限 */
	dsLo: number;
	/** 推荐定数上限（未打谱不会超过这个） */
	dsHi: number;
	/** B50 达成率中位数，用来定未打谱的目标档 */
	typicalAch: number;
}

export interface PushResult {
	/** 已游玩：离下一档近、定数也在自己水平内 */
	improve: PushSuggestion[];
	/** 未游玩：定数接近 B50，目标按你现在常见达成率 */
	unplayed: PushSuggestion[];
	comfort: PushComfort | null;
}

const DEFAULT_TARGETS = [100.5, 100, 99.5, 99, 98.5, 98, 97, 96, 95];
/** 再涨超过这么多百分点就不算「顺手推一档」 */
const MAX_IMPROVE_EFFORT = 1.5;
const SSS_PLUS_COEFF = 22.4;

function round1(n: number): number {
	return Math.round(n * 10) / 10;
}

/** 用 B50 估「打得过」的定数带。思路接近 EasyMai：按 rating 反推 SSS+ 等价定数，再用已经 SS 过的谱封顶。 */
export function comfortFromB50(b50: PushB50Chart[]): PushComfort | null {
	if (b50.length === 0) return null;
	const totalRating = b50.reduce((s, x) => s + x.rating, 0);
	const ratingDs = round1(totalRating / (SSS_PLUS_COEFF * b50.length));
	const achSorted = b50.map((x) => x.achievement).sort((a, b) => a - b);
	const typicalAch = achSorted[Math.floor(achSorted.length / 2)] ?? 0;
	const solid = b50.filter((x) => x.achievement >= 99);
	const solidMax = solid.length > 0 ? Math.max(...solid.map((x) => x.ds)) : ratingDs;
	const dsHi = round1(Math.min(15, Math.max(solidMax + 0.3, ratingDs + 0.5)));
	const dsLo = round1(Math.max(1, Math.min(ratingDs, solidMax) - 0.3));
	return { dsLo, dsHi, typicalAch };
}

function deriveB50(charts: PushChart[]): PushB50Chart[] {
	return charts
		.filter((c) => typeof c.achievement === 'number' && c.achievement > 0)
		.map((c) => ({
			ds: c.ds,
			achievement: c.achievement as number,
			rating: maimaiRatingOf(c.ds, c.achievement as number)
		}))
		.sort((a, b) => b.rating - a.rating)
		.slice(0, 50);
}

/** 比当前常见达成率最多再高半档，不当成「去打 SSS+ 15」。 */
export function realisticTarget(typicalAch: number, targets: number[]): number {
	const stretch = typicalAch + 0.5;
	const hit = targets.find((t) => t <= stretch);
	return hit ?? targets[targets.length - 1] ?? 100;
}

/**
 * maimai 推分建议：
 * - 先用 B50 估玩家能打的定数和常见达成率
 * - improve：已经打过、离下一档很近、定数不超过自己水平
 * - unplayed：未打谱只出这条定数带里、按常见达成率当目标的
 */
export function pushSuggestions(
	charts: PushChart[],
	b50Min: number,
	opts?: { limit?: number; targets?: number[]; b50?: PushB50Chart[] }
): PushResult {
	const limit = opts?.limit ?? 20;
	const targets = opts?.targets ?? DEFAULT_TARGETS;
	const comfort = comfortFromB50(opts?.b50 ?? deriveB50(charts));

	const improve: PushSuggestion[] = [];
	const unplayed: PushSuggestion[] = [];
	const realistic = comfort ? realisticTarget(comfort.typicalAch, targets) : 100.5;

	for (const chart of charts) {
		const played = typeof chart.achievement === 'number' && chart.achievement > 0;
		if (played) {
			const ach = chart.achievement as number;
			if (ach < 97) continue;
			if (comfort && chart.ds > comfort.dsHi + 0.2 && ach < 99) continue;
			const currentRating = maimaiRatingOf(chart.ds, ach);
			const target = [...targets]
				.reverse()
				.find((t) => t > ach && maimaiRatingOf(chart.ds, t) > currentRating);
			if (target === undefined) continue;
			const effort = target - ach;
			if (effort > MAX_IMPROVE_EFFORT) continue;
			const targetRating = maimaiRatingOf(chart.ds, target);
			improve.push({
				chartId: chart.chartId,
				ds: chart.ds,
				isNew: chart.isNew,
				achievement: ach,
				currentRating,
				target,
				targetRating,
				gain: targetRating - currentRating,
				effort
			});
		} else {
			if (comfort && (chart.ds < comfort.dsLo || chart.ds > comfort.dsHi)) continue;
			const targetRating = maimaiRatingOf(chart.ds, realistic);
			if (targetRating <= b50Min) continue;
			unplayed.push({
				chartId: chart.chartId,
				ds: chart.ds,
				isNew: chart.isNew,
				achievement: null,
				currentRating: null,
				target: realistic,
				targetRating,
				gain: targetRating - b50Min,
				effort: null
			});
		}
	}

	improve.sort((a, b) => {
		const ea = a.gain / Math.max(a.effort ?? 0.05, 0.05);
		const eb = b.gain / Math.max(b.effort ?? 0.05, 0.05);
		return eb - ea || (a.effort ?? 0) - (b.effort ?? 0) || b.gain - a.gain;
	});
	unplayed.sort((a, b) => b.gain - a.gain || a.ds - b.ds);
	return {
		improve: improve.slice(0, limit),
		unplayed: unplayed.slice(0, limit),
		comfort
	};
}
