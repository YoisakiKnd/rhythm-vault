import { scoreChartKey as coreScoreChartKey, SongLibrarySchema } from '@rhythm-vault/core';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { coverUrl } from '../covers';
import { diffLabel } from '../library-display';
import { parseCsvParam } from '../library-query';

export type GameKey = 'maimai' | 'chunithm' | 'djmax';

export const GAME_LABEL: Record<GameKey, string> = {
	maimai: '舞萌 DX',
	chunithm: '中二节奏',
	djmax: 'DJMAX'
};

const LIB_FILES: Record<GameKey, string> = {
	maimai: 'maimaidx.json',
	chunithm: 'chunithm.json',
	djmax: 'djmax.json'
};

export function isGameKey(v: string): v is GameKey {
	return v in LIB_FILES;
}

/** URL / 曲库 JSON 用的 songId 前缀（舞萌是 maimaidx，与路由 game=maimai 不同） */
export const SONG_PREFIX: Record<GameKey, string> = {
	maimai: 'maimaidx',
	chunithm: 'chunithm',
	djmax: 'djmax'
};

/** scores.game 列取值 */
export const DB_GAME: Record<GameKey, 'maimai_dx' | 'chunithm' | 'djmax'> = {
	maimai: 'maimai_dx',
	chunithm: 'chunithm',
	djmax: 'djmax'
};

export function songIdOf(game: GameKey, numericId: string): string {
	return `${SONG_PREFIX[game]}:${numericId}`;
}

export interface LibrarySong {
	id: string;
	title: string;
	artist?: string;
	genre?: string;
	dlcCode?: string;
	version?: string;
	/** 曲目首次出现版本码（落雪数据源，进度统计用） */
	versionCode?: number;
	isNew: boolean;
}

export interface LibraryChart {
	songId: string;
	difficultyKey: string;
	levelLabel: string;
	levelValue: number;
	isNew: boolean;
	/** DJMAX：V-ARCHIVE 층/定数 */
	floorName?: string;
	originId?: number;
}

export interface LoadedLibrary {
	songs: LibrarySong[];
	charts: LibraryChart[];
	/** maimai：版本码→名称对照 */
	versions?: Array<{ code: number; title: string }>;
	/** djmax：曲包对照 */
	dlcs?: Array<{ dlcCode: string; dlcName: string }>;
}

const cache = new Map<GameKey, { lib: LoadedLibrary; mtime: number }>();
const sourcesCache = new Map<string, { dfOnly: Set<string>; lxnsOnly: Set<string>; mtime: number }>();

export interface CatalogExclusive {
	dfOnly: string[];
	lxnsOnly: string[];
}

function loadCatalogSources(game: GameKey): { dfOnly: Set<string>; lxnsOnly: Set<string> } {
	const path = join(findDataDir(), 'catalog-sources.json');
	const mtime = existsSync(path) ? statSync(path).mtimeMs : 0;
	const cached = sourcesCache.get(game);
	if (cached && cached.mtime === mtime) return cached;
	let next = { dfOnly: new Set<string>(), lxnsOnly: new Set<string>(), mtime };
	if (existsSync(path)) {
		try {
			const all = JSON.parse(readFileSync(path, 'utf8')) as Record<string, CatalogExclusive>;
			const row = all[game];
			if (row) {
				next = {
					dfOnly: new Set(row.dfOnly ?? []),
					lxnsOnly: new Set(row.lxnsOnly ?? []),
					mtime
				};
			}
		} catch {
			/* 损坏时视为无独占曲目 */
		}
	}
	sourcesCache.set(game, next);
	return next;
}

let dataDir: string | null = null;

