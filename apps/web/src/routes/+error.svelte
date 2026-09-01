<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head><title>{page.status} · 葱喵工厂</title></svelte:head>

<main class="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
	<p class="text-6xl sm:text-7xl font-bold text-primary">{page.status}</p>
	<p class="text-base-content/70">{page.error?.message ?? '出了点问题'}</p>
	<div class="flex flex-wrap justify-center gap-2">
		<a href="/" class="btn btn-primary">返回首页</a>
		<a href="/library/maimai" class="btn btn-ghost">浏览曲库</a>
	</div>
</main>
