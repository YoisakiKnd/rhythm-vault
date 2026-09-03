import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { isAdminUsername } from '$lib/server/config';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');
	if (!isAdminUsername(locals.user.username)) error(403, '没有权限访问管理后台');
	return { user: locals.user };
};
