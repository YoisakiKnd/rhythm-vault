/** 谱面难度展示名（列表徽章 / 详情共用，无 IO） */
export function diffLabel(diffKey: string): string {
	const map: Record<string, string> = {
		BASIC: 'Basic',
		ADVANCED: 'Advanced',
		EXPERT: 'Expert',
		MASTER: 'Master',
		REMASTER: 'Re:Master',
		UTAGE: '宴',
		ULTIMA: 'Ultima',
		WORLDS_END: 'WE',
		OTHER: 'WE'
	};
	return map[diffKey] ?? diffKey;
}

export function chartBadgeClass(diffKey: string): string {
	switch (diffKey) {
		case 'BASIC':
		case 'NM':
			return 'badge-success';
		case 'ADVANCED':
		case 'HD':
			return 'badge-warning';
		case 'EXPERT':
		case 'SC':
			return 'badge-error';
		case 'MASTER':
		case 'MX':
			return 'badge-secondary';
		case 'REMASTER':
		case 'ULTIMA':
			return 'badge-neutral';
		case 'UTAGE':
		case 'WORLDS_END':
		case 'OTHER':
			return 'badge-accent';
		default:
			return 'badge-ghost';
	}
}
