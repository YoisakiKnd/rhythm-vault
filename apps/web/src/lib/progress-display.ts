export interface ProgressStackInput {
	total: number;
	played: number;
	fc: number;
	pp: number;
}

export interface ProgressStackPart {
	key: 'pp' | 'fc' | 'played' | 'rest';
	n: number;
	pct: number;
}

/** 理论 ⊂ FC ⊂ 已游玩 ⊂ 全部；越界时向下夹紧，避免叠条溢出 */
export function progressStack(b: ProgressStackInput): ProgressStackPart[] {
	const total = Math.max(0, b.total);
	if (total === 0) {
		return [
			{ key: 'pp', n: 0, pct: 0 },
			{ key: 'fc', n: 0, pct: 0 },
			{ key: 'played', n: 0, pct: 0 },
			{ key: 'rest', n: 0, pct: 100 }
		];
	}
	const played = Math.min(Math.max(0, b.played), total);
	const pp = Math.min(Math.max(0, b.pp), played);
	const fc = Math.min(Math.max(pp, b.fc), played);
	const parts: ProgressStackPart[] = [
		{ key: 'pp', n: pp, pct: (pp / total) * 100 },
		{ key: 'fc', n: fc - pp, pct: ((fc - pp) / total) * 100 },
		{ key: 'played', n: played - fc, pct: ((played - fc) / total) * 100 },
		{ key: 'rest', n: total - played, pct: ((total - played) / total) * 100 }
	];
	return parts;
}

export function completionPct(played: number, total: number): number {
	if (total <= 0) return 0;
	return Math.round((played / total) * 1000) / 10;
}
