import { z } from 'zod';

export const SongSchema = z.object({
	/** `游戏:源ID`，如 "maimaidx:8" / "chunithm:3" / "djmax:42" */
	id: z.string(),
	title: z.string(),
	artist: z.string().optional(),
	genre: z.string().optional(),
	version: z.string().optional(),
	/** 曲目首次出现版本码（落雪数据源，进度统计用） */
	versionCode: z.number().optional(),
	dlcCode: z.string().optional(),
	isNew: z.boolean().default(false)
});

export const ChartSchema = z.object({
	songId: z.string(),
	/** 如 "MASTER" / "REMASTER" / "ULTIMA" / "4B SC" */
	difficultyKey: z.string(),
	levelLabel: z.string(),
	/** 内部定数或理论值（评分引擎输入） */
	levelValue: z.number(),
	isNew: z.boolean().default(false),
	/** DJMAX：V-ARCHIVE 서열표 난이도 상수，如 "14.2"；低难度常缺 */
	floorName: z.string().optional(),
	/** 中二 WORLD'S END 曲绘用落雪 origin_id */
	originId: z.number().optional()
});

export const SongLibrarySchema = z.object({
	updatedAt: z.string(),
	source: z.string(),
	songs: z.array(SongSchema),
	charts: z.array(ChartSchema),
	/** maimai：版本码→名称对照（落雪数据源） */
	versions: z.array(z.object({ code: z.number(), title: z.string() })).optional(),
	/** djmax：曲包对照 */
	dlcs: z.array(z.object({ dlcCode: z.string(), dlcName: z.string() })).optional()
});

export type Song = z.infer<typeof SongSchema>;
export type SongLibrary = z.infer<typeof SongLibrarySchema>;
