import { describe, expect, test } from 'bun:test';
import { catalogSrcLabel, catalogSrcToSource, channelEmptyMessage, scoreChannelFromParam } from './channel';

describe('channelEmptyMessage', () => {
	test('点名渠道', () => {
		expect(channelEmptyMessage('lxns')).toContain('落雪暂无该游戏的成绩数据');
		expect(channelEmptyMessage('df')).toContain('水鱼暂无该游戏的成绩数据');
	});

	test('src 映射到绑定 source', () => {
		expect(catalogSrcToSource('lxns')).toBe('lxns');
		expect(catalogSrcToSource('df')).toBe('divingfish');
		expect(catalogSrcLabel('lxns')).toBe('落雪');
		expect(scoreChannelFromParam('lxns')).toBe('lxns');
		expect(scoreChannelFromParam(null)).toBe('divingfish');
	});
});
