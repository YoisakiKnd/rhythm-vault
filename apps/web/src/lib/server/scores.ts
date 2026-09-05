import { getDb, linkedAccounts, ratingSnapshots, scores, and, asc, desc, eq, gte, isNotNull, like, not, sql, type SQL } from '@rhythm-vault/db';
import { vaMaxDjPower } from '@rhythm-vault/adapters';
import {
	chuniPushSuggestions,
	chuniRatingOf,
	computeChuniRating,
	computeDjmaxB100,
	isChuniWorldsEndChartKey,
	MIN_SCORE,
	pushSuggestions,
	type ChuniBestEntry,
	type ChuniPushChart,
	type ChuniPushSuggestion,
	type ChuniScore,
	type DjmaxRecord,
	type PushChart,
	type PushSuggestion
} from '@rhythm-vault/core';
import { AuthError } from './auth';
import { scoresEmptyMessage } from '$lib/copy';
import { chartMetaMap, getLibrary, numericSongId, scoreChartKey } from './library';
import { pickMaimaiB50FromRows, type MaimaiB50Picked, type ScorePickRow } from './score-pick';

export type ScoreChannel = 'divingfish' | 'lxns';

// 查分接口全部读取本地归一化 scores 表（同步任务负责写入），
// 单条查询走主键，b50/b100 走 (user, game, rating) 索引 ORDER BY rating DESC LIMIT n。

async function isBound(userId: number, source: 'divingfish' | 'lxns' | 'varchive'): Promise<boolean> {
	const [row] = await getDb()
		.select({
			externalId: linkedAccounts.externalId,
			token: linkedAccounts.accessTokenEnc
		})
		.from(linkedAccounts)
		.where(and(eq(linkedAccounts.userId, userId), eq(linkedAccounts.source, source)))
		.limit(1);
	return Boolean(row?.externalId || row?.token);
}

async function emptyHint(userId: number, source?: ScoreChannel): Promise<string> {
	if (!source) {
		return scoresEmptyMessage({ bound: await isBound(userId, 'varchive'), src: 'varchive' });
	}
	const link = source === 'lxns' ? 'lxns' : 'divingfish';
	return scoresEmptyMessage({
		bound: await isBound(userId, link),
		src: source === 'lxns' ? 'lxns' : 'df'
	});
}

// ---------- rating 历史（曲线展示用） ----------

export interface RatingHistoryPoint {
	t: string;
	v: number;
	button?: number;
}

export interface LatestGameRating {
	game: string;
	rating: number;
	at: string;
	button?: number;
}

/** 各游戏最近一条 rating 快照，供资料卡 / 概览展示 */
export async function latestRatingsByGame(userId: number): Promise<LatestGameRating[]> {
	const db = getDb();
	const latest = db
		.selectDistinctOn([ratingSnapshots.game], {
			game: ratingSnapshots.game,
			rating: ratingSnapshots.rating,
			detail: ratingSnapshots.detail,
			at: ratingSnapshots.createdAt
		})
		.from(ratingSnapshots)
		.where(eq(ratingSnapshots.userId, userId))
		.orderBy(ratingSnapshots.game, desc(ratingSnapshots.createdAt))
		.as('latest_ratings');
	const rows = await db.select().from(latest);
	const order = ['maimai_dx', 'chunithm', 'djmax'];
	return rows
		.map((r) => {
			const detail = (r.detail ?? {}) as { button?: number };
			return {
				game: r.game,
				rating: r.rating,
				at: r.at.toISOString(),
				button: r.game === 'djmax' ? detail.button : undefined
			};
		})
		.sort((a, b) => {
			const ia = order.indexOf(a.game);
			const ib = order.indexOf(b.game);
			return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
		});
}

export async function ratingHistory(userId: number, game: string): Promise<RatingHistoryPoint[]> {
	const rows = await getDb()
		.select({ rating: ratingSnapshots.rating, detail: ratingSnapshots.detail, createdAt: ratingSnapshots.createdAt })
		.from(ratingSnapshots)
		.where(and(eq(ratingSnapshots.userId, userId), eq(ratingSnapshots.game, game)))
		.orderBy(asc(ratingSnapshots.createdAt))
		.limit(500);
	return rows.map((r) => {
		const detail = (r.detail ?? {}) as { button?: number };
		return { t: r.createdAt.toISOString(), v: r.rating, button: detail.button };
	});
}

