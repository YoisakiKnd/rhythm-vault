import { describe, expect, test } from 'bun:test';
import {
	chuniPushSuggestions,
	comfortFromBest50,
	chuniRealisticTarget,
	type ChuniPushBestChart,
	type ChuniPushChart
} from './chunithm-push';

const bestMid: ChuniPushBestChart[] = Array.from({ length: 50 }, (_, i) => ({
	ds: 13.0 + (i % 5) * 0.1,
	score: 1007500,
	rating: 15.0
}));

describe('comfortFromBest50 / realisticTarget', () => {
	test('按 SSS+ 等价定数估范围，并用已 SS 的谱封顶', () => {
		const c = comfortFromBest50(bestMid);
		expect(c).not.toBeNull();
		expect(c!.typicalScore).toBe(1007500);
		expect(c!.dsHi).toBeLessThanOrEqual(13.8);
		expect(c!.dsLo).toBeGreaterThanOrEqual(12.0);
	});

	test('常见分数只上探半档', () => {
		expect(chuniRealisticTarget(1008000, [1009000, 1007500, 1005000, 1000000])).toBe(1009000);
		expect(chuniRealisticTarget(1000000, [1009000, 1007500, 1005000, 1000000])).toBe(1005000);
		expect(chuniRealisticTarget(970000, [1009000, 1007500, 1005000, 1000000, 975000])).toBe(975000);
	});
});

describe('chuniPushSuggestions', () => {
	const charts: ChuniPushChart[] = [
		{ chartId: 'near-sss-plus', ds: 13.0, isNew: false, score: 1008800 },
		{ chartId: 'far-low', ds: 13.0, isNew: false, score: 960000 },
		{ chartId: 'hard-barely', ds: 15.5, isNew: false, score: 920000 },
		{ chartId: 'already-cap', ds: 13.0, isNew: false, score: 1009000 },
		{ chartId: 'unplayed-level', ds: 13.2, isNew: true },
		{ chartId: 'unplayed-hard', ds: 15.8, isNew: false },
		{ chartId: 'unplayed-easy', ds: 9.0, isNew: false }
	];

	const { improve, unplayed, comfort } = chuniPushSuggestions(charts, 15.0, {
		limit: 10,
		best50: bestMid
	});

	test('improve：优先离下一档很近的谱，丢掉远档和越级', () => {
		expect(improve.map((s) => s.chartId)).toEqual(['near-sss-plus']);
		expect(improve[0]).toMatchObject({
			chartId: 'near-sss-plus',
			score: 1008800,
			target: 1009000
		});
		expect(improve[0].effort).toBe(200);
		expect(improve[0].gain).toBeGreaterThan(0);
	});

	test('unplayed：只出接近 best50 定数的谱，不高难度硬塞', () => {
		expect(unplayed.map((s) => s.chartId)).toEqual(['unplayed-level']);
		expect(unplayed[0].target).toBe(1009000);
		expect(unplayed[0].gain).toBeGreaterThan(0);
		expect(comfort?.dsHi).toBeLessThan(15.0);
	});

	test('limit 生效', () => {
		const many: ChuniPushChart[] = Array.from({ length: 30 }, (_, i) => ({
			chartId: `x${i}`,
			ds: 13.1,
			isNew: false,
			score: 1007000
		}));
		const res = chuniPushSuggestions(many, 14.0, { limit: 5, best50: bestMid });
		expect(res.improve).toHaveLength(5);
	});
});
