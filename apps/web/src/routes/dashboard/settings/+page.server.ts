import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	AuthError,
	changePassword,
	destroyAllSessions,
	getAccountProfile,
	SESSION_COOKIE,
	setBotQueryPublic,
	setProfilePublic
} from '$lib/server/auth';
import { registerPasswordMismatch } from '$lib/server/http-guard';
import { takeToken } from '$lib/server/rate-limit';
import { latestRatingsByGame } from '$lib/server/scores';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();
	const [account, ratings] = await Promise.all([
		getAccountProfile(user.id),
		latestRatingsByGame(user.id)
	]);
	return { account, ratings };
};

export const actions: Actions = {
	privacy: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: '未登录' });
		const on = String((await request.formData()).get('profilePublic') ?? '') === 'on';
		await setProfilePublic(user.id, on);
		return { ok: true, message: on ? '档案已公开' : '档案已设为仅自己可见' };
	},
	botQuery: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: '未登录' });
		const on = String((await request.formData()).get('botQueryPublic') ?? '') === 'on';
		await setBotQueryPublic(user.id, on);
		return { ok: true, message: on ? '已允许 Bot 查询' : '已关闭 Bot 查询' };
	},
	password: async ({ request, locals, cookies }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: '未登录' });
		if (!takeToken(`passwd:${user.id}`, 5, 15 * 60_000)) {
			return fail(429, { error: '尝试次数过多，请 15 分钟后再试' });
		}
		const form = await request.formData();
		const current = String(form.get('current') ?? '');
		const next = String(form.get('next') ?? '');
		const confirm = String(form.get('confirm') ?? '');
		const mismatch = registerPasswordMismatch(next, confirm);
		if (mismatch) return fail(400, { error: mismatch });
		try {
			await changePassword(user.id, current, next);
		} catch (err) {
			return fail(err instanceof AuthError ? err.status : 400, {
				error: err instanceof AuthError ? err.message : '修改失败'
			});
		}
		cookies.delete(SESSION_COOKIE, { path: '/' });
		redirect(302, '/login?notice=password');
	},
	logoutAll: async ({ locals, cookies }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: '未登录' });
		await destroyAllSessions(user.id);
		cookies.delete(SESSION_COOKIE, { path: '/' });
		redirect(302, '/login?notice=sessions');
	}
};
