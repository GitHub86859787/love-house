import type { InteractionType } from '@/db/types';
import type { IconName } from '@/pixel/sprites/icons';

export interface InteractionConfig {
  label: string;
  icon: IconName;
  /** 在"记一笔"里可选 */
  selectable: boolean;
  hint?: string;
}

export const INTERACTIONS: Record<InteractionType, InteractionConfig> = {
  meet: { label: '见面', icon: 'village', selectable: true },
  chat: { label: '聊天', icon: 'chat', selectable: true, hint: '一天只算一次' },
  gift: { label: '送礼', icon: 'gift', selectable: true, hint: '按 TA 的喜好档位计分' },
  help: { label: '帮忙', icon: 'hand', selectable: true },
  activity: { label: '一起活动', icon: 'star', selectable: true },
  festival: { label: '节日问候', icon: 'cake', selectable: true },
  other: { label: '其他', icon: 'plus', selectable: true },
  receivedGift: { label: '对方送礼', icon: 'giftIn', selectable: true, hint: '记下来，不加分' },
  relationChange: { label: '关系变更', icon: 'edit', selectable: false },
};

export const SELECTABLE_TYPES = (Object.keys(INTERACTIONS) as InteractionType[]).filter((t) => INTERACTIONS[t].selectable);
