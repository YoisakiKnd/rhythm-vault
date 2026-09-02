<script lang="ts">
	import {
		compactScore,
		diffKeyFromChartKey,
		djmaxBadgeText,
		djmaxFloorHot,
		djmaxFloorLabel,
		djmaxPatternStyle,
		djmaxScoreColor,
		scoreToneClass
	} from '$lib/best-display';
	import type { BestEntry } from '$lib/score-types';

	let {
		list,
		slots,
		pad = false,
		cols = 7,
		board = null,
		tone = 'share'
	}: {
		list: BestEntry[];
		slots: number;
		pad?: boolean;
		cols?: number;
		/** 页上 BASIC 7 列 / NEW 3 列；分享图用 cols 固定列数 */
		board?: 'basic' | 'new' | null;
		/** share：纯十六进制，给 html-to-image；page：跟站点主题 */
		tone?: 'share' | 'page';
	} = $props();

	const cells = $derived(
		Array.from({ length: pad ? slots : Math.min(list.length, slots) }, (_, i) => list[i] ?? null)
	);
	const gridClass = $derived(
		board === 'basic' ? 'rv-djmax-grid-basic' : board === 'new' ? 'rv-djmax-grid-new' : ''
	);
	const gridStyle = $derived(
		board ? '' : `display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:6px;`
	);
</script>

<div class={gridClass} style={gridStyle}>
	{#each cells as entry, i (entry?.chartKey ?? `empty-${i}`)}
		{@const pattern = entry ? diffKeyFromChartKey(entry.chartKey) : ''}
		{@const badge = djmaxPatternStyle(pattern)}
		{@const badgeText = entry ? djmaxBadgeText(pattern, entry.label) : ''}
		{@const floor = entry ? djmaxFloorLabel(entry.floorName, entry.label) : ''}
		<div style="min-width:0;">
			{#if entry}
				<div
					style="position:relative;aspect-ratio:1;overflow:hidden;border-radius:4px;background:#2a2a2a;"
				>
					{#if entry.cover}
						<img
							src={entry.cover}
							alt=""
							loading="lazy"
							style="width:100%;height:100%;object-fit:cover;display:block;"
						/>
					{/if}
					<span
						style="position:absolute;left:4px;top:3px;font-size:10px;font-weight:700;color:#fff;text-shadow:0 1px 2px #000;"
					>
						{i + 1}
					</span>
					{#if badgeText}
						<span
							style="position:absolute;right:3px;top:3px;padding:1px 4px;border-radius:3px;font-size:9px;font-weight:700;line-height:1.35;background:{badge.bg};color:{badge.fg};"
						>
							{badgeText}
						</span>
					{/if}
					<div
						style="position:absolute;left:0;right:0;bottom:0;padding:10px 4px 3px;background:linear-gradient(to top, rgba(0,0,0,0.82), rgba(0,0,0,0));display:flex;align-items:flex-end;gap:3px;"
					>
						<p
							style="margin:0;flex:1;min-width:0;font-size:9px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#fff;text-shadow:0 1px 2px #000;"
							title={entry.title}
						>
							{entry.title}
						</p>
						{#if entry.maxCombo}
							<span
								style="flex-shrink:0;font-size:8px;font-weight:800;letter-spacing:0.04em;color:#facc15;text-shadow:0 1px 2px #000;"
							>
								MAX
							</span>
						{/if}
					</div>
				</div>
				{#if tone === 'page'}
					<div class="mt-0.5 flex justify-between gap-1 font-mono text-[11px] leading-tight tabular-nums">
						<span class={djmaxFloorHot(floor) ? 'text-red-400' : 'text-base-content/50'}>
							{floor || '—'}
						</span>
						<span class={scoreToneClass('v', entry.score)}>{compactScore(entry.score, 'v')}</span>
					</div>
				{:else}
					<div
						style="display:flex;justify-content:space-between;gap:4px;margin-top:2px;font-size:10px;font-family:ui-monospace,monospace;line-height:1.3;font-variant-numeric:tabular-nums;"
					>
						<span style="color:{djmaxFloorHot(floor) ? '#f87171' : '#a3a3a3'};">{floor || '—'}</span>
						<span style="color:{djmaxScoreColor(entry.score)};">{compactScore(entry.score, 'v')}</span>
					</div>
				{/if}
			{:else}
				<div
					style="position:relative;aspect-ratio:1;overflow:hidden;border-radius:4px;background:#262626;"
				>
					<span style="position:absolute;left:4px;bottom:3px;font-size:10px;color:#525252;"
						>{i + 1}</span
					>
				</div>
			{/if}
		</div>
	{/each}
</div>
