# 部署指南

## 数据怎么走（Docker 必读）

两类数据不要混，**曲库不要打进镜像**：

| | 存哪 | 怎么到生产 |
|---|---|---|
| 账号、绑定、成绩、快照 | **PostgreSQL** | web 与 worker 共用 `DATABASE_URL`。数据目录用 volume / 托管库。 |
| 曲库 JSON（曲名、定数、谱面） | **运行时 volume** | 镜像里只有代码。compose 的 `sync-songs` 启动时从水鱼 / 落雪 / V-ARCHIVE 拉到 `library` volume；web、worker **只读**挂载。 |
| 曲绘磁盘缓存 | **covers volume** | web 进程以非 root 写入 `RV_COVER_DIR`（默认 `/app/.cache/covers`）。写失败会跳过缓存，不应 500。 |

玩家成绩同步打上游、写入 Postgres，与曲库文件无关。曲库是第三方数据，构建产物和公开仓库都不应夹带。本地开发用 `bun run sync:songs` 写到 `packages/data/`（已 gitignore）。

更新曲库：

```bash
# 本地 compose
docker compose run --rm sync-songs && docker compose restart worker

# 生产
docker compose -f docker-compose.prod.yml --env-file .env run --rm sync-songs \
  && docker compose -f docker-compose.prod.yml --env-file .env restart worker
```

web 按文件 mtime 热加载；worker 进程内曲库缓存要重启才更新。空 volume 且库里还留着上次的 ETag 时，sync-songs 会忽略 ETag 重新拉，避免 304 跳过导致没有 JSON。

已有 `library` volume 若是旧镜像（root 属主）建出来的，升级后 `sync-songs` 可能仍无写权限。一次性修复：

```bash
docker compose -f docker-compose.prod.yml --env-file .env run --rm --user root sync-songs \
  chown -R bun:bun /app/packages/data
```

## 生产：单机 Compose + Caddy + GHCR

目标形态：只有 Caddy 暴露 80/443（自动 HTTPS），web 在内网 `:3000`，镜像从 GHCR 拉取。

### 1. 仓库与镜像

本仓库 CI（`.github/workflows/ci.yml`）在 push / PR 上跑 check、lint、test、build。打 `v*` tag 或在 Actions 里手动跑 **Release**，会把 `rhythm-vault-web` 与 `rhythm-vault-worker` 推到 `ghcr.io/<owner>/…`，标签为 git sha、`latest`、以及 tag 名。

服务器不需要 Bun / 构建工具链。

### 2. 服务器首次部署

```bash
# 机器上需要 Docker Compose v2，80/443 对公网开放，DNS A/AAAA 已指过来
git clone git@github.com:<owner>/rhythm-vault.git /opt/rhythm-vault
cd /opt/rhythm-vault
cp .env.prod.example .env
# 编辑 .env：GHCR_OWNER / RV_DOMAIN / BASE_URL / POSTGRES_PASSWORD / ENCRYPTION_KEY
# 以及 OAuth、Turnstile、RV_ADMIN_USERS

echo "$GITHUB_TOKEN" | docker login ghcr.io -u USERNAME --password-stdin
docker compose -f docker-compose.prod.yml --env-file .env pull
docker compose -f docker-compose.prod.yml --env-file .env up -d
```

顺序：Postgres → migrate → **sync-songs（拉曲库）** → web + worker → Caddy（等 web `/healthz` 健康后才起来）。

compose 会覆盖容器内 `DATABASE_URL` 为 `db` 主机，并写入：

- `ORIGIN=$BASE_URL`（adapter-node 不再猜 Host）
- `ADDRESS_HEADER=x-forwarded-for`、`XFF_DEPTH=1`（取 Caddy 追加的真实 IP，忽略客户端伪造的 XFF 首段）
- `RV_COVER_DIR=/app/.cache/covers`

### 3. 升级

```bash
cd /opt/rhythm-vault
git pull
docker compose -f docker-compose.prod.yml --env-file .env pull
docker compose -f docker-compose.prod.yml --env-file .env up -d
```

migrate 与 sync-songs 仍是一次性前置服务；有新的 Drizzle 迁移时这次 `up` 会跑它们。只想更新曲库见上文 `run --rm sync-songs`。

### 4. 备份与曲库周更

```bash
# 每天 03:15 备份 Postgres（自定义格式，保留 14 天）
15 3 * * * /opt/rhythm-vault/scripts/backup.sh

# 每周日 04:00 更新曲库并重启 worker（否则进程内缓存不刷新）
0 4 * * 0 cd /opt/rhythm-vault && docker compose -f docker-compose.prod.yml --env-file .env run --rm sync-songs && docker compose -f docker-compose.prod.yml --env-file .env restart worker
```

手动备份：`./scripts/backup.sh`（产物在 `backups/rhythm_vault_YYYYMMDD.dump`）。恢复：

```bash
docker compose -f docker-compose.prod.yml --env-file .env exec -T db \
  pg_restore -U rv -d rhythm_vault --clean --if-exists < backups/rhythm_vault_YYYYMMDD.dump
```

## 本地 Docker Compose

```bash
cp .env.example .env   # 至少填 ENCRYPTION_KEY / BASE_URL
docker compose up --build
```

web 在 `:3000`。容器内 `DATABASE_URL` 指向 `db`，本机 Postgres 的 5432 **不会**被映射。

## 只跑 Web 镜像

