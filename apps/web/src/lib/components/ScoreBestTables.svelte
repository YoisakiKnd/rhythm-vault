<script lang="ts">
	import BestChartGrid from '$lib/components/BestChartGrid.svelte';
	import { compactRating } from '$lib/best-display';
	import { ratingSum, viewSections, type ScoreView } from '$lib/score-types';
	import { scoreKindOf } from '$lib/format-score';

	let {
		view
	}: {
		view: ScoreView;
	} = $props();

	const sections = $derived(viewSections(view));
	const kind = $derived(scoreKindOf(view.kind === 'maimai' ? 'maimai' : view.kind));
</script>

{#each sections as section (section.short)}
	<div class="rv-panel mt-4 p-3 sm:p-4">
		<div class="flex flex-wrap items-end justify-between gap-2">
			<h2 class="font-semibold tracking-tight">{section.name}</h2>
			<p class="text-sm text-base-content/55">
				<span class="font-mono">{section.list.length}/{section.slots}</span>
				{#if view.kind !== 'chunithm'}
					<span class="mx-1">·</span>
					<span class="font-mono font-semibold text-base-content/80">
						{compactRating(view.kind, ratingSum(section.list))}
					</span>
				{/if}
			</p>
		</div>
		<div class="mt-2">
			<BestChartGrid
				list={section.list}
				slots={section.slots}
				scoreKind={kind}
				dense={view.kind === 'djmax'}
			/>
		</div>
	</div>
{/each}