/** 从本文件向上查找仓库的 packages/data 目录（避免硬编码相对层数）；生产容器可用 RV_DATA_DIR 指定 */
function findDataDir(): string {
	if (dataDir) return dataDir;
	const envDir = process.env.RV_DATA_DIR;
	if (envDir) {
		dataDir = envDir;
		return dataDir;
	}
	let dir = dirname(fileURLToPath(import.meta.url));
	for (;;) {
		const candidate = join(dir, 'packages/data');
		if (existsSync(join(candidate, 'maimaidx.json'))) {
			dataDir = candidate;
			return dataDir;
		}
		const parent = dirname(dir);
		if (parent === dir) throw new Error('未找到 packages/data（先运行 bun run sync:songs）');
		dir = parent;
	}
}

/** 曲库 JSON（packages/data）进程内缓存；mtime 变化时重新加载 */
export function getLibrary(game: GameKey): LoadedLibrary {
	const path = join(findDataDir(), LIB_FILES[game]);
	if (!existsSync(path)) throw new Error(`曲库 ${LIB_FILES[game]} 不存在（先运行 bun run sync:songs）`);
	const mtime = statSync(path).mtimeMs;
	const cached = cache.get(game);
	if (cached && cached.mtime === mtime) return cached.lib;
	const parsed = SongLibrarySchema.parse(JSON.parse(readFileSync(path, 'utf8')));
	const lib = parsed as LoadedLibrary;
	cache.set(game, { lib, mtime });
	return lib;
}

export function chunithmJacketId(numericId: string): string {
	const lib = getLibrary('chunithm');
	const songId = `chunithm:${numericId}`;
	for (const c of lib.charts) {
		if (c.songId === songId && typeof c.originId === 'number') return String(c.originId);
	}
	return numericId;
}

export function numericSongId(songId: string): string {
	return songId.split(':')[1] ?? '';
}

/** 舞萌宴谱：水鱼 ID ≥ 100000，或分类为宴会場 */
export function isUtageSong(song: LibrarySong): boolean {
	const n = Number(numericSongId(song.id));
	return n >= 100000 || song.genre === '宴会場';
}

/** 中二 WORLD'S END 占位谱（BASIC–ULTIMA 全是 "-" / 0） */
export function isDummyChart(chart: LibraryChart): boolean {
	return chart.levelLabel === '-' && chart.levelValue === 0;
}

export function isWorldsEndChart(chart: LibraryChart): boolean {
	return chart.difficultyKey === 'OTHER' || chart.difficultyKey === 'WORLDS_END';
}

export function effectiveDiffKey(game: GameKey, song: LibrarySong, chart: LibraryChart): string {
	if (game === 'maimai' && isUtageSong(song)) return 'UTAGE';
	if (game === 'chunithm' && isWorldsEndChart(chart)) return 'WORLDS_END';
	return chart.difficultyKey;
}

export function songMatchesCatalogSrc(game: GameKey, songId: string, src?: 'df' | 'lxns'): boolean {
	if (!src || (game !== 'maimai' && game !== 'chunithm')) return true;
	const exclusive = loadCatalogSources(game);
	if (src === 'df') return !exclusive.lxnsOnly.has(songId);
	return !exclusive.dfOnly.has(songId);
}

export function chartMatchesFilter(
	game: GameKey,
	song: LibrarySong,
	chart: LibraryChart,
	opts: { diff?: string; pattern?: string; level?: string }
): boolean {
	const diffRaw = opts.diff ?? '';
	const djmaxButton = game === 'djmax' ? diffRaw : '';
	const diffKeys = game === 'djmax' ? [] : parseCsvParam(diffRaw);
	const patternKeys = parseCsvParam(opts.pattern);
	const levelKeys = parseCsvParam(opts.level);
	if (game === 'djmax') {
		const [bmode, pat] = chart.difficultyKey.split(' ');
		if (djmaxButton && bmode !== djmaxButton) return false;
		if (patternKeys.length > 0 && !patternKeys.includes(pat ?? '')) return false;
		if (levelKeys.length > 0) {
			const sc = pat === 'SC';
			const hit = levelKeys.some((lv) =>
				sc ? chart.levelLabel === `SC${lv}` || chart.levelLabel === lv : chart.levelLabel === lv
			);
			if (!hit) return false;
		}
		return true;
	}
	if (isDummyChart(chart)) return false;
	const key = effectiveDiffKey(game, song, chart);
	if (diffKeys.length > 0) {
		const hit = diffKeys.some((d) => {
			if (d === 'UTAGE') return isUtageSong(song);
			if (d === 'WORLDS_END') return isWorldsEndChart(chart);
			return key === d && !isWorldsEndChart(chart) && !(game === 'maimai' && isUtageSong(song));
		});
		if (!hit) return false;
	}
	if (levelKeys.length > 0) {
		if (isUtageSong(song) || isWorldsEndChart(chart)) {
			return diffKeys.includes('UTAGE') || diffKeys.includes('WORLDS_END');
		}
		if (!levelKeys.includes(chart.levelLabel)) return false;
	}
	return true;
}

