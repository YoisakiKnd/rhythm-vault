<script lang="ts">
	import SiteFooter from '$lib/components/SiteFooter.svelte';
</script>

<svelte:head><title>API 文档 · 葱喵工厂</title></svelte:head>

<main class="mx-auto max-w-3xl px-3 sm:px-4 py-8 sm:py-10 space-y-8">
	<header>
		<h1 class="text-3xl font-bold">开放 API v1</h1>
		<p class="mt-2 text-base-content/70">
			数据经两条独立的绑定进入本站：「数据源」绑定（水鱼/落雪/V-ARCHIVE）决定成绩从哪同步，
			「查询账号」登记（如 QQ 号）决定用什么 ID 能查到这份数据。
			API Key 鉴权调用，专为 QQ Bot 等第三方客户端设计。
		</p>
	</header>

	<section class="card bg-base-200 shadow">
		<div class="card-body">
			<h2 class="card-title">鉴权方式</h2>
			<p class="text-sm">
				在 <a href="/dashboard/developer" class="link">控制台 → 开发者</a>
				生成个人 Key（格式 <code>rv_…</code>），请求时放入 Authorization 头：
			</p>
			<pre class="mockup-code text-xs"><code>Authorization: Bearer rv_xxxxxxxxxxxxxxxxxxxxxxxx</code></pre>
			<p class="text-xs text-base-content/70">Key 可随时吊销；请勿写入公开仓库。</p>
		</div>
	</section>

	<section class="card bg-base-200 shadow">
		<div class="card-body">
			<h2 class="card-title">端点一览</h2>
			<div class="overflow-x-auto">
				<table class="table">
					<thead>
						<tr><th>方法</th><th>路径</th><th>说明</th></tr>
					</thead>
					<tbody>
						<tr>
							<td>GET</td><td><code>/api/v1/me</code></td>
							<td>当前账号信息与可用端点</td>
						</tr>
						<tr>
							<td>GET</td><td><code>/api/v1/maimai/b50</code></td>
							<td>舞萌 DX b50（rating 为本站本地重算值）</td>
						</tr>
						<tr>
							<td>GET</td><td><code>/api/v1/maimai/push</code></td>
							<td>舞萌 DX 推分建议（可提升 / 未游玩可挤入 b50，各 top 10）</td>
						</tr>
						<tr>
							<td>GET</td><td><code>/api/v1/maimai/progress</code></td>
							<td>完成度进度：按版本（牌子）/ 按等级</td>
						</tr>
						<tr>
							<td>GET</td><td><code>/api/v1/chunithm/progress</code></td>
							<td>完成度进度：按等级</td>
						</tr>
						<tr>
							<td>GET</td><td><code>/api/v1/djmax/progress</code></td>
							<td>完成度进度：按曲包</td>
						</tr>
						<tr>
							<td>GET</td><td><code>/api/tools/random</code></td>
							<td>随机选曲（公开端点，无需鉴权）：game / min / max / new / count</td>
						</tr>
						<tr>
							<td>GET</td><td><code>/api/library/{'{game}'}/song/{'{id}'}</code></td>
							<td>公开曲库单曲（封面/分类/版本/全部谱面定数，无需鉴权，不含成绩）</td>
						</tr>
						<tr>
							<td>GET</td><td><code>/api/v1/maimai/song?id=1145</code></td>
							<td>舞萌 DX 整曲信息 + 各谱面成绩（未游玩谱面 score 为 null）</td>
						</tr>
						<tr>
							<td>GET</td><td><code>/api/v1/maimai/song?chart=1145:3</code></td>
							<td>舞萌 DX 单谱面成绩（曲目ID:难度序号）</td>
						</tr>
						<tr>
							<td>GET</td><td><code>/api/v1/chunithm/b30</code></td>
							<td>中二节奏 b30 + 新曲 b20</td>
						</tr>
						<tr>
							<td>GET</td><td><code>/api/v1/chunithm/song?id=3</code></td>
							<td>中二节奏整曲信息 + 各谱面成绩</td>
						</tr>
						<tr>
							<td>GET</td><td><code>/api/v1/chunithm/song?chart=3:4</code></td>
							<td>中二节奏单谱面成绩</td>
						</tr>
						<tr>
							<td>GET</td><td><code>/api/v1/djmax/b100?button=4</code></td>
							<td>DJMAX b100 与总 DJPower（button 取 4/5/6/8，默认 4）</td>
						</tr>
						<tr>
							<td>GET</td><td><code>/api/v1/djmax/song?id=42</code></td>
							<td>DJMAX 整曲信息 + 4/5/6/8B 全部谱面成绩</td>
						</tr>
						<tr>
							<td>GET</td><td><code>/api/v1/djmax/song?song=42&pattern=SC&button=4</code></td>
							<td>DJMAX 单谱面成绩（V-ARCHIVE 曲目数字 ID + NM/HD/MX/SC）</td>
						</tr>
						<tr>
							<td>GET</td><td><code>/api/v1/maimai/sheet</code></td>
							<td>舞萌谱面完成表（level / diff / new / filter=unplayed|fc|pp）</td>
						</tr>
						<tr>
							<td>GET</td><td><code>/api/v1/chunithm/sheet</code></td>
							<td>中二谱面完成表</td>
						</tr>
						<tr>
							<td>GET</td><td><code>/api/v1/djmax/sheet</code></td>
							<td>DJMAX 谱面完成表（button / pattern / level / dlc / new）</td>
						</tr>
						<tr>
							<td>POST</td><td><code>/api/v1/identities/verify</code></td>
							<td>Bot 提交 QQ 验证码（需 bot scope；body: qq + code）</td>
						</tr>
					</tbody>
				</table>
			</div>
			<p class="text-xs text-base-content/70">
				所有数据读取本站同步库（「数据源」绑定 + 概览页同步写入），查询走主键/索引，响应带
				<code>syncedAt</code> 表示数据新鲜度。默认查询 Key 所属账号。
				<code>?qq=</code> 仅限通过审批的 <strong>Bot Key</strong>，且目标用户须已验证该 QQ，并在设置里打开「允许 Bot 查询」。
				未验证 / 未开放 / 不存在统一返回 404。普通 Key 用 <code>?qq=</code> 查别人会 403。
				整曲（<code>?id=</code>）在曲目存在时始终 200，未游玩谱面的 <code>score</code>/<code>rating</code> 为 null；
				单谱面（<code>?chart=</code>）未游玩仍 404。b50/b30 等汇总接口在账号从未同步时返回 404 并附引导文案。
			</p>
		</div>
	</section>

	<section class="card bg-base-200 shadow">
		<div class="card-body">
			<h2 class="card-title">调用示例</h2>
			<pre class="mockup-code text-xs"><code>curl -H "Authorization: Bearer rv_xxxx" \
  https://你的域名/api/v1/maimai/b50</code></pre>
			<pre class="mockup-code text-xs"><code>curl -H "Authorization: Bearer rv_xxxx" \
  "https://你的域名/api/v1/djmax/b100?button=8"</code></pre>
			<pre class="mockup-code text-xs"><code>curl -H "Authorization: Bearer rv_xxxx" \
  "https://你的域名/api/v1/maimai/song?id=1145"</code></pre>
		</div>
	</section>

	<section class="card bg-base-200 shadow">
		<div class="card-body">
			<h2 class="card-title">开发者应用</h2>
			<p class="text-sm">
				在 <a href="/dashboard/developer" class="link">开发者</a>
				生成个人 Key，默认只能查 Key 主人自己。
				要给 QQ Bot 用 <code>?qq=</code> 查别人，在同一页提交开发者申请，站长在审批页通过后即可创建 Bot Key。
				被查用户须打开「允许 Bot 查询」。
			</p>
		</div>
	</section>

	<section class="card bg-base-200 shadow">
		<div class="card-body">
			<h2 class="card-title">错误格式</h2>
			<pre class="mockup-code text-xs"><code>{'{ "error": "错误描述" }'}</code></pre>
			<ul class="text-sm space-y-1 mt-2">
				<li>· 401 —— API Key 缺失 / 无效 / 已吊销</li>
				<li>· 400 —— 未绑定对应账号或参数错误</li>
				<li>· 403 —— 该 Key 无跨账号查询权限，或上游要求用户开放第三方查询</li>
				<li>· 502 —— 上游服务故障（可稍后重试）</li>
			</ul>
		</div>
	</section>
</main>

<SiteFooter />
