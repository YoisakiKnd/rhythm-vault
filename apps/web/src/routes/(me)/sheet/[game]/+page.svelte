<script lang="ts">
	import ChartSheetTable from '$lib/components/ChartSheetTable.svelte';
	import DataPageTabs from '$lib/components/DataPageTabs.svelte';
	import LibraryFilterBar from '$lib/components/LibraryFilterBar.svelte';
	import { goto } from '$app/navigation';
	import { libraryFilterParams } from '$lib/library-query';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function hrefFor(patch: {
		diff?: string;
		pattern?: string;
		level?: string;
		onlyNew?: boolean;
		dlcs?: string[];
		q?: string;
		filter?: string;
		page?: number;
	}): string {
		const params = libraryFilterParams({
			q: patch.q ?? data.q,
			diff: patch.diff ?? data.diff,
			pattern: patch.pattern ?? data.pattern,
			level: patch.level ?? data.level,
			onlyNew: patch.onlyNew ?? data.onlyNew,
			src: data.src,
			dlcs: patch.dlcs ?? data.dlcs,
			allDlcCount: data.filters.dlcs?.length
		});
		const filter = patch.filter ?? data.resultFilter;
		if (filter && filter !== 'all') params.set('filter', filter);
		if (patch.page && patch.page > 1) params.set('page', String(patch.page));
		const s = params.toString();
		return s ? `/sheet/${data.game}?${s}` : `/sheet/${data.game}`;
	}

	function apply(patch: Parameters<typeof hrefFor>[0]): void {
		void goto(hrefFor({ ...patch, page: 1 }), { replaceState: true, keepFocus: true, noScroll: true });
	}

	function channelHref(src: 'df' | 'lxns') {
		const u = new URL(hrefFor({}), 'http://local');
		if (src === 'lxns') u.searchParams.set('src', 'lxns');
		else u.searchParams.delete('src');
		return `/sheet/${data.game}?${u.searchParams}`;
	}
</script>

<svelte:head><title>完成表 · {data.gameLabel}</title></svelte:head>

<header>
	<h1 class="rv-page-title">
		完成表 · {data.gameLabel}{#if data.game !== 'djmax'}<span class="text-base font-normal text-base-content/50"> · {data.src === 'lxns' ? '落雪' : '水鱼'}</span>{/if}
	</h1>
	<p class="rv-page-desc">
		按等级 / 难度 / 曲包列出全部谱面，并贴上你的成绩。未游玩显示为空。默认不含宴谱与 WORLD'S END。
	</p>
</header>

<DataPageTabs game={data.game} src={data.src} button={data.button} username={data.username} />

{#if data.game !== 'djmax'}
	<div class="join mt-3">
		<a href={channelHref('df')} class="join-item btn btn-sm {data.src !== 'lxns' ? 'btn-primary' : 'btn-ghost'}">水鱼</a>
		<a href={channelHref('lxns')} class="join-item btn btn-sm {data.src === 'lxns' ? 'btn-primary' : 'btn-ghost'}">落雪</a>
	</div>
{/if}

<div class="mt-3">
	<LibraryFilterBar
		game={data.game}
		diffs={data.filters.diffs}
		patterns={data.filters.patterns}
		levels={data.filters.levels}
		dlcOptions={data.filters.dlcs ?? []}
		diff={data.diff}
		pattern={data.pattern}
		level={data.level}
		onlyNew={data.onlyNew}
		selectedDlcs={data.dlcs}
		onDiffs={(next) => apply({ diff: next.join(',') })}
		onPatterns={(next) => apply({ pattern: next.join(',') })}
		onLevels={(next) => apply({ level: next.join(',') })}
		onToggleNew={() => apply({ onlyNew: !data.onlyNew })}
		onDlcs={(next) => apply({ dlcs: next })}
		onReset={() =>
			apply({
				diff: data.game === 'djmax' ? data.diff : '',
				pattern: '',
				level: '',
				onlyNew: false,
				dlcs: [],
				q: '',
				filter: 'all'
			})}
	/>
</div>

<form class="mt-3 flex flex-wrap gap-2" method="GET" action="/sheet/{data.game}">
	{#if data.diff}<input type="hidden" name="diff" value={data.diff} />{/if}
	{#if data.pattern}<input type="hidden" name="pattern" value={data.pattern} />{/if}
	{#if data.level}<input type="hidden" name="level" value={data.level} />{/if}
	{#if data.onlyNew}<input type="hidden" name="new" value="1" />{/if}
	{#if data.src === 'lxns'}<input type="hidden" name="src" value="lxns" />{/if}
	{#if data.dlcs.length}<input type="hidden" name="dlc" value={data.dlcs.join(',')} />{/if}
	<input class="input input-sm w-full sm:w-64" name="q" value={data.q} placeholder="搜曲名 / 曲师 / ID" />
	<button class="btn btn-sm btn-outline">搜索</button>
</form>

<div class="join mt-3">
	<a href={hrefFor({ filter: 'all' })} class="join-item btn btn-sm {data.resultFilter === 'all' ? 'btn-primary' : 'btn-ghost'}">全部</a>
	<a href={hrefFor({ filter: 'unplayed' })} class="join-item btn btn-sm {data.resultFilter === 'unplayed' ? 'btn-primary' : 'btn-ghost'}">未游玩</a>
	<a href={hrefFor({ filter: 'fc' })} class="join-item btn btn-sm {data.resultFilter === 'fc' ? 'btn-primary' : 'btn-ghost'}">{data.game === 'djmax' ? 'MC' : 'FC'}</a>
	<a href={hrefFor({ filter: 'pp' })} class="join-item btn btn-sm {data.resultFilter === 'pp' ? 'btn-primary' : 'btn-ghost'}">{data.game === 'djmax' ? 'PP' : '理论'}</a>
</div>

<section class="rv-panel mt-4 p-4">
	<p class="text-sm text-base-content/60">
		{data.summary.played} / {data.summary.total} 已游玩
		· {data.game === 'djmax' ? 'MC' : 'FC'} {data.summary.fc}
		· {data.game === 'djmax' ? 'PP' : '理论'} {data.summary.pp}
		{#if data.resultFilter !== 'all'}
			· 当前列表 {data.total} 条
		{/if}
	</p>
	<div class="mt-3">
		{#if data.rows.length === 0}
			<p class="text-sm text-base-content/45 py-6 text-center">没有符合筛选的谱面。试试放宽等级或难度。</p>
		{:else}
			<ChartSheetTable game={data.game} rows={data.rows} />
		{/if}
	</div>
	{#if data.pages > 1}
		<div class="mt-4 flex flex-wrap gap-2">
			{#if data.page > 1}
				<a class="btn btn-sm btn-ghost" href={hrefFor({ page: data.page - 1 })}>上一页</a>
			{/if}
			<span class="self-center text-sm text-base-content/50">{data.page} / {data.pages}</span>
			{#if data.page < data.pages}
				<a class="btn btn-sm btn-ghost" href={hrefFor({ page: data.page + 1 })}>下一页</a>
			{/if}
		</div>
	{/if}
</section>
