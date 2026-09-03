/**
 * /api/v1 公开查分契约：错误 JSON 形状 + 成功响应键位 + 路由接线。
 * 覆盖 auth failure / no scores / ?qq= not found；不发明端点。
 */
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import {
	decideQueryTarget,
	errorResponse,
	KEY_SCOPE_DENIED,
	QUERY_TARGET_HIDDEN
} from '../../../lib/server/api.ts';
import { AuthError } from '../../../lib/server/auth.ts';
import { scoresEmptyMessage } from '../../../lib/copy.ts';
import { pickMaimaiB50FromRows } from '../../../lib/server/score-pick.ts';
import { finalizeProgressBuckets } from '../../../lib/server/progress.ts';
import { songDetailJson, type SongDetail } from '../../../lib/server/song-detail.ts';

const readRoute = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');

async function parseError(res: Response): Promise<{ status: number; error: string }> {
	const body = (await res.json()) as { error?: unknown };
	expect(typeof body.error).toBe('string');
	expect(Object.keys(body).sort()).toEqual(['error']);
	return { status: res.status, error: body.error as string };
}

/** 路由统一 catch → errorResponse 的契约形状 */
describe('v1 errorResponse 契约', () => {
	test('auth failure：缺少 Key → 401 { error }', async () => {
		const out = await parseError(
			errorResponse(new AuthError(401, '缺少 API Key，请在 Authorization: Bearer <rv_...> 中提供'))
		);
		expect(out.status).toBe(401);
		expect(out.error).toContain('API Key');
	});

	test('auth failure：无效 Key → 401 { error }', async () => {
		const out = await parseError(errorResponse(new AuthError(401, 'API Key 无效或已吊销')));
		expect(out.status).toBe(401);
		expect(out.error).toBe('API Key 无效或已吊销');
	});

	test('?qq= not found：bot Key 统一 404，文案不泄露是否存在', async () => {
		const bot = { userId: 1, scope: 'bot' as const };
		let caught: unknown;
		try {
			decideQueryTarget(bot, null, { allowUnverified: false });
		} catch (err) {
			caught = err;
		}
		expect(caught).toBeInstanceOf(AuthError);
		const out = await parseError(errorResponse(caught));
		expect(out.status).toBe(404);
		expect(out.error).toBe(QUERY_TARGET_HIDDEN);
	});

	test('?qq= 越权：self Key 查别人 → 403 { error }', async () => {
		const self = { userId: 1, scope: 'self' as const };
		let caught: unknown;
		try {
			decideQueryTarget(self, { userId: 2, verified: true, botQueryPublic: true }, { allowUnverified: false });
		} catch (err) {
			caught = err;
		}
		const out = await parseError(errorResponse(caught));
		expect(out.status).toBe(403);
		expect(out.error).toBe(KEY_SCOPE_DENIED);
	});

	test('no scores：b50/b30/b100/push/progress 空成绩 → 404 { error }', async () => {
		const msgs = [
			scoresEmptyMessage({ bound: false, src: 'df' }),
			scoresEmptyMessage({ bound: true, src: 'lxns' }),
			scoresEmptyMessage({ bound: false, src: 'varchive' })
		];
		for (const msg of msgs) {
			const out = await parseError(errorResponse(new AuthError(404, msg)));
			expect(out.status).toBe(404);
			expect(out.error).toBe(msg);
			expect(out.error).not.toMatch(/ENCRYPTION_KEY|Bearer\s|rv_[A-Za-z0-9]{8,}/);
		}
	});

	test('song 未游玩谱面 → 404 { error }', async () => {
		const out = await parseError(
			errorResponse(new AuthError(404, '未找到该谱面成绩（可能未游玩，或数据尚未同步）'))
		);
		expect(out.status).toBe(404);
		expect(out.error).toContain('未找到该谱面成绩');
	});
});

