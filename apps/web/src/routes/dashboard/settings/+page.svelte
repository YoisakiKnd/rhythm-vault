<script lang="ts">
	import { enhance } from '$app/forms';
	import PlayerAvatar from '$lib/components/PlayerAvatar.svelte';
	import RatingChips from '$lib/components/RatingChips.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { GAMES, type CatalogSrc, type DjmaxButton, type GameKey } from '$lib/catalog-nav';
	import {
		readStoredDjmax,
		readStoredGame,
		readStoredSrc,
		writePrefDjmax,
		writePrefGame,
		writePrefSrc
	} from '$lib/prefs';
	import { onMount } from 'svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const DJMAX_BUTTONS = ['4B', '5B', '6B', '8B'] as const;

	let prefGame = $state<GameKey>('maimai');
	let prefSrc = $state<CatalogSrc>('df');
	let prefDiff = $state<DjmaxButton>('4B');
	let copied = $state(false);

	onMount(() => {
		prefGame = readStoredGame() ?? 'maimai';
		prefSrc = readStoredSrc() ?? 'df';
		prefDiff = readStoredDjmax() ?? '4B';
	});

	const profileUrl = $derived(`/u/${data.account.username}`);

	async function copyProfile() {
		try {
			await navigator.clipboard.writeText(`${location.origin}${profileUrl}`);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 1500);
		} catch {
			copied = false;
		}
	}
</script>

<svelte:head><title>设置 · 葱喵工厂</title></svelte:head>

<header>
	<h1 class="rv-page-title">设置</h1>
	<p class="rv-page-desc">档案公开、外观、默认浏览游戏，以及改密与全设备登出。</p>
</header>

