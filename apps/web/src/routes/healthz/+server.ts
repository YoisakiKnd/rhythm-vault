import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, sql } from '@rhythm-vault/db';

export const GET: RequestHandler = async () => {
	try {
		await getDb().execute(sql`SELECT 1`);
		return json({ ok: true, db: true });
	} catch {
		return json({ ok: false, db: false }, { status: 503 });
	}
};
