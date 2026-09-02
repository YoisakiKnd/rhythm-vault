<script lang="ts">
	import {
		chuniRank,
		comboTag,
		compactRating,
		diffAccent,
		diffKeyFromChartKey,
		djmaxClassLabel,
		maimaiRank,
		meanField,
		rankColor,
		ratingAccentColor,
		shareScoreLabel
	} from '$lib/best-display';
	import { bestHeadline, ratingSum, type BestEntry, type BestSection, type ScoreView } from '$lib/score-types';
	import DjmaxBestGrid from '$lib/components/DjmaxBestGrid.svelte';

	let {
		username,
		gameLabel,
		channelLabel = '',
		kind,
		rating,
		syncedAt,
		sections
	}: {
		username: string;
		gameLabel: string;
		channelLabel?: string;
		kind: ScoreView['kind'];
		rating: number;
		syncedAt: string | null;
		sections: BestSection[];
	} = $props();

	const kicker = $derived(['葱喵工厂', gameLabel, channelLabel].filter(Boolean).join(' · '));
	const all = $derived(sections.flatMap((s) => s.list));
	const width = $derived(kind === 'djmax' ? 1080 : 960);
	const cols = 5;
	const dxKind = $derived(kind === 'chunithm' ? 'chunithm' : 'maimai');
	const accent = $derived(ratingAccentColor(kind, rating));
	const djClass = $derived(kind === 'djmax' ? djmaxClassLabel(rating) : '');

	function rankOf(entry: BestEntry): string {
		return kind === 'chunithm' ? chuniRank(entry.score) : maimaiRank(entry.score);
	}

	function dsText(v: number): string {
		return Number.isInteger(v) ? String(v) : v.toFixed(1);
	}
</script>

