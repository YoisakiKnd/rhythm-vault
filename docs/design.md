# rhythm-vault 项目基础设计

> 定位：一个面向中文玩家的多音游成绩中枢。以 DJMAX RESPECT V（对标 V-ARCHIVE 的功能形态）为起点，同时接入舞萌 DX 国服与中二节奏国服的成绩数据，并提供查分 / 评分 / 推分等分析功能。

## 1. 核心设计思想

三款游戏的计分方式、评分体系、数据来源完全不同，但"曲库 → 谱面 → 成绩 → 评分"这条主干是一样的。因此整个项目建立在两条原则上：

1. **游戏无关的核心领域模型**：玩家、曲库、谱面、成绩、评分快照等核心表对三款游戏统一建模，跨游戏的功能（用户体系、搜索、对比、好友）只写一次。
2. **每款游戏一个"插件"**：把游戏间的差异收进两个可替换的模块——`SourceAdapter`（数据从哪来）和 `RatingEngine`（分数怎么算）。新增游戏 = 新增一组插件，不动核心。

```
                     ┌─────────────────────────────────────────┐
   曲库流水线          │  曲库缓存 (packages/data，运行时拉取，不进镜像) │
   (sync:songs)        │  djmax.json / maimaidx.json / chunithm.json│
                     └───────────────┬─────────────────────────┘
                                     │ import 脚本 (CI 校验 schema 后入库)
                                     ▼
┌──────────┐   ┌──────────────────────────────────────────────┐
│ 水鱼API   │──▶│  SourceAdapter 层                             │
│ 落雪API   │   │  divingfish / lxns / varchive / manual-entry  │
│ V-ARCHIVE│   └──────────────┬───────────────────────────────┘
│ 手动录入  │                  │ 归一化 (RawScore → ScoreRecord)
└──────────┘                  ▼
              ┌──────────────────────────────────────────────┐
              │  核心: PostgreSQL (玩家/曲库/成绩/评分快照)      │
              │  Redis (API缓存 + 任务队列)                    │
              └──────────────┬───────────────────────────────┘
                             ▼
              ┌──────────────────────────────────────────────┐
              │  RatingEngine 层 (纯函数, 可单测)               │
              │  maimai-b50 / chuni-b30b20 / djmax-v-rating   │
              └──────────────┬───────────────────────────────┘
                             ▼
              ┌──────────────────────────────────────────────┐
              │  apps/web (SvelteKit: 曲库页预渲染+查分页 SSR   │
              │  + 服务端 API) + apps/worker (BullMQ 同步任务) │
              └──────────────────────────────────────────────┘
```

## 2. 三款游戏差异对照（设计的依据）

| | DJMAX RESPECT V | 舞萌 DX 国服 | 中二节奏 国服 |
|---|---|---|---|
| 计分 | V 值（按 note 数折算的准确率）| 达成率 0–101.0000% | 分数 0–1010000 |
| 谱面难度 | 4K/5K/6K/8K × NM/HD/MX/SC，SC 有 1–15 内部等级 | 基本/高级/专家/大师/宴（+真/Re:Master），定数 | 难度档位（Advanced/Expert/Master/Ultima 等），定数 |
| 评分体系 | V-ARCHIVE RATING（取 best 50 谱面按 V 值加权）| Rating = b50（旧曲 best 35 + 新曲 best 15）| Rating = b30 + 新曲 b20 |
| 成绩来源 | V-ARCHIVE 网站数据（无官方 API，社区解析）或手动录入 | 水鱼/落雪查分器 API | 水鱼/落雪查分器 API |
| 关键元数据 | 键位数、note 数、等级、曲包归属 | 定数、版本（国服进度落后于日服，需按国服世代维护）| 定数、版本 |

**重要**：三款游戏的评分都只需要「谱面定数 + 分数」即可在本地重算，查分器 API 只是数据管道。所以 Rating 计算全部放在自己服务端做（`packages/core`），不要依赖查分器的返回值——这样推分建议、理论值、历史曲线等功能才能自由实现，也避免配额浪费。

