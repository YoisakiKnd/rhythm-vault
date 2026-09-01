import { describe, expect, test } from 'bun:test';
import { finalizeProgressBuckets, snapVersionCode } from './progress';

describe('snapVersionCode', () => {
	const known = [10000, 11000, 12000, 13000];
	test('精确命中', () => {
		expect(snapVersionCode(12000, known)).toBe('12000');
	});
	test('PLUS 码吸附到主版本', () => {
		expect(snapVersionCode(12500, known)).toBe('12000');
	});
	test('低于最小已知码时用最小码', () => {
		expect(snapVersionCode(1, known)).toBe('10000');
	});
	test('空对照表退回原码', () => {
		expect(snapVersionCode(14, [])).toBe('14');
	});
});

describe('finalizeProgressBuckets', () => {
	test('完成度保留一位小数', () => {
		const [b] = finalizeProgressBuckets([
			{ key: '14', label: 'MASTER 14', total: 3, played: 2, fc: 1, pp: 0 }
		]);
		expect(b?.completion).toBe(66.7);
		expect(b?.played).toBe(2);
		expect(b?.fc).toBe(1);
	});
	test('空桶完成度为 0', () => {
		const [b] = finalizeProgressBuckets([
			{ key: 'x', label: 'x', total: 0, played: 0, fc: 0, pp: 0 }
		]);
		expect(b?.completion).toBe(0);
	});
});
