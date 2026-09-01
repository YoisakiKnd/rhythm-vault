# packages/data — 曲库数据（运行时拉取）

三款游戏曲库的本地缓存目录。JSON **不进 git、不进 Docker 镜像**：构建产物只含代码，数据由 `bun run sync:songs` 从上游写入本目录（生产挂 `RV_DATA_DIR`）。

## 文件

| 文件 | 游戏 | 数据来源 |
|---|---|---|
| `maimaidx.json` | 舞萌 DX 国服 | 水鱼 `music_data` 为主，落雪 `song/list` 补全缺失曲/谱 |
| `chunithm.json` | 中二节奏 国服 | 水鱼 `music_data` 为主，落雪 `song/list` 补全缺失曲/谱 |
| `djmax.json` | DJMAX RESPECT V | V-ARCHIVE `songs.json` + `dlcs.json` |
| `catalog-sources.json` | 舞萌/中二 | 水鱼独有 / 落雪独有曲目 ID，曲库页切换数据源用 |

## 格式

每个游戏一份对象（由 `packages/core` 的 `SongLibrarySchema` 校验），不是谱面数组：

```json
{
	"updatedAt": "2026-08-30T06:29:29.814Z",
	"source": "diving-fish+lxns",
	"songs": [{ "id": "maimaidx:8", "title": "True Love Song", "isNew": false }],
	"charts": [{
		"songId": "maimaidx:8",
		"difficultyKey": "MASTER",
		"levelLabel": "10",
		"levelValue": 10.0,
		"isNew": false
	}],
	"versions": [{ "code": 10000, "title": "maimai" }],
	"dlcs": [{ "dlcCode": "R", "dlcName": "RESPECT" }]
}
```

- `songId` / `songs[].id` 采用 `游戏:源ID`（舞萌为 `maimaidx:`）
- `levelValue` 为定数（评分引擎输入）
- 中二 WORLD'S END 谱带 `originId`（落雪 `origin_id`），曲绘路由据此取图
- `isNew` 按国服当前世代：舞萌用水鱼 `is_new` / 落雪谱面级 version，中二用 song 级 version

## 更新流程

`bun run sync:songs` 拉取上游 → Zod 校验 → 临时文件 `rename` 原子写入。新曲库条数低于旧文件 80% 时中止并告警。Docker 见 [docs/deploy.md](../../docs/deploy.md)：`sync-songs` 服务写入共享 volume。
