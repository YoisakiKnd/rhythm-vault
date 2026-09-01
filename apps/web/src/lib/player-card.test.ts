import { describe, expect, test } from 'bun:test';
import {
	avatarHue,
	canViewPlayerProfile,
	formatGameRating,
	urlGameFromDb
} from './player-card';

describe('avatarHue', () => {
	test('同一用户名稳定，不同用户名通常不同', () => {
		expect(avatarHue('alice')).toBe(avatarHue('alice'));
		expect(avatarHue('alice')).not.toBe(avatarHue('bob'));
		expect(avatarHue('alice')).toBeGreaterThanOrEqual(0);
		expect(avatarHue('alice')).toBeLessThan(360);
	});
});

describe('formatGameRating', () => {
	test('舞萌取整，中二/DJMAX 保留小数', () => {
		expect(formatGameRating('maimai_dx', 15001.4)).toBe('15001');
		expect(formatGameRating('chunithm', 16.52)).toBe('16.52');
		expect(formatGameRating('djmax', 12)).toBe('12');
	});
});

describe('urlGameFromDb', () => {
	test('快照 game 映射到路由 game', () => {
		expect(urlGameFromDb('maimai_dx')).toBe('maimai');
		expect(urlGameFromDb('chunithm')).toBe('chunithm');
		expect(urlGameFromDb('djmax')).toBe('djmax');
	});
});

describe('canViewPlayerProfile', () => {
	test('公开对所有人可见，未公开仅主人可见', () => {
		expect(canViewPlayerProfile(true, false)).toBe(true);
		expect(canViewPlayerProfile(false, true)).toBe(true);
		expect(canViewPlayerProfile(false, false)).toBe(false);
	});
});
