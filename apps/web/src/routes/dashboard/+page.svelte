<script lang="ts">
	import { enhance } from '$app/forms';
	import PlayerAvatar from '$lib/components/PlayerAvatar.svelte';
	import RatingChips from '$lib/components/RatingChips.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const SOURCE_LABEL: Record<string, string> = {
		divingfish: '水鱼查分器',
		lxns: '落雪查分器',
		varchive: 'V-ARCHIVE',
		maimai_dx: '舞萌 DX',
		chunithm: '中二节奏',
		djmax: 'DJMAX RESPECT V',
		oauth: '水鱼成绩'
	};

	let submitting = $state(false);

	function fmtSync(s: string | null) {
		return s ? new Date(s).toLocaleString('zh-CN') : '从未同步';
	}

	const boundCount = $derived(data.links.filter((l) => l?.externalId || l?.hasOAuth).length);
	const summary = $derived(form && 'summary' in form ? form.summary : null);
	const syncError = $derived(form && 'error' in form ? form.error : '');

	const games = $derived([
		{ key: 'maimai_dx', label: '舞萌 DX', at: data.lastSync.maimai_dx ?? null },
		{ key: 'chunithm', label: '中二节奏', at: data.lastSync.chunithm ?? null },
		{ key: 'djmax', label: 'DJMAX', at: data.lastSync.djmax ?? null }
	]);
	const latestSync = $derived(
		games
			.map((g) => g.at)
			.filter((s): s is string => Boolean(s))
			.sort()
			.at(-1) ?? null
	);
</script>

<header>
	<h1 class="rv-page-title">概览</h1>
	<p class="rv-page-desc">绑定查分器，同步成绩。</p>
</header>

<section class="rv-panel mt-6 p-5">
	<div class="flex flex-wrap items-start gap-4">
		<PlayerAvatar name={data.username} size="lg" />
		<div class="min-w-0 flex-1">
			<h2 class="font-semibold text-lg truncate">{data.username}</h2>
			<p class="mt-1 text-sm text-base-content/55">
				{data.profilePublic ? '档案公开，访客可看你的主页' : '档案未公开，只有你能预览主页'}
			</p>
			<div class="mt-3 flex flex-wrap gap-2">
				<a class="btn btn-primary btn-sm" href="/u/{data.username}">我的主页</a>
				<a class="btn btn-ghost btn-sm" href="/dashboard/settings">设置</a>
				<a class="btn btn-ghost btn-sm" href="/scores">查分</a>
				<a class="btn btn-ghost btn-sm" href="/progress">进度</a>
			</div>
		</div>
	</div>
	<div class="mt-4">
		<RatingChips ratings={data.ratings} hrefFor={(game) => `/scores?game=${game}`} />
	</div>
</section>

<div class="mt-4 grid grid-cols-2 gap-3">
	<div class="rv-panel px-4 py-4">
		<p class="text-xs text-base-content/50">已绑定</p>
		<p class="mt-1 text-2xl font-semibold tracking-tight">
			{boundCount}<span class="text-sm font-normal text-base-content/40"> / 3</span>
		</p>
		<a href="/dashboard/links" class="mt-2 inline-block text-xs text-primary">去绑定</a>
	</div>
	<div class="rv-panel px-4 py-4">
		<p class="text-xs text-base-content/50">最近同步</p>
		<p class="mt-1 text-lg font-semibold tracking-tight leading-snug">{fmtSync(latestSync)}</p>
	</div>
</div>

<section class="rv-panel mt-4 p-5">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h2 class="font-semibold">成绩同步</h2>
			<p class="mt-1 text-sm text-base-content/55">点同步会从你绑定的查分器更新成绩。冷却 5 分钟。</p>
		</div>
		<form
			method="POST"
			action="?/sync"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					submitting = false;
					await update();
				};
			}}
		>
			<button class="btn btn-primary btn-sm" disabled={submitting}>
				{submitting ? '同步中…' : '立即同步'}
			</button>
		</form>
	</div>
	<dl class="mt-4 grid gap-2 text-sm sm:grid-cols-3">
		{#each games as g (g.key)}
			<div class="rounded-lg bg-base-200/60 px-3 py-2.5">
				<dt class="text-xs text-base-content/50">{g.label}</dt>
				<dd class="mt-0.5 font-medium">{fmtSync(g.at)}</dd>
			</div>
		{/each}
	</dl>
	{#if syncError}
		<div class="alert alert-error text-sm mt-3">{syncError}</div>
	{/if}
	{#if summary}
		<ul class="mt-3 space-y-1 text-sm">
			{#each Object.entries(summary) as [key, result] (key)}
				<li class={result.ok ? 'text-success' : 'text-error'}>
					{result.ok ? '✓' : '✗'} {SOURCE_LABEL[key] ?? key} — {result.detail}
				</li>
			{/each}
		</ul>
	{/if}
</section>

<section class="rv-panel mt-4 p-5">
	<h2 class="font-semibold">绑定状态</h2>
	<ul class="mt-3 divide-y divide-base-300">
		{#each data.links as link, i (link?.source ?? i)}
			{#if link}
				<li class="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
					<span class="text-sm">{SOURCE_LABEL[link.source] ?? link.source}</span>
					{#if link.externalId || link.hasOAuth}
						<span class="text-xs text-success">已绑定</span>
					{:else}
						<span class="text-xs text-base-content/40">未绑定</span>
					{/if}
				</li>
			{/if}
		{/each}
	</ul>
</section>
