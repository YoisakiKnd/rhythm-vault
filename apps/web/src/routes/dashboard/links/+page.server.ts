import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { AuthError } from '$lib/server/auth';
import { getAppConfig } from '$lib/server/config';
import {
	assertSource,
	bindExternal,
	getLinked,
	LINK_SOURCES,
	previewExternal,
	unbind
} from '$lib/server/links';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();
	const cfg = getAppConfig();
	const links = await Promise.all(LINK_SOURCES.map((s) => getLinked(user.id, s)));
	return {
		links,
		oauthConfigured: { divingfish: !!cfg.divingFish, lxns: !!cfg.lxns }
	};
};

export const actions: Actions = {
	bind: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: '未登录' });
		const form = await request.formData();
		const source = assertSource(String(form.get('source') ?? ''));
		const externalId = String(form.get('externalId') ?? '');
		const confirmed = String(form.get('confirm') ?? '') === '1';
		try {
			if (!confirmed) {
				const preview = await previewExternal(source, externalId);
				return { preview };
			}
			await bindExternal(user.id, source, externalId);
			return { ok: true };
		} catch (err) {
			return fail(err instanceof AuthError ? err.status : 400, {
				error: err instanceof AuthError ? err.message : '绑定失败'
			});
		}
	},
	unbind: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: '未登录' });
		const form = await request.formData();
		try {
			await unbind(user.id, assertSource(String(form.get('source') ?? '')));
			return { ok: true };
		} catch (err) {
			return fail(err instanceof AuthError ? err.status : 400, {
				error: err instanceof AuthError ? err.message : '解绑失败'
			});
		}
	}
};
