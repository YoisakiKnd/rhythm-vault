import { sql } from 'drizzle-orm';
import {
	boolean,
	doublePrecision,
	index,
	integer,
	jsonb,
	pgTable,
	primaryKey,
	serial,
	text,
	timestamp,
	uniqueIndex,
	varchar
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
	id: serial('id').primaryKey(),
	/** 3–24 位字母数字下划线 */
	username: varchar('username', { length: 32 }).notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	/** 档案页 / 排行榜 / 对比页是否对访客公开（与 Bot 查询账号独立） */
	profilePublic: boolean('profile_public').notNull().default(false),
	/** 是否允许持 bot scope Key 的客户端用已验证 QQ 查询本账号成绩 */
	botQueryPublic: boolean('bot_query_public').notNull().default(false),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const sessions = pgTable(
	'sessions',
	{
		/** 随机会话令牌的 sha256，明文只存于用户 Cookie */
		id: text('id').primaryKey(),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('sessions_user_idx').on(t.userId)]
);

/** 开发者应用：Bot 等第三方客户端以应用身份调用开放 API */
export const apps = pgTable(
	'apps',
	{
		id: serial('id').primaryKey(),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 64 }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('apps_user_idx').on(t.userId)]
);

export const apiKeys = pgTable(
	'api_keys',
	{
		id: serial('id').primaryKey(),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		/** 应用专属 Key 记录归属应用；个人 Key 为 null */
		appId: integer('app_id').references(() => apps.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 64 }).notNull(),
		/** 明文 key 前缀（rv_ + 8 位），用于列表展示识别 */
		prefix: varchar('prefix', { length: 12 }).notNull(),
		keyHash: text('key_hash').notNull().unique(),
		/** 累计请求数（每次通过鉴权 +1） */
		requestCount: integer('request_count').notNull().default(0),
		/** self：只能查 Key 主人自己；bot：可按 ?qq= 查已验证且开启 Bot 查询的用户 */
		scope: varchar('scope', { length: 16 }).notNull().default('self'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
		revokedAt: timestamp('revoked_at', { withTimezone: true })
	},
	(t) => [index('api_keys_user_idx').on(t.userId), index('api_keys_app_id_idx').on(t.appId)]
);

/**
 * 归一化成绩存储：每用户 × 每游戏 × 每谱面 × 每渠道一行。
 * 水鱼 / 落雪分开存，查分按渠道切换；排行榜快照再按谱面择优合并。
 */
export const scores = pgTable(
	'scores',
	{
		userId: integer('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		/** maimai_dx | chunithm | djmax */
		game: varchar('game', { length: 16 }).notNull(),
		/** maimaidx:1145:3 · chunithm:3:4 · djmax:4B:42:SC */
		chartKey: varchar('chart_key', { length: 48 }).notNull(),
		/** divingfish | lxns | varchive */
		source: varchar('source', { length: 16 }).notNull(),
		/** 各游戏原分：maimai 达成率 / chuni 分数 / djmax V 值 */
		score: doublePrecision('score'),
		/** maimai: 单曲 rating；chuni: 本地 chuniRatingOf；djmax: 未归一化 djpower */
		rating: doublePrecision('rating'),
		/** fc/fs/maxCombo 等游戏特有标记 */
		badges: jsonb('badges'),
		/** 是否当前版本新曲（b15/b20、b100 新旧曲区分） */
		isNew: boolean('is_new').notNull().default(false),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		primaryKey({ columns: [t.userId, t.game, t.chartKey, t.source] }),
		index('scores_user_game_updated_idx').on(t.userId, t.game, t.updatedAt),
		index('scores_user_game_source_rating_idx').on(t.userId, t.game, t.source, t.rating)
	]
);

/** rating 历史快照：每次同步后追加一条，供曲线/成长功能使用 */
export const ratingSnapshots = pgTable(
	'rating_snapshots',
	{
		id: serial('id').primaryKey(),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		game: varchar('game', { length: 16 }).notNull(),
		rating: doublePrecision('rating').notNull(),
		detail: jsonb('detail'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		index('rating_snapshot_user_game_idx').on(t.userId, t.game, t.createdAt),
		index('rating_snapshot_game_rating_idx').on(t.game, t.rating)
	]
);

/**
 * 第三方账号绑定。externalId 是公开绑定（水鱼用户名 / 落雪好友码 / V-ARCHIVE ID），
 * OAuth 令牌为可选增强（完整成绩同步），以 AES-256-GCM 加密落库。
 */
export const linkedAccounts = pgTable(
	'linked_accounts',
	{
		id: serial('id').primaryKey(),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		/** divingfish | lxns | varchive */
		source: varchar('source', { length: 16 }).notNull(),
		externalId: text('external_id'),
		accessTokenEnc: text('access_token_enc'),
		refreshTokenEnc: text('refresh_token_enc'),
		tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
		scope: text('scope'),
		/** refresh 失败（令牌链作废）时置位，提示用户重新授权 */
		needsReauth: boolean('needs_reauth').notNull().default(false),
		/** OAuth userinfo / 上游确认后为 true；手填 ID 为 false */
		externalVerified: boolean('external_verified').notNull().default(false),
		/** 各游戏最近一次成功同步写入的条数，如 { maimai_dx: 50, chunithm: 0 } */
		syncStats: jsonb('sync_stats').$type<Record<string, number>>().notNull().default({}),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [uniqueIndex('linked_user_source_idx').on(t.userId, t.source)]
);

/**
 * 查询账号：用户对外登记的 ID（如 QQ 号），作为本站数据的查询别名。
 * 与「数据源绑定」（linked_accounts，决定数据从哪同步）是两个独立概念：
 * 查询账号只决定"别人用什么 ID 能查到这份已同步的数据"。
 */
export const queryIdentities = pgTable(
	'query_identities',
	{
		id: serial('id').primaryKey(),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		/** 目前为 qq，预留扩展（如 maimai 用户名等） */
		platform: varchar('platform', { length: 16 }).notNull(),
		platformUserId: varchar('platform_user_id', { length: 32 }).notNull(),
		/** 通过 Bot 验证码或站长手动确认后为 true；未验证不占 QQ 名额 */
		verified: boolean('verified').notNull().default(false),
		verifyCode: varchar('verify_code', { length: 16 }),
		verifyExpiresAt: timestamp('verify_expires_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		uniqueIndex('query_identity_platform_user_idx')
			.on(t.platform, t.platformUserId)
			.where(sql`${t.verified}`),
		uniqueIndex('query_identity_user_platform_idx').on(t.userId, t.platform, t.platformUserId),
		index('query_identity_user_idx').on(t.userId)
	]
);

/** 曲库同步游标（ETag 等），worker 使用 */
export const syncState = pgTable(
	'sync_state',
	{
		id: serial('id').primaryKey(),
		source: varchar('source', { length: 16 }).notNull(),
		game: varchar('game', { length: 16 }).notNull(),
		etag: text('etag'),
		lastSyncAt: timestamp('last_sync_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [uniqueIndex('sync_source_game_idx').on(t.source, t.game)]
);
