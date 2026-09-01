import { AuthError } from './auth';
import { getAccessToken } from './links';
import { syncUserFull, type SyncSummary } from '@rhythm-vault/sync';

async function tokenOrNull(userId: number, source: 'divingfish' | 'lxns'): Promise<string | null> {
	try {
		return await getAccessToken(userId, source);
	} catch (err) {
		if (err instanceof AuthError && (err.status === 400 || err.status === 401)) return null;
		throw err;
	}
}

/**
 * 手动同步与 worker 共用 syncUserFull：公开路径 + OAuth 全量，带 advisory lock。
 */
export async function runManualSync(userId: number): Promise<SyncSummary> {
	return syncUserFull(userId, tokenOrNull);
}
