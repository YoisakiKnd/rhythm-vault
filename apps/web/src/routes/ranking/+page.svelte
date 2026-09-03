<script lang="ts">
	import SiteFooter from '$lib/components/SiteFooter.svelte';
	import { RANKING_EMPTY } from '$lib/copy';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>排行榜 · 葱喵工厂</title></svelte:head>

<main class="mx-auto max-w-2xl px-3 sm:px-4 py-6 sm:py-8">
	<h1 class="text-xl sm:text-2xl font-bold">
		排行榜 · {data.game === 'maimai' ? '舞萌 DX' : data.game === 'chunithm' ? '中二节奏' : 'DJMAX'}
	</h1>


	{#if data.top.length === 0}
		<div class="card bg-base-200 shadow mt-4">
			<div class="card-body items-center text-center">
				<p class="text-base-content/70">{RANKING_EMPTY}</p>
			</div>
		</div>
	{:else}
		<div class="mt-4 md:hidden space-y-2">
			{#each data.top as row (row.username)}
				<div class="flex items-center justify-between gap-3 rounded-xl bg-base-200/60 px-3 py-2.5">
					<div class="min-w-0">
						<p class="truncate">
							<span class="font-bold {row.rank <= 3 ? 'text-primary' : ''}">{row.rank}</span>
							<a class="link link-hover ml-2" href="/u/{row.username}?game={data.game}">{row.username}</a>
						</p>
						<p class="mt-0.5 text-xs text-base-content/50">{new Date(row.at).toLocaleDateString('zh-CN')}</p>
					</div>
					<div class="text-right shrink-0">
						<p class="font-mono font-semibold">{row.rating}</p>
						<a class="link link-hover text-xs" href="/compare?a={row.username}&game={data.game}">对比</a>
					</div>
				</div>
			{/each}
		</div>
		<div class="hidden overflow-x-auto mt-4 md:block">
			<table class="table table-sm">
				<thead>
					<tr><th>#</th><th>玩家</th><th>rating</th><th>记录时间</th><th></th></tr>
				</thead>
				<tbody>
					{#each data.top as row (row.username)}
						<tr>
							<td class="font-bold {row.rank <= 3 ? 'text-primary' : ''}">{row.rank}</td>
							<td>
								<a class="link link-hover" href="/u/{row.username}?game={data.game}">{row.username}</a>
							</td>
							<td class="font-mono">{row.rating}</td>
							<td class="text-xs text-base-content/50">{new Date(row.at).toLocaleDateString('zh-CN')}</td>
							<td>
								<a class="link link-hover text-xs" href="/compare?a={row.username}&game={data.game}">对比</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</main>

<SiteFooter />
