import { getDb, scores, and, eq, like } from '@rhythm-vault/db';
import { AuthError } from './auth';
import {
	DB_GAME,
	SONG_PREFIX,
	getSongCatalog,
	type GameKey,
	type SongCatalog,
	type SongChartView
} from './library';

export interface SongChartScore {
	score: number | null;
	rating: number | null;
	badges: unknown;
}

export interface SongChartDetail extends SongChartView {
	mine: SongChartScore | null;
}

export interface SongDetail extends Omit<SongCatalog, 'charts'> {
	charts: SongChartDetail[];
	syncedAt: string | null;
}

async function scoresForSong(
	userId: number,
	game: GameKey,
	numericId: string,
	source?: string
): Promise<Array<{ chartKey: string; score: number | null; rating: number | null; badges: unknown; updatedAt: Date }>> {
	const pattern =
		game === 'djmax'
			? `djmax:%:${numericId}:%`
			: `${SONG_PREFIX[game]}:${numericId}:%`;
	return getDb()
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
				eq(scores.game, DB_GAME[game]),
				like(scores.chartKey, pattern),
				source ? eq(scores.source, source) : undefined
			)
		);
}

function belongsToSong(game: GameKey, numericId: string, chartKey: string): boolean {
	if (game === 'djmax') {
		const parts = chartKey.split(':');
		return parts[0] === 'djmax' && parts[2] === numericId;
	}
	return chartKey.startsWith(`${SONG_PREFIX[game]}:${numericId}:`);
}

/** 单曲详情：曲库元数据 + 各谱面；传入 userId 时附该用户成绩 */
export async function getSongDetail(
	game: GameKey,
	numericId: string,
	userId: number | null,
	source?: string
): Promise<SongDetail | null> {
	const catalog = getSongCatalog(game, numericId);
	if (!catalog) return null;

	if (userId == null) {
		return {
			...catalog,
			charts: catalog.charts.map((c) => ({ ...c, mine: null })),
			syncedAt: null
		};
	}

	const rows = (await scoresForSong(userId, game, numericId, source)).filter((r) =>
		belongsToSong(game, numericId, r.chartKey)
	);
	const byKey = new Map(rows.map((r) => [r.chartKey, r]));
	const syncedAt =
		rows.reduce<Date | null>((acc, r) => (acc === null || r.updatedAt > acc ? r.updatedAt : acc), null)?.toISOString() ??
		null;

	return {
		...catalog,
		charts: catalog.charts.map((c) => {
			const row = byKey.get(c.chartKey);
			return {
				...c,
				mine: row
					? { score: row.score, rating: row.rating, badges: row.badges }
					: null
			};
		}),
		syncedAt
	};
}

export interface SongDetailJsonChart {
	chartKey: string;
	diff: string;
	diffLabel: string;
	level: string;
	ds: number;
	isNew: boolean;
	floorName?: string;
	button?: number;
	pattern?: string;
	score: number | null;
	rating: number | null;
	badges: unknown;
}

export interface SongDetailJson {
	game: GameKey;
	id: string;
	title: string;
	artist: string;
	genre: string;
	version: string | null;
	versionCode: number | null;
	dlcCode: string | null;
	dlcName: string | null;
	isNew: boolean;
	cover: string;
	chartType: SongCatalog['chartType'];
	charts: SongDetailJsonChart[];
	syncedAt: string | null;
}

export function songDetailJson(detail: SongDetail): SongDetailJson {
	return {
		game: detail.game,
		id: detail.id,
		title: detail.title,
		artist: detail.artist,
		genre: detail.genre,
		version: detail.versionTitle,
		versionCode: detail.versionCode,
		dlcCode: detail.dlcCode,
		dlcName: detail.dlcName,
		isNew: detail.isNew,
		cover: detail.cover,
		chartType: detail.chartType,
		charts: detail.charts.map((c) => ({
			chartKey: c.chartKey,
			diff: c.diffKey,
			diffLabel: c.diffLabel,
			level: c.levelLabel,
			ds: c.levelValue,
			isNew: c.isNew,
			...(c.floorName ? { floorName: c.floorName } : {}),
			...(c.button != null && c.pattern ? { button: c.button, pattern: c.pattern } : {}),
			score: c.mine?.score ?? null,
			rating: c.mine?.rating ?? null,
			badges: c.mine?.badges ?? null
		})),
		syncedAt: detail.syncedAt
	};
}

export async function songDetailOrThrow(
	game: GameKey,
	numericId: string,
	userId: number,
	source?: string
): Promise<SongDetailJson> {
	const detail = await getSongDetail(game, numericId, userId, source);
	if (!detail) throw new AuthError(404, '曲目不存在');
	return songDetailJson(detail);
}
