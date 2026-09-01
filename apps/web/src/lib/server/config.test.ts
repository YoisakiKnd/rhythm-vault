import { afterEach, describe, expect, test } from 'bun:test';
import { ENCRYPTION_KEY_DENY, assertEncryptionKey, getAppConfig } from './config';

describe('getAppConfig 生产 fail-fast', () => {
	const prev = {
		NODE_ENV: process.env.NODE_ENV,
		BASE_URL: process.env.BASE_URL,
		ENCRYPTION_KEY: process.env.ENCRYPTION_KEY
	};

	afterEach(() => {
		for (const [k, v] of Object.entries(prev)) {
			if (v === undefined) delete process.env[k];
			else process.env[k] = v;
		}
	});

	test('生产缺 BASE_URL 抛错', () => {
		process.env.NODE_ENV = 'production';
		delete process.env.BASE_URL;
		process.env.ENCRYPTION_KEY = 'a-sufficiently-long-random-secret';
		expect(() => getAppConfig()).toThrow(/BASE_URL/);
	});

	test('生产占位 ENCRYPTION_KEY 抛错', () => {
		process.env.NODE_ENV = 'production';
		process.env.BASE_URL = 'https://example.test';
		process.env.ENCRYPTION_KEY = 'changeme';
		expect(ENCRYPTION_KEY_DENY.has('changeme')).toBe(true);
		expect(() => getAppConfig()).toThrow(/ENCRYPTION_KEY/);
		expect(() => assertEncryptionKey()).toThrow(/ENCRYPTION_KEY/);
	});

	test('生产合法配置通过', () => {
		process.env.NODE_ENV = 'production';
		process.env.BASE_URL = 'https://example.test/';
		process.env.ENCRYPTION_KEY = 'a-sufficiently-long-random-secret';
		const cfg = getAppConfig();
		expect(cfg.baseUrl).toBe('https://example.test');
	});
});
