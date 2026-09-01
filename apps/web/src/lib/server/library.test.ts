import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import {
	chunithmJacketId,
	getLibrary,
	getSongCatalog,
	libraryFilterOptions,
	numericSongId,
	queryLibrary,
	scoreChartKey
} from './library';

/** 曲库 JSON 不进 git；CI 无 sync:songs 产物时跳过依赖曲库的用例 */
const HAS_CATALOG = existsSync(join(import.meta.dir, '../../../../../packages/data/maimaidx.json'));

describe.skipIf(!HAS_CATALOG)('queryLibrary', () => {
	test('按曲名或数字 ID 搜索', () => {
		const byTitle = queryLibrary('maimai', { q: 'True Love Song', per: 10 });
		expect(byTitle.total).toBeGreaterThan(0);
		expect(byTitle.rows.some((r) => r.title.includes('True Love Song'))).toBe(true);

		const byId = queryLibrary('maimai', { q: '100018', per: 10 });
		expect(byId.rows.some((r) => r.numericId === '100018')).toBe(true);
	});

	test('宴谱单独过滤，不混进 Basic', () => {
		const utage = queryLibrary('maimai', { diff: 'UTAGE', per: 100 });
		expect(utage.total).toBeGreaterThan(0);
		expect(utage.rows.every((r) => Number(r.numericId) >= 100000)).toBe(true);
		expect(utage.rows.every((r) => r.charts.every((c) => c.diffKey === 'UTAGE'))).toBe(true);

		const basic = queryLibrary('maimai', { diff: 'BASIC', per: 20 });
		expect(basic.rows.every((r) => Number(r.numericId) < 100000)).toBe(true);
	});

	test('谱面与等级可多选（并集）', () => {
		const both = queryLibrary('maimai', { diff: 'MASTER,EXPERT', per: 30 });
		expect(both.total).toBeGreaterThan(0);
		expect(
			both.rows.every((r) => r.charts.some((c) => c.diffKey === 'MASTER' || c.diffKey === 'EXPERT'))
		).toBe(true);
		const levels = queryLibrary('maimai', { level: '13,14', per: 20 });
		expect(levels.total).toBeGreaterThan(0);
		expect(levels.rows.every((r) => r.charts.some((c) => c.label === '13' || c.label === '14'))).toBe(
			true
		);
	});

	test('中二 WE 单独过滤，等级列表不含汉字', () => {
		const we = queryLibrary('chunithm', { diff: 'WORLDS_END', per: 20 });
		expect(we.total).toBeGreaterThan(0);
		expect(we.rows.every((r) => r.charts.every((c) => c.diffKey === 'WORLDS_END'))).toBe(true);

		const opts = libraryFilterOptions('chunithm');
		expect(opts.levels.every((lv) => /^\d+\+?$/.test(lv))).toBe(true);
		expect(opts.diffs.some((d) => d.key === 'WORLDS_END')).toBe(true);
	});

	test('舞萌等级按钮不含宴谱问号标级', () => {
		const opts = libraryFilterOptions('maimai');
		expect(opts.levels.some((lv) => lv.includes('?'))).toBe(false);
		expect(opts.diffs.some((d) => d.key === 'UTAGE')).toBe(true);
	});

	test('DJMAX 可按 DLC 过滤', () => {
		const opts = libraryFilterOptions('djmax');
		expect(opts.dlcs?.length).toBeGreaterThan(10);
		const respect = queryLibrary('djmax', { diff: '4B', dlcs: ['R'], per: 20 });
		expect(respect.total).toBeGreaterThan(0);
		expect(respect.rows.every((r) => r.category === 'RESPECT')).toBe(true);
	});

	test('中二落雪源含落雪独有曲，水鱼源不含', () => {
		const lx = queryLibrary('chunithm', { src: 'lxns', q: '月光', per: 10 });
		expect(lx.rows.some((r) => r.numericId === '2740')).toBe(true);
		const df = queryLibrary('chunithm', { src: 'df', q: '月光', per: 10 });
		expect(df.rows.some((r) => r.numericId === '2740')).toBe(false);
	});
});

describe.skipIf(!HAS_CATALOG)('getSongCatalog', () => {
	test('舞萌整曲含谱面与 chartKey', () => {
		const s = getSongCatalog('maimai', '8');
		expect(s?.title).toBe('True Love Song');
		expect(s?.chartType).toBe('standard');
		expect(s?.versionTitle).toBe('maimai');
		expect(s?.charts.map((c) => c.chartKey)).toEqual([
			'maimaidx:8:0',
			'maimaidx:8:1',
			'maimaidx:8:2',
			'maimaidx:8:3'
		]);
		expect(s?.charts[3]?.diffKey).toBe('MASTER');
	});

	test('宴谱标记为宴', () => {
		const s = getSongCatalog('maimai', '100018');
		expect(s?.chartType).toBe('utage');
		expect(s?.charts.every((c) => c.diffKey === 'UTAGE')).toBe(true);
	});

	test('不存在的曲目返回 null', () => {
		expect(getSongCatalog('maimai', '99999999')).toBeNull();
	});

	test('中二落雪独有曲可查', () => {
		const s = getSongCatalog('chunithm', '2740');
		expect(s?.title).toContain('月光');
		expect(s?.charts.length).toBeGreaterThan(0);
		expect(s?.charts[0]?.chartKey.startsWith('chunithm:2740:')).toBe(true);
	});

	test('DJMAX 含多键位与曲包', () => {
		const s = getSongCatalog('djmax', '42');
		expect(s?.title).toBe('v o l d e n u i t');
		expect(s?.dlcName).toBe('RESPECT');
		expect(s?.charts.some((c) => c.chartKey === 'djmax:4B:42:NM')).toBe(true);
		expect(new Set(s?.charts.map((c) => c.button))).toEqual(new Set([4, 5, 6, 8]));
	});

	test('中二 WE 的 chartKey 是 :5 而不是数组下标', () => {
		const lib = queryLibrary('chunithm', { diff: 'WORLDS_END', per: 5 });
		expect(lib.rows.length).toBeGreaterThan(0);
		const s = getSongCatalog('chunithm', lib.rows[0].numericId);
		expect(s).not.toBeNull();
		expect(s!.charts.length).toBeGreaterThan(0);
		expect(s!.charts.every((c) => c.diffKey === 'WORLDS_END' && c.chartKey.endsWith(':5'))).toBe(true);
	});
});

describe.skipIf(!HAS_CATALOG)('chartKey 交叉校验', () => {
	test('曲库每一张谱面经 scoreChartKey 得到的键与 core 入口一致且唯一', () => {
		for (const game of ['maimai', 'chunithm', 'djmax'] as const) {
			const lib = getLibrary(game);
			const keys = new Set<string>();
			let lastSongId = '';
			let idx = 0;
			for (const c of lib.charts) {
				if (c.songId !== lastSongId) {
					lastSongId = c.songId;
					idx = 0;
				}
				const key = scoreChartKey(game, numericSongId(c.songId), c, idx);
				expect(key).toBeTruthy();
				keys.add(key);
				idx++;
			}
			expect(keys.size).toBe(lib.charts.length);
		}
	});
});

describe.skipIf(!HAS_CATALOG)('chunithmJacketId', () => {
	test('WE 谱用 originId 取图，普通曲仍用自身 ID', () => {
		expect(chunithmJacketId('8000')).toBe('163');
		expect(chunithmJacketId('3')).toBe('3');
	});
});
