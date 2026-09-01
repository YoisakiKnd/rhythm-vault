import { getDb, scores, and, eq, sql } from '@rhythm-vault/db';
import { AuthError } from './auth';
import { channelEmptyMessage, catalogSrcToSource } from './channel';
import type { CatalogSrc } from '$lib/catalog-nav';
import { fcSql, iterateCharts, ppSql, chartKeyOf } from './chart-slots';
import {
	GAME_LABEL,
	getLibrary,
	isDummyChart,
	isWorldsEndChart,
	type GameKey,
	type LibraryChart
} from './library';

export interface ProgressBucket {
	/** 分组键（版本码 / 等级标签 / dlcCode） */
	key: string;
	/** 展示名 */
	label: string;
	total: number;
	played: number;
	/** FC / FULL CHAIN / MC 数（有徽章数据的谱面） */
	fc: number;
	/** 满分谱面数（maimai 理论 / djmax PP） */
	pp: number;
	/** 完成度 0-100 */
	completion: number;
}

type ProgressKind = 'maimai' | 'chunithm' | 'djmax';

interface ChartSlot {
	key: string;
	bucket_key: string;
	bucket_label: string;
}

interface AggRow {
	key: string;
	label: string;
	total: number;
	played: number;
	fc: number;
	pp: number;
}

/** 未知版本码吸附到不超过它的最近已知版本（PLUS 并回主版本） */
export function snapVersionCode(vc: number, knownCodes: number[]): string {
	let best = knownCodes[0];
	if (best === undefined) return String(vc);
	for (const k of knownCodes) {
		if (k <= vc) best = k;
		else break;
	}
	return String(best);
}

export function finalizeProgressBuckets(rows: AggRow[]): ProgressBucket[] {
	return rows.map((r) => {
		const total = Number(r.total);
		const played = Number(r.played);
		return {
			key: String(r.key),
			label: String(r.label),
			total,
			played,
			fc: Number(r.fc),
			pp: Number(r.pp),
			completion: total === 0 ? 0 : Math.round((played / total) * 1000) / 10
		};
	});
}

async function requireHasScores(userId: number, game: string, source?: string): Promise<void> {
	const [row] = await getDb()
		.select({ chartKey: scores.chartKey })
		.from(scores)
		.where(
			and(
				eq(scores.userId, userId),
				eq(scores.game, game),
				source ? eq(scores.source, source) : undefined
			)
		)
		.limit(1);
	if (!row) {
		const hint =
			source === 'lxns' || source === 'divingfish'
				? channelEmptyMessage(source === 'lxns' ? 'lxns' : 'df')
				: '该账号暂无同步数据：请先绑定数据源并同步';
		throw new AuthError(404, hint);
	}
}

/**
 * 曲库分桶元数据以 JSON 传入，SQL 侧 LEFT JOIN scores 后 GROUP BY。
 * 曲库不在 Postgres 里，所以分母（total）来自 unnest/jsonb 行数，分子来自 JOIN 命中。
 */
async function aggregateBuckets(
	userId: number,
	game: string,
	kind: ProgressKind,
	slots: ChartSlot[],
	source?: string
): Promise<ProgressBucket[]> {
	if (slots.length === 0) return [];
	const fcExpr = fcSql(kind);
	const ppExpr = ppSql(kind);
	const payload = JSON.stringify(slots);
	const result = await getDb().execute(sql`
		SELECT
			t.bucket_key AS "key",
			t.bucket_label AS "label",
			count(*)::int AS total,
			count(s.chart_key)::int AS played,
			count(*) FILTER (WHERE ${fcExpr})::int AS fc,
			count(*) FILTER (WHERE ${ppExpr})::int AS pp
		FROM jsonb_to_recordset(cast(${payload} as jsonb))
			AS t(key text, bucket_key text, bucket_label text)
		LEFT JOIN scores AS s
			ON s.chart_key = t.key
			AND s.user_id = ${userId}
			AND s.game = ${game}
			${source ? sql`AND s.source = ${source}` : sql``}
		GROUP BY t.bucket_key, t.bucket_label
	`);
	return finalizeProgressBuckets(Array.from(result as Iterable<AggRow>));
}

