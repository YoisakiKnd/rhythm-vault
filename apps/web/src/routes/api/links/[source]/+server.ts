import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AuthError } from '$lib/server/auth';
import { assertSource, bindExternal, unbind } from '$lib/server/links';
import { errorResponse, requireSessionUser } from '$lib/server/api';

export const PUT: RequestHandler = async ({ params, request, cookies }) => {
	try {
		const source = assertSource(params.source);
		const user = await requireSessionUser(cookies);
		const body = (await request.json()) as { externalId?: unknown };
		if (typeof body.externalId !== 'string') throw new AuthError(400, '需要 externalId 字段');
		await bindExternal(user.id, source, body.externalId);
		return json({ ok: true });
	} catch (err) {
		return errorResponse(err);
	}
};

export const DELETE: RequestHandler = async ({ params, cookies }) => {
	try {
		const source = assertSource(params.source);
		const user = await requireSessionUser(cookies);
		await unbind(user.id, source);
		return json({ ok: true });
	} catch (err) {
		return errorResponse(err);
	}
};
