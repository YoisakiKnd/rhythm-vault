import type { SongLibrary } from '@rhythm-vault/core';

export interface DFChunithmSong {
	id: string | number;
	title?: string;
	/** 定数数组，顺序 basic → advanced → expert → master →(ultima) */
	ds?: number[];
	level?: string[];
	basic_info?: {
		title?: string;
		artist?: string;
		genre?: string;
		bpm?: number;
	};
}

const DIFF_KEYS = ['BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'ULTIMA', 'OTHER'] as const;

// 水鱼 chuni music_data 不含版本/新曲标记；isNew 由 worker 用落雪 song/list 的 version 后处理写入 JSON。
export function normalizeChunithm(data: DFChunithmSong[], source = 'diving-fish'): SongLibrary {
	const songs: SongLibrary['songs'] = [];
	const charts: SongLibrary['charts'] = [];
	let skipped = 0;

	for (const entry of data) {
		const ds = entry.ds;
		if (!ds || ds.length === 0) {
			skipped++;
			continue;
		}
		const songId = `chunithm:${entry.id}`;
		const info = entry.basic_info ?? {};
		songs.push({
			id: songId,
			title: info.title ?? entry.title ?? String(entry.id),
			artist: info.artist,
			genre: info.genre,
			isNew: false
		});
		ds.forEach((dsValue, i) => {
			charts.push({
				songId,
				difficultyKey: DIFF_KEYS[i] === 'OTHER' ? 'WORLDS_END' : (DIFF_KEYS[i] ?? 'OTHER'),
				levelLabel: entry.level?.[i] ?? String(dsValue),
				levelValue: dsValue,
				isNew: false
			});
		});
	}

	if (skipped > 0) console.warn(`[normalize/chunithm] 跳过 ${skipped} 条无定数数据的曲目`);
	return { updatedAt: new Date().toISOString(), source, songs, charts };
}
