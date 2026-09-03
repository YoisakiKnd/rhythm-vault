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

/** 与 packages/sync friendly-error 保持一致：用户可见文案不得含令牌 / 配置名 */
const SYNC_LEAKY =
	/ENCRYPTION_KEY|PKCE|code_verifier|code_challenge|refresh[_\s-]?token|access[_\s-]?token|authorization\s*code|auth(?:orization)?\s*code|\bBearer\s+\S+|\brv_[A-Za-z0-9_-]{8,}|client_secret|DEVELOPER_TOKEN|(?:^|[^A-Za-z])Token(?:[^A-Za-z]|$)/i;

function assertSafeSyncMessage(text: string): string {
	if (SYNC_LEAKY.test(text)) return SYNC_FAILED_GENERIC;
	return text;
}

export function catalogSrcName(src: CatalogSrc): string {
	return src === 'lxns' ? '落雪' : '水鱼';
}

export function scoresEmptyUnbound(src: CatalogSrc | 'varchive'): string {
	const name = src === 'varchive' ? 'V-ARCHIVE' : catalogSrcName(src);
	if (src === 'varchive') {
		return '还没有 DJMAX 成绩。可以绑定 V-ARCHIVE 同步，或到控制台「DJMAX 录入」手动登记。';
	}
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
	if (message.includes('DJMAX 录入')) return { href: '/dashboard/djmax', label: '去录入' };
	if (message.startsWith('还没有绑定')) return { href: '/dashboard/links', label: '去绑定' };
	return { href: '/dashboard', label: '去同步' };
}

export function friendlySyncError(err: unknown): string {
	const status =
		err && typeof err === 'object' && 'status' in err ? Number((err as { status: unknown }).status) : 0;
	const msg = err instanceof Error ? err.message : String(err);

	let out: string;
	if (SYNC_LEAKY.test(msg) || /LXNS_DEVELOPER_TOKEN/.test(msg) || msg.includes('公开同步无法按好友码')) {
		if (/LXNS_DEVELOPER_TOKEN/.test(msg) || msg.includes('公开同步无法按好友码')) {
			out = '落雪公开查询未开通，请用授权登录后再同步。';
		} else {
			out = '授权登录暂时不可用，请稍后重试或改用手动绑定。';
		}
	} else if (
		status === 401 ||
		status === 403 ||
		/未开放|未.*同意|关闭了第三方|Privacy|请求失败: 40[13]/.test(msg)
	) {
		out = '未开放查询，或授权已失效，请重新绑定。';
	} else if (status === 404 || /用户不存在|请求失败: 404/.test(msg)) {
		out = '查分器上找不到这个账号，请检查绑定信息。';
	} else if (status === 429 || /请求失败: 429/.test(msg)) {
		out = '查分器正忙，请稍后再试。';
	} else if (/响应结构不符/.test(msg)) {
		out = '查分器返回的数据异常，请稍后再试。';
	} else if (status >= 500 || /请求失败: 5/.test(msg)) {
		out = '查分器暂时不可用，请稍后再试。';
	} else {
		out = SYNC_FAILED_GENERIC;
	}
	return assertSafeSyncMessage(out);
}


export const PUSH_EMPTY = '这个水平附近暂时没有更顺手的目标。把已有谱再往上磨一磨，或者同步一次后再看。';

export function PUSH_FLOOR_HINT(bestLabel: string): string {
	return `按你 ${bestLabel} 里已经打稳的定数来推，优先离下一档很近的谱。末位单曲 rating `;
}

export function PUSH_FOOTNOTE(bestLabel: string): string {
	return `不是越难越该打。实际 ${bestLabel} 以同步后的组成为准。`;
}

export function pushEffortText(game: 'maimai' | 'chunithm', effort: number): string {
	if (game === 'chunithm') {
		const n = Math.round(effort);
		if (n < 100) return '不到 100 分';
		return `${n.toLocaleString('zh-CN')} 分`;
	}
	const v = Math.round(effort * 100) / 100;
	return v < 0.1 ? '不到 0.1%' : `${v.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}%`;
}

export const DJMAX_MANUAL_TITLE = 'DJMAX 手动录入';
export const DJMAX_MANUAL_DESC =
	'没有 V-ARCHIVE 绑定时，可以在这里逐条登记成绩。写入后会立刻重算该键位 b100。';
export const DJMAX_MANUAL_SAVED = '已保存，并已重算 b100。';
