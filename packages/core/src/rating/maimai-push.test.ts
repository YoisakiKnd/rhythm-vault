import { describe, expect, test } from 'bun:test';
import {
	comfortFromB50,
	pushSuggestions,
	realisticTarget,
	type PushB50Chart,
	type PushChart
} from './maimai-push';

const b50Mid: PushB50Chart[] = Array.from({ length: 50 }, (_, i) => ({
	ds: 13.0 + (i % 5) * 0.1,
	achievement: 100,
	rating: 280
}));

describe('comfortFromB50 / realisticTarget', () => {
	test('按 SSS+ 等价定数估范围，并用已 SS 的谱封顶', () => {
		const c = comfortFromB50(b50Mid);
		expect(c).not.toBeNull();
		expect(c!.typicalAch).toBe(100);
		expect(c!.dsHi).toBeLessThanOrEqual(13.8);
		expect(c!.dsLo).toBeGreaterThanOrEqual(12.0);
	});

	test('常见达成率只上探半档', () => {
		expect(realisticTarget(100.2, [100.5, 100, 99.5, 99])).toBe(100.5);
		expect(realisticTarget(99.1, [100.5, 100, 99.5, 99])).toBe(99.5);
		expect(realisticTarget(97.4, [100.5, 100, 99.5, 99, 98, 97])).toBe(97);
	});
});

describe('pushSuggestions', () => {
	const charts: PushChart[] = [
		{ chartId: 'near-sss', ds: 13.0, isNew: false, achievement: 100.4 },
		{ chartId: 'far-low', ds: 13.0, isNew: false, achievement: 95.0 },
		{ chartId: 'hard-barely', ds: 14.8, isNew: false, achievement: 80.0 },
		{ chartId: 'already-cap', ds: 13.0, isNew: false, achievement: 100.5 },
		{ chartId: 'unplayed-level', ds: 13.2, isNew: true },
		{ chartId: 'unplayed-hard', ds: 14.9, isNew: false },
		{ chartId: 'unplayed-easy', ds: 9.0, isNew: false }
	];

	const { improve, unplayed, comfort } = pushSuggestions(charts, 280, {
		limit: 10,
		b50: b50Mid
	});

	test('improve：优先离下一档很近的谱，丢掉远档和越级', () => {
		expect(improve.map((s) => s.chartId)).toEqual(['near-sss']);
		expect(improve[0]).toMatchObject({
			chartId: 'near-sss',
			achievement: 100.4,
			target: 100.5
		});
		expect(improve[0].effort).toBeCloseTo(0.1, 5);
		expect(improve[0].gain).toBeGreaterThan(0);
	});

	test('unplayed：只出接近 B50 定数的谱，不高难度硬塞', () => {
		expect(unplayed.map((s) => s.chartId)).toEqual(['unplayed-level']);
		expect(unplayed[0].target).toBe(100.5);
		expect(unplayed[0].gain).toBeGreaterThan(0);
		expect(comfort?.dsHi).toBeLessThan(14.5);
	});

	test('limit 生效', () => {
		const many: PushChart[] = Array.from({ length: 30 }, (_, i) => ({
			chartId: `x${i}`,
			ds: 13.1,
			isNew: false,
			achievement: 100.3
		}));
		const res = pushSuggestions(many, 200, { limit: 5, b50: b50Mid });
		expect(res.improve).toHaveLength(5);
	});
});
