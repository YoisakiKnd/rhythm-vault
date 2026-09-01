import { apiKeys, apps, getDb, and, count, eq } from '@rhythm-vault/db';
import { AuthError, createApiKey, MAX_APPS_PER_USER } from './auth';

export interface AppView {
	id: number;
	name: string;
	createdAt: string;
	keys: Array<{ id: number; prefix: string; scope: string; revokedAt: string | null }>;
}

export async function createApp(userId: number, name: string) {
	const trimmed = name.trim();
	if (!trimmed || trimmed.length > 64) throw new AuthError(400, '应用名需 1–64 字符');
	const [{ n }] = await getDb().select({ n: count() }).from(apps).where(eq(apps.userId, userId));
	if (Number(n) >= MAX_APPS_PER_USER) {
		throw new AuthError(409, `每账号最多 ${MAX_APPS_PER_USER} 个应用`);
	}
	const [app] = await getDb()
		.insert(apps)
		.values({ userId, name: trimmed })
		.returning({ id: apps.id, name: apps.name, createdAt: apps.createdAt });
	// 每个应用创建时附带一把 Key，明文仅此一次返回
	const key = await createApiKey(userId, `${trimmed} 应用 Key`, app.id);
	return { app, key };
}

export async function listApps(userId: number): Promise<AppView[]> {
	const db = getDb();
	const appRows = await db
		.select({ id: apps.id, name: apps.name, createdAt: apps.createdAt })
		.from(apps)
		.where(eq(apps.userId, userId))
		.orderBy(apps.id);
	const keyRows = await db
		.select({
			id: apiKeys.id,
			appId: apiKeys.appId,
			prefix: apiKeys.prefix,
			scope: apiKeys.scope,
			revokedAt: apiKeys.revokedAt
		})
		.from(apiKeys)
		.where(and(eq(apiKeys.userId, userId)))
		.orderBy(apiKeys.id);
	return appRows.map((a) => ({
		id: a.id,
		name: a.name,
		createdAt: a.createdAt.toISOString(),
		keys: keyRows
			.filter((k) => k.appId === a.id)
			.map((k) => ({
				id: k.id,
				prefix: k.prefix,
				scope: k.scope,
				revokedAt: k.revokedAt?.toISOString() ?? null
			}))
	}));
}

export async function deleteApp(userId: number, appId: number): Promise<void> {
	const res = await getDb()
		.delete(apps)
		.where(and(eq(apps.id, appId), eq(apps.userId, userId)))
		.returning({ id: apps.id });
	if (res.length === 0) throw new AuthError(404, '应用不存在');
}
