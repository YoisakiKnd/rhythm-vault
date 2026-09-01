import type { OAuthConfig } from '@rhythm-vault/adapters';

export interface AppConfig {
	baseUrl: string;
	encryptionKey?: string;
	divingFish: OAuthConfig | null;
	lxns: OAuthConfig | null;
}

export const ENCRYPTION_KEY_DENY = new Set([
	'please-generate-another-random-string',
	'REPLACE_ME_WITH_A_LONG_RANDOM_SECRET',
	'changeme',
	'secret',
	'ENCRYPTION_KEY'
]);

function oauthFromEnv(prefix: string, fallbackRedirect: string): OAuthConfig | null {
	const clientId = process.env[`${prefix}_CLIENT_ID`];
	if (!clientId) return null;
	const fromEnv = process.env[`${prefix}_REDIRECT_URI`]?.trim();
	return {
		clientId,
		clientSecret: process.env[`${prefix}_CLIENT_SECRET`],
		redirectUri: fromEnv || fallbackRedirect
	};
}

/** 站长用户名（逗号分隔），可签发 bot scope Key、手动确认 QQ 归属 */
export function adminUsernames(): string[] {
	return (process.env.RV_ADMIN_USERS ?? '')
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
}

export function isAdminUsername(username: string): boolean {
	return adminUsernames().includes(username);
}

/** 本地开发：未验证 QQ 也可被 ?qq= 查到。生产不要开。 */
export function allowUnverifiedQq(): boolean {
	return process.env.RV_ALLOW_UNVERIFIED_QQ === '1';
}

export function assertEncryptionKey(): string {
	const key = process.env.ENCRYPTION_KEY;
	if (!key || key.length < 16 || ENCRYPTION_KEY_DENY.has(key)) {
		throw new Error('ENCRYPTION_KEY 未配置、太短或仍为占位值');
	}
	return key;
}

/** 服务端配置全部来自环境变量（见 .env.example） */
export function getAppConfig(): AppConfig {
	const baseUrl = process.env.BASE_URL;
	if (process.env.NODE_ENV === 'production' && !baseUrl) {
		throw new Error('生产环境必须设置 BASE_URL（OAuth 回调依赖它）');
	}
	if (process.env.NODE_ENV === 'production') {
		assertEncryptionKey();
	}
	const origin = (baseUrl ?? 'http://localhost:5173').replace(/\/$/, '');
	return {
		baseUrl: origin,
		encryptionKey: process.env.ENCRYPTION_KEY,
		divingFish: oauthFromEnv('DIVING_FISH', `${origin}/api/links/divingfish/callback`),
		lxns: oauthFromEnv('LXNS', `${origin}/api/links/lxns/callback`)
	};
}
