import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AuthError } from '$lib/server/auth';
import { createApp, listApps } from '$lib/server/developer';
import { errorResponse, requireSessionUser } from '$lib/server/api';

export const GET: RequestHandler = async ({ cookies }) => {
	try {
		const user = await requireSessionUser(cookies);
		return json({ apps: await listApps(user.id) });
	} catch (err) {
		return errorResponse(err);
	}
};

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const user = await requireSessionUser(cookies);
		const body = (await request.json()) as { name?: unknown };
		if (typeof body.name !== 'string') throw new AuthError(400, '需要 name 字段');
		const result = await createApp(user.id, body.name);
		return json(result, { status: 201 });
	} catch (err) {
		return errorResponse(err);
	}
};
