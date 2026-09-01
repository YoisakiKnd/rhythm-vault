import { describe, expect, test } from 'bun:test';
import { SongLibrarySchema } from '@rhythm-vault/core';
import { normalizeMaimai } from './maimai';
import { normalizeChunithm } from './chunithm';
import { normalizeDjmax } from './djmax';

describe('normalizeMaimai', () => {
	test('真实载荷结构（水鱼 music_data 样本裁剪）', () => {
		const lib = normalizeMaimai([
			{
				id: '8',
				title: 'True Love Song',
				type: 'SD',
				ds: [5.0, 7.2, 10.2, 12.4],
				level: ['5', '7', '10', '12'],
				basic_info: {
					title: 'True Love Song',
					artist: 'Kai',
					genre: '舞萌',
					bpm: 150,
					is_new: false
				}
			},
			{
				id: 1111,
				ds: [6.0, 8.0, 11.0, 13.5, 14.2],
				level: ['6', '8', '11', '13+', '14'],
				basic_info: { title: 'Remaster 曲', is_new: true }
			}
		]);
		expect(lib.songs).toHaveLength(2);
		expect(lib.charts).toHaveLength(9);
		expect(lib.songs[0].id).toBe('maimaidx:8');
		expect(lib.songs[1].isNew).toBe(true);
		const remaster = lib.charts.find((c) => c.songId === 'maimaidx:1111' && c.difficultyKey === 'REMASTER');
		expect(remaster?.levelValue).toBe(14.2);
		expect(SongLibrarySchema.safeParse(lib).success).toBe(true);
	});

	test('宴谱（id≥100000）难度记为 UTAGE，不混进 BASIC', () => {
		const lib = normalizeMaimai([
			{
				id: 100018,
				ds: [12],
				level: ['12?'],
				basic_info: { title: '[協]Love You', genre: '宴会場' }
			}
		]);
		expect(lib.charts).toHaveLength(1);
		expect(lib.charts[0].difficultyKey).toBe('UTAGE');
	});

	test('跳过无定数条目', () => {
		const lib = normalizeMaimai([{ id: 1 }, { id: 2, ds: [5.0], level: ['5'] }]);
		expect(lib.songs).toHaveLength(1);
	});
});

describe('normalizeChunithm', () => {
	test('真实载荷结构（水鱼 chuni music_data 样本裁剪）', () => {
		const lib = normalizeChunithm([
			{
				id: 3,
				title: 'B.B.K.K.B.K.K.',
				ds: [3.0, 5.0, 10.0, 12.5, 13.7],
				level: ['3', '5', '10', '12+', '13+'],
				basic_info: { title: 'B.B.K.K.B.K.K.', artist: 'nora2r', genre: '其他游戏', bpm: 170 }
			}
		]);
		expect(lib.songs).toHaveLength(1);
		expect(lib.charts).toHaveLength(5);
		expect(lib.charts[4]).toMatchObject({ difficultyKey: 'ULTIMA', levelValue: 13.7 });
		expect(SongLibrarySchema.safeParse(lib).success).toBe(true);
	});
});

describe('normalizeDjmax', () => {
	test('真实载荷结构（V-ARCHIVE songs.json 样本裁剪）', () => {
		const lib = normalizeDjmax([
			{
				title: 0,
				name: '비상 ~Stay With Me~',
				composer: 'Mycin.T',
				dlcCode: 'R',
				newTab: false,
				patterns: {
					'4B': {
						NM: { level: 4 },
						HD: { level: 8 },
						SC: { level: 5, floor: 53, floorName: '5.3', rating: 159 }
					},
					'6B': {
						NM: { level: 6 },
						MX: { level: 11 },
						SC: { level: 8, floor: 73, floorName: '7.3', rating: 165 }
					}
				}
			}
		]);
		expect(lib.songs).toHaveLength(1);
		expect(lib.charts).toHaveLength(6);
		const sc4 = lib.charts.find((c) => c.difficultyKey === '4B SC');
		expect(sc4).toMatchObject({ levelLabel: 'SC5', levelValue: 159 });
		const nm4 = lib.charts.find((c) => c.difficultyKey === '4B NM');
		expect(nm4?.levelValue).toBeCloseTo(4 * 2 * 2.22 + 2.31, 5); // PP 公式回退
		expect(SongLibrarySchema.safeParse(lib).success).toBe(true);
	});
});
