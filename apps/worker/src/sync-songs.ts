import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
	divingFishMusicData,
	lxnsChuniSongList,
	lxnsMaimaiSongList,
	mergeSongLibrary,
	normalizeChunithm,
	normalizeDjmax,
	normalizeLxnsChunithm,
	normalizeLxnsMaimai,
	normalizeMaimai,
	vaDlcs,
	vaSongs,
	type LxnsChuniSong
} from '@rhythm-vault/adapters';
import { SongLibrarySchema, type SongLibrary } from '@rhythm-vault/core';
import { getDb, syncState, eq, and } from '@rhythm-vault/db';

const REPO_DATA_DIR = process.env.RV_DATA_DIR
	? pathToFileURL(process.env.RV_DATA_DIR.endsWith('/') ? process.env.RV_DATA_DIR : `${process.env.RV_DATA_DIR}/`)
	: new URL('../../../packages/data/', import.meta.url);
const CACHE_DIR = new URL('../.cache/', import.meta.url);

async function readEtag(game: string): Promise<string | undefined> {
	try {
		const [row] = await getDb()
			.select({ etag: syncState.etag })
			.from(syncState)
			.where(and(eq(syncState.source, 'divingfish'), eq(syncState.game, game)))
			.limit(1);
		if (row?.etag) return row.etag;
	} catch {
		/* 无库时回落本地文件 */
	}
	const p = new URL(`${game}.etag`, CACHE_DIR);
	return existsSync(p) ? readFileSync(p, 'utf8').trim() || undefined : undefined;
}

async function saveEtag(game: string, etag?: string): Promise<void> {
	if (!etag) return;
	try {
		await getDb()
			.insert(syncState)
			.values({ source: 'divingfish', game, etag, lastSyncAt: new Date() })
			.onConflictDoUpdate({
				target: [syncState.source, syncState.game],
				set: { etag, lastSyncAt: new Date() }
			});
		return;
	} catch {
		/* 回落文件 */
	}
	mkdirSync(CACHE_DIR, { recursive: true });
	writeFileSync(new URL(`${game}.etag`, CACHE_DIR), etag);
}

function writeLibrary(name: string, lib: SongLibrary): void {
	const validated = SongLibrarySchema.parse(lib);
	const target = new URL(`${name}.json`, REPO_DATA_DIR);
	mkdirSync(dirname(target.pathname), { recursive: true });
	if (existsSync(target)) {
		try {
			const prev = JSON.parse(readFileSync(target, 'utf8')) as { songs?: unknown[] };
			const oldCount = Array.isArray(prev.songs) ? prev.songs.length : 0;
			if (oldCount > 50 && validated.songs.length < oldCount * 0.8) {
				console.error(
					`✗ ${name}.json 拒绝写入：新曲库 ${validated.songs.length} 首低于旧库 ${oldCount} 的 80%`
				);
				return;
			}
		} catch {
			/* 旧文件损坏则允许覆盖 */
		}
	}
	const tmp = new URL(`${name}.json.tmp`, REPO_DATA_DIR);
	writeFileSync(tmp, JSON.stringify(validated, null, '\t') + '\n');
	renameSync(tmp, target);
	console.log(
		`✓ ${name}.json  曲目 ${validated.songs.length} · 谱面 ${validated.charts.length}  (source: ${validated.source})`
	);
}

function readLibrary(name: string): SongLibrary {
	return SongLibrarySchema.parse(JSON.parse(readFileSync(new URL(`${name}.json`, REPO_DATA_DIR), 'utf8')));
}

async function syncDivingFish(game: 'maimai' | 'chunithm', name: string): Promise<void> {
	const target = new URL(`${name}.json`, REPO_DATA_DIR);
	const etag = existsSync(target) ? await readEtag(game) : undefined;
	const res = await divingFishMusicData(game, etag);
	if (res.status === 304) {
		console.log(`- ${name}: 水鱼曲库未变化（ETag 命中）`);
		return;
	}
	console.log(`… ${name}: 水鱼拉取 ${res.data?.length ?? 0} 条曲目`);
	writeLibrary(
		name,
		game === 'maimai' ? normalizeMaimai(res.data as never[]) : normalizeChunithm(res.data as never[])
	);
	await saveEtag(game, res.etag);
}

async function syncVarchive(): Promise<void> {
	const [songs, dlcs] = await Promise.all([vaSongs(), vaDlcs()]);
	console.log(`… djmax: 拉取 ${songs.length} 条曲目`);
	writeLibrary('djmax', normalizeDjmax(songs, dlcs));
}

/**
 * 用水鱼曲库里能对上的落雪 version，取最大值作为国服当前版本，标记 isNew。
 * 落雪不可用时保持原 isNew（水鱼 chuni 本身没有新曲标记，会全是 false）。
 */
