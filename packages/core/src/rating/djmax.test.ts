import { describe, expect, test } from 'bun:test';
import {
	computeDjmaxB100,
	diffCoeff,
	djmaxClassLabel,
	djmaxTier,
	djpowerOf,
	djpowerPp,
	scoreToDjpowerWeight,
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
	test('djmaxClassLabel 与游戏内 I–IV 一致', () => {
		expect(djmaxClassLabel(6800)).toBe('MIDDLEMAN I');
		expect(djmaxClassLabel(6600)).toBe('MIDDLEMAN II');
		expect(djmaxClassLabel(6400)).toBe('MIDDLEMAN III');
		expect(djmaxClassLabel(6200)).toBe('MIDDLEMAN IV');
		expect(djmaxClassLabel(8000)).toBe('HIGH CLASS III');
		expect(djmaxClassLabel(8400)).toBe('HIGH CLASS I');
		expect(djmaxClassLabel(6000)).toBe('STREET DJ I');
		expect(djmaxClassLabel(7000)).toBe('PRO DJ IV');
		expect(djmaxClassLabel(9000)).toBe('TREND SETTER IV');
		expect(djmaxClassLabel(9980)).toBe('THE LORD OF DJMAX');
		expect(djmaxClassLabel(100)).toBe('BEGINNER');
	});

	test('floorTo4', () => {
		expect(floorTo4(123.45678)).toBe(123.4567);
		expect(floorTo4(0.00001)).toBe(0);
	});
});

describe('djpowerOf / scoreToDjpowerWeight', () => {
	test('低于 90 为 0，PP 为满值', () => {
		expect(djpowerOf(89.99, 60)).toBe(0);
		expect(djpowerOf(100, 60.03)).toBe(60.03);
	});

	test('社区锚点权重', () => {
		expect(scoreToDjpowerWeight(96)).toBeCloseTo(0.4, 5);
		expect(scoreToDjpowerWeight(98)).toBeCloseTo(0.83, 5);
		expect(scoreToDjpowerWeight(99)).toBeCloseTo(0.935, 5);
		expect(djpowerOf(98, 60.03)).toBeCloseTo(floorTo4(60.03 * 0.83), 5);
	});
});
