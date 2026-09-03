import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { AuthError } from '$lib/server/auth';
import { isAdminUsername } from '$lib/server/config';
import {
	approveApplication,
	listApplicationsForAdmin,
	rejectApplication,
	revokeDeveloperAccess
} from '$lib/server/developer';
import { adminMarkVerified } from '$lib/server/identities';

export const load: PageServerLoad = async () => {
	const applications = await listApplicationsForAdmin();
	return {
		pendingCount: applications.filter((a) => a.status === 'pending').length,
		applications
	};
};

export const actions: Actions = {
	approve: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: '未登录' });
		if (!isAdminUsername(user.username)) return fail(403, { error: '没有权限' });
		const form = await request.formData();
		try {
			await approveApplication(Number(form.get('id')), user.username, String(form.get('note') ?? ''));
			return { ok: true, message: '已通过，对方可在开发者页创建 Bot Key' };
		} catch (err) {
			return fail(err instanceof AuthError ? err.status : 400, {
				error: err instanceof AuthError ? err.message : '操作失败'
			});
		}
	},
	reject: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: '未登录' });
		if (!isAdminUsername(user.username)) return fail(403, { error: '没有权限' });
		const form = await request.formData();
		try {
			await rejectApplication(Number(form.get('id')), user.username, String(form.get('note') ?? ''));
			return { ok: true, message: '已拒绝' };
		} catch (err) {
			return fail(err instanceof AuthError ? err.status : 400, {
				error: err instanceof AuthError ? err.message : '操作失败'
			});
		}
	},
	revokeAccess: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: '未登录' });
		if (!isAdminUsername(user.username)) return fail(403, { error: '没有权限' });
		const form = await request.formData();
		try {
			const { downgradedKeys } = await revokeDeveloperAccess(
				Number(form.get('id')),
				user.username,
				String(form.get('note') ?? '')
			);
			return { ok: true, message: `已收回权限，${downgradedKeys} 把 Bot Key 已降为仅查自己` };
		} catch (err) {
			return fail(err instanceof AuthError ? err.status : 400, {
				error: err instanceof AuthError ? err.message : '操作失败'
			});
		}
	},
	markVerified: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: '未登录' });
		if (!isAdminUsername(user.username)) return fail(403, { error: '没有权限' });
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
