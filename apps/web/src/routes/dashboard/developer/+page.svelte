<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let creating = $state(false);
	let creatingBot = $state(false);
	let applying = $state(false);

	function fmt(s: string | null) {
		return s ? new Date(s).toLocaleString('zh-CN') : '—';
	}

	const canApply = $derived(
		!data.isAdmin &&
			(!data.application ||
				data.application.status === 'rejected' ||
				data.application.status === 'revoked')
	);
</script>

<header class="flex flex-wrap items-start justify-between gap-3">
	<div>
		<h1 class="rv-page-title">开发者</h1>
		<p class="rv-page-desc">
			个人 Key 只能查自己的成绩。要给 Bot 用 <code class="text-xs">?qq=</code> 查别人，需提交申请，站长通过后才能创建 Bot Key。每账号最多 10 把有效 Key。文档见
			<a class="link" href="/api-docs">开放 API</a>。
		</p>
	</div>
	{#if data.isAdmin}
		<a class="btn btn-outline btn-sm" href="/dashboard/developer/review">审批申请</a>
	{/if}
</header>

{#if form?.error}
	<div class="alert alert-error text-sm mt-4">{form.error}</div>
{/if}
{#if form && 'plaintext' in form && form.plaintext}
	<div class="alert alert-success mt-4">
		<div class="w-full">
			<p class="text-sm font-semibold">
				{form.kind === 'bot' ? 'Bot Key' : 'API Key'}（仅这一次，请立即复制）：
			</p>
			<code class="break-all text-sm">{form.plaintext}</code>
		</div>
	</div>
{/if}
{#if form && 'message' in form && form.message}
	<div class="alert alert-success text-sm mt-4">{form.message}</div>
{/if}

<section class="rv-panel mt-5 p-5">
	<h2 class="font-semibold">我的 API Key</h2>
	<p class="mt-1 text-sm text-base-content/55">明文只在创建时显示一次。默认权限是「仅自己」。</p>
	<form
		method="POST"
		action="?/createKey"
		class="mt-3 flex flex-wrap gap-2"
		use:enhance={() => {
			creating = true;
			return async ({ update }) => {
				creating = false;
				await update();
			};
		}}
	>
		<input class="input input-sm w-full sm:w-64" name="name" placeholder="用途，如：自己的脚本" required />
		<button class="btn btn-primary btn-sm" disabled={creating}>{creating ? '创建中…' : '生成个人 Key'}</button>
	</form>

	{#if data.keys.length === 0}
		<p class="mt-4 text-sm text-base-content/45">还没有 API Key。</p>
	{:else}
		<div class="mt-4 overflow-x-auto">
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
									{key.scope === 'bot' ? 'Bot · 可查他人' : '仅自己'}
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

<section class="rv-panel mt-5 p-5">
	<h2 class="font-semibold">查询他人成绩</h2>
	<p class="mt-1 text-sm text-base-content/55">
		Bot Key 才能带 <code class="text-xs">?qq=</code> 查别人。对方须已验证该 QQ，并在设置里打开「允许 Bot 查询」。普通用户不能自己把 Key 升级成 Bot。
	</p>

	{#if data.isAdmin}
		<p class="mt-3 text-sm text-success">站长账号可直接创建 Bot Key，无需走申请。</p>
	{:else if data.application}
		<div class="mt-3 rounded-lg bg-base-200/60 px-3 py-2.5 text-sm">
			<p>
				当前申请「{data.application.name}」
				<span class="badge badge-sm badge-outline ml-1">{data.applicationStatusLabel}</span>
			</p>
			<p class="mt-1 text-base-content/55">提交于 {fmt(data.application.createdAt)}</p>
			{#if data.application.reviewNote}
				<p class="mt-1">审批说明：{data.application.reviewNote}</p>
			{/if}
		</div>
	{/if}

	{#if data.canCreateBot}
		<form
			method="POST"
			action="?/createBotKey"
			class="mt-4 flex flex-wrap gap-2"
			use:enhance={() => {
				creatingBot = true;
				return async ({ update }) => {
					creatingBot = false;
					await update();
				};
			}}
		>
			<input class="input input-sm w-full sm:w-64" name="name" placeholder="Bot Key 名称" required />
			<button class="btn btn-warning btn-sm" disabled={creatingBot}>
				{creatingBot ? '创建中…' : `创建 Bot Key（${data.activeBotKeys}/${data.maxBotKeys}）`}
			</button>
		</form>
		<p class="mt-2 text-xs text-base-content/45">Bot Key 计入总数上限；有效 Bot Key 最多 {data.maxBotKeys} 把。</p>
	{/if}

	{#if canApply}
		<form
			method="POST"
			action="?/apply"
			class="mt-4 grid gap-3"
			use:enhance={() => {
				applying = true;
				return async ({ update }) => {
					applying = false;
					await update();
				};
			}}
		>
			<label class="form-control">
				<span class="label-text text-sm">应用 / Bot 名称</span>
				<input class="input input-sm mt-1" name="name" required maxlength="64" placeholder="例如：某某群 Bot" />
			</label>
			<label class="form-control">
				<span class="label-text text-sm">用途说明（至少 16 字）</span>
				<textarea
					class="textarea textarea-sm mt-1 min-h-24"
					name="purpose"
					required
					minlength="16"
					maxlength="500"
					placeholder="给谁用、查什么、会不会公开成绩。写清楚方便审批。"
				></textarea>
			</label>
			<label class="form-control">
				<span class="label-text text-sm">联系方式（可选）</span>
				<input class="input input-sm mt-1" name="contact" maxlength="128" placeholder="QQ / 邮箱" />
			</label>
			<label class="form-control">
				<span class="label-text text-sm">主页（可选，http/https）</span>
				<input class="input input-sm mt-1" name="homepage" maxlength="256" placeholder="https://" />
			</label>
			<div>
				<button class="btn btn-outline btn-sm" disabled={applying}>
					{applying ? '提交中…' : data.application ? '再次申请' : '提交开发者申请'}
				</button>
			</div>
		</form>
	{:else if data.application?.status === 'pending'}
		<p class="mt-3 text-sm text-base-content/55">审批期间不能改申请，也不能创建 Bot Key。通过后会在本页开放创建。</p>
	{/if}
</section>
