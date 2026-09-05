export type GameKey = 'maimai' | 'chunithm' | 'djmax';
export type CatalogSrc = 'df' | 'lxns';
export type DjmaxButton = '4B' | '5B' | '6B' | '8B';

export const GAMES = [
	{ key: 'maimai' as const, label: '舞萌 DX' },
	{ key: 'chunithm' as const, label: '中二节奏' },
	{ key: 'djmax' as const, label: 'DJMAX' }
];

export const CATALOG_NAV = [
	{
		game: 'maimai' as const,
		label: '舞萌',
		kind: 'src' as const,
		items: [
			{ key: 'df', label: '水鱼' },
			{ key: 'lxns', label: '落雪' }
		]
	},
	{
		game: 'chunithm' as const,
		label: '中二',
		kind: 'src' as const,
		items: [
			{ key: 'df', label: '水鱼' },
			{ key: 'lxns', label: '落雪' }
		]
	},
	{
		game: 'djmax' as const,
		label: 'DJMAX',
		kind: 'button' as const,
		items: [
			{ key: '4B', label: '4B' },
			{ key: '5B', label: '5B' },
			{ key: '6B', label: '6B' },
			{ key: '8B', label: '8B' }
		]
	}
];

export type RememberedVariant = { src: CatalogSrc; diff: DjmaxButton };

export function parseCatalogSrc(v: string | null | undefined): CatalogSrc {
	return v === 'lxns' ? 'lxns' : 'df';
}

export function parseDjmaxDiff(v: string | null | undefined): DjmaxButton {
	if (v === '5B' || v === '6B' || v === '8B' || v === '4B') return v;
	if (v === '5' || v === '6' || v === '8' || v === '4') return `${v}B`;
	return '4B';
}

export function isDjmaxButton(v: string | null | undefined): v is DjmaxButton {
	return v === '4B' || v === '5B' || v === '6B' || v === '8B';
}

export function buttonFromUrl(pathname: string, search: URLSearchParams): DjmaxButton | null {
	if (pathname.startsWith('/library/djmax') || pathname.startsWith('/sheet/djmax')) {
		return parseDjmaxDiff(search.get('diff'));
	}
	if (search.get('game') === 'djmax' || pathname.startsWith('/library/djmax')) {
		const b = search.get('button');
		if (b === '4' || b === '5' || b === '6' || b === '8') return parseDjmaxDiff(b);
	}
	return null;
}

export function variantLabel(game: GameKey, src: CatalogSrc, diff: DjmaxButton): string {
	if (game === 'djmax') return diff;
	return src === 'lxns' ? '落雪' : '水鱼';
}

export function isGameKey(v: string | null | undefined): v is GameKey {
	return v === 'maimai' || v === 'chunithm' || v === 'djmax';
}

export function gameLabel(game: GameKey): string {
	return GAMES.find((g) => g.key === game)?.label ?? game;
}

/** 从当前 URL 读出游戏；读不到返回 null（由本地记忆补） */
export function gameFromUrl(pathname: string, search: URLSearchParams): GameKey | null {
	const lib = pathname.match(/^\/library\/(maimai|chunithm|djmax)/);
	if (lib) return lib[1] as GameKey;
	const sheet = pathname.match(/^\/sheet\/(maimai|chunithm|djmax)/);
	if (sheet) return sheet[1] as GameKey;
	const g = search.get('game');
	return isGameKey(g) ? g : null;
}

function setSrcParam(q: URLSearchParams, src: CatalogSrc) {
	if (src === 'lxns') q.set('src', 'lxns');
	else q.delete('src');
}

function pageUsesCatalogSrc(pathname: string): boolean {
	return (
		pathname.startsWith('/library/maimai') ||
		pathname.startsWith('/library/chunithm') ||
		pathname.startsWith('/scores') ||
		pathname.startsWith('/progress') ||
		pathname.startsWith('/sheet/') ||
		pathname.startsWith('/u/') ||
		pathname.startsWith('/compare') ||
		pathname.startsWith('/tools/')
	);
}

/** 曲库 / 查分 / 进度等页的数据源；无 src 参数时舞萌/中二默认为水鱼 */
export function srcFromUrl(pathname: string, search: URLSearchParams): CatalogSrc | null {
	const raw = search.get('src');
	if (raw === 'lxns' || raw === 'df') return raw;
	const game = gameFromUrl(pathname, search);
	if (game === 'djmax') return null;
	if (game === 'maimai' || game === 'chunithm') {
		return pageUsesCatalogSrc(pathname) ? 'df' : null;
	}
	if (pathname.startsWith('/scores') || pathname.startsWith('/progress') || pathname.startsWith('/sheet/')) {
		return 'df';
	}
	return null;
}

export function catalogHref(game: GameKey, itemKey: string): string {
	if (game === 'djmax') return `/library/djmax?diff=${itemKey}`;
	return `/library/${game}?src=${itemKey}`;
}

