import { randomBytes, scryptSync } from 'node:crypto';
import { describe, expect, test } from 'bun:test';
import {
	decryptSecret,
	encryptSecret,
	hashPassword,
	safeEqual,
	sha256Hex,
	verifyPassword
} from './crypto';

describe('密码哈希', () => {
	test('往返与错误密码拒绝', () => {
		const stored = hashPassword('s3cret-password');
		expect(stored.startsWith('scrypt:v1:')).toBe(true);
		expect(verifyPassword('s3cret-password', stored)).toBe(true);
		expect(verifyPassword('wrong-password', stored)).toBe(false);
		expect(verifyPassword('anything', 'garbage')).toBe(false);
	});

	test('兼容旧格式 scrypt:salt:hash', () => {
		const salt = randomBytes(16);
		const hash = scryptSync('legacy-pass', salt, 64);
		const stored = `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
		expect(verifyPassword('legacy-pass', stored)).toBe(true);
		expect(verifyPassword('nope', stored)).toBe(false);
	});

	test('加盐：同一密码两次哈希结果不同', () => {
		expect(hashPassword('same')).not.toBe(hashPassword('same'));
	});
});

describe('AES-256-GCM 秘密加密', () => {
	const key = 'unit-test-key-material';

	test('加解密往返', () => {
		const enc = encryptSecret('rv-access-token-值', key);
		expect(enc.startsWith('v1.')).toBe(true);
		expect(decryptSecret(enc, key)).toBe('rv-access-token-值');
	});

	test('随机 IV：同一明文两次密文不同', () => {
		expect(encryptSecret('x', key)).not.toBe(encryptSecret('x', key));
	});

	test('错误密钥解密抛错', () => {
		const enc = encryptSecret('x', key);
		expect(() => decryptSecret(enc, 'wrong-key-material')).toThrow();
	});

	test('篡改密文抛错', () => {
		const enc = encryptSecret('x', key);
		const parts = enc.split('.');
		const last = parts[3]!;
		parts[3] = last.slice(0, -2) + (last.endsWith('00') ? '11' : '00');
		expect(() => decryptSecret(parts.join('.'), key)).toThrow();
	});
});

describe('sha256Hex', () => {
	test('确定性', () => {
		expect(sha256Hex('abc')).toBe(sha256Hex('abc'));
		expect(sha256Hex('abc')).toHaveLength(64);
	});
});

describe('safeEqual', () => {
	test('相同字符串为 true', () => {
		expect(safeEqual('oauth-state-token', 'oauth-state-token')).toBe(true);
	});

	test('不同字符串或长度不同为 false', () => {
		expect(safeEqual('oauth-state-token', 'oauth-state-tokem')).toBe(false);
		expect(safeEqual('abc', 'abcd')).toBe(false);
	});
});
