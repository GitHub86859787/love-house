import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { RELATIONS, type RelationType } from '@/config/relations';

export interface Settings {
  /** 每周送礼上限规则 */
  weeklyGiftLimitEnabled: boolean;
  /** 全局衰减开关 */
  decayEnabled: boolean;
  /** 各关系类型的久未联系宽限天数 */
  graceDays: Record<RelationType, number>;
  /** 音效（阶段 3） */
  soundEnabled: boolean;
  /** 本命年提醒 */
  benmingnianReminder: boolean;
  /** 关闭的节日 id */
  disabledHolidays: string[];
  /** 首次使用日期 */
  firstUseDate?: string;
  /** AI 功能总开关 */
  aiEnabled: boolean;
  /** 笔记提取 / 摘要用的模型 */
  aiModel: string;
  /** 命书 / 合盘用的模型 */
  fortuneModel: string;
  /** 已看过占卜屋的自我介绍 */
  fortuneIntroSeen?: boolean;
  /** 新手教程已完成 / 跳过 */
  tutorialDone?: boolean;
  /** 最近一次导出备份时间 */
  lastExportAt?: number;
  /** 上次衰减结算的日期 */
  lastDecayRunDate?: string;
}

export const DEFAULT_SETTINGS: Settings = {
  weeklyGiftLimitEnabled: true,
  decayEnabled: true,
  graceDays: Object.fromEntries(Object.entries(RELATIONS).map(([k, v]) => [k, v.staleDays])) as Record<RelationType, number>,
  soundEnabled: true,
  benmingnianReminder: true,
  disabledHolidays: [],
  aiEnabled: false,
  aiModel: 'claude-sonnet-5',
  fortuneModel: 'claude-opus-5',
};

const KEY = 'app';

export async function getSettings(): Promise<Settings> {
  const rec = await db.settings.get(KEY);
  const stored = (rec?.value as Partial<Settings> | undefined) ?? {};
  return { ...DEFAULT_SETTINGS, ...stored, graceDays: { ...DEFAULT_SETTINGS.graceDays, ...(stored.graceDays ?? {}) } };
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  const cur = await getSettings();
  await db.settings.put({ key: KEY, value: { ...cur, ...patch } });
}

export function useSettings(): Settings {
  return useLiveQuery(() => getSettings(), [], DEFAULT_SETTINGS);
}