function skipProgressChart(chart: LibraryChart): boolean {
	return isDummyChart(chart) || isWorldsEndChart(chart);
}

/** maimai：按版本（牌子进度）与按等级 */
export async function maimaiProgress(userId: number, src: CatalogSrc = 'df') {
	const source = catalogSrcToSource(src);
	await requireHasScores(userId, 'maimai_dx', source);
	const lib = getLibrary('maimai');

	const versionTitle = new Map((lib.versions ?? []).map((v) => [String(v.code), v.title]));
	const knownCodes = [...versionTitle.keys()].map(Number).sort((a, b) => a - b);
	const songVersion = new Map(lib.songs.map((s) => [s.id, s.versionCode]));

	const versionSlots: ChartSlot[] = [];
	const levelSlots: ChartSlot[] = [];
	iterateCharts(lib.charts, (c, idx) => {
		if (skipProgressChart(c)) return;
		const key = chartKeyOf('maimai', c, idx);
		const vc = songVersion.get(c.songId);
		if (vc !== undefined) {
			const code = snapVersionCode(vc, knownCodes);
			versionSlots.push({
				key,
				bucket_key: code,
				bucket_label: versionTitle.get(code) ?? `版本 ${code}`
			});
		}
		levelSlots.push({ key, bucket_key: c.levelLabel, bucket_label: c.levelLabel });
	});

	const [versionBuckets, levelBuckets] = await Promise.all([
		aggregateBuckets(userId, 'maimai_dx', 'maimai', versionSlots, source),
		aggregateBuckets(userId, 'maimai_dx', 'maimai', levelSlots, source)
	]);
	versionBuckets.sort((a, b) => b.key.localeCompare(a.key));
	levelBuckets.sort(
		(a, b) =>
			(parseFloat(a.key.replace(/[^\d.]/g, '')) || 0) - (parseFloat(b.key.replace(/[^\d.]/g, '')) || 0)
	);

	return { game: 'maimai_dx', gameLabel: GAME_LABEL.maimai, versionBuckets, levelBuckets };
}

/** chunithm：按等级 */
export async function chunithmProgress(userId: number, src: CatalogSrc = 'df') {
	const source = catalogSrcToSource(src);
	await requireHasScores(userId, 'chunithm', source);
	const lib = getLibrary('chunithm');
	const levelSlots: ChartSlot[] = [];
	iterateCharts(lib.charts, (c, idx) => {
		if (skipProgressChart(c)) return;
		levelSlots.push({
			key: chartKeyOf('chunithm', c, idx),
			bucket_key: c.levelLabel,
			bucket_label: c.levelLabel
		});
	});
	const levelBuckets = await aggregateBuckets(userId, 'chunithm', 'chunithm', levelSlots, source);
	levelBuckets.sort(
		(a, b) =>
			(parseFloat(a.key.replace(/[^\d.]/g, '')) || 0) - (parseFloat(b.key.replace(/[^\d.]/g, '')) || 0)
	);
	return { game: 'chunithm', gameLabel: GAME_LABEL.chunithm, levelBuckets };
}

/** djmax：按曲包 */
export async function djmaxProgress(userId: number) {
	await requireHasScores(userId, 'djmax');
	const lib = getLibrary('djmax');
	const dlcNames = new Map((lib.dlcs ?? []).map((d) => [d.dlcCode, d.dlcName]));
	const dlcOfSong = new Map(lib.songs.map((s) => [s.id, s.dlcCode ?? '']));
	const dlcSlots: ChartSlot[] = [];
	for (const c of lib.charts) {
		if (skipProgressChart(c)) continue;
		const dlc = dlcOfSong.get(c.songId) ?? 'UNKNOWN';
		dlcSlots.push({
			key: chartKeyOf('djmax', c, 0),
			bucket_key: dlc,
			bucket_label: dlcNames.get(dlc) ?? dlc
		});
	}
	const dlcBuckets = await aggregateBuckets(userId, 'djmax', 'djmax', dlcSlots);
	dlcBuckets.sort((a, b) => b.completion - a.completion || b.total - a.total);
	return { game: 'djmax', gameLabel: GAME_LABEL.djmax, dlcBuckets };
}

export type GameForProgress = Extract<GameKey, 'maimai' | 'chunithm' | 'djmax'>;
