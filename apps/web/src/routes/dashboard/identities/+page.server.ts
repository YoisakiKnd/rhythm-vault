import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { AuthError } from '$lib/server/auth';
import { isAdminUsername } from '$lib/server/config';
import {
	addIdentity,
	adminMarkOwnVerified,
	listIdentities,
	refreshVerifyCode,
	removeIdentity
} from '$lib/server/identities';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();
	return { identities: await listIdentities(user.id), isAdmin: isAdminUsername(user.username) };
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: '未登录' });
		const platformUserId = String((await request.formData()).get('platformUserId') ?? '');
		try {
			const identity = await addIdentity(user.id, 'qq', platformUserId);
			return {
				message: identity.verifyCode
					? `已登记。请在 Bot 私聊发送验证码 ${identity.verifyCode}（10 分钟内有效）`
					: '已登记'
			};
		} catch (err) {
			return fail(err instanceof AuthError ? err.status : 400, {
				error: err instanceof AuthError ? err.message : '添加失败'
			});
		}
	},
	refresh: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: '未登录' });
		const id = Number((await request.formData()).get('id'));
		try {
			const identity = await refreshVerifyCode(user.id, id);
			return {
				message: identity.verifyCode
					? `新验证码 ${identity.verifyCode}（10 分钟内有效）`
					: '已刷新验证码'
			};
		} catch (err) {
			return fail(err instanceof AuthError ? err.status : 400, {
				error: err instanceof AuthError ? err.message : '刷新失败'
			});
		}
	},
	markVerified: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: '未登录' });
		if (!isAdminUsername(user.username)) return fail(403, { error: '仅站长可手动确认归属' });
		const id = Number((await request.formData()).get('id'));
		try {
			await adminMarkOwnVerified(user.id, id);
			return { message: '已标记为已验证' };
		} catch (err) {
			return fail(err instanceof AuthError ? err.status : 400, {
				error: err instanceof AuthError ? err.message : '操作失败'
			});
		}
	},
	remove: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: '未登录' });
		const id = Number((await request.formData()).get('id'));
		try {
			await removeIdentity(user.id, id);
			return { ok: true };
		} catch (err) {
			return fail(err instanceof AuthError ? err.status : 400, {
				error: err instanceof AuthError ? err.message : '移除失败'
			});
		}
	}
};
