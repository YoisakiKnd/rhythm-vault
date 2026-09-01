import { describe, expect, test } from 'bun:test';
import { canViewPlayerProfile } from '../player-card';
import { assertNumericId, decideQueryTarget, KEY_SCOPE_DENIED, QUERY_TARGET_HIDDEN } from './api';
import { AuthError } from './auth';
import { normalizeQq } from './identities';

describe('normalizeQq', () => {
	test('trim 且校验 4–12 位数字', () => {
		expect(normalizeQq(' 123456 ')).toBe('123456');
		expect(normalizeQq('')).toBeNull();
		expect(normalizeQq('abc')).toBeNull();
		expect(normalizeQq('12')).toBeNull();
	});
});

describe('档案可见性', () => {
	test('未公开仅主人可见', () => {
		expect(canViewPlayerProfile(true, false)).toBe(true);
		expect(canViewPlayerProfile(false, true)).toBe(true);
		expect(canViewPlayerProfile(false, false)).toBe(false);
	});
});

describe('assertNumericId', () => {
	test('合法数字通过', () => {
		expect(assertNumericId('1145')).toBe('1145');
	});
	test('非法返回 400', () => {
		try {
			assertNumericId('abc');
			throw new Error('should throw');
		} catch (err) {
			expect(err).toBeInstanceOf(AuthError);
			expect((err as AuthError).status).toBe(400);
		}
	});
});

describe('decideQueryTarget', () => {
	const self = { userId: 1, scope: 'self' as const };
	const bot = { userId: 1, scope: 'bot' as const };
	const own = { userId: 1, verified: true, botQueryPublic: false };
	const other = { userId: 2, verified: true, botQueryPublic: true };
	const otherClosed = { userId: 2, verified: true, botQueryPublic: false };
	const otherUnverified = { userId: 2, verified: false, botQueryPublic: true };

	function statusOf(fn: () => unknown): number {
		try {
			fn();
			return 200;
		} catch (err) {
			return err instanceof AuthError ? err.status : 500;
		}
	}

	function messageOf(fn: () => unknown): string {
		try {
			fn();
			return '';
		} catch (err) {
			return err instanceof AuthError ? err.message : '';
		}
	}

	test('自己的已验证 QQ，self Key 也能查', () => {
		expect(decideQueryTarget(self, own, { allowUnverified: false })).toBe(1);
	});

	test('自己的未验证 QQ 默认拒绝，开发开关可放行', () => {
		expect(
			statusOf(() => decideQueryTarget(self, { ...own, verified: false }, { allowUnverified: false }))
		).toBe(404);
		expect(decideQueryTarget(self, { ...own, verified: false }, { allowUnverified: true })).toBe(1);
	});

	test('self Key 查别人一律 403，不泄露是否存在', () => {
		expect(statusOf(() => decideQueryTarget(self, other, { allowUnverified: false }))).toBe(403);
		expect(messageOf(() => decideQueryTarget(self, other, { allowUnverified: false }))).toBe(
			KEY_SCOPE_DENIED
		);
		expect(statusOf(() => decideQueryTarget(self, null, { allowUnverified: false }))).toBe(403);
	});

	test('bot Key 可查已验证且开启 Bot 查询的别人', () => {
		expect(decideQueryTarget(bot, other, { allowUnverified: false })).toBe(2);
	});

	test('bot Key 对未开放 / 未验证 / 不存在统一 404', () => {
		expect(messageOf(() => decideQueryTarget(bot, otherClosed, { allowUnverified: false }))).toBe(
			QUERY_TARGET_HIDDEN
		);
		expect(messageOf(() => decideQueryTarget(bot, otherUnverified, { allowUnverified: false }))).toBe(
			QUERY_TARGET_HIDDEN
		);
		expect(messageOf(() => decideQueryTarget(bot, null, { allowUnverified: false }))).toBe(
			QUERY_TARGET_HIDDEN
		);
	});
});
