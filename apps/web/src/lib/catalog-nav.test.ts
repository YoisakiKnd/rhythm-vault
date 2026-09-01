import { describe, expect, test } from 'bun:test';
import {
	catalogHref,
	catalogItemActive,
	functionActive,
	functionHref,
	gameFromUrl,
	gameSwitchHref,
	libraryHref,
	srcFromUrl,
	variantSwitchHref
} from './catalog-nav';

describe('game context', () => {
	test('查分 URL 能读出水鱼/落雪', () => {
		expect(srcFromUrl('/scores', new URLSearchParams('game=chunithm&src=lxns'))).toBe('lxns');
		expect(srcFromUrl('/scores', new URLSearchParams('game=chunithm'))).toBe('df');
	});

	test('排行榜不走渠道 src（快照已合并）', () => {
		expect(srcFromUrl('/ranking', new URLSearchParams('game=maimai'))).toBeNull();
		expect(
			variantSwitchHref('maimai', 'lxns', '/ranking', new URLSearchParams('game=maimai'))
		).toBeNull();
	});

	test('从 URL 解析当前游戏', () => {
		expect(gameFromUrl('/library/chunithm/song/3', new URLSearchParams())).toBe('chunithm');
		expect(gameFromUrl('/ranking', new URLSearchParams('game=djmax'))).toBe('djmax');
		expect(gameFromUrl('/sheet/maimai', new URLSearchParams())).toBe('maimai');
		expect(gameFromUrl('/', new URLSearchParams())).toBeNull();
	});

	test('功能链接带上当前游戏与变体', () => {
		expect(functionHref('library', 'maimai')).toBe('/library/maimai');
		expect(functionHref('library', 'maimai', { src: 'lxns' })).toBe('/library/maimai?src=lxns');
		expect(functionHref('library', 'djmax', { diff: '6B' })).toBe('/library/djmax?diff=6B');
		expect(functionHref('ranking', 'djmax')).toBe('/ranking?game=djmax');
		expect(functionHref('scores', 'chunithm')).toBe('/scores?game=chunithm');
		expect(functionHref('scores', 'chunithm', { src: 'lxns' })).toBe('/scores?game=chunithm&src=lxns');
		expect(functionHref('progress', 'maimai', { src: 'lxns' })).toBe(
			'/progress?game=maimai&src=lxns'
		);
		expect(functionHref('scores', 'djmax', { diff: '8B' })).toBe('/scores?game=djmax&button=8');
		expect(functionHref('sheet', 'maimai', { src: 'lxns' })).toBe('/sheet/maimai?src=lxns');
		expect(functionHref('sheet', 'djmax', { diff: '8B' })).toBe('/sheet/djmax?diff=8B');
		expect(functionHref('compare', 'chunithm')).toBe('/compare?game=chunithm');
		expect(functionActive('library', '/library/maimai/song/8')).toBe(true);
		expect(functionActive('ranking', '/library/maimai')).toBe(false);
		expect(functionActive('sheet', '/sheet/chunithm')).toBe(true);
		expect(functionActive('compare', '/compare')).toBe(true);
	});

	test('切游戏时留在当前功能并带上记忆的变体', () => {
		expect(gameSwitchHref('chunithm', '/library/maimai', new URLSearchParams('src=lxns'))).toBe(
			'/library/chunithm?src=lxns'
		);
		expect(
			gameSwitchHref('djmax', '/library/maimai', new URLSearchParams('src=lxns'), { diff: '6B' })
		).toBe('/library/djmax?diff=6B');
		expect(gameSwitchHref('djmax', '/ranking', new URLSearchParams('game=maimai'))).toBe(
			'/ranking?game=djmax'
		);
		expect(
			gameSwitchHref('djmax', '/scores', new URLSearchParams('game=maimai'), {
				diff: '5B'
			})
		).toBe('/scores?game=djmax&button=5');
		expect(gameSwitchHref('chunithm', '/sheet/maimai', new URLSearchParams('src=lxns'))).toBe(
			'/sheet/chunithm?src=lxns'
		);
		expect(gameSwitchHref('chunithm', '/', new URLSearchParams())).toBeNull();
	});

	test('曲库链接直达列表', () => {
		expect(catalogHref('maimai', 'df')).toBe('/library/maimai?src=df');
		expect(libraryHref('djmax', { diff: '6B' })).toBe('/library/djmax?diff=6B');
	});

	test('切数据源/键位时尽量留在当前页并保留筛选', () => {
		expect(
			variantSwitchHref('maimai', 'lxns', '/library/maimai', new URLSearchParams('q=test&level=14'))
		).toBe('/library/maimai?q=test&level=14&src=lxns');
		expect(
			variantSwitchHref(
				'djmax',
				'6B',
				'/library/djmax',
				new URLSearchParams('q=glory&diff=4B&pattern=SC')
			)
		).toBe('/library/djmax?q=glory&diff=6B&pattern=SC');
		expect(
			variantSwitchHref('djmax', '8B', '/scores', new URLSearchParams('game=djmax&button=4'))
		).toBe('/scores?game=djmax&button=8');
		expect(
			variantSwitchHref('chunithm', 'lxns', '/scores', new URLSearchParams('game=chunithm'))
		).toBe('/scores?game=chunithm&src=lxns');
		expect(
			catalogItemActive('/scores', new URLSearchParams('game=maimai'), 'maimai', 'df')
		).toBe(true);
		expect(
			catalogItemActive('/library/djmax', new URLSearchParams('diff=6B'), 'djmax', '6B')
		).toBe(true);
	});
});
