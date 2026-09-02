<script lang="ts">
	import { progressStack, type ProgressStackInput } from '$lib/progress-display';

	let {
		total,
		played,
		fc,
		pp,
		fcLabel = 'FC',
		ppLabel = '理论'
	}: ProgressStackInput & { fcLabel?: string; ppLabel?: string } = $props();

	const parts = $derived(progressStack({ total, played, fc, pp }));
	const pct = $derived(total === 0 ? 0 : Math.round((played / total) * 1000) / 10);
</script>

<div>
	<div class="rv-stack" title="已游玩 {played} / {total}">
		{#each parts as p (p.key)}
			{#if p.pct > 0}
				<i
					class={p.key === 'pp'
						? 'rv-stack-pp'
						: p.key === 'fc'
							? 'rv-stack-fc'
							: p.key === 'played'
								? 'rv-stack-played'
								: ''}
					style="width: {p.pct}%"
				></i>
			{/if}
		{/each}
	</div>
	<div class="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-xs">
		<span class="font-mono font-semibold">{pct}%</span>
		<span class="text-base-content/55">
			{played}/{total}
			<span class="mx-1 text-cyan-400">{fcLabel} {fc}</span>
			<span class="text-amber-400">{ppLabel} {pp}</span>
		</span>
	</div>
</div>