## 3. 数据源现状与选型（已查证）

### 水鱼查分器（Diving-Fish，maimai + chunithm）
- 基础地址：`https://www.diving-fish.com/api/{maimaidxprober|chunithmprober}/`
- 认证方式 5 种，其中 **Developer-Token 已废弃，2026-10-01 起一律返回 410**。所以新项目**直接按 OAuth（Bearer access token）设计**，这是目前唯一开放申请的第三方接入方式，配额按自然日计算，超限返回 429。
- 免验证端点：`POST /query/player`（b50 / b30+n20）、`GET /music_data`（全量曲库，支持 ETag 缓存）、`GET /chart_stats`、`GET /rating_ranking`、封面图 `https://www.diving-fish.com/covers/{id}.png`。
- 带授权端点：`GET /player/records`（完整成绩，支持 `?level_index=`、`?ds=13.5..` 等服务端过滤）、`POST /player/plate` 等。
- 官方文档：https://maimai.diving-fish.com/manual/docs/developer/zh-api-document/

### 落雪咖啡屋（Lxns，maimai + chunithm 双覆盖）
- 文档站：https://maimai.lxns.net/docs （舞萌 DX 与中二节奏各有独立 API 文档）
- 提供 OAuth 接入、开发者入驻流程和服务条款；曲库/谱面/玩家成绩/牌子进度均可查。
- 作为水鱼的**互备数据源**：任一家故障或配额耗尽时可切换/合并。

### V-ARCHIVE（DJMAX）
- **无官方文档，但存在一套被社区长期消费的稳定 JSON 接口**（无鉴权）。已通过 DJMAX_HoshinoBot → 其上游 `SoreHait/djmax_bests_generate`（两者均 MIT）源码查证，实际端点共 5 个：
  - `GET /api/v2/archive/{username}/button/{bmode}?{query}` — 玩家成绩。查询参数：`newTab`（旧/新曲）、`sort=djpower|score`、`order=desc`、`limit`、`pattern=SC` 或 `NM,HD,MX`、`levelMin/levelMax`、`dlc={dlcCode}`。响应含 `nickname/button/records[]`，每条 record 有 `title(=songid)/name/dlcCode/pattern/level/floorName/score/maxCombo/djpower`，**且响应里还带 `rating`、`updatedAt` 字段**（可用 updatedAt 做增量同步）。
  - `GET /db/v2/songs.json` — 全量曲库：`{title(songid)/name/dlcCode/newTab/patterns:{"4B|5B|6B|8B":{NM,HD,MX,SC:{level,floorName}}}}`，可直接作为 `packages/data` 的 djmax 种子数据。
  - `GET /db/dlcs.json` — 曲包列表（dlcCode/dlcName）。
  - `GET /api/v2/archive/DEV/djClass/{bmode}` — 特殊用户名 `DEV`，返回每键位的理论满 DJPower（`maxDjPower`），是总评归一化常数。
  - `GET /s3/images/jackets/{songid}.jpg` — 曲绘。
- **DJMAX 评分公式已查证**（`util.py`）：系数 `diff_coeff`（SC：≤8 时 diff+22，>8 时 (diff-8)×2+30；非 SC：diff×2），PP 理论值 `coeff×2.22+2.31`；b100 = 旧曲 top70 + 新曲 top30（按 djpower 排序，仅计入 score≥90 的记录）；总评 = Σdjpower × 10000/maxDjPower，上限 10000。
- 接入礼仪（照做）：带标识 User-Agent（参考 `sh-util-bot/gh:SoreHait/djmax_bests_generate`）、本地缓存曲库/曲绘、失败重试。
- 该接口仍属"非官方约定"，保持**可替换、可降级**：手动录入 + 批量导入作为兜底路径；曲库 JSON 转码为统一 schema 时保留 `external_ids.varchive = songid`。

### 成绩导入的兜底路径
两家查分器都支持用户从官方 NET 服务导出成绩再导入。提供「上传导出 JSON」的导入功能作为第三条路径：用户无需交出任何凭据，也降低对第三方 API 的依赖。

