import type { PageServerLoad } from './$types';
import { AuthError } from '$lib/server/auth';
import { catalogSrcLabel } from '$lib/server/channel';
import { LOAD_FAILED } from '$lib/copy';
import { parseCatalogSrc } from '$lib/catalog-nav';
import {
	chunithmProgress,
	djmaxProgress,
	maimaiProgress,
	type ProgressBucket
} from '$lib/server/progress';

export interface ProgressView {
	game: string;
	gameLabel: string;
	versionBuckets?: ProgressBucket[];
	levelBuckets?: ProgressBucket[];
	dlcBuckets?: ProgressBucket[];
}

export const load: PageServerLoad = async ({ url, parent }) => {
	const { user } = await parent();
	const gameParam = url.searchParams.get('game') ?? 'maimai';
	const game = (['maimai', 'chunithm', 'djmax'].includes(gameParam) ? gameParam : 'maimai') as
		| 'maimai'
		| 'chunithm'
		| 'djmax';
	const src = parseCatalogSrc(url.searchParams.get('src'));

	let data: ProgressView | null = null;
	let error: string | null = null;
	try {
		if (game === 'maimai') data = await maimaiProgress(user.id, src);
		else if (game === 'chunithm') data = await chunithmProgress(user.id, src);
		else data = await djmaxProgress(user.id);
	} catch (err) {
		error = err instanceof AuthError ? err.message : LOAD_FAILED;
	}
	return { game, src, srcLabel: game === 'djmax' ? '' : catalogSrcLabel(src), data, error, username: user.username };
};
