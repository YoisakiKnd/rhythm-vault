/** 达成率 / V 值 / 中二分数的统一展示 */
export function formatScore(score: number | null, kind: 'pct' | 'v' | 'score'): string {
	if (score === null) return '—';
	if (kind === 'pct') return `${score.toFixed(4)}%`;
	if (kind === 'v') return score.toFixed(2);
	return String(Math.round(score));
}

export function scoreKindOf(game: 'maimai' | 'chunithm' | 'djmax'): 'pct' | 'v' | 'score' {
	if (game === 'maimai') return 'pct';
	if (game === 'djmax') return 'v';
	return 'score';
}
