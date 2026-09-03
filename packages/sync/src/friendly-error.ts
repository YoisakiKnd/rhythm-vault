import { UpstreamError } from '@rhythm-vault/adapters';

const GENERIC = '同步失败，请稍后重试';

export function friendlySyncError(err: unknown): string {
	const status = err instanceof UpstreamError ? err.status : 0;
	const msg = err instanceof Error ? err.message : String(err);

	if (/LXNS_DEVELOPER_TOKEN/.test(msg) || msg.includes('公开同步无法按好友码')) {
		return '落雪公开查询未开通，请用授权登录后再同步。';
	}
	if (status === 401 || status === 403 || /未开放|未.*同意|关闭了第三方|Privacy|请求失败: 40[13]/.test(msg)) {
		return '未开放查询，或授权已失效，请重新绑定。';
	}
	if (status === 404 || /用户不存在|请求失败: 404/.test(msg)) {
		return '查分器上找不到这个账号，请检查绑定信息。';
	}
	if (status === 429 || /请求失败: 429/.test(msg)) return '查分器正忙，请稍后再试。';
	if (/响应结构不符/.test(msg)) return '查分器返回的数据异常，请稍后再试。';
	if (status >= 500 || /请求失败: 5/.test(msg)) return '查分器暂时不可用，请稍后再试。';
	return GENERIC;
}

export function failSyncDetail(err: unknown): string {
	console.error('[sync]', err);
	return friendlySyncError(err);
}