## 4. 领域模型与数据库设计

PostgreSQL，核心表（Drizzle/Prisma 均可实现）：

```sql
-- 用户与游戏身份解耦：一个账号可绑定多款游戏的外部身份
users            (id, name, email, password_hash, created_at)

-- 曲库：运行时 JSON 缓存（不进 git/镜像），成绩在 scores 表
songs            (id, game, title, artist, bpm, genre, version, image_url,
                  external_ids jsonb)          -- {"diving_fish": 1111, "lxns": 451, "varchive": "..."}
charts           (id, song_id, difficulty_key, -- 如 "MASTER" / "SC12" / "4K MX"
                  level_label,                 -- 如 "13+" / "SC12"
                  level_value numeric,         -- 定数 13.7，评分引擎的输入
                  is_new boolean,              -- 是否"新曲"（b15/b20 归类用）
                  note_count)

-- 玩家与成绩
player_profiles  (id, user_id, game, external_ids jsonb,
                  rating, last_synced_at)      -- rating 由引擎本地算
score_records    (id, user_id, chart_id,       -- 追加式流水
                  score numeric,               -- 统一存成各自满分制下的原值
                  badges jsonb,                -- {"fc": true, "fs": "fs+"} 游戏差异放这
                  rating numeric, played_at, source, raw jsonb)
current_scores   (user_id, chart_id, score_record_id)  -- 每人每谱面的当前最佳/最新，视图或实体表

rating_snapshots (id, user_id, game, rating, detail jsonb,  -- detail 存 b50 全量快照
                  created_at)                  -- 历史曲线的数据来源

-- 集成
linked_credentials (id, user_id, source,      -- "diving_fish_oauth" / "lxns_oauth"
                  game, encrypted_token, scopes, expires_at)
song_aliases     (song_id, source, alias)     -- 跨源曲名/ID 对齐（脏活，但必须做）
sync_jobs        (id, user_id, source, game, status, error, started_at)
```

关键取舍：
- **成绩统一存「原始分数」+ jsonb 放游戏特有字段**（fc/fs 徽章、max combo 等）。不尝试用一个字段统一三套满分制，展示和计算都交给各游戏的引擎/前端组件。
- **曲库元数据以 git 里的 JSON 为源**（对齐 V-ARCHIVE 的社区协作模式：数据更新走 PR，CI 做 JSON Schema 校验后自动导入 DB）。DB 不承担曲库编辑职能。
- `song_aliases` + `external_ids` 是因为水鱼、落雪、V-ARCHIVE 三方曲目 ID 与译名不一致，必须在入库阶段归一。
- 国服曲库版本进度落后日服，JSON 里带 `version` 字段并按国服世代组织，避免"剧透"未上线的曲目。

## 5. 适配器与评分引擎接口

```ts
// packages/adapters —— 每个数据源实现一次
interface SourceAdapter {
  sourceId: 'divingfish' | 'lxns' | 'varchive' | 'manual';
  supportedGames: GameId[];
  // OAuth 跳转/回调，或用户粘贴 token；manual 则没有这步
  buildAuthUrl?(userId: string): string;
  exchangeCallback?(query: URLSearchParams): Promise<LinkedCredential>;
  fetchProfile(cred: LinkedCredential, game: GameId): Promise<RawProfile>;
  fetchScores(cred: LinkedCredential, game: GameId, opts?: SyncOpts): Promise<RawScore[]>;
  fetchSongLibrary(game: GameId): Promise<SongLibraryItem[]>; // 带 ETag 缓存
}

// packages/core —— 纯函数，输入定数+分数，零 IO，全部单测覆盖
interface RatingEngine {
  game: GameId;
  ratingOf(chart: Chart, score: number): number;          // 单谱面 rating
  totalRating(scores: ScoreRecord[], charts: Chart[]): {  // b50 / b30+b20 / DJMAX b50
    rating: number; best: BestEntry[]; potential: BestEntry[]; // potential → 推分建议
  };
}
```

推分建议 = `potential` 里找出「当前成绩与下一档理论 rating 差值 × 完成难度」排序最高的若干谱面，全部本地可算。

