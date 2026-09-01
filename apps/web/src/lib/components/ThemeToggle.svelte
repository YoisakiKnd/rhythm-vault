<script lang="ts">
	import { applyTheme, readStoredTheme, type ThemeName } from '$lib/prefs';
	import { onMount } from 'svelte';

	let { compact = false }: { compact?: boolean } = $props();
	let theme = $state<ThemeName>('dark');

	onMount(() => {
		theme = readStoredTheme() ?? 'dark';
	});

	function setTheme(next: ThemeName) {
		theme = next;
		applyTheme(next);
	}

	function toggle() {
		setTheme(theme === 'dark' ? 'light' : 'dark');
	}
</script>

{#if compact}
	<button type="button" class="btn btn-ghost btn-sm w-full" onclick={toggle}>
		{theme === 'dark' ? '切换浅色外观' : '切换深色外观'}
	</button>
{:else}
	<div class="join">
		<button
			type="button"
			class="join-item btn btn-sm {theme === 'dark' ? 'btn-primary' : 'btn-ghost'}"
			onclick={() => setTheme('dark')}
		>
			深色
		</button>
		<button
			type="button"
			class="join-item btn btn-sm {theme === 'light' ? 'btn-primary' : 'btn-ghost'}"
			onclick={() => setTheme('light')}
		>
			浅色
		</button>
	</div>
{/if}
