<script lang="ts">
	import RatingChart from '$lib/components/RatingChart.svelte';
	import ScoreBestTables from '$lib/components/ScoreBestTables.svelte';
	import ShareCard from '$lib/components/ShareCard.svelte';
	import PushSuggestPanel from '$lib/components/PushSuggestPanel.svelte';
	import { compactRating, djmaxClassLabel, ratingAccentColor } from '$lib/best-display';
	import { downloadShareImage } from '$lib/download-share';
	import { bestHeadline, ratingSum, viewSections, type ScoreView } from '$lib/score-types';
	import { tick, type Snippet } from 'svelte';

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
		username,
		game,
		gameLabel,
		shareGameLabel = '',
		srcLabel = '',
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
		shareGameLabel?: string;
		srcLabel?: string;
		view: ScoreView | null;
		history: Array<{ t: string; v: number; button?: number }>;
		error: string | null;
		push?: {
			b50Min: number;
			comfort: { dsLo: number; dsHi: number; typicalAch: number } | null;
			improve: PushEntry[];
			unplayed: PushEntry[];
		} | null;
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
		if (!view) return;
		sharing = true;
		await tick();
		await tick();
		const el = cardEl;
		if (!el) {
			sharing = false;
			return;
		}
		try {
			await downloadShareImage(el, `${username}-${game}-rating.webp`, {
				backgroundColor: view.kind === 'djmax' ? '#171717' : '#f4f1f8'
			});
		} finally {
			sharing = false;
		}
	}
</script>

{#if error}
	<div class="rv-panel mt-4 p-8 text-center">
		<p class="text-base-content/60">{error}</p>
		{#if emptyHref}
			<a href={emptyHref} class="btn btn-primary btn-sm mt-3">{emptyLabel ?? '去绑定'}</a>
		{/if}
	</div>
{:else if view}
	<div class="rv-panel mt-4 p-5">
		<div class="flex flex-wrap items-end justify-between gap-3">
			<div>
				<p class="text-xs uppercase tracking-widest text-base-content/45">{bestHeadline(view.kind)}</p>
				<p
					class="mt-1 font-black tracking-tight text-4xl"
					style="color: {ratingAccentColor(view.kind, view.rating)}"
				>
					{compactRating(view.kind, view.rating)}
				</p>
				{#if view.kind === 'djmax'}
					<p
						class="mt-1 text-sm font-bold tracking-widest"
						style="color: {ratingAccentColor(view.kind, view.rating)}"
					>
						{djmaxClassLabel(view.rating)}
					</p>
				{/if}
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
		<h2 class="font-semibold">Rating 走势</h2>
		<div class="mt-3">
			<RatingChart points={history} />
		</div>
	</div>

	<ScoreBestTables {view} />

	{#if game === 'maimai' && push}
		<PushSuggestPanel
			b50Min={push.b50Min}
			comfort={push.comfort}
			improve={push.improve}
			unplayed={push.unplayed}
		/>
	{/if}

	{#if sharing}
		<div
			aria-hidden="true"
			style="position:fixed;left:0;top:0;z-index:-1;clip-path:inset(50%);pointer-events:none;"
		>
			<div bind:this={cardEl}>
				<ShareCard
					{username}
					gameLabel={shareGameLabel || gameLabel}
					channelLabel={view.kind === 'djmax' ? `${view.button}B` : srcLabel}
					kind={view.kind}
					rating={view.rating}
					syncedAt={view.syncedAt}
					sections={shareSections}
				/>
			</div>
		</div>
	{/if}
{/if}
