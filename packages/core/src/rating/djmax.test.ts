import { describe, expect, test } from 'bun:test';
import {
	computeDjmaxB100,
	diffCoeff,
	djmaxTier,
	djpowerPp,
	floorTo4,
	type DjmaxRecord
} from './djmax';

function rec(partial: Partial<DjmaxRecord>): DjmaxRecord {
	return {
		chartId: '0:NM',
		title: 'test',
		pattern: 'NM',
		level: 10,
		score: 99.0,
		maxCombo: false,
		djpower: 100,
		isNew: false,
		...partial
	};
}

describe('computeDjmaxB100', () => {
	test('组合、归一化与最低分过滤', () => {
		const basic = [
			rec({ chartId: 'b1', djpower: 500, score: 95 }),
			rec({ chartId: 'b2', djpower: 400, score: 96 }),
			rec({ chartId: 'b3', djpower: 999, score: 89.9 }), // < 90 不参与
			rec({ chartId: 'b4', djpower: 100, score: 99 })
		];
		const newScores = [
			rec({ chartId: 'n1', djpower: 300, score: 100, isNew: true }),
			rec({ chartId: 'n2', djpower: 50, score: 91, isNew: true })
		];
		const b100 = computeDjmaxB100(basic, newScores, 2000);
		expect(b100.basic).toHaveLength(3);
		expect(b100.new).toHaveLength(2);
		expect(b100.raw).toBe(1350);
		expect(b100.rating).toBe(6750); // 1350 × 10000 / 2000
	});

	test('超出 10000 封顶', () => {
		const b100 = computeDjmaxB100([rec({ djpower: 2000 })], [], 1000);
		expect(b100.rating).toBe(10000);
	});
});

describe('公式与段位锚点（与 djmax_bests_generate 一致）', () => {
	test('diffCoeff / djpowerPp', () => {
		expect(diffCoeff(15, true)).toBe(44); // (15-8)×2+30
		expect(diffCoeff(8, true)).toBe(30);
		expect(diffCoeff(10, false)).toBe(20);
		expect(djpowerPp(44)).toBeCloseTo(99.99, 5);
	});

	test('djmaxTier', () => {
		expect(djmaxTier(9990)).toEqual({ tier: 'lord', level: 1 });
		expect(djmaxTier(9970)).toEqual({ tier: 'beatmaestro', level: 1 });
		expect(djmaxTier(500)).toEqual({ tier: 'trainee', level: 4 });
		expect(djmaxTier(499)).toEqual({ tier: 'beginner', level: 1 });
	});

	test('floorTo4', () => {
		expect(floorTo4(123.45678)).toBe(123.4567);
		expect(floorTo4(0.00001)).toBe(0);
	});
});
