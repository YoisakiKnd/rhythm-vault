import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import {
	oauthFailLocation,
	oauthProviderErrorMessage,
	registerPasswordMismatch,
	safeInternalPath
} from '../lib/server/http-guard.ts';

const readRoute = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');

const callbackSrc = readRoute('./api/links/[source]/callback/+server.ts');
const loginSrc = readRoute('./login/+page.server.ts');
const registerSrc = readRoute('./register/+page.server.ts');
const hooksSrc = readFileSync(new URL('../hooks.server.ts', import.meta.url), 'utf8');
const syncApiSrc = readRoute('./api/sync/+server.ts');
const dashboardSrc = readRoute('./dashboard/+page.server.ts');
const compareSrc = readRoute('./compare/+page.server.ts');
const rankingSrc = readRoute('./ranking/+page.server.ts');
const healthzSrc = readRoute('./healthz/+server.ts');
const maimaiSongSrc = readRoute('./api/v1/maimai/song/+server.ts');
const chuniSongSrc = readRoute('./api/v1/chunithm/song/+server.ts');
const djmaxSongSrc = readRoute('./api/v1/djmax/song/+server.ts');
const authSrc = readFileSync(new URL('../lib/server/auth.ts', import.meta.url), 'utf8');
const cryptoSrc = readFileSync(new URL('../lib/server/crypto.ts', import.meta.url), 'utf8');
const progressSrc = readFileSync(new URL('../lib/server/progress.ts', import.meta.url), 'utf8');
const settingsSrc = readRoute('./dashboard/settings/+page.server.ts');
const identitiesSrc = readRoute('./dashboard/identities/+page.server.ts');
const workerSrc = readFileSync(
	new URL('../../../../apps/worker/src/index.ts', import.meta.url),
	'utf8'
);
const webSyncSrc = readFileSync(new URL('../lib/server/sync.ts', import.meta.url), 'utf8');

describe('OAuth 回调路由', () => {
	test('源码使用脱敏 helper，不拼接 error_description', () => {
		expect(callbackSrc).toContain('oauthProviderErrorMessage');
		expect(callbackSrc).toContain('oauthFailLocation');
		expect(callbackSrc).not.toContain('error_description');
		expect(oauthProviderErrorMessage('access_denied')).toBe('授权被取消或失败，请重试');
		expect(oauthFailLocation(new Error('leak'))).not.toContain('leak');
	});
	test('绑定失败文案不出现 .env / Token / PKCE', () => {
		const linksSrc = readFileSync(new URL('../lib/server/links.ts', import.meta.url), 'utf8');
		expect(linksSrc).not.toContain('PKCE');
		expect(linksSrc).not.toContain('.env 缺少');
		expect(linksSrc).not.toContain('开发者 Token');
		expect(linksSrc).not.toContain('ENCRYPTION_KEY 未配置');
		expect(callbackSrc).not.toContain('code/state');
	});
});

describe('登录 / 注册 actions', () => {
	test('登录跳转走 safeInternalPath，并按 IP 限流', () => {
		expect(loginSrc).toContain('safeInternalPath');
		expect(loginSrc).toContain('takeToken(`login:');
		expect(loginSrc).toContain('assertTurnstile');
		expect(safeInternalPath('//evil.test')).toBe('/scores');
	});
	test('注册两次密码走 registerPasswordMismatch，并按 IP 限流', () => {
		expect(registerSrc).toContain('registerPasswordMismatch');
		expect(registerSrc).toContain('takeToken(`register:');
		expect(registerSrc).toContain('assertTurnstile');
		expect(registerPasswordMismatch('a', 'b')).toBe('两次输入的密码不一致');
	});
});

describe('hooks.server.ts', () => {
	test('安全头、Origin 校验、locals.user、错误脱敏', () => {
		expect(hooksSrc).toContain('isForbiddenCrossOrigin');
		expect(hooksSrc).toContain("startsWith('/api/v1/')");
		expect(hooksSrc).toContain('Strict-Transport-Security');
		expect(hooksSrc).toContain('X-Content-Type-Options');
		expect(hooksSrc).toContain('getSessionUser');
		expect(hooksSrc).toContain('服务器内部错误');
		expect(hooksSrc).toContain('getAppConfig');
		expect(hooksSrc).toContain("pathname === '/healthz'");
	});
});

describe('healthz', () => {
	test('探库 SELECT 1', () => {
		expect(healthzSrc).toContain('SELECT 1');
		expect(healthzSrc).toContain('ok: true');
	});
});

describe('同步冷却与共用链路', () => {
	test('手动同步按 userId 5 分钟冷却', () => {
		expect(dashboardSrc).toContain('takeToken(`sync:${user.id}`');
		expect(syncApiSrc).toContain('takeToken(`sync:${user.id}`');
	});
	test('web 与 worker 都走 syncUserFull', () => {
		expect(webSyncSrc).toContain('syncUserFull(userId, tokenOrNull)');
		expect(workerSrc).toContain('syncUserFull(userId, tokenOrNull)');
		expect(workerSrc).toContain('SIGTERM');
	});
});

