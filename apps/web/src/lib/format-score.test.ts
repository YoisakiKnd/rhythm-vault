import { describe, expect, test } from 'bun:test';
import { formatScore, scoreKindOf } from './format-score';

describe('formatScore', () => {
	test('空值为破折号', () => {
		expect(formatScore(null, 'pct')).toBe('—');
	});
	test('达成率四位小数', () => {
		expect(formatScore(100.12345, 'pct')).toBe('100.1235%');
	});
	test('V 值两位小数', () => {
		expect(formatScore(99.1, 'v')).toBe('99.10');
	});
	test('中二分数取整', () => {
		expect(formatScore(1009000.4, 'score')).toBe('1009000');
	});
	test('scoreKindOf', () => {
		expect(scoreKindOf('maimai')).toBe('pct');
		expect(scoreKindOf('chunithm')).toBe('score');
		expect(scoreKindOf('djmax')).toBe('v');
	});
});
