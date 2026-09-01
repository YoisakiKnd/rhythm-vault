import type { SongLibrary } from '@rhythm-vault/core';
import type { LxnsChart, LxnsChuniSong, LxnsMaimaiSong, LxnsVersion } from '../lxns';

const MAIMAI_DIFF = ['BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'REMASTER'] as const;
const CHUNI_DIFF = ['BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'ULTIMA', 'WORLDS_END'] as const;

function maxVersion(songs: Array<{ version?: number }>): number {
	let max = 0;
	for (const s of songs) {
		if (typeof s.version === 'number' && s.version > max) max = s.version;
	}
	return max;
}

function currentVersion(
	songs: Array<{ version?: number }>,
	versions?: LxnsVersion[]
): number {
	if (versions?.length) return Math.max(...versions.map((v) => v.version));
	return maxVersion(songs);
}

function maimaiCharts(
	songId: string,
	diffs: LxnsChart[] | undefined,
	isUtage: boolean,
	current: number,
	songVersion?: number
): SongLibrary['charts'] {
	return (diffs ?? []).map((d) => {
		const chartVersion = d.version ?? songVersion;
		return {
			songId,
			difficultyKey: isUtage ? 'UTAGE' : (MAIMAI_DIFF[d.difficulty] ?? 'OTHER'),
			levelLabel: d.level,
			levelValue: d.level_value,
			isNew: current > 0 && chartVersion === current
		};
	});
}

/**
 * 落雪舞萌曲库 → 本站 SongLibrary。
 * 标准谱用原 ID，DX 谱 +10000（与水鱼 ID 对齐），宴谱保持 ≥100000。
 */
export function normalizeLxnsMaimai(
	songs: LxnsMaimaiSong[],
	versions?: LxnsVersion[]
): SongLibrary {
	const current = currentVersion(songs, versions);
	const outSongs: SongLibrary['songs'] = [];
	const charts: SongLibrary['charts'] = [];

	for (const s of songs) {
		if (s.disabled) continue;
		const diffs = s.difficulties ?? {};
		const meta = {
			title: s.title,
			artist: s.artist,
			genre: s.genre,
			versionCode: s.version
		};

		if (diffs.utage?.length) {
			const songCharts = maimaiCharts(`maimaidx:${s.id}`, diffs.utage, true, current, s.version);
			outSongs.push({ id: `maimaidx:${s.id}`, ...meta, isNew: songCharts.some((c) => c.isNew) });
			charts.push(...songCharts);
			continue;
		}
		if (diffs.standard?.length) {
			const songId = `maimaidx:${s.id}`;
			const songCharts = maimaiCharts(songId, diffs.standard, false, current, s.version);
			outSongs.push({ id: songId, ...meta, isNew: songCharts.some((c) => c.isNew) });
			charts.push(...songCharts);
		}
		if (diffs.dx?.length) {
			const songId = `maimaidx:${s.id + 10000}`;
			const songCharts = maimaiCharts(songId, diffs.dx, false, current, s.version);
			outSongs.push({ id: songId, ...meta, isNew: songCharts.some((c) => c.isNew) });
			charts.push(...songCharts);
		}
	}

	return {
		updatedAt: new Date().toISOString(),
		source: 'lxns',
		songs: outSongs,
		charts,
		...(versions?.length
			? { versions: versions.map((v) => ({ code: v.version, title: v.title })) }
			: {})
	};
}

/** 落雪中二曲库 → 本站 SongLibrary（difficulty 5 = WORLD'S END） */
export function normalizeLxnsChunithm(
	songs: LxnsChuniSong[],
	versions?: LxnsVersion[]
): SongLibrary {
	const current = currentVersion(songs, versions);
	const outSongs: SongLibrary['songs'] = [];
	const charts: SongLibrary['charts'] = [];

	for (const s of songs) {
		if (s.disabled) continue;
		const isNew = current > 0 && s.version === current;
		const songId = `chunithm:${s.id}`;
		outSongs.push({
			id: songId,
			title: s.title,
			artist: s.artist,
			genre: s.genre,
			versionCode: s.version,
			isNew
		});
		for (const d of s.difficulties ?? []) {
			const difficultyKey = CHUNI_DIFF[d.difficulty] ?? 'OTHER';
			charts.push({
				songId,
				difficultyKey,
				levelLabel: d.kanji || d.level,
				levelValue: d.level_value,
				isNew,
				...(typeof d.origin_id === 'number' ? { originId: d.origin_id } : {})
			});
		}
	}

	return { updatedAt: new Date().toISOString(), source: 'lxns', songs: outSongs, charts };
}

function chartSlot(c: SongLibrary['charts'][number]): string {
	const key = c.difficultyKey === 'OTHER' ? 'WORLDS_END' : c.difficultyKey;
	return `${c.songId}:${key}`;
}

function sourceJoin(base: string, extra: string): string {
	if (base.split('+').includes(extra)) return base;
	return `${base}+${extra}`;
}

export interface MergeResult {
	lib: SongLibrary;
	addedSongs: number;
	addedCharts: number;
	dfOnly: string[];
	lxnsOnly: string[];
}

/**
 * 以 base（通常是水鱼）为主，把 extra（落雪）里没有的曲/谱补进去。
 * 已有曲目：水鱼 isNew / 定数胜出，只补 versionCode。新曲沿用落雪 isNew。
 */
export function mergeSongLibrary(base: SongLibrary, extra: SongLibrary): MergeResult {
	const songById = new Map(base.songs.map((s) => [s.id, { ...s }]));
	const baseIds = new Set(base.songs.map((s) => s.id));
	const extraIds = new Set(extra.songs.map((s) => s.id));
	let addedSongs = 0;
	let addedCharts = 0;

	for (const s of extra.songs) {
		const existing = songById.get(s.id);
		if (!existing) {
			songById.set(s.id, { ...s });
			addedSongs++;
			continue;
		}
		if (existing.versionCode == null && s.versionCode != null) {
			existing.versionCode = s.versionCode;
		}
	}

	const versionByTitle = new Map<string, number>();
	for (const s of extra.songs) {
		if (s.versionCode != null && !versionByTitle.has(s.title)) {
			versionByTitle.set(s.title, s.versionCode);
		}
	}
	for (const s of songById.values()) {
		if (s.versionCode == null) {
			const code = versionByTitle.get(s.title);
			if (code != null) s.versionCode = code;
		}
	}

	const chartsBySlot = new Map(base.charts.map((c) => [chartSlot(c), { ...c }]));
	for (const c of extra.charts) {
		if (!songById.has(c.songId)) continue;
		const slot = chartSlot(c);
		const existing = chartsBySlot.get(slot);
		if (!existing) {
			chartsBySlot.set(slot, { ...c });
			addedCharts++;
			continue;
		}
		if (existing.originId == null && c.originId != null) existing.originId = c.originId;
	}

	return {
		lib: {
			...base,
			updatedAt: new Date().toISOString(),
			source: sourceJoin(base.source, extra.source),
			songs: [...songById.values()],
			charts: [...chartsBySlot.values()],
			versions: extra.versions ?? base.versions
		},
		addedSongs,
		addedCharts,
		dfOnly: [...baseIds].filter((id) => !extraIds.has(id)),
		lxnsOnly: [...extraIds].filter((id) => !baseIds.has(id))
	};
}
