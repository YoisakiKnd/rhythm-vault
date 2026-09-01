import { getDb, queryIdentities, users, and, eq, gt, sql } from '@rhythm-vault/db';
import { canViewPlayerProfile } from '../player-card';
import { AuthError } from './auth';

export const IDENTITY_PLATFORMS = ['qq'] as const;
export type IdentityPlatform = (typeof IDENTITY_PLATFORMS)[number];

export const QQ_RE = /^\d{4,12}$/;
export const VERIFY_TTL_MS = 10 * 60_000;

export function assertIdentityPlatform(platform: string): IdentityPlatform {
	if (!(IDENTITY_PLATFORMS as readonly string[]).includes(platform)) {
		throw new AuthError(400, `不支持的查询账号平台: ${platform}（当前支持 qq）`);
	}
	return platform as IdentityPlatform;
}

export function normalizeQq(raw: string): string | null {
	const id = raw.trim();
	return QQ_RE.test(id) ? id : null;
}

function randomVerifyCode(): string {
	const n = new Uint32Array(1);
	crypto.getRandomValues(n);
	return String(100000 + (n[0] % 900000));
}

function isUniqueViolation(err: unknown): boolean {
	return typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505';
}

export interface IdentityView {
	id: number;
	platform: string;
	platformUserId: string;
	verified: boolean;
	verifyCode: string | null;
	verifyExpiresAt: string | null;
	createdAt: string;
}

function toView(row: {
	id: number;
	platform: string;
	platformUserId: string;
	verified: boolean;
	verifyCode: string | null;
	verifyExpiresAt: Date | null;
	createdAt: Date;
}): IdentityView {
	const fresh =
		!row.verified &&
		row.verifyCode &&
		row.verifyExpiresAt &&
		row.verifyExpiresAt.getTime() > Date.now();
	return {
		id: row.id,
		platform: row.platform,
		platformUserId: row.platformUserId,
		verified: row.verified,
		verifyCode: fresh ? row.verifyCode : null,
		verifyExpiresAt: fresh && row.verifyExpiresAt ? row.verifyExpiresAt.toISOString() : null,
		createdAt: row.createdAt.toISOString()
	};
}

export async function listIdentities(userId: number): Promise<IdentityView[]> {
	const rows = await getDb()
		.select({
			id: queryIdentities.id,
			platform: queryIdentities.platform,
			platformUserId: queryIdentities.platformUserId,
			verified: queryIdentities.verified,
			verifyCode: queryIdentities.verifyCode,
			verifyExpiresAt: queryIdentities.verifyExpiresAt,
			createdAt: queryIdentities.createdAt
		})
		.from(queryIdentities)
		.where(eq(queryIdentities.userId, userId))
		.orderBy(queryIdentities.id);
	return rows.map(toView);
}

async function anotherVerifiedExists(
	platform: IdentityPlatform,
	platformUserId: string,
	exceptUserId?: number
): Promise<boolean> {
	const [row] = await getDb()
		.select({ id: queryIdentities.id })
		.from(queryIdentities)
		.where(
			and(
				eq(queryIdentities.platform, platform),
				eq(queryIdentities.platformUserId, platformUserId),
				eq(queryIdentities.verified, true),
				exceptUserId !== undefined ? sql`${queryIdentities.userId} <> ${exceptUserId}` : undefined
			)
		)
		.limit(1);
	return Boolean(row);
}

/** 登记查询账号：生成 10 分钟有效的 6 位验证码，未验证不占 QQ 名额 */
export async function addIdentity(
	userId: number,
	platform: IdentityPlatform,
	platformUserId: string
): Promise<IdentityView> {
	const id = platformUserId.trim();
	if (platform === 'qq' && !QQ_RE.test(id)) throw new AuthError(400, 'QQ 号需为 4–12 位数字');
	if (!id || id.length > 32) throw new AuthError(400, 'ID 需 1–32 字符');
	if (await anotherVerifiedExists(platform, id, userId)) {
		throw new AuthError(409, '该查询账号已被其他账号验证绑定');
	}

	const code = randomVerifyCode();
	const expiresAt = new Date(Date.now() + VERIFY_TTL_MS);

	const [existing] = await getDb()
		.select({
			id: queryIdentities.id,
			verified: queryIdentities.verified
		})
		.from(queryIdentities)
		.where(
			and(
				eq(queryIdentities.userId, userId),
				eq(queryIdentities.platform, platform),
				eq(queryIdentities.platformUserId, id)
			)
		)
		.limit(1);
	if (existing?.verified) throw new AuthError(409, '该查询账号已绑定');
	if (existing) {
		const [row] = await getDb()
			.update(queryIdentities)
			.set({ verifyCode: code, verifyExpiresAt: expiresAt })
			.where(eq(queryIdentities.id, existing.id))
			.returning({
				id: queryIdentities.id,
				platform: queryIdentities.platform,
				platformUserId: queryIdentities.platformUserId,
				verified: queryIdentities.verified,
				verifyCode: queryIdentities.verifyCode,
				verifyExpiresAt: queryIdentities.verifyExpiresAt,
				createdAt: queryIdentities.createdAt
			});
		return toView(row);
	}

	try {
		const [row] = await getDb()
			.insert(queryIdentities)
			.values({
				userId,
				platform,
				platformUserId: id,
				verified: false,
				verifyCode: code,
				verifyExpiresAt: expiresAt
			})
			.returning({
				id: queryIdentities.id,
				platform: queryIdentities.platform,
				platformUserId: queryIdentities.platformUserId,
				verified: queryIdentities.verified,
				verifyCode: queryIdentities.verifyCode,
				verifyExpiresAt: queryIdentities.verifyExpiresAt,
				createdAt: queryIdentities.createdAt
			});
		return toView(row);
	} catch (err) {
		if (isUniqueViolation(err)) throw new AuthError(409, '该查询账号已被其他账号验证绑定');
		throw err;
	}
}

