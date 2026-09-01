export interface MaimaiScore {
	/** 唯一标识一个谱面（如 "maimaidx:1145:MASTER"），同谱面多条成绩取最优 */
	chartId: string;
	/** 谱面定数 */
	levelValue: number;
	isNew: boolean;
	/** 达成率 0–101 */
	achievement: number;
}

export interface MaimaiBestEntry {
	chartId: string;
	achievement: number;
	rating: number;
	isNew: boolean;
}

export interface MaimaiB50 {
	rating: number;
	oldBest: MaimaiBestEntry[];
	newBest: MaimaiBestEntry[];
}

/**
 * 单曲 rating = floor(系数 × 定数 × min(达成率, 100.5) / 100)。
 *
 * 系数表与水鱼查分器的实现一致（github.com/Diving-Fish/maimaidx-prober，MIT License），
 * 边界行（79.9999 / 96.9999 / 99.9999 / 100.4999 等）是官方的卡线跳档加成，
 * 达成率不可四舍五入后再查表。
 */
const COEFFICIENT_TABLE = [
	[0, 0],
	[10, 1.6],
	[20, 3.2],
	[30, 4.8],
	[40, 6.4],
	[50, 8.0],
	[60, 9.6],
	[70, 11.2],
	[75, 12.0],
	[79.9999, 12.8],
	[80, 13.6],
	[90, 15.2],
	[94, 16.8],
	[96.9999, 17.6],
	[97, 20.0],
	[98, 20.3],
	[98.9999, 20.6],
	[99, 20.8],
	[99.5, 21.1],
	[99.9999, 21.4],
	[100, 21.6],
	[100.4999, 22.2],
	[100.5, 22.4]
] as const;

export function coefficientOf(achievement: number): number {
	for (let i = 0; i < COEFFICIENT_TABLE.length; i++) {
		if (i === COEFFICIENT_TABLE.length - 1 || achievement < COEFFICIENT_TABLE[i + 1][0]) {
			return COEFFICIENT_TABLE[i][1];
		}
	}
	return 0;
}

export function maimaiRatingOf(levelValue: number, achievement: number): number {
	return Math.floor(
		(coefficientOf(achievement) * levelValue * Math.min(100.5, achievement)) / 100
	);
}

const OLD_BEST_COUNT = 35;
const NEW_BEST_COUNT = 15;

function bestOf(entries: MaimaiBestEntry[], count: number): MaimaiBestEntry[] {
	return entries
		.sort((a, b) => b.rating - a.rating || b.achievement - a.achievement)
		.slice(0, count);
}

/** 计算 maimai DX 的 b50（旧曲 best 35 + 新曲 best 15），rating 为各谱面之和 */
export function computeMaimaiB50(scores: MaimaiScore[]): MaimaiB50 {
	const bestByChart = new Map<string, MaimaiBestEntry>();
	for (const s of scores) {
		const entry: MaimaiBestEntry = {
			chartId: s.chartId,
			achievement: s.achievement,
			rating: maimaiRatingOf(s.levelValue, s.achievement),
			isNew: s.isNew
		};
		const prev = bestByChart.get(s.chartId);
		if (
			!prev ||
			entry.rating > prev.rating ||
			(entry.rating === prev.rating && entry.achievement > prev.achievement)
		) {
			bestByChart.set(s.chartId, entry);
		}
	}

	const all = [...bestByChart.values()];
	const oldBest = bestOf(all.filter((e) => !e.isNew), OLD_BEST_COUNT);
	const newBest = bestOf(all.filter((e) => e.isNew), NEW_BEST_COUNT);
	const rating = [...oldBest, ...newBest].reduce((sum, e) => sum + e.rating, 0);
	return { rating, oldBest, newBest };
}
