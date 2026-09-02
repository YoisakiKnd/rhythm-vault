import { diffCoeff, djpowerPp, type SongLibrary } from '@rhythm-vault/core';
import type { VASongEntry } from '../varchive';

const BMODES = ['4B', '5B', '6B', '8B'] as const;
const PATTERNS = ['NM', 'HD', 'MX', 'SC'] as const;

export function normalizeDjmax(
	data: VASongEntry[],
	dlcs?: Array<{ dlcCode: string; dlcName: string }>
): SongLibrary {
	const dlcName = new Map((dlcs ?? []).map((d) => [d.dlcCode, d.dlcName]));
	const songs: SongLibrary['songs'] = [];
	const charts: SongLibrary['charts'] = [];

	for (const entry of data) {
		const songId = `djmax:${entry.title}`;
		songs.push({
			id: songId,
			title: entry.name,
			artist: entry.composer,
			dlcCode: entry.dlcCode,
			isNew: entry.newTab
		});
		for (const bmode of BMODES) {
			const diffs = entry.patterns[bmode];
			if (!diffs) continue;
			for (const pattern of PATTERNS) {
				const p = diffs[pattern];
				if (!p) continue;
				const floorName =
					p.floorName != null && String(p.floorName).trim() !== ''
						? String(p.floorName)
						: undefined;
				charts.push({
					songId,
					difficultyKey: `${bmode} ${pattern}`,
					levelLabel: pattern === 'SC' ? `SC${p.level}` : String(p.level),
					// 理论 DJPower 优先用上游 rating，缺失时按 PP 公式从等级推
					levelValue: p.rating ?? djpowerPp(diffCoeff(p.level, pattern === 'SC')),
					isNew: entry.newTab,
					...(floorName ? { floorName } : {})
				});
			}
		}
	}

	return {
		updatedAt: new Date().toISOString(),
		source: 'v-archive',
		songs,
		charts,
		...(dlcs ? { dlcs } : {})
	};
}
