<script lang="ts">
	import {
		compactRating,
		compactScore,
		diffAccent,
		diffKeyFromChartKey
	} from '$lib/best-display';
	import { bestHeadline, ratingSum, type BestSection, type ScoreView } from '$lib/score-types';
	import { scoreKindOf } from '$lib/format-score';

	let {
		username,
		gameLabel,
		kind,
		rating,
		syncedAt,
		sections
	}: {
		username: string;
		gameLabel: string;
		kind: ScoreView['kind'];
		rating: number;
		syncedAt: string | null;
		sections: BestSection[];
	} = $props();

	const scoreKind = $derived(scoreKindOf(kind === 'maimai' ? 'maimai' : kind));
	/** 导出 2x 后宽边约 960px，手机里看着是正常分享图 */
	const width = $derived(kind === 'djmax' ? 520 : 480);
	const cols = $derived(kind === 'djmax' ? 10 : 5);
	const gap = 3;
	const pad = 10;
</script>

<div
	style="width:{width}px;background:#171717;color:#f5f5f5;font-family:ui-sans-serif,system-ui,sans-serif;overflow:hidden;border-radius:12px;"
>
	<div style="display:flex;align-items:flex-end;justify-content:space-between;gap:12px;padding:14px 14px 12px;background:#262626;">
		<div>
			<p style="margin:0;font-size:10px;letter-spacing:0.18em;color:#fcd34d;">葱喵工厂</p>
			<h2 style="margin:4px 0 0;font-size:20px;font-weight:700;line-height:1.2;">{username}</h2>
			<p style="margin:4px 0 0;font-size:12px;color:#a3a3a3;">{gameLabel} · {bestHeadline(kind)}</p>
		</div>
		<div style="text-align:right;">
			<p style="margin:0;font-size:10px;color:#737373;">{bestHeadline(kind)}</p>
			<p style="margin:2px 0 0;font-size:28px;font-weight:900;line-height:1;color:#fcd34d;">
				{compactRating(kind, rating)}
			</p>
			{#if kind !== 'chunithm'}
				<p style="margin:4px 0 0;font-size:11px;color:#a3a3a3;">
					{#each sections as s, i (s.short)}
						{i > 0 ? ' · ' : ''}{s.short}
						{compactRating(kind, ratingSum(s.list))}
					{/each}
				</p>
			{/if}
			{#if syncedAt}
				<p style="margin:6px 0 0;font-size:10px;color:#737373;">{new Date(syncedAt).toLocaleDateString('zh-CN')}</p>
			{/if}
		</div>
	</div>
	<div style="padding:{pad}px {pad}px 12px;">
		{#each sections as section, si (section.short)}
			<div style="margin-top:{si === 0 ? 0 : 10}px;">
				<p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#a3a3a3;">{section.name}</p>
				<div style="display:grid;grid-template-columns:repeat({cols}, minmax(0, 1fr));gap:{gap}px;">
					{#each Array.from({ length: section.slots }, (_, i) => section.list[i] ?? null) as entry, i (entry?.chartKey ?? `empty-${section.short}-${i}`)}
						<div
							style="position:relative;aspect-ratio:1;overflow:hidden;border-radius:4px;background:#2a2a2a;"
						>
							{#if entry}
								{#if entry.cover}
									<img
										src={entry.cover}
										alt=""
										style="width:100%;height:100%;object-fit:cover;display:block;"
									/>
								{/if}
								<span
									style="position:absolute;left:0;top:0;bottom:0;width:2px;background:{diffAccent(
										diffKeyFromChartKey(entry.chartKey)
									)};"
								></span>
								<div
									style="position:absolute;left:0;right:0;bottom:0;padding:3px 4px 2px;background:linear-gradient(to top, rgba(0,0,0,0.82), rgba(0,0,0,0));color:#fff;"
								>
									<div style="display:flex;justify-content:space-between;font-size:8px;line-height:1.2;">
										<span style="opacity:0.7;">#{i + 1}</span>
										<span style="font-weight:700;">{entry.rating ?? '—'}</span>
									</div>
									<div style="font-size:8px;font-family:ui-monospace,monospace;opacity:0.9;">
										{compactScore(entry.score, scoreKind)}
									</div>
								</div>
							{:else}
								<span style="position:absolute;left:4px;bottom:3px;font-size:8px;color:#525252;">#{i + 1}</span>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>
