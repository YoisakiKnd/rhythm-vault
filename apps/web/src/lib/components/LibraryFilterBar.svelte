<script lang="ts">
	import { dlcChipStyle } from '$lib/dlc-style';
	import { parseCsvParam, specialDiffsOnly, toggleCsv } from '$lib/library-query';

	interface FilterOption {
		key: string;
		label: string;
	}

	interface Props {
		game: string;
		diffs: FilterOption[];
		patterns?: FilterOption[];
		levels: string[];
		dlcOptions?: FilterOption[];
		diff: string;
		pattern: string;
		level: string;
		onlyNew: boolean;
		selectedDlcs: string[];
		onDiffs: (next: string[]) => void;
		onPatterns: (next: string[]) => void;
		onLevels: (next: string[]) => void;
		onToggleNew: () => void;
		onDlcs: (next: string[]) => void;
		onReset: () => void;
	}

	let {
		game,
		diffs,
		patterns,
		levels,
		dlcOptions = [],
		diff,
		pattern,
		level,
		onlyNew,
		selectedDlcs,
		onDiffs,
		onPatterns,
		onLevels,
		onToggleNew,
		onDlcs,
		onReset
	}: Props = $props();

	let open = $state(false);
	let triggerEl: HTMLButtonElement | undefined = $state();
	let panelStyle = $state('');

	const showDiff = $derived(game !== 'djmax');
	const showPattern = $derived(game === 'djmax');
	const selectedDiffs = $derived(game === 'djmax' ? [] : parseCsvParam(diff));
	const selectedPatterns = $derived(parseCsvParam(pattern));
	const selectedLevels = $derived(parseCsvParam(level));
	const hideLevels = $derived(specialDiffsOnly(selectedDiffs));

	const allDlc = $derived(selectedDlcs.length === 0);
	const noneDlc = $derived(selectedDlcs.length === 1 && selectedDlcs[0] === '-');
	const selectedSet = $derived(new Set(allDlc || noneDlc ? [] : selectedDlcs));

	function dlcOn(key: string): boolean {
		if (allDlc) return true;
		if (noneDlc) return false;
		return selectedSet.has(key);
	}

	function toggleDlc(key: string): void {
		if (allDlc) {
			onDlcs(dlcOptions.map((d) => d.key).filter((k) => k !== key));
			return;
		}
		if (noneDlc) {
			onDlcs([key]);
			return;
		}
		const next = selectedSet.has(key) ? selectedDlcs.filter((k) => k !== key) : [...selectedDlcs, key];
		if (next.length === 0) onDlcs(['-']);
		else if (next.length === dlcOptions.length) onDlcs([]);
		else onDlcs(next);
	}

	const summaryParts = $derived.by(() => {
		const parts: string[] = [];
		if (showDiff && selectedDiffs.length) {
			parts.push(
				selectedDiffs.map((k) => diffs.find((d) => d.key === k)?.label ?? k).join('/')
			);
		}
		if (showPattern && selectedPatterns.length) parts.push(selectedPatterns.join('/'));
		if (!hideLevels && selectedLevels.length) {
			parts.push(
				selectedLevels
					.map((lv) => (game === 'djmax' && selectedPatterns.includes('SC') ? `SC${lv}` : lv))
					.join('/')
			);
		}
		if (game === 'djmax' && !allDlc) parts.push(noneDlc ? '无 DLC' : `DLC ${selectedDlcs.length}`);
		if (onlyNew) parts.push('仅新曲');
		return parts;
	});
	const active = $derived(summaryParts.length > 0);

	function chipClass(on: boolean): string {
		return on ? 'btn btn-xs btn-primary' : 'btn btn-xs btn-outline';
	}

	function layoutPanel(): void {
		if (!triggerEl) return;
		const r = triggerEl.getBoundingClientRect();
		const width = Math.min(288, window.innerWidth - 16);
		const maxH = Math.min(352, Math.floor(window.innerHeight * 0.7));
		let left = r.left;
		if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8);
		if (left < 8) left = 8;
		let top = r.bottom + 6;
		if (top + 160 > window.innerHeight) {
			top = Math.max(8, r.top - maxH - 6);
		}
		panelStyle = `top:${top}px;left:${left}px;width:${width}px;max-height:${maxH}px`;
	}

	function setOpen(next: boolean): void {
		open = next;
		if (next) layoutPanel();
	}

	function onKeydown(e: KeyboardEvent): void {
		if (e.key === 'Escape' && open) {
			e.preventDefault();
			open = false;
		}
	}

	$effect(() => {
		if (!open) return;
		layoutPanel();
	});
</script>

<svelte:window
	onkeydown={onKeydown}
	onresize={() => {
		if (open) layoutPanel();
	}}
	onscroll={() => {
		if (open) layoutPanel();
	}}
