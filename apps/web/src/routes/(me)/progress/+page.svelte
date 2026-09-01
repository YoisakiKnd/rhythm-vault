<script lang="ts">
	import DataPageTabs from '$lib/components/DataPageTabs.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const view = $derived(data.data);

	function barColor(c: number) {
		return c >= 100 ? 'progress-success' : c >= 70 ? 'progress-primary' : 'progress-secondary';
	}

	function channelHref(src: 'df' | 'lxns') {
		const q = new URLSearchParams({ game: data.game });
		if (src === 'lxns') q.set('src', 'lxns');
		return `/progress?${q}`;
	}
</script>

<header>
	<h1 class="rv-page-title">
		完成度 · {data.game === 'maimai' ? '舞萌' : data.game === 'chunithm' ? '中二' : 'DJMAX'}{#if data.srcLabel}<span class="text-base font-normal text-base-content/50"> · {data.srcLabel}</span>{/if}
	</h1>
	<p class="rv-page-desc">按版本、等级或曲包看刷图进度。FC / 满分依赖成绩里的徽章数据。</p>
</header>

<DataPageTabs game={data.game} src={data.src} button={undefined} username={data.username} />

{#if data.game !== 'djmax'}
	<div class="join mt-3">
		<a href={channelHref('df')} class="join-item btn btn-sm {data.src !== 'lxns' ? 'btn-primary' : 'btn-ghost'}">水鱼</a>
		<a href={channelHref('lxns')} class="join-item btn btn-sm {data.src === 'lxns' ? 'btn-primary' : 'btn-ghost'}">落雪</a>
	</div>
{/if}

{#if data.error}
	<div class="rv-panel mt-4 p-8 text-center">
		<p class="text-base-content/60">{data.error}</p>
		<a href="/dashboard/links" class="btn btn-primary btn-sm mt-3">去绑定并同步</a>
	</div>
{:else if view}
	{#if view.versionBuckets}
		<section class="rv-panel mt-4 p-5">
			<h2 class="font-semibold">按版本（牌子进度）</h2>
			<div class="mt-3 overflow-x-auto">
				<table class="table table-sm">
					<thead>
						<tr><th>版本</th><th class="w-1/2">完成度</th><th>FC</th><th>理论</th></tr>
					</thead>
					<tbody>
						{#each view.versionBuckets as b (b.key)}
							<tr>
								<td class="whitespace-nowrap">{b.label}</td>
								<td>
									<div class="flex items-center gap-2">
										<progress class="progress {barColor(b.completion)} h-2 w-full" value={b.completion} max="100"></progress>
										<span class="text-xs whitespace-nowrap">{b.completion}%</span>
									</div>
									<div class="text-xs text-base-content/50">{b.played} / {b.total}</div>
								</td>
								<td>{b.fc}</td>
								<td>{b.pp}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}

	{#if view.dlcBuckets}
		<section class="rv-panel mt-4 p-5">
			<h2 class="font-semibold">按曲包（全部键位谱面）</h2>
			<div class="mt-3 overflow-x-auto">
				<table class="table table-sm">
					<thead>
						<tr><th>曲包</th><th class="w-1/2">完成度</th><th>MC</th><th>PP</th></tr>
					</thead>
					<tbody>
						{#each view.dlcBuckets as b (b.key)}
							<tr>
								<td class="whitespace-nowrap">{b.label}</td>
								<td>
									<div class="flex items-center gap-2">
										<progress class="progress {barColor(b.completion)} h-2 w-full" value={b.completion} max="100"></progress>
										<span class="text-xs whitespace-nowrap">{b.completion}%</span>
									</div>
									<div class="text-xs text-base-content/50">{b.played} / {b.total}</div>
								</td>
								<td>{b.fc}</td>
								<td>{b.pp}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}

	{#if view.levelBuckets}
		<section class="rv-panel mt-4 p-5">
			<h2 class="font-semibold">按等级</h2>
			<div class="mt-3 overflow-x-auto">
				<table class="table table-sm">
					<thead>
						<tr><th>等级</th><th class="w-1/2">完成度</th><th>FC</th><th>满分</th></tr>
					</thead>
					<tbody>
						{#each view.levelBuckets as b (b.key)}
							<tr>
								<td><span class="badge badge-ghost badge-sm font-mono">{b.label}</span></td>
								<td>
									<div class="flex items-center gap-2">
										<progress class="progress {barColor(b.completion)} h-2 w-full" value={b.completion} max="100"></progress>
										<span class="text-xs whitespace-nowrap">{b.completion}%</span>
									</div>
									<div class="text-xs text-base-content/50">{b.played} / {b.total}</div>
								</td>
								<td>{b.fc}</td>
								<td>{b.pp}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<p class="mt-2 text-xs text-base-content/45">
				FC / 满分列依赖成绩中的徽章数据（水鱼/落雪 fc、V-ARCHIVE maxCombo）。
			</p>
		</section>
	{/if}
{/if}
