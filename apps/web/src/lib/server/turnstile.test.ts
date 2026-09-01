import { afterEach, describe, expect, test } from 'bun:test';
import { AuthError } from './auth';
import { assertTurnstile, turnstileEnabled, turnstileTokenFromForm } from './turnstile';

const prevSite = process.env.TURNSTILE_SITE_KEY;
const prevSecret = process.env.TURNSTILE_SECRET_KEY;

afterEach(() => {
	if (prevSite === undefined) delete process.env.TURNSTILE_SITE_KEY;
	else process.env.TURNSTILE_SITE_KEY = prevSite;
	if (prevSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
	else process.env.TURNSTILE_SECRET_KEY = prevSecret;
});

describe('turnstileEnabled', () => {
	test('缺任一密钥则关闭', () => {
		delete process.env.TURNSTILE_SITE_KEY;
		delete process.env.TURNSTILE_SECRET_KEY;
		expect(turnstileEnabled()).toBe(false);
		process.env.TURNSTILE_SITE_KEY = 'site';
		expect(turnstileEnabled()).toBe(false);
		process.env.TURNSTILE_SECRET_KEY = 'secret';
		expect(turnstileEnabled()).toBe(true);
	});
});

describe('assertTurnstile', () => {
	test('未配置时跳过', async () => {
		delete process.env.TURNSTILE_SITE_KEY;
		delete process.env.TURNSTILE_SECRET_KEY;
		await assertTurnstile(undefined);
		await assertTurnstile('');
	});

	test('已配置时缺 token 拒绝', async () => {
		process.env.TURNSTILE_SITE_KEY = 'site';
		process.env.TURNSTILE_SECRET_KEY = 'secret';
		try {
			await assertTurnstile('');
			throw new Error('should throw');
		} catch (err) {
			expect(err).toBeInstanceOf(AuthError);
			expect((err as AuthError).status).toBe(400);
		}
	});

	test('siteverify 失败则 403', async () => {
		process.env.TURNSTILE_SITE_KEY = 'site';
		process.env.TURNSTILE_SECRET_KEY = 'secret';
		const orig = globalThis.fetch;
		globalThis.fetch = (async () =>
			new Response(JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] }), {
				headers: { 'Content-Type': 'application/json' }
			})) as unknown as typeof fetch;
		try {
			await assertTurnstile('x'.repeat(20));
			throw new Error('should throw');
		} catch (err) {
			expect(err).toBeInstanceOf(AuthError);
			expect((err as AuthError).status).toBe(403);
		} finally {
			globalThis.fetch = orig;
		}
	});

	test('siteverify 成功则通过', async () => {
		process.env.TURNSTILE_SITE_KEY = 'site';
		process.env.TURNSTILE_SECRET_KEY = 'secret';
		const orig = globalThis.fetch;
		globalThis.fetch = (async () =>
			new Response(JSON.stringify({ success: true }), {
				headers: { 'Content-Type': 'application/json' }
			})) as unknown as typeof fetch;
		try {
			await assertTurnstile('x'.repeat(20), '127.0.0.1');
		} finally {
			globalThis.fetch = orig;
		}
	});
});

describe('turnstileTokenFromForm', () => {
	test('读取隐藏字段', () => {
		const form = new FormData();
		form.set('cf-turnstile-response', 'tok');
		expect(turnstileTokenFromForm(form)).toBe('tok');
	});
});
