import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AuthError, createApiKey, listApiKeys } from '$lib/server/auth';
import { errorResponse, requireSessionUser } from '$lib/server/api';

export const GET: RequestHandler = async ({ cookies }) => {
	try {
		const user = await requireSessionUser(cookies);
		return json({ keys: await listApiKeys(user.id) });
	} catch (err) {
		return errorResponse(err);
	}
};

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const user = await requireSessionUser(cookies);
		const body = (await request.json()) as { name?: unknown };
		if (typeof body.name !== 'string') throw new AuthError(400, '需要 name 字段');
		const key = await createApiKey(user.id, body.name);
		return json({ key }, { status: 201 });
	} catch (err) {
		return errorResponse(err);
	}
};
