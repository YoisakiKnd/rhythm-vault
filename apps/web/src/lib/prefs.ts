import type { CatalogSrc, DjmaxButton, GameKey } from './catalog-nav';
import { isDjmaxButton, isGameKey, parseCatalogSrc } from './catalog-nav';

export const PREF_GAME = 'rv-game';
export const PREF_SRC = 'rv-src';
export const PREF_DJMAX = 'rv-djmax-button';
export const PREF_THEME = 'rv-theme';
export const PREF_CHANGE = 'rv-prefs-change';

function emitPrefs(): void {
	if (typeof window === 'undefined') return;
	window.dispatchEvent(new Event(PREF_CHANGE));
}

export type ThemeName = 'dark' | 'light';

export const THEME_COLOR: Record<ThemeName, string> = {
	dark: '#1d232a',
	light: '#ffffff'
};

export function parseTheme(v: string | null | undefined): ThemeName | null {
	return v === 'light' || v === 'dark' ? v : null;
}

export function applyTheme(theme: ThemeName): void {
	document.documentElement.setAttribute('data-theme', theme);
	const meta = document.querySelector('meta[name="theme-color"]');
	if (meta) meta.setAttribute('content', THEME_COLOR[theme]);
	try {
		localStorage.setItem(PREF_THEME, theme);
	} catch {
		/* ignore */
	}
}

export function readStoredTheme(): ThemeName | null {
	try {
		return parseTheme(localStorage.getItem(PREF_THEME));
	} catch {
		return null;
	}
}

export function readStoredGame(): GameKey | null {
	try {
		const v = localStorage.getItem(PREF_GAME);
		return isGameKey(v) ? v : null;
	} catch {
		return null;
	}
}

export function readStoredSrc(): CatalogSrc | null {
	try {
		const v = localStorage.getItem(PREF_SRC);
		return v === 'lxns' || v === 'df' ? parseCatalogSrc(v) : null;
	} catch {
		return null;
	}
}

export function readStoredDjmax(): DjmaxButton | null {
	try {
		const v = localStorage.getItem(PREF_DJMAX);
		return isDjmaxButton(v) ? v : null;
	} catch {
		return null;
	}
}

export function writePrefGame(game: GameKey): void {
	try {
		localStorage.setItem(PREF_GAME, game);
		emitPrefs();
	} catch {
		/* ignore */
	}
}

export function writePrefSrc(src: CatalogSrc): void {
	try {
		localStorage.setItem(PREF_SRC, src);
		emitPrefs();
	} catch {
		/* ignore */
	}
}

export function writePrefDjmax(diff: DjmaxButton): void {
	try {
		localStorage.setItem(PREF_DJMAX, diff);
		emitPrefs();
	} catch {
		/* ignore */
	}
}
