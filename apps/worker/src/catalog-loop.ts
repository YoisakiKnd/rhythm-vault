import { syncCatalog } from './sync-songs';

const DAY_MS = 24 * 60 * 60 * 1000;

let stopping = false;

const sleep = async (ms: number) => {
	const start = Date.now();
	while (!stopping && Date.now() - start < ms) {
		await new Promise((r) => setTimeout(r, 1000));
	}
};

console.log('[catalog] 曲库每天更新一次');
process.on('SIGTERM', () => {
	stopping = true;
	console.log('[catalog] 收到 SIGTERM，本轮结束后退出');
});
process.on('SIGINT', () => {
	stopping = true;
});

while (!stopping) {
	try {
		await syncCatalog();
	} catch (err) {
		console.error('[catalog] 曲库同步失败', err);
	}
	if (stopping) break;
	await sleep(DAY_MS);
}

console.log('[catalog] 已退出');
process.exit(0);
