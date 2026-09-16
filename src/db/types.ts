import type { RelationType } from '@/config/relations';
import type { PreferenceCategory, PreferenceTier } from '@/config/reactions';

/** 像素头像配置：每个部件独立的形状索引 + 颜色 */
export interface AvatarConfig {
  face: number;
  skinColor: string;
  hair: number;
  hairColor: string;
  eyes: number;
  eyeColor: string;
  shirt: number;
  shirtColor: string;
  accessory: number;
  accessoryColor: string;
}

export interface Birthday {
  month: number;
  day: number;
  /** 年份可不填 */
  year?: number;
}

export interface Preference {
  id: string;
  name: string;
  category: PreferenceCategory;
  tier: PreferenceTier;
  note?: string;
  source: 'manual' | 'ai';
  createdAt: number;
}

export interface Note {
  id: string;
  text: string;
  createdAt: number;
}

export interface Person {
  id: string;
  name: string;
  nickname?: string;
  relation: RelationType;
  /** 认识日期 YYYY-MM-DD */
  metOn?: string;
  birthday?: Birthday;
  avatar: AvatarConfig;
  tags: string[];
  preferences: Preference[];
  /** 忌讳 / 雷区 */
  taboos: string[];
  notes: Note[];
  /** 8 心解锁：最近在烦什么 / 期待什么 */
  innerNote?: string;
  /** 好感度点数，0–2500 */
  affection: number;
  /** 已解锁的里程碑心数 */
  milestonesUnlocked: number[];
  /** 最后一次互动时间戳 */
  lastInteractionAt?: number;
  /** 上次衰减结算到的本地日期 YYYY-MM-DD */
  lastDecayDate?: string;
  /** 单独覆盖衰减开关（undefined 表示按关系类型默认） */
  decayOverride?: boolean;
  aiSummary?: { text: string; tips: string[]; sourceHash: string; createdAt: number };
  createdAt: number;
  updatedAt: number;
}

export type InteractionType = 'meet' | 'chat' | 'gift' | 'help' | 'activity' | 'festival' | 'other';

export interface Interaction {
  id: string;
  personId: string;
  at: number;
  type: InteractionType;
  gift?: { name: string; tier: PreferenceTier; matchedPreferenceId?: string };
  memo?: string;
  /** 系统算出的分 */
  computedPoints: number;
  /** 实际计入的分（我可改） */
  points: number;
  /** 计分说明 */
  reason?: string;
  createdAt: number;
}

export type QuestType = 'daily' | 'reminder' | 'milestone';
export type QuestStatus = 'open' | 'done' | 'skipped';

export interface Quest {
  id: string;
  type: QuestType;
  /** 规则生成的稳定 key，用于去重 */
  ruleKey: string;
  personId?: string;
  title: string;
  description?: string;
  dueDate?: string;
  status: QuestStatus;
  rewardPoints: number;
  createdAt: number;
  resolvedAt?: number;
}

export interface AchievementRecord {
  id: string;
  unlockedAt: number;
}

export interface SettingRecord {
  key: string;
  value: unknown;
}
