<script lang="ts">
	import SiteFooter from '$lib/components/SiteFooter.svelte';
</script>

<svelte:head><title>用户协议 · 葱喵工厂</title></svelte:head>

<main class="mx-auto max-w-3xl px-3 sm:px-4 py-8 sm:py-10">
	<h1 class="text-2xl sm:text-3xl font-bold">用户协议</h1>
	<p class="text-sm text-base-content/60 mt-1">适用于「葱喵工厂」（rhythm-vault）。更新日期：2026-09-03。</p>

	<section class="mt-6 space-y-3 text-sm sm:text-base text-base-content/80 leading-relaxed">
		<p>
			本站是面向中文玩家的多音游成绩中枢（舞萌 DX 国服、中二节奏国服、DJMAX RESPECT V），提供曲库浏览、成绩同步、评分 / 推分分析与开放查分 API。
			服务由个人维护的开源项目提供，<strong>不构成</strong>与任何公司的合同关系，也无虚假的「有限公司」主体声明。
		</p>

		<h2 class="text-lg font-semibold text-base-content !mt-8">账号与使用</h2>
		<ul class="list-disc pl-5 space-y-1.5">
			<li>注册即表示你同意本协议与 <a class="link" href="/privacy">隐私政策</a>。</li>
			<li>请妥善保管密码与 API Key（<code class="text-xs">rv_…</code>）。Key 明文只在创建时显示一次，泄露后请立即吊销。</li>
			<li>查询账号（如 QQ）为自声明登记：请只登记本人标识；滥用可能导致限制访问。</li>
			<li>站长工具、开发者 / Bot Key 审批仅限维护需要，不授予额外法定权利。</li>
		</ul>

		<h2 class="text-lg font-semibold text-base-content !mt-8">数据来源与同步</h2>
		<ul class="list-disc pl-5 space-y-1.5">
			<li>
				成绩可来自：水鱼 / 落雪的公开查询或 OAuth 授权、V-ARCHIVE 公开接口。公开绑定时，需你在上游已同意其用户协议并开放第三方查询。
			</li>
			<li>OAuth 路径下，本站仅保存加密后的令牌用于同步，不会索取官方机台 / NET 密码。</li>
			<li>评分（B50 / B30+B20 / DJMAX 等）由本站引擎根据谱面定数与分数本地重算，不依赖查分器返回的 rating 数值作为唯一真相。</li>
			<li>上游为社区服务，可能变更、限流或中断；本站会尽量友好提示，但不保证实时性与完整性。</li>
		</ul>

		<h2 class="text-lg font-semibold text-base-content !mt-8">开放 API</h2>
		<p>
			你可为个人或已审批的 Bot 生成 Key，按文档调用 <code class="text-xs">/api/v1/…</code>。
			请遵守限流、不得枚举他人查询账号，也不得把 Key 嵌入公开仓库。详情见
			<a class="link" href="/api-docs">站内文档</a>。
		</p>

		<h2 class="text-lg font-semibold text-base-content !mt-8">免责声明</h2>
		<ul class="list-disc pl-5 space-y-1.5">
			<li>本站按「现状」提供，不对可用性、数据准确性或与官方活动的兼容性作保证。</li>
			<li>SEGA / TJA / NEOWIZ 等游戏厂商、水鱼 / 落雪 / V-ARCHIVE 均与本站无隶属关系；商标归各自权利人。</li>
			<li>因上游故障、配置错误、误操作或不可抗力导致的损失，在法律允许范围内本站不承担责任。</li>
		</ul>

		<h2 class="text-lg font-semibold text-base-content !mt-8">终止与变更</h2>
		<p>
			我们可能随时调整功能、暂停服务或更新本协议；重大变更会尽量在仓库或站内说明。继续使用即视为接受更新后的条款。
			你可随时停止使用并申请清理数据（见隐私政策）。
		</p>

		<h2 class="text-lg font-semibold text-base-content !mt-8">联系</h2>
		<p>
			反馈与争议请通过 GitHub Issues：
			<a class="link" href="https://github.com/YoisakiKnd/rhythm-vault/issues" target="_blank" rel="noopener noreferrer"
				>github.com/YoisakiKnd/rhythm-vault/issues</a
			>。
		</p>
	</section>
</main>

<SiteFooter />
