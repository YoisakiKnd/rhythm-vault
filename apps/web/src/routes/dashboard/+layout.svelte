<script lang="ts">
	import DashboardNav from '$lib/components/DashboardNav.svelte';

	let { children } = $props();
</script>

<svelte:head><title>控制台 · 葱喵工厂</title></svelte:head>

<main class="mx-auto w-full max-w-4xl px-3 sm:px-4 py-6 sm:py-8">
	<DashboardNav />
	<div class="mt-6">{@render children()}</div>
</main>
