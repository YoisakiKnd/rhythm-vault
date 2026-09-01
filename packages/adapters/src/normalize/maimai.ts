import type { SongLibrary } from '@rhythm-vault/core';

/** 水鱼 music_data（maimai）单项结构（已用真实载荷校验） */
export interface DFMaimaiSong {
	id: string | number;
	title?: string;
	type?: string;
	/** 定数数组，顺序 basic → advanced → expert → master →(remaster) */
	ds?: number[];
	level?: string[];
	basic_info?: {
		title?: string;
		artist?: string;
		genre?: string;
		bpm?: number;
		release_date?: string;
		is_new?: boolean;
	};
}

const DIFF_KEYS = ['BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'REMASTER', 'UTAGE'] as const;

export function normalizeMaimai(data: DFMaimaiSong[], source = 'diving-fish'): SongLibrary {
	const songs: SongLibrary['songs'] = [];
	const charts: SongLibrary['charts'] = [];
	let skipped = 0;

	for (const entry of data) {
		const ds = entry.ds;
		if (!ds || ds.length === 0) {
			skipped++;
			continue;
		}
		const songId = `maimaidx:${entry.id}`;
		const numericId = Number(entry.id);
		const info = entry.basic_info ?? {};
		const isUtage =
			entry.type === 'utage' ||
			numericId >= 100000 ||
			info.genre === '宴会場';
		songs.push({
			id: songId,
			title: info.title ?? entry.title ?? String(entry.id),
			artist: info.artist,
			genre: info.genre,
			version: info.release_date || undefined,
			isNew: info.is_new === true
		});
		ds.forEach((dsValue, i) => {
			charts.push({
				songId,
				difficultyKey: isUtage ? 'UTAGE' : (DIFF_KEYS[i] ?? 'OTHER'),
				levelLabel: entry.level?.[i] ?? String(dsValue),
				levelValue: dsValue,
				isNew: info.is_new === true
			});
		});
	}

	if (skipped > 0) console.warn(`[normalize/maimai] 跳过 ${skipped} 条无定数数据的曲目`);
	return { updatedAt: new Date().toISOString(), source, songs, charts };
}