export { diffLabel, chartBadgeClass } from '../library-display';

const NUMERIC_LEVEL = /^(SC)?\d+\+?$/;

function sortLevelLabels(labels: string[]): string[] {
	return [...labels].sort((a, b) => {
		const parse = (s: string) => {
			const sc = s.startsWith('SC') ? 1 : 0;
			const rest = s.replace(/^SC/, '');
			const plus = rest.endsWith('+') ? 0.5 : 0;
			const n = parseFloat(rest) || 0;
			return sc * 100 + n + plus;
		};
		return parse(a) - parse(b) || a.localeCompare(b);
	});
}

export interface FilterOption {
	key: string;
	label: string;
}

export interface LibraryFilterOptions {
	diffs: FilterOption[];
	patterns?: FilterOption[];
	levels: string[];
	dlcs?: FilterOption[];
}

export function libraryFilterOptions(game: GameKey): LibraryFilterOptions {
	if (game === 'maimai') {
		return {
			diffs: [
				{ key: 'BASIC', label: 'Basic' },
				{ key: 'ADVANCED', label: 'Advanced' },
				{ key: 'EXPERT', label: 'Expert' },
				{ key: 'MASTER', label: 'Master' },
				{ key: 'REMASTER', label: 'Re:Master' },
				{ key: 'UTAGE', label: '宴' }
			],
			levels: sortLevelLabels([
				...new Set(
					getLibrary(game)
						.charts.filter((c) => NUMERIC_LEVEL.test(c.levelLabel) && !c.levelLabel.includes('?'))
						.map((c) => c.levelLabel)
				)
			])
		};
	}
	if (game === 'chunithm') {
		return {
			diffs: [
				{ key: 'BASIC', label: 'Basic' },
				{ key: 'ADVANCED', label: 'Advanced' },
				{ key: 'EXPERT', label: 'Expert' },
				{ key: 'MASTER', label: 'Master' },
				{ key: 'ULTIMA', label: 'Ultima' },
				{ key: 'WORLDS_END', label: 'WE' }
			],
			levels: sortLevelLabels([
				...new Set(
					getLibrary(game)
						.charts.filter((c) => NUMERIC_LEVEL.test(c.levelLabel) && !isDummyChart(c) && !isWorldsEndChart(c))
						.map((c) => c.levelLabel)
				)
			])
		};
	}
	return {
		diffs: [
			{ key: '4B', label: '4B' },
			{ key: '5B', label: '5B' },
			{ key: '6B', label: '6B' },
			{ key: '8B', label: '8B' }
		],
		patterns: [
			{ key: 'NM', label: 'NM' },
			{ key: 'HD', label: 'HD' },
			{ key: 'MX', label: 'MX' },
			{ key: 'SC', label: 'SC' }
		],
		levels: Array.from({ length: 15 }, (_, i) => String(i + 1)),
		dlcs: (getLibrary(game).dlcs ?? []).map((d) => ({ key: d.dlcCode, label: d.dlcName }))
	};
}

export interface LibraryRow {
	id: string;
	numericId: string;
	title: string;
	artist: string;
	category: string;
	cover: string;
	isNew: boolean;
	charts: Array<{
		label: string;
		value: number;
		diffKey: string;
		diffLabel: string;
		floorName?: string;
	}>;
}

