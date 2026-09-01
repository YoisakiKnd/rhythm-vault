import { fetchWithPolicy, readJson } from './http';

/** 水鱼 / 落雪共用的 OAuth2 基础设施 */

export interface OAuthConfig {
	clientId: string;
	clientSecret?: string;
	redirectUri: string;
}

export interface TokenResponse {
	access_token: string;
	refresh_token?: string;
	/** access token 有效期（秒），两家均为 900（15 分钟） */
	expires_in?: number;
	scope?: string;
	token_type?: string;
}

export class UpstreamError extends Error {
	constructor(
		message: string,
		public readonly status: number
	) {
		super(message);
		this.name = 'UpstreamError';
	}
}

function base64url(bytes: Uint8Array): string {
	let bin = '';
	for (const b of bytes) bin += String.fromCharCode(b);
	return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function randomToken(bytes = 32): string {
	return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

/** 水鱼强制 PKCE（S256） */
export async function generatePkce(): Promise<{ codeVerifier: string; codeChallenge: string }> {
	const codeVerifier = randomToken(48);
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
	return { codeVerifier, codeChallenge: base64url(new Uint8Array(digest)) };
}

export async function postTokenForm(
	url: string,
	params: Record<string, string>
): Promise<TokenResponse> {
	const res = await fetchWithPolicy(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams(params)
	});
	if (!res.ok) {
		throw new UpstreamError(`token 交换失败: ${res.status}`, res.status);
	}
	return readJson<TokenResponse>(res);
}

export function buildAuthorizeUrl(
	url: string,
	params: Record<string, string>
): string {
	return `${url}?${new URLSearchParams(params)}`;
}