/>

<div class="relative flex items-center gap-2 min-w-0">
	<button
		bind:this={triggerEl}
		type="button"
		class="btn btn-sm shrink-0 {open || active ? 'btn-primary' : 'btn-outline'}"
		aria-expanded={open}
		aria-haspopup="menu"
		onclick={() => setOpen(!open)}
	>
		筛选
		{#if active && !open}
			<span class="badge badge-xs">{summaryParts.length}</span>
		{/if}
	</button>
	{#if !open && summaryParts.length > 0}
		<p class="text-xs text-base-content/60 truncate">{summaryParts.join(' · ')}</p>
	{/if}
</div>

{#if open}
	<button
		type="button"
		class="fixed inset-0 z-[55] cursor-default bg-transparent"
		aria-label="关闭筛选"
		onclick={() => (open = false)}
	></button>
	<div
		role="menu"
		class="fixed z-[60] flex flex-col overflow-hidden rounded-xl border border-base-content/20 bg-base-200 shadow-xl"
		style={panelStyle}
	>
		<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 space-y-3">
			{#if showDiff}
				<section>
					<p class="text-xs font-medium text-base-content/70 mb-1.5">谱面</p>
					<div class="flex flex-wrap gap-1.5">
						<button type="button" class={chipClass(selectedDiffs.length === 0)} onclick={() => onDiffs([])}>
							全部
						</button>
						{#each diffs as d (d.key)}
							<button
								type="button"
								class={chipClass(selectedDiffs.includes(d.key))}
								onclick={() => onDiffs(toggleCsv(selectedDiffs, d.key))}
							>
								{d.label}
							</button>
						{/each}
					</div>
				</section>
			{/if}

			{#if showPattern && patterns}
				<section>
					<p class="text-xs font-medium text-base-content/70 mb-1.5">谱面</p>
					<div class="flex flex-wrap gap-1.5">
						<button
							type="button"
							class={chipClass(selectedPatterns.length === 0)}
							onclick={() => onPatterns([])}
						>
							全部
						</button>
						{#each patterns as p (p.key)}
							<button
								type="button"
								class={chipClass(selectedPatterns.includes(p.key))}
								onclick={() => onPatterns(toggleCsv(selectedPatterns, p.key))}
							>
								{p.label}
							</button>
						{/each}
					</div>
				</section>
			{/if}

			{#if !hideLevels}
				<section>
					<p class="text-xs font-medium text-base-content/70 mb-1.5">等级</p>
					<div class="flex flex-wrap gap-1.5">
						<button type="button" class={chipClass(selectedLevels.length === 0)} onclick={() => onLevels([])}>
							全部
						</button>
						{#each levels as lv (lv)}
							<button
								type="button"
								class={chipClass(selectedLevels.includes(lv))}
								onclick={() => onLevels(toggleCsv(selectedLevels, lv))}
							>
								{game === 'djmax' && selectedPatterns.includes('SC') ? `SC${lv}` : lv}
							</button>
						{/each}
					</div>
				</section>
			{/if}

			{#if game === 'djmax' && dlcOptions.length > 0}
				<section>
					<div class="flex items-center gap-2 mb-1.5">
						<p class="text-xs font-medium text-base-content/70">DLC</p>
						<button type="button" class="btn btn-xs btn-outline" onclick={() => onDlcs([])}>全部</button>
						<button type="button" class="btn btn-xs btn-outline" onclick={() => onDlcs(['-'])}>解除</button>
					</div>
					<div class="flex flex-wrap gap-1.5">
						{#each dlcOptions as d (d.key)}
							<button
								type="button"
								class="btn btn-xs h-7 min-h-7 px-2 max-w-[8.5rem] truncate font-semibold border {dlcOn(d.key)
									? 'ring-2 ring-offset-1 ring-offset-base-200 ring-primary'
									: 'opacity-40 grayscale'}"
								style={dlcChipStyle(d.key)}
								title={d.label}
								onclick={() => toggleDlc(d.key)}
							>
								<span class="sm:hidden">{d.key}</span>
								<span class="hidden sm:inline">{d.label}</span>
							</button>
						{/each}
					</div>
				</section>
			{/if}

			<section>
				<button type="button" class={chipClass(onlyNew)} onclick={onToggleNew}>仅新曲</button>
			</section>
		</div>

		<div class="flex gap-2 shrink-0 p-2 border-t border-base-content/10 bg-base-200">
			<button type="button" class="btn btn-sm btn-outline flex-1" onclick={onReset}>重置</button>
			<button type="button" class="btn btn-sm btn-primary flex-1" onclick={() => (open = false)}>完成</button>
		</div>
	</div>
{/if}
