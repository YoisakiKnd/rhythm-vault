import { catalogSrcName, scoresEmptyMessage } from '$lib/copy';
import { parseCatalogSrc, type CatalogSrc } from '$lib/catalog-nav';

export function catalogSrcLabel(src: CatalogSrc): string {
	return catalogSrcName(src);
}

export function channelEmptyMessage(src: CatalogSrc, bound = true): string {
	return scoresEmptyMessage({ bound, src });
}

export function catalogSrcToSource(src: CatalogSrc): 'divingfish' | 'lxns' {
	return src === 'lxns' ? 'lxns' : 'divingfish';
}

export function scoreChannelFromParam(raw: string | null | undefined): 'divingfish' | 'lxns' {
	return catalogSrcToSource(parseCatalogSrc(raw));
}

