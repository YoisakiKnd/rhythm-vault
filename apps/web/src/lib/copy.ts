import type { CatalogSrc } from './catalog-nav';

export const GAME_TITLE = {
	maimai: '舞萌 DX',
	chunithm: '中二节奏',
	djmax: 'DJMAX'
} as const;

export const SHARE_GAME_LABEL = {
	maimai: '舞萌 DX 国服',
	chunithm: '中二节奏 国服',
	djmax: 'DJMAX RESPECT V'
} as const;

export const LOAD_FAILED = '成绩暂时加载失败，请稍后重试。';
export const VISITOR_NO_SCORES = '暂时没有这份成绩。';
export const RANKING_EMPTY = '还没有人上榜。在设置里打开档案公开并同步成绩后就会出现。';
export const SYNC_FAILED_GENERIC = '同步失败，请稍后重试';

export function catalogSrcName(src: CatalogSrc): string {
	return src === 'lxns' ? '落雪' : '水鱼';
}

export function scoresEmptyUnbound(src: CatalogSrc | 'varchive'): string {
	const name = src === 'varchive' ? 'V-ARCHIVE' : catalogSrcName(src);
	return `还没有绑定${name}。绑定并同步后才会出现这份成绩。`;
}

export function scoresEmptyBound(src: CatalogSrc | 'varchive'): string {
	if (src === 'varchive') return 'V-ARCHIVE 里还没有这份键位的成绩。同步一次后再看。';
	return `${catalogSrcName(src)}里还没有这款游戏的成绩。可换成另一个渠道，或再同步一次。`;
}

export function scoresEmptyMessage(opts: {
	bound: boolean;
	src: CatalogSrc | 'varchive';
	visitor?: boolean;
}): string {
	if (opts.visitor) return VISITOR_NO_SCORES;
	return opts.bound ? scoresEmptyBound(opts.src) : scoresEmptyUnbound(opts.src);
}

export function emptyScoresCta(message: string | null | undefined): { href: string; label: string } | null {
	if (!message || message === VISITOR_NO_SCORES || message === LOAD_FAILED) return null;
	if (message.startsWith('还没有绑定')) return { href: '/dashboard/links', label: '去绑定' };
	return { href: '/dashboard', label: '去同步' };
}

export function friendlySyncError(err: unknown): string {
	const status =
		err && typeof err === 'object' && 'status' in err ? Number((err as { status: unknown }).status) : 0;
	const msg = err instanceof Error ? err.message : String(err);

	if (/LXNS_DEVELOPER_TOKEN/.test(msg) || msg.includes('公开同步无法按好友码')) {
		return '落雪公开查询未开通，请用授权登录后再同步。';
	}
	if (status === 401 || status === 403 || /未开放|未.*同意|关闭了第三方|Privacy|请求失败: 40[13]/.test(msg)) {
		return '未开放查询，或授权已失效，请重新绑定。';
	}
	if (status === 404 || /用户不存在|请求失败: 404/.test(msg)) {
		return '查分器上找不到这个账号，请检查绑定信息。';
	}
	if (status === 429 || /请求失败: 429/.test(msg)) return '查分器正忙，请稍后再试。';
	if (/响应结构不符/.test(msg)) return '查分器返回的数据异常，请稍后再试。';
	if (status >= 500 || /请求失败: 5/.test(msg)) return '查分器暂时不可用，请稍后再试。';
	return SYNC_FAILED_GENERIC;
}
