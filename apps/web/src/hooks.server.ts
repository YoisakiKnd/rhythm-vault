import { json, type Handle, type HandleServerError } from '@sveltejs/kit';
import { AuthError, getSessionUser, SESSION_COOKIE } from '$lib/server/auth';
import { getAppConfig } from '$lib/server/config';
import { isForbiddenCrossOrigin } from '$lib/server/http-guard';

let prodConfigOk = false;

function ensureProdConfig(): void {
	if (prodConfigOk || process.env.NODE_ENV !== 'production') return;
	try {
		getAppConfig();
		prodConfigOk = true;
	} catch (err) {
		console.error('[config] 生产环境配置无效，退出', err);
		process.exit(1);
	}
}

export const handle: Handle = async ({ event, resolve }) => {
	ensureProdConfig();

	if (event.url.pathname === '/healthz') {
		return resolve(event);
	}

	event.locals.user = await getSessionUser(event.cookies.get(SESSION_COOKIE));
	event.locals.requestId = crypto.randomUUID().slice(0, 8);

	if (
		!event.url.pathname.startsWith('/api/v1/') &&
		isForbiddenCrossOrigin(
			event.request.method,
			event.request.headers.get('origin'),
			event.url.origin
		)
	) {
		return json({ error: '跨站请求被拒绝' }, { status: 403 });
	}

	const response = await resolve(event);
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Request-Id', event.locals.requestId);
	if (process.env.NODE_ENV === 'production') {
		response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	}
	return response;
};

export const handleError: HandleServerError = ({ error, event }) => {
	if (error instanceof AuthError) {
		return { message: error.message };
	}
	console.error('[hooks]', event.locals.requestId, error);
	return { message: '服务器内部错误' };
};
