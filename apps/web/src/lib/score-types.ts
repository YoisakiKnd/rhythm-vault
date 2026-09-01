export type GameViewKey = 'maimai' | 'chunithm' | 'djmax';

export interface BestEntry {
	chartKey: string;
	title: string;
	label: string;
	value: number;
	cover: string;
	score: number | null;
	rating: number | null;
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

export function parseGameParam(raw: string | null): GameViewKey {
	return (['maimai', 'chunithm', 'djmax'].includes(raw ?? '') ? raw : 'maimai') as GameViewKey;
}

export function parseButtonParam(raw: string | null): number {
	const n = Number(raw ?? '4');
	return [4, 5, 6, 8].includes(n) ? n : 4;
}

export function viewSections(view: ScoreView): Array<{ name: string; list: BestEntry[] }> {
	if (view.kind === 'djmax') {
		return [
			{ name: '旧曲 best 70', list: view.basic },
			{ name: '新曲 best 30', list: view.new }
		];
	}
	if (view.kind === 'chunithm') {
		return [
			{ name: '旧曲 best 30', list: view.oldBest },
			{ name: '新曲 best 20', list: view.newBest }
		];
	}
	return [
		{ name: '旧曲 best 35', list: view.oldBest },
		{ name: '新曲 best 15', list: view.newBest }
	];
}
