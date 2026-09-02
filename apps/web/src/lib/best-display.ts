import type { ScoreView } from './score-types';

const MAIMAI_DIFF = ['BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'REMASTER', 'UTAGE'] as const;
const CHUNI_DIFF = ['BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'ULTIMA', 'WORLDS_END'] as const;

const DIFF_ACCENT: Record<string, string> = {
	BASIC: '#22c55e',
	NM: '#22c55e',
	ADVANCED: '#eab308',
	HD: '#eab308',
	EXPERT: '#ef4444',
	SC: '#f97316',
	MASTER: '#a855f7',
	MX: '#a855f7',
	REMASTER: '#e9d5ff',
	ULTIMA: '#111827',
	UTAGE: '#f472b6',
	WORLDS_END: '#f472b6',
	OTHER: '#f472b6'
};

/** 从 chartKey 还原难度，给宫格左边条上色 */
export function diffKeyFromChartKey(chartKey: string): string {
	const parts = chartKey.split(':');
	if (parts[0] === 'djmax') return parts[3] ?? '';
	const idx = Number(parts.at(-1));
	if (!Number.isInteger(idx) || idx < 0) return '';
	if (parts[0] === 'chunithm') return CHUNI_DIFF[idx] ?? '';
	return MAIMAI_DIFF[idx] ?? '';
}

export function diffAccent(diffKey: string): string {
	return DIFF_ACCENT[diffKey] ?? '#64748b';
}

export function compactScore(score: number | null, kind: 'pct' | 'v' | 'score'): string {
	if (score === null) return '—';
	if (kind === 'pct') {
		if (score >= 100) return `${score.toFixed(1)}%`;
		return `${score.toFixed(2)}%`;
	}
	if (kind === 'v') return score.toFixed(1);
	return String(Math.round(score));
}

export function compactRating(kind: ScoreView['kind'], n: number): string {
	if (kind === 'maimai') return String(Math.round(n));
	return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

/** 达成率/分数文字色：越高越亮，方便扫宫格 */
export function scoreToneClass(kind: 'pct' | 'v' | 'score', score: number | null): string {
	if (score === null) return 'text-base-content/35';
	if (kind === 'pct') {
		if (score >= 100.5) return 'text-amber-300';
		if (score >= 100) return 'text-yellow-200';
		if (score >= 99) return 'text-orange-300';
		if (score >= 97) return 'text-sky-300';
		return 'text-base-content/80';
	}
	if (kind === 'v') {
		if (score >= 100) return 'text-amber-300';
		if (score >= 99) return 'text-yellow-200';
		if (score >= 95) return 'text-sky-300';
		return 'text-base-content/80';
	}
	if (score >= 1009000) return 'text-amber-300';
	if (score >= 1007500) return 'text-yellow-200';
	if (score >= 1000000) return 'text-sky-300';
	return 'text-base-content/80';
}
