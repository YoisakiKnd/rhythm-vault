/** 曲绘地址：走本站代理 /cover/[game]/[id]（磁盘缓存 + 浏览器长缓存），
 * 客户端/服务端均可用的纯函数。上游地址见 /cover 路由。 */
export type CoverGame = 'maimai' | 'chunithm' | 'djmax';

export function coverUrl(game: CoverGame, numericSongId: string | number): string {
	return `/cover/${game}/${String(numericSongId)}`;
}

/** 从 songId（"maimaidx:8"）或 chartKey 中取数字曲目 ID */
export function songNumericId(songId: string): string {
	return songId.split(':')[1] ?? '';
}
