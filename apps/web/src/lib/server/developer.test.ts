import { describe, expect, test } from 'bun:test';
import { AuthError } from './auth';
import {
	applicationStatusLabel,
	canIssueBotKey,
	parseApplicationForm,
	PURPOSE_MIN
} from './developer';

describe('canIssueBotKey', () => {
	test('站长或已通过申请才能发 Bot Key', () => {
		expect(canIssueBotKey(null, true)).toBe(true);
		expect(canIssueBotKey('approved', false)).toBe(true);
		expect(canIssueBotKey('pending', false)).toBe(false);
		expect(canIssueBotKey('rejected', false)).toBe(false);
		expect(canIssueBotKey('revoked', false)).toBe(false);
		expect(canIssueBotKey(null, false)).toBe(false);
	});
});

describe('applicationStatusLabel', () => {
	test('中文状态', () => {
		expect(applicationStatusLabel('pending')).toBe('审批中');
		expect(applicationStatusLabel('approved')).toBe('已通过');
		expect(applicationStatusLabel('rejected')).toBe('未通过');
		expect(applicationStatusLabel('revoked')).toBe('已收回');
	});
});

describe('parseApplicationForm', () => {
	const ok = {
		name: '葱喵 Bot',
		purpose: '给群友查 b50、完成表和推分，私聊验证 QQ 后按 qq 查询。',
		contact: 'qq:123456',
		homepage: 'https://example.test/bot'
	};

	test('合法输入通过并规范化主页', () => {
		const parsed = parseApplicationForm(ok);
		expect(parsed.name).toBe('葱喵 Bot');
		expect(parsed.homepage).toBe('https://example.test/bot');
		expect(parsed.contact).toBe('qq:123456');
	});

	test('用途过短或无名拒绝', () => {
		try {
			parseApplicationForm({ ...ok, purpose: '太短了' });
			throw new Error('should throw');
		} catch (err) {
			expect(err).toBeInstanceOf(AuthError);
			expect((err as AuthError).status).toBe(400);
			expect((err as AuthError).message).toContain(String(PURPOSE_MIN));
		}
		try {
			parseApplicationForm({ ...ok, name: '' });
			throw new Error('should throw');
		} catch (err) {
			expect(err).toBeInstanceOf(AuthError);
		}
	});

	test('主页必须是 http(s)', () => {
		try {
			parseApplicationForm({ ...ok, homepage: 'javascript:alert(1)' });
			throw new Error('should throw');
		} catch (err) {
			expect(err).toBeInstanceOf(AuthError);
			expect((err as AuthError).message).toContain('http(s)');
		}
		expect(parseApplicationForm({ ...ok, homepage: '' }).homepage).toBeNull();
		expect(parseApplicationForm({ ...ok, contact: '  ' }).contact).toBeNull();
	});
});
