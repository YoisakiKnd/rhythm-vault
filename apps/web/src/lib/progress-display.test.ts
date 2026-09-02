import { describe, expect, test } from 'bun:test';
import { completionPct, progressStack } from './progress-display';

describe('progressStack', () => {
	test('理论 ⊂ FC ⊂ 已游玩', () => {
		const parts = progressStack({ total: 100, played: 80, fc: 40, pp: 10 });
		expect(parts.map((p) => p.n)).toEqual([10, 30, 40, 20]);
		expect(parts.reduce((s, p) => s + p.pct, 0)).toBeCloseTo(100);
	});
	test('FC 超过已游玩时夹紧', () => {
		expect(progressStack({ total: 10, played: 4, fc: 9, pp: 9 }).map((p) => p.n)).toEqual([
			4, 0, 0, 6
		]);
	});
	test('空曲库', () => {
		expect(progressStack({ total: 0, played: 0, fc: 0, pp: 0 }).at(-1)?.pct).toBe(100);
	});
});

describe('completionPct', () => {
	test('一位小数', () => {
		expect(completionPct(1, 3)).toBe(33.3);
		expect(completionPct(0, 0)).toBe(0);
	});
});