## 6. 技术选型建议

| 层 | 选型 | 理由 |
|---|---|---|
| Monorepo | Bun workspaces（包管理 + 脚本/测试运行器） | 单一工具链，零配置 TS；worker 直接以 Bun 为运行时；核心类型/引擎/适配器前后端共用 |
| 前端框架 | SvelteKit（Svelte 5）+ Vite | 生态轻、样板代码少；曲库页 prerender 利于中文搜索引擎收录，查分页 SSR |
| UI 组件 | daisyUI（Tailwind 纯 class，最简单）；备选 shadcn-svelte | 站点读多写少，daisyUI 够用且换肤容易；需要无障碍交互组件（弹窗/下拉）时引入 shadcn-svelte |
| 图表 | ECharts | 中文文档、性能好、框架无关，rating 曲线/分布图直接用 |
| 后端 API | SvelteKit server endpoints（前后端同框架） | 减少一个独立服务；`packages/core`、`packages/adapters` 纯 TS 可直接复用 |
| 任务队列 | BullMQ + Redis（apps/worker 独立进程） | 成绩同步、曲库更新、快照定时任务 |
| ORM/DB | Drizzle + PostgreSQL | schema 即代码，jsonb 支持好 |
| 数据校验 | Zod（JSON Schema 校验曲库 PR）| CI 里跑 |
| 部署 | 服务器（国内可达性优先）+ CDN 静态资源 | 面向国服玩家，海外部署需自测连通性 |

Monorepo 目录：

```
rhythm-vault/
├─ apps/
│  ├─ web/        # SvelteKit 站点（页面 + 服务端 API）
│  └─ worker/     # BullMQ 任务（同步/快照/曲库导入）
├─ packages/
│  ├─ core/       # 领域类型 + RatingEngine（纯 TS）
│  ├─ adapters/   # divingfish / lxns / varchive / manual
│  └─ data/       # 曲库 JSON（后续可拆成独立 git 仓库开放 PR）
└─ docs/
```

## 7. 安全与合规清单

1. **凭据最小化**：只存查分器 OAuth 的 access token（AES-GCM 加密落库），**绝不**接受/存储用户的官方 NET 账号密码或查分器账密；文档明确引导用户走 OAuth 授权。
2. **尊重上游配额**：水鱼 OAuth 按日配额（429），`music_data` 用 ETag/304；同步间隔限制（如手动刷新 ≥5 分钟一次），错误退避。
3. **用户协议与隐私政策**：说明数据来源、用户可随时解绑授权（OAuth 支持撤销）、成绩数据可见性默认设置。
4. **V-ARCHIVE 数据授权**：在使用其曲库/成绩数据前确认许可与署名方式，接口解析做成可快速替换的适配器并准备降级路径（手动录入）。
5. 上游接口变更监控：三家都是社区服务，适配器层加契约测试 + 故障告警。

## 8. 开放 API 网关（自建查分接口，Phase 1 已实现）

**动机**：QQ Bot 用户不需要在 Bot 侧对接水鱼/落雪的 OAuth，只需要在本站注册账号、在「查询账号」里绑定自己的平台 ID；Bot 拿用户在本站生成的 API Key 查询本站接口即可。第三方凭据只进本站一处，Bot 侧零凭据。

### 认证体系
- 注册/登录：用户名 + 密码（scrypt 加盐哈希，Bun/Node 内置），会话 Cookie 30 天（服务端仅存令牌哈希）。
- API Key：控制台生成，`rv_` 前缀，服务端只存 sha256，明文仅创建时展示一次，可随时吊销，记录 lastUsedAt。
- 开放接口鉴权：`Authorization: Bearer rv_…` → `authApiKey()` 解析身份。

