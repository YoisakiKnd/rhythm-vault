<script lang="ts">
	import { badgeText } from '$lib/badge-display';
	import { compactScore, diffAccent, scoreToneClass } from '$lib/best-display';
	import { scoreKindOf } from '$lib/format-score';
	import { chartBadgeClass } from '$lib/library-display';
	import type { ChartSheetRow } from '$lib/server/completion';

	let {
		game,
		rows
	}: {
		game: 'maimai' | 'chunithm' | 'djmax';
		rows: ChartSheetRow[];
	} = $props();

	const scoreHeader = $derived(game === 'djmax' ? 'V 值' : game === 'chunithm' ? '分数' : '达成率');
	const ratingHeader = $derived(game === 'djmax' ? 'DJPower' : '单曲 rating');
	const kind = $derived(scoreKindOf(game));
</script>

<div class="overflow-x-auto">
	<table class="table table-sm">
		<thead>
			<tr>
				<th>曲目</th>
				<th>谱面</th>
				<th>{scoreHeader}</th>
				<th>{ratingHeader}</th>
				<th>徽章</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row.chartKey)}
				<tr class={!row.mine ? 'opacity-55' : ''}>
					<td>
						<a href="/library/{game}/song/{row.numericId}" class="flex items-center gap-2 min-w-0">
							<img src={row.cover} alt="" class="w-9 h-9 rounded object-cover shrink-0 bg-base-300" loading="lazy" />
							<span class="min-w-0">
								<span class="block truncate font-medium">{row.title}</span>
								<span class="block truncate text-xs text-base-content/50">
									{row.artist}{#if row.dlcName} · {row.dlcName}{/if}
								</span>
							</span>
						</a>
					</td>
					<td class="whitespace-nowrap">
						<span
							class="mr-1 inline-block h-3 w-1 rounded-full align-middle"
							style="background: {diffAccent(row.diffKey)}"
						></span>
						<span class="badge {chartBadgeClass(row.diffKey)} badge-sm font-mono">{row.diffLabel}</span>
						<span class="font-mono text-sm ml-1">{row.levelLabel}</span>
						{#if row.floorName}
							<span
								class="font-mono text-xs ml-1 {Number(row.floorName) >= 15
									? 'text-red-400'
									: 'text-base-content/50'}">{row.floorName}</span
							>
						{/if}
					</td>
					<td class="font-mono whitespace-nowrap {scoreToneClass(kind, row.mine?.score ?? null)}">
						{row.mine ? compactScore(row.mine.score, kind) : '未游玩'}
					</td>
					<td class="font-mono whitespace-nowrap">
						{row.mine?.rating != null
							? Number.isInteger(row.mine.rating)
								? String(row.mine.rating)
								: row.mine.rating.toFixed(2)
							: '—'}
					</td>
					<td class="whitespace-nowrap">
						{#if row.isPp}
							<span class="badge badge-success badge-xs">{game === 'djmax' ? 'PP' : '理论'}</span>
						{/if}
						{#if row.isFc}
							<span class="badge badge-info badge-xs">{game === 'djmax' ? 'MC' : 'FC'}</span>
						{/if}
						{#if badgeText(game, row.mine?.badges)}
							<span class="badge badge-outline badge-xs">{badgeText(game, row.mine?.badges)}</span>
						{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
