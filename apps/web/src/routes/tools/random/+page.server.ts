import type { PageServerLoad } from './$types';
import { isGameKey } from '$lib/catalog-nav';
import { parseRandomQuery, pickRandomCharts } from '$lib/server/random-pick';
import { getLibrary } from '$lib/server/library';

export const load: PageServerLoad = async ({ url }) => {
	const gameParam = url.searchParams.get('game');
	const game = isGameKey(gameParam) ? gameParam : 'maimai';
	const rolled = url.searchParams.has('min') || url.searchParams.has('count');
	if (!rolled) {
		return {
			game,
			min: '12',
			max: '14.5',
			count: '3',
			onlyNew: false,
			rolled: false,
			results: [] as Awaited<ReturnType<typeof pickRandomCharts>>['results'],
			candidates: 0,
			error: ''
		};
	}
	const parsed = parseRandomQuery(url.searchParams);
	if (!parsed.ok) {
		return {
			game,
			min: url.searchParams.get('min') ?? '12',
			max: url.searchParams.get('max') ?? '14.5',
			count: url.searchParams.get('count') ?? '3',
			onlyNew: url.searchParams.get('new') === '1',
			rolled: true,
			results: [],
			candidates: 0,
			error: parsed.error
		};
	}
	const picked = pickRandomCharts(getLibrary(parsed.query.game), parsed.query);
	return {
		game: parsed.query.game,
		min: String(parsed.query.min),
		max: String(parsed.query.max),
		count: String(parsed.query.count),
		onlyNew: parsed.query.onlyNew,
		rolled: true,
		results: picked.results,
		candidates: picked.candidates,
		error: ''
	};
};
