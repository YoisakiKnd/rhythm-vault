<script lang="ts">
	import SiteFooter from '$lib/components/SiteFooter.svelte';
	import { page } from '$app/state';

	const origin = $derived(page.url.origin);

	const usage = [
		{
			title: '绑定查分器',
			body: '在控制台绑定水鱼、落雪或 V-ARCHIVE。舞萌 / 中二可以两家都绑，成绩分开存放。',
			href: '/dashboard/links',
			cta: '去绑定'
		},
		{
			title: '同步成绩',
			body: '绑定后到概览点立即同步。冷却 5 分钟。查分、进度、完成表都读这次同步的结果。',
			href: '/dashboard',
			cta: '去同步'
		},
		{
			title: '查分与推分',
			body: '查分页看 B50 / B30 / B100，舞萌下面还有推分建议。侧栏可切游戏和水鱼 / 落雪。',
			href: '/scores',
			cta: '去查分'
		},
		{
			title: '公开主页',
			body: '设置里打开档案公开后，别人能看你的主页，也会出现在排行榜和玩家对比里。',
			href: '/dashboard/settings',
			cta: '去设置'
		}
	];

	type ApiRow = { method: string; path: string; desc: string };
	const groups: { name: string; hint: string; rows: ApiRow[] }[] = [
		{
			name: '公开',
			hint: '不用 Key',
			rows: [
				{ method: 'GET', path: '/api/tools/random', desc: '随机选曲。参数 game / min / max / new / count' },
				{ method: 'GET', path: '/api/library/{game}/song/{id}', desc: '曲库单曲：封面、分类、谱面定数，不含成绩' }
			]
		},
		{
			name: '账号',
			hint: '需要 Key',
			rows: [{ method: 'GET', path: '/api/v1/me', desc: '当前账号与可用端点' }]
		},
		{
			name: '舞萌 DX',
			hint: '需要 Key',
			rows: [
				{ method: 'GET', path: '/api/v1/maimai/b50', desc: 'B50，rating 为本站重算' },
				{ method: 'GET', path: '/api/v1/maimai/push', desc: '推分建议：按 B50 定数水平，优先离下一档近的已打谱' },
				{ method: 'GET', path: '/api/v1/maimai/progress', desc: '完成度：按版本（牌子）/ 按等级' },
				{ method: 'GET', path: '/api/v1/maimai/sheet', desc: '完成表。level / diff / new / filter=unplayed|fc|pp' },
				{ method: 'GET', path: '/api/v1/maimai/song?id=1145', desc: '整曲 + 各谱面成绩，未游玩 score 为 null' },
				{ method: 'GET', path: '/api/v1/maimai/song?chart=1145:3', desc: '单谱面。曲目 ID:难度序号，未游玩 404' }
			]
		},
		{
			name: '中二节奏',
			hint: '需要 Key',
			rows: [
				{ method: 'GET', path: '/api/v1/chunithm/b30', desc: '旧曲 B30 + 新曲 B20' },
				{ method: 'GET', path: '/api/v1/chunithm/push', desc: '推分建议：按 B30+B20 定数水平，优先离下一档近的已打谱' },
				{ method: 'GET', path: '/api/v1/chunithm/progress', desc: '完成度：按等级' },
				{ method: 'GET', path: '/api/v1/chunithm/sheet', desc: '完成表' },
				{ method: 'GET', path: '/api/v1/chunithm/song?id=3', desc: '整曲 + 各谱面成绩' },
				{ method: 'GET', path: '/api/v1/chunithm/song?chart=3:4', desc: '单谱面' }
			]
		},
		{
			name: 'DJMAX',
			hint: '需要 Key',
			rows: [
				{ method: 'GET', path: '/api/v1/djmax/b100?button=4', desc: 'B100 与总 DJPower。button 取 4/5/6/8' },
				{ method: 'GET', path: '/api/v1/djmax/progress', desc: '完成度：按曲包' },
				{ method: 'GET', path: '/api/v1/djmax/sheet', desc: '完成表。button / pattern / level / dlc / new' },
				{ method: 'GET', path: '/api/v1/djmax/song?id=42', desc: '整曲 + 4/5/6/8B 全部谱面' },
				{
					method: 'GET',
					path: '/api/v1/djmax/song?song=42&pattern=SC&button=4',
					desc: '单谱面。V-ARCHIVE 曲目 ID + NM/HD/MX/SC'
				}
			]
		},
		{
			name: 'Bot',
			hint: '需要 Bot Key',
			rows: [
				{
					method: 'POST',
					path: '/api/v1/identities/verify',
					desc: '提交 QQ 验证码。body: qq + code'
				}
			]
		}
	];

	const errors = [
		{ code: '401', text: 'Key 缺失、无效或已吊销' },
		{ code: '400', text: '未绑定对应查分器，或参数不对' },
		{ code: '403', text: '这把 Key 不能查别人，或对方未开放查询' },
		{ code: '404', text: '没有这份成绩，或 ?qq= 对应的人不存在 / 未开放' },
		{ code: '502', text: '查分器暂时不可用，稍后重试' }
	];

	let copied = $state('');

	async function copy(text: string, id: string) {
		try {
			await navigator.clipboard.writeText(text);
			copied = id;
			setTimeout(() => {
				if (copied === id) copied = '';
			}, 1500);
		} catch {
			copied = '';
		}
	}

	const curlB50 = $derived(`curl -H "Authorization: Bearer rv_xxxx" \\\n  ${origin}/api/v1/maimai/b50`);
	const curlDjmax = $derived(
		`curl -H "Authorization: Bearer rv_xxxx" \\\n  "${origin}/api/v1/djmax/b100?button=8"`
	);
	const curlSong = $derived(
		`curl -H "Authorization: Bearer rv_xxxx" \\\n  "${origin}/api/v1/maimai/song?id=1145"`
	);
