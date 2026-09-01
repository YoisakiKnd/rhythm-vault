<script lang="ts">
	import { page } from '$app/state';

	let {
		game,
		src,
		button,
		username
	}: {
		game: string;
		src: string;
		button?: number;
		username: string;
	} = $props();

	function qs(path: string) {
		const p = new URLSearchParams({ game });
		if (src === 'lxns' && game !== 'djmax') p.set('src', 'lxns');
		if (game === 'djmax' && button) p.set('button', String(button));
		return `${path}?${p}`;
	}

	function sheetHref() {
		if (game === 'djmax') {
			const diff = button ? `${button}B` : '4B';
			return `/sheet/djmax?diff=${diff}`;
		}
		const p = new URLSearchParams();
		if (src === 'lxns') p.set('src', 'lxns');
		const s = p.toString();
		return s ? `/sheet/${game}?${s}` : `/sheet/${game}`;
	}

	const path = $derived(page.url.pathname);
</script>

<div class="mt-3 flex flex-wrap items-center justify-between gap-2">
	<div role="tablist" class="tabs tabs-box tabs-sm">
		<a role="tab" class="tab {path.startsWith('/scores') ? 'tab-active' : ''}" href={qs('/scores')}>
			查分
		</a>
		<a
			role="tab"
			class="tab {path.startsWith('/progress') ? 'tab-active' : ''}"
			href={qs('/progress')}
		>
			进度
		</a>
		<a role="tab" class="tab {path.startsWith('/sheet/') ? 'tab-active' : ''}" href={sheetHref()}>
			完成表
		</a>
	</div>
	<a class="link link-hover text-sm text-base-content/55" href={qs(`/u/${username}`)}>公开主页</a>
</div>
