import { AuthError } from './auth';

/** 非 GET 必须带同源 Origin（缺失 Origin 也拒绝）。/api/v1/* 由 hooks 豁免。 */
export function isForbiddenCrossOrigin(
	method: string,
	origin: string | null,
	siteOrigin: string
): boolean {
	if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return false;
	if (!origin) return true;
	return origin !== siteOrigin;
}

/** 登录后跳转只允许站内相对路径，禁止协议相对 URL（//evil） */
export function safeInternalPath(next: string | null | undefined, fallback = '/scores'): string {
	if (!next) return fallback;
	if (!next.startsWith('/') || next.startsWith('//')) return fallback;
	return next;
}

/**
 * OAuth 提供方带回的 error 查询参数：固定文案，绝不回显 error_description。
 */
export function oauthProviderErrorMessage(errorParam: string | null): string | null {
	if (!errorParam) return null;
	return '授权被取消或失败，请重试';
}

export function oauthFailLocation(err: unknown): string {
	const message = err instanceof AuthError ? err.message : '授权失败，请重试';
	return `/dashboard/links?error=${encodeURIComponent(message)}`;
}

export function registerPasswordMismatch(password: string, confirm: string): string | null {
	if (password !== confirm) return '两次输入的密码不一致';
	return null;
}
