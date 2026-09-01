<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let creating = $state(false);

	function fmt(s: string | null) {
		return s ? new Date(s).toLocaleString('zh-CN') : '—';
	}
</script>

<header>
	<h1 class="rv-page-title">API Keys</h1>
	<p class="rv-page-desc">明文只在创建时显示一次。默认只能查自己的成绩。每账号最多 10 把有效 Key。</p>
</header>

<form
	method="POST"
	action="?/create"
	class="mt-5 flex flex-wrap gap-2"
	use:enhance={() => {
		creating = true;
		return async ({ update }) => {
			creating = false;
			await update();
		};
	}}
>
	<input class="input input-sm w-full sm:w-64" name="name" placeholder="用途，如：我的 QQ Bot" required />
	<button class="btn btn-primary btn-sm" disabled={creating}>{creating ? '创建中…' : '生成新 Key'}</button>
</form>

{#if form?.error}
	<div class="alert alert-error text-sm mt-3">{form.error}</div>
{/if}

{#if form && 'plaintext' in form && form.plaintext}
	<div class="alert alert-success mt-3">
		<div class="w-full">
			<p class="text-sm font-semibold">请立即复制（仅这一次）：</p>
			<code class="break-all text-sm">{form.plaintext}</code>
		</div>
	</div>
{/if}

<section class="rv-panel mt-5 overflow-hidden">
	{#if data.keys.length === 0}
		<p class="p-5 text-sm text-base-content/45">还没有 API Key。</p>
	{:else}
		<div class="overflow-x-auto">
			<table class="table table-sm">
				<thead>
					<tr>
						<th>名称</th>
						<th>前缀</th>
						<th>权限</th>
						<th>创建</th>
						<th>最近使用</th>
						<th>请求</th>
						<th>状态</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each data.keys as key (key.id)}
						<tr>
							<td>{key.name}</td>
							<td><code class="text-xs">{key.prefix}…</code></td>
							<td>
								<span class="badge badge-sm badge-outline {key.scope === 'bot' ? 'badge-warning' : 'badge-ghost'}">
									{key.scope === 'bot' ? 'Bot' : '仅自己'}
								</span>
							</td>
							<td class="whitespace-nowrap text-base-content/60">{fmt(key.createdAt)}</td>
							<td class="whitespace-nowrap text-base-content/60">{fmt(key.lastUsedAt)}</td>
							<td>{key.requestCount}</td>
							<td>
								{#if key.revokedAt}
									<span class="badge badge-ghost badge-sm">已吊销</span>
								{:else}
									<span class="badge badge-success badge-sm badge-outline">有效</span>
								{/if}
							</td>
							<td class="text-right">
								{#if !key.revokedAt}
									<form method="POST" action="?/revoke" use:enhance>
										<input type="hidden" name="id" value={key.id} />
										<button class="btn btn-ghost btn-xs text-error">吊销</button>
									</form>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>
