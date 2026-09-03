<script lang="ts">
	import { compactScore, diffKeyFromChartKey } from '$lib/best-display';
	import { chartBadgeClass, diffLabel } from '$lib/library-display';

	interface PushEntry {
		chartId: string;
		title: string;
		label: string;
		cover: string;
		numericId: string;
		ds: number;
		isNew: boolean;
		achievement: number | null;
		currentRating: number | null;
		target: number;
		targetRating: number;
		gain: number;
		effort: number | null;
	}

	let {
		b50Min,
		comfort = null,
		improve,
		unplayed
	}: {
		b50Min: number;
		comfort?: { dsLo: number; dsHi: number; typicalAch: number } | null;
		improve: PushEntry[];
		unplayed: PushEntry[];
	} = $props();

	const sections = $derived([
		{
			name: '再涨一点就能上档',
			hint: '已经打过、离下一档很近',
			list: improve,
			kind: 'improve' as const
		},
		{
			name: '同水平未打谱',
			hint: comfort
				? `定数大约 ${comfort.dsLo.toFixed(1)}–${comfort.dsHi.toFixed(1)}`
				: '定数接近你现在的 B50',
			list: unplayed,
			kind: 'unplayed' as const
		}
	]);
	const hasAny = $derived(improve.length > 0 || unplayed.length > 0);

	function pct(n: number) {
		return compactScore(n, 'pct');
	}

	function effortText(n: number) {
		const v = Math.round(n * 100) / 100;
		return v < 0.1 ? '不到 0.1%' : `${v.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}%`;
	}
</script>

<div class="rv-panel mt-4 p-5">
	<div>
		<h2 class="font-semibold">推分建议</h2>
		<p class="mt-1 text-sm text-base-content/55">
			按你 B50 里已经 SS 过的定数来推，优先离下一档很近的谱。末位单曲 rating
			<span class="font-mono font-semibold text-base-content/80">{b50Min}</span>。
		</p>
	</div>

	{#if !hasAny}
		<p class="mt-4 text-sm text-base-content/50">
			这个水平附近暂时没有更顺手的目标。把已有谱再往上磨一磨，或者同步一次后再看。
		</p>
	{:else}
		{#each sections as section (section.kind)}
			{#if section.list.length > 0}
				<h3 class="mt-5 text-sm font-medium">
					{section.name}
					<span class="ml-2 font-normal text-base-content/45">{section.hint}</span>
				</h3>
				<ul class="mt-2 divide-y divide-base-300">
					{#each section.list as s (s.chartId)}
						{@const diff = diffKeyFromChartKey(s.chartId)}
						<li>
							<a
								href="/library/maimai/song/{s.numericId}"
								class="flex gap-3 py-2.5 -mx-1 px-1 rounded-lg hover:bg-base-200/60"
							>
								<img
									src={s.cover}
									alt=""
									class="w-12 h-12 rounded object-cover shrink-0 bg-base-300"
									loading="lazy"
								/>
								<div class="min-w-0 flex-1">
									<p class="truncate font-medium leading-tight">{s.title}</p>
									<p class="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-base-content/55">
										<span class="badge badge-xs {chartBadgeClass(diff)}">{diffLabel(diff)}</span>
										<span class="font-mono">{s.ds}</span>
										{#if s.isNew}
											<span class="badge badge-outline badge-xs">新</span>
										{/if}
										{#if section.kind === 'improve' && s.effort != null}
											<span>再涨 {effortText(s.effort)}</span>
										{/if}
									</p>
									{#if section.kind === 'improve'}
										<p class="mt-1 font-mono text-sm">
											<span>{pct(s.achievement ?? 0)}</span>
											<span class="mx-1 text-base-content/35">→</span>
											<span>{pct(s.target)}</span>
											<span class="ml-2 text-base-content/45">{s.currentRating}</span>
											<span class="mx-1 text-base-content/35">→</span>
											<span class="font-semibold">{s.targetRating}</span>
										</p>
									{:else}
										<p class="mt-1 text-sm">
											按你现在常见水平打到
											<span class="font-mono font-medium">{pct(s.target)}</span>
											<span class="ml-2 font-mono text-base-content/55">目标 {s.targetRating}</span>
										</p>
									{/if}
								</div>
								<p class="shrink-0 self-center font-mono text-sm font-semibold text-success">
									+{s.gain}
								</p>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		{/each}
		<p class="mt-3 text-xs text-base-content/45">不是越难越该打。实际 B50 以同步后的组成为准。</p>
	{/if}
</div>
