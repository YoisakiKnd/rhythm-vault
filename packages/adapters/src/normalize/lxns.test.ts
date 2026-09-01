import { describe, expect, test } from 'bun:test';
import { SongLibrarySchema, type SongLibrary } from '@rhythm-vault/core';
import { mergeSongLibrary, normalizeLxnsChunithm, normalizeLxnsMaimai } from './lxns';

describe('normalizeLxnsMaimai', () => {
	test('标准 / DX 拆成两条本站 ID，宴谱单独成曲', () => {
		const lib = normalizeLxnsMaimai(
			[
				{
					id: 30,
					title: 'ネコ日和。',
					artist: 'Kai',
					version: 10000,
					difficulties: {
						standard: [
							{ type: 'standard', difficulty: 0, level: '5', level_value: 5 },
							{ type: 'standard', difficulty: 3, level: '12', level_value: 12.4 }
						],
						dx: [{ type: 'dx', difficulty: 3, level: '12+', level_value: 12.8 }]
					}
				},
				{
					id: 100018,
					title: '[協]Love You',
					version: 24000,
					difficulties: {
						utage: [{ type: 'utage', difficulty: 0, level: '12?', level_value: 0, kanji: '協' }]
					}
				}
			],
			[{ id: 0, title: 'maimai', version: 10000 }, { id: 1, title: 'PRiSM', version: 24000 }]
		);
		expect(lib.songs.map((s) => s.id).sort()).toEqual(['maimaidx:100018', 'maimaidx:10030', 'maimaidx:30']);
		expect(lib.charts.find((c) => c.songId === 'maimaidx:10030')?.difficultyKey).toBe('MASTER');
		expect(lib.charts.find((c) => c.songId === 'maimaidx:100018')?.difficultyKey).toBe('UTAGE');
		expect(lib.songs.find((s) => s.id === 'maimaidx:100018')?.isNew).toBe(true);
		expect(lib.versions?.[0]).toEqual({ code: 10000, title: 'maimai' });
		expect(SongLibrarySchema.safeParse(lib).success).toBe(true);
	});

	test('跳过 disabled 曲目', () => {
		const lib = normalizeLxnsMaimai([
			{
				id: 1,
				title: 'gone',
				disabled: true,
				difficulties: { standard: [{ difficulty: 3, level: '12', level_value: 12 }] }
			},
			{
				id: 2,
				title: 'kept',
				difficulties: { standard: [{ difficulty: 3, level: '12', level_value: 12 }] }
			}
		]);
		expect(lib.songs.map((s) => s.id)).toEqual(['maimaidx:2']);
	});
});

describe('normalizeLxnsChunithm', () => {
	test('WE 用 kanji 作等级、difficultyKey 为 WORLDS_END', () => {
		const lib = normalizeLxnsChunithm([
			{
				id: 3,
				title: 'B.B.K.K.B.K.K.',
				version: 10000,
				difficulties: [
					{ difficulty: 0, level: '3', level_value: 3 },
					{ difficulty: 4, level: '13+', level_value: 13.7 }
				]
			},
			{
				id: 8000,
				title: '幾四音-Ixion-',
				version: 10500,
				difficulties: [{ difficulty: 5, level: '0', level_value: 0, kanji: '止', origin_id: 163 }]
			}
		]);
		expect(lib.charts.find((c) => c.songId === 'chunithm:3' && c.difficultyKey === 'ULTIMA')?.levelValue).toBe(
			13.7
		);
		expect(lib.charts.find((c) => c.songId === 'chunithm:8000')).toMatchObject({
			difficultyKey: 'WORLDS_END',
			levelLabel: '止',
			originId: 163
		});
		expect(SongLibrarySchema.safeParse(lib).success).toBe(true);
	});

	test('isNew 用 versions 数组的最大 version，而不是曲目启发式', () => {
		const lib = normalizeLxnsChunithm(
			[
				{ id: 1, title: 'old', version: 22000, difficulties: [{ difficulty: 3, level: '12', level_value: 12 }] },
				{ id: 2, title: 'new', version: 23000, difficulties: [{ difficulty: 3, level: '13', level_value: 13 }] }
			],
			[{ id: 0, title: 'current', version: 23000 }]
		);
		expect(lib.songs.find((s) => s.id === 'chunithm:1')?.isNew).toBe(false);
		expect(lib.songs.find((s) => s.id === 'chunithm:2')?.isNew).toBe(true);
	});
});

