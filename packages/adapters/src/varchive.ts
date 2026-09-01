import { fetchWithPolicy, readJson } from './http';
import { UpstreamError } from './oauth';

export const VARCHIVE = 'https://v-archive.net';

// 上游礼仪：带可标识的 UA、调用方自行缓存（见 docs/design.md §7）
export const VA_HEADERS = { 'User-Agent': 'rhythm-vault/0.1 (+https://github.com/tenonsuzu/rhythm-vault)' };

export interface VAPattern {
	level: number;
	/** V floor ×10 的整数值 */
	floor?: number;
	floorName?: string;
	/** 该谱面 Perfect Play 理论 DJPower */
	rating?: number;
}

export interface VASongEntry {
	/** 曲目数字 ID */
	title: number;
	name: string;
	composer?: string;
	dlcCode: string;
	newTab: boolean;
	/** key: "4B"|"5B"|"6B"|"8B"，value: key "NM"|"HD"|"MX"|"SC" */
	patterns: Record<string, Record<string, VAPattern | undefined>>;
}

export interface VARecord {
	title: number;
	name: string;
	dlcCode: string;
	pattern: 'NM' | 'HD' | 'MX' | 'SC';
	level: number;
	floorName?: string | number;
	/** V 值 0–100 */
	score: number | null;
	maxCombo: boolean | null;
	djpower: number;
	/** V-ARCHIVE 计算的单曲 rating（未归一化） */
	rating?: number;
	updatedAt?: string;
}

export interface VAResponse {
	nickname: string;
	button: number;
	count?: number;
	records: VARecord[];
}

async function vaJson<T>(path: string): Promise<T> {
	const res = await fetchWithPolicy(`${VARCHIVE}${path}`, { headers: VA_HEADERS });
	if (!res.ok) throw new UpstreamError(`v-archive ${path} 请求失败: ${res.status}`, res.status);
	return readJson<T>(res);
}

export function vaSongs(): Promise<VASongEntry[]> {
	return vaJson('/db/v2/songs.json');
}

export function vaDlcs(): Promise<Array<{ dlcCode: string; dlcName: string; ymdt?: string }>> {
	return vaJson('/db/dlcs.json');
}

export function vaRecordsUrl(
	username: string,
	bmode: number,
	params: Record<string, string | number | boolean> = {}
): string {
	return `${VARCHIVE}/api/v2/archive/${encodeURIComponent(username)}/button/${bmode}?${new URLSearchParams(
		Object.entries(params).map(([k, v]) => [k, String(v)])
	)}`;
}

export async function vaRecords(
	username: string,
	bmode: number,
	params: Record<string, string | number | boolean> = {}
): Promise<VAResponse> {
	const res = await fetchWithPolicy(vaRecordsUrl(username, bmode, params), { headers: VA_HEADERS });
	if (res.status === 404) throw new UpstreamError(`V-ARCHIVE 用户不存在: ${username}`, 404);
	if (!res.ok) throw new UpstreamError(`v-archive records 请求失败: ${res.status}`, res.status);
	return readJson<VAResponse>(res);
}

/** 该键位的理论满 DJPower（特殊用户名 DEV），总评归一化常数 */
export async function vaMaxDjPower(bmode: number): Promise<number> {
	const data = await vaJson<{ maxDjPower: number }>(`/api/v2/archive/DEV/djClass/${bmode}`);
	return data.maxDjPower;
}
