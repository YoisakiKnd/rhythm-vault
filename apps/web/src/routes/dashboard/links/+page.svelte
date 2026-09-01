<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const SOURCES = [
		{
			id: 'divingfish',
			label: '水鱼查分器',
			desc: '舞萌 / 中二。绑用户名可查 b50 / b30；OAuth 后拉完整成绩。可与落雪同时绑，按谱面合并。',
			placeholder: '水鱼用户名'
		},
		{
			id: 'lxns',
			label: '落雪查分器',
			desc: '舞萌 / 中二。绑好友码可查 b50 / b30（站点需开发者 Token，且你在落雪开放第三方查询）；OAuth 后拉完整成绩。',
			placeholder: '落雪好友码'
		},
		{
			id: 'varchive',
			label: 'V-ARCHIVE',
			desc: 'DJMAX RESPECT V。绑定你的 V-ARCHIVE 用户 ID。',
			placeholder: 'V-ARCHIVE ID'
		}
	] as const;

	const ok = $derived(page.url.searchParams.get('ok'));
	const urlError = $derived(page.url.searchParams.get('error'));

	function linkOf(source: string) {
		return data.links.find((l) => l?.source === source) ?? null;
	}
</script>

<header>
	<h1 class="rv-page-title">数据源</h1>
	<p class="rv-page-desc">
		决定成绩从哪同步。手动绑定会先向上游核对昵称；OAuth 会回填并标记已验证。档案公开请到
		<a class="link" href="/dashboard/settings">设置</a>。
	</p>
</header>

{#if urlError}
	<div class="alert alert-error text-sm mt-4">{urlError}</div>
{:else if ok}
	<div class="alert alert-success text-sm mt-4">授权成功</div>
{/if}
{#if form?.error}
	<div class="alert alert-error text-sm mt-4">{form.error}</div>
{:else if form && 'preview' in form && form.preview}
	<div class="alert alert-info text-sm mt-4">
		<p>
			即将绑定 {form.preview.sourceLabel}
			<strong>{form.preview.externalId}</strong>
			{#if form.preview.nickname}
				（昵称：{form.preview.nickname}）
			{/if}
		</p>
		{#if form.preview.warning}
			<p class="mt-1">{form.preview.warning}</p>
		{/if}
		<form method="POST" action="?/bind" use:enhance class="mt-2">
			<input type="hidden" name="source" value={form.preview.source} />
			<input type="hidden" name="externalId" value={form.preview.externalId} />
			<input type="hidden" name="confirm" value="1" />
			<button class="btn btn-primary btn-sm">确认绑定</button>
		</form>
	</div>
{:else if form && 'ok' in form && form.ok}
	<div class="alert alert-success text-sm mt-4">已保存</div>
{/if}

<div class="mt-5 space-y-3">
	{#each SOURCES as src (src.id)}
		{@const link = linkOf(src.id)}
		<section class="rv-panel p-5">
			<div class="flex flex-wrap items-start justify-between gap-2">
				<h2 class="font-semibold">{src.label}</h2>
				<div class="flex flex-wrap gap-1">
					{#if link?.hasOAuth && link?.needsReauth}
						<span class="badge badge-warning badge-sm">授权过期</span>
					{:else if link?.hasOAuth}
						<span class="badge badge-success badge-sm badge-outline">OAuth</span>
					{/if}
					{#if link?.externalId}
						<span class="badge badge-ghost badge-sm font-mono">
							{link.externalId}{link.externalVerified ? ' · 已验证' : ''}
						</span>
					{:else if !link}
						<span class="badge badge-ghost badge-sm">未绑定</span>
					{/if}
				</div>
			</div>
			<p class="mt-2 text-sm text-base-content/55">{src.desc}</p>

			<div class="mt-4 flex flex-wrap items-center gap-2">
				<form method="POST" action="?/bind" use:enhance class="flex min-w-0 flex-1 flex-wrap gap-2">
					<input type="hidden" name="source" value={src.id} />
					<input class="input input-sm flex-1 min-w-40" name="externalId" placeholder={src.placeholder} required />
					<button class="btn btn-primary btn-sm">保存</button>
				</form>
				{#if src.id !== 'varchive'}
					{#if src.id === 'divingfish' ? data.oauthConfigured.divingfish : data.oauthConfigured.lxns}
						<a class="btn btn-outline btn-sm" href="/api/links/{src.id}/start">
							OAuth{link?.hasOAuth ? ' 刷新' : ''}
						</a>
					{:else}
						<span class="text-xs text-base-content/40">站点未配置 OAuth</span>
					{/if}
				{/if}
				{#if link}
					<form method="POST" action="?/unbind" use:enhance>
						<input type="hidden" name="source" value={src.id} />
						<button class="btn btn-ghost btn-sm text-error">解绑</button>
					</form>
				{/if}
			</div>
		</section>
	{/each}
</div>
