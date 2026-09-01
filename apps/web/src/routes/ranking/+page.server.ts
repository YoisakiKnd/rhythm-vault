import { getDb, ratingSnapshots, users, desc, eq, and } from '@rhythm-vault/db';
import type { PageServerLoad } from './$types';

const DB_GAME: Record<string, string> = { maimai: 'maimai_dx', chunithm: 'chunithm', djmax: 'djmax' };

export const load: PageServerLoad = async ({ url }) => {
	const gameParam = url.searchParams.get('game') ?? 'maimai';
	const game = (['maimai', 'chunithm', 'djmax'].includes(gameParam) ? gameParam : 'maimai') as
		| 'maimai'
		| 'chunithm'
		| 'djmax';
	const db = getDb();

	const latest = db
		.selectDistinctOn([ratingSnapshots.userId], {
			userId: ratingSnapshots.userId,
			username: users.username,
			rating: ratingSnapshots.rating,
			at: ratingSnapshots.createdAt
		})
		.from(ratingSnapshots)
		.innerJoin(users, eq(users.id, ratingSnapshots.userId))
		.where(and(eq(ratingSnapshots.game, DB_GAME[game]), eq(users.profilePublic, true)))
		.orderBy(ratingSnapshots.userId, desc(ratingSnapshots.createdAt))
		.as('latest');

	const rows = await db.select().from(latest).orderBy(desc(latest.rating)).limit(100);

	const top = rows.map((r, i) => ({
		rank: i + 1,
		username: r.username,
		rating: r.rating,
		at: r.at.toISOString()
	}));

	return { game, top };
};
