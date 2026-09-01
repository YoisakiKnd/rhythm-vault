import { describe, expect, test } from 'bun:test';
import { badgeText } from './badge-display';

describe('badgeText', () => {
	test('舞萌拼接 fc/fs', () => {
		expect(badgeText('maimai', { fc: 'ap', fs: 'fsd' })).toBe('ap fsd');
		expect(badgeText('maimai', null)).toBe('');
	});
	test('DJMAX 只显示 MAX', () => {
		expect(badgeText('djmax', { maxCombo: true })).toBe('MAX');
		expect(badgeText('djmax', { maxCombo: false })).toBe('');
	});
});
