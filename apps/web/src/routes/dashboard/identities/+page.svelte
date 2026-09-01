<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const PLATFORM_LABEL: Record<string, string> = { qq: 'QQ 号' };
</script>

<header>
	<h1 class="rv-page-title">查询账号</h1>
	<p class="rv-page-desc">
		给 Bot 用的检索别名。登记后需在 Bot 私聊发送验证码，确认 QQ 归属。验证后，只有你在
		<a class="link" href="/dashboard/settings">设置</a>
		里打开「允许 Bot 查询」，持 Bot Key 的客户端才能用 <code class="text-xs">?qq=</code> 查到本账号成绩。
	</p>
</header>

<section class="rv-panel mt-5 p-5">
	<h2 class="font-semibold">QQ 号</h2>
	<form method="POST" action="?/add" use:enhance class="mt-3 flex flex-wrap gap-2">
		<input class="input input-sm w-full sm:w-56" name="platformUserId" placeholder="QQ 号" required />
		<button class="btn btn-primary btn-sm">添加</button>
	</form>
	{#if form?.error}
		<div class="alert alert-error text-sm mt-3">{form.error}</div>
	{/if}
	{#if form && 'message' in form && form.message}
		<div class="alert alert-success text-sm mt-3">{form.message}</div>
	{/if}

	{#if data.identities.length === 0}
		<p class="mt-4 text-sm text-base-content/45">还没有查询账号。请只登记属于你的 ID。</p>
	{:else}
		<div class="mt-4 overflow-x-auto">
			<table class="table table-sm">
				<thead>
					<tr><th>平台</th><th>ID</th><th>状态</th><th>添加时间</th><th></th></tr>
				</thead>
				<tbody>
					{#each data.identities as identity (identity.id)}
						<tr>
							<td>{PLATFORM_LABEL[identity.platform] ?? identity.platform}</td>
							<td><code class="text-xs">{identity.platformUserId}</code></td>
							<td>
								{#if identity.verified}
									<span class="badge badge-success badge-sm badge-outline">已验证</span>
								{:else}
									<span class="badge badge-warning badge-sm badge-outline">待验证</span>
									{#if identity.verifyCode}
										<code class="ml-1 text-xs">{identity.verifyCode}</code>
									{/if}
								{/if}
							</td>
							<td class="text-base-content/60">{new Date(identity.createdAt).toLocaleString('zh-CN')}</td>
							<td class="text-right">
								<div class="flex flex-wrap justify-end gap-1">
									{#if !identity.verified}
										<form method="POST" action="?/refresh" use:enhance>
											<input type="hidden" name="id" value={identity.id} />
											<button class="btn btn-ghost btn-xs">刷新验证码</button>
										</form>
										{#if data.isAdmin}
											<form method="POST" action="?/markVerified" use:enhance>
												<input type="hidden" name="id" value={identity.id} />
												<button class="btn btn-ghost btn-xs">标记已验证</button>
											</form>
										{/if}
									{/if}
									<form method="POST" action="?/remove" use:enhance>
										<input type="hidden" name="id" value={identity.id} />
										<button class="btn btn-ghost btn-xs text-error">移除</button>
									</form>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>
