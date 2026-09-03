import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { AuthError } from '$lib/server/auth';
import {
	parseDjmaxManualForm,
	saveDjmaxManualScore,
	searchDjmaxSongs
} from '$lib/server/djmax-manual';
import { takeToken } from '$lib/server/rate-limit';
import { DJMAX_MANUAL_SAVED } from '$lib/copy';

export const load: PageServerLoad = async ({ url }) => {
	const q = url.searchParams.get('q') ?? '';
	const button = Number(url.searchParams.get('button') ?? '4');
	const b = [4, 5, 6, 8].includes(button) ? button : 4;
	const songs = q.trim() ? searchDjmaxSongs(q, b, 30) : [];
	return { q, button: b, songs };
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: '未登录' });
		if (!takeToken(`djmax-manual:${user.id}`, 30, 60_000)) {
			return fail(429, { error: '录入过于频繁，请稍后再试' });
		}
		try {
			const input = parseDjmaxManualForm(await request.formData());
			const result = await saveDjmaxManualScore(user.id, input);
			return {
				ok: true,
				message: DJMAX_MANUAL_SAVED,
				result
			};
		} catch (err) {
			return fail(err instanceof AuthError ? err.status : 400, {
				error: err instanceof AuthError ? err.message : '保存失败'
			});
		}
	}
};
