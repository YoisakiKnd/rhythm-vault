import { randomToken } from '@rhythm-vault/adapters';
import { apiKeys, getDb, sessions, users, and, count, eq, gt, isNull, sql } from '@rhythm-vault/db';
import { hashPassword, sha256Hex, verifyPassword } from './crypto';
import { takeToken } from './rate-limit';

export const SESSION_COOKIE = 'rv_session';
const SESSION_TTL_MS = 30 * 86400_000;
const SESSION_SLIDE_IF_REMAINING_MS = 7 * 86400_000;

export const USERNAME_RE = /^[a-zA-Z0-9_]{3,24}$/;

export const MAX_API_KEYS_PER_USER = 10;
export const MAX_APPS_PER_USER = 10;

export const KEY_SCOPES = ['self', 'bot'] as const;
export type ApiKeyScope = (typeof KEY_SCOPES)[number];

export function isApiKeyScope(v: string): v is ApiKeyScope {
	return (KEY_SCOPES as readonly string[]).includes(v);
}

export class AuthError extends Error {
	constructor(
		public status: number,
		message: string
	) {
		super(message);
		this.name = 'AuthError';
	}
}

function isUniqueViolation(err: unknown): boolean {
	return typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505';
}

export async function registerUser(username: string, password: string) {
	if (!USERNAME_RE.test(username)) throw new AuthError(400, '用户名需为 3–24 位字母、数字或下划线');
	if (password.length < 8 || password.length > 128) throw new AuthError(400, '密码长度需 8–128 位');
	try {
		const [user] = await getDb()
			.insert(users)
			.values({ username, passwordHash: hashPassword(password) })
			.returning({ id: users.id, username: users.username });
		return user;
	} catch (err) {
		if (isUniqueViolation(err)) throw new AuthError(400, '注册失败，请更换用户名后重试');
		throw err;
	}
}

export async function loginUser(username: string, password: string) {
	const db = getDb();
	const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
	if (!user || !verifyPassword(password, user.passwordHash)) {
		throw new AuthError(401, '用户名或密码错误');
	}
	return { id: user.id, username: user.username, profilePublic: user.profilePublic };
}

export async function createSession(userId: number): Promise<{ token: string; expiresAt: Date }> {
	const token = randomToken(32);
	const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
	await getDb().insert(sessions).values({ id: sha256Hex(token), userId, expiresAt });
	return { token, expiresAt };
}

export function sessionCookieOptions(expiresAt: Date) {
	return {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		expires: expiresAt
	} as const;
}

export async function getSessionUser(token: string | undefined) {
	if (!token) return null;
	const rows = await getDb()
		.select({
			id: users.id,
			username: users.username,
			profilePublic: users.profilePublic,
			sessionId: sessions.id,
			expiresAt: sessions.expiresAt
		})
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(and(eq(sessions.id, sha256Hex(token)), gt(sessions.expiresAt, new Date())))
		.limit(1);
	const row = rows[0];
	if (!row) return null;
	if (row.expiresAt.getTime() - Date.now() < SESSION_SLIDE_IF_REMAINING_MS) {
		const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
		await getDb().update(sessions).set({ expiresAt }).where(eq(sessions.id, row.sessionId));
	}
	return { id: row.id, username: row.username, profilePublic: row.profilePublic };
}

export async function destroySession(token: string | undefined): Promise<void> {
	if (!token) return;
	await getDb().delete(sessions).where(eq(sessions.id, sha256Hex(token)));
}

export async function destroyAllSessions(userId: number): Promise<void> {
	await getDb().delete(sessions).where(eq(sessions.userId, userId));
}

export async function changePassword(userId: number, current: string, next: string): Promise<void> {
	if (next.length < 8 || next.length > 128) throw new AuthError(400, '密码长度需 8–128 位');
	const [user] = await getDb().select().from(users).where(eq(users.id, userId)).limit(1);
	if (!user || !verifyPassword(current, user.passwordHash)) {
		throw new AuthError(400, '当前密码不正确');
	}
	await getDb().update(users).set({ passwordHash: hashPassword(next) }).where(eq(users.id, userId));
	await destroyAllSessions(userId);
}

export async function setProfilePublic(userId: number, profilePublic: boolean): Promise<void> {
	await getDb().update(users).set({ profilePublic }).where(eq(users.id, userId));
}

export async function setBotQueryPublic(userId: number, botQueryPublic: boolean): Promise<void> {
	await getDb().update(users).set({ botQueryPublic }).where(eq(users.id, userId));
}

