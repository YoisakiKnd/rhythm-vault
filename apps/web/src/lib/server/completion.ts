import { getDb, sql } from '@rhythm-vault/db';
import { coverUrl } from '$lib/covers';
import { parseCatalogSrc, type CatalogSrc } from '$lib/catalog-nav';
import { parseCsvParam, parseDlcParam } from '$lib/library-query';
import { catalogSrcToSource } from './channel';
import { isFcBadges, isPpScore, iterateCharts, progressKindOf } from './chart-slots';
import {
	chartKeyOf,
	chartMatchesFilter,
	DB_GAME,
	diffLabel,
	effectiveDiffKey,
	GAME_LABEL,
	getLibrary,
	isDummyChart,
	isGameKey,
	isUtageSong,
	isWorldsEndChart,
	libraryFilterOptions,
	numericSongId,
	songMatchesCatalogSrc,
	type GameKey,
	type LibraryChart,
	type LibrarySong
} from './library';

export type SheetResultFilter = 'all' | 'unplayed' | 'fc' | 'pp';

export interface SheetMine {
	score: number | null;
	rating: number | null;
	badges: unknown;
}

export interface ChartSheetRow {
	chartKey: string;
	songId: string;
	numericId: string;
	title: string;
	artist: string;
	cover: string;
	diffKey: string;
	diffLabel: string;
	levelLabel: string;
	levelValue: number;
	dlcCode: string | null;
	dlcName: string | null;
	isNew: boolean;
	mine: SheetMine | null;
	isFc: boolean;
	isPp: boolean;
}

export interface ChartSheetSummary {
	total: number;
	played: number;
	fc: number;
	pp: number;
}

export interface QueryChartSheetOpts {
	q?: string;
	diff?: string;
	pattern?: string;
	level?: string;
	onlyNew?: boolean;
	src?: CatalogSrc;
	dlcs?: string[];
	page?: number;
	per?: number;
	resultFilter?: SheetResultFilter;
}

interface PreparedSlot {
	key: string;
	song: LibrarySong;
	chart: LibraryChart;
}

export function parseSheetResultFilter(raw: string | null | undefined): SheetResultFilter {
	if (raw === 'unplayed' || raw === 'fc' || raw === 'pp') return raw;
	return 'all';
}

/** 默认排除宴谱 / WORLD'S END / 占位谱，除非筛选明确点名 */
export function collectSheetSlots(game: GameKey, opts: QueryChartSheetOpts): PreparedSlot[] {
	const lib = getLibrary(game);
	const songsById = new Map(lib.songs.map((s) => [s.id, s]));
	const diffRaw = opts.diff ?? '';
	const diffKeys = game === 'djmax' ? [] : parseCsvParam(diffRaw);
	const q = (opts.q ?? '').trim().toLowerCase();
	const dlcs = opts.dlcs ?? [];
	const filterOpts = { diff: diffRaw, pattern: opts.pattern, level: opts.level };
	const slots: PreparedSlot[] = [];

	iterateCharts(lib.charts, (chart, idx) => {
		const song = songsById.get(chart.songId);
		if (!song) return;
		if (isDummyChart(chart)) return;
		if (game === 'chunithm' && isWorldsEndChart(chart) && !diffKeys.includes('WORLDS_END')) return;
		if (game === 'maimai' && isUtageSong(song) && !diffKeys.includes('UTAGE')) return;
		if (!chartMatchesFilter(game, song, chart, filterOpts)) return;
		if (opts.onlyNew) {
			if (game === 'djmax' ? !chart.isNew : !song.isNew) return;
		}
		if (!songMatchesCatalogSrc(game, song.id, opts.src)) return;
		if (game === 'djmax' && dlcs.length > 0) {
			if (dlcs.length === 1 && dlcs[0] === '-') return;
			if (!song.dlcCode || !dlcs.includes(song.dlcCode)) return;
		}
		if (q) {
			const numeric = numericSongId(song.id);
			const hit =
				song.title.toLowerCase().includes(q) ||
				song.id.toLowerCase().includes(q) ||
				numeric.includes(q) ||
				(song.artist ?? '').toLowerCase().includes(q);
			if (!hit) return;
		}
		slots.push({ key: chartKeyOf(game, chart, idx), song, chart });
	});
	return slots;
}

function displayDiff(game: GameKey, song: LibrarySong, chart: LibraryChart): { key: string; label: string } {
	if (game === 'djmax') {
		const pat = chart.difficultyKey.split(' ')[1] ?? chart.difficultyKey;
		return { key: pat, label: chart.difficultyKey };
	}
	const key = effectiveDiffKey(game, song, chart);
	return { key, label: diffLabel(key) };
}

interface ScoreJoinRow {
	chart_key: string;
	score: number | null;
	rating: number | null;
	badges: unknown;
}

