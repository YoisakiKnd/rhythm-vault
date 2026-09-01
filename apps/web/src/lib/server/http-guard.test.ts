import { describe, expect, test } from 'bun:test';
import { AuthError } from './auth';
import {
	isForbiddenCrossOrigin,
	oauthFailLocation,
	oauthProviderErrorMessage,
	registerPasswordMismatch,
	safeInternalPath
} from './http-guard';

describe('isForbiddenCrossOrigin', () => {
	test('GET/HEAD/OPTIONS 放行', () => {
		expect(isForbiddenCrossOrigin('GET', 'https://evil.test', 'https://app.test')).toBe(false);
		expect(isForbiddenCrossOrigin('HEAD', 'https://evil.test', 'https://app.test')).toBe(false);
		expect(isForbiddenCrossOrigin('OPTIONS', 'https://evil.test', 'https://app.test')).toBe(false);
	});
	test('写操作 Origin 不一致或缺失均拒绝', () => {
		expect(isForbiddenCrossOrigin('POST', 'https://evil.test', 'https://app.test')).toBe(true);
		expect(isForbiddenCrossOrigin('POST', 'https://app.test', 'https://app.test')).toBe(false);
		expect(isForbiddenCrossOrigin('POST', null, 'https://app.test')).toBe(true);
	});
});

describe('safeInternalPath', () => {
	test('只允许站内相对路径', () => {
		expect(safeInternalPath('/dashboard/keys')).toBe('/dashboard/keys');
		expect(safeInternalPath('//evil.test')).toBe('/scores');
		expect(safeInternalPath('https://evil.test')).toBe('/scores');
		expect(safeInternalPath(null)).toBe('/scores');
	});
});

describe('oauthProviderErrorMessage', () => {
	test('不反射 error_description，固定文案', () => {
		expect(oauthProviderErrorMessage(null)).toBeNull();
		expect(oauthProviderErrorMessage('access_denied')).toBe('授权被取消或失败，请重试');
		const loc = oauthFailLocation(new AuthError(400, '授权被取消或失败，请重试'));
		expect(loc).toContain('/dashboard/links?error=');
		expect(loc).not.toContain('stolen');
		expect(decodeURIComponent(loc)).not.toContain('error_description');
	});
});

describe('registerPasswordMismatch', () => {
	test('两次密码不一致', () => {
		expect(registerPasswordMismatch('abcdefgh', 'abcdefgh')).toBeNull();
		expect(registerPasswordMismatch('abcdefgh', 'other')).toBe('两次输入的密码不一致');
	});
});
