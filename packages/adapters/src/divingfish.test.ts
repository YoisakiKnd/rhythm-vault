import { describe, expect, test } from 'bun:test';
import { UpstreamError } from './oauth';
import { unpackDivingFishPlayerRecords, unpackDivingFishQueryPlayer } from './divingfish';

describe('unpackDivingFishPlayerRecords', () => {
	test('maimai 取 body.records 数组', () => {
		const rows = unpackDivingFishPlayerRecords('maimai', {
			username: 'alice',
			rating: 15000,
			records: [
				{ id: 8, level_index: 3, achievements: 100.5 },
				{ id: 9, level_index: 2, achievements: 99.1 }
			]
		});
		expect(rows).toHaveLength(2);
		expect(rows[0].id).toBe(8);
	});

	test('chunithm 取 body.records.best，忽略 r10', () => {
		const rows = unpackDivingFishPlayerRecords('chunithm', {
			username: 'alice',
			records: {
				best: [{ id: 3, level_index: 3, score: 1009000 }],
				r10: [{ id: 99, level_index: 4, score: 1010000 }]
			}
		});
		expect(rows).toHaveLength(1);
		expect(rows[0].id).toBe(3);
	});

	test('把整个响应当数组会抛明确错误（旧 bug）', () => {
		expect(() => unpackDivingFishPlayerRecords('maimai', [{ id: 1 }])).toThrow(UpstreamError);
		expect(() =>
			unpackDivingFishPlayerRecords('chunithm', { records: [{ id: 1 }] })
		).toThrow(UpstreamError);
	});
});

describe('unpackDivingFishQueryPlayer', () => {
	test('maimai records 是数组', () => {
		const rows = unpackDivingFishQueryPlayer('maimai', {
			records: [{ id: 1145, level_index: 3, achievements: 100.5 }]
		});
		expect(rows).toHaveLength(1);
		expect(rows[0].id).toBe(1145);
	});

	test('maimai 实际响应是 charts.sd + charts.dx', () => {
		const rows = unpackDivingFishQueryPlayer('maimai', {
			username: 'alice',
			rating: 15000,
			charts: {
				sd: [{ song_id: 8, level_index: 3, achievements: 100.5 }],
				dx: [{ song_id: 10008, level_index: 3, achievements: 99 }]
			}
		});
		expect(rows.map((r) => r.song_id)).toEqual([8, 10008]);
	});

	test('maimai 空 charts 视为 0 条', () => {
		expect(unpackDivingFishQueryPlayer('maimai', { charts: { sd: [], dx: [] } })).toEqual([]);
	});

	test('maimai 既无 charts 也无 records 抛错', () => {
		expect(() => unpackDivingFishQueryPlayer('maimai', { username: 'alice' })).toThrow(UpstreamError);
	});

	test('chunithm 合并 b30 + n20，忽略 r10', () => {
		const rows = unpackDivingFishQueryPlayer('chunithm', {
			nickname: 'bob',
			records: {
				b30: [{ id: 1, level_index: 3, score: 1009000 }],
				n20: [{ id: 2, level_index: 4, score: 1010000 }],
				r10: [{ id: 3, level_index: 3, score: 900000 }]
			}
		});
		expect(rows.map((r) => r.id)).toEqual([1, 2]);
	});

	test('chunithm 把 records 当数组会抛错（旧 bug）', () => {
		expect(() =>
			unpackDivingFishQueryPlayer('chunithm', { records: [{ id: 1, level_index: 3, score: 100 }] })
		).toThrow(UpstreamError);
	});
});