### 数据源绑定（决定数据从哪同步，两条路径）
1. **公开绑定（零凭据，已实现并默认路径）**：用户填水鱼用户名 / V-ARCHIVE ID，本站调水鱼公开 `query/player`（b50/b30+n20）与 V-ARCHIVE 公开 records 接口。要求用户在水鱼侧同意用户协议并开放第三方查询，否则 403。
2. **OAuth 令牌绑定（增强路径，代码已就绪）**：水鱼强制 PKCE(S256)，落雪标准授权码；两家的 access token 均 15 分钟、refresh token 30 天且**强制轮换**——刷新必须串行化（进程内 inflight map）、新令牌先落库再使用；令牌 AES-256-GCM 加密落库（ENCRYPTION_KEY 派生密钥）。OAuth 应用凭据从 env 读取（`DIVING_FISH_*` / `LXNS_*`）。

### 查询账号（决定用什么 ID 能查到数据，与数据源绑定相互独立）
用户在控制台「查询账号」页登记对外检索别名（`query_identities` 表，当前支持 QQ 号）。登记后，任何持有效 API Key 的客户端都能用 `?qq=…` 查到该账号已同步的数据——这是 Bot 端按 QQ 号查分的机制：站点主把自己的 Bot 应用 Key 配在 Bot 里，终端用户只需各自在本站登记 QQ + 绑定数据源。查询账号为自声明登记（无归属验证），文档中已提示用户仅登记本人 ID；`?qq=` 解析不到时返回 404。

### 端点（均返回 `{data, fetchedAt, stale}` 包装 + 统一错误格式 `{error}`)
| 端点 | 说明 |
|---|---|
| `GET /api/v1/me` | 账号信息与可用端点 |
| `GET /api/v1/maimai/b50` | b50，rating 由本站引擎本地重算（maimaiRatingOf）|
| `GET /api/v1/maimai/song?chart=1145:3` | 单曲成绩（主键直查）|
| `GET /api/v1/chunithm/b30` | b30+新曲b20（Phase 2 接入本地引擎后重算）|
| `GET /api/v1/chunithm/song?chart=3:4` | 中二节奏单曲成绩 |
| `GET /api/v1/djmax/b100?button=4\|5\|6\|8` | b100 + 归一化总 DJPower |
| `GET /api/v1/djmax/song?song=42&pattern=SC&button=4` | DJMAX 单曲成绩 |

所有查询只读本地 `scores` 表，不实时打上游；响应带 `syncedAt` 表示数据新鲜度；账号从未同步时返回 404 + 引导文案。默认查询 Key 所属账号，加 `?qq=123456` 则按「查询账号」把请求路由到对应账号的数据。

### 存储设计（高性能方案）
查分数据不再存 jsonb 快照，改为**归一化行存储**：
- `scores` 表：主键 (user_id, game, chart_key)，每用户每游戏每谱面一行（当前最佳成绩），同步时按 500 行/批 upsert；附加索引 (user_id, game, rating) 支撑 b50/b100 的 top-N 查询。单曲查询 = 主键点查，b50/b100 = 索引范围扫描 + 内存排序，无 jsonb 解析开销。
- chart_key 约定：`maimaidx:{songId}:{难度序号}`、`chunithm:{songId}:{难度序号}`、`djmax:{键位}B:{songId}:{难度}`；`is_new` 列在写入时由曲库 JSON（`packages/data`）判定，b50 的 35/15 与 b100 的 70/30 新旧曲切分直接按列过滤。
- `rating_snapshots` 表：每次同步追加 (user, game, rating, detail)，天然积累 rating 历史曲线数据。

### 数据同步体系（手动 + 自动）
- **共享模块 `packages/sync`**：`syncUserPublic()` 按绑定身份拉取公开数据（水鱼 b50/b30、V-ARCHIVE 四键位全成绩）→ 归一化为成绩行 → 批量 upsert → 追加 rating 快照；请求间留间隔（上游礼仪）。
- **手动同步**：控制台「立即同步」按钮 → `runManualSync()` = 公开同步 + OAuth 增强（已授权水鱼者拉 maimai/chuni 完整成绩入库，单曲查询因此覆盖全部谱面）。
- **自动同步**：`apps/worker` 守护进程（`bun run worker`），每 10 分钟扫描一轮，数据超过 6 小时的账号自动公开同步（账号间 5 秒退避）。BullMQ/Redis 待规模需要时引入。

