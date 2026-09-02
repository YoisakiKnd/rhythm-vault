export type GameViewKey = 'maimai' | 'chunithm' | 'djmax';

export interface BestEntry {
	chartKey: string;
	title: string;
	label: string;
	value: number;
	cover: string;
	score: number | null;
	rating: number | null;
	/** DJMAX：V-ARCHIVE 층/定数 */
	floorName?: string | null;
	/** DJMAX MAX COMBO */
	maxCombo?: boolean;
	/** 舞萌/中二 FC/AP 原值 */
	fc?: string;
	/** 舞萌 FS/FSD */
	fs?: string;
	/** 版本名 */
	version?: string;
}

export type ScoreView =
	| {
			kind: 'maimai';
			rating: number;
			oldBest: BestEntry[];
			newBest: BestEntry[];
			syncedAt: string | null;
	  }
	| {
			kind: 'chunithm';
			rating: number;
			oldBest: BestEntry[];
			newBest: BestEntry[];
			syncedAt: string | null;
	  }
	| {
			kind: 'djmax';
			button: number;
			rating: number;
			basic: BestEntry[];
			new: BestEntry[];
			syncedAt: string | null;
	  };

export interface BestSection {
	/** 展示名，如 B35 · 旧曲 */
	name: string;
	/** 短标签，如 B35 */
	short: string;
	/** 该段固定格数（不足时分享图留空位） */
	slots: number;
	list: BestEntry[];
}

export function parseGameParam(raw: string | null): GameViewKey {
	return (['maimai', 'chunithm', 'djmax'].includes(raw ?? '') ? raw : 'maimai') as GameViewKey;
}

export function parseButtonParam(raw: string | null): number {
	const n = Number(raw ?? '4');
	return [4, 5, 6, 8].includes(n) ? n : 4;
}

export function viewSections(view: ScoreView): BestSection[] {
	if (view.kind === 'djmax') {
		return [
			{ name: 'BASIC 旧曲 70', short: 'B70', slots: 70, list: view.basic },
			{ name: 'NEW 新曲 30', short: 'B30', slots: 30, list: view.new }
		];
	}
	if (view.kind === 'chunithm') {
		return [
			{ name: 'B30 · 旧曲', short: 'B30', slots: 30, list: view.oldBest },
			{ name: 'B20 · 新曲', short: 'B20', slots: 20, list: view.newBest }
		];
	}
	return [
		{ name: 'B35 · 旧曲', short: 'B35', slots: 35, list: view.oldBest },
		{ name: 'B15 · 新曲', short: 'B15', slots: 15, list: view.newBest }
	];
}

export function ratingSum(list: BestEntry[]): number {
	return list.reduce((s, e) => s + (e.rating ?? 0), 0);
}

export function bestHeadline(kind: ScoreView['kind']): string {
	if (kind === 'djmax') return 'Power 100';
	if (kind === 'chunithm') return 'B30 + B20';
	return 'B50';
}
