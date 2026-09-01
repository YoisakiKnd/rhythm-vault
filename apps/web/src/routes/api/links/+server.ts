import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAppConfig } from '$lib/server/config';
import { getLinked, LINK_SOURCES } from '$lib/server/links';
import { errorResponse, requireSessionUser } from '$lib/server/api';

export const GET: RequestHandler = async ({ cookies }) => {
	try {
		const user = await requireSessionUser(cookies);
		const cfg = getAppConfig();
		const links = await Promise.all(LINK_SOURCES.map((s) => getLinked(user.id, s)));
		return json({
			links,
			oauthConfigured: { divingfish: !!cfg.divingFish, lxns: !!cfg.lxns }
		});
	} catch (err) {
		return errorResponse(err);
	}
};