export function libraryHref(game: GameKey, opts?: { src?: CatalogSrc; diff?: string }): string {
	if (game === 'djmax') return `/library/djmax?diff=${opts?.diff || '4B'}`;
	return `/library/${game}${opts?.src === 'lxns' ? '?src=lxns' : ''}`;
}

export function catalogItemActive(
	pathname: string,
	search: URLSearchParams,
	game: GameKey,
	itemKey: string,
	remembered?: Partial<RememberedVariant>
): boolean {
	if (game === 'djmax') {
		const current = buttonFromUrl(pathname, search) ?? remembered?.diff ?? '4B';
		return current === itemKey;
	}
	const current = srcFromUrl(pathname, search) ?? remembered?.src ?? 'df';
	return current === itemKey;
}

export type AppFunction =
	| 'home'
	| 'library'
	| 'ranking'
	| 'scores'
	| 'progress'
	| 'sheet'
	| 'compare'
	| 'sync'
	| 'calc'
	| 'random'
	| 'docs';

export function functionHref(
	fn: AppFunction,
	game: GameKey,
	opts?: { src?: CatalogSrc; diff?: DjmaxButton }
): string {
	switch (fn) {
		case 'home':
			return '/';
		case 'library':
			return libraryHref(game, { src: opts?.src, diff: opts?.diff });
		case 'ranking':
			if (game === 'djmax') {
				const n = (opts?.diff ?? '4B').replace('B', '');
				return `/ranking?game=djmax&button=${n}`;
			}
			return `/ranking?game=${game}`;
		case 'scores':
			if (game === 'djmax') {
				const n = (opts?.diff ?? '4B').replace('B', '');
				return `/scores?game=djmax&button=${n}`;
			}
			return `/scores?game=${game}${opts?.src === 'lxns' ? '&src=lxns' : ''}`;
		case 'progress':
			if (game === 'djmax') {
				const n = (opts?.diff ?? '4B').replace('B', '');
				return `/progress?game=djmax&button=${n}`;
			}
			return `/progress?game=${game}${opts?.src === 'lxns' ? '&src=lxns' : ''}`;
		case 'sheet':
			if (game === 'djmax') {
				return `/sheet/djmax?diff=${opts?.diff ?? '4B'}`;
			}
			return `/sheet/${game}${opts?.src === 'lxns' ? '?src=lxns' : ''}`;
		case 'compare':
			return `/compare?game=${game}${opts?.src === 'lxns' && game !== 'djmax' ? '&src=lxns' : ''}`;
		case 'sync':
			return '/dashboard/links';
		case 'calc':
			return `/tools/calculators?game=${game}${opts?.src === 'lxns' && game !== 'djmax' ? '&src=lxns' : ''}`;
		case 'random':
			return `/tools/random?game=${game}${opts?.src === 'lxns' && game !== 'djmax' ? '&src=lxns' : ''}`;
		case 'docs':
			return '/api-docs';
	}
}

export function functionActive(fn: AppFunction, pathname: string): boolean {
	switch (fn) {
		case 'home':
			return pathname === '/';
		case 'library':
			return pathname.startsWith('/library');
		case 'ranking':
			return pathname.startsWith('/ranking');
		case 'scores':
			return pathname.startsWith('/scores');
		case 'progress':
			return pathname.startsWith('/progress');
		case 'sheet':
			return pathname.startsWith('/sheet/');
		case 'compare':
			return pathname.startsWith('/compare');
		case 'sync':
			return pathname.startsWith('/dashboard/links');
		case 'calc':
			return pathname.startsWith('/tools/calculators');
		case 'random':
			return pathname.startsWith('/tools/random');
		case 'docs':
			return pathname.startsWith('/api-docs');
	}
}

/**
 * 切换游戏时尽量留在当前功能。
 * 当前页不绑游戏则返回 null，由界面只更新本地选择。
 */
