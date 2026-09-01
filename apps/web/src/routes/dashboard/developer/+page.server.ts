import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { AuthError, isApiKeyScope, setApiKeyScope } from '$lib/server/auth';
import { isAdminUsername } from '$lib/server/config';
import { createApp, deleteApp, listApps } from '$lib/server/developer';
import { adminMarkVerified } from '$lib/server/identities';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();
	return { apps: await listApps(user.id), isAdmin: isAdminUsername(user.username) };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: '未登录' });
		const name = String((await request.formData()).get('name') ?? '');
		try {
			const created = await createApp(user.id, name);
			return { plaintext: created.key.plaintext };
		} catch (err) {
			return fail(err instanceof AuthError ? err.status : 400, {
				error: err instanceof AuthError ? err.message : '创建失败'
			});
		}
	},
	remove: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: '未登录' });
		const id = Number((await request.formData()).get('id'));
		try {
			await deleteApp(user.id, id);
			return { ok: true };
		} catch (err) {
			return fail(err instanceof AuthError ? err.status : 400, {
				error: err instanceof AuthError ? err.message : '删除失败'
			});
		}
	},
	setScope: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: '未登录' });
		if (!isAdminUsername(user.username)) return fail(403, { error: '仅站长可调整 Key 权限' });
		const form = await request.formData();
		const id = Number(form.get('id'));
		const scope = String(form.get('scope') ?? '');
		if (!isApiKeyScope(scope)) return fail(400, { error: '无效的权限范围' });
		try {
			await setApiKeyScope(user.id, id, scope);
			return { ok: true, message: scope === 'bot' ? '已设为 Bot Key' : '已设为仅查自己' };
		} catch (err) {
			return fail(err instanceof AuthError ? err.status : 400, {
				error: err instanceof AuthError ? err.message : '更新失败'
			});
		}
	},
	markVerified: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: '未登录' });
		if (!isAdminUsername(user.username)) return fail(403, { error: '仅站长可手动确认归属' });
		const form = await request.formData();
		const qq = String(form.get('qq') ?? '');
		const username = String(form.get('username') ?? '').trim();
		try {
			await adminMarkVerified(qq, username || undefined);
			return { ok: true, message: '已标记该 QQ 为已验证' };
		} catch (err) {
			return fail(err instanceof AuthError ? err.status : 400, {
				error: err instanceof AuthError ? err.message : '操作失败'
			});
		}
	}
};
