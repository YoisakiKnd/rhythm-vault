import { describe, expect, test } from 'bun:test';
import {
	joinCsv,
	libraryFilterParams,
	parseCsvParam,
	specialDiffsOnly,
	toggleCsv
} from './library-query';

describe('parseCsvParam / toggleCsv', () => {
	test('拆分并去空', () => {
		expect(parseCsvParam('MASTER,EXPERT')).toEqual(['MASTER', 'EXPERT']);
		expect(parseCsvParam(' 13, 13+ ,14 ')).toEqual(['13', '13+', '14']);
		expect(parseCsvParam('')).toEqual([]);
		expect(parseCsvParam(null)).toEqual([]);
	});
	test('toggle 增减', () => {
		expect(toggleCsv(['MASTER'], 'EXPERT')).toEqual(['MASTER', 'EXPERT']);
		expect(toggleCsv(['MASTER', 'EXPERT'], 'MASTER')).toEqual(['EXPERT']);
		expect(joinCsv(['MASTER', 'EXPERT'])).toBe('MASTER,EXPERT');
	});
	test('specialDiffsOnly', () => {
		expect(specialDiffsOnly(['UTAGE'])).toBe(true);
		expect(specialDiffsOnly(['UTAGE', 'WORLDS_END'])).toBe(true);
		expect(specialDiffsOnly(['MASTER', 'UTAGE'])).toBe(false);
		expect(specialDiffsOnly([])).toBe(false);
	});
});

describe('libraryFilterParams', () => {
	test('多选写入逗号分隔', () => {
		const p = libraryFilterParams({ diff: 'MASTER,EXPERT', level: '13,14' });
		expect(p.get('diff')).toBe('MASTER,EXPERT');
		expect(p.get('level')).toBe('13,14');
	});
	test('仅宴谱时不带 level', () => {
		const p = libraryFilterParams({ diff: 'UTAGE', level: '14' });
		expect(p.has('level')).toBe(false);
	});
});