export function gameSwitchHref(
	next: GameKey,
	pathname: string,
	search: URLSearchParams,
	remembered?: Partial<RememberedVariant>
): string | null {
	if (pathname.startsWith('/library')) {
		if (next === 'djmax') {
			return libraryHref('djmax', { diff: remembered?.diff ?? '4B' });
		}
		const src =
			pathname.startsWith('/library/maimai') || pathname.startsWith('/library/chunithm')
				? parseCatalogSrc(search.get('src'))
				: (remembered?.src ?? 'df');
		return libraryHref(next, { src });
	}
	if (pathname.startsWith('/ranking')) {
		if (next === 'djmax') {
			return `/ranking?game=djmax&button=${(remembered?.diff ?? '4B').replace('B', '')}`;
		}
		return `/ranking?game=${next}`;
	}
	if (pathname.startsWith('/scores')) {
		const q = new URLSearchParams({ game: next });
		if (next === 'djmax') {
			q.set('button', (remembered?.diff ?? parseDjmaxDiff(search.get('button'))).replace('B', ''));
		} else if ((remembered?.src ?? parseCatalogSrc(search.get('src'))) === 'lxns') {
			q.set('src', 'lxns');
		}
		return `/scores?${q}`;
	}
	if (pathname.startsWith('/progress')) {
		const q = new URLSearchParams({ game: next });
		if (next === 'djmax') {
			q.set('button', (remembered?.diff ?? parseDjmaxDiff(search.get('button'))).replace('B', ''));
		} else if ((remembered?.src ?? parseCatalogSrc(search.get('src'))) === 'lxns') {
			q.set('src', 'lxns');
		}
		return `/progress?${q}`;
	}
	if (pathname.startsWith('/sheet/')) {
		if (next === 'djmax') {
			return `/sheet/djmax?diff=${remembered?.diff ?? parseDjmaxDiff(search.get('diff') ?? search.get('button'))}`;
		}
		const src = remembered?.src ?? parseCatalogSrc(search.get('src'));
		return `/sheet/${next}${src === 'lxns' ? '?src=lxns' : ''}`;
	}
	if (pathname.startsWith('/u/')) {
		const q = new URLSearchParams(search);
		q.set('game', next);
		if (next === 'djmax') {
			q.set('button', (remembered?.diff ?? parseDjmaxDiff(search.get('button'))).replace('B', ''));
			q.delete('src');
		} else {
			q.delete('button');
			setSrcParam(q, remembered?.src ?? parseCatalogSrc(search.get('src')));
		}
		return `${pathname}?${q}`;
	}
	if (pathname.startsWith('/compare')) {
		const q = new URLSearchParams(search);
		q.set('game', next);
		if (next === 'djmax') {
			q.set('button', (remembered?.diff ?? parseDjmaxDiff(search.get('button'))).replace('B', ''));
			q.delete('src');
		} else {
			q.delete('button');
			setSrcParam(q, remembered?.src ?? parseCatalogSrc(search.get('src')));
		}
		return `/compare?${q}`;
	}
	if (pathname.startsWith('/tools/calculators')) return `/tools/calculators?game=${next}`;
	if (pathname.startsWith('/tools/random')) return `/tools/random?game=${next}`;
	return null;
}

/**
 * 切换数据源 / DJMAX 键位。当前页能跟着改就返回新地址，否则只记本地。
 * 曲库会保留 q / pattern / level / dlc 等筛选。
 */
export function variantSwitchHref(
	game: GameKey,
	itemKey: string,
	pathname: string,
	search: URLSearchParams
): string | null {
	if (game === 'djmax') {
		const diff = parseDjmaxDiff(itemKey);
		const button = diff.replace('B', '');
		if (pathname.startsWith('/library/djmax')) {
			const q = new URLSearchParams(search);
			q.set('diff', diff);
			const s = q.toString();
			return s ? `${pathname}?${s}` : pathname;
		}
		if (pathname.startsWith('/scores') || pathname.startsWith('/progress') || pathname.startsWith('/ranking')) {
			const q = new URLSearchParams(search);
			q.set('game', 'djmax');
			q.set('button', button);
			return `${pathname.startsWith('/ranking') ? '/ranking' : pathname.startsWith('/progress') ? '/progress' : '/scores'}?${q}`;
		}
		if (pathname.startsWith('/sheet/')) {
			const q = new URLSearchParams(search);
			q.set('diff', diff);
			const s = q.toString();
			return s ? `${pathname}?${s}` : pathname;
		}
		if (pathname.startsWith('/u/') || pathname.startsWith('/compare')) {
			const q = new URLSearchParams(search);
			q.set('game', 'djmax');
			q.set('button', button);
			return `${pathname}?${q}`;
		}
		return null;
	}

	const src = parseCatalogSrc(itemKey);
	if (pathname.startsWith(`/library/${game}`)) {
		const q = new URLSearchParams(search);
		setSrcParam(q, src);
		const s = q.toString();
		return s ? `${pathname}?${s}` : pathname;
	}
	if (
		pathname.startsWith('/scores') ||
		pathname.startsWith('/progress') ||
		pathname.startsWith('/sheet/') ||
		pathname.startsWith('/u/') ||
		pathname.startsWith('/compare') ||
		pathname.startsWith('/tools/calculators') ||
		pathname.startsWith('/tools/random')
	) {
		const q = new URLSearchParams(search);
		if (!pathname.startsWith('/u/') && !pathname.startsWith('/compare')) {
			q.set('game', game);
		} else if (!q.get('game')) {
			q.set('game', game);
		}
		setSrcParam(q, src);
		const s = q.toString();
		return s ? `${pathname}?${s}` : pathname;
	}
	return null;
}
