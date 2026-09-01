import { sql, type SQL } from '@rhythm-vault/db';
import { chartKeyOf, iterateCharts, type GameKey } from './library';

export { chartKeyOf, iterateCharts };

export type ProgressKind = 'maimai' | 'chunithm' | 'djmax';

export function progressKindOf(game: GameKey): ProgressKind {
	return game;
}

export function fcSql(kind: ProgressKind): SQL {
	return kind === 'djmax'
		? sql`(s.badges->>'maxCombo') = 'true'`
		: sql`(s.badges->'fc') IS NOT NULL AND (s.badges->>'fc') NOT IN ('', 'false')`;
}

export function ppSql(kind: ProgressKind): SQL {
	return kind === 'maimai'
		? sql`s.score >= 100.5`
		: kind === 'chunithm'
			? sql`s.score >= 1009000`
			: sql`s.score >= 100`;
}

export function isPpScore(kind: ProgressKind, score: number | null | undefined): boolean {
	if (score == null) return false;
	if (kind === 'maimai') return score >= 100.5;
	if (kind === 'chunithm') return score >= 1009000;
	return score >= 100;
}

export function isFcBadges(kind: ProgressKind, badges: unknown): boolean {
	if (!badges || typeof badges !== 'object') return false;
	if (kind === 'djmax') return (badges as { maxCombo?: unknown }).maxCombo === true;
	const fc = (badges as { fc?: unknown }).fc;
	return fc != null && fc !== '' && fc !== false;
}