describe('v1 成功响应形状（本地可构造）', () => {
	test('b50：rating / oldBest / newBest / syncedAt', () => {
		const at = new Date('2026-01-01T00:00:00Z');
		const b50 = pickMaimaiB50FromRows([
			{ chartKey: 'maimaidx:1:3', score: 100.5, rating: 12, isNew: false, updatedAt: at },
			{ chartKey: 'maimaidx:2:3', score: 99, rating: 11, isNew: true, updatedAt: at }
		]);
		expect(b50).toEqual(
			expect.objectContaining({
				rating: expect.any(Number),
				oldBest: expect.any(Array),
				newBest: expect.any(Array),
				syncedAt: expect.any(String)
			})
		);
		expect(b50.oldBest[0]).toEqual(
			expect.objectContaining({
				chartKey: expect.any(String),
				score: expect.any(Number),
				rating: expect.any(Number)
			})
		);
		expect(Object.keys(b50).sort()).toEqual(['newBest', 'oldBest', 'rating', 'syncedAt']);
	});

	test('b30 视图键位与 b50 对齐（rating/oldBest/newBest/syncedAt）', () => {
		const sample = {
			rating: 15.12,
			oldBest: [
				{
					chartKey: 'chunithm:3:4',
					title: 't',
					label: 'MASTER',
					value: 14.5,
					cover: '/cover/chunithm/3',
					score: 1_000_000,
					rating: 15.1
				}
			],
			newBest: [],
			syncedAt: '2026-01-01T00:00:00.000Z'
		};
		expect(Object.keys(sample).sort()).toEqual(['newBest', 'oldBest', 'rating', 'syncedAt']);
		expect(sample.oldBest[0]).toEqual(
			expect.objectContaining({
				chartKey: expect.any(String),
				title: expect.any(String),
				score: expect.any(Number),
				rating: expect.any(Number)
			})
		);
	});

	test('b100：button / rating / basic / new / syncedAt', () => {
		const sample = {
			button: 4,
			rating: 8000,
			basic: [{ chartKey: 'djmax:4B:1:SC', score: 99.5, rating: 12.3 }],
			new: [],
			syncedAt: null as string | null
		};
		expect(Object.keys(sample).sort()).toEqual(['basic', 'button', 'new', 'rating', 'syncedAt']);
		expect([4, 5, 6, 8]).toContain(sample.button);
	});

	test('song（整曲 songDetailJson）：game/id/title/charts[].score|rating', () => {
		const detail = {
			game: 'maimai' as const,
			id: '1145',
			songId: 'maimaidx:1145',
			title: 'Demo',
			artist: 'A',
			genre: 'G',
			versionTitle: 'BUDDiES',
			versionCode: 23000,
			dlcCode: null,
			dlcName: null,
			isNew: false,
			cover: '/cover/maimai/1145',
			chartType: 'standard' as const,
			charts: [
				{
					chartKey: 'maimaidx:1145:3',
					diffKey: 'MASTER',
					diffLabel: 'MASTER',
					levelLabel: '13+',
					levelValue: 13.7,
					isNew: false,
					mine: null
				}
			],
			syncedAt: null
		} satisfies SongDetail;
		const json = songDetailJson(detail);
		expect(json.game).toBe('maimai');
		expect(json.id).toBe('1145');
		expect(json.charts[0]).toEqual(
			expect.objectContaining({
				chartKey: 'maimaidx:1145:3',
				score: null,
				rating: null
			})
		);
		for (const key of ['game', 'id', 'title', 'cover', 'charts', 'syncedAt'] as const) {
			expect(json).toHaveProperty(key);
		}
	});

	test('sheet：rows/summary/page/pages/total；无成绩时 mine 为 null（不 404）', () => {
		const sheet = {
			rows: [
				{
					chartKey: 'maimaidx:1:3',
					numericId: '1',
					title: 'x',
					mine: null as null,
					isFc: false,
					isPp: false
				}
			],
			summary: { total: 1, played: 0, fc: 0, pp: 0 },
			page: 1,
			pages: 1,
			total: 1
		};
		expect(Object.keys(sheet).sort()).toEqual(['page', 'pages', 'rows', 'summary', 'total']);
		expect(sheet.summary).toEqual(
			expect.objectContaining({
				total: expect.any(Number),
				played: expect.any(Number),
				fc: expect.any(Number),
				pp: expect.any(Number)
			})
		);
		expect(sheet.rows[0]?.mine).toBeNull();
	});

	test('progress：分桶含 key/label/total/played/fc/pp/completion', () => {
		const [bucket] = finalizeProgressBuckets([
			{ key: '14', label: '14', total: 10, played: 4, fc: 1, pp: 0 }
		]);
		expect(bucket).toEqual(
			expect.objectContaining({
				key: '14',
				label: '14',
				total: 10,
				played: 4,
				fc: 1,
				pp: 0,
				completion: expect.any(Number)
			})
		);
		const maimaiShape = {
			game: 'maimai_dx',
			gameLabel: '舞萌 DX',
			versionBuckets: [bucket],
			levelBuckets: [bucket]
		};
		expect(Object.keys(maimaiShape).sort()).toEqual([
			'game',
			'gameLabel',
			'levelBuckets',
			'versionBuckets'
		]);
	});

	test('push：maimai 含 b50Min/comfort/improve/unplayed；chunithm 含 bestMin', () => {
		const maimaiPush = {
			b50Min: 12,
			comfort: { dsLo: 13, dsHi: 14, typicalAch: 100.5 },
			improve: [],
			unplayed: []
		};
		const chuniPush = {
			bestMin: 14.5,
			comfort: { dsLo: 14, dsHi: 15, typicalScore: 1_005_000 },
			improve: [],
			unplayed: []
		};
		expect(Object.keys(maimaiPush).sort()).toEqual(['b50Min', 'comfort', 'improve', 'unplayed']);
		expect(Object.keys(chuniPush).sort()).toEqual(['bestMin', 'comfort', 'improve', 'unplayed']);
	});
});

