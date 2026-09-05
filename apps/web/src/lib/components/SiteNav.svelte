<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import {
		CATALOG_NAV,
		GAMES,
		catalogItemActive,
		functionActive,
		functionHref,
		gameFromUrl,
		gameLabel,
		gameSwitchHref,
		isDjmaxButton,
		isGameKey,
		parseCatalogSrc,
		parseDjmaxDiff,
		srcFromUrl,
		buttonFromUrl,
		variantLabel,
		variantSwitchHref,
		type CatalogSrc,
		type DjmaxButton,
		type GameKey
	} from '$lib/catalog-nav';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { PREF_CHANGE, PREF_DJMAX, PREF_GAME, PREF_SRC, writePrefDjmax, writePrefGame, writePrefSrc } from '$lib/prefs';

	let {
		children,
		data
	}: { children: Snippet; data: { user: { username: string } | null; isAdmin: boolean } } = $props();

	const user = $derived(data.user);
	let drawerOpen = $state(false);
	let gameMenuOpen = $state(false);
	let remembered = $state<GameKey>('maimai');
	let rememberedSrc = $state<CatalogSrc>('df');
	let rememberedDiff = $state<DjmaxButton>('4B');

	const pathname = $derived(page.url.pathname);
	const search = $derived(page.url.searchParams);
	const urlGame = $derived(gameFromUrl(pathname, search));
	const game = $derived(urlGame ?? remembered);
	const urlSrc = $derived(srcFromUrl(pathname, search));
	const urlDiff = $derived(buttonFromUrl(pathname, search));
	const src = $derived(urlSrc ?? rememberedSrc);
	const diff = $derived(urlDiff ?? rememberedDiff);

	const catalogGroup = $derived(CATALOG_NAV.find((g) => g.game === game));

	$effect(() => {
		void pathname;
		void search.toString();
		drawerOpen = false;
	});

	$effect(() => {
		if (urlGame) {
			remembered = urlGame;
			writePrefGame(urlGame);
		}
	});

	$effect(() => {
		if (urlSrc) {
			rememberedSrc = urlSrc;
			writePrefSrc(urlSrc);
		}
	});

	$effect(() => {
		if (urlDiff) {
			rememberedDiff = urlDiff;
			writePrefDjmax(urlDiff);
		}
	});

	onMount(() => {
		function syncRemembered() {
			try {
				const savedGame = localStorage.getItem(PREF_GAME);
				if (isGameKey(savedGame) && !urlGame) remembered = savedGame;
				const savedSrc = localStorage.getItem(PREF_SRC);
				if ((savedSrc === 'df' || savedSrc === 'lxns') && !urlSrc) rememberedSrc = savedSrc;
				const savedDiff = localStorage.getItem(PREF_DJMAX);
				if (isDjmaxButton(savedDiff) && !urlDiff) rememberedDiff = savedDiff;
			} catch {
				/* ignore */
			}
		}
		syncRemembered();
		window.addEventListener(PREF_CHANGE, syncRemembered);
		return () => window.removeEventListener(PREF_CHANGE, syncRemembered);
	});

	function persistSrc(next: CatalogSrc) {
		rememberedSrc = next;
		writePrefSrc(next);
	}

	function persistDiff(next: DjmaxButton) {
		rememberedDiff = next;
		writePrefDjmax(next);
	}

	function pickGame(next: GameKey) {
		remembered = next;
		writePrefGame(next);
		const href = gameSwitchHref(next, pathname, search, { src: rememberedSrc, diff: rememberedDiff });
		if (href) void goto(href);
		drawerOpen = false;
	}

	function pickVariant(itemKey: string) {
		if (game === 'djmax') persistDiff(parseDjmaxDiff(itemKey));
		else persistSrc(parseCatalogSrc(itemKey));
		const href = variantSwitchHref(game, itemKey, pathname, search);
		if (href) void goto(href);
	}

	async function logout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		location.href = '/';
	}

	const publicFns = [
		{ fn: 'home' as const, label: '首页' },
		{ fn: 'library' as const, label: '曲库' },
		{ fn: 'ranking' as const, label: '排行榜' },
		{ fn: 'compare' as const, label: '玩家对比' },
		{ fn: 'calc' as const, label: '计算器' },
		{ fn: 'random' as const, label: '随机选曲' },
		{ fn: 'docs' as const, label: '文档' }
	];

	const userFns = [
		{ fn: 'scores' as const, label: '查分' },
		{ fn: 'progress' as const, label: '进度' },
		{ fn: 'sheet' as const, label: '完成表' },
		{ fn: 'sync' as const, label: '同步数据' }
	];

	const showCatalogVariant = $derived(
		!pathname.startsWith('/ranking') &&
			!pathname.startsWith('/api-docs') &&
			!pathname.startsWith('/admin')
	);
</script>

