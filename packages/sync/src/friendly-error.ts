import { UpstreamError } from '@rhythm-vault/adapters';

export const SYNC_FAILED_GENERIC = '同步失败，请稍后重试';

/** 用户可见文案中禁止出现的敏感线索（配置名、令牌形态、OAuth 细节） */
const LEAKY =
	/ENCRYPTION_KEY|PKCE|code_verifier|code_challenge|refresh[_\s-]?token|access[_\s-]?token|authorization\s*code|auth(?:orization)?\s*code|\bBearer\s+\S+|\brv_[A-Za-z0-9_-]{8,}|client_secret|DEVELOPER_TOKEN|(?:^|[^A-Za-z])Token(?:[^A-Za-z]|$)/i;

function messageOf(err: unknown): string {
	return err instanceof Error ? err.message : String(err);
}

function statusOf(err: unknown): number {
	if (err instanceof UpstreamError) return err.status;
	if (err && typeof err === 'object' && 'status' in err) {
		const n = Number((err as { status: unknown }).status);
		return Number.isFinite(n) ? n : 0;
	}
	return 0;
}

/** 若映射结果仍含敏感片段，强制回落到通用文案 */
export function assertSafeSyncMessage(text: string): string {
	if (LEAKY.test(text)) return SYNC_FAILED_GENERIC;
	return text;
}

function mapSyncError(err: unknown): string {
	const status = statusOf(err);
	const msg = messageOf(err);

	// 配置 / 凭据类：绝不把 ENCRYPTION_KEY、Token、PKCE 等原文交给用户
	if (LEAKY.test(msg) || /LXNS_DEVELOPER_TOKEN/.test(msg) || msg.includes('公开同步无法按好友码')) {
		if (/LXNS_DEVELOPER_TOKEN/.test(msg) || msg.includes('公开同步无法按好友码')) {
			return '落雪公开查询未开通，请用授权登录后再同步。';
		}
		return '授权登录暂时不可用，请稍后重试或改用手动绑定。';
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
	return SYNC_FAILED_GENERIC;
}

export function friendlySyncError(err: unknown): string {
	return assertSafeSyncMessage(mapSyncError(err));
}

export function failSyncDetail(err: unknown): string {
	console.error('[sync]', err);
	return friendlySyncError(err);
}
