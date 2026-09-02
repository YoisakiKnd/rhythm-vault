<script lang="ts">
	import RatingChart from '$lib/components/RatingChart.svelte';
	import ScoreBestTables from '$lib/components/ScoreBestTables.svelte';
	import ShareCard from '$lib/components/ShareCard.svelte';
	import { compactRating } from '$lib/best-display';
	import { downloadSharePng } from '$lib/download-share';
	import { bestHeadline, ratingSum, viewSections, type ScoreView } from '$lib/score-types';
	import type { Snippet } from 'svelte';

	interface PushEntry {
		chartId: string;
		title: string;
		label: string;
		ds: number;
		currentRating: number | null;
		target: number;
		targetRating: number;
		gain: number;
	}

	let {
		username,
		game,
		gameLabel,
		view,
		history,
		error,
		push = null,
		emptyHref,
		emptyLabel,
		extraActions
	}: {
		username: string;
		game: string;
		gameLabel: string;
		view: ScoreView | null;
		history: Array<{ t: string; v: number; button?: number }>;
		error: string | null;
		push?: { b50Min: number; improve: PushEntry[]; unplayed: PushEntry[] } | null;
		emptyHref?: string;
		emptyLabel?: string;
		extraActions?: Snippet;
	} = $props();

	const shareSections = $derived(view ? viewSections(view) : []);
	let cardEl: HTMLDivElement | undefined = $state();
	let sharing = $state(false);

	function fmt(s: string | null) {
		return s ? new Date(s).toLocaleString('zh-CN') : '—';
	}

	async function saveShare() {
		if (!cardEl || !view) return;
		sharing = true;
		try {
			await downloadSharePng(cardEl, `${username}-${game}-rating.png`);
		} finally {
			sharing = false;
		}
	}
</script>

{#if error}
	<div class="rv-panel mt-4 p-8 text-center">
		<p class="text-base-content/60">{error}</p>
		{#if emptyHref}
			<a href={emptyHref} class="btn btn-primary btn-sm mt-3">{emptyLabel ?? '去绑定数据源'}</a>
		{/if}
	</div>
{:else if view}
	<div class="rv-panel mt-4 p-5">
		<div class="flex flex-wrap items-end justify-between gap-3">
			<div>
				<p class="text-xs uppercase tracking-widest text-base-content/45">{bestHeadline(view.kind)}</p>
				<p class="mt-1 font-black tracking-tight text-4xl text-primary">{compactRating(view.kind, view.rating)}</p>
				<p class="mt-1 text-sm text-base-content/55">
					{view.kind === 'djmax' ? `${gameLabel} ${view.button}B` : gameLabel}
				</p>
			</div>
			<div class="text-sm text-base-content/60">
				{#if view.kind !== 'chunithm'}
					<div class="flex flex-wrap gap-3">
						{#each shareSections as s (s.short)}
							<div>
								<p class="text-xs text-base-content/45">{s.short}</p>
								<p class="font-mono font-semibold">{compactRating(view.kind, ratingSum(s.list))}</p>
							</div>
						{/each}
					</div>
				{/if}
				<p class="mt-2 text-xs">同步 {fmt(view.syncedAt)}</p>
			</div>
		</div>
		<div class="mt-4 flex flex-wrap gap-2">
			<button class="btn btn-outline btn-sm" onclick={saveShare} disabled={sharing}>
				{sharing ? '生成中…' : '下载分享图'}
			</button>
			{#if extraActions}
				{@render extraActions()}
			{/if}
		</div>
	</div>

	<div class="rv-panel mt-4 p-5">
		<h2 class="font-semibold">rating 历史</h2>
		<div class="mt-3">
			<RatingChart points={history} />
		</div>
	</div>

	{#if game === 'maimai' && push}
		{#each [{ name: '已游玩可提升', list: push.improve, hint: `B50 末位 ${push.b50Min}` }, { name: '未游玩 · 可挤入 B50', list: push.unplayed, hint: `B50 末位 ${push.b50Min}` }] as section (section.name)}
			{#if section.list.length > 0}
				<div class="rv-panel mt-4 p-5">
					<h2 class="font-semibold">
						推分建议 · {section.name}
						<span class="badge badge-outline badge-sm ml-1">{section.hint}</span>
					</h2>
					<div class="mt-3 overflow-x-auto">
						<table class="table table-sm">
							<thead>
								<tr><th>曲目</th><th>定数</th><th>当前</th><th>建议目标</th><th>目标 rating</th><th>预期</th></tr>
							</thead>
							<tbody>
								{#each section.list as s (s.chartId)}
									<tr>
										<td>{s.title}</td>
										<td><span class="badge badge-ghost badge-sm font-mono">{s.label} · {s.ds}</span></td>
										<td>{s.currentRating ?? '未游玩'}</td>
										<td>{s.target.toFixed(2)}%</td>
										<td class="font-bold">{s.targetRating}</td>
										<td class="text-success">+{s.gain}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
					<p class="mt-2 text-xs text-base-content/45">
						预期增量 = 目标档位单曲 rating {section.name.includes('未游玩') ? '− 当前 B50 末位' : '− 当前单曲 rating'}，实际 B50 变化以完整组成为准。
					</p>
				</div>
			{/if}
		{/each}
	{/if}

	<ScoreBestTables {view} />

	<div class="mt-6">
		<p class="mb-2 text-sm text-base-content/50">分享图（下载约 960px 宽）</p>
		<div class="overflow-x-auto rounded-xl border border-base-300 bg-neutral/40 p-3">
			<div bind:this={cardEl} class="inline-block">
				<ShareCard
					{username}
					gameLabel={view.kind === 'djmax' ? `${gameLabel} ${view.button}B` : gameLabel}
					kind={view.kind}
					rating={view.rating}
					syncedAt={view.syncedAt}
					sections={shareSections}
				/>
			</div>
		</div>
	</div>
{/if}
