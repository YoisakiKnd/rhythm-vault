<script lang="ts">
	import SiteFooter from '$lib/components/SiteFooter.svelte';
	import congmiao from '$lib/assets/congmiao.webp';
	import { libraryHref } from '$lib/catalog-nav';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>葱喵工厂</title></svelte:head>

<main class="flex flex-1 flex-col items-center justify-center px-4 py-10 text-center">
	<img
		src={congmiao}
		alt="葱喵"
		width="720"
		height="897"
		class="w-full max-w-[16rem] sm:max-w-xs h-auto select-none"
	/>

	<h1 class="mt-6 text-3xl sm:text-4xl font-bold tracking-tight">葱喵工厂</h1>
	<p class="mt-3 text-sm sm:text-base text-base-content/70 max-w-md">
		舞萌 DX 国服 · 中二节奏 国服 · DJMAX RESPECT V
		<br class="hidden sm:block" />
		曲库、查分、进度、推分 —— 一个站搞定
	</p>
	<div class="mt-6 flex flex-wrap justify-center gap-2">
		{#if data.user}
			<a href="/scores" class="btn btn-primary">查看我的查分</a>
			<a href="/dashboard" class="btn btn-ghost">进入控制台</a>
		{:else}
			<a href="/register" class="btn btn-primary">注册开始查分</a>
			<a href={libraryHref('maimai')} class="btn btn-ghost">浏览曲库</a>
		{/if}
	</div>
</main>

<SiteFooter />
