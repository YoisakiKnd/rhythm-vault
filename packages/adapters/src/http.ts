export const UPSTREAM_UA = 'rhythm-vault/0.1 (+https://github.com/tenonsuzu/rhythm-vault)';

export interface FetchPolicyInit extends RequestInit {
	timeoutMs?: number;
	retries?: number;
}

/** 水鱼应用配额按 UTC 自然日重置；收到 429 后本进程不再打到日切 */
let divingFishQuotaUntil = 0;

export function utcDayEndMs(now = Date.now()): number {
	const d = new Date(now);
	return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
}

export function isDivingFishUrl(input: string | URL): boolean {
	const href = typeof input === 'string' ? input : input.href;
	return href.includes('diving-fish.com');
}

export function resetDivingFishQuotaBlock(): void {
	divingFishQuotaUntil = 0;
}

function noteDivingFishQuota429(): void {
	divingFishQuotaUntil = utcDayEndMs();
}

/**
 * 上游 HTTP：统一 UA、30s 超时。
 * 5xx / 网络错误指数退避最多 3 次；水鱼 429 不重试，标记到 UTC 日切。
 */
export async function fetchWithPolicy(
	input: string | URL,
	init: FetchPolicyInit = {}
): Promise<Response> {
	if (isDivingFishUrl(input) && Date.now() < divingFishQuotaUntil) {
		return new Response('quota exhausted until UTC day reset', { status: 429 });
	}
	const { timeoutMs = 30_000, retries = 3, headers: initHeaders, ...rest } = init;
	let lastResponse: Response | undefined;
	let lastError: unknown;
	for (let attempt = 0; attempt < retries; attempt++) {
		const headers = new Headers(initHeaders);
		if (!headers.has('User-Agent')) headers.set('User-Agent', UPSTREAM_UA);
		try {
			const res = await fetch(input, {
				...rest,
				headers,
				signal: AbortSignal.timeout(timeoutMs)
			});
			if (res.status === 429 && isDivingFishUrl(input)) {
				noteDivingFishQuota429();
				return res;
			}
			if (res.status === 429 || res.status >= 500) {
				lastResponse = res;
				if (attempt < retries - 1) {
					await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
				}
				continue;
			}
			return res;
		} catch (err) {
			lastError = err;
			if (attempt < retries - 1) {
				await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
			}
		}
	}
	if (lastResponse) return lastResponse;
	throw lastError instanceof Error ? lastError : new Error('上游请求失败');
}

export async function readJson<T>(res: Response): Promise<T> {
	return (await res.json()) as T;
}
