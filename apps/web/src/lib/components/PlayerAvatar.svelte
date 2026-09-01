<script lang="ts">
	import { avatarHue } from '$lib/player-card';

	let { name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' } = $props();

	const hue = $derived(avatarHue(name));
	const letter = $derived((name[0] ?? '?').toUpperCase());
	const box = $derived(
		size === 'lg' ? 'w-16 h-16 text-2xl' : size === 'sm' ? 'w-8 h-8 text-sm' : 'w-12 h-12 text-lg'
	);
</script>

<div
	class="flex {box} shrink-0 items-center justify-center rounded-full font-bold text-white select-none"
	style="background: hsl({hue} 52% 42%)"
	aria-hidden="true"
>
	{letter}
</div>
