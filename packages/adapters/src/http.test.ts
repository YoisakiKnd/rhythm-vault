import { afterEach, describe, expect, test } from 'bun:test';
import {
	fetchWithPolicy,
	isDivingFishUrl,
	resetDivingFishQuotaBlock,
	UPSTREAM_UA,
	utcDayEndMs
} from './http';

describe('fetchWithPolicy', () => {
	afterEach(() => {
		resetDivingFishQuotaBlock();
	});

	test('UA 可识别', () => {
		expect(UPSTREAM_UA.startsWith('rhythm-vault/')).toBe(true);
	});

	test('水鱼 URL 识别', () => {
		expect(isDivingFishUrl('https://www.diving-fish.com/api/maimaidxprober/query/player')).toBe(true);
		expect(isDivingFishUrl('https://maimai.lxns.net/api/v0/maimai/song/list')).toBe(false);
	});

	test('utcDayEndMs 落在次日 00:00 UTC', () => {
		const t = Date.UTC(2026, 7, 31, 15, 30, 0);
		expect(utcDayEndMs(t)).toBe(Date.UTC(2026, 8, 1, 0, 0, 0));
	});

	test('水鱼 429 不重试，后续请求直接 429 直到日切', async () => {
		let calls = 0;
		const orig = globalThis.fetch;
		globalThis.fetch = (async () => {
			calls += 1;
			return new Response('slow_down', { status: 429 });
		}) as typeof fetch;
		try {
			const first = await fetchWithPolicy('https://www.diving-fish.com/api/x');
			expect(first.status).toBe(429);
			expect(calls).toBe(1);
			const second = await fetchWithPolicy('https://www.diving-fish.com/api/x');
			expect(second.status).toBe(429);
			expect(calls).toBe(1);
		} finally {
			globalThis.fetch = orig;
		}
	});
});
