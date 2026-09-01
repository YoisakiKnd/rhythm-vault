# rhythm-vault

面向中文玩家的多音游成绩中枢：DJMAX RESPECT V、舞萌 DX 国服、中二节奏 国服的曲库、查分与 rating 追踪。

设计与方案详见 [docs/design.md](docs/design.md)。

## 技术栈

- **Monorepo**：Bun workspaces（包管理 / 脚本 / 测试运行器）
- **前端**：SvelteKit（Svelte 5）+ Tailwind CSS v4 + daisyUI + ECharts（rating 历史曲线）
- **后端**：SvelteKit server endpoints + 独立 worker（进程内轮询自动同步；BullMQ + Redis 待规模需要时引入）
- **数据**：PostgreSQL + Drizzle；曲库 JSON 运行时从上游拉取（不进 git / 镜像）
- **鉴权**：账号密码（scrypt）+ 会话 Cookie + API Key（`rv_…`，服务端仅存哈希）

## 目录结构

```
apps/
  web/        # SvelteKit 站点（页面 + 服务端 API + 用户控制台）
  worker/     # 曲库同步等任务（bun run sync:songs）
packages/
  core/       # 领域类型 + 评分引擎（maimai b50 / djmax b100，纯 TS）
  adapters/   # 水鱼 / 落雪 / V-ARCHIVE API 客户端与归一化
  db/         # Drizzle schema + 迁移
  data/       # 曲库 JSON 输出目录（gitignore，sync:songs 生成）
docs/
```

## 快速开始

```bash
bun install
cp .env.example .env        # 填写 DATABASE_URL / ENCRYPTION_KEY
bun run db:migrate          # 应用数据库迁移（需本地 PostgreSQL）
bun run dev                 # 启动 web（http://localhost:5173）
bun run test                # 单元测试
bun run check               # svelte-check 类型检查
bun run build               # 构建（adapter-node 产物）
bun run sync:songs          # 同步三游曲库到 packages/data
bun run seed:demo e2euser   # （开发）向指定用户灌入演示成绩
```

OAuth 应用配置（可选，用于第三方令牌绑定）：水鱼应用在 [auth.diving-fish.com/console](https://auth.diving-fish.com/console) 创建，落雪在 [maimai.lxns.net/developer](https://maimai.lxns.net/developer) 创建；回调地址分别填 `{BASE_URL}/api/links/divingfish/callback` 与 `{BASE_URL}/api/links/lxns/callback`。

## 用户侧使用流程

1. 注册账号 → 控制台「数据源」绑定水鱼用户名 / 落雪好友码 / V-ARCHIVE ID（或发起 OAuth 授权）——这决定成绩从哪同步
2. 控制台「概览」点击「立即同步」，成绩归一化入库（后台每 6 小时自动同步）
3. 如需让 Bot 按 QQ 号查询，到「查询账号」登记 QQ（对外检索别名）
4. 控制台「API Keys」或「开发者」生成 Key（明文仅显示一次，服务端只存哈希）
5. Bot / 客户端携带 `Authorization: Bearer rv_…` 调用 `/api/v1/maimai/b50`、`/api/v1/chunithm/b30`、`/api/v1/djmax/b100?button=4` 及单曲接口（可加 `?qq=` 按查询账号检索）；完整文档见站内 `/api-docs`

## Docker

成绩在 Postgres（volume `pgdata`），曲库由 `sync-songs` 启动时从上游拉到 `library` volume，**不进镜像**。生产用 Caddy + GHCR，详见 [docs/deploy.md](docs/deploy.md)。

```bash
cp .env.example .env   # 至少填 ENCRYPTION_KEY / BASE_URL
docker compose up --build          # 本地，web :3000
# 生产：
# cp .env.prod.example .env
# docker compose -f docker-compose.prod.yml --env-file .env up -d
```

## 数据来源与致谢

- [水鱼查分器](https://www.diving-fish.com/)（maimai / chunithm 曲库与成绩 API，OAuth）
- [落雪查分器](https://maimai.lxns.net/)（maimai / chunithm 成绩与曲库版本数据，OAuth / 好友码）
- [V-ARCHIVE](https://v-archive.net/)（DJMAX RESPECT V 曲库与成绩）
- maimai rating 系数表与 DJMAX DJPower 段位参考自水鱼查分器与 djmax_bests_generate（MIT）