```bash
docker build -t rhythm-vault .
docker run -d --name rhythm-vault \
  -p 3000:3000 \
  -e DATABASE_URL="postgres://user:pass@host:5432/rhythm_vault" \
  -e ENCRYPTION_KEY="..." \
  -e BASE_URL="https://你的域名" \
  -e ORIGIN="https://你的域名" \
  -e RV_DATA_DIR=/app/packages/data \
  -e RV_COVER_DIR=/app/.cache/covers \
  -v rv-library:/app/packages/data \
  -v rv-covers:/app/.cache/covers \
  rhythm-vault
```

volume 要先有曲库 JSON。可用 worker 镜像跑一次：

```bash
docker build -f Dockerfile.worker -t rhythm-vault-worker .
docker run --rm \
  -e DATABASE_URL="postgres://user:pass@host:5432/rhythm_vault" \
  -e RV_DATA_DIR=/app/packages/data \
  -v rv-library:/app/packages/data \
  rhythm-vault-worker bun run --cwd apps/worker sync:songs
```

成绩自动同步仍需另起 worker，指向同一 `DATABASE_URL` 和同一 library volume。反代后面还要设 `ADDRESS_HEADER=x-forwarded-for` 与 `XFF_DEPTH=1`。

## 裸机（Node）

```bash
bun install
bun run db:migrate
bun run sync:songs
bun run build
NODE_ENV=production DATABASE_URL=... ENCRYPTION_KEY=... BASE_URL=... ORIGIN=... \
  ADDRESS_HEADER=x-forwarded-for XFF_DEPTH=1 \
  node apps/web/build
```

默认端口 3000，可用 `PORT=xxx` 覆盖。worker：`bun run worker`。

## systemd 示例

```ini
[Unit]
Description=rhythm-vault
After=network.target postgresql.service

[Service]
WorkingDirectory=/opt/rhythm-vault
EnvironmentFile=/opt/rhythm-vault/.env
Environment=NODE_ENV=production
Environment=RV_DATA_DIR=/opt/rhythm-vault/packages/data
Environment=RV_COVER_DIR=/opt/rhythm-vault/apps/web/.cache/covers
ExecStart=/usr/bin/node apps/web/build
Restart=always

[Install]
WantedBy=multi-user.target
```

上线前在同一台机器跑 `bun run sync:songs`，不要把 `packages/data/*.json` 打进发布包。

## 环境变量（生产必读）

| 变量 | 作用 |
|---|---|
| `BASE_URL` | 站点对外地址；OAuth 回调依赖它。compose 同时把它写成 adapter-node 的 `ORIGIN` |
| `ENCRYPTION_KEY` | AES 加密第三方令牌。≥16 字符，拒绝 `changeme` 等占位词。**上线后不要换** |
| `POSTGRES_PASSWORD` | 生产必填，不再默认 `rv` |
| `RV_DOMAIN` | Caddy 证书用的主机名（无 `https://`） |
| `GHCR_OWNER` | `ghcr.io/<owner>/rhythm-vault-web` 的 owner |
| `RV_ADMIN_USERS` | 可审批开发者申请、手动确认 QQ 的用户名 |
| `RV_ALLOW_UNVERIFIED_QQ` | 仅开发。生产禁止 |
| `ADDRESS_HEADER` / `XFF_DEPTH` | 反代真实 IP；不要自己读 XFF 首段 |
| `RV_COVER_DIR` | 曲绘缓存目录，容器内须对运行用户可写 |
| `TURNSTILE_SITE_KEY` / `SECRET` | 配齐则登录/注册做人机验证；不配则跳过 |

`SESSION_SECRET` 是幽灵变量，代码不读，无需配置。

## 上线检查清单

1. `BASE_URL` 与实际域名一致（OAuth 回调须与水鱼/落雪开发者后台登记的地址逐字符一致）
2. `ENCRYPTION_KEY` 已换成强随机值；不要使用占位词。生产进程在首次请求时 fail-fast，配错会直接退出
3. （推荐）已配置 Cloudflare Turnstile
4. worker 已启动，自动同步含 OAuth 全量
5. 曲库由 `sync:songs` 写入 `RV_DATA_DIR`，镜像构建日志里不应出现拷贝 `maimaidx.json` 等文件
6. 只有 Caddy 对公网开放 80/443；web 的 3000 不发布
7. `scripts/backup.sh` 已进 cron
8. `RV_ADMIN_USERS` 已填；`RV_ALLOW_UNVERIFIED_QQ` 未开

## 人工冒烟

- `curl -fsS https://域名/healthz` 返回 `{"ok":true,"db":true}`
- 首页曲绘正常显示（容器内 `RV_COVER_DIR` 可写，失败也不该 500）
- 浏览器控制台无 CSP 报错；切换主题后刷新能保持
- 控制台 rating 历史曲线（ECharts）能渲染
- 登录 / 注册跑一遍，Turnstile 出现且校验通过；连续失败 5 次触发限流后，换网络能正常登录
- 水鱼 / 落雪 OAuth 绑定往返成功
- `/scores`、`/progress`、`/sheet/maimai` 三个页面出数
- Bot Key：普通 Key 带 `?qq=` 被拒；审批通过的 Bot Key 查未开「允许 Bot 查询」的用户被拒
- `/dashboard/scores` 与 `/dashboard/progress` 返回 301；`/dashboard/keys` 301 到 `/dashboard/developer`；`/dashboard/developer/review` 301 到 `/admin`
- 非站长访问 `/admin` 为 403；站长侧栏可见「管理后台」
- `docker compose logs sync-songs` 里三个 JSON 都写成功