function sourceClause(source?: string): SQL | undefined {
	return source ? eq(scores.source, source) : undefined;
}

export type ScoreRow = ScorePickRow & { badges: unknown };

async function gameRows(userId: number, game: string, source?: string): Promise<ScoreRow[]> {
	return getDb()
		.select({
			chartKey: scores.chartKey,
			score: scores.score,
			rating: scores.rating,
			badges: scores.badges,
			isNew: scores.isNew,
			updatedAt: scores.updatedAt
		})
		.from(scores)
		.where(and(eq(scores.userId, userId), eq(scores.game, game), sourceClause(source)));
}

/** 某用户某游戏全部成绩行（玩家对比等用） */
export function listGameScores(userId: number, game: string, source?: string): Promise<ScoreRow[]> {
	return gameRows(userId, game, source);
}

async function hasGameScores(userId: number, game: string, extra?: SQL): Promise<boolean> {
	const [row] = await getDb()
		.select({ chartKey: scores.chartKey })
		.from(scores)
		.where(and(eq(scores.userId, userId), eq(scores.game, game), extra))
		.limit(1);
	return Boolean(row);
}

async function latestUpdatedIso(userId: number, game: string, source?: string): Promise<string | null> {
	const [row] = await getDb()
		.select({ at: sql<Date | null>`max(${scores.updatedAt})` })
		.from(scores)
		.where(and(eq(scores.userId, userId), eq(scores.game, game), sourceClause(source)));
	return row?.at ? new Date(row.at).toISOString() : null;
}

/** 走 scores_user_game_rating_idx：按 isNew 分区取 rating 最高的 n 行 */
async function topRated(
	userId: number,
	game: string,
	isNew: boolean,
	limit: number,
	extra?: SQL
) {
	return getDb()
		.select({
			chartKey: scores.chartKey,
			score: scores.score,
			rating: scores.rating,
			isNew: scores.isNew,
			updatedAt: scores.updatedAt,
			badges: scores.badges
		})
		.from(scores)
		.where(
			and(
				eq(scores.userId, userId),
				eq(scores.game, game),
				eq(scores.isNew, isNew),
				isNotNull(scores.rating),
				extra
			)
		)
		.orderBy(desc(scores.rating), desc(scores.score))
		.limit(limit);
}

// ---------- maimai ----------

export type MaimaiB50Result = MaimaiB50Picked;

export async function maimaiB50(userId: number, source: ScoreChannel = 'divingfish'): Promise<MaimaiB50Result> {
	const srcEq = eq(scores.source, source);
	if (!(await hasGameScores(userId, 'maimai_dx', srcEq))) {
		throw new AuthError(404, await emptyHint(userId, source));
	}
	const [oldBest, newBest, syncedAt] = await Promise.all([
		topRated(userId, 'maimai_dx', false, 35, srcEq),
		topRated(userId, 'maimai_dx', true, 15, srcEq),
		latestUpdatedIso(userId, 'maimai_dx', source)
	]);
	const toEntry = (r: (typeof oldBest)[number]) => {
		const badges = (r.badges ?? {}) as { fc?: unknown; fs?: unknown };
		return {
			chartKey: r.chartKey,
			score: r.score,
			rating: r.rating,
			...(typeof badges.fc === 'string' && badges.fc ? { fc: badges.fc } : {}),
			...(typeof badges.fs === 'string' && badges.fs ? { fs: badges.fs } : {})
		};
	};
	return {
		rating: [...oldBest, ...newBest].reduce((s, r) => s + (r.rating ?? 0), 0),
		oldBest: oldBest.map(toEntry),
		newBest: newBest.map(toEntry),
		syncedAt
	};
}

export interface MaimaiSongResult {
	chartKey: string;
	score: number | null;
	rating: number | null;
	syncedAt: string;
}

