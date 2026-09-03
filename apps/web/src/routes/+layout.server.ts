import type { LayoutServerLoad } from './$types';
import { isAdminUsername } from '$lib/server/config';

export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		user: locals.user,
		isAdmin: locals.user ? isAdminUsername(locals.user.username) : false
	};
};
