import {
	apiKeys,
	apps,
	developerApplications,
	getDb,
	users,
	and,
	count,
	desc,
	eq,
	sql
} from '@rhythm-vault/db';
import {
	AuthError,
	createApiKey,
	downgradeBotKeysForUser,
	MAX_APPS_PER_USER
} from './auth';
import { isAdminUsername } from './config';

export const APPLICATION_STATUSES = ['pending', 'approved', 'rejected', 'revoked'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const PURPOSE_MIN = 16;
export const PURPOSE_MAX = 500;

export interface ApplicationInput {
	name: string;
	purpose: string;
	contact: string | null;
	homepage: string | null;
}

export interface ApplicationView {
	id: number;
	name: string;
	purpose: string;
	contact: string | null;
	homepage: string | null;
	status: ApplicationStatus;
	reviewNote: string | null;
	reviewedBy: string | null;
	reviewedAt: string | null;
	createdAt: string;
}

export interface AdminApplicationView extends ApplicationView {
	userId: number;
	username: string;
}

export interface AppView {
	id: number;
	name: string;
	createdAt: string;
	keys: Array<{ id: number; prefix: string; scope: string; revokedAt: string | null }>;
}

export function isApplicationStatus(v: string): v is ApplicationStatus {
	return (APPLICATION_STATUSES as readonly string[]).includes(v);
}

export function canIssueBotKey(status: ApplicationStatus | null, isAdmin: boolean): boolean {
	return isAdmin || status === 'approved';
}

export function applicationStatusLabel(status: ApplicationStatus): string {
	switch (status) {
		case 'pending':
			return '审批中';
		case 'approved':
			return '已通过';
		case 'rejected':
			return '未通过';
		case 'revoked':
			return '已收回';
	}
}

function trimOrNull(v: string, max: number): string | null {
	const s = v.trim();
	if (!s) return null;
	if (s.length > max) throw new AuthError(400, `长度不能超过 ${max} 字符`);
	return s;
}

export function parseApplicationForm(raw: {
	name?: unknown;
	purpose?: unknown;
	contact?: unknown;
	homepage?: unknown;
}): ApplicationInput {
	const name = String(raw.name ?? '').trim();
	if (!name || name.length > 64) throw new AuthError(400, '应用名称需 1–64 字符');
	const purpose = String(raw.purpose ?? '').trim();
	if (purpose.length < PURPOSE_MIN || purpose.length > PURPOSE_MAX) {
		throw new AuthError(400, `用途说明需 ${PURPOSE_MIN}–${PURPOSE_MAX} 字，请写清 Bot / 工具做什么`);
	}
	const contact = trimOrNull(String(raw.contact ?? ''), 128);
	const homepageRaw = String(raw.homepage ?? '').trim();
	let homepage: string | null = null;
	if (homepageRaw) {
		if (homepageRaw.length > 256) throw new AuthError(400, '主页链接过长');
		let url: URL;
		try {
			url = new URL(homepageRaw);
		} catch {
			throw new AuthError(400, '主页需为 http(s) 链接');
		}
		if (url.protocol !== 'http:' && url.protocol !== 'https:') {
			throw new AuthError(400, '主页需为 http(s) 链接');
		}
		homepage = url.toString();
	}
	return { name, purpose, contact, homepage };
}

function toView(row: {
	id: number;
	name: string;
	purpose: string;
	contact: string | null;
	homepage: string | null;
	status: string;
	reviewNote: string | null;
	reviewedBy: string | null;
	reviewedAt: Date | null;
	createdAt: Date;
}): ApplicationView {
	return {
		id: row.id,
		name: row.name,
		purpose: row.purpose,
		contact: row.contact,
		homepage: row.homepage,
		status: isApplicationStatus(row.status) ? row.status : 'pending',
		reviewNote: row.reviewNote,
		reviewedBy: row.reviewedBy,
		reviewedAt: row.reviewedAt?.toISOString() ?? null,
		createdAt: row.createdAt.toISOString()
	};
}

export async function getLatestApplication(userId: number): Promise<ApplicationView | null> {
	const [row] = await getDb()
		.select()
		.from(developerApplications)
		.where(eq(developerApplications.userId, userId))
		.orderBy(desc(developerApplications.id))
		.limit(1);
	return row ? toView(row) : null;
}

export async function userCanCreateBotKey(userId: number, username: string): Promise<boolean> {
	if (isAdminUsername(username)) return true;
	const [row] = await getDb()
		.select({ id: developerApplications.id })
		.from(developerApplications)
		.where(
			and(eq(developerApplications.userId, userId), eq(developerApplications.status, 'approved'))
		)
		.limit(1);
	return Boolean(row);
}

export async function submitApplication(
	userId: number,
	raw: { name?: unknown; purpose?: unknown; contact?: unknown; homepage?: unknown }
): Promise<ApplicationView> {
	const input = parseApplicationForm(raw);
	const latest = await getLatestApplication(userId);
	if (latest?.status === 'pending') throw new AuthError(409, '已有申请在审批中，请等待结果');
	if (latest?.status === 'approved') throw new AuthError(409, '已有通过的开发者权限，无需重复申请');

	try {
		const [row] = await getDb()
			.insert(developerApplications)
			.values({
				userId,
				name: input.name,
				purpose: input.purpose,
				contact: input.contact,
				homepage: input.homepage
			})
			.returning();
		return toView(row);
	} catch (err) {
		if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505') {
			throw new AuthError(409, '已有申请在审批中或已通过，请勿重复提交');
		}
		throw err;
	}
}

