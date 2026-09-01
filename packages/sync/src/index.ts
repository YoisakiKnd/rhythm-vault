import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getDb, linkedAccounts, ratingSnapshots, scores, and, desc, eq, inArray, sql } from '@rhythm-vault/db';
import {
	divingFishPlayerRecords,
	divingFishQueryPlayer,
	lxnsChunithmPlayerBests,
	lxnsChunithmScores,
	lxnsDeveloperToken,
	lxnsMaimaiPlayerBests,
	lxnsMaimaiScores,
	vaMaxDjPower,
	vaRecords
} from '@rhythm-vault/adapters';
import {
	chuniRatingOf,
	computeChuniRating,
	computeDjmaxB100,
	computeMaimaiB50,
	isChuniWorldsEndChartKey,
	maimaiRatingOf,
	scoreChartKey,
	type ChuniScore,
	type DjmaxRecord,
	type MaimaiScore
} from '@rhythm-vault/core';

export interface SyncSourceResult {
	ok: boolean;
	detail: string;
}

export interface SyncSummary {
	maimai_dx?: SyncSourceResult;
	chunithm?: SyncSourceResult;
	djmax?: SyncSourceResult;
	/** 水鱼 / 落雪 OAuth 完整成绩（worker 与手动同步共用） */
	oauth?: SyncSourceResult;
	/** 落雪：公开 b50/b30（好友码）或 OAuth 完整成绩 */
	lxns?: SyncSourceResult;
}