export async function getAccountProfile(userId: number) {
	const [row] = await getDb()
		.select({
			username: users.username,
			profilePublic: users.profilePublic,
			botQueryPublic: users.botQueryPublic,
			createdAt: users.createdAt
		})
		.from(users)
		.where(eq(users.id, userId))
		.limit(1);
	if (!row) throw new AuthError(401, '未登录');
	return { ...row, createdAt: row.createdAt.toISOString() };
}

export async function purgeExpiredSessions(): Promise<void> {
	await getDb().delete(sessions).where(sql`${sessions.expiresAt} < now()`);
}

export async function createApiKey(userId: number, name: string, appId: number | null = null) {
	if (!name.trim() || name.trim().length > 64) throw new AuthError(400, 'Key 名称需 1–64 字符');
	const [{ n }] = await getDb()
		.select({ n: count() })
		.from(apiKeys)
		.where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)));
	if (Number(n) >= MAX_API_KEYS_PER_USER) {
		throw new AuthError(409, `每账号最多 ${MAX_API_KEYS_PER_USER} 把有效 API Key`);
	}
	const raw = `rv_${randomToken(24)}`;
	const [key] = await getDb()
		.insert(apiKeys)
		.values({ userId, appId, name: name.trim(), prefix: raw.slice(0, 11), keyHash: sha256Hex(raw) })
		.returning({
			id: apiKeys.id,
			name: apiKeys.name,
			prefix: apiKeys.prefix,
			scope: apiKeys.scope,
			createdAt: apiKeys.createdAt
		});
	return { ...key, plaintext: raw };
}

export function listApiKeys(userId: number) {
	return getDb()
		.select({
			id: apiKeys.id,
			name: apiKeys.name,
			prefix: apiKeys.prefix,
			scope: apiKeys.scope,
			createdAt: apiKeys.createdAt,
			lastUsedAt: apiKeys.lastUsedAt,
			requestCount: apiKeys.requestCount,
			revokedAt: apiKeys.revokedAt
		})
		.from(apiKeys)
		.where(eq(apiKeys.userId, userId))
		.orderBy(apiKeys.id);
}

export async function revokeApiKey(userId: number, keyId: number): Promise<void> {
	const res = await getDb()
		.update(apiKeys)
		.set({ revokedAt: new Date() })
		.where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))
		.returning({ id: apiKeys.id });
	if (res.length === 0) throw new AuthError(404, 'API Key 不存在或已吊销');
}

export async function setApiKeyScope(
	userId: number,
	keyId: number,
	scope: ApiKeyScope
): Promise<void> {
	const res = await getDb()
		.update(apiKeys)
		.set({ scope })
		.where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))
		.returning({ id: apiKeys.id });
	if (res.length === 0) throw new AuthError(404, 'API Key 不存在或已吊销');
}

export interface ApiIdentity {
	keyId: number;
	userId: number;
	username: string;
	scope: ApiKeyScope;
}

const RATE_LIMIT_PER_MIN = 120;

/** 开放 API 鉴权：Authorization: Bearer rv_xxx；限流按 userId */
export async function authApiKey(request: Request): Promise<ApiIdentity> {
	const auth = request.headers.get('authorization') ?? '';
	const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
	if (!token) throw new AuthError(401, '缺少 API Key，请在 Authorization: Bearer <rv_...> 中提供');
	const rows = await getDb()
		.select({
			keyId: apiKeys.id,
			userId: users.id,
			username: users.username,
			scope: apiKeys.scope
		})
		.from(apiKeys)
		.innerJoin(users, eq(apiKeys.userId, users.id))
		.where(and(eq(apiKeys.keyHash, sha256Hex(token)), isNull(apiKeys.revokedAt)))
		.limit(1);
	if (rows.length === 0) throw new AuthError(401, 'API Key 无效或已吊销');
	const row = rows[0];
	if (!takeToken(`api:${row.userId}`, RATE_LIMIT_PER_MIN, 60_000)) {
		throw new AuthError(429, '请求过于频繁，请稍后再试（每账号每分钟 120 次）');
	}
	getDb()
		.update(apiKeys)
		.set({ lastUsedAt: new Date(), requestCount: sql`${apiKeys.requestCount} + 1` })
		.where(eq(apiKeys.id, row.keyId))
		.catch((err) => console.error('[auth] 用量统计更新失败', err));
	return {
		keyId: row.keyId,
		userId: row.userId,
		username: row.username,
		scope: isApiKeyScope(row.scope) ? row.scope : 'self'
	};
}
