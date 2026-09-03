<script lang="ts">
	let { children } = $props();
</script>

<svelte:head><title>管理后台 · 葱喵工厂</title></svelte:head>

<main class="mx-auto w-full max-w-4xl px-3 sm:px-4 py-6 sm:py-8">
	{@render children()}
</main>
