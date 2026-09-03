<script lang="ts">
	import ScoreBestTables from '$lib/components/ScoreBestTables.svelte';
	import SiteFooter from '$lib/components/SiteFooter.svelte';
	import { djmaxClassLabel, ratingAccentColor } from '$lib/best-display';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const games = [
		{ key: 'maimai', label: '舞萌 DX' },
		{ key: 'chunithm', label: '中二节奏' },
		{ key: 'djmax', label: 'DJMAX' }
	] as const;

	const hrefFor = (game: string, a: string, b: string, button?: number) => {
		const params = new URLSearchParams({ game });
		if (a) params.set('a', a);
		if (b) params.set('b', b);
		if (button) params.set('button', String(button));
		if (data.src === 'lxns' && game !== 'djmax') params.set('src', 'lxns');
		return `/compare?${params}`;
	};

	function fmtScore(score: number | null, game: string) {
		if (score === null) return '—';
		if (game === 'maimai') return `${score.toFixed(4)}%`;
		if (game === 'djmax') return score.toFixed(2);
		return String(score);
	}

	const aView = $derived(data.ready ? data.a.view : null);
	const bView = $derived(data.ready ? data.b.view : null);
	const ratingDelta = $derived(
		aView && bView ? Math.round((aView.rating - bView.rating) * 100) / 100 : 0
	);
</script>

<svelte:head>
	<title>
		{data.ready ? `${data.aName} vs ${data.bName}` : '玩家对比'} · 葱喵工厂
	</title>
</svelte:head>


