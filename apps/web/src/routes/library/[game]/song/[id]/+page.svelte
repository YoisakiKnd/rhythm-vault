<script lang="ts">
	import SiteFooter from '$lib/components/SiteFooter.svelte';
	import { dlcChipStyle } from '$lib/dlc-style';
	import { chartBadgeClass } from '$lib/library-display';
	import { badgeText } from '$lib/badge-display';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const scoreHeader = $derived(
		data.game === 'djmax' ? 'V 值' : data.game === 'chunithm' ? '分数' : '达成率'
	);
	const ratingHeader = $derived(data.game === 'djmax' ? 'DJPower' : '单曲 rating');
	const dsHeader = $derived(data.game === 'djmax' ? '理论值' : '定数');
	const playedCount = $derived(data.charts.filter((c) => c.mine).length);

	const typeLabel = $derived(
		data.chartType === 'utage' ? '宴' : data.chartType === 'dx' ? 'DX' : data.chartType === 'standard' ? '标准' : null
	);

	function fmtScore(s: number | null | undefined) {
		if (s === null || s === undefined) return '—';
		if (data.game === 'maimai') return `${s.toFixed(4)}%`;
		if (data.game === 'djmax') return `${s.toFixed(2)}%`;
		return String(Math.round(s));
	}

	function fmtRating(r: number | null | undefined) {
		if (r === null || r === undefined) return '—';
		return Number.isInteger(r) ? String(r) : r.toFixed(2);
	}

	function fmtDs(v: number) {
		if (v <= 0) return '—';
		return Number.isInteger(v) ? String(v) : v.toFixed(2);
	}
</script>

<svelte:head><title>{data.title} · {data.gameLabel} 曲库</title></svelte:head>


