<script lang="ts">
	import { enhance } from '$app/forms';
	import Turnstile from '$lib/components/Turnstile.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let submitting = $state(false);
	let turnstileTick = $state(0);
</script>

<svelte:head><title>注册 · 葱喵工厂</title></svelte:head>

<main class="mx-auto max-w-sm px-4 py-16">
	<div class="card bg-base-200 shadow">
		<div class="card-body">
			<h1 class="card-title text-xl">注册</h1>
			<p class="text-sm text-base-content/70">
				注册后在控制台绑定查分器账号、生成 API Key，即可通过 API 查询成绩。
			</p>
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
					<span class="text-sm text-base-content/70">用户名（3–24 位字母/数字/下划线）</span>
					<input id="username" name="username" class="input w-full mt-1" required autocomplete="username" />
				</label>
				<label class="block" for="password">
					<span class="text-sm text-base-content/70">密码（至少 8 位）</span>
					<input
						id="password"
						name="password"
						class="input w-full mt-1"
						type="password"
						required
						autocomplete="new-password"
					/>
				</label>
				<label class="block" for="confirm">
					<span class="text-sm text-base-content/70">确认密码</span>
					<input
						id="confirm"
						name="confirm"
						class="input w-full mt-1"
						type="password"
						required
						autocomplete="new-password"
					/>
				</label>
				{#if data.turnstileSiteKey}
					<Turnstile siteKey={data.turnstileSiteKey} resetTick={turnstileTick} />
				{/if}
				<button class="btn btn-primary w-full" disabled={submitting}>
					{submitting ? '注册中…' : '注册并登录'}
				</button>
			</form>
			<p class="text-sm text-base-content/70">
				已有账号？<a href="/login" class="link">登录</a>
			</p>
		</div>
	</div>
</main>
