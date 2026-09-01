import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AuthError } from '$lib/server/auth';
import { addIdentity, assertIdentityPlatform, listIdentities } from '$lib/server/identities';
import { errorResponse, requireSessionUser } from '$lib/server/api';

export const GET: RequestHandler = async ({ cookies }) => {
	try {
		const user = await requireSessionUser(cookies);
		return json({ identities: await listIdentities(user.id) });
	} catch (err) {
		return errorResponse(err);
	}
};

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const user = await requireSessionUser(cookies);
		const body = (await request.json()) as { platform?: unknown; platformUserId?: unknown };
		if (typeof body.platform !== 'string' || typeof body.platformUserId !== 'string') {
			throw new AuthError(400, '需要 platform 和 platformUserId 字段');
		}
		const identity = await addIdentity(
			user.id,
			assertIdentityPlatform(body.platform),
			body.platformUserId
		);
		return json({ identity }, { status: 201 });
	} catch (err) {
		return errorResponse(err);
	}
};