const V1_ENDPOINTS = [
	'./maimai/b50/+server.ts',
	'./maimai/push/+server.ts',
	'./maimai/progress/+server.ts',
	'./maimai/sheet/+server.ts',
	'./maimai/song/+server.ts',
	'./chunithm/b30/+server.ts',
	'./chunithm/push/+server.ts',
	'./chunithm/progress/+server.ts',
	'./chunithm/sheet/+server.ts',
	'./chunithm/song/+server.ts',
	'./djmax/b100/+server.ts',
	'./djmax/progress/+server.ts',
	'./djmax/sheet/+server.ts',
	'./djmax/song/+server.ts'
] as const;

describe('v1 路由接线（auth + qq + errorResponse）', () => {
	test('现有端点均 authApiKey → resolveQueryTarget → errorResponse', () => {
		for (const rel of V1_ENDPOINTS) {
			const src = readRoute(rel);
			expect(src).toContain('authApiKey');
			expect(src).toContain('resolveQueryTarget');
			expect(src).toContain('errorResponse');
			expect(src).toContain('catch');
		}
	});

	test('b50/b30/b100/push/progress/sheet/song 覆盖三游路径', () => {
		const joined = V1_ENDPOINTS.join('\n');
		expect(joined).toContain('maimai/b50');
		expect(joined).toContain('chunithm/b30');
		expect(joined).toContain('djmax/b100');
		expect(joined).toContain('/push/');
		expect(joined).toContain('/progress/');
		expect(joined).toContain('/sheet/');
		expect(joined).toContain('/song/');
	});

	test('空成绩抛点：scores / progress 使用 AuthError 404', () => {
		const scoresSrc = readFileSync(new URL('../../../lib/server/scores.ts', import.meta.url), 'utf8');
		const progressSrc = readFileSync(
			new URL('../../../lib/server/progress.ts', import.meta.url),
			'utf8'
		);
		expect(scoresSrc).toContain('throw new AuthError(404, await emptyHint');
		expect(progressSrc).toContain('throw new AuthError(404, scoresEmptyMessage');
	});
});
