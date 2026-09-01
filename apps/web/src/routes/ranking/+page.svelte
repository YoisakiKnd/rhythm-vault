<script lang="ts">
	import SiteFooter from '$lib/components/SiteFooter.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>排行榜 · 葱喵工厂</title></svelte:head>

<main class="mx-auto max-w-2xl px-3 sm:px-4 py-6 sm:py-8">
	<h1 class="text-xl sm:text-2xl font-bold">
		rating 排行榜 · {data.game === 'maimai' ? '舞萌' : data.game === 'chunithm' ? '中二' : 'DJMAX'}
	</h1>


	{#if data.top.length === 0}
		<div class="card bg-base-200 shadow mt-4">
			<div class="card-body items-center text-center">
				<p class="text-base-content/70">还没有上榜数据。</p>
				<p class="text-xs text-base-content/50">
					榜单只显示已在控制台「查询账号」登记公开 ID 的用户：绑定数据源 → 同步 → 登记查询账号，即可上榜。
				</p>
			</div>
		</div>
	{:else}
		<div class="overflow-x-auto mt-4">
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
