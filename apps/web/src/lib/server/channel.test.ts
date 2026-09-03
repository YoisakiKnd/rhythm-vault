import { describe, expect, test } from 'bun:test';
import { catalogSrcLabel, catalogSrcToSource, channelEmptyMessage, scoreChannelFromParam } from './channel';

describe('channelEmptyMessage', () => {
	test('点名渠道', () => {
		expect(channelEmptyMessage('lxns')).toContain('落雪里还没有这款游戏的成绩');
		expect(channelEmptyMessage('df')).toContain('水鱼里还没有这款游戏的成绩');
		expect(channelEmptyMessage('lxns', false)).toContain('还没有绑定落雪');
	});

	test('src 映射到绑定 source', () => {
		expect(catalogSrcToSource('lxns')).toBe('lxns');
		expect(catalogSrcToSource('df')).toBe('divingfish');
		expect(catalogSrcLabel('lxns')).toBe('落雪');
		expect(scoreChannelFromParam('lxns')).toBe('lxns');
		expect(scoreChannelFromParam(null)).toBe('divingfish');
	});
});