<main class="mx-auto max-w-5xl px-4 py-8">
	<h1 class="text-2xl font-bold">玩家对比</h1>
	<p class="text-sm text-base-content/60 mt-1">仅能对比已打开档案公开的玩家，且只对比 best 列表。</p>

	<div role="tablist" class="tabs tabs-box mt-4">
		{#each games as g (g.key)}
			<a
				role="tab"
				class="tab {data.game === g.key ? 'tab-active' : ''}"
				aria-selected={data.game === g.key}
				href={hrefFor(g.key, data.aName, data.bName, g.key === 'djmax' ? data.button : undefined)}
			>
				{g.label}
			</a>
		{/each}
	</div>

	{#if data.game === 'djmax'}
		<div class="join mt-3">
			{#each [4, 5, 6, 8] as b (b)}
				<a
					href={hrefFor('djmax', data.aName, data.bName, b)}
					class="join-item btn btn-sm {data.button === b ? 'btn-primary' : 'btn-ghost'}"
				>
					{b}B
				</a>
			{/each}
		</div>
	{/if}

	<form class="flex flex-wrap gap-2 mt-4" action="/compare" method="GET">
		<input type="hidden" name="game" value={data.game} />
		{#if data.game === 'djmax'}
			<input type="hidden" name="button" value={data.button} />
		{/if}
		<input class="input input-sm w-40" name="a" value={data.aName} placeholder="玩家 A" required />
		<span class="self-center text-sm opacity-50">vs</span>
		<input class="input input-sm w-40" name="b" value={data.bName} placeholder="玩家 B" required />
		<button class="btn btn-primary btn-sm" type="submit">对比</button>
	</form>

	{#if !data.ready}
		<p class="text-sm text-base-content/50 mt-6">输入两位公开玩家的用户名开始对比。</p>
	{:else}
		<div class="stats stats-vertical sm:stats-horizontal mt-4 shadow">
			<div class="stat">
				<div class="stat-title">
					<a class="link" href="/u/{data.aName}?game={data.game}">{data.aName}</a>
				</div>
				<div
					class="stat-value"
					style={aView ? `color:${ratingAccentColor(aView.kind, aView.rating)}` : ''}
				>
					{aView?.rating ?? '—'}
				</div>
				{#if aView?.kind === 'djmax'}
					<div class="stat-desc font-bold tracking-wide" style={`color:${ratingAccentColor(aView.kind, aView.rating)}`}>
						{djmaxClassLabel(aView.rating)}
					</div>
				{/if}
			</div>
			<div class="stat">
				<div class="stat-title">差值（A − B）</div>
				<div class="stat-value text-2xl {ratingDelta >= 0 ? 'text-success' : 'text-error'}">
					{ratingDelta > 0 ? '+' : ''}{ratingDelta}
				</div>
			</div>
			<div class="stat">
				<div class="stat-title">
					<a class="link" href="/u/{data.bName}?game={data.game}">{data.bName}</a>
				</div>
				<div
					class="stat-value"
					style={bView ? `color:${ratingAccentColor(bView.kind, bView.rating)}` : ''}
				>
					{bView?.rating ?? '—'}
				</div>
				{#if bView?.kind === 'djmax'}
					<div class="stat-desc font-bold tracking-wide" style={`color:${ratingAccentColor(bView.kind, bView.rating)}`}>
						{djmaxClassLabel(bView.rating)}
					</div>
				{/if}
			</div>
		</div>

		<div class="grid md:grid-cols-2 gap-4 mt-4">
			<div>
				<h2 class="font-semibold mb-1">
					<a class="link" href="/u/{data.aName}?game={data.game}">{data.aName}</a>
				</h2>
				{#if data.a.error}
					<p class="text-sm text-base-content/50">{data.a.error}</p>
				{:else if aView}
					<ScoreBestTables view={aView} />
				{/if}
			</div>
			<div>
				<h2 class="font-semibold mb-1">
					<a class="link" href="/u/{data.bName}?game={data.game}">{data.bName}</a>
				</h2>
				{#if data.b.error}
					<p class="text-sm text-base-content/50">{data.b.error}</p>
				{:else if bView}
					<ScoreBestTables view={bView} />
				{/if}
			</div>
		</div>

		<div class="card bg-base-200 shadow mt-6">
			<div class="card-body">
				<h2 class="card-title">双方都有的谱面</h2>
				{#if data.overlap.length === 0}
					<p class="text-sm text-base-content/50">没有重叠谱面。</p>
				{:else}
					<div class="md:hidden space-y-3">
						{#each data.overlap as row (row.chartKey)}
							<div class="flex gap-3">
								{#if row.cover}
									<img src={row.cover} alt="" class="w-10 h-10 rounded object-cover shrink-0" loading="lazy" />
								{/if}
								<div class="min-w-0 flex-1">
									<p class="truncate font-medium">{row.title}</p>
									<p class="font-mono text-xs text-base-content/50">{row.label}</p>
									<p class="mt-1 font-mono text-sm">
										{fmtScore(row.aScore, data.game)}
										<span class="mx-1 text-base-content/40">/</span>
										{fmtScore(row.bScore, data.game)}
										<span class="ml-2 {row.delta >= 0 ? 'text-success' : 'text-error'}">
											{row.delta > 0 ? '+' : ''}{fmtScore(row.delta, data.game)}
										</span>
									</p>
								</div>
							</div>
						{/each}
					</div>
					<div class="hidden overflow-x-auto md:block">
						<table class="table table-sm">
							<thead>
								<tr>
									<th>曲目</th>
									<th>{data.aName}</th>
									<th>{data.bName}</th>
									<th>分差</th>
								</tr>
							</thead>
							<tbody>
								{#each data.overlap as row (row.chartKey)}
									<tr>
										<td>
											<div class="flex items-center gap-2">
												{#if row.cover}
													<img src={row.cover} alt="" class="w-8 h-8 rounded object-cover" loading="lazy" />
												{/if}
												<div>
													<div>{row.title}</div>
													<div class="text-xs opacity-50 font-mono">{row.label}</div>
												</div>
											</div>
										</td>
										<td class="font-mono">{fmtScore(row.aScore, data.game)}</td>
										<td class="font-mono">{fmtScore(row.bScore, data.game)}</td>
										<td class="font-mono {row.delta >= 0 ? 'text-success' : 'text-error'}">
											{row.delta > 0 ? '+' : ''}{fmtScore(row.delta, data.game)}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</main>

<SiteFooter />
