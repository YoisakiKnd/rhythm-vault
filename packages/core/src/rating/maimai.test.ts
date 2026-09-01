import { describe, expect, test } from 'bun:test';
import { coefficientOf, computeMaimaiB50, maimaiRatingOf } from './maimai';

describe('maimaiRatingOf', () => {
	test('已知锚点值（与水鱼查分器 ra() 输出一致）', () => {
		expect(maimaiRatingOf(14.0, 100.5)).toBe(315);
		expect(maimaiRatingOf(14.0, 101.0)).toBe(315); // 超出 100.5 截断
		expect(maimaiRatingOf(14.0, 100.0)).toBe(302);
		expect(maimaiRatingOf(13.0, 100.0)).toBe(280);
		expect(maimaiRatingOf(12.0, 99.0)).toBe(247);
		expect(maimaiRatingOf(10.0, 97.0)).toBe(194);
		expect(maimaiRatingOf(13.7, 100.5)).toBe(308);
	});

	test('达成率卡线跳档（.9999 边界）', () => {
		expect(maimaiRatingOf(10.0, 96.9999)).toBe(170);
		expect(maimaiRatingOf(10.0, 97.0)).toBe(194);
		expect(maimaiRatingOf(10.0, 79.9999)).toBe(102);
		expect(maimaiRatingOf(10.0, 79.9998)).toBe(95);
	});

	test('零分与低达成率', () => {
		expect(maimaiRatingOf(13.0, 0)).toBe(0);
		expect(maimaiRatingOf(13.0, 50)).toBe(52); // floor(8.0 × 13 × 0.5)
	});
});

describe('coefficientOf', () => {
	test('档位边界', () => {
		expect(coefficientOf(0)).toBe(0);
		expect(coefficientOf(9.9999)).toBe(0);
		expect(coefficientOf(99.0)).toBe(20.8);
		expect(coefficientOf(99.5)).toBe(21.1);
		expect(coefficientOf(100.5)).toBe(22.4);
		expect(coefficientOf(101.0)).toBe(22.4);
	});
});

describe('computeMaimaiB50', () => {
	const scores = [
		...Array.from({ length: 40 }, (_, i) => ({
			chartId: `old-${i}`,
			levelValue: +(10 + i * 0.1).toFixed(1),
			isNew: false,
			achievement: 100.5
		})),
		...Array.from({ length: 18 }, (_, i) => ({
			chartId: `new-${i}`,
			levelValue: +(11 + i * 0.1).toFixed(1),
			isNew: true,
			achievement: 100.5
		}))
	];

	test('旧曲取 35 首、新曲取 15 首', () => {
		const b50 = computeMaimaiB50(scores);
		expect(b50.oldBest).toHaveLength(35);
		expect(b50.newBest).toHaveLength(15);
	});

	test('淘汰定数最低的谱面', () => {
		const b50 = computeMaimaiB50(scores);
		expect(b50.oldBest.some((e) => e.chartId === 'old-4')).toBe(false);
		expect(b50.oldBest.some((e) => e.chartId === 'old-5')).toBe(true);
		expect(b50.oldBest.some((e) => e.chartId === 'old-39')).toBe(true);
		expect(b50.newBest.some((e) => e.chartId === 'new-2')).toBe(false);
		expect(b50.newBest.some((e) => e.chartId === 'new-3')).toBe(true);
	});

	test('rating 总和为保留谱面之和', () => {
		const b50 = computeMaimaiB50(scores);
		const expected =
			b50.oldBest.reduce((s, e) => s + e.rating, 0) +
			b50.newBest.reduce((s, e) => s + e.rating, 0);
		expect(b50.rating).toBe(expected);
	});

	test('同谱面重复成绩取最优', () => {
		const b50 = computeMaimaiB50([
			{ chartId: 'a', levelValue: 13.0, isNew: false, achievement: 99.0 },
			{ chartId: 'a', levelValue: 13.0, isNew: false, achievement: 100.0 },
			{ chartId: 'a', levelValue: 13.0, isNew: false, achievement: 98.0 }
		]);
		expect(b50.oldBest).toHaveLength(1);
		expect(b50.oldBest[0].achievement).toBe(100.0);
		expect(b50.rating).toBe(280);
	});
});
