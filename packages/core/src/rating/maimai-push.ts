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
	/** 当前单曲 rating（未游玩为 null） */
	currentRating: number | null;
	/** 建议目标达成率 */
	target: number;
	/** 目标达成率下的单曲 rating */
	targetRating: number;
	/** 预期 rating 增量（未游玩曲目按挤入 b50 计算） */
	gain: number;
}

export interface PushResult {
	/** 已游玩且有提升空间的曲目，按增量降序 */
	improve: PushSuggestion[];
	/** 未游玩但挤入 b50 门槛最低（目标档位最宽松）的曲目，按目标 rating 降序 */
	unplayed: PushSuggestion[];
}

const DEFAULT_TARGETS = [100.5, 100, 99.5, 99, 98.5, 98, 97, 96, 95];

/**
 * maimai 推分建议（纯函数）：
 * - improve：已游玩曲目中，比当前成绩高一档目标就能提升 rating 的，按增量排序
 * - unplayed：未游玩曲目中，某个目标档位即可超过 b50 末位（挤入 b50）的，按目标档位宽松度排序
 * gain 只反映单曲 rating 差值；是否真的挤入/顶出 b50 由 b50 组成决定，接口层展示时说明。
 */
export function pushSuggestions(
	charts: PushChart[],
	b50Min: number,
	opts?: { limit?: number; targets?: number[] }
): PushResult {
	const limit = opts?.limit ?? 20;
	const targets = opts?.targets ?? DEFAULT_TARGETS;

	const improve: PushSuggestion[] = [];
	const unplayed: PushSuggestion[] = [];

	for (const chart of charts) {
		const played = typeof chart.achievement === 'number' && chart.achievement > 0;
		if (played) {
			const currentRating = maimaiRatingOf(chart.ds, chart.achievement!);
			// 升序找"最宽松的更高档位"（targets 本身是降序表）
			const target = [...targets]
				.reverse()
				.find((t) => t > chart.achievement! && maimaiRatingOf(chart.ds, t) > currentRating);
			if (target === undefined) continue;
			const targetRating = maimaiRatingOf(chart.ds, target);
			improve.push({
				chartId: chart.chartId,
				ds: chart.ds,
				isNew: chart.isNew,
				currentRating,
				target,
				targetRating,
				gain: targetRating - currentRating
			});
		} else {
			// 未游玩：找能超过 b50 末位的最宽松目标档
			const target = targets.find((t) => maimaiRatingOf(chart.ds, t) > b50Min);
			if (target === undefined) continue;
			const targetRating = maimaiRatingOf(chart.ds, target);
			unplayed.push({
				chartId: chart.chartId,
				ds: chart.ds,
				isNew: chart.isNew,
				currentRating: null,
				target,
				targetRating,
				gain: targetRating - b50Min
			});
		}
	}

	improve.sort((a, b) => b.gain - a.gain || b.ds - a.ds);
	unplayed.sort((a, b) => b.targetRating - a.targetRating || a.target - b.target);
	return { improve: improve.slice(0, limit), unplayed: unplayed.slice(0, limit) };
}