export async function maimaiSong(
	userId: number,
	chartId: string,
	source: ScoreChannel = 'divingfish'
): Promise<MaimaiSongResult> {
	if (!/^\d+:\d+$/.test(chartId)) throw new AuthError(400, 'chart 参数格式应为 曲目ID:难度序号，如 1145:3');
	const [row] = await getDb()
		.select({
			chartKey: scores.chartKey,
			score: scores.score,
			rating: scores.rating,
			updatedAt: scores.updatedAt
		})
		.from(scores)
		.where(
			and(
				eq(scores.userId, userId),
				eq(scores.game, 'maimai_dx'),
				eq(scores.chartKey, `maimaidx:${chartId}`),
				eq(scores.source, source)
			)
		)
		.limit(1);
	if (!row) throw new AuthError(404, '未找到该谱面成绩（可能未游玩，或数据尚未同步）');
	return { chartKey: row.chartKey, score: row.score, rating: row.rating, syncedAt: row.updatedAt.toISOString() };
}

// ---------- chunithm ----------

export interface ChuniBestEntryView {
	chartKey: string;
	title: string;
	label: string;
	/** 谱面定数 */
	value: number;
	cover: string;
	score: number | null;
	rating: number;
	fc?: string;
	version?: string;
}

export interface ChuniB30Result {
	rating: number;
	oldBest: ChuniBestEntryView[];
	newBest: ChuniBestEntryView[];
	syncedAt: string | null;
}

const CHUNI_NOT_WE = not(like(scores.chartKey, '%:5'));

/** b30 + 新曲 b20：SQL 取 top 后再用曲库定数重算（排除 WORLD'S END） */
export async function chunithmB30(userId: number, source: ScoreChannel = 'divingfish'): Promise<ChuniB30Result> {
	const srcEq = eq(scores.source, source);
	if (!(await hasGameScores(userId, 'chunithm', srcEq))) {
		throw new AuthError(404, await emptyHint(userId, source));
	}
	const [oldRows, newRows, syncedAt] = await Promise.all([
		topRated(userId, 'chunithm', false, 30, and(CHUNI_NOT_WE, srcEq)),
		topRated(userId, 'chunithm', true, 20, and(CHUNI_NOT_WE, srcEq)),
		latestUpdatedIso(userId, 'chunithm', source)
	]);
	const meta = chartMetaMap('chunithm');
	const engineInput: ChuniScore[] = [];
	const scoreByKey = new Map<string, number | null>();
	const badgeByKey = new Map<string, { fc?: string }>();
	for (const r of [...oldRows, ...newRows]) {
		if (r.score === null) continue;
		if (isChuniWorldsEndChartKey(r.chartKey)) continue;
		const m = meta.get(r.chartKey);
		if (!m || m.value === 0) continue;
		engineInput.push({ chartId: r.chartKey, ds: m.value, isNew: m.isNew, score: r.score });
		scoreByKey.set(r.chartKey, r.score);
		const badges = (r.badges ?? {}) as { fc?: unknown };
		if (typeof badges.fc === 'string' && badges.fc) badgeByKey.set(r.chartKey, { fc: badges.fc });
	}
	if (engineInput.length === 0) throw new AuthError(404, await emptyHint(userId, source));
	const res = computeChuniRating(engineInput);
	const decorate = (e: ChuniBestEntry): ChuniBestEntryView => {
		const m = meta.get(e.chartId);
		const fc = badgeByKey.get(e.chartId)?.fc;
		return {
			chartKey: e.chartId,
			title: m?.title ?? e.chartId,
			label: m?.label ?? '',
			value: m?.value ?? 0,
			cover: m?.cover ?? '',
			score: scoreByKey.get(e.chartId) ?? null,
			rating: e.rating,
			...(m?.version ? { version: m.version } : {}),
			...(fc ? { fc } : {})
		};
	};
	return {
		rating: res.rating,
		oldBest: res.oldBest.map(decorate),
		newBest: res.newBest.map(decorate),
		syncedAt
	};
}

export interface ChuniSongResult {
	chartKey: string;
	score: number | null;
	rating: number | null;
	syncedAt: string;
}

