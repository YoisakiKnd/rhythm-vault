<script lang="ts">
	import DataPageTabs from '$lib/components/DataPageTabs.svelte';
	import ProgressStackBar from '$lib/components/ProgressStackBar.svelte';
	import { emptyScoresCta } from '$lib/copy';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const view = $derived(data.data);
	const fcLabel = $derived(data.game === 'djmax' ? 'MC' : 'FC');
	const ppLabel = $derived(data.game === 'djmax' ? 'PP' : '理论');
	const cta = $derived(emptyScoresCta(data.error));

	function totals(buckets: Array<{ total: number; played: number; fc: number; pp: number }>) {
		return buckets.reduce(
			(acc, b) => ({
				total: acc.total + b.total,
				played: acc.played + b.played,
				fc: acc.fc + b.fc,
				pp: acc.pp + b.pp
			}),
			{ total: 0, played: 0, fc: 0, pp: 0 }
		);
	}

	const overview = $derived.by(() => {
		if (!view) return null;
		if (view.versionBuckets?.length) return totals(view.versionBuckets);
		if (view.dlcBuckets?.length) return totals(view.dlcBuckets);
		if (view.levelBuckets?.length) return totals(view.levelBuckets);
		return null;
	});

	function channelHref(src: 'df' | 'lxns') {
		const q = new URLSearchParams({ game: data.game });
		if (src === 'lxns') q.set('src', 'lxns');
		return `/progress?${q}`;
	}
</script>

<header>
	<h1 class="rv-page-title">
		进度 · {data.game === 'maimai' ? '舞萌 DX' : data.game === 'chunithm' ? '中二节奏' : 'DJMAX'}
	</h1>
</header>

<DataPageTabs game={data.game} src={data.src} button={data.button} username={data.username} />

{#if data.game !== 'djmax'}
	<div class="join mt-3">
		<a href={channelHref('df')} class="join-item btn btn-sm {data.src !== 'lxns' ? 'btn-primary' : 'btn-ghost'}">水鱼</a>
		<a href={channelHref('lxns')} class="join-item btn btn-sm {data.src === 'lxns' ? 'btn-primary' : 'btn-ghost'}">落雪</a>
	</div>
{/if}

{#if data.error}
	<div class="rv-panel mt-4 p-8 text-center">
		<p class="text-base-content/60">{data.error}</p>
		{#if cta}
			<a href={cta.href} class="btn btn-primary btn-sm mt-3">{cta.label}</a>
		{/if}
	</div>
{:else if view}
	{#if overview}
		<section class="rv-panel mt-4 p-5">
			<h2 class="font-semibold">总览</h2>
			<div class="mt-3">
				<ProgressStackBar {...overview} {fcLabel} {ppLabel} />
			</div>
		</section>
	{/if}

	{#if view.versionBuckets}
		<section class="rv-panel mt-4 p-5">
			<h2 class="font-semibold">按版本（牌子进度）</h2>
			<ul class="mt-3 space-y-3">
				{#each view.versionBuckets as b (b.key)}
					<li>
						<p class="mb-1 text-sm font-medium">{b.label}</p>
						<ProgressStackBar total={b.total} played={b.played} fc={b.fc} pp={b.pp} {fcLabel} {ppLabel} />
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if view.dlcBuckets}
		<section class="rv-panel mt-4 p-5">
			<h2 class="font-semibold">按曲包（全部键位谱面）</h2>
			<ul class="mt-3 space-y-3">
				{#each view.dlcBuckets as b (b.key)}
					<li>
						<p class="mb-1 text-sm font-medium">{b.label}</p>
						<ProgressStackBar total={b.total} played={b.played} fc={b.fc} pp={b.pp} {fcLabel} {ppLabel} />
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if view.levelBuckets}
		<section class="rv-panel mt-4 p-5">
			<h2 class="font-semibold">按等级</h2>
			<ul class="mt-3 space-y-3">
				{#each view.levelBuckets as b (b.key)}
					<li>
						<p class="mb-1"><span class="badge badge-ghost badge-sm font-mono">{b.label}</span></p>
						<ProgressStackBar total={b.total} played={b.played} fc={b.fc} pp={b.pp} {fcLabel} {ppLabel} />
					</li>
				{/each}
			</ul>
			<p class="mt-3 text-xs text-base-content/45">
				{fcLabel} / {ppLabel} 依赖成绩里的徽章与分数（水鱼/落雪 fc、V-ARCHIVE maxCombo）。
			</p>
		</section>
	{/if}
{/if}
