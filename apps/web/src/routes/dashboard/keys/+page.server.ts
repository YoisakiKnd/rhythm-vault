import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { AuthError, createApiKey, listApiKeys, revokeApiKey } from '$lib/server/auth';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();
	const keys = await listApiKeys(user.id);
	return {
		keys: keys.map((k) => ({
			...k,
			createdAt: k.createdAt.toISOString(),
			lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
			revokedAt: k.revokedAt?.toISOString() ?? null
		}))
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: '未登录' });
		const name = String((await request.formData()).get('name') ?? '');
		try {
			const key = await createApiKey(user.id, name);
			return { plaintext: key.plaintext };
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
	}
};