function applyChuniVersions(lib: SongLibrary, lxnsSongs: LxnsChuniSong[]): SongLibrary {
	const versionBySong = new Map(
		lxnsSongs.map((s) => [Number(s.id), s.version ?? 0]).filter(([id]) => !Number.isNaN(id))
	);
	const cnVersions = lib.songs
		.map((s) => versionBySong.get(Number(s.id.split(':')[1])) ?? 0)
		.filter((v) => v > 0);
	if (cnVersions.length === 0) {
		console.warn('- chunithm: 落雪版本数据未能匹配到任何曲目，isNew 保持原值');
		return lib;
	}
	const currentVersion = Math.max(...cnVersions);
	const isNewBySong = new Map(
		lib.songs.map((s) => [s.id, (versionBySong.get(Number(s.id.split(':')[1])) ?? 0) === currentVersion])
	);
	const marked = lib.songs.filter((s) => isNewBySong.get(s.id)).length;
	console.log(`- chunithm: 国服当前版本 v${currentVersion}，标记新曲 ${marked} 首`);
	return {
		...lib,
		songs: lib.songs.map((s) => ({
			...s,
			versionCode: versionBySong.get(Number(s.id.split(':')[1])) ?? s.versionCode,
			isNew: isNewBySong.get(s.id) ?? false
		})),
		charts: lib.charts.map((c) => ({ ...c, isNew: isNewBySong.get(c.songId) ?? false }))
	};
}

async function mergeMaimaiLxns(lib: SongLibrary) {
	try {
		const { songs, versions } = await lxnsMaimaiSongList();
		const extra = normalizeLxnsMaimai(songs, versions);
		const result = mergeSongLibrary(lib, extra);
		console.log(`- maimai: 落雪曲库 ${extra.songs.length} 首，补全 +${result.addedSongs} 曲 / +${result.addedCharts} 谱`);
		return result;
	} catch (err) {
		console.warn('- maimai: 落雪曲库拉取失败，保持水鱼数据:', err instanceof Error ? err.message : err);
		return { lib, addedSongs: 0, addedCharts: 0, dfOnly: [] as string[], lxnsOnly: [] as string[] };
	}
}

async function mergeChuniLxns(lib: SongLibrary) {
	try {
		const lxnsSongs = await lxnsChuniSongList();
		const extra = normalizeLxnsChunithm(lxnsSongs);
		const result = mergeSongLibrary(lib, extra);
		console.log(`- chunithm: 落雪曲库 ${extra.songs.length} 首，补全 +${result.addedSongs} 曲 / +${result.addedCharts} 谱`);
		return { ...result, lib: applyChuniVersions(result.lib, lxnsSongs) };
	} catch (err) {
		console.warn('- chunithm: 落雪曲库拉取失败，保持水鱼数据:', err instanceof Error ? err.message : err);
		return { lib, addedSongs: 0, addedCharts: 0, dfOnly: [] as string[], lxnsOnly: [] as string[] };
	}
}

function writeCatalogSources(parts: Record<string, { dfOnly: string[]; lxnsOnly: string[] }>): void {
	const target = new URL('catalog-sources.json', REPO_DATA_DIR);
	let prev: Record<string, { dfOnly: string[]; lxnsOnly: string[] }> = {};
	if (existsSync(target)) {
		try {
			prev = JSON.parse(readFileSync(target, 'utf8')) as typeof prev;
		} catch {
			prev = {};
		}
	}
	writeFileSync(target, JSON.stringify({ ...prev, ...parts }, null, '\t') + '\n');
}

async function main(): Promise<void> {
	console.log('[sync-songs] 开始曲库同步');
	await syncDivingFish('maimai', 'maimaidx');
	const maimaiBase = readLibrary('maimaidx');
	const maimai = await mergeMaimaiLxns(maimaiBase);
	writeLibrary('maimaidx', maimai.lib);
	await syncDivingFish('chunithm', 'chunithm');
	const chuniBase = readLibrary('chunithm');
	const chuni = await mergeChuniLxns(chuniBase);
	writeLibrary('chunithm', chuni.lib);
	const sources: Record<string, { dfOnly: string[]; lxnsOnly: string[] }> = {};
	if (!maimaiBase.source.includes('lxns')) {
		sources.maimai = { dfOnly: maimai.dfOnly, lxnsOnly: maimai.lxnsOnly };
	}
	if (!chuniBase.source.includes('lxns')) {
		sources.chunithm = { dfOnly: chuni.dfOnly, lxnsOnly: chuni.lxnsOnly };
	}
	if (Object.keys(sources).length > 0) writeCatalogSources(sources);
	await syncVarchive();
	console.log('[sync-songs] 完成');
}

await main();