describe('mergeSongLibrary', () => {
	const base: SongLibrary = {
		updatedAt: '2020-01-01T00:00:00.000Z',
		source: 'diving-fish',
		songs: [{ id: 'chunithm:3', title: 'B.B.K.K.B.K.K.', isNew: false }],
		charts: [
			{ songId: 'chunithm:3', difficultyKey: 'MASTER', levelLabel: '12+', levelValue: 12.5, isNew: false }
		]
	};

	test('补上水鱼没有的曲与谱，已有谱不覆盖', () => {
		const extra = normalizeLxnsChunithm([
			{
				id: 3,
				title: 'B.B.K.K.B.K.K.',
				version: 10000,
				difficulties: [
					{ difficulty: 3, level: '12+', level_value: 12.9 },
					{ difficulty: 4, level: '13+', level_value: 13.7 }
				]
			},
			{
				id: 2740,
				title: '月光',
				version: 23000,
				difficulties: [{ difficulty: 3, level: '14+', level_value: 14.8 }]
			}
		]);
		const { lib, addedSongs, addedCharts, dfOnly, lxnsOnly } = mergeSongLibrary(base, extra);
		expect(addedSongs).toBe(1);
		expect(addedCharts).toBe(2);
		expect(lib.source).toBe('diving-fish+lxns');
		expect(lib.songs.some((s) => s.id === 'chunithm:2740')).toBe(true);
		expect(lib.charts.find((c) => c.songId === 'chunithm:3' && c.difficultyKey === 'MASTER')?.levelValue).toBe(
			12.5
		);
		expect(lib.charts.some((c) => c.songId === 'chunithm:3' && c.difficultyKey === 'ULTIMA')).toBe(true);
		expect(lib.songs.find((s) => s.id === 'chunithm:3')?.versionCode).toBe(10000);
		expect(lxnsOnly).toEqual(['chunithm:2740']);
		expect(dfOnly).toEqual([]);
	});

	test('OTHER 与 WORLDS_END 视为同一槽，不重复', () => {
		const weBase: SongLibrary = {
			...base,
			songs: [{ id: 'chunithm:8000', title: '幾四音-Ixion-', isNew: false }],
			charts: [
				{ songId: 'chunithm:8000', difficultyKey: 'OTHER', levelLabel: '止', levelValue: 0, isNew: false }
			]
		};
		const extra = normalizeLxnsChunithm([
			{
				id: 8000,
				title: '幾四音-Ixion-',
				difficulties: [{ difficulty: 5, level: '0', level_value: 0, kanji: '止' }]
			}
		]);
		const { addedCharts, lib } = mergeSongLibrary(weBase, extra);
		expect(addedCharts).toBe(0);
		expect(lib.charts[0]?.originId).toBeUndefined();
	});

	test('已有谱面补上 originId，不覆盖 isNew', () => {
		const weBase: SongLibrary = {
			...base,
			songs: [{ id: 'chunithm:8000', title: '幾四音-Ixion-', isNew: false }],
			charts: [
				{ songId: 'chunithm:8000', difficultyKey: 'WORLDS_END', levelLabel: '止', levelValue: 0, isNew: false }
			]
		};
		const extra = normalizeLxnsChunithm([
			{
				id: 8000,
				title: '幾四音-Ixion-',
				version: 10500,
				difficulties: [{ difficulty: 5, level: '0', level_value: 0, kanji: '止', origin_id: 163 }]
			}
		]);
		const { lib } = mergeSongLibrary(weBase, extra);
		expect(lib.charts[0]?.originId).toBe(163);
		expect(lib.songs[0]?.isNew).toBe(false);
	});
});
