import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { AuthError } from '$lib/server/auth';
import { getLinked, LINK_SOURCES } from '$lib/server/links';
import { runManualSync } from '$lib/server/sync';
import { takeToken } from '$lib/server/rate-limit';
import { latestScoreAt } from '@rhythm-vault/sync';
import { latestRatingsByGame } from '$lib/server/scores';
import { friendlySyncError } from '$lib/copy';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();
	const [links, ratings] = await Promise.all([
		Promise.all(LINK_SOURCES.map((s) => getLinked(user.id, s))),
		latestRatingsByGame(user.id)
	]);
	const lastSync = {
		maimai_dx: (await latestScoreAt(user.id, 'maimai_dx'))?.toISOString() ?? null,
		chunithm: (await latestScoreAt(user.id, 'chunithm'))?.toISOString() ?? null,
		djmax: (await latestScoreAt(user.id, 'djmax'))?.toISOString() ?? null
	};
	return {
		links,
		lastSync,
		ratings,
		profilePublic: user.profilePublic,
		username: user.username
	};
};

export const actions: Actions = {
	sync: async ({ locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: '未登录' });
		if (!takeToken(`sync:${user.id}`, 1, 5 * 60_000)) {
			return fail(429, { error: '手动同步冷却中，请 5 分钟后再试' });
		}
		try {
			const summary = await runManualSync(user.id);
			return { summary };
		} catch (err) {
			if (err instanceof AuthError) {
				return fail(err.status, { error: err.message });
			}
			return fail(500, { error: friendlySyncError(err) });
		}
	}
};
