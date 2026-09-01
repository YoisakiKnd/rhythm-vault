import { getLibrary, isGameKey, type GameKey, type LoadedLibrary } from './library';

export interface RandomPickResult {
	songId: string;
	title: string;
	artist: string;
	category: string;
	levelLabel: string;
	levelValue: number;
	isNew: boolean;
}

export interface RandomPickQuery {
	game: GameKey;
	min: number;
	max: number;
	onlyNew: boolean;
	count: number;
}

export type RandomPickParse =
	| { ok: true; query: RandomPickQuery }
	| { ok: false; error: string };

export function parseRandomQuery(searchParams: URLSearchParams): RandomPickParse {
	const gameRaw = searchParams.get('game') ?? 'maimai';
	if (!isGameKey(gameRaw)) return { ok: false, error: `未知游戏: ${gameRaw}` };
	const min = Number(searchParams.get('min') ?? '1');
	const max = Number(searchParams.get('max') ?? '16');
	const onlyNew = searchParams.get('new') === '1';
	const count = Math.min(10, Math.max(1, Number(searchParams.get('count') ?? '3') || 3));
	if (Number.isNaN(min) || Number.isNaN(max) || min > max) {
		return { ok: false, error: '定数区间无效' };
	}
	return { ok: true, query: { game: gameRaw, min, max, onlyNew, count } };
}

/** Fisher–Yates 部分洗牌；`random` 可注入以便单测 */
export function pickRandomCharts(
	lib: LoadedLibrary,
	opts: { min: number; max: number; onlyNew: boolean; count: number },
	random: () => number = Math.random
): { candidates: number; results: RandomPickResult[] } {
	const titles = new Map(lib.songs.map((s) => [s.id, s]));
	const candidates = lib.charts.filter(
		(c) => c.levelValue >= opts.min && c.levelValue <= opts.max && (!opts.onlyNew || c.isNew)
	);
	for (let i = candidates.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		const a = candidates[i];
		const b = candidates[j];
		if (a && b) {
			candidates[i] = b;
			candidates[j] = a;
		}
	}
	const results = candidates.slice(0, opts.count).map((c) => {
		const s = titles.get(c.songId);
		return {
			songId: c.songId,
			title: s?.title ?? c.songId,
			artist: s?.artist ?? '',
			category: s?.genre ?? s?.dlcCode ?? '',
			levelLabel: c.levelLabel,
			levelValue: c.levelValue,
			isNew: c.isNew
		};
	});
	return { candidates: candidates.length, results };
}

export function pickRandomFromParams(searchParams: URLSearchParams): {
	game: string;
	candidates: number;
	results: RandomPickResult[];
	error?: string;
} {
	const parsed = parseRandomQuery(searchParams);
	if (!parsed.ok) return { game: searchParams.get('game') ?? 'maimai', candidates: 0, results: [], error: parsed.error };
	const picked = pickRandomCharts(getLibrary(parsed.query.game), parsed.query);
	return { game: parsed.query.game, ...picked };
}
