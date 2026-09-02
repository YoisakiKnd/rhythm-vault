import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	AuthError,
	createApiKey,
	listApiKeys,
	MAX_BOT_KEYS_PER_USER,
	revokeApiKey
} from '$lib/server/auth';
import { isAdminUsername } from '$lib/server/config';
import {
	applicationStatusLabel,
	canIssueBotKey,
	createBotApiKey,
	getLatestApplication,
	submitApplication
} from '$lib/server/developer';
import { takeToken } from '$lib/server/rate-limit';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();
	const isAdmin = isAdminUsername(user.username);
	const [keys, application] = await Promise.all([listApiKeys(user.id), getLatestApplication(user.id)]);
	const activeBotKeys = keys.filter((k) => k.scope === 'bot' && !k.revokedAt).length;
	return {
		isAdmin,
		canCreateBot: canIssueBotKey(application?.status ?? null, isAdmin),
		application,
		applicationStatusLabel: application ? applicationStatusLabel(application.status) : null,
		maxBotKeys: MAX_BOT_KEYS_PER_USER,
		activeBotKeys,
		keys: keys.map((k) => ({
			...k,
			createdAt: k.createdAt.toISOString(),
			lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
			revokedAt: k.revokedAt?.toISOString() ?? null
		}))
	};
};

export const actions: Actions = {
	createKey: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: '未登录' });
		const name = String((await request.formData()).get('name') ?? '');
		try {
			const key = await createApiKey(user.id, name);
			return { plaintext: key.plaintext, kind: 'self' as const };
		} catch (err) {
			return fail(err instanceof AuthError ? err.status : 400, {
				error: err instanceof AuthError ? err.message : '创建失败'
			});
		}
	},
	createBotKey: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: '未登录' });
		const name = String((await request.formData()).get('name') ?? '');
		try {
			const key = await createBotApiKey(user.id, user.username, name);
			return { plaintext: key.plaintext, kind: 'bot' as const };
		} catch (err) {
			return fail(err instanceof AuthError ? err.status : 400, {
				error: err instanceof AuthError ? err.message : '创建失败'
			});
		}
	},
	revoke: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: '未登录' });
		const id = Number((await request.formData()).get('id'));
		try {
			await revokeApiKey(user.id, id);
			return { ok: true };
		} catch (err) {
			return fail(err instanceof AuthError ? err.status : 400, {
				error: err instanceof AuthError ? err.message : '吊销失败'
			});
		}
	},
	apply: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: '未登录' });
		if (!takeToken(`dev-apply:${user.id}`, 3, 60 * 60_000)) {
			return fail(429, { error: '提交过于频繁，请稍后再试' });
		}
		const form = await request.formData();
		try {
			await submitApplication(user.id, {
				name: form.get('name'),
				purpose: form.get('purpose'),
				contact: form.get('contact'),
				homepage: form.get('homepage')
			});
			return { ok: true, message: '申请已提交，请等待站长审批' };
		} catch (err) {
			return fail(err instanceof AuthError ? err.status : 400, {
				error: err instanceof AuthError ? err.message : '提交失败'
			});
		}
	}
};
