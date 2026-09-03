export interface DjmaxRecord {
	/** `${songid}:${pattern}`，同一谱面唯一 */
	chartId: string;
	title: string;
	pattern: 'NM' | 'HD' | 'MX' | 'SC';
	level: number;
	/** V 值（0–100），< 90 的成绩不参与 b100 */
	score: number;
	maxCombo: boolean;
	/** V-ARCHIVE 返回的单谱面 DJPower */
	djpower: number;
	isNew: boolean;
}

export interface DjmaxB100 {
	/** 总 DJPower（0–10000，按 maxDjPower 归一化后向下取整到 4 位小数） */
	rating: number;
	/** 未归一化的 Σdjpower */
	raw: number;
	basic: DjmaxRecord[];
	new: DjmaxRecord[];
}

const BASIC_COUNT = 70;
const NEW_COUNT = 30;
export const MIN_SCORE = 90;

/**
 * b100 = 旧曲 best 70 + 新曲 best 30（仅计 score ≥ 90 的记录），
 * 总评 = Σdjpower × 10000 / maxDjPower，封顶 10000。
 * maxDjPower 来自 V-ARCHIVE 的 DEV djClass 端点（按键位区分）。
 */
export function computeDjmaxB100(
	basic: DjmaxRecord[],
	newScores: DjmaxRecord[],
	maxDjPower: number
): DjmaxB100 {
	const pick = (arr: DjmaxRecord[], count: number) =>
		arr
			.filter((r) => r.score >= MIN_SCORE)
			.sort((a, b) => b.djpower - a.djpower || b.score - a.score)
			.slice(0, count);

	const basicTop = pick(basic, BASIC_COUNT);
	const newTop = pick(newScores, NEW_COUNT);
	const raw = [...basicTop, ...newTop].reduce((sum, r) => sum + r.djpower, 0);
	const rating = Math.min(10000, floorTo4((raw * 10000) / maxDjPower));
	return { rating, raw, basic: basicTop, new: newTop };
}

export function floorTo4(x: number): number {
	return Math.floor(x * 1e4) / 1e4;
}

/** 谱面系数：SC ≤8 时 diff+22，>8 时 (diff-8)×2+30；非 SC 为 diff×2 */
export function diffCoeff(diff: number, isSc: boolean): number {
	if (isSc) return diff <= 8 ? diff + 22 : (diff - 8) * 2 + 30;
	return diff * 2;
}

/** Perfect Play 理论值 DJPower */
export function djpowerPp(coeff: number): number {
	return coeff * 2.22 + 2.31;
}

/**
 * 按达成率折算单曲 DJPower。maxPp 为 PP 理论值（曲库 levelValue / djpowerPp）。
 * 官方公式未公开；权重按社区公开锚点分段线性插值
 * （约 96%→40%、97%→60%、98%→83%、99%→93.5%），手动录入用此近似。
 */
const SCORE_WEIGHT_ANCHORS: ReadonlyArray<readonly [number, number]> = [
	[90, 0],
	[96, 0.4],
	[97, 0.6],
	[98, 0.83],
	[99, 0.935],
	[100, 1]
];

export function scoreToDjpowerWeight(score: number): number {
	if (score < 90) return 0;
	if (score >= 100) return 1;
	for (let i = 1; i < SCORE_WEIGHT_ANCHORS.length; i++) {
		const [x0, y0] = SCORE_WEIGHT_ANCHORS[i - 1];
		const [x1, y1] = SCORE_WEIGHT_ANCHORS[i];
		if (score <= x1) {
			const t = (score - x0) / (x1 - x0);
			return y0 + t * (y1 - y0);
		}
	}
	return 1;
}

export function djpowerOf(score: number, maxPp: number): number {
	if (maxPp <= 0 || score < MIN_SCORE) return 0;
	if (score >= 100) return maxPp;
	return floorTo4(maxPp * scoreToDjpowerWeight(score));
}

/** DJPower 段位（beginner → THE LORD OF DJMAX），阈值与水鱼 djmax_bests_generate 一致 */
const DJPOWER_TIER_MAP: Array<readonly [string, readonly number[]]> = [
	['beatmaestro', [9970, 9950, 9930, 9900]],
	['showstopper', [9850, 9800, 9750, 9700]],
	['headliner', [9650, 9600, 9500, 9400]],
	['trendsetter', [9300, 9200, 9100, 9000]],
	['professional', [8900, 8800, 8700, 8600]],
	['highclass', [8400, 8200, 8000, 7800]],
	['prodj', [7600, 7400, 7200, 7000]],
	['middleman', [6800, 6600, 6400, 6200]],
	['streetdj', [6000, 5800, 5500, 5200]],
	['rookie', [4900, 4600, 4300, 4000]],
	['amateur', [3600, 3200, 2800, 2400]],
	['trainee', [2000, 1500, 1000, 500]]
];

export function djmaxTier(djpower: number): { tier: string; level: number } {
	if (djpower >= 9980) return { tier: 'lord', level: 1 };
	if (djpower < 500) return { tier: 'beginner', level: 1 };
	for (const [tier, thresholds] of DJPOWER_TIER_MAP) {
		for (let i = 0; i < thresholds.length; i++) {
			if (djpower >= thresholds[i]) return { tier, level: i + 1 };
		}
	}
	return { tier: 'beginner', level: 1 };
}

const DJMAX_CLASS_NAME: Record<string, string> = {
	lord: 'THE LORD OF DJMAX',
	beatmaestro: 'BEAT MAESTRO',
	showstopper: 'SHOWSTOPPER',
	headliner: 'HEADLINER',
	trendsetter: 'TREND SETTER',
	professional: 'PROFESSIONAL',
	highclass: 'HIGH CLASS',
	prodj: 'PRO DJ',
	middleman: 'MIDDLEMAN',
	streetdj: 'STREET DJ',
	rookie: 'ROOKIE',
	amateur: 'AMATEUR',
	trainee: 'TRAINEE',
	beginner: 'BEGINNER'
};

const ROMAN = ['I', 'II', 'III', 'IV'] as const;

/** 游戏内 DJ CLASS 文案，如 MIDDLEMAN I / HIGH CLASS III */
export function djmaxClassLabel(djpower: number): string {
	const { tier, level } = djmaxTier(djpower);
	const name = DJMAX_CLASS_NAME[tier] ?? tier.toUpperCase();
	if (tier === 'lord' || tier === 'beginner') return name;
	return `${name} ${ROMAN[level - 1] ?? 'I'}`;
}
