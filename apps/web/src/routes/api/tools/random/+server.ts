import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { pickRandomFromParams } from '$lib/server/random-pick';

/**
 * 随机选曲（公开端点，无需鉴权）：
 * GET /api/tools/random?game=maimai&min=13&max=14.5&new=1&count=3
 */
export const GET: RequestHandler = ({ url }) => {
	try {
		const body = pickRandomFromParams(url.searchParams);
		if (body.error) return json({ error: body.error }, { status: 400 });
		return json({ game: body.game, candidates: body.candidates, results: body.results });
	} catch {
		return json({ error: '曲库暂时不可用' }, { status: 500 });
	}
};
