<script lang="ts">
	import { formatScore } from '$lib/format-score';
	import type { BestEntry } from '$lib/score-types';

	let {
		username,
		gameLabel,
		rating,
		syncedAt,
		sections
	}: {
		username: string;
		gameLabel: string;
		rating: number;
		syncedAt: string | null;
		sections: Array<{ name: string; list: BestEntry[] }>;
	} = $props();

	function fmtScore(score: number | null) {
		if (score === null) return '—';
		if (score >= 1000) return formatScore(score, 'score');
		if (score > 100) return formatScore(score, 'pct');
		return formatScore(score, 'v');
	}
</script>

<div
	class="w-[720px] rounded-2xl overflow-hidden border border-base-300 bg-neutral text-neutral-content shadow-xl"
>
	<div class="px-6 py-5 flex items-end justify-between gap-4 bg-neutral-800">
		<div>
			<p class="text-xs uppercase tracking-widest text-primary">葱喵工厂</p>
			<h2 class="text-2xl font-bold mt-1">{username}</h2>
			<p class="text-sm opacity-70 mt-0.5">{gameLabel}</p>
		</div>
		<div class="text-right">
			<p class="text-xs opacity-60">rating</p>
			<p class="text-4xl font-black text-primary leading-none">{rating}</p>
			{#if syncedAt}
				<p class="text-xs opacity-50 mt-2">{new Date(syncedAt).toLocaleDateString('zh-CN')}</p>
			{/if}
		</div>
	</div>
	<div class="px-6 py-4 grid grid-cols-2 gap-4">
		{#each sections as section (section.name)}
			<div>
				<p class="text-xs font-semibold opacity-70 mb-2">{section.name}</p>
				<ol class="space-y-1.5">
					{#each section.list.slice(0, 10) as entry, i (entry.chartKey)}
						<li class="flex items-center gap-2 text-xs">
							<span class="w-4 text-right opacity-50">{i + 1}</span>
							{#if entry.cover}
								<img src={entry.cover} alt="" class="w-7 h-7 rounded object-cover shrink-0" />
							{/if}
							<span class="flex-1 truncate">{entry.title}</span>
							<span class="font-mono opacity-80">{fmtScore(entry.score)}</span>
							<span class="font-bold w-12 text-right">{entry.rating ?? '—'}</span>
						</li>
					{/each}
				</ol>
			</div>
		{/each}
	</div>
</div>
