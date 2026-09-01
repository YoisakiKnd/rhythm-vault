/** 纯函数：从已读成绩行挑 maimai b50。push 复用全量扫描结果，避免再查一遍。 */

export interface ScorePickRow {
	chartKey: string;
	score: number | null;
	rating: number | null;
	isNew: boolean;
	updatedAt: Date;
}

export interface MaimaiB50Picked {
	rating: number;
	oldBest: Array<{ chartKey: string; score: number | null; rating: number | null }>;
	newBest: Array<{ chartKey: string; score: number | null; rating: number | null }>;
	syncedAt: string | null;
}

export function newestUpdatedAt(rows: Array<{ updatedAt: Date }>): string | null {
	return (
		rows.reduce<Date | null>(
			(acc, r) => (acc === null || r.updatedAt > acc ? r.updatedAt : acc),
			null
		)?.toISOString() ?? null
	);
}

export function pickMaimaiB50FromRows(rows: ScorePickRow[]): MaimaiB50Picked {
	const rated = rows
		.filter((r) => r.rating !== null)
		.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
	const pick = (isNew: boolean, n: number) =>
		rated
			.filter((r) => r.isNew === isNew)
			.slice(0, n)
			.map((r) => ({ chartKey: r.chartKey, score: r.score, rating: r.rating }));
	const oldBest = pick(false, 35);
	const newBest = pick(true, 15);
	return {
		rating: [...oldBest, ...newBest].reduce((s, r) => s + (r.rating ?? 0), 0),
		oldBest,
		newBest,
		syncedAt: newestUpdatedAt(rows)
	};
}
