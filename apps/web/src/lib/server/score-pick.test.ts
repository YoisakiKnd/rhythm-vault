import { describe, expect, test } from 'bun:test';
import { pickMaimaiB50FromRows } from './score-pick';

describe('pickMaimaiB50FromRows', () => {
	test('按 rating 取旧 35 + 新 15，总分累加库存 rating', () => {
		const at = new Date('2026-01-01T00:00:00Z');
		const rows = [
			...Array.from({ length: 40 }, (_, i) => ({
				chartKey: `maimaidx:old:${i}`,
				score: 100,
				rating: 10 + i,
				isNew: false,
				updatedAt: at
			})),
			...Array.from({ length: 20 }, (_, i) => ({
				chartKey: `maimaidx:new:${i}`,
				score: 100,
				rating: 20 + i,
				isNew: true,
				updatedAt: at
			}))
		];
		const b50 = pickMaimaiB50FromRows(rows);
		expect(b50.oldBest).toHaveLength(35);
		expect(b50.newBest).toHaveLength(15);
		expect(b50.oldBest[0]?.rating).toBe(49);
		expect(b50.newBest[0]?.rating).toBe(39);
		expect(b50.rating).toBe(
			b50.oldBest.reduce((s, r) => s + (r.rating ?? 0), 0) +
				b50.newBest.reduce((s, r) => s + (r.rating ?? 0), 0)
		);
	});

	test('忽略 rating 为 null 的行', () => {
		const at = new Date();
		const b50 = pickMaimaiB50FromRows([
			{ chartKey: 'a', score: 100, rating: null, isNew: false, updatedAt: at },
			{ chartKey: 'b', score: 100, rating: 12, isNew: false, updatedAt: at }
		]);
		expect(b50.oldBest.map((r) => r.chartKey)).toEqual(['b']);
	});
});
