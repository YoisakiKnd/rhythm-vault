import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AuthError, revokeApiKey } from '$lib/server/auth';
import { errorResponse, requireSessionUser } from '$lib/server/api';

export const DELETE: RequestHandler = async ({ params, cookies }) => {
	try {
		const user = await requireSessionUser(cookies);
		const id = Number(params.id);
		if (!Number.isInteger(id)) throw new AuthError(400, '无效的 Key ID');
		await revokeApiKey(user.id, id);
		return json({ ok: true });
	} catch (err) {
		return errorResponse(err);
	}
};
