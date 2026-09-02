<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const STATUS_LABEL: Record<string, string> = {
		pending: '审批中',
		approved: '已通过',
		rejected: '未通过',
		revoked: '已收回'
	};

	function fmt(s: string | null) {
		return s ? new Date(s).toLocaleString('zh-CN') : '—';
	}

	function badgeClass(status: string) {
		if (status === 'pending') return 'badge-warning';
		if (status === 'approved') return 'badge-success';
		if (status === 'rejected') return 'badge-error';
		return 'badge-ghost';
	}

	const pending = $derived(data.applications.filter((a) => a.status === 'pending'));
	const others = $derived(data.applications.filter((a) => a.status !== 'pending'));
</script>

<header>
	<h1 class="rv-page-title">开发者审批</h1>
	<p class="rv-page-desc">
		通过后对方可创建 Bot Key，用 <code class="text-xs">?qq=</code> 查已开放 Bot 查询的用户。收回权限会把其有效 Bot Key 降为仅查自己。
		<a class="link" href="/dashboard/developer">返回开发者页</a>
	</p>
</header>

{#if form?.error}
	<div class="alert alert-error text-sm mt-4">{form.error}</div>
{/if}
{#if form && 'message' in form && form.message}
	<div class="alert alert-success text-sm mt-4">{form.message}</div>
{/if}

<section class="rv-panel mt-5 p-5">
	<h2 class="font-semibold">待审批 <span class="badge badge-warning badge-sm ml-1">{data.pendingCount}</span></h2>
	{#if pending.length === 0}
		<p class="mt-3 text-sm text-base-content/45">没有待处理申请。</p>
	{:else}
		<ul class="mt-4 space-y-4">
			{#each pending as app (app.id)}
				<li class="rounded-lg border border-base-300 p-4">
					<div class="flex flex-wrap items-start justify-between gap-2">
						<div>
							<p class="font-medium">{app.name}</p>
							<p class="mt-0.5 text-sm text-base-content/55">
								申请人 <code class="text-xs">{app.username}</code>
								· {fmt(app.createdAt)}
							</p>
						</div>
						<span class="badge badge-sm badge-outline {badgeClass(app.status)}">{STATUS_LABEL[app.status]}</span>
					</div>
					<p class="mt-3 whitespace-pre-wrap text-sm">{app.purpose}</p>
					<dl class="mt-3 grid gap-1 text-xs text-base-content/60 sm:grid-cols-2">
						<div>联系：{app.contact ?? '—'}</div>
						<div>
							主页：
							{#if app.homepage}
								<a class="link" href={app.homepage} target="_blank" rel="noreferrer">{app.homepage}</a>
							{:else}
								—
							{/if}
						</div>
					</dl>
					<div class="mt-4 grid gap-3 sm:grid-cols-2">
						<form method="POST" action="?/approve" use:enhance class="flex flex-col gap-2">
							<input type="hidden" name="id" value={app.id} />
							<input class="input input-sm" name="note" placeholder="通过备注（可选）" />
							<button class="btn btn-success btn-sm">通过</button>
						</form>
						<form method="POST" action="?/reject" use:enhance class="flex flex-col gap-2">
							<input type="hidden" name="id" value={app.id} />
							<input class="input input-sm" name="note" required placeholder="拒绝原因（必填）" />
							<button class="btn btn-outline btn-sm text-error">拒绝</button>
						</form>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<section class="rv-panel mt-5 overflow-hidden">
	<h2 class="font-semibold p-5 pb-0">历史</h2>
	{#if others.length === 0}
		<p class="p-5 text-sm text-base-content/45">还没有已处理记录。</p>
	{:else}
		<div class="overflow-x-auto">
			<table class="table table-sm">
				<thead>
					<tr>
						<th>应用</th>
						<th>申请人</th>
						<th>状态</th>
						<th>审批</th>
						<th>说明</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each others as app (app.id)}
						<tr>
							<td>
								<div>{app.name}</div>
								<div class="text-xs text-base-content/45 max-w-xs truncate">{app.purpose}</div>
							</td>
							<td><code class="text-xs">{app.username}</code></td>
							<td>
								<span class="badge badge-sm badge-outline {badgeClass(app.status)}">
									{STATUS_LABEL[app.status]}
								</span>
							</td>
							<td class="whitespace-nowrap text-xs text-base-content/60">
								{app.reviewedBy ?? '—'}
								<div>{fmt(app.reviewedAt)}</div>
							</td>
							<td class="text-xs max-w-48">{app.reviewNote ?? '—'}</td>
							<td class="text-right">
								{#if app.status === 'approved'}
									<form method="POST" action="?/revokeAccess" use:enhance class="flex flex-col items-end gap-1">
										<input type="hidden" name="id" value={app.id} />
										<input class="input input-sm w-36" name="note" required placeholder="收回原因" />
										<button class="btn btn-ghost btn-xs text-error">收回权限</button>
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

<section class="rv-panel mt-5 p-5">
	<h2 class="font-semibold">手动确认 QQ 归属</h2>
	<p class="mt-1 text-sm text-base-content/55">Bot 验证不便时，可把待验证的 QQ 直接标为已验证。</p>
	<form method="POST" action="?/markVerified" use:enhance class="mt-3 flex flex-wrap gap-2">
		<input class="input input-sm w-40" name="qq" placeholder="QQ 号" required />
		<input class="input input-sm w-40" name="username" placeholder="用户名（可选）" />
		<button class="btn btn-outline btn-sm">标记已验证</button>
	</form>
</section>
