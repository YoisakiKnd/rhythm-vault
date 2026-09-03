<script lang="ts">
	import { compactScore, diffKeyFromChartKey } from '$lib/best-display';
	import { chartBadgeClass, diffLabel } from '$lib/library-display';
	import { PUSH_EMPTY, PUSH_FLOOR_HINT, PUSH_FOOTNOTE, pushEffortText } from '$lib/copy';

	interface PushEntry {
		chartId: string;
		title: string;
		label: string;
		cover: string;
		numericId: string;
		ds: number;
		isNew: boolean;
		/** maimai: 达成率；chunithm: 分数（字段名统一叫 achievement 以兼容旧调用） */
		achievement?: number | null;
		score?: number | null;
		currentRating: number | null;
		target: number;
		targetRating: number;
		gain: number;
		effort: number | null;
	}

	let {
		game = 'maimai',
		bestMin,
		comfort = null,
		improve,
		unplayed
	}: {
		game?: 'maimai' | 'chunithm';
		/** 当前 best 末位单曲 rating */
		bestMin: number;
		comfort?: { dsLo: number; dsHi: number; typicalAch?: number; typicalScore?: number } | null;
		improve: PushEntry[];
		unplayed: PushEntry[];
	} = $props();

	const scoreKind = $derived(game === 'chunithm' ? ('score' as const) : ('pct' as const));
	const libGame = $derived(game === 'chunithm' ? 'chunithm' : 'maimai');
	const bestLabel = $derived(game === 'chunithm' ? 'B30+B20' : 'B50');

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
				: `定数接近你现在的 ${bestLabel}`,
			list: unplayed,
			kind: 'unplayed' as const
		}
	]);
	const hasAny = $derived(improve.length > 0 || unplayed.length > 0);

	function currentOf(s: PushEntry): number | null {
		if (typeof s.score === 'number') return s.score;
		if (typeof s.achievement === 'number') return s.achievement;
		return s.achievement ?? s.score ?? null;
	}

	function fmtScore(n: number) {
		return compactScore(n, scoreKind);
	}
</script>

<div class="rv-panel mt-4 p-5">
	<div>
		<h2 class="font-semibold">推分建议</h2>
		<p class="mt-1 text-sm text-base-content/55">
			{PUSH_FLOOR_HINT(bestLabel)}
			<span class="font-mono font-semibold text-base-content/80">{bestMin}</span>。
		</p>
	</div>

	{#if !hasAny}
		<p class="mt-4 text-sm text-base-content/50">{PUSH_EMPTY}</p>
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
						{@const cur = currentOf(s)}
						<li>
							<a
								href="/library/{libGame}/song/{s.numericId}"
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
											<span>再涨 {pushEffortText(game, s.effort)}</span>
										{/if}
									</p>
									{#if section.kind === 'improve'}
										<p class="mt-1 font-mono text-sm">
											<span>{fmtScore(cur ?? 0)}</span>
											<span class="mx-1 text-base-content/35">→</span>
											<span>{fmtScore(s.target)}</span>
											<span class="ml-2 text-base-content/45">{s.currentRating}</span>
											<span class="mx-1 text-base-content/35">→</span>
											<span class="font-semibold">{s.targetRating}</span>
										</p>
									{:else}
										<p class="mt-1 text-sm">
											按你现在常见水平打到
											<span class="font-mono font-medium">{fmtScore(s.target)}</span>
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
		<p class="mt-3 text-xs text-base-content/45">{PUSH_FOOTNOTE(bestLabel)}</p>
	{/if}
</div>
