import { describe, expect, test } from 'bun:test';
import {
	chuniRank,
	comboTag,
	compactRating,
	compactScore,
	diffAccent,
	diffKeyFromChartKey,
	djmaxBadgeText,
	djmaxClassLabel,
	djmaxFloorHot,
	djmaxFloorLabel,
	djmaxPatternStyle,
	maimaiRank,
	rankColor,
	ratingAccentColor,
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
		expect(compactScore(99.12, 'v')).toBe('99.12%');
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

describe('djmax floor / pattern', () => {
	test('优先用 floorName，否则从等级抠数字', () => {
		expect(djmaxFloorLabel('14.2', 'SC14')).toBe('14.2');
		expect(djmaxFloorLabel(undefined, 'SC12')).toBe('12');
		expect(djmaxFloorLabel('', '8')).toBe('8');
	});
	test('층 ≥ 15 标红', () => {
		expect(djmaxFloorHot('15')).toBe(true);
		expect(djmaxFloorHot('15.2')).toBe(true);
		expect(djmaxFloorHot('14.9')).toBe(false);
	});
	test('SC 紫 MX 红', () => {
		expect(djmaxPatternStyle('SC').bg).toBe('#7c3aed');
		expect(djmaxPatternStyle('MX').bg).toBe('#dc2626');
	});
	test('徽章是 SC14 / MX15', () => {
		expect(djmaxBadgeText('SC', 'SC14')).toBe('SC14');
		expect(djmaxBadgeText('MX', '15')).toBe('MX15');
		expect(djmaxBadgeText('NM', '4')).toBe('NM4');
	});
});

describe('maimai / chuni share ranks', () => {
	test('达成率档位', () => {
		expect(maimaiRank(100.5)).toBe('SSS+');
		expect(maimaiRank(100)).toBe('SSS');
		expect(maimaiRank(99.5)).toBe('SS+');
		expect(maimaiRank(97)).toBe('S');
	});
	test('中二分数档位', () => {
		expect(chuniRank(1009000)).toBe('SSS+');
		expect(chuniRank(1000000)).toBe('SS');
		expect(chuniRank(975000)).toBe('S');
	});
	test('AP/FC 缩写与颜色', () => {
		expect(comboTag('app')).toBe('AP+');
		expect(comboTag('fc')).toBe('FC');
		expect(comboTag('ajc')).toBe('AJC');
		expect(rankColor('SSS+')).toBe('#b45309');
	});
});

describe('ratingAccentColor', () => {
	test('舞萌 DX 段位色', () => {
		expect(ratingAccentColor('maimai', 15100)).toBe('#db2777');
		expect(ratingAccentColor('maimai', 14500)).toBe('#0891b2');
		expect(ratingAccentColor('maimai', 10000)).toBe('#9333ea');
		expect(ratingAccentColor('maimai', 500)).toBe('#78716c');
	});
	test('中二段位色', () => {
		expect(ratingAccentColor('chunithm', 16.2)).toBe('#db2777');
		expect(ratingAccentColor('chunithm', 8)).toBe('#dc2626');
		expect(ratingAccentColor('chunithm', 3)).toBe('#16a34a');
	});
	test('DJ CLASS 徽章色', () => {
		expect(ratingAccentColor('djmax', 9990)).toBe('#b691c1');
		expect(ratingAccentColor('djmax', 8000)).toBe('#d6d42a');
		expect(ratingAccentColor('djmax', 6800)).toBe('#6ed254');
		expect(ratingAccentColor('djmax', 7000)).toBe('#acd708');
		expect(ratingAccentColor('djmax', 5200)).toBe('#62d3ab');
		expect(ratingAccentColor('djmax', 100)).toBe('#9aa3a8');
	});
	test('DJ CLASS 文案', () => {
		expect(djmaxClassLabel(6800)).toBe('MIDDLEMAN I');
		expect(djmaxClassLabel(8000)).toBe('HIGH CLASS III');
	});
});