export async function chunithmSong(
	userId: number,
	chartId: string,
	source: ScoreChannel = 'divingfish'
): Promise<ChuniSongResult> {
	if (!/^\d+:\d+$/.test(chartId)) throw new AuthError(400, 'chart 参数格式应为 曲目ID:难度序号');
	const [row] = await getDb()
		.select({
			chartKey: scores.chartKey,
			score: scores.score,
			rating: scores.rating,
			updatedAt: scores.updatedAt
		})
		.from(scores)
		.where(
			and(
				eq(scores.userId, userId),
				eq(scores.game, 'chunithm'),
				eq(scores.chartKey, `chunithm:${chartId}`),
				eq(scores.source, source)
			)
		)
		.limit(1);
	if (!row) throw new AuthError(404, '未找到该谱面成绩（可能未游玩，或数据尚未同步）');
	const meta = chartMetaMap('chunithm').get(row.chartKey);
	const rating =
		row.score !== null && meta ? chuniRatingOf(meta.value, row.score) : row.rating;
	return { chartKey: row.chartKey, score: row.score, rating, syncedAt: row.updatedAt.toISOString() };
}

// ---------- djmax ----------

// maxDjPower 是全局常数（与用户无关），进程内缓存 1 小时
let maxDjPowerCache: { at: number; values: Partial<Record<number, number>> } = { at: 0, values: {} };
async function maxDjPower(button: number): Promise<number> {
	if (Date.now() - maxDjPowerCache.at > 3600_000) maxDjPowerCache = { at: Date.now(), values: {} };
	const cached = maxDjPowerCache.values[button];
	if (cached) return cached;
	let value: number;
	try {
		value = await vaMaxDjPower(button);
	} catch (err) {
		console.warn('[scores] vaMaxDjPower 失败，改用曲库估算', button, err);
		const { estimateMaxDjPowerFromLibrary } = await import('@rhythm-vault/sync');
		value = estimateMaxDjPowerFromLibrary(button);
	}
	if (!(value > 0)) throw new AuthError(502, '暂时无法计算 DJMAX 总评，请稍后重试');
	maxDjPowerCache.values[button] = value;
	return value;
}

export interface DjmaxB100Result {
	button: number;
	rating: number;
	basic: Array<{ chartKey: string; score: number | null; rating: number | null; maxCombo?: boolean }>;
	new: Array<{ chartKey: string; score: number | null; rating: number | null; maxCombo?: boolean }>;
	syncedAt: string | null;
}

function toDjmaxRec(r: {
	chartKey: string;
	score: number | null;
	rating: number | null;
	isNew: boolean;
	badges?: unknown;
}): DjmaxRecord | null {
	if (r.score === null || r.rating === null) return null;
	const parts = r.chartKey.split(':');
	const pattern = parts[3];
	if (pattern !== 'NM' && pattern !== 'HD' && pattern !== 'MX' && pattern !== 'SC') return null;
	const badges = (r.badges ?? {}) as { maxCombo?: unknown };
	return {
		chartId: r.chartKey,
		title: parts[2] ?? r.chartKey,
		pattern,
		level: 0,
		score: r.score,
		maxCombo: badges.maxCombo === true,
		djpower: r.rating,
		isNew: r.isNew
	};
}

export async function djmaxB100(userId: number, button: number): Promise<DjmaxB100Result> {
	if (![4, 5, 6, 8].includes(button)) throw new AuthError(400, '键位必须是 4/5/6/8');
	const prefix = like(scores.chartKey, `djmax:${button}B:%`);
	if (!(await hasGameScores(userId, 'djmax', prefix))) {
		throw new AuthError(404, await emptyHint(userId));
	}
	const eligible = and(prefix, gte(scores.score, MIN_SCORE));
	// 多取一些再按 chartKey 去重，避免 manual / varchive 同谱面双计
	const [basicRows, newRows, syncedAt, maxPower] = await Promise.all([
		topRated(userId, 'djmax', false, 140, eligible),
		topRated(userId, 'djmax', true, 60, eligible),
		latestUpdatedIso(userId, 'djmax'),
		maxDjPower(button)
	]);
	const pickBest = (rows: typeof basicRows) => {
		const best = new Map<string, (typeof basicRows)[number]>();
		for (const r of rows) {
			const prev = best.get(r.chartKey);
			if (!prev || (r.rating ?? -Infinity) > (prev.rating ?? -Infinity)) best.set(r.chartKey, r);
		}
		return [...best.values()]
			.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.score ?? 0) - (a.score ?? 0));
	};
	const recs = [...pickBest(basicRows).slice(0, 70), ...pickBest(newRows).slice(0, 30)]
		.map(toDjmaxRec)
		.filter((r): r is DjmaxRecord => r !== null);
	const b100 = computeDjmaxB100(
		recs.filter((r) => !r.isNew),
		recs.filter((r) => r.isNew),
		maxPower
	);
	const toEntry = (r: DjmaxRecord) => ({
		chartKey: r.chartId,
		score: r.score,
		rating: r.djpower,
		...(r.maxCombo ? { maxCombo: true } : {})
	});
	return {
		button,
		rating: b100.rating,
		basic: b100.basic.map(toEntry),
		new: b100.new.map(toEntry),
		syncedAt
	};
}

