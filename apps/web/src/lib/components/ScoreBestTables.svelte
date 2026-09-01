<script lang="ts">
	import { formatScore } from '$lib/format-score';
	import type { BestEntry, ScoreView } from '$lib/score-types';

	let {
		view
	}: {
		view: ScoreView;
	} = $props();

	const sections = $derived(
		view.kind === 'djmax'
			? [
					{ name: '旧曲 best 70', list: view.basic, scoreKind: 'v' as const },
					{ name: '新曲 best 30', list: view.new, scoreKind: 'v' as const }
				]
			: view.kind === 'chunithm'
				? [
						{ name: '旧曲 best 30', list: view.oldBest, scoreKind: 'score' as const },
						{ name: '新曲 best 20', list: view.newBest, scoreKind: 'score' as const }
					]
				: [
						{ name: '旧曲 best 35', list: view.oldBest, scoreKind: 'pct' as const },
						{ name: '新曲 best 15', list: view.newBest, scoreKind: 'pct' as const }
					]
	);

	function fmtScore(entry: BestEntry, kind: 'pct' | 'v' | 'score') {
		return formatScore(entry.score, kind);
	}

	const ratingHeader = $derived(view.kind === 'djmax' ? 'DJPower' : '单曲 rating');
	const scoreHeader = $derived(view.kind === 'djmax' ? 'V 值' : view.kind === 'chunithm' ? '分数' : '达成率');
	const dsHeader = $derived(view.kind === 'djmax' ? '谱面' : '定数');
</script>

{#each sections as section (section.name)}
	<div class="rv-panel mt-4 p-5">
		<h2 class="font-semibold">{section.name}</h2>
		<div class="mt-3 overflow-x-auto">
			<table class="table table-sm">
				<thead>
					<tr>
						<th>#</th>
						<th>曲目</th>
						<th>{dsHeader}</th>
						<th>{scoreHeader}</th>
						<th>{ratingHeader}</th>
					</tr>
				</thead>
				<tbody>
					{#each section.list as entry, i (entry.chartKey)}
						<tr>
							<td>{i + 1}</td>
							<td>
								<div class="flex items-center gap-2">
									{#if entry.cover}
										<img src={entry.cover} alt="" class="w-8 h-8 rounded object-cover" loading="lazy" />
									{/if}
									{entry.title}
								</div>
							</td>
							<td>
								<span class="badge badge-ghost badge-sm font-mono">
									{view.kind === 'djmax' ? entry.label : `${entry.label} · ${entry.value}`}
								</span>
							</td>
							<td>{formatScore(entry.score, section.scoreKind)}</td>
							<td class="font-bold">{entry.rating}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
{/each}