{#snippet gameMenu()}
	<ul class="dropdown-content menu bg-base-100 rounded-box z-50 w-44 p-2 shadow-lg border border-base-300 mt-1">
		{#each GAMES as g (g.key)}
			<li>
				<button class={game === g.key ? 'active' : ''} onclick={() => pickGame(g.key)}>{g.label}</button>
			</li>
		{/each}
	</ul>
{/snippet}

{#snippet sideBody()}
	<div class="flex shrink-0 items-center gap-2 px-3 pt-4 pb-3">
		<a href="/" class="flex items-center gap-2 min-w-0">
			<img src={favicon} alt="" class="w-8 h-8 rounded-full bg-base-300" />
			<span class="font-bold tracking-tight truncate">葱喵工厂</span>
		</a>
	</div>

	<div class="shrink-0 px-3">
		<div class="rounded-box bg-base-300/50 p-2 space-y-2">
			<div class="dropdown w-full" onfocusin={() => (gameMenuOpen = true)} onfocusout={() => (gameMenuOpen = false)}>
				<div
					tabindex="0"
					role="button"
					class="btn btn-sm w-full justify-between font-normal bg-base-100"
					aria-haspopup="menu"
					aria-expanded={gameMenuOpen}
					aria-label="选择游戏"
				>
					<span class="truncate">{gameLabel(game)}</span>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3.5 h-3.5 opacity-60 shrink-0">
						<path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
					</svg>
				</div>
				{@render gameMenu()}
			</div>
			{#if catalogGroup && showCatalogVariant}
				<div>
					<p class="text-xs text-base-content/50 px-0.5 mb-1">
						{catalogGroup.kind === 'button' ? '键位' : '渠道'}
					</p>
					<div class="flex flex-wrap gap-1">
						{#each catalogGroup.items as item (item.key)}
							<button
								type="button"
								class="btn btn-xs {catalogItemActive(pathname, search, game, item.key, { src, diff })
									? 'btn-primary'
									: 'btn-ghost bg-base-100'}"
								onclick={() => pickVariant(item.key)}
							>
								{item.label}
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>

	<div class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
		<ul class="menu menu-vertical w-full flex-nowrap px-2 py-3 gap-0.5">
			{#each publicFns as item (item.fn)}
				<li>
					<a href={functionHref(item.fn, game, { src, diff })} class={functionActive(item.fn, pathname) ? 'active' : ''}>
						{item.label}
					</a>
				</li>
			{/each}
			<li>
				<a href="/tools" class={pathname === '/tools' || pathname === '/tools/' ? 'active' : ''}>工具箱</a>
			</li>
			{#if user}
				<li class="menu-title mt-2"><span>我的</span></li>
				{#each userFns as item (item.fn)}
					<li>
						<a href={functionHref(item.fn, game, { src, diff })} class={functionActive(item.fn, pathname) ? 'active' : ''}>
							{item.label}
						</a>
					</li>
				{/each}
				<li>
					<a href="/u/{user.username}" class={pathname === `/u/${user.username}` || pathname.startsWith(`/u/${user.username}/`) ? 'active' : ''}>
						我的主页
					</a>
				</li>
				<li>
					<a
						href="/dashboard"
						class={pathname === '/dashboard' ||
						(pathname.startsWith('/dashboard/') &&
							!pathname.startsWith('/dashboard/links') &&
							!pathname.startsWith('/dashboard/settings'))
							? 'active'
							: ''}
					>
						控制台
					</a>
				</li>
				<li>
					<a href="/dashboard/settings" class={pathname.startsWith('/dashboard/settings') ? 'active' : ''}>
						设置
					</a>
				</li>
				{#if data.isAdmin}
					<li>
						<a href="/admin" class={pathname.startsWith('/admin') ? 'active' : ''}>管理后台</a>
					</li>
				{/if}
			{/if}
		</ul>
	</div>

	<div class="shrink-0 p-3 border-t border-base-300 space-y-1.5" style="padding-bottom: max(0.75rem, env(safe-area-inset-bottom))">
		{#if user}
			<a href="/dashboard/settings" class="btn btn-primary btn-sm w-full truncate">{user.username}</a>
			<ThemeToggle compact />
			<button type="button" class="btn btn-ghost btn-sm w-full" onclick={logout}>退出</button>
		{:else}
			<a href="/login" class="btn btn-primary btn-sm w-full">登录账号</a>
			<a href="/register" class="btn btn-ghost btn-sm w-full">新用户注册</a>
			<ThemeToggle compact />
		{/if}
	</div>
{/snippet}

<div class="drawer lg:drawer-open">
	<input id="rv-drawer" type="checkbox" class="drawer-toggle" bind:checked={drawerOpen} />
	<div class="drawer-content flex min-h-dvh flex-col overflow-x-hidden">
		<header
			class="navbar lg:hidden sticky top-0 z-30 min-h-12 px-2 bg-base-200/90 backdrop-blur-md border-b border-base-300"
			style="padding-top: max(0.25rem, env(safe-area-inset-top))"
		>
			<label for="rv-drawer" class="btn btn-ghost btn-square btn-sm" aria-label={drawerOpen ? '关闭菜单' : '打开菜单'} aria-expanded={drawerOpen}>
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 20" stroke-width="1.8" stroke="currentColor" class="w-5 h-5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
				</svg>
			</label>
			<p class="min-w-0 flex-1 truncate px-1 text-sm font-semibold">
				{#if pathname.startsWith('/admin')}
					管理后台
				{:else if pathname.startsWith('/api-docs')}
					文档
				{:else}
					{gameLabel(game)}{#if showCatalogVariant}
						<span class="font-normal text-base-content/55"> · {variantLabel(game, src, diff)}</span>
					{/if}
				{/if}
			</p>
		</header>
		<div class="flex-1 flex flex-col">
			{@render children()}
		</div>
	</div>
	<div class="drawer-side z-40 lg:w-60 lg:max-w-60">
		<label for="rv-drawer" class="drawer-overlay lg:hidden"></label>
		<aside class="flex h-full min-h-full w-60 flex-col overflow-x-hidden bg-base-200 border-r border-base-300">
			{@render sideBody()}
		</aside>
	</div>
</div>