describe('隐私与查分 API', () => {
	test('compare 不拉 rating 历史', () => {
		expect(compareSrc).toContain('includeHistory: false');
	});
	test('排行榜 DISTINCT ON 且不把 userId 交给页面', () => {
		expect(rankingSrc).toContain('selectDistinctOn');
		expect(rankingSrc).toContain('profilePublic');
		expect(rankingSrc).toContain('username: r.username');
		expect(rankingSrc).not.toContain('userId: r.userId');
		expect(rankingSrc).toContain("->>'button'");
		expect(rankingSrc).toContain('parseButtonParam');
	});
	test('v1 单曲 id 与 chart 互斥，id 须为数字', () => {
		for (const src of [maimaiSongSrc, chuniSongSrc]) {
			expect(src).toContain('id 与 chart 不能同时传');
			expect(src).toContain('assertNumericId');
		}
		expect(djmaxSongSrc).toContain('assertNumericId');
		expect(djmaxSongSrc).toContain("searchParams.get('id')");
	});
	test('API Key 限流按 userId，Key 有数量上限', () => {
		expect(authSrc).toContain('takeToken(`api:${row.userId}`');
		expect(authSrc).toContain('MAX_API_KEYS_PER_USER');
		expect(authSrc).toContain('destroyAllSessions');
		expect(cryptoSrc).toContain('scrypt:v1:');
	});
	test('进度用 SQL GROUP BY 聚合，不在 Node 里扫全量成绩行', () => {
		expect(progressSrc).toContain('jsonb_to_recordset');
		expect(progressSrc).toContain('GROUP BY');
		expect(progressSrc).not.toContain('userRows');
	});
	test('账号设置页承担改密、档案公开、Bot 查询与全设备登出', () => {
		expect(settingsSrc).toContain('changePassword');
		expect(settingsSrc).toContain('setProfilePublic');
		expect(settingsSrc).toContain('setBotQueryPublic');
		expect(settingsSrc).toContain('destroyAllSessions');
		expect(settingsSrc).toContain('takeToken(`passwd:${user.id}`');
		expect(identitiesSrc).not.toContain('setProfilePublic');
		expect(identitiesSrc).not.toContain('destroyAllSessions');
	});
	test('个人 Key 与开发者申请并入同一页，Bot Key 需审批', () => {
		const keysSrc = readRoute('./dashboard/keys/+page.server.ts');
		const layoutSrc = readRoute('./dashboard/+layout.server.ts');
		const devSrc = readRoute('./dashboard/developer/+page.server.ts');
		const oldReviewSrc = readRoute('./dashboard/developer/review/+page.server.ts');
		const adminLayoutSrc = readRoute('./admin/+layout.server.ts');
		const adminSrc = readRoute('./admin/+page.server.ts');
		expect(keysSrc).toContain("redirect(301, '/dashboard/developer')");
		expect(layoutSrc).toContain('/dashboard/keys');
		expect(devSrc).toContain('createApiKey(user.id, name)');
		expect(devSrc).toContain('createBotApiKey');
		expect(devSrc).toContain('submitApplication');
		expect(devSrc).not.toContain('setApiKeyScope');
		expect(oldReviewSrc).toContain("redirect(301, '/admin')");
		expect(adminLayoutSrc).toContain('isAdminUsername');
		expect(adminSrc).toContain('approveApplication');
		expect(adminSrc).toContain('rejectApplication');
		expect(adminSrc).toContain('revokeDeveloperAccess');
		expect(adminSrc).toContain('adminMarkVerified');
		expect(authSrc).toContain('MAX_BOT_KEYS_PER_USER');
		expect(authSrc).toContain('downgradeBotKeysForUser');
		expect(authSrc).toContain("eq(apiKeys.scope, 'bot')");
	});
	test('?qq= 走 resolveQueryTarget(identity) 且有 QQ 验证接口', () => {
		expect(maimaiSongSrc).toContain('resolveQueryTarget(identity, url)');
		expect(authSrc).toContain('scope: apiKeys.scope');
		const verifySrc = readRoute('./api/v1/identities/verify/+server.ts');
		expect(verifySrc).toContain("identity.scope !== 'bot'");
		expect(verifySrc).toContain('verifyIdentityByCode');
	});
});

describe('隐私政策与用户协议页面', () => {
	test('路由与页脚、注册页互相链接', () => {
		const privacy = readRoute('./privacy/+page.svelte');
		const terms = readRoute('./terms/+page.svelte');
		const footer = readFileSync(new URL('../lib/components/SiteFooter.svelte', import.meta.url), 'utf8');
		const register = readRoute('./register/+page.svelte');
		const tools = readRoute('./tools/+page.svelte');
		expect(privacy).toContain('隐私政策');
		expect(privacy).toContain('rv_');
		expect(privacy).toContain('github.com/YoisakiKnd/rhythm-vault/issues');
		expect(terms).toContain('用户协议');
		expect(terms).toContain('OAuth');
		expect(footer).toContain('href="/privacy"');
		expect(footer).toContain('href="/terms"');
		expect(register).toContain('href="/terms"');
		expect(register).toContain('href="/privacy"');
		expect(tools).toContain('/tools/chunithm-rating');
		expect(tools).toContain('中二推分');
	});
});
