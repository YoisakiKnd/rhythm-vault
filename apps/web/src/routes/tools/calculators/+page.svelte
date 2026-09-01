<script lang="ts">
	import { chuniRatingOf, diffCoeff, djpowerPp, maimaiRatingOf } from '@rhythm-vault/core';
	import { isGameKey, type GameKey } from '$lib/catalog-nav';
	import { page } from '$app/state';

	const tab = $derived.by((): GameKey => {
		const g = page.url.searchParams.get('game');
		return isGameKey(g) ? g : 'maimai';
	});

	// maimai
	let mDs = $state('13.5');
	let mAch = $state('100.5');
	const maimaiResult = $derived.by(() => {
		const ds = parseFloat(mDs);
		const ach = parseFloat(mAch);
		if (Number.isNaN(ds) || Number.isNaN(ach)) return null;
		return maimaiRatingOf(ds, Math.min(100.5, ach));
	});

	// chunithm
	let cDs = $state('14.5');
	let cScore = $state('1009000');
	const chuniResult = $derived.by(() => {
		const ds = parseFloat(cDs);
		const score = parseInt(cScore, 10);
		if (Number.isNaN(ds) || Number.isNaN(score)) return null;
		if (score < 0 || score > 1010000) return null;
		return chuniRatingOf(ds, score);
	});

	// djmax
	let dLevel = $state('13');
	let dIsSc = $state(false);
	const djmaxResult = $derived.by(() => {
		const level = parseInt(dLevel, 10);
		if (Number.isNaN(level) || level < 1 || level > 15) return null;
		const coeff = diffCoeff(level, dIsSc);
		return { coeff, pp: djpowerPp(coeff) };
	});
</script>

<svelte:head><title>计算器 · 葱喵工厂</title></svelte:head>

<main class="mx-auto max-w-xl px-3 sm:px-4 py-6 sm:py-8">
	<h1 class="text-xl sm:text-2xl font-bold">计算器 · {tab === 'maimai' ? '舞萌' : tab === 'chunithm' ? '中二' : 'DJMAX'}</h1>
	<p class="text-sm text-base-content/70 mt-1">与查分器口径一致，在浏览器本地计算。用左侧切换游戏。</p>


	{#if tab === 'maimai'}
		<div class="card bg-base-200 shadow mt-4">
			<div class="card-body">
				<label class="block">
					<span class="text-sm text-base-content/70">谱面定数</span>
					<input class="input w-full mt-1" type="number" step="0.1" min="1" max="15.5" bind:value={mDs} />
				</label>
				<label class="block">
					<span class="text-sm text-base-content/70">达成率（%）</span>
					<input class="input w-full mt-1" type="number" step="0.0001" min="0" max="101" bind:value={mAch} />
				</label>
				{#if maimaiResult !== null}
					<div class="stat bg-base-300 rounded-box">
						<div class="stat-title">单曲 rating（超过 100.5 按 100.5 计）</div>
						<div class="stat-value text-primary">{maimaiResult}</div>
					</div>
				{:else}
					<p class="text-sm text-error">请输入有效数值</p>
				{/if}
			</div>
		</div>
	{:else if tab === 'chunithm'}
		<div class="card bg-base-200 shadow mt-4">
			<div class="card-body">
				<label class="block">
					<span class="text-sm text-base-content/70">谱面定数</span>
					<input class="input w-full mt-1" type="number" step="0.1" min="1" max="16" bind:value={cDs} />
				</label>
				<label class="block">
					<span class="text-sm text-base-content/70">分数（0–1010000）</span>
					<input class="input w-full mt-1" type="number" step="100" min="0" max="1010000" bind:value={cScore} />
				</label>
				{#if chuniResult !== null}
					<div class="stat bg-base-300 rounded-box">
						<div class="stat-title">单曲 rating（定数 + 加成制）</div>
						<div class="stat-value text-primary">{chuniResult}</div>
					</div>
				{:else}
					<p class="text-sm text-error">请输入有效数值（分数 0–1010000）</p>
				{/if}
			</div>
		</div>
	{:else}
		<div class="card bg-base-200 shadow mt-4">
			<div class="card-body">
				<label class="block">
					<span class="text-sm text-base-content/70">谱面等级（1–15）</span>
					<input class="input w-full mt-1" type="number" min="1" max="15" bind:value={dLevel} />
				</label>
				<label class="label cursor-pointer gap-2 text-sm">
					<input type="checkbox" class="checkbox checkbox-sm" bind:checked={dIsSc} />
					SC 谱面
				</label>
				{#if djmaxResult !== null}
					<div class="stat bg-base-300 rounded-box py-3">
						<div class="stat-title">Perfect Play 理论 DJPower</div>
						<div class="stat-value text-primary text-3xl sm:text-4xl">{djmaxResult.pp.toFixed(2)}</div>
						<div class="stat-desc break-all">系数 {djmaxResult.coeff}（PP = 系数 × 2.22 + 2.31）</div>
					</div>
				{:else}
					<p class="text-sm text-error">请输入有效等级（1–15）</p>
				{/if}
			</div>
		</div>
	{/if}
</main>
