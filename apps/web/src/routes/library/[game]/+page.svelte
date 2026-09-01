<script lang="ts">
	import LibraryFilterBar from '$lib/components/LibraryFilterBar.svelte';
	import SiteFooter from '$lib/components/SiteFooter.svelte';
	import { chartBadgeClass } from '$lib/library-display';
	import { libraryFilterParams, songDetailHref, specialDiffsOnly } from '$lib/library-query';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	interface Row {
		id: string;
		numericId: string;
		title: string;
		artist: string;
		category: string;
		cover: string;
		isNew: boolean;
		charts: Array<{ label: string; value: number; diffKey: string; diffLabel: string }>;
	}

	// svelte-ignore state_referenced_locally
	const initial = {
		rows: data.rows as Row[],
		page: data.page,
		pages: data.pages,
		total: data.total,
		q: data.q,
		diff: data.diff,
		pattern: data.pattern,
		level: data.level,
		onlyNew: data.onlyNew,
		src: data.src,
		dlcs: data.dlcs
	};

	let rows = $state<Row[]>(initial.rows);
	let page = $state(initial.page);
	let pages = $state(initial.pages);
	let total = $state(initial.total);
	let loading = $state(false);
	let loadError = $state('');
	let loadSeq = 0;

	let q = $state(initial.q);
	let diff = $state(initial.diff);
	let pattern = $state(initial.pattern);
	let level = $state(initial.level);
	let onlyNew = $state(initial.onlyNew);
	let src = $state(initial.src);
	let selectedDlcs = $state<string[]>(initial.dlcs);
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;

	let sentinel: HTMLDivElement | undefined = $state();

	function paramsFor(p: number): URLSearchParams {
		const params = libraryFilterParams({
			q,
			diff,
			pattern,
			level,
			onlyNew,
			src,
			dlcs: selectedDlcs,
			allDlcCount: data.filters.dlcs?.length
		});
		params.set('page', String(p));
		return params;
	}

	function currentSongHref(numericId: string): string {
		const params = paramsFor(page);
		params.delete('page');
		return songDetailHref(data.game, numericId, params);
	}

	function applyFilters(): void {
		const params = paramsFor(1);
		params.delete('page');
		const qs = params.toString();
		void goto(qs ? `?${qs}` : '?', { keepFocus: true, noScroll: true });
	}

	async function loadMore(): Promise<void> {
		if (loading || page >= pages) return;
		const seq = ++loadSeq;
		loading = true;
		loadError = '';
		try {
			const res = await fetch(`/api/library/${data.game}/songs?${paramsFor(page + 1)}`);
			if (!res.ok) {
				loadError = '加载更多失败，请稍后重试';
				return;
			}
			const body = await res.json();
			if (seq !== loadSeq) return;
			rows = [...rows, ...(body.rows ?? [])];
			page = body.page ?? page + 1;
		} catch {
			loadError = '加载更多失败，请稍后重试';
		} finally {
			if (seq === loadSeq) loading = false;
		}
	}

	function onSearchInput(): void {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => applyFilters(), 300);
	}

	function setDiffs(next: string[]): void {
		diff = next.join(',');
		if (specialDiffsOnly(next)) level = '';
		applyFilters();
	}

	function setPatterns(next: string[]): void {
		pattern = next.join(',');
		applyFilters();
	}

	function setLevels(next: string[]): void {
		level = next.join(',');
		applyFilters();
	}

	function toggleNew(): void {
		onlyNew = !onlyNew;
		applyFilters();
	}

	function setDlcs(next: string[]): void {
		selectedDlcs = next;
		applyFilters();
	}

	function resetFilters(): void {
		if (data.game !== 'djmax') diff = '';
		pattern = '';
		level = '';
		onlyNew = false;
		selectedDlcs = [];
		applyFilters();
	}

	onMount(() => {
		if (!sentinel) return;
		const observer = new IntersectionObserver((entries) => {
			if (entries.some((e) => e.isIntersecting) && !loading && page < pages) {
				void loadMore();
			}
		});
		observer.observe(sentinel);
		return () => observer.disconnect();
	});

	$effect(() => {
		const _game = data.game;
		rows = data.rows;
		page = data.page;
		pages = data.pages;
		total = data.total;
		q = data.q;
		diff = data.diff;
		pattern = data.pattern;
		level = data.level;
		onlyNew = data.onlyNew;
		src = data.src;
		selectedDlcs = data.dlcs;
		void _game;
	});

	const srcLabel = $derived(src === 'lxns' ? '落雪' : '水鱼');