export interface ScoreRow {
	chartKey: string;
	score: number | null;
	rating: number | null;
	badges: Record<string, unknown> | null;
	isNew: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------- 曲库元数据（isNew 判定） ----------

const LIB_FILES: Record<string, string> = {
	maimai_dx: 'maimaidx.json',
	chunithm: 'chunithm.json',
	djmax: 'djmax.json'
};

interface LibCache {
	isNewBySong: Map<string, boolean>;
	dsByChart: Map<string, number>;
	/** 曲名（maimai 为 曲名\\t类型）→ 候选数字 ID；多候选视为歧义不采用 */
	idsByTitle: Map<string, string[]>;
}

const libraryCache = new Map<string, LibCache>();

function maimaiTypeFromNumericId(numericId: string): string {
	const n = Number(numericId);
	if (n >= 100000) return 'utage';
	if (n >= 10000) return 'dx';
	return 'standard';
}

function loadLibrary(game: string): LibCache {
	let cached = libraryCache.get(game);
	if (cached) return cached;
	cached = { isNewBySong: new Map(), dsByChart: new Map(), idsByTitle: new Map() };
	const file = LIB_FILES[game];
	if (file) {
		const envDir = process.env.RV_DATA_DIR;
		const path = envDir ? join(envDir, file) : new URL(`../../data/${file}`, import.meta.url);
		if (existsSync(path)) {
			try {
				const parsed = JSON.parse(readFileSync(path, 'utf8')) as {
					songs: Array<{ id: string; title?: string; isNew: boolean }>;
					charts: Array<{ songId: string; difficultyKey: string; levelValue: number }>;
				};
				for (const song of parsed.songs) {
					cached.isNewBySong.set(song.id, song.isNew);
					const numeric = song.id.split(':')[1] ?? '';
					if (!numeric || !song.title) continue;
					if (game === 'maimai_dx') {
						const key = `${song.title}\t${maimaiTypeFromNumericId(numeric)}`;
						const list = cached.idsByTitle.get(key) ?? [];
						if (!list.includes(numeric)) list.push(numeric);
						cached.idsByTitle.set(key, list);
					} else {
						const list = cached.idsByTitle.get(song.title) ?? [];
						if (!list.includes(numeric)) list.push(numeric);
						cached.idsByTitle.set(song.title, list);
					}
				}
				let lastSongId = '';
				let idx = 0;
				for (const c of parsed.charts ?? []) {
					if (c.songId !== lastSongId) {
						lastSongId = c.songId;
						idx = 0;
					}
					const numeric = c.songId.split(':')[1] ?? '';
					const key =
						game === 'djmax'
							? scoreChartKey('djmax', numeric, c.difficultyKey, idx)
							: game === 'chunithm'
								? scoreChartKey('chunithm', numeric, c.difficultyKey, idx)
								: `${c.songId}:${idx}`;
					cached.dsByChart.set(key, c.levelValue);
					idx++;
				}
			} catch (err) {
				console.warn(`[sync] 曲库 ${file} 解析失败`, err);
			}
		} else {
			console.warn(`[sync] 曲库 ${file} 不存在，isNew/定数按缺失处理（先运行 sync:songs）`);
		}
	}
	libraryCache.set(game, cached);
	return cached;
}

/** songId → 是否新曲，来源 packages/data 曲库 JSON（进程内缓存） */
export function libraryIsNew(game: string, songId: string): boolean {
	return loadLibrary(game).isNewBySong.get(songId) ?? false;
}

/** chartKey（与 scores.chart_key 一致）→ 谱面定数 */
export function libraryChartDs(game: string, chartKey: string): number | null {
	const ds = loadLibrary(game).dsByChart.get(chartKey);
	return typeof ds === 'number' && Number.isFinite(ds) ? ds : null;
}

/** 多候选同名曲不静默取第一个（水鱼 Link / Link(CoF)） */
export function uniqueIdOrNull(ids: string[]): string | null {
	return ids.length === 1 ? (ids[0] ?? null) : null;
}

/** 按曲名（及 maimai 的 standard/dx/utage）对齐到本站曲库数字 ID */
export function librarySongIdByTitle(game: string, title: string, type?: string): string | null {
	const lib = loadLibrary(game);
	const pick = (key: string): string | null => uniqueIdOrNull(lib.idsByTitle.get(key) ?? []);
	if (game === 'maimai_dx') {
		if (type) return pick(`${title}\t${type}`);
		return pick(`${title}\tdx`) ?? pick(`${title}\tstandard`);
	}
	return pick(title);
}

// ---------- 归一化写入 ----------

const CHUNK = 500;

/** 批量 upsert 成绩行：同 (user, game, chartKey, source) 保留 rating 更高的（同分再比原分） */
export async function upsertScores(
	userId: number,
	game: string,
	rows: ScoreRow[],
	source: 'divingfish' | 'lxns' | 'varchive'
): Promise<number> {
	if (rows.length === 0) return 0;
	const db = getDb();
	let written = 0;
	const better = sql`(excluded.rating is not null and (${scores.rating} is null or excluded.rating > ${scores.rating} or (excluded.rating = ${scores.rating} and coalesce(excluded.score, 0) > coalesce(${scores.score}, 0))))`;
	for (let i = 0; i < rows.length; i += CHUNK) {
		const chunk = rows.slice(i, i + CHUNK).map((r) => ({ userId, game, source, ...r }));
		await db
			.insert(scores)
			.values(chunk)
			.onConflictDoUpdate({
				target: [scores.userId, scores.game, scores.chartKey, scores.source],
				set: {
					score: sql`case when ${better} then excluded.score else ${scores.score} end`,
					rating: sql`case when ${better} then excluded.rating else ${scores.rating} end`,
					badges: sql`case when ${better} then excluded.badges else ${scores.badges} end`,
					isNew: sql`excluded.is_new`,
					updatedAt: sql`case when ${better} then now() else ${scores.updatedAt} end`
				}
			});
		written += chunk.length;
	}
	return written;
}

/** 合并渠道同步条数：同游戏取较大值，避免 OAuth 空列表把公开 b50 条数打成 0 */
export function mergeSyncStats(prev: unknown, game: string, count: number): Record<string, number> {
	const base =
		prev && typeof prev === 'object' && !Array.isArray(prev)
			? Object.fromEntries(
					Object.entries(prev as Record<string, unknown>).filter(
						(e): e is [string, number] => typeof e[1] === 'number' && Number.isFinite(e[1])
					)
				)
			: {};
	const prior = base[game] ?? 0;
	return { ...base, [game]: Math.max(prior, count) };
}

export async function recordSourceSync(
	userId: number,
	source: 'divingfish' | 'lxns' | 'varchive',
	game: string,
	count: number
): Promise<void> {
	const db = getDb();
	const [row] = await db
		.select({ syncStats: linkedAccounts.syncStats })
		.from(linkedAccounts)
		.where(and(eq(linkedAccounts.userId, userId), eq(linkedAccounts.source, source)))
		.limit(1);
	if (!row) return;
	await db
		.update(linkedAccounts)
		.set({
			syncStats: mergeSyncStats(row.syncStats, game, count),
			updatedAt: new Date()
		})
		.where(and(eq(linkedAccounts.userId, userId), eq(linkedAccounts.source, source)));
}

async function upsertFromSource(
	userId: number,
	game: string,
	rows: ScoreRow[],
	source: 'divingfish' | 'lxns'
): Promise<number> {
	if (rows.length === 0) {
		const db = getDb();
		const [link] = await db
			.select({ syncStats: linkedAccounts.syncStats })
			.from(linkedAccounts)
			.where(and(eq(linkedAccounts.userId, userId), eq(linkedAccounts.source, source)))
			.limit(1);
		const prev = link?.syncStats?.[game] ?? 0;
		if (prev === 0) {
			await db
				.delete(scores)
				.where(and(eq(scores.userId, userId), eq(scores.game, game), eq(scores.source, source)));
		}
		await recordSourceSync(userId, source, game, 0);
		return 0;
	}
	const n = await upsertScores(userId, game, rows, source);
	await recordSourceSync(userId, source, game, rows.length);
	return n;
}

/** 同步完成后写一条 rating 历史快照 */
async function writeRatingSnapshot(userId: number, game: string, rating: number, detail: unknown) {
	await getDb().insert(ratingSnapshots).values({ userId, game, rating, detail });
}

// ---------- 上游载荷 → ScoreRow ----------

interface AnyRecord {
	id?: unknown;
	song_id?: unknown;
	mid?: unknown;
	level_index?: unknown;
	title?: unknown;
	ds?: unknown;
	achievements?: unknown;
	ra?: unknown;
	score?: unknown;
	djpower?: unknown;
	fc?: unknown;
	fs?: unknown;
	maxCombo?: unknown;
	pattern?: unknown;
	name?: unknown;
	level?: unknown;
}

function num(v: unknown): number | null {
	return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function badgesOf(r: AnyRecord): Record<string, unknown> | null {
	const out: Record<string, unknown> = {};
	if (r.fc != null && r.fc !== '' && r.fc !== false) out.fc = r.fc;
	if (r.fs != null && r.fs !== '' && r.fs !== false) out.fs = r.fs;
	if (r.maxCombo === true) out.maxCombo = true;
	return Object.keys(out).length > 0 ? out : null;
}

export function maimaiRows(records: AnyRecord[]): ScoreRow[] {
	const rows: ScoreRow[] = [];
	for (const r of records) {
		const songId = String(r.song_id ?? r.id ?? '');
		const diff = String(r.level_index ?? '');
		if (!songId || diff === '') continue;
		const chartKey = `maimaidx:${songId}:${diff}`;
		const ds = libraryChartDs('maimai_dx', chartKey) ?? num(r.ds);
		const achievement = num(r.achievements);
		rows.push({
			chartKey,
			score: achievement,
			rating:
				ds !== null && achievement !== null ? maimaiRatingOf(ds, achievement) : num(r.ra),
			badges: badgesOf(r),
			isNew: libraryIsNew('maimai_dx', `maimaidx:${songId}`)
		});
	}
	return rows;
}

export function chuniRows(records: AnyRecord[]): ScoreRow[] {
	const rows: ScoreRow[] = [];
	for (const r of records) {
		const songId = String(r.mid ?? r.id ?? '');
		const diff = String(r.level_index ?? '');
		if (!songId || diff === '') continue;
		const chartKey = `chunithm:${songId}:${diff}`;
		if (isChuniWorldsEndChartKey(chartKey)) continue;
		const score = num(r.score) ?? num(r.achievements);
		const ds = libraryChartDs('chunithm', chartKey) ?? num(r.ds);
		if (ds === 0) continue;
		rows.push({
			chartKey,
			score,
			rating: ds !== null && score !== null ? chuniRatingOf(ds, score) : num(r.ra),
			badges: badgesOf(r),
			isNew: libraryIsNew('chunithm', `chunithm:${songId}`)
		});
	}
	return rows;
}

/** 落雪曲目 ID（standard/dx 共用，DX 在水鱼侧 +10000）对齐本站数字 ID */
function lxnsMaimaiLibraryId(s: Record<string, unknown>): string | null {
	const type = String(s.type ?? '');
	const rawId = Number(s.id);
	if (Number.isFinite(rawId) && rawId > 0) {
		const mapped = type === 'dx' && rawId < 10000 ? rawId + 10000 : rawId;
		if (loadLibrary('maimai_dx').isNewBySong.has(`maimaidx:${mapped}`)) return String(mapped);
	}
	const title = String(s.song_name ?? '');
	return librarySongIdByTitle('maimai_dx', title, type || undefined);
}

/** 落雪舞萌成绩 → 本站 ScoreRow（按曲名+谱面类型对齐水鱼 ID） */
export function lxnsMaimaiScoreRows(raw: Record<string, unknown>[]): ScoreRow[] {
	const records: AnyRecord[] = [];
	for (const s of raw) {
		const id = lxnsMaimaiLibraryId(s);
		if (!id) continue;
		records.push({
			id,
			level_index: s.level_index,
			achievements: s.achievements,
			ra: s.dx_rating,
			fc: s.fc,
			fs: s.fs
		});
	}
	return maimaiRows(records);
}

/** 落雪中二成绩 → 本站 ScoreRow（按曲名对齐；对不上则尝试曲库是否收录该 ID） */
export function lxnsChuniScoreRows(raw: Record<string, unknown>[]): ScoreRow[] {
	const records: AnyRecord[] = [];
	for (const s of raw) {
		const title = String(s.song_name ?? '');
		const rawId = String(s.id ?? '');
		const id =
			(rawId && loadLibrary('chunithm').isNewBySong.has(`chunithm:${rawId}`) ? rawId : null) ??
			librarySongIdByTitle('chunithm', title);
		if (!id) continue;
		records.push({
			id,
			level_index: s.level_index,
			score: s.score,
			ra: s.rating,
			fc: s.fc
		});
	}
	return chuniRows(records);
}

function djmaxRows(button: number, records: AnyRecord[]): ScoreRow[] {
	const rows: ScoreRow[] = [];
	for (const r of records) {
		const songId = String(r.title ?? '');
		const pattern = String(r.pattern ?? '');
		if (!songId || !pattern) continue;
		rows.push({
			chartKey: scoreChartKey('djmax', songId, `${button}B ${pattern}`),
			score: num(r.score),
			rating: num(r.djpower),
			badges: { maxCombo: r.maxCombo === true },
			isNew: libraryIsNew('djmax', `djmax:${songId}`)
		});
	}
	return rows;
}

// ---------- 同步入口 ----------

/**
 * 公开路径同步（无需用户 OAuth）：
 * - maimai / chunithm：水鱼用户名 → b50 / b30；落雪好友码 + 站点开发者 Token → b50 / b30
 * - djmax：按绑定的 V-ARCHIVE ID 拉四个键位完整成绩
 * 归一化 upsert 到 scores 表，默认为三游追加 rating 历史快照（每游戏一次）。
 */
export async function syncUserPublic(
	userId: number,
	opts?: { skipSnapshot?: boolean }
): Promise<SyncSummary> {
	const db = getDb();
	const bindings = await db
		.select({
			source: linkedAccounts.source,
			externalId: linkedAccounts.externalId,
			hasTokens: linkedAccounts.accessTokenEnc
		})
		.from(linkedAccounts)
		.where(and(eq(linkedAccounts.userId, userId)));
	const externalId = new Map(
		bindings.filter((b) => b.externalId).map((b) => [b.source, b.externalId!])
	);

	const summary: SyncSummary = {};
	let touchedMaimai = false;
	let touchedChuni = false;
	let touchedDjmax = false;

	const vaId = externalId.get('varchive');
	if (vaId) {
		try {
			let count = 0;
			for (const button of [4, 5, 6, 8] as const) {
				const resp = await vaRecords(vaId, button, { sort: 'djpower', order: 'desc', limit: 2000 });
				count += await upsertScores(userId, 'djmax', djmaxRows(button, resp.records as AnyRecord[]), 'varchive');
				await sleep(500);
			}
			touchedDjmax = true;
			summary.djmax = { ok: true, detail: `四个键位共 ${count} 条成绩` };
		} catch (err) {
			summary.djmax = { ok: false, detail: err instanceof Error ? err.message : String(err) };
		}
	}

	if (externalId.has('divingfish')) {
		const username = externalId.get('divingfish')!;
		try {
			const resp = await divingFishQueryPlayer('maimai', { username, b50: true });
			const rows = maimaiRows((resp.records ?? []) as AnyRecord[]);
			await upsertFromSource(userId, 'maimai_dx', rows, 'divingfish');
			touchedMaimai = true;
			summary.maimai_dx = { ok: true, detail: `b50 已同步（${rows.length} 条）` };
		} catch (err) {
			summary.maimai_dx = { ok: false, detail: err instanceof Error ? err.message : String(err) };
		}
		await sleep(1000);
		try {
			const resp = await divingFishQueryPlayer('chunithm', { username, b30: true });
			const rows = chuniRows((resp.records ?? []) as AnyRecord[]);
			await upsertFromSource(userId, 'chunithm', rows, 'divingfish');
			touchedChuni = true;
			summary.chunithm = { ok: true, detail: `b30 已同步（${rows.length} 条）` };
		} catch (err) {
			summary.chunithm = { ok: false, detail: err instanceof Error ? err.message : String(err) };
		}
	}

	const lxnsFriend = externalId.get('lxns');
	const lxnsDev = lxnsDeveloperToken();
	if (lxnsFriend && lxnsDev) {
		try {
			const maimaiRaw = await lxnsMaimaiPlayerBests(lxnsFriend, lxnsDev);
			const maimaiRowsOut = lxnsMaimaiScoreRows(maimaiRaw);
			await upsertFromSource(userId, 'maimai_dx', maimaiRowsOut, 'lxns');
			touchedMaimai = true;
			await sleep(1000);
			const chuniRaw = await lxnsChunithmPlayerBests(lxnsFriend, lxnsDev);
			const chuniRowsOut = lxnsChuniScoreRows(chuniRaw);
			await upsertFromSource(userId, 'chunithm', chuniRowsOut, 'lxns');
			touchedChuni = true;
			summary.lxns = {
				ok: true,
				detail: `b50 ${maimaiRowsOut.length} 条 / b30 ${chuniRowsOut.length} 条`
			};
			if (!summary.maimai_dx) {
				summary.maimai_dx = { ok: true, detail: `落雪 b50 已同步（${maimaiRowsOut.length} 条）` };
			}
			if (!summary.chunithm) {
				summary.chunithm = { ok: true, detail: `落雪 b30 已同步（${chuniRowsOut.length} 条）` };
			}
		} catch (err) {
			summary.lxns = { ok: false, detail: err instanceof Error ? err.message : String(err) };
			if (!summary.maimai_dx) {
				summary.maimai_dx = { ok: false, detail: err instanceof Error ? err.message : String(err) };
			}
			if (!summary.chunithm) {
				summary.chunithm = { ok: false, detail: err instanceof Error ? err.message : String(err) };
			}
		}
	} else if (lxnsFriend && !lxnsDev && !bindings.some((b) => b.source === 'lxns' && b.hasTokens)) {
		summary.lxns = {
			ok: false,
			detail: '已绑定好友码，但站点未配置 LXNS_DEVELOPER_TOKEN，公开同步无法按好友码拉成绩（可用 OAuth）'
		};
	}

	if (!opts?.skipSnapshot) {
		if (touchedMaimai) await snapshotMaimaiRating(userId);
		if (touchedChuni) await snapshotChuniRating(userId);
		if (touchedDjmax) await snapshotDjmaxRating(userId);
	}

	return summary;
}

/** 同谱面多渠道时保留 rating 更高的一行，供排行榜快照使用 */
function bestRowPerChart<T extends { chartKey: string; score: number | null }>(
	rows: T[],
	ratingOf: (row: T) => number | null
): T[] {
	const best = new Map<string, T>();
	for (const r of rows) {
		const prev = best.get(r.chartKey);
		if (!prev) {
			best.set(r.chartKey, r);
			continue;
		}
		const pa = ratingOf(prev) ?? -Infinity;
		const pb = ratingOf(r) ?? -Infinity;
		if (pb > pa || (pb === pa && (r.score ?? 0) > (prev.score ?? 0))) best.set(r.chartKey, r);
	}
	return [...best.values()];
}

/** maimai 总 rating：旧曲 top35 + 新曲 top15 之和（基于本地 scores 表，用曲库定数重算） */
export async function snapshotMaimaiRating(userId: number): Promise<number | null> {
	const rows = bestRowPerChart(
		await getDb()
			.select({ chartKey: scores.chartKey, score: scores.score, isNew: scores.isNew, rating: scores.rating })
			.from(scores)
			.where(and(eq(scores.userId, userId), eq(scores.game, 'maimai_dx'))),
		(r) => r.rating
	);
	const engineInput: MaimaiScore[] = [];
	for (const r of rows) {
		if (r.score === null) continue;
		const ds = libraryChartDs('maimai_dx', r.chartKey);
		if (ds === null) continue;
		engineInput.push({
			chartId: r.chartKey,
			levelValue: ds,
			isNew: r.isNew,
			achievement: r.score
		});
	}
	if (engineInput.length === 0) return null;
	const res = computeMaimaiB50(engineInput);
	await writeRatingSnapshot(userId, 'maimai_dx', res.rating, { oldBest: 35, newBest: 15 });
	return res.rating;
}

/** 中二总 rating：b30 + 新曲 b20 均值，定数与 isNew 以曲库为准；排除 WORLD'S END */
export async function snapshotChuniRating(userId: number): Promise<number | null> {
	const rows = bestRowPerChart(
		await getDb()
			.select({ chartKey: scores.chartKey, score: scores.score, rating: scores.rating })
			.from(scores)
			.where(and(eq(scores.userId, userId), eq(scores.game, 'chunithm'))),
		(r) => r.rating
	);
	const engineInput: ChuniScore[] = [];
	for (const r of rows) {
		if (r.score === null) continue;
		if (isChuniWorldsEndChartKey(r.chartKey)) continue;
		const ds = libraryChartDs('chunithm', r.chartKey);
		if (ds === null || ds === 0) continue;
		const songId = r.chartKey.replace(/:\d+$/, '');
		engineInput.push({
			chartId: r.chartKey,
			ds,
			isNew: libraryIsNew('chunithm', songId),
			score: r.score
		});
	}
	if (engineInput.length === 0) return null;
	const res = computeChuniRating(engineInput);
	await writeRatingSnapshot(userId, 'chunithm', res.rating, { oldBest: 30, newBest: 20 });
	return res.rating;
}

function toDjmaxRecord(r: {
	chartKey: string;
	score: number | null;
	rating: number | null;
	isNew: boolean;
}): DjmaxRecord | null {
	if (r.score === null || r.rating === null) return null;
	const parts = r.chartKey.split(':');
	const pattern = parts[3];
	if (pattern !== 'NM' && pattern !== 'HD' && pattern !== 'MX' && pattern !== 'SC') return null;
	return {
		chartId: r.chartKey,
		title: parts[2] ?? r.chartKey,
		pattern,
		level: 0,
		score: r.score,
		maxCombo: false,
		djpower: r.rating,
		isNew: r.isNew
	};
}

/** djmax 总 DJPower：各键位旧曲 top70 + 新曲 top30，按 maxDjPower 归一化，逐键位写快照 */
export async function snapshotDjmaxRating(userId: number): Promise<number | null> {
	const rows = await getDb()
		.select({
			chartKey: scores.chartKey,
			score: scores.score,
			rating: scores.rating,
			isNew: scores.isNew
		})
		.from(scores)
		.where(and(eq(scores.userId, userId), eq(scores.game, 'djmax')));
	const recs = rows.map(toDjmaxRecord).filter((r): r is DjmaxRecord => r !== null);
	if (recs.length === 0) return null;
	let best: number | null = null;
	for (const button of [4, 5, 6, 8] as const) {
		const prefix = `djmax:${button}B:`;
		const buttonRecs = recs.filter((r) => r.chartId.startsWith(prefix));
		if (buttonRecs.length === 0) continue;
		const maxPower = await vaMaxDjPower(button);
		const b100 = computeDjmaxB100(
			buttonRecs.filter((r) => !r.isNew),
			buttonRecs.filter((r) => r.isNew),
			maxPower
		);
		if (b100.raw === 0) continue;
		await writeRatingSnapshot(userId, 'djmax', b100.rating, {
			button,
			raw: b100.raw,
			maxDjPower: maxPower
		});
		if (best === null || b100.rating > best) best = b100.rating;
	}
	return best;
}

/** 最近一次成绩更新时间（同步状态展示用） */
export async function latestScoreAt(userId: number, game: string): Promise<Date | null> {
	const [row] = await getDb()
		.select({ updatedAt: scores.updatedAt })
		.from(scores)
		.where(and(eq(scores.userId, userId), eq(scores.game, game)))
		.orderBy(desc(scores.updatedAt))
		.limit(1);
	return row?.updatedAt ?? null;
}

export async function latestScoreAtByUserGame(
	userIds: number[]
): Promise<Map<string, Date>> {
	const out = new Map<string, Date>();
	if (userIds.length === 0) return out;
	const rows = await getDb()
		.select({
			userId: scores.userId,
			game: scores.game,
			updatedAt: sql<Date>`max(${scores.updatedAt})`.as('updated_at')
		})
		.from(scores)
		.where(inArray(scores.userId, userIds))
		.groupBy(scores.userId, scores.game);
	for (const r of rows) out.set(`${r.userId}:${r.game}`, r.updatedAt);
	return out;
}

export async function withUserSyncLock<T>(userId: number, fn: () => Promise<T>): Promise<T> {
	const db = getDb();
	await db.execute(sql`SELECT pg_advisory_lock(${userId})`);
	try {
		return await fn();
	} finally {
		await db.execute(sql`SELECT pg_advisory_unlock(${userId})`);
	}
}

export type AccessTokenGetter = (
	userId: number,
	source: 'divingfish' | 'lxns'
) => Promise<string | null>;

async function pullOAuthScores(
	userId: number,
	getToken: AccessTokenGetter,
	summary: SyncSummary
): Promise<void> {
	try {
		const token = await getToken(userId, 'divingfish');
		if (token) {
			const maimaiRecords = await divingFishPlayerRecords('maimai', token);
			const maimaiCount = await upsertFromSource(
				userId,
				'maimai_dx',
				maimaiRows(maimaiRecords),
				'divingfish'
			);
			await sleep(1000);
			const chuniRecords = await divingFishPlayerRecords('chunithm', token);
			const chuniCount = await upsertFromSource(
				userId,
				'chunithm',
				chuniRows(chuniRecords),
				'divingfish'
			);
			summary.oauth = {
				ok: true,
				detail: `完整成绩已同步（水鱼 maimai ${maimaiCount} 条 / chunithm ${chuniCount} 条）`
			};
		}
	} catch (err) {
		summary.oauth = { ok: false, detail: err instanceof Error ? err.message : String(err) };
	}

	try {
		const token = await getToken(userId, 'lxns');
		if (token) {
			const maimaiRaw = await lxnsMaimaiScores(token);
			const maimaiCount = await upsertFromSource(
				userId,
				'maimai_dx',
				lxnsMaimaiScoreRows(maimaiRaw),
				'lxns'
			);
			await sleep(1000);
			const chuniRaw = await lxnsChunithmScores(token);
			const chuniCount = await upsertFromSource(
				userId,
				'chunithm',
				lxnsChuniScoreRows(chuniRaw),
				'lxns'
			);
			summary.lxns = {
				ok: true,
				detail: `完整成绩已同步（落雪 maimai ${maimaiCount} 条 / chunithm ${chuniCount} 条）`
			};
		}
	} catch (err) {
		summary.lxns = { ok: false, detail: err instanceof Error ? err.message : String(err) };
	}
}

/** 公开路径 + 可选 OAuth 全量；worker 与手动同步共用。带 advisory lock。 */
export async function syncUserFull(
	userId: number,
	getToken?: AccessTokenGetter
): Promise<SyncSummary> {
	return withUserSyncLock(userId, async () => {
		const summary = await syncUserPublic(userId, { skipSnapshot: true });
		if (getToken) await pullOAuthScores(userId, getToken, summary);
		await snapshotMaimaiRating(userId);
		await snapshotChuniRating(userId);
		await snapshotDjmaxRating(userId);
		return summary;
	});
}
