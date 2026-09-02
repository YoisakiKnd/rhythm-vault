import { djmaxClassLabel, djmaxTier } from '@rhythm-vault/core';
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
	if (kind === 'v') return `${score.toFixed(2)}%`;
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

/** 没有 floorName 时从 SC14 / 12 里抠整数等级 */
export function djmaxFloorLabel(floorName: string | null | undefined, levelLabel: string): string {
	if (floorName) return floorName;
	const m = levelLabel.match(/(\d+(?:\.\d+)?)/);
	return m?.[1] ?? '';
}

/** 로페봇：층 ≥ 15 标红 */
export function djmaxFloorHot(floor: string): boolean {
	const n = Number.parseFloat(floor);
	return Number.isFinite(n) && n >= 15;
}

/** 徽章文案：SC14 / MX15，和로페봇一致 */
export function djmaxBadgeText(pattern: string, levelLabel: string): string {
	if (!pattern) return levelLabel;
	if (levelLabel.startsWith(pattern)) return levelLabel;
	return `${pattern}${levelLabel}`;
}

export function djmaxPatternStyle(pattern: string): { bg: string; fg: string } {
	switch (pattern) {
		case 'SC':
			return { bg: '#7c3aed', fg: '#ffffff' };
		case 'MX':
			return { bg: '#dc2626', fg: '#ffffff' };
		case 'HD':
			return { bg: '#ca8a04', fg: '#ffffff' };
		case 'NM':
			return { bg: '#16a34a', fg: '#ffffff' };
		default:
			return { bg: '#525252', fg: '#ffffff' };
	}
}

export function djmaxScoreColor(score: number | null): string {
	if (score == null) return '#737373';
	if (score >= 100) return '#fde68a';
	if (score >= 98) return '#fef3c7';
	return '#f5f5f5';
}

/** 舞萌 DX Rating 段位色，阈值与游戏内数字颜色一致（白→虹） */
const MAIMAI_RATING_COLORS: Array<readonly [number, string]> = [
	[15000, '#db2777'],
	[14500, '#0891b2'],
	[14000, '#d97706'],
	[13000, '#64748b'],
	[12000, '#b45309'],
	[10000, '#9333ea'],
	[7000, '#dc2626'],
	[4000, '#ca8a04'],
	[2000, '#16a34a'],
	[1000, '#0284c7'],
	[0, '#78716c']
];

/** 中二 Rating 段位色：绿 / 橙 / 红 / 紫 / 铜 / 银 / 金 / 铂 / 虹 */
const CHUNI_RATING_COLORS: Array<readonly [number, string]> = [
	[16, '#db2777'],
	[15.25, '#0891b2'],
	[14.5, '#d97706'],
	[13.25, '#64748b'],
	[12, '#b45309'],
	[10, '#9333ea'],
	[7, '#dc2626'],
	[4, '#ea580c'],
	[0, '#16a34a']
];

/** 官方 DJ CLASS 徽章光谱（灰→蓝→青→绿→黄→橙→红→紫），取样自游戏内 emblem 图 */
const DJMAX_TIER_COLOR: Record<string, string> = {
	lord: '#b691c1',
	beatmaestro: '#c24751',
	showstopper: '#fb5f4d',
	headliner: '#f97431',
	trendsetter: '#fb8f11',
	professional: '#ffcf27',
	highclass: '#d6d42a',
	prodj: '#acd708',
	middleman: '#6ed254',
	streetdj: '#62d3ab',
	rookie: '#45c4bf',
	amateur: '#67b8d4',
	trainee: '#89c6f5',
	beginner: '#9aa3a8'
};

function pickBand(rating: number, bands: Array<readonly [number, string]>): string {
	for (const [min, color] of bands) {
		if (rating >= min) return color;
	}
	return bands[bands.length - 1]?.[1] ?? '#78716c';
}

/** DX Rating / 中二 Rating / DJ Power 100 段位强调色（深浅底都能看清） */
export function ratingAccentColor(kind: ScoreView['kind'], rating: number): string {
	if (kind === 'maimai') return pickBand(rating, MAIMAI_RATING_COLORS);
	if (kind === 'chunithm') return pickBand(rating, CHUNI_RATING_COLORS);
	return DJMAX_TIER_COLOR[djmaxTier(rating).tier] ?? '#d6d42a';
}

export { djmaxClassLabel };

export function maimaiRank(achievement: number | null): string {
	if (achievement == null) return '';
	if (achievement >= 100.5) return 'SSS+';
	if (achievement >= 100) return 'SSS';
	if (achievement >= 99.5) return 'SS+';
	if (achievement >= 99) return 'SS';
	if (achievement >= 98) return 'S+';
	if (achievement >= 97) return 'S';
	if (achievement >= 94) return 'AAA';
	if (achievement >= 90) return 'AA';
	if (achievement >= 80) return 'A';
	if (achievement >= 75) return 'BBB';
	if (achievement >= 70) return 'BB';
	if (achievement >= 60) return 'B';
	if (achievement >= 50) return 'C';
	return 'D';
}

export function chuniRank(score: number | null): string {
	if (score == null) return '';
	if (score >= 1009000) return 'SSS+';
	if (score >= 1007500) return 'SSS';
	if (score >= 1005000) return 'SS+';
	if (score >= 1000000) return 'SS';
	if (score >= 990000) return 'S+';
	if (score >= 975000) return 'S';
	if (score >= 950000) return 'AAA';
	if (score >= 925000) return 'AA';
	if (score >= 900000) return 'A';
	if (score >= 800000) return 'BBB';
	if (score >= 700000) return 'BB';
	if (score >= 600000) return 'B';
	if (score >= 500000) return 'C';
	return 'D';
}

export function rankColor(rank: string): string {
	if (rank.startsWith('SSS')) return '#b45309';
	if (rank.startsWith('SS')) return '#c2410c';
	if (rank.startsWith('S')) return '#e11d48';
	if (rank.startsWith('AA')) return '#7c3aed';
	return '#57534e';
}

export function comboTag(raw: string | undefined): string {
	if (!raw) return '';
	switch (raw.toLowerCase()) {
		case 'app':
		case 'ap+':
			return 'AP+';
		case 'ap':
			return 'AP';
		case 'fcp':
		case 'fc+':
			return 'FC+';
		case 'fc':
			return 'FC';
		case 'ajc':
			return 'AJC';
		case 'fsd':
			return 'FSD';
		case 'fsdp':
			return 'FSD+';
		case 'fs':
			return 'FS';
		case 'fsp':
			return 'FS+';
		default:
			return raw.toUpperCase();
	}
}

export function shareScoreLabel(kind: 'maimai' | 'chunithm', score: number | null): string {
	if (score == null) return '—';
	if (kind === 'maimai') return `${score.toFixed(4)}%`;
	return String(Math.round(score));
}

export function meanField(list: { value?: number; score?: number | null; rating?: number | null }[], key: 'value' | 'score' | 'rating'): number {
	const xs = list.map((e) => e[key]).filter((n): n is number => typeof n === 'number');
	if (!xs.length) return 0;
	return xs.reduce((a, b) => a + b, 0) / xs.length;
}