export async function refreshVerifyCode(userId: number, identityId: number): Promise<IdentityView> {
	const code = randomVerifyCode();
	const expiresAt = new Date(Date.now() + VERIFY_TTL_MS);
	const [row] = await getDb()
		.update(queryIdentities)
		.set({ verifyCode: code, verifyExpiresAt: expiresAt })
		.where(
			and(
				eq(queryIdentities.id, identityId),
				eq(queryIdentities.userId, userId),
				eq(queryIdentities.verified, false)
			)
		)
		.returning({
			id: queryIdentities.id,
			platform: queryIdentities.platform,
			platformUserId: queryIdentities.platformUserId,
			verified: queryIdentities.verified,
			verifyCode: queryIdentities.verifyCode,
			verifyExpiresAt: queryIdentities.verifyExpiresAt,
			createdAt: queryIdentities.createdAt
		});
	if (!row) throw new AuthError(404, '查询账号不存在或已验证');
	return toView(row);
}

/**
 * Bot 提交验证码：匹配未过期的码后把该 QQ 标为已验证。
 * 同一 QQ 只允许一个已验证绑定。
 */
export async function verifyIdentityByCode(
	platform: IdentityPlatform,
	platformUserId: string,
	code: string
): Promise<{ userId: number; username: string }> {
	const trimmed = code.trim();
	if (!/^\d{6}$/.test(trimmed)) throw new AuthError(400, '验证码须为 6 位数字');
	const now = new Date();
	const [row] = await getDb()
		.select({
			id: queryIdentities.id,
			userId: queryIdentities.userId,
			username: users.username
		})
		.from(queryIdentities)
		.innerJoin(users, eq(queryIdentities.userId, users.id))
		.where(
			and(
				eq(queryIdentities.platform, platform),
				eq(queryIdentities.platformUserId, platformUserId),
				eq(queryIdentities.verifyCode, trimmed),
				eq(queryIdentities.verified, false),
				gt(queryIdentities.verifyExpiresAt, now)
			)
		)
		.limit(1);
	if (!row) throw new AuthError(400, '验证码无效或已过期');
	if (await anotherVerifiedExists(platform, platformUserId, row.userId)) {
		throw new AuthError(409, '该查询账号已被其他账号验证绑定');
	}
	try {
		await getDb()
			.update(queryIdentities)
			.set({ verified: true, verifyCode: null, verifyExpiresAt: null })
			.where(eq(queryIdentities.id, row.id));
	} catch (err) {
		if (isUniqueViolation(err)) throw new AuthError(409, '该查询账号已被其他账号验证绑定');
		throw err;
	}
	return { userId: row.userId, username: row.username };
}

/** 站长手动确认归属（Bot 尚未上线时的过渡手段） */
export async function adminMarkVerified(platformUserId: string, username?: string): Promise<void> {
	const qq = normalizeQq(platformUserId);
	if (!qq) throw new AuthError(400, 'QQ 号需为 4–12 位数字');
	const cond = [
		eq(queryIdentities.platform, 'qq'),
		eq(queryIdentities.platformUserId, qq),
		eq(queryIdentities.verified, false)
	];
	if (username) cond.push(eq(users.username, username));
	const rows = await getDb()
		.select({ id: queryIdentities.id, userId: queryIdentities.userId })
		.from(queryIdentities)
		.innerJoin(users, eq(queryIdentities.userId, users.id))
		.where(and(...cond))
		.limit(2);
	if (rows.length === 0) throw new AuthError(404, '未找到待验证的查询账号');
	if (rows.length > 1) throw new AuthError(400, '多个待验证记录，请同时提供用户名');
	const row = rows[0];
	if (await anotherVerifiedExists('qq', qq, row.userId)) {
		throw new AuthError(409, '该查询账号已被其他账号验证绑定');
	}
	try {
		await getDb()
			.update(queryIdentities)
			.set({ verified: true, verifyCode: null, verifyExpiresAt: null })
			.where(eq(queryIdentities.id, row.id));
	} catch (err) {
		if (isUniqueViolation(err)) throw new AuthError(409, '该查询账号已被其他账号验证绑定');
		throw err;
	}
}

