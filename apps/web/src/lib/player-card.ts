export function avatarHue(name: string): number {
	let h = 0;
	for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
	return h % 360;
}

export const RATING_GAME_LABEL: Record<string, string> = {
	maimai_dx: '舞萌 DX',
	maimai: '舞萌 DX',
	chunithm: '中二节奏',
	djmax: 'DJMAX'
};

export function urlGameFromDb(game: string): 'maimai' | 'chunithm' | 'djmax' {
	if (game === 'maimai_dx' || game === 'maimai') return 'maimai';
	if (game === 'chunithm') return 'chunithm';
	return 'djmax';
}

export function formatGameRating(game: string, rating: number): string {
	if (game === 'chunithm' || game === 'djmax') {
		return Number.isInteger(rating) ? String(rating) : rating.toFixed(2);
	}
	return String(Math.round(rating));
}

export function canViewPlayerProfile(profilePublic: boolean, isOwner: boolean): boolean {
	return profilePublic || isOwner;
}
