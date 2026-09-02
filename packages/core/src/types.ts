export type GameId = 'djmax' | 'maimai_dx' | 'chunithm';

/**
 * 归一化谱面：三款游戏共用。
 * 曲库 JSON（packages/data）与此结构对应，difficultyKey 由各游戏适配器负责映射。
 */
export interface Chart {
	songId: string;
	/** 难度键，如 "MASTER" / "SC12" / "4K MX" */
	difficultyKey: string;
	/** 展示用等级，如 "13+" / "14" */
	levelLabel: string;
	/** 内部定数，评分引擎的输入 */
	levelValue: number;
	/** 是否当前版本"新曲"（maimai b15 / chuni b20 归类依据） */
	isNew: boolean;
	/** DJMAX：社区서열표定数（V-ARCHIVE floorName） */
	floorName?: string;
}
