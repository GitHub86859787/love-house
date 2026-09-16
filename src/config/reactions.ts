/** 喜好五档：仿原作反应语气，文案可改 */
export type PreferenceTier = 'love' | 'like' | 'neutral' | 'dislike' | 'hate';

export interface TierConfig {
  label: string;
  /** 档位图标（文字表示） */
  icon: string;
  /** 送礼时对方的反应台词 */
  reaction: string;
  color: string;
}

export const TIERS: Record<PreferenceTier, TierConfig> = {
  love: { label: '最爱', icon: '❤️❤️', reaction: '这是我最喜欢的东西！', color: '#e6323c' },
  like: { label: '喜欢', icon: '❤️', reaction: '谢谢，我很喜欢。', color: '#e0883a' },
  neutral: { label: '一般', icon: '⚪', reaction: '哦，谢谢。', color: '#7a5a3a' },
  dislike: { label: '讨厌', icon: '✖️', reaction: '呃……好吧。', color: '#5d7fa3' },
  hate: { label: '最讨厌', icon: '✖️✖️', reaction: '你在想什么？', color: '#3b2412' },
};

export const TIER_ORDER: PreferenceTier[] = ['love', 'like', 'neutral', 'dislike', 'hate'];

export type PreferenceCategory = 'food' | 'item' | 'activity' | 'topic' | 'personType' | 'other';

export const CATEGORIES: Record<PreferenceCategory, string> = {
  food: '食物',
  item: '物品',
  activity: '活动',
  topic: '话题',
  personType: '人的类型',
  other: '其他',
};
