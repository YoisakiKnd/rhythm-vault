<script lang="ts">
	import SiteFooter from '$lib/components/SiteFooter.svelte';

	const tiers = [
		{ score: '≥ 1009000（SSS+）', add: '定数 + 2.15' },
		{ score: '≥ 1007500（SSS）', add: '定数 + 2 + ⌊(分数−1007500)/100⌋ × 0.01' },
		{ score: '≥ 1005000（SS+）', add: '定数 + 1.5 + ⌊(分数−1005000)/500⌋ × 0.1' },
		{ score: '≥ 1000000（SS）', add: '定数 + 1 + ⌊(分数−1000000)/1000⌋ × 0.1' },
		{ score: '≥ 975000（S）', add: '定数 + ⌊(分数−975000)/2500⌋ × 0.1' },
		{ score: '≥ 925000', add: '定数 − 3' },
		{ score: '≥ 900000', add: '定数 − 5' },
		{ score: '≥ 800000', add: '(定数 − 5) / 2' },
		{ score: '其余', add: '0' }
	];
</script>

<svelte:head><title>中二推分 / 计算器说明 · 葱喵工厂</title></svelte:head>

<main class="mx-auto max-w-3xl px-3 sm:px-4 py-8 sm:py-10">
	<h1 class="text-2xl sm:text-3xl font-bold">中二推分 / 计算器说明</h1>
	<p class="mt-2 text-sm sm:text-base text-base-content/70">
		中二节奏国服单曲 rating 与玩家 rating（旧曲 B30 + 新曲 B20）的计算口径，与站内计算器、查分页一致。
	</p>

	<div class="mt-4 flex flex-wrap gap-2">
		<a class="btn btn-primary btn-sm" href="/tools/calculators?game=chunithm">打开中二计算器</a>
		<a class="btn btn-ghost btn-sm" href="/tools">返回工具箱</a>
		<a class="btn btn-ghost btn-sm" href="/scores?game=chunithm">我的中二查分</a>
	</div>

	<section class="rv-panel mt-6 p-4 sm:p-5 space-y-3 text-sm sm:text-base text-base-content/80 leading-relaxed">
		<h2 class="font-semibold text-base-content text-base sm:text-lg">单曲 rating</h2>
		<p>
			单曲 rating = 谱面定数 + 分数加成，结果向下取整到两位小数。公式与水鱼查分器计算器一致，本站
			<code class="text-xs">packages/core</code> 在浏览器与服务端共用同一实现。
		</p>
		<div class="overflow-x-auto rounded-lg border border-base-300">
			<table class="table table-sm">
				<thead>
					<tr>
						<th>分数门槛</th>
						<th>加成</th>
					</tr>
				</thead>
				<tbody>
					{#each tiers as row (row.score)}
						<tr>
							<td class="whitespace-nowrap">{row.score}</td>
							<td class="font-mono text-xs sm:text-sm">{row.add}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="text-base-content/60 text-sm">
			例：定数 15.0、分数 1009000 → 17.15；定数 14.0、分数 1007600 → 16.01。可在计算器里直接试。
		</p>
	</section>

	<section class="rv-panel mt-3 p-4 sm:p-5 space-y-3 text-sm sm:text-base text-base-content/80 leading-relaxed">
		<h2 class="font-semibold text-base-content text-base sm:text-lg">玩家 rating（B30 + B20）</h2>
		<ul class="list-disc pl-5 space-y-1.5">
			<li>每张谱面取最高分，再算单曲 rating。</li>
			<li>旧曲取单曲 rating 最高的 30 张，当前版本新曲取最高的 20 张（是否新曲由曲库版本表判定）。</li>
			<li>玩家 rating =（旧曲 30 + 新曲 20 的单曲 rating 之和）÷ 50，再向下取整到两位小数。</li>
		</ul>
		<p>
			同步水鱼 / 落雪成绩后，查分页会展示 B30 / B20 明细。站内「推分建议」目前主要覆盖舞萌 DX；中二可借助计算器估算「再高一点分数能涨多少单曲 rating」，结合 B30 边界谱面决定练哪首。
		</p>
	</section>

	<section class="rv-panel mt-3 p-4 sm:p-5 space-y-2 text-sm text-base-content/70">
		<h2 class="font-semibold text-base-content text-base">和工具箱其它入口</h2>
		<ul class="list-disc pl-5 space-y-1">
			<li>
				<a class="link" href="/tools/calculators?game=chunithm">计算器 · 中二</a>
				— 输入定数与分数，本地立刻出单曲 rating。
			</li>
			<li>
				<a class="link" href="/tools/calculators?game=maimai">计算器 · 舞萌</a>
				/
				<a class="link" href="/tools/calculators?game=djmax">DJMAX</a>
				— 同页切换游戏。
			</li>
			<li>
				<a class="link" href="/tools/random?game=chunithm">随机选曲</a>
				— 按定数区间抽歌练推分。
			</li>
		</ul>
	</section>
</main>

<SiteFooter />