</script>

<svelte:head><title>{data.gameLabel} 曲库 · 葱喵工厂</title></svelte:head>


<main class="mx-auto max-w-5xl px-3 sm:px-4 py-5 sm:py-8">
	<div class="mb-4">
		<h1 class="text-xl sm:text-2xl font-bold tracking-tight">{data.gameLabel}</h1>
		<p class="text-sm text-base-content/50 mt-0.5">
			{#if data.game === 'djmax'}
				{diff || '4B'}
			{:else}
				{srcLabel}
			{/if}
			· {total} 首{#if loading} · 加载中…{/if}
		</p>
	</div>

	<input
		class="input input-sm w-full sm:max-w-sm"
		placeholder="搜索曲名 / ID…"
		aria-label="搜索曲名或 ID"
		bind:value={q}
		oninput={onSearchInput}
	/>
	{#if loadError}
		<div class="alert alert-error text-sm mt-2">{loadError}</div>
	{/if}

	<div class="mt-2">
		<LibraryFilterBar
			game={data.game}
			diffs={data.filters.diffs}
			patterns={data.filters.patterns}
			levels={data.filters.levels}
			dlcOptions={data.filters.dlcs ?? []}
			{diff}
			{pattern}
			{level}
			{onlyNew}
			{selectedDlcs}
			onDiffs={setDiffs}
			onPatterns={setPatterns}
			onLevels={setLevels}
			onToggleNew={toggleNew}
			onDlcs={setDlcs}
			onReset={resetFilters}
		/>
	</div>

	<div class="mt-4 space-y-1.5">
		{#each rows as row (row.id)}
			<a
				href={currentSongHref(row.numericId)}
				class="flex gap-3 py-2.5 sm:py-3 px-2 -mx-1 items-center rounded-xl hover:bg-base-200/70 active:bg-base-200 transition-colors"
			>
				<img
					src={row.cover}
					alt=""
					class="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover shrink-0 bg-base-300"
					loading="lazy"
				/>
				<div class="min-w-0 flex-1">
					<div class="font-medium truncate text-[15px] sm:text-base">
						{row.title}
						{#if row.isNew}<span class="badge badge-secondary badge-outline badge-xs align-middle ml-1">NEW</span>{/if}
					</div>
					<div class="text-xs text-base-content/50 truncate mt-0.5">
						{#if row.artist}{row.artist} · {/if}{row.category}
						<span class="text-base-content/30"> #{row.numericId}</span>
					</div>
					<div class="flex flex-wrap gap-1 mt-1.5">
						{#each row.charts as c, i (`${row.id}:${c.diffKey}:${c.label}:${i}`)}
							<span class="badge {chartBadgeClass(c.diffKey)} badge-sm font-mono">
								{#if data.game === 'djmax'}
									{c.diffKey}{c.label ? ` ${c.label}` : ''}
								{:else}
									{c.diffLabel}{#if c.label && c.label !== c.diffLabel} {c.label}{/if}
								{/if}
							</span>
						{/each}
					</div>
				</div>
			</a>
		{/each}
	</div>

	{#if rows.length === 0 && !loading}
		<p class="text-center text-base-content/50 py-10">没有找到符合条件的曲目</p>
	{/if}

	<div bind:this={sentinel} class="h-px"></div>
	{#if loading}
		<p class="text-center text-base-content/50 py-4">加载中…</p>
	{:else if page >= pages && rows.length > 0}
		<p class="text-center text-base-content/40 py-4 text-sm">已加载全部 {total} 首</p>
	{/if}
</main>

<SiteFooter />