export async function createBotApiKey(
	userId: number,
	username: string,
	name: string
): Promise<{ plaintext: string; prefix: string }> {
	if (!(await userCanCreateBotKey(userId, username))) {
		throw new AuthError(403, '需要通过开发者申请后才能创建 Bot Key');
	}
	return createApiKey(userId, name, null, 'bot');
}

export async function listApplicationsForAdmin(): Promise<AdminApplicationView[]> {
	const rows = await getDb()
		.select({
			id: developerApplications.id,
			userId: developerApplications.userId,
			username: users.username,
			name: developerApplications.name,
			purpose: developerApplications.purpose,
			contact: developerApplications.contact,
			homepage: developerApplications.homepage,
			status: developerApplications.status,
			reviewNote: developerApplications.reviewNote,
			reviewedBy: developerApplications.reviewedBy,
			reviewedAt: developerApplications.reviewedAt,
			createdAt: developerApplications.createdAt
		})
		.from(developerApplications)
		.innerJoin(users, eq(developerApplications.userId, users.id))
		.orderBy(
			sql`case when ${developerApplications.status} = 'pending' then 0 else 1 end`,
			desc(developerApplications.createdAt)
		);
	return rows.map((r) => ({
		...toView(r),
		userId: r.userId,
		username: r.username
	}));
}

async function loadApplication(id: number) {
	const [row] = await getDb()
		.select()
		.from(developerApplications)
		.where(eq(developerApplications.id, id))
		.limit(1);
	if (!row) throw new AuthError(404, '申请不存在');
	return row;
}

export async function approveApplication(
	id: number,
	reviewer: string,
	note?: string
): Promise<void> {
	const row = await loadApplication(id);
	if (row.status !== 'pending') throw new AuthError(409, '只能审批待处理的申请');
	const res = await getDb()
		.update(developerApplications)
		.set({
			status: 'approved',
			reviewNote: note?.trim() || null,
			reviewedBy: reviewer,
			reviewedAt: new Date(),
			updatedAt: new Date()
		})
		.where(and(eq(developerApplications.id, id), eq(developerApplications.status, 'pending')))
		.returning({ id: developerApplications.id });
	if (res.length === 0) throw new AuthError(409, '申请状态已变化，请刷新');
}

export async function rejectApplication(id: number, reviewer: string, note: string): Promise<void> {
	const trimmed = note.trim();
	if (!trimmed) throw new AuthError(400, '拒绝时请填写原因，方便对方修改后重提');
	const row = await loadApplication(id);
	if (row.status !== 'pending') throw new AuthError(409, '只能审批待处理的申请');
	const res = await getDb()
		.update(developerApplications)
		.set({
			status: 'rejected',
			reviewNote: trimmed,
			reviewedBy: reviewer,
			reviewedAt: new Date(),
			updatedAt: new Date()
		})
		.where(and(eq(developerApplications.id, id), eq(developerApplications.status, 'pending')))
		.returning({ id: developerApplications.id });
	if (res.length === 0) throw new AuthError(409, '申请状态已变化，请刷新');
}

export async function revokeDeveloperAccess(
	id: number,
	reviewer: string,
	note: string
): Promise<{ downgradedKeys: number }> {
	const trimmed = note.trim();
	if (!trimmed) throw new AuthError(400, '收回权限时请填写原因');
	const row = await loadApplication(id);
	if (row.status !== 'approved') throw new AuthError(409, '只能收回已通过的开发者权限');
	const res = await getDb()
		.update(developerApplications)
		.set({
			status: 'revoked',
			reviewNote: trimmed,
			reviewedBy: reviewer,
			reviewedAt: new Date(),
			updatedAt: new Date()
		})
		.where(and(eq(developerApplications.id, id), eq(developerApplications.status, 'approved')))
		.returning({ userId: developerApplications.userId });
	if (res.length === 0) throw new AuthError(409, '申请状态已变化，请刷新');
	const downgradedKeys = await downgradeBotKeysForUser(res[0].userId);
	return { downgradedKeys };
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
