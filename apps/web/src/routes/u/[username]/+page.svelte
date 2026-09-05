<script lang="ts">
	import PlayerAvatar from '$lib/components/PlayerAvatar.svelte';
	import RatingChips from '$lib/components/RatingChips.svelte';
	import ScoreProfileView from '$lib/components/ScoreProfileView.svelte';
	import SiteFooter from '$lib/components/SiteFooter.svelte';
	import { emptyScoresCta } from '$lib/copy';
	import { page } from '$app/state';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const games = [
		{ key: 'maimai', label: '舞萌 DX' },
		{ key: 'chunithm', label: '中二节奏' },
		{ key: 'djmax', label: 'DJMAX' }
	] as const;

	const tabUrl = (game: string, button?: number, src?: string) => {
		const params = new URLSearchParams({ game });
		if (button) params.set('button', String(button));
		const useSrc = src ?? data.src;
		if (useSrc === 'lxns' && game !== 'djmax') params.set('src', 'lxns');
		return `/u/${data.username}?${params}`;
	};

	const view = $derived(data.view);
	const history = $derived(
		data.game === 'djmax' ? data.history.filter((p) => p.button === data.button) : data.history
	);
	const cta = $derived(data.isOwner ? emptyScoresCta(data.error) : null);
	let compareTo = $state('');
	let copied = $state(false);

	const ogTitle = $derived(
		view ? `${data.username} · ${data.gameLabel} ${view.rating}` : `${data.username} · 葱喵工厂`
	);
	const ogDesc = $derived(
		view
			? `${data.username} 的${data.gameLabel} rating 为 ${view.rating}`
			: `${data.username} 的公开成绩`
	);

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(page.url.href.split('?')[0] ?? page.url.href);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 1500);
		} catch {
			copied = false;
		}
	}
</script>

<svelte:head>
	<title>{data.username} · 葱喵工厂</title>
	<meta property="og:title" content={ogTitle} />
	<meta property="og:description" content={ogDesc} />
	<meta name="description" content={ogDesc} />
</svelte:head>

<main class="mx-auto max-w-4xl px-4 py-8">
	<section class="rv-panel p-5">
		<div class="flex flex-wrap items-start gap-4">
			<PlayerAvatar name={data.username} size="lg" />
			<div class="min-w-0 flex-1">
				<h1 class="text-2xl font-bold truncate">{data.username}</h1>
				<p class="text-sm text-base-content/55 mt-1">
					加入于 {new Date(data.createdAt).toLocaleDateString('zh-CN')}
					·
					{data.profilePublic ? '公开档案' : '仅自己可见'}
				</p>
				<div class="mt-3 flex flex-wrap gap-2">
					<button type="button" class="btn btn-ghost btn-sm" onclick={copyLink}>
						{copied ? '已复制链接' : '复制主页链接'}
					</button>
					<a class="btn btn-ghost btn-sm" href="/compare?a={data.username}&game={data.game}{data.src === 'lxns' && data.game !== 'djmax' ? '&src=lxns' : ''}">
						去对比
					</a>
					{#if data.isOwner}
						<a class="btn btn-ghost btn-sm" href="/dashboard/settings">设置</a>
					{/if}
				</div>
			</div>
		</div>
		<div class="mt-4">
			<RatingChips ratings={data.ratings} hrefFor={(game) => tabUrl(game, game === 'djmax' ? data.button : undefined)} />
		</div>
	</section>

	{#if data.isOwner}
		<div class="alert mt-4 text-sm">
			<span>
				这是你的主页。
				{#if data.profilePublic}
					访客现在可以看到这份成绩。
				{:else}
					档案尚未公开，访客打不开这个地址。
				{/if}
			</span>
			<a class="btn btn-sm" href="/dashboard/settings">去设置</a>
		</div>
	{/if}

	<div role="tablist" class="tabs tabs-box mt-4 w-full">
		{#each games as g (g.key)}
			<a
				role="tab"
				class="tab flex-1 {data.game === g.key ? 'tab-active' : ''}"
				aria-selected={data.game === g.key}
				href={tabUrl(g.key, g.key === 'djmax' ? data.button : undefined)}
			>
				{g.label}
			</a>
		{/each}
	</div>

	{#if data.game === 'djmax'}
		<div class="join mt-3">
			{#each [4, 5, 6, 8] as b (b)}
				<a href={tabUrl('djmax', b)} class="join-item btn btn-sm {data.button === b ? 'btn-primary' : 'btn-ghost'}">
					{b}B
				</a>
			{/each}
		</div>
	{:else}
		<div class="join mt-3">
			<a href={tabUrl(data.game, undefined, 'df')} class="join-item btn btn-sm {data.src !== 'lxns' ? 'btn-primary' : 'btn-ghost'}">水鱼</a>
			<a href={tabUrl(data.game, undefined, 'lxns')} class="join-item btn btn-sm {data.src === 'lxns' ? 'btn-primary' : 'btn-ghost'}">落雪</a>
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
		emptyHref={cta?.href}
		emptyLabel={cta?.label}
	>
		{#snippet extraActions()}
			<form class="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center" action="/compare" method="GET">
				<input type="hidden" name="a" value={data.username} />
				<input type="hidden" name="game" value={data.game} />
				{#if data.src === 'lxns'}
					<input type="hidden" name="src" value="lxns" />
				{/if}
				{#if data.game === 'djmax'}
					<input type="hidden" name="button" value={data.button} />
				{/if}
				<input
					class="input input-sm w-full sm:w-40"
					name="b"
					placeholder="对方用户名"
					aria-label="对方用户名"
					bind:value={compareTo}
					required
				/>
				<button class="btn btn-sm btn-primary w-full sm:w-auto" type="submit">与他人对比</button>
			</form>
		{/snippet}
	</ScoreProfileView>
</main>

<SiteFooter />
