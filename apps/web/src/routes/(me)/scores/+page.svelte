<script lang="ts">
	import DataPageTabs from '$lib/components/DataPageTabs.svelte';
	import ScoreProfileView from '$lib/components/ScoreProfileView.svelte';
	import { emptyScoresCta } from '$lib/copy';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const view = $derived(data.view);
	const history = $derived(
		data.game === 'djmax' ? data.history.filter((p) => p.button === data.button) : data.history
	);
	const cta = $derived(emptyScoresCta(data.error));

	function channelHref(src: 'df' | 'lxns') {
		const q = new URLSearchParams({ game: data.game });
		if (src === 'lxns') q.set('src', 'lxns');
		return `/scores?${q}`;
	}
</script>

<header>
	<h1 class="rv-page-title">
		查分 · {data.gameLabel}
	</h1>
</header>

<DataPageTabs game={data.game} src={data.src} button={data.button} username={data.username} />

{#if data.game === 'djmax'}
	<div class="join mt-3">
		{#each [4, 5, 6, 8] as b (b)}
			<a href="/scores?game=djmax&button={b}" class="join-item btn btn-sm {data.button === b ? 'btn-primary' : 'btn-ghost'}">
				{b}B
			</a>
		{/each}
	</div>
{:else}
	<div class="join mt-3">
		<a href={channelHref('df')} class="join-item btn btn-sm {data.src !== 'lxns' ? 'btn-primary' : 'btn-ghost'}">水鱼</a>
		<a href={channelHref('lxns')} class="join-item btn btn-sm {data.src === 'lxns' ? 'btn-primary' : 'btn-ghost'}">落雪</a>
	</div>
{/if}

<ScoreProfileView
	username={data.username}
	game={data.game}
	gameLabel={data.gameLabel}
	shareGameLabel={data.shareGameLabel}
	srcLabel={data.srcLabel}
	{view}
	{history}
	error={data.error}
	push={data.push}
	emptyHref={cta?.href}
	emptyLabel={cta?.label}
/>
