import { describe, expect, test } from 'bun:test';
import { clientAddress, takeToken } from './server/rate-limit';

describe('takeToken', () => {
	test('窗口内超过上限返回 false', () => {
		const key = `test:${Math.random()}`;
		expect(takeToken(key, 2, 60_000)).toBe(true);
		expect(takeToken(key, 2, 60_000)).toBe(true);
		expect(takeToken(key, 2, 60_000)).toBe(false);
	});
});

describe('clientAddress', () => {
	function event(xff?: string) {
		return {
			getClientAddress: () => '10.0.0.1',
			request: new Request('http://localhost/login', {
				headers: xff ? { 'x-forwarded-for': xff } : {}
			})
		};
	}

	test('始终使用 getClientAddress，不读 X-Forwarded-For 首段', () => {
		expect(clientAddress(event('1.2.3.4, 10.0.0.1'))).toBe('10.0.0.1');
		expect(clientAddress(event())).toBe('10.0.0.1');
	});

	test('getClientAddress 抛错时回落 local', () => {
		expect(
			clientAddress({
				getClientAddress: () => {
					throw new Error('no address');
				},
				request: new Request('http://localhost/login')
			})
		).toBe('local');
	});
});
