import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AuthError } from '$lib/server/auth';
import { errorResponse, requireSessionUser } from '$lib/server/api';
import { runManualSync } from '$lib/server/sync';
import { takeToken } from '$lib/server/rate-limit';
import { latestScoreAt } from '@rhythm-vault/sync';

export const GET: RequestHandler = async ({ cookies }) => {
	try {
		const user = await requireSessionUser(cookies);
		const lastSync = {
			maimai_dx: (await latestScoreAt(user.id, 'maimai_dx'))?.toISOString() ?? null,
			chunithm: (await latestScoreAt(user.id, 'chunithm'))?.toISOString() ?? null,
			djmax: (await latestScoreAt(user.id, 'djmax'))?.toISOString() ?? null
		};
		return json({ lastSync });
	} catch (err) {
		return errorResponse(err);
	}
};

export const POST: RequestHandler = async ({ cookies }) => {
	try {
		const user = await requireSessionUser(cookies);
		if (!takeToken(`sync:${user.id}`, 1, 5 * 60_000)) {
			throw new AuthError(429, '手动同步冷却中，请 5 分钟后再试');
		}
		const summary = await runManualSync(user.id);
		return json({ ok: true, summary });
	} catch (err) {
		return errorResponse(err);
	}
};
