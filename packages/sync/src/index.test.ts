import { describe, expect, test } from 'bun:test';
import { chuniRows, libraryIsNew, maimaiRows, mergeSyncStats, uniqueIdOrNull } from './index';
import { unpackDivingFishQueryPlayer } from '@rhythm-vault/adapters';

describe('chuniRows', () => {
	test('isNew 与 rating 取自曲库/本地引擎', () => {
		const rows = chuniRows([{ id: 3, level_index: 3, score: 1009000, ra: 1 }]);
		expect(rows).toHaveLength(1);
		expect(rows[0].chartKey).toBe('chunithm:3:3');
		expect(rows[0].isNew).toBe(libraryIsNew('chunithm', 'chunithm:3'));
		expect(rows[0].rating).not.toBe(1);
		expect(rows[0].rating).toBeGreaterThan(0);
	});

	test('写入 fc 徽章', () => {
		const rows = chuniRows([{ id: 3, level_index: 3, score: 1009000, fc: 'ajc' }]);
		expect(rows[0].badges).toEqual({ fc: 'ajc' });
	});

	test('跳过 WORLD\'S END（level_index 5）', () => {
		const rows = chuniRows([
			{ id: 8025, level_index: 5, score: 1009000, ds: 0 },
			{ id: 3, level_index: 3, score: 1009000 }
		]);
		expect(rows.every((r) => r.chartKey !== 'chunithm:8025:5')).toBe(true);
		expect(rows.some((r) => r.chartKey === 'chunithm:3:3')).toBe(true);
	});

	test('契约：query/player 对象解包后再喂给 chuniRows', () => {
		const records = unpackDivingFishQueryPlayer('chunithm', {
			records: {
				b30: [{ id: 3, level_index: 3, score: 1009000 }],
				n20: [{ id: 4, level_index: 4, score: 1010000 }]
			}
		});
		const rows = chuniRows(records);
		expect(rows).toHaveLength(2);
	});

	test('水鱼完整成绩用 mid 而不是 id', () => {
		const rows = chuniRows([{ mid: 3, level_index: 3, score: 1009000 }]);
		expect(rows).toHaveLength(1);
		expect(rows[0].chartKey).toBe('chunithm:3:3');
	});
});

describe('maimaiRows', () => {
	test('水鱼完整成绩用 song_id 而不是 id', () => {
		const rows = maimaiRows([{ song_id: 8, level_index: 3, achievements: 100.5, ds: 13 }]);
		expect(rows).toHaveLength(1);
		expect(rows[0].chartKey).toBe('maimaidx:8:3');
	});

	test('仍接受 id（落雪对齐后的记录）', () => {
		const rows = maimaiRows([{ id: 8, level_index: 3, achievements: 100.5, ds: 13 }]);
		expect(rows[0].chartKey).toBe('maimaidx:8:3');
	});

	test('契约：query/player charts 解包后再喂给 maimaiRows', () => {
		const records = unpackDivingFishQueryPlayer('maimai', {
			charts: {
				sd: [{ song_id: 8, level_index: 3, achievements: 100.5, ds: 13 }],
				dx: [{ song_id: 10008, level_index: 3, achievements: 99, ds: 12 }]
			}
		});
		expect(maimaiRows(records).map((r) => r.chartKey)).toEqual(['maimaidx:8:3', 'maimaidx:10008:3']);
	});
});

describe('uniqueIdOrNull', () => {
	test('同名多候选返回 null，不静默取第一个', () => {
		expect(uniqueIdOrNull(['131'])).toBe('131');
		expect(uniqueIdOrNull(['131', '383'])).toBeNull();
		expect(uniqueIdOrNull([])).toBeNull();
	});
});

describe('mergeSyncStats', () => {
	test('空列表不覆盖已有条数', () => {
		expect(mergeSyncStats({ chunithm: 40 }, 'maimai_dx', 0)).toEqual({
			chunithm: 40,
			maimai_dx: 0
		});
		expect(mergeSyncStats({ maimai_dx: 50 }, 'maimai_dx', 0)).toEqual({ maimai_dx: 50 });
		expect(mergeSyncStats({}, 'chunithm', 0)).toEqual({ chunithm: 0 });
	});
});
