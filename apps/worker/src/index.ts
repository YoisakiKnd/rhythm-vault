import { getDb, linkedAccounts, isNotNull, or } from '@rhythm-vault/db';
import { latestScoreAtByUserGame, syncUserFull } from '@rhythm-vault/sync';
import { purgeExpiredSessions } from '../../web/src/lib/server/auth';
import { getAccessToken } from '../../web/src/lib/server/links';
import { AuthError } from '../../web/src/lib/server/auth';

const SCAN_INTERVAL_MS = 10 * 60_000;
const STALE_MS = 6 * 3600_000;
const BETWEEN_USERS_MS = 5_000;
const GAMES = ['maimai_dx', 'chunithm', 'djmax'] as const;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let stopping = false;

async function tokenOrNull(userId: number, source: 'divingfish' | 'lxns'): Promise<string | null> {
	try {
		return await getAccessToken(userId, source);
	} catch (err) {
		if (err instanceof AuthError && (err.status === 400 || err.status === 401)) return null;
		console.error('[worker] 取令牌失败', err);
		return null;
	}
}

async function findDueUsers(): Promise<number[]> {
	const rows = await getDb()
		.selectDistinct({ userId: linkedAccounts.userId })
		.from(linkedAccounts)
		.where(or(isNotNull(linkedAccounts.externalId), isNotNull(linkedAccounts.accessTokenEnc)));
	const userIds = rows.map((r) => r.userId);
	const latest = await latestScoreAtByUserGame(userIds);
	const cutoff = Date.now() - STALE_MS;
	const due: number[] = [];
	for (const userId of userIds) {
		const stale = GAMES.some((game) => {
			const at = latest.get(`${userId}:${game}`);
			return !at || at.getTime() < cutoff;
		});
		if (stale) due.push(userId);
	}
	return due;
}

async function main(): Promise<void> {
	console.log(
		`[worker] 自动同步守护进程启动：每 ${SCAN_INTERVAL_MS / 60_000} 分钟扫描，数据超过 ${STALE_MS / 3600_000} 小时自动同步（含 OAuth 全量）`
	);
	process.on('SIGTERM', () => {
		stopping = true;
		console.log('[worker] 收到 SIGTERM，本轮结束后退出');
	});
	process.on('SIGINT', () => {
		stopping = true;
	});

	while (!stopping) {
		try {
			await purgeExpiredSessions();
			const due = await findDueUsers();
			if (due.length > 0) console.log(`[worker] 本轮需同步 ${due.length} 个账号`);
			for (const userId of due) {
				if (stopping) break;
				try {
					const summary = await syncUserFull(userId, tokenOrNull);
					console.log(`[worker] 用户 ${userId} 同步完成`, JSON.stringify(summary));
				} catch (err) {
					console.error(`[worker] 用户 ${userId} 同步失败`, err);
				}
				await sleep(BETWEEN_USERS_MS);
			}
		} catch (err) {
			console.error('[worker] 扫描失败（数据库不可用？）', err);
		}
		if (stopping) break;
		const start = Date.now();
		while (!stopping && Date.now() - start < SCAN_INTERVAL_MS) {
			await sleep(1000);
		}
	}
	console.log('[worker] 已退出');
	process.exit(0);
}

await main();
