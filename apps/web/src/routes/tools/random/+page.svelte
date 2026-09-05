<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const gameLabel = $derived(
		data.game === 'maimai' ? '舞萌 DX' : data.game === 'chunithm' ? '中二节奏' : 'DJMAX'
	);
</script>

<svelte:head><title>随机选曲 · 葱喵工厂</title></svelte:head>

<main class="mx-auto max-w-2xl px-3 sm:px-4 py-6 sm:py-8">
	<h1 class="text-xl sm:text-2xl font-bold">随机选曲 · {gameLabel}</h1>

	<form method="GET" class="grid grid-cols-2 sm:flex sm:flex-wrap items-end gap-2 mt-4">
		<input type="hidden" name="game" value={data.game} />
		<label class="block" for="random-min">
			<span class="text-xs text-base-content/70">定数 ≥</span>
			<input
				id="random-min"
				class="input input-sm w-full sm:w-20"
				type="number"
				step="0.1"
				name="min"
				value={data.min}
			/>
		</label>
		<label class="block" for="random-max">
			<span class="text-xs text-base-content/70">定数 ≤</span>
			<input
				id="random-max"
				class="input input-sm w-full sm:w-20"
				type="number"
				step="0.1"
				name="max"
				value={data.max}
			/>
		</label>
		<label class="block" for="random-count">
			<span class="text-xs text-base-content/70">数量</span>
			<input
				id="random-count"
				class="input input-sm w-full sm:w-16"
				type="number"
				min="1"
				max="10"
				name="count"
				value={data.count}
			/>
		</label>
		<label class="label cursor-pointer gap-1 text-sm justify-start col-span-2 sm:col-auto" for="random-new">
			<input
				id="random-new"
				type="checkbox"
				class="checkbox checkbox-sm"
				name="new"
				value="1"
				checked={data.onlyNew}
			/>
			仅新曲
		</label>
		<button class="btn btn-primary btn-sm col-span-2 sm:col-auto">开抽</button>
	</form>

	{#if data.error}
		<div class="alert alert-error text-sm mt-4">{data.error}</div>
	{:else if data.rolled && data.results.length === 0}
		<div class="alert text-sm mt-4">没有符合条件的谱面，试试放宽定数或取消「仅新曲」。</div>
	{/if}

	{#if data.results.length > 0}
		<p class="text-xs text-base-content/50 mt-4">候选谱面 {data.candidates} 个</p>
		<div class="grid gap-3 mt-2">
			{#each data.results as r (r.songId + r.levelLabel)}
				<div class="card bg-base-200 shadow">
					<div class="card-body py-4">
						<div class="flex items-center justify-between gap-2">
							<h2 class="card-title text-base">{r.title}</h2>
							<span class="badge badge-primary font-mono">{r.levelLabel} · {r.levelValue}</span>
						</div>
						{#if r.artist}
							<p class="text-xs text-base-content/50">{r.artist}</p>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</main>
