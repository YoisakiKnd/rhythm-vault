<script lang="ts">
	import { enhance } from '$app/forms';
	import Turnstile from '$lib/components/Turnstile.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let submitting = $state(false);
	let turnstileTick = $state(0);
</script>

<svelte:head><title>登录 · 葱喵工厂</title></svelte:head>

<main class="mx-auto max-w-sm px-4 py-16">
	<div class="card bg-base-200 shadow">
		<div class="card-body">
			<h1 class="card-title text-xl">登录</h1>
			{#if data.notice === 'password'}
				<div class="alert alert-success text-sm">密码已更改，请使用新密码登录。</div>
			{:else if data.notice === 'sessions'}
				<div class="alert alert-success text-sm">已登出全部设备，请重新登录。</div>
			{/if}
			{#if form?.error}
				<div class="alert alert-error text-sm">{form.error}</div>
			{/if}
			<form
				method="POST"
				class="space-y-3"
				use:enhance={() => {
					submitting = true;
					return async ({ update }) => {
						submitting = false;
						turnstileTick += 1;
						await update();
					};
				}}
			>
				<label class="block" for="username">
					<span class="text-sm text-base-content/70">用户名</span>
					<input
						id="username"
						name="username"
						class="input w-full mt-1"
						required
						autocomplete="username"
					/>
				</label>
				<label class="block" for="password">
					<span class="text-sm text-base-content/70">密码</span>
					<input
						id="password"
						name="password"
						class="input w-full mt-1"
						type="password"
						required
						autocomplete="current-password"
					/>
				</label>
				{#if data.turnstileSiteKey}
					<Turnstile siteKey={data.turnstileSiteKey} resetTick={turnstileTick} />
				{/if}
				<button class="btn btn-primary w-full" disabled={submitting}>
					{submitting ? '登录中…' : '登录'}
				</button>
			</form>
			<p class="text-sm text-base-content/70">
				没有账号？<a href="/register" class="link">注册</a>
			</p>
		</div>
	</div>
</main>