{#if kind === 'djmax'}
	<div
		style="width:{width}px;background:#171717;color:#f5f5f5;font-family:ui-sans-serif,system-ui,sans-serif;overflow:hidden;border-radius:12px;"
	>
		<div
			style="display:flex;align-items:flex-end;justify-content:space-between;gap:12px;padding:16px 16px 14px;background:#262626;"
		>
			<div>
				<p style="margin:0;font-size:11px;letter-spacing:0.04em;color:{accent};">{kicker}</p>
				<h2 style="margin:4px 0 0;font-size:22px;font-weight:700;line-height:1.2;">
					{username}
				</h2>
				<p style="margin:4px 0 0;font-size:12px;color:#a3a3a3;">{bestHeadline(kind)}</p>
			</div>
			<div style="text-align:right;">
				<p
					style="margin:0;font-size:13px;font-weight:800;letter-spacing:0.08em;color:{accent};"
				>
					{djClass}
				</p>
				<p style="margin:4px 0 0;font-size:28px;font-weight:900;line-height:1;color:{accent};">
					{compactRating(kind, rating)}
				</p>
				<p style="margin:4px 0 0;font-size:11px;color:#a3a3a3;">
					{#each sections as s, i (s.short)}
						{i > 0 ? ' · ' : ''}{s.short}
						{compactRating(kind, ratingSum(s.list))}
					{/each}
				</p>
				{#if syncedAt}
					<p style="margin:6px 0 0;font-size:10px;color:#737373;">
						{new Date(syncedAt).toLocaleDateString('zh-CN')}
					</p>
				{/if}
			</div>
		</div>
		<div
			style="display:grid;grid-template-columns:7fr 3fr;gap:14px;padding:14px 16px 18px;align-items:start;"
		>
			{#each sections as section, si (section.short)}
				<div
					style="min-width:0;{si === 1
						? 'border-left:1px solid #404040;padding-left:14px;'
						: ''}"
				>
					<p
						style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.04em;color:{accent};"
					>
						{section.name}
						<span style="margin-left:6px;font-weight:600;color:#a3a3a3;">
							{compactRating(kind, ratingSum(section.list))}
						</span>
					</p>
					<DjmaxBestGrid
						list={section.list}
						slots={section.slots}
						pad
						cols={section.short === 'B70' ? 7 : 3}
					/>
				</div>
			{/each}
		</div>
	</div>
{:else}
	<div
		style="width:{width}px;background:#f4f1f8;color:#292524;font-family:ui-sans-serif,system-ui,sans-serif;overflow:hidden;border-radius:16px;"
	>
		<div
			style="display:flex;align-items:flex-end;justify-content:space-between;gap:16px;padding:20px 20px 16px;background:#ffffff;border-bottom:1px solid #e7e5e4;"
		>
			<div>
				<p style="margin:0;font-size:12px;letter-spacing:0.04em;color:{accent};">{kicker}</p>
				<h2 style="margin:6px 0 0;font-size:26px;font-weight:800;line-height:1.15;color:#1c1917;">
					{username}
				</h2>
				<p style="margin:10px 0 0;font-size:12px;color:#57534e;line-height:1.55;">
					<span style="color:{accent};font-weight:700;">{compactRating(kind, rating)}</span>
					{#if kind === 'maimai'}
						= {compactRating(kind, ratingSum(sections[0]?.list ?? []))} + {compactRating(
							kind,
							ratingSum(sections[1]?.list ?? [])
						)}
					{/if}
					<br />
					平均定数 {dsText(meanField(all, 'value'))}
					·
					{kind === 'maimai' ? '平均达成率' : '平均分数'}
					{kind === 'maimai'
						? `${meanField(all, 'score').toFixed(4)}%`
						: String(Math.round(meanField(all, 'score')))}
					· 平均 rating {kind === 'maimai'
						? meanField(all, 'rating').toFixed(2)
						: meanField(all, 'rating').toFixed(2)}
				</p>
			</div>
			<div style="text-align:right;flex-shrink:0;">
				<p
					style="margin:0;font-size:42px;font-weight:900;letter-spacing:0.04em;line-height:1;color:{accent};"
				>
					{bestHeadline(kind)}
				</p>
				<p style="margin:8px 0 0;font-size:32px;font-weight:900;line-height:1;color:{accent};">
					{compactRating(kind, rating)}
				</p>
				{#if syncedAt}
					<p style="margin:8px 0 0;font-size:11px;color:#a8a29e;">
						{new Date(syncedAt).toLocaleDateString('zh-CN')}
					</p>
				{/if}
			</div>
		</div>
		<div style="padding:16px 16px 20px;">
			{#each sections as section, si (section.short)}
				<div style="margin-top:{si === 0 ? '0' : '16px'};">
					<p
						style="margin:0 0 8px;font-size:12px;font-weight:700;color:{accent};"
					>
						{section.name}
						<span style="margin-left:8px;font-weight:600;color:#a8a29e;">
							{section.list.length}/{section.slots}
							{#if kind === 'maimai'}
								· {compactRating(kind, ratingSum(section.list))}
							{/if}
						</span>
					</p>
					<div
						style="display:grid;grid-template-columns:repeat({cols}, minmax(0, 1fr));gap:8px;"
					>
						{#each Array.from({ length: section.slots }, (_, i) => section.list[i] ?? null) as entry, i (entry?.chartKey ?? `empty-${section.short}-${i}`)}
							{@const rank = entry ? rankOf(entry) : ''}
							{@const fc = entry ? comboTag(entry.fc) : ''}
							{@const fs = entry ? comboTag(entry.fs) : ''}
							<div
								style="display:flex;gap:8px;min-height:76px;padding:6px;border-radius:10px;background:#ffffff;box-shadow:0 1px 2px rgba(28,25,23,0.06);overflow:hidden;"
							>
								{#if entry}
									<div
										style="position:relative;width:64px;height:64px;flex-shrink:0;border-radius:8px;overflow:hidden;background:#e7e5e4;"
									>
										{#if entry.cover}
											<img
												src={entry.cover}
												alt=""
												style="width:100%;height:100%;object-fit:cover;display:block;"
											/>
										{/if}
										<span
											style="position:absolute;left:0;top:0;bottom:0;width:3px;background:{diffAccent(
												diffKeyFromChartKey(entry.chartKey)
											)};"
										></span>
										<span
											style="position:absolute;left:5px;bottom:3px;font-size:9px;font-weight:700;color:#fff;text-shadow:0 1px 2px #000;"
											>{i + 1}</span
										>
									</div>
									<div style="min-width:0;flex:1;display:flex;flex-direction:column;justify-content:space-between;">
										<p
											style="margin:0;font-size:11px;font-weight:700;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#1c1917;"
											title={entry.title}
										>
											{entry.title}
										</p>
										<div style="display:flex;align-items:baseline;justify-content:space-between;gap:4px;">
											<span
												style="font-size:13px;font-weight:800;font-family:ui-monospace,monospace;color:#1c1917;"
											>
												{shareScoreLabel(dxKind, entry.score)}
											</span>
											<span
												style="font-size:11px;font-weight:800;color:{rankColor(rank)};"
											>
												{rank}
											</span>
										</div>
										<div
											style="display:flex;align-items:center;justify-content:space-between;gap:4px;font-size:10px;line-height:1.2;"
										>
											<span style="color:#78716c;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
												{#if fc}<span style="color:{fc.startsWith('AP') ? '#b45309' : '#0891b2'};font-weight:700;">{fc}</span>{/if}
												{#if fs}<span style="margin-left:4px;color:#7c3aed;font-weight:700;">{fs}</span>{/if}
												{#if entry.version}
													<span style="margin-left:4px;">{entry.version}</span>
												{/if}
											</span>
											<span style="flex-shrink:0;font-family:ui-monospace,monospace;color:#57534e;">
												{dsText(entry.value)} → {entry.rating ?? '—'}
											</span>
										</div>
									</div>
								{:else}
									<div
										style="width:64px;height:64px;border-radius:8px;background:#e7e5e4;flex-shrink:0;"
									></div>
									<span style="font-size:11px;color:#a8a29e;align-self:center;">#{i + 1}</span>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
		<p style="margin:0;padding:0 20px 16px;font-size:10px;color:#a8a29e;">
			Generated by 葱喵工厂{#if syncedAt}
				· {new Date(syncedAt).toLocaleDateString('zh-CN')}
			{/if}
		</p>
	</div>
{/if}
