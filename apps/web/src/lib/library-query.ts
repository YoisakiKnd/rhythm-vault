import type { CatalogSrc } from './catalog-nav';

export function parseCsvParam(raw: string | null | undefined): string[] {
	if (raw == null || raw === '') return [];
	return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export function joinCsv(values: string[]): string {
	return values.join(',');
}

export function toggleCsv(current: string[], key: string): string[] {
	return current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
}

const SPECIAL_DIFFS = new Set(['UTAGE', 'WORLDS_END']);

export function specialDiffsOnly(diffs: string[]): boolean {
	return diffs.length > 0 && diffs.every((d) => SPECIAL_DIFFS.has(d));
}

/** 曲库列表筛选 query 拼装（不含 page） */
export function libraryFilterParams(q: {
	q?: string;
	diff?: string;
	pattern?: string;
	level?: string;
	onlyNew?: boolean;
	src?: CatalogSrc;
	dlcs?: string[];
	allDlcCount?: number;
}): URLSearchParams {
	const params = new URLSearchParams();
	if (q.q?.trim()) params.set('q', q.q.trim());
	if (q.diff) params.set('diff', q.diff);
	if (q.pattern) params.set('pattern', q.pattern);
	if (q.level && !specialDiffsOnly(parseCsvParam(q.diff))) params.set('level', q.level);
	if (q.onlyNew) params.set('new', '1');
	if (q.src === 'lxns') params.set('src', 'lxns');
	if (q.dlcs) {
		if (q.dlcs.length === 1 && q.dlcs[0] === '-') params.set('dlc', '-');
		else if (q.dlcs.length > 0 && q.dlcs.length !== (q.allDlcCount ?? -1)) {
			params.set('dlc', q.dlcs.join(','));
		}
	}
	return params;
}

export function parseDlcParam(raw: string | null): string[] {
	if (raw == null || raw === '') return [];
	if (raw === '-') return ['-'];
	return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

/** 曲库列表地址（保留筛选 query） */
export function libraryListHref(game: string, search: URLSearchParams | string): string {
	const q = typeof search === 'string' ? search.replace(/^\?/, '') : search.toString();
	return q ? `/library/${game}?${q}` : `/library/${game}`;
}

/** 曲目详情地址（把当前列表筛选带到详情，便于返回） */
export function songDetailHref(game: string, numericId: string, search: URLSearchParams): string {
	const q = search.toString();
	return `/library/${game}/song/${numericId}${q ? `?${q}` : ''}`;
}
