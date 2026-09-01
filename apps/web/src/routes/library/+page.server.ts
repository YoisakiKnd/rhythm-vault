import { redirect } from '@sveltejs/kit';

/** 曲库入口直接进默认列表，不再停在三游总览 */
export function load() {
	redirect(302, '/library/maimai');
}