async function joinSheetScores(
	userId: number,
	dbGame: string,
	keys: string[],
	source?: string
): Promise<Map<string, ScoreJoinRow>> {
	const map = new Map<string, ScoreJoinRow>();
	if (keys.length === 0) return map;
	const payload = JSON.stringify(keys.map((key) => ({ key })));
	const result = await getDb().execute(sql`
		SELECT
			t.key AS chart_key,
			s.score AS score,
			s.rating AS rating,
			s.badges AS badges
		FROM jsonb_to_recordset(cast(${payload} as jsonb)) AS t(key text)
		LEFT JOIN scores AS s
			ON s.chart_key = t.key
			AND s.user_id = ${userId}
			AND s.game = ${dbGame}
			${source ? sql`AND s.source = ${source}` : sql``}
	`);
	for (const row of result as Iterable<ScoreJoinRow>) {
		if (row.chart_key) map.set(row.chart_key, row);
	}
	return map;
}

export async function queryChartSheet(
	userId: number,
	game: GameKey,
	opts: QueryChartSheetOpts
): Promise<{
	rows: ChartSheetRow[];
	summary: ChartSheetSummary;
	page: number;
	pages: number;
	total: number;
}> {
	const kind = progressKindOf(game);
	const dbGame = DB_GAME[game];
	const source = game === 'djmax' ? undefined : catalogSrcToSource(opts.src ?? 'df');
	const slots = collectSheetSlots(game, opts);
	const joined = await joinSheetScores(
		userId,
		dbGame,
		slots.map((s) => s.key),
		source
	);
	const dlcName = new Map((getLibrary(game).dlcs ?? []).map((d) => [d.dlcCode, d.dlcName]));

	const allRows: ChartSheetRow[] = slots.map(({ key, song, chart }) => {
		const hit = joined.get(key);
		const played = hit != null && hit.score != null;
		const badges = hit?.badges ?? null;
		const score = hit?.score ?? null;
		const mine = played ? { score, rating: hit?.rating ?? null, badges } : null;
		const diff = displayDiff(game, song, chart);
		return {
			chartKey: key,
			songId: song.id,
			numericId: numericSongId(song.id),
			title: song.title,
			artist: song.artist ?? '',
			cover: coverUrl(game, numericSongId(song.id)),
			diffKey: diff.key,
			diffLabel: diff.label,
			levelLabel: chart.levelLabel,
			levelValue: chart.levelValue,
			dlcCode: song.dlcCode ?? null,
			dlcName: song.dlcCode ? (dlcName.get(song.dlcCode) ?? song.dlcCode) : null,
			isNew: game === 'djmax' ? chart.isNew : song.isNew,
			mine,
			isFc: isFcBadges(kind, badges),
			isPp: isPpScore(kind, score)
		};
	});

	const summary: ChartSheetSummary = {
		total: allRows.length,
		played: allRows.filter((r) => r.mine).length,
		fc: allRows.filter((r) => r.isFc).length,
		pp: allRows.filter((r) => r.isPp).length
	};

	const resultFilter = opts.resultFilter ?? 'all';
	let filtered = allRows;
	if (resultFilter === 'unplayed') filtered = allRows.filter((r) => !r.mine);
	else if (resultFilter === 'fc') filtered = allRows.filter((r) => r.isFc);
	else if (resultFilter === 'pp') filtered = allRows.filter((r) => r.isPp);

	const per = Math.min(100, Math.max(10, opts.per ?? 50));
	const pages = Math.max(1, Math.ceil(filtered.length / per));
	const page = Math.min(Math.max(1, opts.page ?? 1), pages);
	const rows = filtered.slice((page - 1) * per, page * per);

	return { rows, summary, page, pages, total: filtered.length };
}

export function parseSheetSearch(game: GameKey, url: URL): QueryChartSheetOpts {
	let diff = url.searchParams.get('diff') ?? '';
	if (game === 'djmax' && !diff) {
		const button = url.searchParams.get('button');
		diff = button ? `${button.replace(/B$/i, '')}B` : '4B';
	}
	return {
		q: url.searchParams.get('q') ?? '',
		diff,
		pattern: url.searchParams.get('pattern') ?? '',
		level: url.searchParams.get('level') ?? '',
		onlyNew: url.searchParams.get('new') === '1',
		src: game === 'djmax' ? undefined : parseCatalogSrc(url.searchParams.get('src')),
		dlcs: parseDlcParam(url.searchParams.get('dlc')),
		page: Number(url.searchParams.get('page') ?? '1') || 1,
		resultFilter: parseSheetResultFilter(url.searchParams.get('filter'))
	};
}

export function assertSheetGame(raw: string): GameKey {
	if (!isGameKey(raw)) throw new Error('unknown game');
	return raw;
}

export { GAME_LABEL, libraryFilterOptions, isGameKey };
