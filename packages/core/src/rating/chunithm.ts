export interface ChuniScore {
	chartId: string;
	/** 谱面定数 */
	ds: number;
	isNew: boolean;
	/** 游戏内分数（0–1010000） */
	score: number;
}

export interface ChuniBestEntry {
	chartId: string;
	score: number;
	rating: number;
	isNew: boolean;
}

export interface ChuniRating {
	/** 玩家 rating = (Σ旧曲b30 + Σ新曲b20) / 50，向下取整到 2 位小数 */
	rating: number;
	oldBest: ChuniBestEntry[];
	newBest: ChuniBestEntry[];
}

/**
 * 中二节奏单曲 rating = 定数 + 分数加成（向下取整到 2 位小数）。
 * 公式与水鱼查分器计算器一致（Diving-Fish/maimaidx-prober，MIT License）：
 *   ≥1009000: ds+2.15
 *   ≥1007500: ds+2+⌊(score-1007500)/100⌋×0.01
 *   ≥1005000: ds+1.5+⌊(score-1005000)/500⌋×0.1
 *   ≥1000000: ds+1+⌊(score-1000000)/1000⌋×0.1
 *   ≥975000:  ds+⌊(score-975000)/2500⌋×0.1
 *   ≥925000:  ds-3
 *   ≥900000:  ds-5
 *   ≥800000:  (ds-5)/2
 *   其余: 0
 */
export function chuniRatingOf(ds: number, score: number): number {
	let ra: number;
	if (score >= 1009000) ra = ds + 2.15;
	else if (score >= 1007500) ra = ds + 2 + Math.floor((score - 1007500) / 100) * 0.01;
	else if (score >= 1005000) ra = ds + 1.5 + Math.floor((score - 1005000) / 500) * 0.1;
	else if (score >= 1000000) ra = ds + 1 + Math.floor((score - 1000000) / 1000) * 0.1;
	else if (score >= 975000) ra = ds + Math.floor((score - 975000) / 2500) * 0.1;
	else if (score >= 925000) ra = ds - 3;
	else if (score >= 900000) ra = ds - 5;
	else if (score >= 800000) ra = (ds - 5) / 2;
	else ra = 0;
	return floor2(ra);
}

/**
 * 玩家 rating：旧曲 best 30 + 当前版本新曲 best 20 的平均值。
 * isNew 由曲库的版本表判定（packages/data/chunithm.json）。
 */
export function computeChuniRating(scores: ChuniScore[]): ChuniRating {
	const bestByChart = new Map<string, ChuniScore>();
	for (const s of scores) {
		const prev = bestByChart.get(s.chartId);
		if (!prev || s.score > prev.score) bestByChart.set(s.chartId, s);
	}
	const rated = [...bestByChart.values()].map((s) => ({
		chartId: s.chartId,
		score: s.score,
		rating: chuniRatingOf(s.ds, s.score),
		isNew: s.isNew
	}));
	const top = (isNew: boolean, n: number) =>
		rated
			.filter((r) => r.isNew === isNew)
			.sort((a, b) => b.rating - a.rating || b.score - a.score)
			.slice(0, n);
	const oldBest = top(false, 30);
	const newBest = top(true, 20);
	const rating = floor2(
		[...oldBest, ...newBest].reduce((sum, r) => sum + r.rating, 0) / 50
	);
	return { rating, oldBest, newBest };
}

function floor2(x: number): number {
	// 1e-6 修正浮点误差（如 15 + 2.15 = 17.149999...）
	return Math.floor(x * 100 + 1e-6) / 100;
}