### OAuth 过期处理
水鱼/落雪 access token 15 分钟、refresh token 30 天且强制轮换。刷新失败（令牌链作废）时：置位 `linked_accounts.needs_reauth` 并向调用方返回明确的"请重新授权"错误；控制台「查询账号」页对应条目显示"授权已过期"徽标，点击 OAuth 按钮重新授权即自动清除标记。手动同步遇到过期授权时跳过 OAuth 部分，公开同步照常完成。

### 开发者平台
控制台「开发者」页：创建应用（`apps` 表）→ 应用自带 API Key（`api_keys.app_id` 关联，明文仅创建时展示），删除应用级联吊销 Key。Bot 等客户端用应用 Key 调用上述全部 `/api/v1/*` 端点（查询的是 Key 所属账号绑定的数据）；个人 Key 继续可用。

### 管理面板
`/register` `/login`、`/dashboard`（概览 + 手动同步）、`/dashboard/links`（数据源绑定/OAuth/过期提示）、`/dashboard/identities`（查询账号登记）、`/dashboard/keys`（个人 Key）、`/dashboard/developer`（开发者应用）、`/api-docs`（公开文档页）。

## 9. 分阶段路线图

- **Phase 0 — 地基（先做这个）**：monorepo 骨架、核心 schema、`packages/core` 的 maimai rating 引擎 + 单测、曲库 JSON 流水线（水鱼/落雪 `music_data` → 归一化 JSON → CI 校验 → 入库）。产出：可浏览的国服曲库 + 定数表静态站。
- **Phase 1 — 第一个查分闭环（✅ 2026-08 已完成）**：曲库同步（水鱼/落雪 music_data + V-ARCHIVE songs.json → packages/data，maimai 1379 曲/chuni 1557 曲/DJMAX 817 曲）；maimai rating 引擎 + DJMAX b100 引擎（含单测）；账号/API Key/会话；水鱼/落雪 OAuth 绑定（PKCE + 令牌轮换）；/api/v1 查分接口与控制台。剩余：chuni 本地评分引擎（当前透传）、rating 历史曲线页。
- **Phase 2 — 补齐三游（✅ 2026-08 已完成）**：chuni 本地评分引擎（`chuniRatingOf`：定数+加成制，公式查证自水鱼计算器；总评 = b30+b20 共 50 谱面均值；国服新曲判定 = 落雪公共曲库 version 字段，水鱼曲库中出现的最高版本即国服当前版本）→ b30 接口已本地重算。DJMAX 手动录入待做。
- **Phase 3 — 查分周边（✅ 基本完成）**：✅ 站内查分页（三游 + rating 历史曲线 + 曲绘）、✅ 曲库浏览/定数表 + 曲目详情页（谱面定数 + 登录用户本人成绩 + 曲绘；曲绘直链水鱼/落雪 assets/V-ARCHIVE S3）、✅ maimai 推分建议（API + 页面）、✅ 完成度进度（maimai 按版本/等级、djmax 按曲包、chuni 按等级；API + 页面；maimai 版本数据用落雪按标题联接，两家 ID 体系不同）、✅ 工具箱（三游计算器客户端直用 core 引擎、随机选曲公开 API）、✅ API 限流 + 用量计数、✅ 统一错误页。待做：成绩分享图、玩家对比、rating 排行榜。QQ Bot 插件由使用者自行开发，通过开放 API 接入。
- **Phase 4 — 交付与社区化（✅ 2026-08 完成主体）**：✅ 统一 SiteNav/SiteFooter（全部页面导航一致、登录态联动）、✅ 首页重做（曲库统计/功能入口/登录态 CTA）、✅ rating 排行榜（`/ranking`，仅显示已登记「查询账号」的用户，自声明公开）、✅ Dockerfile + 部署文档（docs/deploy.md，RV_DATA_DIR 支持容器化曲库）。待做：成绩分享图、玩家对比。QQ Bot 插件由使用者自行开发，通过开放 API 接入。
