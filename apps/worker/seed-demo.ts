/**
 * 开发/联调用：向指定用户灌入演示成绩数据（非真实成绩）。
 * 用法: bun --env-file=.env apps/worker/seed-demo.ts <用户名>
 */
import { readFileSync } from 'node:fs';
import { chuniRatingOf, maimaiRatingOf } from '@rhythm-vault/core';
import { getDb, users, eq } from '@rhythm-vault/db';
import { snapshotChuniRating, snapshotMaimaiRating, upsertScores, type ScoreRow } from '@rhythm-vault/sync';

const username = process.argv[2];
if (!username) throw new Error('用法: bun --env-file=.env apps/worker/seed-demo.ts <用户名>');

const db = getDb();
const [user] = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
if (!user) throw new Error(`用户不存在: ${username}`);

// maimai：从曲库 JSON 取真实曲目（旧曲/新曲混合），MASTER 难度
const lib = JSON.parse(
	readFileSync(new URL('../../packages/data/maimaidx.json', import.meta.url), 'utf8')
) as { charts: Array<{ songId: string; difficultyKey: string; levelValue: number; isNew: boolean }> };
const master = lib.charts.filter((c) => c.difficultyKey === 'MASTER');
const selected = [...master.filter((c) => !c.isNew).slice(0, 40), ...master.filter((c) => c.isNew).slice(0, 18)];

const rows: ScoreRow[] = selected.map((c, i) => {
	const achievement = Math.max(95, 100.5 - (i % 40) * 0.14);
	return {
		chartKey: `${c.songId}:3`,
		score: achievement,
		rating: maimaiRatingOf(c.levelValue, achievement),
		badges: i % 7 === 0 ? { fc: 'fc' } : null,
		isNew: c.isNew
	};
});
console.log(`maimai_dx: upsert ${rows.length} 条`);
await upsertScores(user.id, 'maimai_dx', rows, 'divingfish');
console.log('maimai rating 快照:', await snapshotMaimaiRating(user.id));

// djmax：4B 键位若干条（rating 列 = 未归一化 djpower）
const djmaxRows: ScoreRow[] = [
	{ chartKey: 'djmax:4B:0:SC', score: 99.5, rating: 350, badges: { maxCombo: true }, isNew: false },
	{ chartKey: 'djmax:4B:1:MX', score: 100.0, rating: 320, badges: { maxCombo: true }, isNew: false },
	{ chartKey: 'djmax:4B:2:MX', score: 98.8, rating: 300, badges: null, isNew: false },
	{ chartKey: 'djmax:4B:3:SC', score: 97.2, rating: 280, badges: null, isNew: true },
	{ chartKey: 'djmax:4B:4:MX', score: 96.0, rating: 260, badges: null, isNew: true }
];
console.log(`djmax: upsert ${djmaxRows.length} 条`);
await upsertScores(user.id, 'djmax', djmaxRows, 'varchive');

// chunithm：MASTER 难度若干条（rating 列存本地 chuniRatingOf）
const chuniLib = JSON.parse(
	readFileSync(new URL('../../packages/data/chunithm.json', import.meta.url), 'utf8')
) as { charts: Array<{ songId: string; difficultyKey: string; levelValue: number; isNew: boolean }> };
const chuniMaster = chuniLib.charts.filter((c) => c.difficultyKey === 'MASTER');
const chuniSelected = [
	...chuniMaster.filter((c) => !c.isNew).slice(0, 25),
	...chuniMaster.filter((c) => c.isNew).slice(0, 15)
];
const chuniRows: ScoreRow[] = [];
for (let i = 0; i < chuniSelected.length; i++) {
	const c = chuniSelected[i];
	const score = Math.min(1010000, 1009000 - i * 2000);
	chuniRows.push({
		chartKey: `${c.songId}:3`,
		score,
		rating: chuniRatingOf(c.levelValue, score),
		badges: null,
		isNew: c.isNew
	});
}
console.log(`chunithm: upsert ${chuniRows.length} 条`);
await upsertScores(user.id, 'chunithm', chuniRows, 'divingfish');
console.log('chunithm rating 快照:', await snapshotChuniRating(user.id));
console.log('完成');
process.exit(0); // postgres-js 连接池会挂住进程，脚本用完即退