export async function adminMarkOwnVerified(userId: number, identityId: number): Promise<void> {
	const [row] = await getDb()
		.select({
			id: queryIdentities.id,
			platform: queryIdentities.platform,
			platformUserId: queryIdentities.platformUserId
		})
		.from(queryIdentities)
		.where(and(eq(queryIdentities.id, identityId), eq(queryIdentities.userId, userId)))
		.limit(1);
	if (!row) throw new AuthError(404, '查询账号不存在');
	if (await anotherVerifiedExists(row.platform as IdentityPlatform, row.platformUserId, userId)) {
		throw new AuthError(409, '该查询账号已被其他账号验证绑定');
	}
	try {
		await getDb()
			.update(queryIdentities)
			.set({ verified: true, verifyCode: null, verifyExpiresAt: null })
			.where(eq(queryIdentities.id, row.id));
	} catch (err) {
		if (isUniqueViolation(err)) throw new AuthError(409, '该查询账号已被其他账号验证绑定');
		throw err;
	}
}

export async function removeIdentity(userId: number, identityId: number): Promise<void> {
	const res = await getDb()
		.delete(queryIdentities)
		.where(and(eq(queryIdentities.id, identityId), eq(queryIdentities.userId, userId)))
		.returning({ id: queryIdentities.id });
	if (res.length === 0) throw new AuthError(404, '查询账号不存在');
}

/** 查询账号 → 本站账号（查分接口按此把检索 ID 路由到数据归属者） */
export async function resolveIdentity(
	platform: IdentityPlatform,
	platformUserId: string
): Promise<{ userId: number; username: string } | null> {
	const [row] = await getDb()
		.select({ userId: queryIdentities.userId, username: users.username })
		.from(queryIdentities)
		.innerJoin(users, eq(queryIdentities.userId, users.id))
		.where(
			and(eq(queryIdentities.platform, platform), eq(queryIdentities.platformUserId, platformUserId))
		)
		.limit(1);
	return row ?? null;
}

export interface QueryTargetRecord {
	userId: number;
	verified: boolean;
	botQueryPublic: boolean;
}

export async function resolveIdentityForQuery(
	platform: IdentityPlatform,
	platformUserId: string
): Promise<QueryTargetRecord | null> {
	const [row] = await getDb()
		.select({
			userId: queryIdentities.userId,
			verified: queryIdentities.verified,
			botQueryPublic: users.botQueryPublic
		})
		.from(queryIdentities)
		.innerJoin(users, eq(queryIdentities.userId, users.id))
		.where(
			and(eq(queryIdentities.platform, platform), eq(queryIdentities.platformUserId, platformUserId))
		)
		.orderBy(sql`${queryIdentities.verified} DESC`)
		.limit(1);
	return row ?? null;
}

export interface PlayerProfile {
	id: number;
	username: string;
	profilePublic: boolean;
	createdAt: string;
	isOwner: boolean;
}

/** 档案页 / 排行榜 / 对比：仅 profilePublic 打开的用户 */
export async function findPublicPlayer(
	username: string
): Promise<{ id: number; username: string } | null> {
	const player = await findPlayerForViewer(username, null);
	return player ? { id: player.id, username: player.username } : null;
}

/** 档案页：公开对访客可见；未公开时主人仍可预览 */
export async function findPlayerForViewer(
	username: string,
	viewerId: number | null
): Promise<PlayerProfile | null> {
	if (!username) return null;
	const [user] = await getDb()
		.select({
			id: users.id,
			username: users.username,
			profilePublic: users.profilePublic,
			createdAt: users.createdAt
		})
		.from(users)
		.where(eq(users.username, username))
		.limit(1);
	if (!user) return null;
	const isOwner = viewerId === user.id;
	if (!canViewPlayerProfile(user.profilePublic, isOwner)) return null;
	return {
		id: user.id,
		username: user.username,
		profilePublic: user.profilePublic,
		createdAt: user.createdAt.toISOString(),
		isOwner
	};
}
