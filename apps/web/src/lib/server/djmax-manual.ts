import { djpowerOf, scoreChartKey } from '@rhythm-vault/core';
import { snapshotDjmaxRating, upsertScores } from '@rhythm-vault/sync';
import { AuthError } from './auth';
import { getLibrary, getSongCatalog, numericSongId } from './library';

const BUTTONS = [4, 5, 6, 8] as const;
const PATTERNS = ['NM', 'HD', 'MX', 'SC'] as const;

export interface DjmaxManualInput {
	/** 曲库数字 ID（V-ARCHIVE title） */
	songId: string;
	button: number;
	pattern: string;
	/** V 值 0–100 */
	score: number;
	maxCombo?: boolean;
}

export interface DjmaxManualResult {
	chartKey: string;
	score: number;
	djpower: number;
	button: number;
	rating: number | null;
}

export function parseDjmaxManualForm(form: FormData): DjmaxManualInput {
	const songId = String(form.get('songId') ?? '').trim();
	const button = Number(form.get('button'));
	const pattern = String(form.get('pattern') ?? '').trim().toUpperCase();
	const score = Number(form.get('score'));
	const maxCombo = String(form.get('maxCombo') ?? '') === 'on' || String(form.get('maxCombo') ?? '') === '1';
	if (!/^\d+$/.test(songId)) throw new AuthError(400, '请选择曲目');
	if (!(BUTTONS as readonly number[]).includes(button)) throw new AuthError(400, '键位必须是 4/5/6/8');
	if (!(PATTERNS as readonly string[]).includes(pattern)) throw new AuthError(400, '难度必须是 NM/HD/MX/SC');
	if (!Number.isFinite(score) || score < 0 || score > 100) throw new AuthError(400, '分数须在 0–100');
	return { songId, button, pattern, score, maxCombo };
}

/** 控制台手动录入一条 DJMAX 成绩 → scores(source=manual) → 重算 b100 快照 */
export async function saveDjmaxManualScore(userId: number, input: DjmaxManualInput): Promise<DjmaxManualResult> {
	const catalog = getSongCatalog('djmax', input.songId);
	if (!catalog) throw new AuthError(404, '曲库里找不到这首歌');
	const chart = catalog.charts.find((c) => c.button === input.button && c.pattern === input.pattern);
	if (!chart) throw new AuthError(404, '该键位/难度没有谱面');

	const difficultyKey = `${input.button}B ${input.pattern}`;
	const chartKey = scoreChartKey('djmax', input.songId, difficultyKey);
	const djpower = djpowerOf(input.score, chart.levelValue);
	const lib = getLibrary('djmax');
	const song = lib.songs.find((s) => s.id === `djmax:${input.songId}`);
	const isNew = song?.isNew ?? chart.isNew;

	await upsertScores(
		userId,
		'djmax',
		[
			{
				chartKey,
				score: input.score,
				rating: djpower,
				badges: { maxCombo: input.maxCombo === true },
				isNew
			}
		],
		'manual'
	);

	let rating: number | null = null;
	try {
		rating = await snapshotDjmaxRating(userId);
	} catch (err) {
		console.warn('[djmax-manual] 重算 b100 快照失败（成绩已写入）', err);
		throw new AuthError(502, '成绩已保存，但总评重算失败，请稍后打开查分页或再保存一次');
	}
	return {
		chartKey,
		score: input.score,
		djpower,
		button: input.button,
		rating
	};
}

/** 供录入页搜索：按标题过滤，附带可选键位下的谱面 */
export function searchDjmaxSongs(q: string, button: number, limit = 20) {
	const lib = getLibrary('djmax');
	const needle = q.trim().toLowerCase();
	const out: Array<{
		id: string;
		title: string;
		artist: string;
		patterns: Array<{ pattern: string; levelLabel: string; levelValue: number }>;
	}> = [];
	for (const s of lib.songs) {
		if (needle) {
			const hay = `${s.title} ${s.artist ?? ''}`.toLowerCase();
			if (!hay.includes(needle)) continue;
		}
		const patterns: Array<{ pattern: string; levelLabel: string; levelValue: number }> = [];
		for (const c of lib.charts) {
			if (c.songId !== s.id) continue;
			const [bmode, pat] = c.difficultyKey.split(' ');
			if (bmode !== `${button}B`) continue;
			if (!pat || !(PATTERNS as readonly string[]).includes(pat)) continue;
			patterns.push({ pattern: pat, levelLabel: c.levelLabel, levelValue: c.levelValue });
		}
		if (patterns.length === 0) continue;
		out.push({
			id: numericSongId(s.id),
			title: s.title,
			artist: s.artist ?? '',
			patterns
		});
		if (out.length >= limit) break;
	}
	return out;
}
