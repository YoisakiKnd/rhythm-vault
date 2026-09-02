import { describe, expect, test } from 'bun:test';
import {
	compactRating,
	compactScore,
	diffAccent,
	diffKeyFromChartKey,
	scoreToneClass
} from './best-display';

describe('diffKeyFromChartKey', () => {
	test('舞萌 / 中二按末位难度序号', () => {
		expect(diffKeyFromChartKey('maimaidx:1145:3')).toBe('MASTER');
		expect(diffKeyFromChartKey('maimaidx:8:4')).toBe('REMASTER');
		expect(diffKeyFromChartKey('chunithm:3:4')).toBe('ULTIMA');
	});
	test('DJMAX 取 pattern', () => {
		expect(diffKeyFromChartKey('djmax:4B:42:SC')).toBe('SC');
		expect(diffKeyFromChartKey('djmax:8B:1:NM')).toBe('NM');
	});
});

describe('diffAccent / compactScore', () => {
	test('Master 紫色、未知灰色', () => {
		expect(diffAccent('MASTER')).toBe('#a855f7');
		expect(diffAccent('???')).toBe('#64748b');
	});
	test('达成率高分段少位数', () => {
		expect(compactScore(100.5234, 'pct')).toBe('100.5%');
		expect(compactScore(99.1234, 'pct')).toBe('99.12%');
		expect(compactScore(99.12, 'v')).toBe('99.1');
		expect(compactScore(1009000.4, 'score')).toBe('1009000');
		expect(compactScore(null, 'pct')).toBe('—');
	});
	test('舞萌 rating 取整', () => {
		expect(compactRating('maimai', 15001.4)).toBe('15001');
		expect(compactRating('chunithm', 16.5)).toBe('16.50');
	});
	test('理论值高亮', () => {
		expect(scoreToneClass('pct', 100.5)).toContain('amber');
		expect(scoreToneClass('pct', null)).toContain('/35');
	});
});
