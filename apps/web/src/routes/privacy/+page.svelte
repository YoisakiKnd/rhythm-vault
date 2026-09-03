<script lang="ts">
	import SiteFooter from '$lib/components/SiteFooter.svelte';
</script>

<svelte:head><title>隐私政策 · 葱喵工厂</title></svelte:head>

<main class="mx-auto max-w-3xl px-3 sm:px-4 py-8 sm:py-10">
	<h1 class="text-2xl sm:text-3xl font-bold">隐私政策</h1>
	<p class="text-sm text-base-content/60 mt-1">适用于「葱喵工厂」（rhythm-vault）音游成绩中枢。更新日期：2026-09-03。</p>

	<section class="mt-6 space-y-3 text-sm sm:text-base text-base-content/80 leading-relaxed">
		<p>
			本站由个人维护的开源项目提供，<strong>不是</strong>公司或法定主体运营的商业服务。本页说明我们实际如何处理数据，便于你决定是否使用。
		</p>

		<h2 class="text-lg font-semibold text-base-content !mt-8">我们收集什么</h2>
		<ul class="list-disc pl-5 space-y-1.5">
			<li><strong>账号</strong>：用户名与密码（密码经 scrypt 加盐哈希后存储，服务端不存明文）。</li>
			<li><strong>查分器绑定</strong>：你填写的水鱼用户名、落雪好友码、V-ARCHIVE ID；若走 OAuth，则保存加密后的第三方访问令牌（及必要时的刷新令牌），用于代你向水鱼 / 落雪拉取成绩。</li>
			<li><strong>成绩与评分</strong>：从水鱼、落雪、V-ARCHIVE 同步或由本站评分引擎重算得到的成绩、rating 快照与同步任务状态。</li>
			<li><strong>查询账号</strong>：你主动登记的对外检索别名（当前为 QQ 号），供开放 API / Bot 按别名查分。</li>
			<li><strong>API Key</strong>：你在控制台生成的 <code class="text-xs">rv_…</code> Key；明文仅创建时展示一次，服务端只存哈希与前缀便于识别。</li>
			<li><strong>会话与安全</strong>：登录会话 Cookie（服务端存令牌哈希）、可选的人机验证（Turnstile）、请求日志中的非敏感诊断信息（如请求 ID）。</li>
		</ul>

		<h2 class="text-lg font-semibold text-base-content !mt-8">我们不收集什么</h2>
		<ul class="list-disc pl-5 space-y-1.5">
			<li>不接受、不存储官方 NET 账号密码，也不要求你交出查分器账密；第三方接入优先 OAuth 或公开查询接口。</li>
			<li>不把 OAuth 令牌、刷新令牌、授权码、PKCE 校验串或 API Key 明文写进对你可见的错误提示。</li>
		</ul>

		<h2 class="text-lg font-semibold text-base-content !mt-8">如何使用与保护</h2>
		<ul class="list-disc pl-5 space-y-1.5">
			<li>成绩同步、站内查分 / 进度 / 推分、开放 API（<code class="text-xs">Authorization: Bearer rv_…</code>）以及站长审批的 Bot 查询。</li>
			<li>第三方 OAuth 令牌使用站点配置的加密密钥（环境变量派生）以 AES-GCM 加密后落库；同步有冷却与上游配额退避。</li>
			<li>手动同步默认冷却约 5 分钟；后台也会按间隔自动同步已绑定账号。</li>
		</ul>

		<h2 class="text-lg font-semibold text-base-content !mt-8">可见性默认值</h2>
		<ul class="list-disc pl-5 space-y-1.5">
			<li><strong>档案公开</strong>：默认关闭。打开后，访客可查看你的公开主页，并可能出现在排行榜与玩家对比中。</li>
			<li><strong>Bot 查询</strong>：默认关闭，与档案公开相互独立。打开且 QQ 已验证后，持有效 Bot Key 的客户端可用 <code class="text-xs">?qq=</code> 查询你的成绩。</li>
		</ul>

		<h2 class="text-lg font-semibold text-base-content !mt-8">共享与第三方</h2>
		<p>
			成绩数据来自社区查分器：水鱼查分器、落雪咖啡屋、V-ARCHIVE。本站按你的绑定向它们发起查询；对方另有各自的隐私与用户条款，请同时遵守。
			我们不会把你的密码或 API Key 明文出售或交给无关第三方。
		</p>

		<h2 class="text-lg font-semibold text-base-content !mt-8">你的控制权</h2>
		<ul class="list-disc pl-5 space-y-1.5">
			<li>可随时在控制台解绑数据源；水鱼 OAuth 解绑时会尽量向对方发起撤销。</li>
			<li>可吊销 API Key、关闭档案公开 / Bot 查询、修改密码并登出全部设备。</li>
			<li>需要删除账号或数据时，请通过下方联系方式提出，我们会在合理范围内处理（开源个人站点，处理时效可能有限）。</li>
		</ul>

		<h2 class="text-lg font-semibold text-base-content !mt-8">联系</h2>
		<p>
			无独立客服渠道。问题、隐私诉求或漏洞报告请到 GitHub Issues：
			<a class="link" href="https://github.com/YoisakiKnd/rhythm-vault/issues" target="_blank" rel="noopener noreferrer"
				>github.com/YoisakiKnd/rhythm-vault/issues</a
			>。
		</p>
		<p class="text-base-content/60 text-sm">
			另见 <a class="link" href="/terms">用户协议</a>。
		</p>
	</section>
</main>

<SiteFooter />
