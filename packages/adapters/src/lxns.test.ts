import { describe, expect, test } from 'bun:test';
import {
	lxnsArray,
	lxnsChuniBests,
	lxnsChunithmPlayerBests,
	lxnsChunithmScores,
	lxnsFriendCode,
	lxnsMaimaiBests,
	lxnsMaimaiPlayerBests,
	lxnsMaimaiScores,
	lxnsPlayerName
} from './lxns';

describe('lxnsArray', () => {
	test('裸数组', () => {
		expect(lxnsArray([{ id: 1 }, { id: 2 }])).toHaveLength(2);
	});

	test('{ data: [] }', () => {
		expect(lxnsArray({ data: [{ id: 1 }] })).toEqual([{ id: 1 }]);
	});

	test('{ scores: [] }', () => {
		expect(lxnsArray({ scores: [{ id: 3 }] })).toEqual([{ id: 3 }]);
	});

	test('空或无效', () => {
		expect(lxnsArray(null)).toEqual([]);
		expect(lxnsArray({})).toEqual([]);
		expect(lxnsArray('x')).toEqual([]);
	});
});

describe('lxnsFriendCode', () => {
	test('从 data.friend_code 读取', () => {
		expect(lxnsFriendCode({ data: { friend_code: 123456789000000 } })).toBe('123456789000000');
	});

	test('无效值', () => {
		expect(lxnsFriendCode(null)).toBeNull();
		expect(lxnsFriendCode({ friend_code: 'abc' })).toBeNull();
	});
});

describe('lxnsMaimaiBests / lxnsChuniBests', () => {
	test('合并 standard + dx', () => {
		const rows = lxnsMaimaiBests({
			data: {
				standard: [{ id: 1, type: 'standard' }],
				dx: [{ id: 2, type: 'dx' }]
			}
		});
		expect(rows).toHaveLength(2);
	});

	test('合并 bests + new_bests', () => {
		const rows = lxnsChuniBests({
			data: {
				bests: [{ id: 1 }],
				new_bests: [{ id: 2 }]
			}
		});
		expect(rows.map((r) => r.id)).toEqual([1, 2]);
	});
});

describe('lxnsPlayerName', () => {
	test('从 data.name 读取', () => {
		expect(lxnsPlayerName({ data: { name: ' 喵  ' } })).toBe('喵');
		expect(lxnsPlayerName({ name: '' })).toBeNull();
	});
});

describe('未建档 404', () => {
	test('个人成绩 API 404 视为空列表', async () => {
		const orig = globalThis.fetch;
		globalThis.fetch = (async () => new Response('not found', { status: 404 })) as typeof fetch;
		try {
			expect(await lxnsMaimaiScores('tok')).toEqual([]);
			expect(await lxnsChunithmScores('tok')).toEqual([]);
		} finally {
			globalThis.fetch = orig;
		}
	});

	test('开发者 bests 404 视为空列表', async () => {
		const orig = globalThis.fetch;
		globalThis.fetch = (async () => new Response('not found', { status: 404 })) as typeof fetch;
		try {
			expect(await lxnsMaimaiPlayerBests('123', 'dev')).toEqual([]);
			expect(await lxnsChunithmPlayerBests('123', 'dev')).toEqual([]);
		} finally {
			globalThis.fetch = orig;
		}
	});
});
