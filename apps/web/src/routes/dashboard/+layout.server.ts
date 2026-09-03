import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (url.pathname.startsWith('/dashboard/scores')) {
		redirect(301, `/scores${url.search}`);
	}
	if (url.pathname.startsWith('/dashboard/progress')) {
		redirect(301, `/progress${url.search}`);
	}
	if (url.pathname === '/dashboard/keys' || url.pathname.startsWith('/dashboard/keys/')) {
		redirect(301, '/dashboard/developer');
	}
	if (!locals.user) redirect(302, '/login');
	return { user: locals.user };
};
