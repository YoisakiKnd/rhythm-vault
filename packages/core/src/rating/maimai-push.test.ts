import { describe, expect, test } from 'bun:test';
import { pushSuggestions, type PushChart } from './maimai-push';

const charts: PushChart[] = [
	// 已游玩：提升空间大（当前成绩低、定数高）
	{ chartId: 'a', ds: 14.5, isNew: false, achievement: 95.0 },
	// 已游玩：接近上限（100.5 已接近），提升空间小
	{ chartId: 'b', ds: 13.0, isNew: false, achievement: 100.4 },
	// 已游玩：已达 SSS+，无提升空间
	{ chartId: 'c', ds: 12.0, isNew: false, achievement: 100.5 },
	// 未游玩：高定数，容易超 b50 末位
	{ chartId: 'd', ds: 14.0, isNew: true },
	// 未游玩：低定数，任何档位都进不了 b50
	{ chartId: 'e', ds: 9.0, isNew: false }
];

// b50 末位假设为 240
describe('pushSuggestions', () => {
	const { improve, unplayed } = pushSuggestions(charts, 240, { limit: 10 });

	test('improve：只含有提升空间的已游玩曲目，按增量降序', () => {
		expect(improve.map((s) => s.chartId)).toEqual(['b', 'a']);
		// b：ds13.0 @100.40 → 当前 281，唯一更高档 100.5 → 292（增量 11 > a）
		expect(improve[0]).toMatchObject({
			chartId: 'b',
			currentRating: 281,
			target: 100.5,
			targetRating: 292,
			gain: 11
		});
		// a：ds14.5 @95.00 → 当前 231，最宽松可行档 96（系数未变，靠达成率提升）→ 233
		expect(improve[1]).toMatchObject({
			chartId: 'a',
			currentRating: 231,
			target: 96,
			targetRating: 233,
			gain: 2
		});
	});

	test('unplayed：只含有可超 b50 末位的曲目，目标档位可行', () => {
		expect(unplayed.map((s) => s.chartId)).toEqual(['d']);
		const d = unplayed[0];
		expect(d.targetRating).toBeGreaterThan(240);
		expect(d.gain).toBe(d.targetRating - 240);
	});

	test('limit 生效', () => {
		const many: PushChart[] = Array.from({ length: 30 }, (_, i) => ({
			chartId: `x${i}`,
			ds: 13.5,
			isNew: false,
			achievement: 95
		}));
		const res = pushSuggestions(many, 9999, { limit: 5 });
		expect(res.improve).toHaveLength(5);
	});
});
