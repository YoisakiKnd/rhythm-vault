import { AuthError } from './auth';

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export function turnstileSiteKey(): string | null {
	const key = process.env.TURNSTILE_SITE_KEY?.trim();
	return key ? key : null;
}

export function turnstileSecretKey(): string | null {
	const key = process.env.TURNSTILE_SECRET_KEY?.trim();
	return key ? key : null;
}

/** 站点密钥与密钥都配齐才启用；本地不配则跳过。 */
export function turnstileEnabled(): boolean {
	return Boolean(turnstileSiteKey() && turnstileSecretKey());
}

export function turnstileTokenFromForm(form: FormData): string {
	return String(form.get('cf-turnstile-response') ?? '');
}

/**
 * 已启用时校验 Cloudflare Turnstile token。
 * 未配置环境变量则直接通过（方便本地开发）。
 */
export async function assertTurnstile(token: unknown, remoteip?: string): Promise<void> {
	if (!turnstileEnabled()) return;
	if (typeof token !== 'string' || token.length < 8 || token.length > 2048) {
		throw new AuthError(400, '请完成人机验证');
	}
	const secret = turnstileSecretKey();
	if (!secret) throw new AuthError(500, '人机验证未正确配置');
	const body = new URLSearchParams({ secret, response: token });
	if (remoteip) body.set('remoteip', remoteip);
	let data: { success?: boolean };
	try {
		const res = await fetch(SITEVERIFY, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body,
			signal: AbortSignal.timeout(10_000)
		});
		data = (await res.json()) as { success?: boolean };
	} catch {
		throw new AuthError(502, '人机验证暂时不可用，请稍后再试');
	}
	if (!data.success) throw new AuthError(403, '人机验证失败，请重试');
}