{#if form && 'message' in form && form.message}
	<div class="alert alert-success text-sm mt-4">{form.message}</div>
{/if}
{#if form?.error}
	<div class="alert alert-error text-sm mt-4">{form.error}</div>
{/if}

<section class="rv-panel mt-5 p-5">
	<div class="flex flex-wrap items-start gap-4">
		<PlayerAvatar name={data.account.username} size="lg" />
		<div class="min-w-0 flex-1">
			<h2 class="font-semibold text-lg truncate">{data.account.username}</h2>
			<p class="mt-1 text-sm text-base-content/55">
				加入于 {new Date(data.account.createdAt).toLocaleDateString('zh-CN')}
				·
				{data.account.profilePublic ? '档案公开' : '档案未公开'}
			</p>
			<div class="mt-3 flex flex-wrap gap-2">
				<a class="btn btn-primary btn-sm" href={profileUrl}>查看我的主页</a>
				<button type="button" class="btn btn-ghost btn-sm" onclick={copyProfile}>
					{copied ? '已复制链接' : '复制主页链接'}
				</button>
			</div>
		</div>
	</div>
	<div class="mt-4">
		<RatingChips
			ratings={data.ratings}
			hrefFor={(game) => `/scores?game=${game}`}
		/>
	</div>
</section>

<section class="rv-panel mt-3 p-5">
	<h2 class="font-semibold">档案公开</h2>
	<p class="mt-1 text-sm text-base-content/55">
		打开后，访客可看你的主页，并出现在排行榜与玩家对比里。这与下面的 Bot 查询是两件事。
	</p>
	<form method="POST" action="?/privacy" use:enhance class="mt-3">
		<label class="flex cursor-pointer items-center gap-3">
			<input
				type="checkbox"
				name="profilePublic"
				class="toggle toggle-primary toggle-sm"
				checked={data.account.profilePublic}
			/>
			<span class="text-sm">公开档案页、排行榜与玩家对比</span>
		</label>
		<button class="btn btn-sm btn-outline mt-3">保存</button>
	</form>
</section>

<section class="rv-panel mt-3 p-5">
	<h2 class="font-semibold">Bot 查询</h2>
	<p class="mt-1 text-sm text-base-content/55">
		打开后，群 Bot 可用你已验证的 QQ 号查询本账号成绩。默认关闭，和档案公开无关。
	</p>
	<form method="POST" action="?/botQuery" use:enhance class="mt-3">
		<label class="flex cursor-pointer items-center gap-3">
			<input
				type="checkbox"
				name="botQueryPublic"
				class="toggle toggle-primary toggle-sm"
				checked={data.account.botQueryPublic}
			/>
			<span class="text-sm">允许 Bot 通过我登记的 QQ 查询我的成绩</span>
		</label>
		<button class="btn btn-sm btn-outline mt-3">保存</button>
	</form>
</section>

<section class="rv-panel mt-3 p-5">
	<h2 class="font-semibold">外观</h2>
	<p class="mt-1 text-sm text-base-content/55">只存在你这台设备上，不会同步到其他浏览器。</p>
	<div class="mt-3"><ThemeToggle /></div>
</section>

<section class="rv-panel mt-3 p-5">
	<h2 class="font-semibold">浏览偏好</h2>
	<p class="mt-1 text-sm text-base-content/55">
		侧栏切换游戏、水鱼 / 落雪、DJMAX 键位时也会记住。这里改完后，下次打开曲库和查分会跟过去。
	</p>
	<div class="mt-4 space-y-3">
		<div>
			<p class="text-xs text-base-content/50 mb-1.5">默认游戏</p>
			<div class="join">
				{#each GAMES as g (g.key)}
					<button
						type="button"
						class="join-item btn btn-sm {prefGame === g.key ? 'btn-primary' : 'btn-ghost'}"
						onclick={() => {
							prefGame = g.key;
							writePrefGame(g.key);
						}}
					>
						{g.label}
					</button>
				{/each}
			</div>
		</div>
		<div>
			<p class="text-xs text-base-content/50 mb-1.5">舞萌 / 中二默认渠道</p>
			<div class="join">
				<button
					type="button"
					class="join-item btn btn-sm {prefSrc === 'df' ? 'btn-primary' : 'btn-ghost'}"
					onclick={() => {
						prefSrc = 'df';
						writePrefSrc('df');
					}}
				>
					水鱼
				</button>
				<button
					type="button"
					class="join-item btn btn-sm {prefSrc === 'lxns' ? 'btn-primary' : 'btn-ghost'}"
					onclick={() => {
						prefSrc = 'lxns';
						writePrefSrc('lxns');
					}}
				>
					落雪
				</button>
			</div>
		</div>
		<div>
			<p class="text-xs text-base-content/50 mb-1.5">DJMAX 默认键位</p>
			<div class="join">
				{#each DJMAX_BUTTONS as b (b)}
					<button
						type="button"
						class="join-item btn btn-sm {prefDiff === b ? 'btn-primary' : 'btn-ghost'}"
						onclick={() => {
							prefDiff = b;
							writePrefDjmax(b);
						}}
					>
						{b}
					</button>
				{/each}
			</div>
		</div>
	</div>
</section>

<section class="rv-panel mt-3 p-5">
	<h2 class="font-semibold">修改密码</h2>
	<p class="mt-1 text-sm text-base-content/55">改密后所有设备都会登出，需用新密码重新登录。</p>
	<form method="POST" action="?/password" use:enhance class="mt-3 grid gap-3 sm:max-w-sm">
		<label class="block">
			<span class="text-sm text-base-content/70">当前密码</span>
			<input
				class="input input-sm w-full mt-1"
				type="password"
				name="current"
				required
				minlength="8"
				maxlength="128"
				autocomplete="current-password"
			/>
		</label>
		<label class="block">
			<span class="text-sm text-base-content/70">新密码（8–128 位）</span>
			<input
				class="input input-sm w-full mt-1"
				type="password"
				name="next"
				required
				minlength="8"
				maxlength="128"
				autocomplete="new-password"
			/>
		</label>
		<label class="block">
			<span class="text-sm text-base-content/70">确认新密码</span>
			<input
				class="input input-sm w-full mt-1"
				type="password"
				name="confirm"
				required
				minlength="8"
				maxlength="128"
				autocomplete="new-password"
			/>
		</label>
		<button class="btn btn-primary btn-sm w-fit">更新密码</button>
	</form>
</section>

<section class="rv-panel mt-3 p-5">
	<h2 class="font-semibold">会话</h2>
	<p class="mt-1 text-sm text-base-content/55">登出所有设备（含当前）。改密也会自动吊销全部会话。</p>
	<form method="POST" action="?/logoutAll" use:enhance class="mt-3">
		<button class="btn btn-outline btn-sm">登出所有设备</button>
	</form>
</section>