<main class="mx-auto max-w-4xl px-3 sm:px-4 py-5 sm:py-8">
	<div class="breadcrumbs text-sm mb-4">
		<ul>
			<li><a href={data.listHref}>{data.gameLabel}</a></li>
			<li class="truncate max-w-[10rem] sm:max-w-xs">{data.title}</li>
		</ul>
	</div>

	<div class="flex gap-4 sm:gap-5 items-start">
		<img
			src={data.cover}
			alt={data.title}
			class="w-24 h-24 sm:w-40 sm:h-40 rounded-xl object-cover shadow bg-base-300 shrink-0"
			loading="eager"
		/>
		<div class="min-w-0 flex-1">
			<h1 class="text-lg sm:text-2xl font-bold break-words leading-snug">
				{data.title}
				{#if data.isNew}
					<span class="badge badge-secondary badge-outline align-middle">NEW</span>
				{/if}
			</h1>
			{#if data.artist}
				<p class="text-sm text-base-content/70 mt-1 break-words">{data.artist}</p>
			{/if}
			<div class="flex flex-wrap gap-1.5 mt-2.5">
				{#if typeLabel}
					<span class="badge badge-sm {data.chartType === 'utage' ? 'badge-accent' : 'badge-outline'}">{typeLabel}</span>
				{/if}
				{#if data.genre}
					<span class="badge badge-sm badge-ghost">{data.genre}</span>
				{/if}
				{#if data.versionTitle}
					<span class="badge badge-sm badge-outline">{data.versionTitle}</span>
				{/if}
				{#if data.dlcCode}
					<span class="badge badge-sm font-medium max-w-[9rem] truncate" style={dlcChipStyle(data.dlcCode)} title={data.dlcName}>{data.dlcName}</span>
				{/if}
				<span class="badge badge-sm badge-ghost">#{data.id}</span>
			</div>
			<p class="text-xs text-base-content/50 mt-3">
				{data.charts.length} 张谱面
				{#if data.loggedIn}
					· 已同步 {playedCount} 张
				{/if}
			</p>
		</div>
	</div>

	{#if !data.loggedIn}
		<div class="alert mt-5 text-sm">
			<span>登录后可查看该曲各谱面的同步成绩。</span>
			<a href={data.loginHref} class="btn btn-sm btn-primary">登录</a>
		</div>
	{/if}

	{#each data.groups as group (group.button ?? 'all')}
		<section class="mt-6">
			<h2 class="text-base font-semibold mb-2 flex items-center gap-2">
				{#if group.button != null}
					{group.button}B
					{#if data.focusDiff === `${group.button}B`}
						<span class="badge badge-primary badge-sm">当前筛选</span>
					{/if}
				{:else}
					谱面与成绩
				{/if}
			</h2>

			<div class="grid grid-cols-2 sm:hidden gap-2">
				{#each group.charts as chart (chart.chartKey)}
					<div class="rounded-xl bg-base-200 p-3">
						<div class="flex items-center justify-between gap-1">
							<span class="badge {chartBadgeClass(chart.diffKey)} badge-sm font-mono">
								{data.game === 'djmax' ? chart.pattern : chart.diffLabel}
							</span>
							<span class="font-mono text-sm">
								{chart.levelLabel}{#if chart.floorName}<span
										class="ml-1 text-xs {Number(chart.floorName) >= 15
											? 'text-red-400'
											: 'text-base-content/50'}">{chart.floorName}</span
									>{/if}
							</span>
						</div>
						<div class="mt-2 text-xs text-base-content/50">{dsHeader} {fmtDs(chart.levelValue)}</div>
						<div class="mt-1 text-sm font-medium truncate">
							{data.loggedIn ? fmtScore(chart.mine?.score ?? null) : '—'}
						</div>
						<div class="text-xs text-base-content/60">
							{ratingHeader}
							<span class="font-semibold text-base-content">{data.loggedIn ? fmtRating(chart.mine?.rating ?? null) : '—'}</span>
							{#if data.loggedIn && badgeText(data.game, chart.mine?.badges)}
								<span class="badge badge-outline badge-xs ml-1">{badgeText(data.game, chart.mine?.badges)}</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>

			<div class="hidden sm:block overflow-x-auto rounded-box bg-base-200">
				<table class="table table-sm">
					<thead>
						<tr>
							<th>难度</th>
							<th>等级</th>
							{#if data.game === 'djmax'}
								<th>층</th>
							{/if}
							<th>{dsHeader}</th>
							<th>{scoreHeader}</th>
							<th>{ratingHeader}</th>
							<th>标记</th>
						</tr>
					</thead>
					<tbody>
						{#each group.charts as chart (chart.chartKey)}
							<tr>
								<td>
									<span class="badge {chartBadgeClass(chart.diffKey)} badge-sm font-mono">
										{data.game === 'djmax' ? chart.pattern : chart.diffLabel}
									</span>
									{#if chart.isNew}<span class="badge badge-secondary badge-outline badge-sm">NEW</span>{/if}
								</td>
								<td class="font-mono">{chart.levelLabel}</td>
								{#if data.game === 'djmax'}
									<td
										class="font-mono {chart.floorName && Number(chart.floorName) >= 15
											? 'text-red-400'
											: ''}"
									>
										{chart.floorName ?? '—'}
									</td>
								{/if}
								<td class="font-mono">{fmtDs(chart.levelValue)}</td>
								<td>{data.loggedIn ? fmtScore(chart.mine?.score ?? null) : '—'}</td>
								<td class="font-bold">{data.loggedIn ? fmtRating(chart.mine?.rating ?? null) : '—'}</td>
								<td>
									{#if data.loggedIn && badgeText(data.game, chart.mine?.badges)}
										<span class="badge badge-outline badge-sm">{badgeText(data.game, chart.mine?.badges)}</span>
									{:else}
										—
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/each}

	{#if data.loggedIn}
		<p class="text-xs text-base-content/50 mt-4">
			{#if playedCount === 0}
				尚未游玩或尚未同步该曲成绩。请先绑定查分器并同步。
			{:else}
				成绩来自最近一次同步{#if data.syncedAt}（{new Date(data.syncedAt).toLocaleString('zh-CN')}）{/if}；未显示分数的谱面为尚未游玩或未同步。
			{/if}
		</p>
	{/if}
</main>

<SiteFooter />
