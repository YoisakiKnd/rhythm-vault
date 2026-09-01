/** 中二难度序号与水鱼 / 落雪 level_index 一致：0–5 */
export const CHUNI_DIFF_INDEX: Record<string, number> = {
	BASIC: 0,
	ADVANCED: 1,
	EXPERT: 2,
	MASTER: 3,
	ULTIMA: 4,
	WORLDS_END: 5,
	OTHER: 5
};

/** 舞萌难度序号（宴谱单独为 UTAGE，写入侧仍用水鱼 level_index） */
export const MAIMAI_DIFF_INDEX: Record<string, number> = {
	BASIC: 0,
	ADVANCED: 1,
	EXPERT: 2,
	MASTER: 3,
	REMASTER: 4,
	UTAGE: 5
};

export function chuniDiffIndex(difficultyKey: string): number | null {
	const idx = CHUNI_DIFF_INDEX[difficultyKey];
	return typeof idx === 'number' ? idx : null;
}

export function isWorldsEndDifficulty(difficultyKey: string): boolean {
	return difficultyKey === 'WORLDS_END' || difficultyKey === 'OTHER';
}

/** 中二 WORLD'S END 的 chartKey 后缀为 :5 */
export function isChuniWorldsEndChartKey(chartKey: string): boolean {
	return chartKey.startsWith('chunithm:') && chartKey.endsWith(':5');
}

/**
 * 与 scores.chart_key 一致：
 * - 舞萌 `maimaidx:{id}:{level_index}`
 * - 中二 `chunithm:{id}:{level_index}`（WE 固定为 5，不用数组下标）
 * - DJMAX `djmax:{4B}:{id}:{NM}`
 */
export function scoreChartKey(
	game: 'maimai' | 'maimai_dx' | 'chunithm' | 'djmax',
	numericId: string,
	difficultyKey: string,
	fallbackIndex?: number
): string {
	if (game === 'djmax') {
		const [bmode, pattern] = difficultyKey.split(' ');
		return `djmax:${bmode}:${numericId}:${pattern}`;
	}
	if (game === 'chunithm') {
		const idx = chuniDiffIndex(difficultyKey);
		return `chunithm:${numericId}:${idx ?? fallbackIndex ?? 0}`;
	}
	// 舞萌与水鱼 level_index / 曲库数组下标一致，不用 difficultyKey 映射（宴谱下标通常为 0）
	return `maimaidx:${numericId}:${fallbackIndex ?? 0}`;
}
