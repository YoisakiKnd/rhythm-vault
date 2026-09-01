import { describe, expect, test } from 'bun:test';
import {
	chuniDiffIndex,
	isChuniWorldsEndChartKey,
	scoreChartKey
} from './chart-key';

describe('scoreChartKey', () => {
	test('DJMAX 与 sync 写入格式一致（djmax:4B:42:SC）', () => {
		expect(scoreChartKey('djmax', '42', '4B SC')).toBe('djmax:4B:42:SC');
		expect(scoreChartKey('djmax', '42', '4B SC')).not.toBe('djmax:42:4B SC');
	});

	test('中二 WE 用 level_index 5，不用数组下标 1', () => {
		expect(chuniDiffIndex('WORLDS_END')).toBe(5);
		expect(scoreChartKey('chunithm', '8025', 'BASIC', 0)).toBe('chunithm:8025:0');
		expect(scoreChartKey('chunithm', '8025', 'WORLDS_END', 1)).toBe('chunithm:8025:5');
		expect(isChuniWorldsEndChartKey('chunithm:8025:5')).toBe(true);
		expect(isChuniWorldsEndChartKey('chunithm:8025:1')).toBe(false);
	});

	test('舞萌沿用数组下标', () => {
		expect(scoreChartKey('maimai', '8', 'MASTER', 3)).toBe('maimaidx:8:3');
	});
});