export interface DjmaxSongResult {
	chartKey: string;
	score: number | null;
	rating: number | null;
	djpower: number | null;
	maxCombo: boolean;
	syncedAt: string;
}

const DJMAX_PATTERNS = ['NM', 'HD', 'MX', 'SC'] as const;

export async function djmaxSong(
	userId: number,
	songId: number,
	pattern: string,
	button: number
): Promise<DjmaxSongResult> {
	if (![4, 5, 6, 8].includes(button)) throw new AuthError(400, '键位必须是 4/5/6/8');
	const pat = pattern.toUpperCase();
	if (!(DJMAX_PATTERNS as readonly string[]).includes(pat)) {
		throw new AuthError(400, '难度必须是 NM/HD/MX/SC');
	}
	const [row] = await getDb()
		.select({
			chartKey: scores.chartKey,
			score: scores.score,
			rating: scores.rating,
			badges: scores.badges,
			updatedAt: scores.updatedAt
		})
		.from(scores)
		.where(
			and(
				eq(scores.userId, userId),
				eq(scores.game, 'djmax'),
				eq(scores.chartKey, `djmax:${button}B:${songId}:${pat}`)
			)
		)
		.limit(1);
	if (!row) throw new AuthError(404, '未找到该谱面成绩（可能未游玩，或数据尚未同步）');
	const badges = (row.badges ?? {}) as { maxCombo?: boolean };
	return {
		chartKey: row.chartKey,
		score: row.score,
		rating: row.rating,
		djpower: row.rating,
		maxCombo: badges.maxCombo === true,
		syncedAt: row.updatedAt.toISOString()
	};
}

// ---------- maimai 推分建议 ----------

export interface MaimaiPushEntry extends PushSuggestion {
	title: string;
	label: string;
	cover: string;
	numericId: string;
}

export interface MaimaiPushResult {
	/** 当前 b50 末位 rating（挤入 b50 的门槛） */
	b50Min: number;
	/** 按 B50 估的可打定数带 */
	comfort: { dsLo: number; dsHi: number; typicalAch: number } | null;
	improve: MaimaiPushEntry[];
	unplayed: MaimaiPushEntry[];
}

export async function maimaiPush(userId: number, source: ScoreChannel = 'divingfish'): Promise<MaimaiPushResult> {
	const rows = await gameRows(userId, 'maimai_dx', source);
	if (rows.length === 0) throw new AuthError(404, await emptyHint(userId, source));
	const b50 = pickMaimaiB50FromRows(rows);
	const entries = [...b50.oldBest, ...b50.newBest];
	if (entries.length === 0) throw new AuthError(404, await emptyHint(userId, source));
	const b50Min = Math.min(...entries.map((e) => e.rating ?? 0));

	const scoreByKey = new Map(rows.map((r) => [r.chartKey, r.score]));
	const meta = chartMetaMap('maimai');
	const b50Snap = entries.flatMap((e) => {
		const m = meta.get(e.chartKey);
		if (!m || e.score == null || e.rating == null) return [];
		return [{ ds: m.value, achievement: e.score, rating: e.rating }];
	});
	const lib = getLibrary('maimai');
	const charts: PushChart[] = [];
	let lastSongId = '';
	let idx = 0;
	for (const c of lib.charts) {
		if (c.songId !== lastSongId) {
			lastSongId = c.songId;
			idx = 0;
		}
		const numericId = numericSongId(c.songId);
		const key = scoreChartKey('maimai', numericId, c, idx);
		charts.push({
			chartId: key,
			ds: c.levelValue,
			isNew: c.isNew,
			achievement: scoreByKey.get(key) ?? null
		});
		idx++;
	}

	const res = pushSuggestions(charts, b50Min, { limit: 10, b50: b50Snap });
	const decorate = (s: PushSuggestion): MaimaiPushEntry => {
		const m = meta.get(s.chartId);
		const numericId = s.chartId.split(':')[1] ?? '';
		return {
			...s,
			title: m?.title ?? s.chartId,
			label: m?.label ?? '',
			cover: m?.cover ?? '',
			numericId
		};
	};
	return {
		b50Min,
		comfort: res.comfort,
		improve: res.improve.map(decorate),
		unplayed: res.unplayed.map(decorate)
	};
}

