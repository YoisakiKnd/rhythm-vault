import { parseCatalogSrc, type CatalogSrc } from '$lib/catalog-nav';

export function catalogSrcLabel(src: CatalogSrc): string {
	return src === 'lxns' ? '落雪' : '水鱼';
}

export function channelEmptyMessage(src: CatalogSrc): string {
	return `${catalogSrcLabel(src)}暂无该游戏的成绩数据。可切换到其他渠道，或到控制台绑定并同步。`;
}

export function catalogSrcToSource(src: CatalogSrc): 'divingfish' | 'lxns' {
	return src === 'lxns' ? 'lxns' : 'divingfish';
}

export function scoreChannelFromParam(raw: string | null | undefined): 'divingfish' | 'lxns' {
	return catalogSrcToSource(parseCatalogSrc(raw));
}

