import { describe, expect, test } from 'bun:test';
import { UpstreamError } from '@rhythm-vault/adapters';
import {
	emptyScoresCta,
	friendlySyncError,
	scoresEmptyMessage,
	SYNC_FAILED_GENERIC,
	VISITOR_NO_SCORES
} from './copy';

describe('scoresEmptyMessage', () => {
	test('未绑定点名渠道', () => {
		expect(scoresEmptyMessage({ bound: false, src: 'lxns' })).toContain('还没有绑定落雪');
		expect(scoresEmptyMessage({ bound: false, src: 'df' })).toContain('还没有绑定水鱼');
		expect(scoresEmptyMessage({ bound: false, src: 'varchive' })).toContain('V-ARCHIVE');
	});

	test('已绑定无成绩', () => {
		expect(scoresEmptyMessage({ bound: true, src: 'lxns' })).toContain('落雪里还没有这款游戏的成绩');
		expect(scoresEmptyMessage({ bound: true, src: 'df' })).toContain('水鱼里还没有这款游戏的成绩');
	});

	test('访客不提绑定', () => {
		expect(scoresEmptyMessage({ bound: false, src: 'df', visitor: true })).toBe(VISITOR_NO_SCORES);
	});
});

describe('emptyScoresCta', () => {
	test('未绑定去绑定，已绑定去同步', () => {
		expect(emptyScoresCta(scoresEmptyMessage({ bound: false, src: 'df' }))?.href).toBe(
			'/dashboard/links'
		);
		expect(emptyScoresCta(scoresEmptyMessage({ bound: true, src: 'df' }))?.href).toBe('/dashboard');
		expect(emptyScoresCta(VISITOR_NO_SCORES)).toBeNull();
	});
});

describe('friendlySyncError', () => {
	test('映射常见上游错误', () => {
		expect(friendlySyncError(new UpstreamError('query/player 请求失败: 403', 403))).toContain(
			'未开放查询'
		);
		expect(friendlySyncError(new UpstreamError('lxns /x 请求失败: 404', 404))).toContain('找不到');
		expect(friendlySyncError(new Error('水鱼 maimai 响应结构不符（records）: x'))).toContain(
			'数据异常'
		);
		expect(friendlySyncError(new Error('已绑定好友码，但站点未配置 LXNS_DEVELOPER_TOKEN'))).toContain(
			'授权登录'
		);
		expect(friendlySyncError(new Error('weird internal'))).toBe(SYNC_FAILED_GENERIC);
	});
});
