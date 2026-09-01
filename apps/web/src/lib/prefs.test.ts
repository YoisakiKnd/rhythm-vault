import { describe, expect, test } from 'bun:test';
import { parseTheme } from './prefs';

describe('parseTheme', () => {
	test('只接受 dark / light', () => {
		expect(parseTheme('dark')).toBe('dark');
		expect(parseTheme('light')).toBe('light');
		expect(parseTheme('auto')).toBeNull();
		expect(parseTheme(null)).toBeNull();
		expect(parseTheme('')).toBeNull();
	});
});
