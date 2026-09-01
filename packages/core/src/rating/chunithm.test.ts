import { describe, expect, test } from 'bun:test';
import { chuniRatingOf, computeChuniRating, type ChuniScore } from './chunithm';

describe('chuniRatingOf（与水鱼 raCalculate 一致）', () => {
	test('档位锚点', () => {
		expect(chuniRatingOf(15.0, 1009000)).toBe(17.15); // SSS+: ds+2.15
		expect(chuniRatingOf(15.0, 1010000)).toBe(17.15); // 封顶同 SSS+
		expect(chuniRatingOf(14.0, 1007500)).toBe(16.0); // SSS 门槛: ds+2
		expect(chuniRatingOf(14.0, 1007600)).toBe(16.01); // 每 100 分 +0.01
		expect(chuniRatingOf(14.0, 1008600)).toBe(16.11); // (1008600-1007500)/100 → ⌊11⌋ → +0.11
		expect(chuniRatingOf(14.0, 1005000)).toBe(15.5); // SS+: ds+1.5
		expect(chuniRatingOf(14.0, 1005500)).toBe(15.6); // ⌊500/500⌋=1 → +0.1
		expect(chuniRatingOf(14.0, 1000000)).toBe(15.0); // SS: ds+1
		expect(chuniRatingOf(13.5, 975000)).toBe(13.5); // S: ds
		expect(chuniRatingOf(13.5, 975100)).toBe(13.5); // ⌊100/2500⌋=0
		expect(chuniRatingOf(13.5, 1000000)).toBe(14.5); // SS: ds+1
		expect(chuniRatingOf(13.5, 925000)).toBe(10.5); // ds-3
		expect(chuniRatingOf(13.5, 900000)).toBe(8.5); // ds-5
		expect(chuniRatingOf(13.0, 800000)).toBe(4.0); // (ds-5)/2
		expect(chuniRatingOf(13.0, 799999)).toBe(0);
	});
});

describe('computeChuniRating', () => {
	const scores: ChuniScore[] = [
		...Array.from({ length: 35 }, (_, i) => ({
			chartId: `old-${i}`,
			ds: 13 + i * 0.05,
			isNew: false,
			score: 1010000 - i * 1000
		})),
		...Array.from({ length: 25 }, (_, i) => ({
			chartId: `new-${i}`,
			ds: 13.5 + i * 0.05,
			isNew: true,
			score: 1010000 - i * 1000
		}))
	];

	test('旧曲取 30、新曲取 20', () => {
		const res = computeChuniRating(scores);
		expect(res.oldBest).toHaveLength(30);
		expect(res.newBest).toHaveLength(20);
		expect(res.oldBest.every((r) => !r.isNew)).toBe(true);
		expect(res.newBest.every((r) => r.isNew)).toBe(true);
		// 定数与分数更高的曲目排前
		expect(res.oldBest[0].rating).toBeGreaterThanOrEqual(res.oldBest[1].rating);
	});

	test('rating 为 best 50 的平均值（2 位小数向下取整）', () => {
		const res = computeChuniRating(scores);
		const sum = [...res.oldBest, ...res.newBest].reduce((s, r) => s + r.rating, 0);
		expect(res.rating).toBe(Math.floor((sum / 50) * 100) / 100);
	});

	test('低分曲目 rating 为 0 且会被自然淘汰出 best', () => {
		const res = computeChuniRating([
			{ chartId: 'low', ds: 13.0, isNew: false, score: 700000 },
			...Array.from({ length: 30 }, (_, i) => ({
				chartId: `o${i}`,
				ds: 12,
				isNew: false,
				score: 1010000
			}))
		]);
		expect(res.oldBest).toHaveLength(30);
		expect(res.oldBest.some((r) => r.chartId === 'low')).toBe(false);
	});

	test('同一 chartId 只保留最高分，不占多个 b30 名额', () => {
		const res = computeChuniRating([
			{ chartId: 'dup', ds: 15, isNew: false, score: 1000000 },
			{ chartId: 'dup', ds: 15, isNew: false, score: 1010000 },
			...Array.from({ length: 29 }, (_, i) => ({
				chartId: `o${i}`,
				ds: 12,
				isNew: false,
				score: 1010000
			}))
		]);
		expect(res.oldBest.filter((r) => r.chartId === 'dup')).toHaveLength(1);
		expect(res.oldBest.find((r) => r.chartId === 'dup')?.score).toBe(1010000);
		expect(res.oldBest).toHaveLength(30);
	});
});
