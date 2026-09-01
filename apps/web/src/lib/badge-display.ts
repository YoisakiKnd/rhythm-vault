/** 成绩徽章展示文案（单曲详情 / 完成表共用） */
export function badgeText(game: string, badges: unknown): string {
	if (!badges || typeof badges !== 'object') return '';
	const b = badges as { fc?: unknown; fs?: unknown; maxCombo?: unknown };
	if (game === 'djmax') return b.maxCombo === true ? 'MAX' : '';
	const parts: string[] = [];
	if (b.fc) parts.push(typeof b.fc === 'string' ? b.fc : 'FC');
	if (b.fs) parts.push(typeof b.fs === 'string' ? b.fs : 'FS');
	return parts.join(' ');
}
