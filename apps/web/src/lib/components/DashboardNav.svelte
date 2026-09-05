<script lang="ts">
	import { page } from '$app/state';

	const items = [
		{ href: '/dashboard', label: '概览' },
		{ href: '/dashboard/links', label: '绑定' },
		{ href: '/dashboard/djmax', label: 'DJMAX 录入' },
		{ href: '/dashboard/identities', label: '查询账号' },
		{ href: '/dashboard/developer', label: '开发者' },
		{ href: '/dashboard/settings', label: '设置' }
	];

	function active(href: string) {
		const path = page.url.pathname;
		if (href === '/dashboard') return path === href;
		if (href === '/dashboard/developer') return path === href;
		return path === href || path.startsWith(`${href}/`);
	}
</script>

<nav class="flex gap-5 overflow-x-auto rv-scroll-x border-b border-base-300" aria-label="控制台">
	{#each items as item (item.href)}
		<a
			href={item.href}
			class="shrink-0 pb-2.5 -mb-px border-b-2 text-sm transition-colors {active(item.href)
				? 'border-primary text-primary font-medium'
				: 'border-transparent text-base-content/50 hover:text-base-content/80'}"
		>
			{item.label}
		</a>
	{/each}
</nav>
