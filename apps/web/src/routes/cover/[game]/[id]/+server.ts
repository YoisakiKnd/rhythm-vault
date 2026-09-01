import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { chunithmJacketId } from '$lib/server/library';

const CACHE_DIR = process.env.RV_COVER_DIR
	?? join(process.cwd(), '.cache', 'covers');

const FETCH_TIMEOUT_MS = 5_000;
const MAX_BYTES = 2 * 1024 * 1024;

const inflight = new Map<string, Promise<Response>>();

/**
 * 曲绘代理：首次从上游拉取并写磁盘缓存，之后直接回源本地文件。
 * 浏览器侧长缓存（7 天），列表/查分页的曲绘加载速度与上游解耦。
 * 舞萌优先水鱼封面，没有则回落到雪（DX 谱 ID 需对 10000 取余）。
 */
export const GET: RequestHandler = async ({ params }) => {
	const urls = coverUrls(params.game, params.id);
	if (urls.length === 0 || !/^\d{1,7}$/.test(params.id)) {
		return json({ error: '无效的曲绘请求' }, { status: 400 });
	}

	const cacheKey = `${params.game}-${params.id}`;
	const existing = inflight.get(cacheKey);
	if (existing) return (await existing).clone();

	const pending = loadCover(cacheKey, urls).finally(() => inflight.delete(cacheKey));
	inflight.set(cacheKey, pending);
	return (await pending).clone();
};

async function loadCover(cacheKey: string, urls: string[]): Promise<Response> {
	const cachePath = join(CACHE_DIR, cacheKey);
	try {
		if (existsSync(cachePath)) {
			return new Response(new Uint8Array(readFileSync(cachePath)), {
				headers: { 'Content-Type': contentTypeOf(cachePath), 'Cache-Control': 'public, max-age=604800' }
			});
		}
	} catch {
		/* 读缓存失败则回落到上游 */
	}

	let lastType = 'image/png';
	let bytes: Buffer | null = null;
	for (const url of urls) {
		try {
			const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
			if (!res.ok || !res.headers.get('content-type')?.startsWith('image/')) continue;
			const len = Number(res.headers.get('content-length') ?? '0');
			if (len > MAX_BYTES) continue;
			const buf = Buffer.from(await res.arrayBuffer());
			if (buf.byteLength > MAX_BYTES) continue;
			bytes = buf;
			lastType = res.headers.get('content-type') ?? 'image/png';
			break;
		} catch {
			/* 超时 / 网络错误：试下一个源 */
		}
	}
	if (!bytes) {
		return new Response(PLACEHOLDER_PNG, {
			headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=300' }
		});
	}
	try {
		mkdirSync(CACHE_DIR, { recursive: true });
		writeFileSync(cachePath, bytes);
	} catch {
		/* 写不进只是不缓存，仍返回内存中的曲绘，避免容器属主问题变成 500 */
	}
	return new Response(new Uint8Array(bytes), {
		headers: {
			'Content-Type': lastType,
			'Cache-Control': 'public, max-age=604800'
		}
	});
}

function coverUrls(game: string, id: string): string[] {
	if (game === 'maimai') {
		const n = Number(id);
		const lxnsId = n >= 100000 ? id : String(n % 10000);
		// 水鱼 10001–11000 区间封面在 ID-10000；其余左补零到 5 位
		const dfId = n >= 10001 && n <= 11000 ? String(n - 10000).padStart(5, '0') : id.padStart(5, '0');
		return [
			`https://www.diving-fish.com/covers/${dfId}.png`,
			`https://assets2.lxns.net/maimai/jacket/${lxnsId}.png`
		];
	}
	if (game === 'chunithm') {
		let jacketId = id;
		try {
			jacketId = chunithmJacketId(id);
		} catch {
			/* 曲库未就绪时仍按原 ID 取图 */
		}
		return [`https://assets2.lxns.net/chunithm/jacket/${jacketId}.png`];
	}
	if (game === 'djmax') return [`https://v-archive.net/s3/images/jackets/${id}.jpg`];
	return [];
}

/** 1×1 透明 PNG，上游全失败时避免 <img> 裂图（不落磁盘缓存，便于上游恢复后重试） */
const PLACEHOLDER_PNG = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
	'base64'
);

function contentTypeOf(path: string): string {
	return path.endsWith('.jpg') ? 'image/jpeg' : 'image/png';
}
