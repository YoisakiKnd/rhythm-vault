<script lang="ts">
	let { children } = $props();
</script>

<main class="mx-auto w-full max-w-5xl px-3 sm:px-4 py-6 sm:py-8">
	{@render children()}
</main>
