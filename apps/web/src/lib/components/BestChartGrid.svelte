<script lang="ts">
	import { compactScore, diffAccent, diffKeyFromChartKey, scoreToneClass } from '$lib/best-display';
	import type { BestEntry } from '$lib/score-types';

	let {
		list,
		slots,
		scoreKind,
		dense = false,
		showTitle = false,
		pad = false
	}: {
		list: BestEntry[];
		slots: number;
		scoreKind: 'pct' | 'v' | 'score';
		dense?: boolean;
		showTitle?: boolean;
		pad?: boolean;
	} = $props();

	const cells = $derived(
		Array.from({ length: pad ? slots : Math.min(list.length, slots) }, (_, i) => list[i] ?? null)
	);
	const colsClass = $derived(
		dense ? 'grid-cols-7 sm:grid-cols-10' : 'grid-cols-5 sm:grid-cols-7'
	);
</script>

<div class="grid gap-1 {colsClass}">
	{#each cells as entry, i (entry?.chartKey ?? `empty-${i}`)}
		<div class="min-w-0">
			{#if entry}
				<div class="rv-best-tile">
					{#if entry.cover}
						<img src={entry.cover} alt="" loading="lazy" />
					{/if}
					<span
						class="absolute inset-y-0 left-0 w-0.5"
						style="background: {diffAccent(diffKeyFromChartKey(entry.chartKey))}"
					></span>
					<div
						class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-1 pb-0.5 pt-4 text-white"
					>
						<div class="flex items-end justify-between gap-0.5 text-[9px] leading-tight">
							<span class="opacity-70 tabular-nums">#{i + 1}</span>
							<span class="font-bold tabular-nums">{entry.rating ?? '—'}</span>
						</div>
						<div class="truncate font-mono text-[9px] {scoreToneClass(scoreKind, entry.score)}">
							{compactScore(entry.score, scoreKind)}
						</div>
					</div>
				</div>
				{#if showTitle}
					<p class="mt-0.5 truncate text-[11px] leading-tight text-base-content/70" title={entry.title}>
						{entry.title}
					</p>
				{/if}
			{:else}
				<div class="rv-best-tile rv-best-tile-empty flex items-end p-1">
					<span class="text-[10px] text-base-content/30">#{i + 1}</span>
				</div>
			{/if}
		</div>
	{/each}
</div>
