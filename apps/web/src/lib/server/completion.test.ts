import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { collectSheetSlots } from './completion';
import { isDummyChart, isUtageSong, isWorldsEndChart } from './library';

const HAS_CATALOG = existsSync(join(import.meta.dir, '../../../../../packages/data/maimaidx.json'));

describe.skipIf(!HAS_CATALOG)('collectSheetSlots', () => {
	test('默认排除舞萌宴谱', () => {
		const slots = collectSheetSlots('maimai', { level: '13+' });
		expect(slots.length).toBeGreaterThan(0);
		expect(slots.every((s) => !isUtageSong(s.song))).toBe(true);
	});

	test('点名 UTAGE 才收录宴谱', () => {
		const slots = collectSheetSlots('maimai', { diff: 'UTAGE' });
		expect(slots.length).toBeGreaterThan(0);
		expect(slots.every((s) => isUtageSong(s.song))).toBe(true);
	});

	test('默认排除中二 WE 与占位谱', () => {
		const slots = collectSheetSlots('chunithm', { level: '14' });
		expect(slots.length).toBeGreaterThan(0);
		expect(slots.every((s) => !isDummyChart(s.chart) && !isWorldsEndChart(s.chart))).toBe(true);
	});

	test('DJMAX 按键位与 SC 等级标签筛选', () => {
		const slots = collectSheetSlots('djmax', { diff: '4B', pattern: 'SC', level: '12' });
		expect(slots.length).toBeGreaterThan(0);
		expect(slots.every((s) => s.chart.difficultyKey === '4B SC')).toBe(true);
		expect(slots.every((s) => s.chart.levelLabel === 'SC12' || s.chart.levelLabel === '12')).toBe(
			true
		);
	});
});