// ---------- chunithm 推分建议 ----------

export interface ChuniPushEntry extends ChuniPushSuggestion {
	title: string;
	label: string;
	cover: string;
	numericId: string;
}

export interface ChuniPushResultView {
	/** 当前 best50 末位 rating（挤入门槛） */
	bestMin: number;
	/** 按 B30+B20 估的可打定数带 */
	comfort: { dsLo: number; dsHi: number; typicalScore: number } | null;
	improve: ChuniPushEntry[];
	unplayed: ChuniPushEntry[];
}

export async function chunithmPush(
	userId: number,
	source: ScoreChannel = 'divingfish'
): Promise<ChuniPushResultView> {
	const rows = await gameRows(userId, 'chunithm', source);
	if (rows.length === 0) throw new AuthError(404, await emptyHint(userId, source));
	const meta = chartMetaMap('chunithm');
	const engineInput: ChuniScore[] = [];
	for (const r of rows) {
		if (r.score === null) continue;
		if (isChuniWorldsEndChartKey(r.chartKey)) continue;
		const m = meta.get(r.chartKey);
		if (!m || m.value === 0) continue;
		engineInput.push({ chartId: r.chartKey, ds: m.value, isNew: m.isNew, score: r.score });
	}
	if (engineInput.length === 0) throw new AuthError(404, await emptyHint(userId, source));
	const b = computeChuniRating(engineInput);
	const entries = [...b.oldBest, ...b.newBest];
	if (entries.length === 0) throw new AuthError(404, await emptyHint(userId, source));
	const bestMin = Math.min(...entries.map((e) => e.rating));

	const scoreByKey = new Map(rows.map((r) => [r.chartKey, r.score]));
	const best50Snap = entries.flatMap((e) => {
		const m = meta.get(e.chartId);
		if (!m) return [];
		return [{ ds: m.value, score: e.score, rating: e.rating }];
	});
	const lib = getLibrary('chunithm');
	const charts: ChuniPushChart[] = [];
	let lastSongId = '';
	let idx = 0;
	for (const c of lib.charts) {
		if (c.songId !== lastSongId) {
			lastSongId = c.songId;
			idx = 0;
		}
		if (c.difficultyKey === 'WORLDS_END' || c.difficultyKey === 'OTHER') {
			idx++;
			continue;
		}
		if (c.levelLabel === '-' && c.levelValue === 0) {
			idx++;
			continue;
		}
		const numericId = numericSongId(c.songId);
		const key = scoreChartKey('chunithm', numericId, c, idx);
		charts.push({
			chartId: key,
			ds: c.levelValue,
			isNew: c.isNew,
			score: scoreByKey.get(key) ?? null
		});
		idx++;
	}

	const res = chuniPushSuggestions(charts, bestMin, { limit: 10, best50: best50Snap });
	const decorate = (s: ChuniPushSuggestion): ChuniPushEntry => {
		const m = meta.get(s.chartId);
		const numericId = s.chartId.split(':')[1] ?? '';
		return {
			...s,
			title: m?.title ?? s.chartId,
			label: m?.label ?? '',
			cover: m?.cover ?? '',
			numericId
		};
	};
	return {
		bestMin,
		comfort: res.comfort,
		improve: res.improve.map(decorate),
		unplayed: res.unplayed.map(decorate)
	};
}
