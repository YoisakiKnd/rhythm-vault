<script lang="ts">
	import { onMount } from 'svelte';

	let {
		points
	}: {
		points: Array<{ t: string; v: number }>;
	} = $props();

	let el: HTMLDivElement | undefined = $state();
	let chart: { setOption: (opt: unknown, notMerge?: boolean) => void; resize: () => void; dispose: () => void } | undefined;

	async function ensureChart() {
		if (chart || !el) return;
		const echarts = await import('echarts/core');
		const { LineChart } = await import('echarts/charts');
		const { GridComponent, TooltipComponent } = await import('echarts/components');
		const { CanvasRenderer } = await import('echarts/renderers');
		echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);
		chart = echarts.init(el);
	}

	function applyOption(pts: Array<{ t: string; v: number }>) {
		if (!chart || pts.length < 2) return;
		chart.setOption(
			{
				grid: { left: 48, right: 16, top: 24, bottom: 28 },
				tooltip: {
					trigger: 'axis',
					formatter: (params: Array<{ value: number; axisValue: string }>) =>
						`${params[0].axisValue}<br/>rating: <b>${params[0].value}</b>`
				},
				xAxis: {
					type: 'category',
					data: pts.map((p) => new Date(p.t).toLocaleDateString('zh-CN')),
					boundaryGap: false
				},
				yAxis: { type: 'value', scale: true },
				series: [
					{
						type: 'line',
						data: pts.map((p) => p.v),
						smooth: true,
						symbolSize: 6,
						lineStyle: { color: '#b58cff', width: 2 },
						itemStyle: { color: '#b58cff' },
						areaStyle: { color: 'rgba(181, 140, 255, 0.12)' }
					}
				]
			},
			true
		);
	}

	onMount(() => {
		const onResize = () => chart?.resize();
		window.addEventListener('resize', onResize);
		return () => {
			window.removeEventListener('resize', onResize);
			chart?.dispose();
			chart = undefined;
		};
	});

	$effect(() => {
		const pts = points;
		if (pts.length < 2 || !el) return;
		void ensureChart().then(() => applyOption(pts));
	});
</script>

{#if points.length >= 2}
	<div bind:this={el} class="h-60 w-full"></div>
{:else}
	<p class="text-sm text-base-content/50 py-6 text-center">
		同步次数越多曲线越完整（当前 {points.length} 个数据点，至少同步两次后出图）
	</p>
{/if}
