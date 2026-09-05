import { getDb, ratingSnapshots, users, desc, eq, and, sql } from '@rhythm-vault/db';
import { parseButtonParam, parseGameParam } from '$lib/server/score-view';
import type { PageServerLoad } from './$types';

const DB_GAME: Record<string, string> = { maimai: 'maimai_dx', chunithm: 'chunithm', djmax: 'djmax' };

export const load: PageServerLoad = async ({ url }) => {
	const game = parseGameParam(url.searchParams.get('game'));
	const button = parseButtonParam(url.searchParams.get('button'));
	const db = getDb();

	const gameFilter = eq(ratingSnapshots.game, DB_GAME[game]);
	const publicFilter = eq(users.profilePublic, true);
	const buttonFilter =
		game === 'djmax'
			? sql`coalesce((${ratingSnapshots.detail}->>'button')::int, 4) = ${button}`
			: undefined;

	const latest = db
		.selectDistinctOn([ratingSnapshots.userId], {
			userId: ratingSnapshots.userId,
			username: users.username,
			rating: ratingSnapshots.rating,
			at: ratingSnapshots.createdAt
		})
		.from(ratingSnapshots)
		.innerJoin(users, eq(users.id, ratingSnapshots.userId))
		.where(and(gameFilter, publicFilter, buttonFilter))
		.orderBy(ratingSnapshots.userId, desc(ratingSnapshots.createdAt))
		.as('latest');

	const rows = await db.select().from(latest).orderBy(desc(latest.rating)).limit(100);

	const top = rows.map((r, i) => ({
		rank: i + 1,
		username: r.username,
		rating: r.rating,
		at: r.at.toISOString()
	}));

	return { game, button, top };
};
