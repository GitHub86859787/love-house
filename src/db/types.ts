import type { RelationType } from '@/config/relations';
import type { PreferenceCategory, PreferenceTier } from '@/config/reactions';
export type { PreferenceCategory, PreferenceTier };

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
  /** 特征：皱纹 / 胡子 / 雀斑 等（v2 新增，缺省 0 = 无） */
  feature?: number;
  featureColor?: string;
}

/** 生辰：月日必填，年、时、分可选；isLunar 表示过农历生日 */
export interface Birth {
  year?: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  isLunar?: boolean;
}

export type PreferenceSource = 'manual' | 'ai' | 'fortune';

export interface Preference {
  id: string;
  name: string;
  category: PreferenceCategory;
  tier: PreferenceTier;
  note?: string;
  source: PreferenceSource;
  createdAt: number;
}

export interface Note {
  id: string;
  text: string;
  createdAt: number;
  /** 已被 AI 整理过 */
  aiProcessedAt?: number;
}

/** 对方自己说的标签，如 MBTI / 血型 / 上升星座 */
export interface SelfTag {
  key: string;
  value: string;
}

/** 占卜师解读缓存（阶段 5 使用，这里先留字段） */
export interface FortuneCache {
  inputHash: string;
  createdAt: number;
  data: unknown;
  /** 被我标记为"不准"的推测文本 */
  rejected: string[];
  /** 准 / 不准 统计 */
  hits: number;
  misses: number;
  lastAskedAt?: number;
}

export interface Person {
  id: string;
  name: string;
  nickname?: string;
  relation: RelationType;
  /** 认识日期 YYYY-MM-DD */
  metOn?: string;
  birth?: Birth;
  avatar: AvatarConfig;
  tags: string[];
  selfTags: SelfTag[];
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
  /** 单独覆盖"久未联系宽限天数"（undefined 表示按关系类型默认） */
  staleDaysOverride?: number;
  /** 关闭这个人的久未联系提醒 */
  staleReminderMuted?: boolean;
  /** 关系类型最近一次变更时间（用于屋顶变色动画） */
  relationChangedAt?: number;
  /** 「我」的档案 */
  isMe?: boolean;
  fortune?: FortuneCache;
  aiSummary?: { text: string; tips: string[]; sourceHash: string; createdAt: number };
  createdAt: number;
  updatedAt: number;
}

/**
 * 互动类型：全部为正向互动。
 * receivedGift = 对方送我礼物（不加分）；relationChange = 系统自动记的关系变更事件（不加分）
 */
export type InteractionType = 'meet' | 'chat' | 'gift' | 'help' | 'activity' | 'festival' | 'other' | 'receivedGift' | 'relationChange';

export interface Interaction {
  id: string;
  personId: string;
  at: number;
  type: InteractionType;
  gift?: { name: string; tier: PreferenceTier; matchedPreferenceId?: string; price?: number };
  memo?: string;
  /** 系统算出的分 */
  computedPoints: number;
  /** 实际计入的分（我可改） */
  points: number;
  /** 计分说明 */
  reason?: string;
  createdAt: number;
}

export type QuestType = 'daily' | 'reminder' | 'milestone' | 'custom';
export type QuestStatus = 'open' | 'done' | 'skipped';
/** 任务来源规则 */
export type QuestKind = 'birthday' | 'stale' | 'profile' | 'milestone' | 'holiday' | 'benmingnian' | 'custom' | 'backup';

export interface Quest {
  id: string;
  type: QuestType;
  kind: QuestKind;
  /** 规则生成的稳定 key，用于去重 */
  ruleKey: string;
  personId?: string;
  title: string;
  description?: string;
  /** 截止 / 目标日期 YYYY-MM-DD */
  dueDate?: string;
  /** 从这天起显示 YYYY-MM-DD */
  showFrom?: string;
  status: QuestStatus;
  /** "跳过今天"：这天之前不显示 */
  snoozedUntil?: string;
  /** 数字越小越靠前 */
  priority: number;
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
