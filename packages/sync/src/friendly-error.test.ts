import { describe, expect, test } from 'bun:test';
import { UpstreamError } from '@rhythm-vault/adapters';
import { assertSafeSyncMessage, friendlySyncError, SYNC_FAILED_GENERIC } from './friendly-error';

describe('friendlySyncError', () => {
	test('不把上游原文交给用户', () => {
		expect(friendlySyncError(new UpstreamError('query/player 响应结构不符（records）: x', 502))).toBe(
			'查分器返回的数据异常，请稍后再试。'
		);
		expect(friendlySyncError(new Error('lxns /user/maimai/player/scores 请求失败: 404'))).toContain(
			'找不到'
		);
		expect(friendlySyncError(new Error('totally internal stack'))).toBe(SYNC_FAILED_GENERIC);
	});

	test('脱敏 ENCRYPTION_KEY / PKCE / Token / refresh / rv_ / auth code', () => {
		const cases = [
			'ENCRYPTION_KEY 未配置、太短或仍为占位值',
			'PKCE code_verifier mismatch',
			'refresh_token expired: abc.def',
			'access_token=eyJhbGciOi...',
			'authorization code used twice',
			'Authorization: Bearer rv_abcdefghijklmnopqrstuvwx',
			'raw rv_abcdefghijklmnopqrstuvwx leaked'
		];
		for (const msg of cases) {
			const out = friendlySyncError(new Error(msg));
			expect(out).not.toMatch(/ENCRYPTION_KEY|PKCE|code_verifier|refresh_token|access_token|Bearer|rv_/i);
			expect(out).not.toContain(msg);
			expect(out.length).toBeGreaterThan(0);
		}
	});

	test('落雪开发者 Token 仍映射为公开查询提示', () => {
		expect(friendlySyncError(new Error('已绑定好友码，但站点未配置 LXNS_DEVELOPER_TOKEN'))).toContain(
			'授权登录'
		);
	});

	test('assertSafeSyncMessage 兜底', () => {
		expect(assertSafeSyncMessage('正常中文提示')).toBe('正常中文提示');
		expect(assertSafeSyncMessage('请检查 ENCRYPTION_KEY')).toBe(SYNC_FAILED_GENERIC);
	});
});
