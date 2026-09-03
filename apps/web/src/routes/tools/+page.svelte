<script lang="ts">
	import SiteFooter from '$lib/components/SiteFooter.svelte';

	const tools = [
		{
			href: '/tools/calculators',
			name: '计算器',
			desc: 'maimai 单曲 rating、中二节奏分数换算 rating、DJMAX 理论 PP——本地精确计算，无需登录'
		},
		{
			href: '/tools/chunithm-rating',
			name: '中二推分 / 计算器说明',
			desc: '中二单曲加成表、B30+B20 口径，以及如何配合计算器估推分'
		},
		{
			href: '/tools/random',
			name: '随机选曲',
			desc: '按游戏、定数区间、是否新曲随机抽歌，选择困难症救星'
		},
		{
			href: '/library/maimai',
			name: '曲库与定数表',
			desc: '三游曲目、谱面、定数检索'
		}
	];
</script>

<svelte:head><title>工具箱 · 葱喵工厂</title></svelte:head>


<main class="mx-auto max-w-3xl px-3 sm:px-4 py-8 sm:py-10">
	<h1 class="text-2xl sm:text-3xl font-bold">工具箱</h1>
	<p class="mt-2 text-base-content/70 text-sm sm:text-base">音游常用小工具；计算器等可在浏览器本地完成，无需登录。</p>

	<div class="grid gap-3 mt-6">
		{#each tools as tool (tool.href)}
			<a href={tool.href} class="card bg-base-200/80 border border-base-300 hover:bg-base-200 transition-colors">
				<div class="card-body p-4 sm:p-5">
					<h2 class="card-title text-base sm:text-lg">{tool.name}</h2>
					<p class="text-sm text-base-content/70">{tool.desc}</p>
				</div>
			</a>
		{/each}
	</div>
</main>

<SiteFooter />
