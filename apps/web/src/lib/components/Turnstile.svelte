<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		siteKey: string;
		/** 递增时重置 widget（提交失败后 token 已作废） */
		resetTick?: number;
	}

	let { siteKey, resetTick = 0 }: Props = $props();

	let host: HTMLDivElement | undefined = $state();
	let widgetId: string | null = null;

	type TurnstileApi = {
		render: (el: HTMLElement, opts: Record<string, unknown>) => string;
		reset: (id: string) => void;
		remove: (id: string) => void;
	};

	function api(): TurnstileApi | undefined {
		return (window as unknown as { turnstile?: TurnstileApi }).turnstile;
	}

	function loadScript(): Promise<void> {
		if (api()) return Promise.resolve();
		return new Promise((resolve, reject) => {
			const existing = document.querySelector('script[data-rv-turnstile]');
			if (existing) {
				existing.addEventListener('load', () => resolve(), { once: true });
				existing.addEventListener('error', () => reject(new Error('Turnstile 脚本加载失败')), {
					once: true
				});
				return;
			}
			const el = document.createElement('script');
			el.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
			el.async = true;
			el.defer = true;
			el.dataset.rvTurnstile = '1';
			el.onload = () => resolve();
			el.onerror = () => reject(new Error('Turnstile 脚本加载失败'));
			document.head.appendChild(el);
		});
	}

	async function mountWidget(): Promise<void> {
		if (!host) return;
		await loadScript();
		const ts = api();
		if (!ts) return;
		if (widgetId) {
			ts.remove(widgetId);
			widgetId = null;
		}
		host.innerHTML = '';
		widgetId = ts.render(host, {
			sitekey: siteKey,
			theme: 'dark',
			size: 'flexible',
			appearance: 'always'
		});
	}

	onMount(() => {
		void mountWidget();
		return () => {
			if (widgetId) api()?.remove(widgetId);
		};
	});

	$effect(() => {
		if (resetTick === 0) return;
		const ts = api();
		if (ts && widgetId) ts.reset(widgetId);
	});
</script>

<div class="min-h-[65px]" bind:this={host}></div>
