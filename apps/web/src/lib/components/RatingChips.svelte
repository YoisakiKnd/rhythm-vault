<script lang="ts">
	import { djmaxClassLabel, ratingAccentColor } from '$lib/best-display';
	import { formatGameRating, RATING_GAME_LABEL, urlGameFromDb } from '$lib/player-card';

	let {
		ratings,
		hrefFor
	}: {
		ratings: Array<{ game: string; rating: number; button?: number }>;
		hrefFor?: (urlGame: 'maimai' | 'chunithm' | 'djmax') => string;
	} = $props();
</script>

{#if ratings.length === 0}
	<p class="text-sm text-base-content/45">还没有 Rating 记录。绑定查分器并同步后会出现在这里。</p>
{:else}
	<div class="flex flex-wrap gap-2">
		{#each ratings as r (r.game)}
			{@const label = RATING_GAME_LABEL[r.game] ?? r.game}
			{@const extra = r.game === 'djmax' && r.button ? ` ${r.button}B` : ''}
			{@const urlGame = urlGameFromDb(r.game)}
			{@const accent = ratingAccentColor(urlGame, r.rating)}
			{#if hrefFor}
				<a href={hrefFor(urlGame)} class="badge badge-lg badge-outline h-auto gap-1.5 py-2 px-3">
					<span class="text-base-content/60">{label}{extra}</span>
					<span class="font-mono font-semibold" style="color: {accent}">
						{formatGameRating(r.game, r.rating)}
					</span>
					{#if urlGame === 'djmax'}
						<span class="text-[10px] font-bold tracking-wide" style="color: {accent}">
							{djmaxClassLabel(r.rating)}
						</span>
					{/if}
				</a>
			{:else}
				<span class="badge badge-lg badge-outline h-auto gap-1.5 py-2 px-3">
					<span class="text-base-content/60">{label}{extra}</span>
					<span class="font-mono font-semibold" style="color: {accent}">
						{formatGameRating(r.game, r.rating)}
					</span>
					{#if urlGame === 'djmax'}
						<span class="text-[10px] font-bold tracking-wide" style="color: {accent}">
							{djmaxClassLabel(r.rating)}
						</span>
					{/if}
				</span>
			{/if}
		{/each}
	</div>
{/if}
