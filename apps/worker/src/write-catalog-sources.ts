import { writeFileSync } from 'node:fs';
import {
	divingFishMusicData,
	lxnsChuniSongList,
	lxnsMaimaiSongList,
	mergeSongLibrary,
	normalizeChunithm,
	normalizeLxnsChunithm,
	normalizeLxnsMaimai,
	normalizeMaimai
} from '@rhythm-vault/adapters';

const OUT = new URL('../../../packages/data/catalog-sources.json', import.meta.url);

async function main(): Promise<void> {
	console.log('[catalog-sources] 拉取水鱼 / 落雪曲目 ID…');
	const [dfM, dfC, lxM, lxC] = await Promise.all([
		divingFishMusicData('maimai'),
		divingFishMusicData('chunithm'),
		lxnsMaimaiSongList(),
		lxnsChuniSongList()
	]);
	const maimai = mergeSongLibrary(
		normalizeMaimai((dfM.data ?? []) as never[]),
		normalizeLxnsMaimai(lxM.songs, lxM.versions)
	);
	const chuni = mergeSongLibrary(
		normalizeChunithm((dfC.data ?? []) as never[]),
		normalizeLxnsChunithm(lxC)
	);
	const body = {
		maimai: { dfOnly: maimai.dfOnly, lxnsOnly: maimai.lxnsOnly },
		chunithm: { dfOnly: chuni.dfOnly, lxnsOnly: chuni.lxnsOnly }
	};
	writeFileSync(OUT, JSON.stringify(body, null, '\t') + '\n');
	console.log(
		`✓ catalog-sources.json  舞萌 水鱼独有 ${maimai.dfOnly.length} / 落雪独有 ${maimai.lxnsOnly.length}；中二 水鱼独有 ${chuni.dfOnly.length} / 落雪独有 ${chuni.lxnsOnly.length}`
	);
}

await main();
