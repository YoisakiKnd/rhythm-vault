<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { DJMAX_MANUAL_DESC, DJMAX_MANUAL_TITLE } from '$lib/copy';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let songId = $state('');
	let title = $state('');
	let pattern = $state('MX');
	let score = $state('98.00');
	let patterns = $state<Array<{ pattern: string; levelLabel: string; levelValue: number }>>([]);
	// 不在初始化时读 data，避免 state_referenced_locally；由 effect 同步 URL/服务端值
	let q = $state('');
	let button = $state(4);

	$effect(() => {
		q = data.q;
		button = data.button;
	});

	function pickSong(s: (typeof data.songs)[number]) {
		songId = s.id;
		title = s.title;
		patterns = s.patterns;
		if (!patterns.some((p) => p.pattern === pattern) && patterns[0]) {
			pattern = patterns[0].pattern;
		}
	}

	function search() {
		const params = new URLSearchParams();
		params.set('button', String(button));
		if (q.trim()) params.set('q', q.trim());
		goto(`/dashboard/djmax?${params}`);
	}
</script>

<header>
	<h1 class="rv-page-title">{DJMAX_MANUAL_TITLE}</h1>
	<p class="rv-page-desc">{DJMAX_MANUAL_DESC}</p>
</header>

{#if form?.error}
	<div class="alert alert-error text-sm mt-4">{form.error}</div>
{:else if form && 'ok' in form && form.ok}
	<div class="alert alert-success text-sm mt-4">
		{form.message}
		{#if form.result}
			<span class="ml-2 font-mono text-xs">
				{form.result.chartKey} · DJPower {form.result.djpower}
				{#if form.result.rating != null}
					· b100 {form.result.rating}
				{/if}
			</span>
			<a class="link ml-2" href="/scores?game=djmax&button={form.result.button}">查看查分</a>
		{/if}
	</div>
{/if}

<section class="rv-panel mt-5 p-5">
	<h2 class="font-semibold">搜索曲目</h2>
	<div class="mt-3 flex flex-wrap gap-2">
		<select class="select select-sm w-24" bind:value={button}>
			{#each [4, 5, 6, 8] as b (b)}
				<option value={b}>{b}B</option>
			{/each}
		</select>
		<input
			class="input input-sm flex-1 min-w-40"
			placeholder="曲名 / 曲师"
			bind:value={q}
			onkeydown={(e) => e.key === 'Enter' && search()}
		/>
		<button class="btn btn-primary btn-sm" type="button" onclick={search}>搜索</button>
	</div>

	{#if data.songs.length > 0}
		<ul class="mt-3 max-h-64 overflow-y-auto divide-y divide-base-300">
			{#each data.songs as s (s.id)}
				<li>
					<button
						type="button"
						class="flex w-full items-start gap-2 py-2 text-left hover:bg-base-200/60 rounded px-1"
						onclick={() => pickSong(s)}
					>
						<span class="min-w-0 flex-1">
							<span class="font-medium">{s.title}</span>
							{#if s.artist}
								<span class="ml-2 text-xs text-base-content/45">{s.artist}</span>
							{/if}
						</span>
						<span class="shrink-0 text-xs font-mono text-base-content/45">{s.id}</span>
					</button>
				</li>
			{/each}
		</ul>
	{:else if data.q}
		<p class="mt-3 text-sm text-base-content/45">没有匹配的曲目。</p>
	{/if}
</section>

<section class="rv-panel mt-4 p-5">
	<h2 class="font-semibold">登记成绩</h2>
	<form method="POST" action="?/save" use:enhance class="mt-3 space-y-3">
		<input type="hidden" name="songId" value={songId} />
		<input type="hidden" name="button" value={button} />

		<label class="form-control">
			<span class="label-text text-xs">曲目</span>
			<input class="input input-sm" value={title || (songId ? `#${songId}` : '请先搜索并选择')} disabled />
		</label>

		<label class="form-control">
			<span class="label-text text-xs">难度</span>
			<select class="select select-sm" name="pattern" bind:value={pattern} required>
				{#if patterns.length > 0}
					{#each patterns as p (p.pattern)}
						<option value={p.pattern}>{p.pattern} · {p.levelLabel}</option>
					{/each}
				{:else}
					{#each ['NM', 'HD', 'MX', 'SC'] as p (p)}
						<option value={p}>{p}</option>
					{/each}
				{/if}
			</select>
		</label>

		<label class="form-control">
			<span class="label-text text-xs">分数（V 值 0–100）</span>
			<input
				class="input input-sm font-mono"
				name="score"
				type="number"
				min="0"
				max="100"
				step="0.01"
				bind:value={score}
				required
			/>
		</label>

		<label class="label cursor-pointer justify-start gap-2">
			<input type="checkbox" class="checkbox checkbox-sm" name="maxCombo" value="1" />
			<span class="label-text text-sm">MAX COMBO</span>
		</label>

		<button class="btn btn-primary btn-sm" disabled={!songId}>保存并重算 b100</button>
	</form>
	<p class="mt-3 text-xs text-base-content/45">
		DJPower 按曲库 PP 理论值 × 达成率权重估算（社区锚点近似）。与游戏内 / V-ARCHIVE 可能有小幅偏差；绑定
		V-ARCHIVE 同步后以同步值为准。
	</p>
</section>