export interface QueryLibraryOpts {
	q?: string;
	/** maimai/chuni：BASIC…UTAGE/WORLDS_END；djmax：4B/5B/6B/8B */
	diff?: string;
	/** djmax：NM/HD/MX/SC */
	pattern?: string;
	level?: string;
	onlyNew?: boolean;
	/** 舞萌/中二：水鱼 df / 落雪 lxns */
	src?: 'df' | 'lxns';
	/** djmax 曲包；空 = 全部；['-'] = 一个都不选 */
	dlcs?: string[];
	page?: number;
	per?: number;
}

function displayCharts(game: GameKey, song: LibrarySong, charts: LibraryChart[]): LibraryChart[] {
	const visible = charts.filter((c) => !isDummyChart(c));
	if (game === 'chunithm' && visible.some(isWorldsEndChart)) {
		return visible.filter(isWorldsEndChart);
	}
	return visible;
}

/** 曲库列表查询（服务端过滤 + 分页），页面 SSR 与无限滚动 JSON 接口共用 */
export function queryLibrary(
	game: GameKey,
	opts: QueryLibraryOpts
): { rows: LibraryRow[]; total: number; page: number; pages: number } {
	const lib = getLibrary(game);
	const q = (opts.q ?? '').trim().toLowerCase();
	const diffRaw = opts.diff ?? '';
	const diffKeys = game === 'djmax' ? [] : parseCsvParam(diffRaw);
	const patternKeys = parseCsvParam(opts.pattern);
	const levelKeys = parseCsvParam(opts.level);
	const onlyNew = opts.onlyNew ?? false;
	const src = opts.src;
	const dlcs = opts.dlcs ?? [];
	const per = Math.min(100, Math.max(10, opts.per ?? 50));

	const chartsBySong = new Map<string, LibraryChart[]>();
	for (const c of lib.charts) {
		const list = chartsBySong.get(c.songId);
		if (list) list.push(c);
		else chartsBySong.set(c.songId, [c]);
	}

	const filterOpts = { diff: diffRaw, pattern: opts.pattern, level: opts.level };

	let songs = lib.songs;
	if (q) {
		songs = songs.filter((s) => {
			const numeric = numericSongId(s.id);
			return (
				s.title.toLowerCase().includes(q) ||
				s.id.toLowerCase().includes(q) ||
				numeric.includes(q) ||
				(s.artist ?? '').toLowerCase().includes(q)
			);
		});
	}
	if (onlyNew) songs = songs.filter((s) => s.isNew);

	if ((game === 'maimai' || game === 'chunithm') && src) {
		songs = songs.filter((s) => songMatchesCatalogSrc(game, s.id, src));
	}

	if (game === 'djmax' && dlcs.length > 0) {
		if (dlcs.length === 1 && dlcs[0] === '-') songs = [];
		else {
			const allow = new Set(dlcs);
			songs = songs.filter((s) => s.dlcCode && allow.has(s.dlcCode));
		}
	}

	if (game === 'djmax' || diffKeys.length > 0 || levelKeys.length > 0 || patternKeys.length > 0) {
		songs = songs.filter((s) =>
			(chartsBySong.get(s.id) ?? []).some((c) => chartMatchesFilter(game, s, c, filterOpts))
		);
	}

	const total = songs.length;
	const pages = Math.max(1, Math.ceil(total / per));
	const page = Math.min(Math.max(1, opts.page ?? 1), pages);

	const dlcName = new Map((lib.dlcs ?? []).map((d) => [d.dlcCode, d.dlcName]));
	const rows = songs.slice((page - 1) * per, page * per).map((s) => {
		const numericId = numericSongId(s.id);
		const charts = displayCharts(game, s, chartsBySong.get(s.id) ?? [])
			.filter((c) => chartMatchesFilter(game, s, c, filterOpts))
			.map((c) => {
			const key = effectiveDiffKey(game, s, c);
			return {
				label: c.levelLabel,
				value: c.levelValue,
				diffKey: game === 'djmax' ? (c.difficultyKey.split(' ')[1] ?? c.difficultyKey) : key,
				diffLabel: game === 'djmax' ? c.difficultyKey : diffLabel(key),
				...(c.floorName ? { floorName: c.floorName } : {})
			};
		});
		if (game === 'djmax') {
			charts.sort((a, b) => a.diffLabel.localeCompare(b.diffLabel) || a.value - b.value);
		} else {
			charts.sort((a, b) => a.value - b.value);
		}
		return {
			id: s.id,
			numericId,
			title: s.title,
			artist: s.artist ?? '',
			category: s.genre ?? (s.dlcCode ? (dlcName.get(s.dlcCode) ?? s.dlcCode) : ''),
			cover: coverUrl(game, numericId),
			isNew: s.isNew,
			charts
		};
	});
	return { rows, total, page, pages };
}

