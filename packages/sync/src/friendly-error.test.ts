import { describe, expect, test } from 'bun:test';
import { UpstreamError } from '@rhythm-vault/adapters';
import { friendlySyncError } from './friendly-error';

describe('friendlySyncError', () => {
	test('不把上游原文交给用户', () => {
		expect(friendlySyncError(new UpstreamError('query/player 响应结构不符（records）: x', 502))).toBe(
			'查分器返回的数据异常，请稍后再试。'
		);
		expect(friendlySyncError(new Error('lxns /user/maimai/player/scores 请求失败: 404'))).toContain(
			'找不到'
		);
		expect(friendlySyncError(new Error('totally internal stack'))).toBe('同步失败，请稍后重试');
	});
});
