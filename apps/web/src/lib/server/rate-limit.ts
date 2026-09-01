/** 进程内滑动窗口限流。多实例部署时换 Redis。 */

const buckets = new Map<string, number[]>();
let lastSweep = Date.now();

function sweep(now: number): void {
	if (now - lastSweep < 60_000) return;
	for (const [key, stamps] of buckets) {
		const next = stamps.filter((t) => now - t < 15 * 60_000);
		if (next.length === 0) buckets.delete(key);
		else buckets.set(key, next);
	}
	lastSweep = now;
}

export function takeToken(key: string, max: number, windowMs: number): boolean {
	const now = Date.now();
	sweep(now);
	const bucket = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
	if (bucket.length >= max) {
		buckets.set(key, bucket);
		return false;
	}
	bucket.push(now);
	buckets.set(key, bucket);
	return true;
}

export type AddressEvent = { getClientAddress(): string; request: Request };

/**
 * 只用 SvelteKit 的 getClientAddress()。
 * 反代后面请设 ADDRESS_HEADER=x-forwarded-for 与 XFF_DEPTH=1（取 Caddy 追加的最后一段）；
 * 不要自己读 X-Forwarded-For 首段——那段可由客户端伪造。
 */
export function clientAddress(event: AddressEvent): string {
	try {
		return event.getClientAddress();
	} catch {
		return 'local';
	}
}

export function clientKey(event: AddressEvent, extra = ''): string {
	const ip = clientAddress(event);
	return extra ? `${ip}:${extra}` : ip;
}