</script>

<svelte:head><title>文档 · 葱喵工厂</title></svelte:head>

<main class="mx-auto w-full max-w-3xl px-3 sm:px-4 py-6 sm:py-8">
	<header>
		<h1 class="rv-page-title">文档</h1>
		<p class="rv-page-desc">先看怎么用这个站。要写 Bot 或脚本，下面有开放 API。</p>
	</header>

	<nav class="mt-4 flex flex-wrap gap-3 text-sm">
		<a class="link" href="#usage">使用本站</a>
		<a class="link" href="#api">开放 API</a>
	</nav>

	<section id="usage" class="mt-6 space-y-3 scroll-mt-16">
		<h2 class="font-semibold">使用本站</h2>
		{#each usage as item (item.title)}
			<div class="rv-panel p-4 sm:p-5">
				<h3 class="font-medium">{item.title}</h3>
				<p class="mt-1 text-sm text-base-content/60">{item.body}</p>
				<a class="mt-2 inline-block text-sm text-primary" href={item.href}>{item.cta}</a>
			</div>
		{/each}
	</section>

	<section id="api" class="mt-8 scroll-mt-16">
		<h2 class="font-semibold">开放 API</h2>
		<p class="mt-1 text-sm text-base-content/55">
			成绩来自你绑定并同步的查分器。默认查 Key 主人自己。响应里的
			<code class="text-xs">syncedAt</code>
			是最近一次同步时间。
		</p>

		<div class="rv-panel mt-4 p-4 sm:p-5">
			<h3 class="font-medium">鉴权</h3>
			<p class="mt-1 text-sm text-base-content/60">
				到
				<a class="link" href="/dashboard/developer">控制台 → 开发者</a>
				生成个人 Key（<code class="text-xs">rv_…</code>），明文只显示一次。请求头：
			</p>
			<pre class="mt-3 overflow-x-auto rounded-lg bg-base-200 px-3 py-2.5 text-xs"><code>Authorization: Bearer rv_xxxxxxxxxxxxxxxxxxxxxxxx</code></pre>
			<p class="mt-3 text-sm text-base-content/60">
				要给群 Bot 用 <code class="text-xs">?qq=</code> 查别人：同一页提交申请，站长通过后创建 Bot Key。被查的人须已验证该 QQ，并在设置里打开「允许 Bot 查询」。查不到、未开放、未验证都返回 404。
			</p>
		</div>

		{#each groups as group (group.name)}
			<div class="rv-panel mt-3 overflow-hidden">
				<div class="flex items-baseline justify-between gap-2 px-4 sm:px-5 pt-4">
					<h3 class="font-medium">{group.name}</h3>
					<p class="text-xs text-base-content/45">{group.hint}</p>
				</div>
				<ul class="mt-3 divide-y divide-base-300">
					{#each group.rows as row (row.path)}
						<li class="px-4 sm:px-5 py-3">
							<p class="font-mono text-xs sm:text-sm break-all">
								<span class="text-primary">{row.method}</span>
								{row.path}
							</p>
							<p class="mt-1 text-sm text-base-content/60">{row.desc}</p>
						</li>
					{/each}
				</ul>
			</div>
		{/each}

		<div class="rv-panel mt-3 p-4 sm:p-5">
			<h3 class="font-medium">调用示例</h3>
			{#each [{ id: 'b50', code: curlB50 }, { id: 'djmax', code: curlDjmax }, { id: 'song', code: curlSong }] as ex (ex.id)}
				<div class="mt-3">
					<div class="flex justify-end">
						<button class="btn btn-ghost btn-xs" type="button" onclick={() => copy(ex.code, ex.id)}>
							{copied === ex.id ? '已复制' : '复制'}
						</button>
					</div>
					<pre class="overflow-x-auto rounded-lg bg-base-200 px-3 py-2.5 text-xs"><code>{ex.code}</code></pre>
				</div>
			{/each}
		</div>

		<div class="rv-panel mt-3 p-4 sm:p-5">
			<h3 class="font-medium">错误</h3>
			<p class="mt-1 text-sm text-base-content/55">一律 <code class="text-xs">{'{ "error": "说明" }'}</code></p>
			<ul class="mt-3 space-y-1.5 text-sm">
				{#each errors as e (e.code)}
					<li>
						<code class="text-xs">{e.code}</code>
						<span class="ml-2 text-base-content/70">{e.text}</span>
					</li>
				{/each}
			</ul>
		</div>
	</section>
</main>

<SiteFooter />