export function iterateCharts(
	charts: LibraryChart[],
	fn: (chart: LibraryChart, idx: number) => void
): void {
	let lastSongId = '';
	let idx = 0;
	for (const c of charts) {
		if (c.songId !== lastSongId) {
			lastSongId = c.songId;
			idx = 0;
		}
		fn(c, idx);
		idx++;
	}
}

export function chartKeyOf(game: GameKey, chart: LibraryChart, idx: number): string {
	return scoreChartKey(game, numericSongId(chart.songId), chart, idx);
}

/** 与 scores.chart_key 一致：舞萌/中二为 `前缀:数字ID:谱面序号`，DJMAX 为 `djmax:4B:42:SC` */
export function scoreChartKey(game: GameKey, numericId: string, chart: LibraryChart, idx: number): string {
	return coreScoreChartKey(game, numericId, chart.difficultyKey, idx);
}

export interface SongChartView {
	chartKey: string;
	diffKey: string;
	diffLabel: string;
	levelLabel: string;
	levelValue: number;
	isNew: boolean;
	/** DJMAX：V-ARCHIVE 층/定数 */
	floorName?: string;
	/** DJMAX 键位 4/5/6/8 */
	button?: number;
	pattern?: string;
}

export type MaimaiChartType = 'standard' | 'dx' | 'utage';

export function maimaiChartType(numericId: string): MaimaiChartType | null {
	const n = Number(numericId);
	if (!Number.isFinite(n)) return null;
	if (n >= 100000) return 'utage';
	if (n >= 10000) return 'dx';
	return 'standard';
}

export interface SongCatalog {
	game: GameKey;
	id: string;
	songId: string;
	title: string;
	artist: string;
	genre: string;
	versionCode: number | null;
	versionTitle: string | null;
	dlcCode: string | null;
	dlcName: string | null;
	isNew: boolean;
	cover: string;
	/** 舞萌：标准 / DX / 宴 */
	chartType: MaimaiChartType | null;
	charts: SongChartView[];
}

const DJMAX_PATTERN_ORDER: Record<string, number> = { NM: 0, HD: 1, MX: 2, SC: 3 };

