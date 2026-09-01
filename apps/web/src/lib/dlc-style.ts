/** DJMAX 曲包标签配色（贴近 V-ARCHIVE 筛选条） */
const DLC_COLORS: Record<string, { bg: string; fg: string; bd: string }> = {
	R: { bg: '#f0b429', fg: '#1a1200', bd: '#f0b429' },
	RV: { bg: '#e89a1c', fg: '#1a1200', bd: '#e89a1c' },
	P1: { bg: '#6d28d9', fg: '#fff', bd: '#6d28d9' },
	P2: { bg: '#7c3aed', fg: '#fff', bd: '#7c3aed' },
	P3: { bg: '#5b21b6', fg: '#fff', bd: '#6d28d9' },
	ES: { bg: 'linear-gradient(90deg,#2563eb,#22c55e)', fg: '#fff', bd: '#2563eb' },
	VE: { bg: 'linear-gradient(90deg,#f97316,#3b82f6)', fg: '#fff', bd: '#f97316' },
	VE2: { bg: 'linear-gradient(90deg,#fb7185,#6366f1)', fg: '#fff', bd: '#fb7185' },
	VE3: { bg: 'linear-gradient(90deg,#f59e0b,#22d3ee)', fg: '#fff', bd: '#f59e0b' },
	VE4: { bg: 'linear-gradient(90deg,#ef4444,#a855f7)', fg: '#fff', bd: '#ef4444' },
	VE5: { bg: 'linear-gradient(90deg,#f97316,#ec4899)', fg: '#fff', bd: '#f97316' },
	GC: { bg: '#111', fg: '#f5d76e', bd: '#f5d76e' },
	TR: { bg: '#1e3a8a', fg: '#fff', bd: '#3b82f6' },
	GG: { bg: '#7f1d1d', fg: '#fecaca', bd: '#991b1b' },
	BS: { bg: '#111', fg: '#e5e5e5', bd: '#525252' },
	CE: { bg: '#4c1d95', fg: '#e9d5ff', bd: '#7c3aed' },
	CY: { bg: '#0ea5e9', fg: '#fff', bd: '#0284c7' },
	DM: { bg: '#1c1917', fg: '#fde68a', bd: '#a16207' },
	T1: { bg: '#db2777', fg: '#fff', bd: '#db2777' },
	T2: { bg: '#c026d3', fg: '#fff', bd: '#c026d3' },
	T3: { bg: '#9d174d', fg: '#fff', bd: '#db2777' },
	TQ: { bg: '#be185d', fg: '#fff', bd: '#f472b6' },
	CHU: { bg: '#111', fg: '#fbbf24', bd: '#fbbf24' },
	GF: { bg: '#1e293b', fg: '#fda4af', bd: '#fb7185' },
	ESTI: { bg: '#334155', fg: '#e2e8f0', bd: '#94a3b8' },
	NXN: { bg: '#111', fg: '#60a5fa', bd: '#facc15' },
	MD: { bg: '#ec4899', fg: '#fff', bd: '#f9a8d4' },
	EZ2: { bg: '#1d4ed8', fg: '#fff', bd: '#60a5fa' },
	CP: { bg: '#334155', fg: '#cbd5e1', bd: '#64748b' },
	MAP: { bg: '#166534', fg: '#bbf7d0', bd: '#22c55e' },
	FAL: { bg: '#1e3a5f', fg: '#fde68a', bd: '#f59e0b' },
	VL: { bg: 'linear-gradient(90deg,#ec4899,#facc15)', fg: '#fff', bd: '#ec4899' },
	VL2: { bg: 'linear-gradient(90deg,#f472b6,#fde047)', fg: '#fff', bd: '#f472b6' },
	VL3: { bg: 'linear-gradient(90deg,#e879f9,#facc15)', fg: '#fff', bd: '#e879f9' },
	VL4: { bg: 'linear-gradient(90deg,#c084fc,#fcd34d)', fg: '#fff', bd: '#c084fc' },
	VL5: { bg: 'linear-gradient(90deg,#f0abfc,#fde68a)', fg: '#1a1200', bd: '#f0abfc' },
	TEK: { bg: '#9a3412', fg: '#fed7aa', bd: '#f97316' },
	PLI1: { bg: '#44403c', fg: '#fde68a', bd: '#d6d3d1' },
	PLI2: { bg: '#292524', fg: '#e7e5e4', bd: '#a8a29a' },
	PLI3: { bg: '#1c1917', fg: '#fde68a', bd: '#a8a29a' },
	BA: { bg: '#1e3a8a', fg: '#67e8f9', bd: '#22d3ee' },
	ARC: { bg: '#0f172a', fg: '#c4b5fd', bd: '#a78bfa' },
	OGK: { bg: '#831843', fg: '#fbcfe8', bd: '#f472b6' }
};

export function dlcChipStyle(code: string): string {
	const c = DLC_COLORS[code];
	if (c) {
		const bg = c.bg.startsWith('linear') ? c.bg : `linear-gradient(180deg, ${c.bg}, ${c.bg})`;
		return `background:${bg};color:${c.fg};border:1px solid ${c.bd}`;
	}
	let h = 0;
	for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
	return `background:hsl(${h % 360} 35% 28%);color:#fff;border:1px solid hsl(${h % 360} 35% 45%)`;
}
