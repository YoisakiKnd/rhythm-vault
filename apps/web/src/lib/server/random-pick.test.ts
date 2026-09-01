import { describe, expect, test } from 'bun:test';
import { parseRandomQuery, pickRandomCharts } from './random-pick';
import type { LoadedLibrary } from './library';

describe('parseRandomQuery', () => {
	test('拒绝未知游戏与倒置区间', () => {
		expect(parseRandomQuery(new URLSearchParams('game=foo')).ok).toBe(false);
		expect(parseRandomQuery(new URLSearchParams('min=15&max=10')).ok).toBe(false);
	});
	test('解析合法参数', () => {
		const p = parseRandomQuery(new URLSearchParams('game=chunithm&min=13&max=14&new=1&count=5'));
		expect(p.ok).toBe(true);
		if (p.ok) {
			expect(p.query).toEqual({
				game: 'chunithm',
				min: 13,
				max: 14,
				onlyNew: true,
				count: 5
			});
		}
	});
});

describe('pickRandomCharts', () => {
	const lib: LoadedLibrary = {
		songs: [{ id: 'maimaidx:1', title: 'A', artist: 'x', genre: 'POPS', isNew: true }],
		charts: [
			{ songId: 'maimaidx:1', difficultyKey: 'MAS', levelLabel: '13', levelValue: 13, isNew: true },
			{ songId: 'maimaidx:1', difficultyKey: 'EXP', levelLabel: '11', levelValue: 11, isNew: false },
			{ songId: 'maimaidx:1', difficultyKey: 'BAS', levelLabel: '4', levelValue: 4, isNew: false }
		]
	};

	test('定数过滤 + 可注入随机源', () => {
		const picked = pickRandomCharts(lib, { min: 10, max: 14, onlyNew: false, count: 10 }, () => 0);
		expect(picked.candidates).toBe(2);
		expect(picked.results).toHaveLength(2);
		expect(picked.results.every((r) => r.levelValue >= 10)).toBe(true);
	});

	test('仅新曲', () => {
		const picked = pickRandomCharts(lib, { min: 1, max: 16, onlyNew: true, count: 3 }, () => 0);
		expect(picked.candidates).toBe(1);
		expect(picked.results[0]?.isNew).toBe(true);
	});
});
