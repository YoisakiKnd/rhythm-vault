import { describe, expect, test } from 'bun:test';
import { AuthError } from './auth';
import { assertSource, ENCRYPTION_KEY_DENY, encryptionKeyRequired, validateExternalId } from './links';

describe('validateExternalId', () => {
	test('落雪好友码须为 8–16 位数字', () => {
		expect(validateExternalId('lxns', ' 12345678 ')).toBe('12345678');
		try {
			validateExternalId('lxns', 'abc');
			throw new Error('should throw');
		} catch (err) {
			expect(err).toBeInstanceOf(AuthError);
			expect((err as AuthError).status).toBe(400);
		}
	});
	test('空 ID 拒绝', () => {
		try {
			validateExternalId('divingfish', '  ');
			throw new Error('should throw');
		} catch (err) {
			expect(err).toBeInstanceOf(AuthError);
		}
	});
});

describe('assertSource', () => {
	test('接受 diving-fish 别名', () => {
		expect(assertSource('diving-fish')).toBe('divingfish');
		expect(assertSource('divingfish')).toBe('divingfish');
		expect(assertSource('lxns')).toBe('lxns');
		try {
			assertSource('nope');
			throw new Error('should throw');
		} catch (err) {
			expect(err).toBeInstanceOf(AuthError);
		}
	});
});

describe('encryptionKeyRequired', () => {
	test('拒绝 .env.example 历史占位词与过短密钥', () => {
		expect(ENCRYPTION_KEY_DENY.has('REPLACE_ME_WITH_A_LONG_RANDOM_SECRET')).toBe(true);
		const prev = process.env.ENCRYPTION_KEY;
		try {
			process.env.ENCRYPTION_KEY = 'REPLACE_ME_WITH_A_LONG_RANDOM_SECRET';
			expect(() => encryptionKeyRequired()).toThrow(AuthError);
			process.env.ENCRYPTION_KEY = 'short';
			expect(() => encryptionKeyRequired()).toThrow(AuthError);
			process.env.ENCRYPTION_KEY = 'a-sufficiently-long-random-secret';
			expect(encryptionKeyRequired()).toBe('a-sufficiently-long-random-secret');
		} finally {
			if (prev === undefined) delete process.env.ENCRYPTION_KEY;
			else process.env.ENCRYPTION_KEY = prev;
		}
	});
});
