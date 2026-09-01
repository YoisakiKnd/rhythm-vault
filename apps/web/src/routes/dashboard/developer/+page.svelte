<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let creating = $state(false);
</script>

<header>
	<h1 class="rv-page-title">开发者</h1>
	<p class="rv-page-desc">给 QQ Bot 等客户端建应用。默认只能查自己的数据。Bot 跨账号查询需站长把 Key 升为 bot 权限。每账号最多 10 个应用。</p>
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
	<input class="input input-sm w-full sm:w-64" name="name" placeholder="应用名称" required />
	<button class="btn btn-primary btn-sm" disabled={creating}>{creating ? '创建中…' : '创建应用'}</button>
</form>

{#if form?.error}
	<div class="alert alert-error text-sm mt-3">{form.error}</div>
{/if}

{#if form && 'plaintext' in form && form.plaintext}
	<div class="alert alert-success mt-3">
		<div class="w-full">
			<p class="text-sm font-semibold">应用 Key（仅这一次）：</p>
			<code class="break-all text-sm">{form.plaintext}</code>
		</div>
	</div>
{/if}
{#if form && 'message' in form && form.message}
	<div class="alert alert-success text-sm mt-3">{form.message}</div>
{/if}

<section class="rv-panel mt-5 overflow-hidden">
	{#if data.apps.length === 0}
		<p class="p-5 text-sm text-base-content/45">还没有应用。</p>
	{:else}
		<div class="overflow-x-auto">
			<table class="table table-sm">
				<thead>
					<tr>
						<th>应用</th>
						<th>Key 前缀</th>
						<th>权限</th>
						<th>创建</th>
						<th>状态</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each data.apps as app (app.id)}
						<tr>
							<td>{app.name}</td>
							<td>
								{#each app.keys as key (key.id)}
									<code class="block text-xs">{key.prefix}…</code>
								{/each}
							</td>
							<td>
								{#each app.keys as key (key.id)}
									<span class="badge badge-sm badge-outline {key.scope === 'bot' ? 'badge-warning' : 'badge-ghost'}">
										{key.scope === 'bot' ? 'Bot' : '仅自己'}
									</span>
									{#if data.isAdmin && !key.revokedAt}
										<form method="POST" action="?/setScope" use:enhance class="mt-1">
											<input type="hidden" name="id" value={key.id} />
											<input type="hidden" name="scope" value={key.scope === 'bot' ? 'self' : 'bot'} />
											<button class="btn btn-ghost btn-xs">
												{key.scope === 'bot' ? '降为仅自己' : '升为 Bot'}
											</button>
										</form>
									{/if}
								{/each}
							</td>
							<td class="whitespace-nowrap text-base-content/60">{new Date(app.createdAt).toLocaleString('zh-CN')}</td>
							<td>
								{#if app.keys.some((k) => !k.revokedAt)}
									<span class="badge badge-success badge-sm badge-outline">有效</span>
								{:else}
									<span class="badge badge-ghost badge-sm">已吊销</span>
								{/if}
							</td>
							<td class="text-right">
								<form method="POST" action="?/remove" use:enhance>
									<input type="hidden" name="id" value={app.id} />
									<button class="btn btn-ghost btn-xs text-error">删除</button>
								</form>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>

{#if data.isAdmin}
	<section class="rv-panel mt-5 p-5">
		<h2 class="font-semibold">站长：手动确认 QQ 归属</h2>
		<p class="mt-1 text-sm text-base-content/55">Bot 验证接口尚未上线时，可把待验证的 QQ 直接标为已验证。</p>
		<form method="POST" action="?/markVerified" use:enhance class="mt-3 flex flex-wrap gap-2">
			<input class="input input-sm w-40" name="qq" placeholder="QQ 号" required />
			<input class="input input-sm w-40" name="username" placeholder="用户名（可选）" />
			<button class="btn btn-outline btn-sm">标记已验证</button>
		</form>
	</section>
{/if}