/** 单曲曲库信息（无成绩）。找不到返回 null */
export function getSongCatalog(game: GameKey, numericId: string): SongCatalog | null {
	const lib = getLibrary(game);
	const songId = songIdOf(game, numericId);
	const song = lib.songs.find((s) => s.id === songId);
	if (!song) return null;

	const owned: LibraryChart[] = [];
	for (const c of lib.charts) {
		if (c.songId === songId) owned.push(c);
	}
	const hasWe = owned.some(isWorldsEndChart);
	const charts: SongChartView[] = [];
	owned.forEach((c, idx) => {
		if (isDummyChart(c)) return;
		if (game === 'chunithm' && hasWe && !isWorldsEndChart(c)) return;
		const parts = game === 'djmax' ? c.difficultyKey.split(' ') : [];
		const diffKey =
			game === 'djmax' ? (parts[1] ?? c.difficultyKey) : effectiveDiffKey(game, song, c);
		const button = game === 'djmax' ? Number(String(parts[0] ?? '').replace('B', '')) : undefined;
		charts.push({
			chartKey: scoreChartKey(game, numericId, c, idx),
			diffKey,
			diffLabel: game === 'djmax' ? c.difficultyKey : diffLabel(diffKey),
			levelLabel: c.levelLabel,
			levelValue: c.levelValue,
			isNew: c.isNew,
			...(c.floorName ? { floorName: c.floorName } : {}),
			...(game === 'djmax' && Number.isFinite(button) && parts[1]
				? { button, pattern: parts[1] }
				: {})
		});
	});

	if (game === 'djmax') {
		charts.sort(
			(a, b) =>
				(a.button ?? 0) - (b.button ?? 0) ||
				(DJMAX_PATTERN_ORDER[a.pattern ?? ''] ?? 9) - (DJMAX_PATTERN_ORDER[b.pattern ?? ''] ?? 9)
		);
	}

	const dlcName = song.dlcCode
		? ((lib.dlcs ?? []).find((d) => d.dlcCode === song.dlcCode)?.dlcName ?? song.dlcCode)
		: null;
	const versionTitle =
		song.versionCode != null
			? ((lib.versions ?? []).find((v) => v.code === song.versionCode)?.title ?? null)
			: null;

	return {
		game,
		id: numericId,
		songId,
		title: song.title,
		artist: song.artist ?? '',
		genre: song.genre ?? '',
		versionCode: song.versionCode ?? null,
		versionTitle,
		dlcCode: song.dlcCode ?? null,
		dlcName,
		isNew: song.isNew,
		cover: coverUrl(game, numericId),
		chartType: game === 'maimai' ? maimaiChartType(numericId) : null,
		charts
	};
}

export interface ChartMeta {
	title: string;
	label: string;
	/** 定数或理论 DJPower */
	value: number;
	isNew: boolean;
	/** 曲绘地址 */
	cover: string;
	/** DJMAX：V-ARCHIVE 층/定数 */
	floorName?: string;
	/** 版本名，分享图卡片用 */
	version?: string;
}

const metaCache = new Map<GameKey, Map<string, ChartMeta>>();

/**
 * chartKey → 展示信息（曲名/等级/定数/曲绘）。key 构造与同步写入的 scores.chart_key 完全一致：
 * maimai/chuni 为 `${songId}:${难度序号}`，djmax 为 `djmax:${键位}B:${数字ID}:${难度}`。
 */
export function chartMetaMap(game: GameKey): Map<string, ChartMeta> {
	let meta = metaCache.get(game);
	if (!meta) {
		const next = new Map<string, ChartMeta>();
		const lib = getLibrary(game);
		const titles = new Map(lib.songs.map((s) => [s.id, s]));
		const versionByCode = new Map((lib.versions ?? []).map((v) => [v.code, v.title]));
		iterateCharts(lib.charts, (c, idx) => {
			const numericId = numericSongId(c.songId);
			const chartKey = scoreChartKey(game, numericId, c, idx);
			const song = titles.get(c.songId);
			const key = song ? effectiveDiffKey(game, song, c) : c.difficultyKey;
			const fromCode =
				song?.versionCode != null ? versionByCode.get(song.versionCode) : undefined;
			const fromName =
				song?.version && !/^\d{4}-\d{2}/.test(song.version) ? song.version : undefined;
			const version = fromCode ?? fromName;
			next.set(chartKey, {
				title: song?.title ?? c.songId,
				label: isDummyChart(c)
					? c.levelLabel
					: key === 'UTAGE' || key === 'WORLDS_END'
						? `${diffLabel(key)} ${c.levelLabel}`
						: c.levelLabel,
				value: c.levelValue,
				isNew: c.isNew,
				cover: coverUrl(game, numericId),
				...(c.floorName ? { floorName: c.floorName } : {}),
				...(version ? { version } : {})
			});
		});
		metaCache.set(game, next);
		return next;
	}
	return meta;
}
