import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireSessionUser } from '$lib/server/api';

/** 当前会话用户（导航栏状态用，未登录返回 {user: null}） */
export const GET: RequestHandler = async ({ cookies }) => {
	try {
		const user = await requireSessionUser(cookies);
		return json({ user });
	} catch {
		return json({ user: null });
	}
};
