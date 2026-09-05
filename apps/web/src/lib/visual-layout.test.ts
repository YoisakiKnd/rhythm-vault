/**
 * v0.3 视觉回归守卫（源码级）：手机列表、sticky 顶栏、成绩网格、CSP 约束。
 * 不替代真机截图，但防止 md:hidden / sticky / container 网格被误删。
 */
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const read = (rel: string) => readFileSync(new URL(rel, root), 'utf8');

describe('v0.3 宽表→列表', () => {
	test('ranking：手机列表 + md 表', () => {
		const src = read('src/routes/ranking/+page.svelte');
		expect(src).toContain('md:hidden');
		expect(src).toContain('hidden overflow-x-auto mt-4 md:block');
		expect(src).toContain('<table');
	});

	test('compare 重叠谱面：手机列表 + md 表', () => {
		const src = read('src/routes/compare/+page.svelte');
		expect(src).toContain('md:hidden space-y-3');
		expect(src).toContain('hidden overflow-x-auto md:block');
		expect(src).toContain('<table');
	});

	test('ChartSheetTable：手机列表 + md 表', () => {
		const src = read('src/lib/components/ChartSheetTable.svelte');
		expect(src).toContain('md:hidden space-y-2');
		expect(src).toContain('hidden overflow-x-auto md:block');
		expect(src).toContain('truncate');
	});
});

describe('v0.3 sticky / 顶栏', () => {
	test('SiteNav 手机顶栏 sticky top-0，不挡内容横向溢出', () => {
		const src = read('src/lib/components/SiteNav.svelte');
		expect(src).toContain('lg:hidden sticky top-0 z-30');
		expect(src).toContain('drawer-content flex min-h-dvh flex-col overflow-x-hidden');
		expect(src).toContain('safe-area-inset-top');
	});

	test('曲库筛选条 sticky 顶在手机顶栏下方', () => {
		const src = read('src/routes/library/[game]/+page.svelte');
		expect(src).toContain('sticky z-20');
		expect(src).toContain('top: calc(3rem + env(safe-area-inset-top');
	});
});

describe('v0.3 成绩网格', () => {
	test('app.css：rv-best-grid / djmax b100 用 container query，窄屏 3 列', () => {
		const css = read('src/app.css');
		expect(css).toContain('.rv-best-grid-wrap');
		expect(css).toContain('container-type: inline-size');
		expect(css).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))');
		expect(css).toContain('.rv-djmax-b100');
		expect(css).toContain('@container (min-width: 720px)');
	});

	test('ScoreBestTables / BestChartGrid 接线未回退成宽表', () => {
		const tables = read('src/lib/components/ScoreBestTables.svelte');
		const grid = read('src/lib/components/BestChartGrid.svelte');
		expect(tables).toContain('BestChartGrid');
		expect(tables).toContain('DjmaxBestGrid');
		expect(tables).not.toContain('<table');
		expect(grid).toContain('rv-best-grid');
		expect(grid).toContain('min-w-0');
	});

	test('ShareCard 固定导出宽度，不依赖视口表格', () => {
		const src = read('src/lib/components/ShareCard.svelte');
		expect(src).toContain('width:{width}px');
		expect(src).toContain("kind === 'djmax' ? 1080 : 960");
		expect(src).not.toContain('<table');
	});
});

describe('CSP 硬约束', () => {
	test('不向 script-src 加 unsafe-inline，不写入扩展 sha256', () => {
		const vite = read('vite.config.ts');
		const scriptSrc = vite.match(/'script-src':\s*\[([^\]]*)\]/)?.[1] ?? '';
		expect(scriptSrc).toContain("'self'");
		expect(scriptSrc).toContain('https://challenges.cloudflare.com');
		expect(scriptSrc).not.toContain('unsafe-inline');
		expect(vite).not.toMatch(/sha256-/);
	});
});
