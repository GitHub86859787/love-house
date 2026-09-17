import type { Interaction, Person } from '@/db/types';

export interface UnlockItem {
  key: string;
  label: string;
  done: boolean;
}

/** 人物卡解锁度 9 项 */
export function unlockItems(p: Person, interactions: Interaction[]): UnlockItem[] {
  const confirmed = p.preferences.filter((x) => x.source !== 'fortune');
  return [
    { key: 'birthday', label: '知道生日', done: Boolean(p.birth) },
    { key: 'prefs', label: '记了 3 条以上喜好', done: confirmed.length >= 3 },
    { key: 'taboo', label: '知道雷区', done: p.taboos.length > 0 },
    { key: 'tags', label: '有性格标签', done: p.tags.length > 0 },
    { key: 'hearts', label: '到达 5 颗心', done: p.affection >= 1250 },
    { key: 'gift', label: '送过礼', done: interactions.some((i) => i.personId === p.id && i.type === 'gift') },
    { key: 'birthYear', label: '知道出生年份', done: Boolean(p.birth?.year) },
    { key: 'fortune', label: '有占卜解读', done: Boolean(p.fortune?.data) },
    { key: 'personType', label: '知道 TA 讨厌什么样的人', done: confirmed.some((x) => x.category === 'personType' && (x.tier === 'dislike' || x.tier === 'hate')) },
  ];
}

export function unlockLevel(p: Person, interactions: Interaction[]): number {
  return unlockItems(p, interactions).filter((x) => x.done).length;
}

export const UNLOCK_MAX = 9;
