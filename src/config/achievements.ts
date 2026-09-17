import type { Interaction, Person, Quest, AchievementRecord } from '@/db/types';

export interface AchievementContext {
  persons: Person[];
  interactions: Interaction[];
  quests: Quest[];
  unlocked: AchievementRecord[];
  now: Date;
}

export interface AchievementConfig {
  id: string;
  title: string;
  description: string;
  /** 隐藏成就：达成前不显示 */
  hidden?: boolean;
  check: (ctx: AchievementContext) => boolean;
}

const real = (ctx: AchievementContext) => ctx.persons.filter((p) => !p.isMe);
const gifts = (ctx: AchievementContext) => ctx.interactions.filter((i) => i.type === 'gift');
const hearts = (p: Person) => Math.floor(p.affection / 250);

/** 连续完成任务的天数（按 resolvedAt 的本地日期去重） */
export function doneStreak(quests: Quest[], now: Date): number {
  const days = new Set(
    quests
      .filter((q) => q.status === 'done' && q.resolvedAt)
      .map((q) => {
        const d = new Date(q.resolvedAt!);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      }),
  );
  let streak = 0;
  const cur = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (;;) {
    const key = `${cur.getFullYear()}-${cur.getMonth()}-${cur.getDate()}`;
    if (!days.has(key)) break;
    streak++;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}

export const ACHIEVEMENTS: AchievementConfig[] = [
  { id: 'first_person', title: '第一位村民', description: '认识第一个人', check: (c) => real(c).length >= 1 },
  { id: 'five_persons', title: '小村落', description: '村里住进 5 个人', check: (c) => real(c).length >= 5 },
  { id: 'first_gift', title: '首次送礼', description: '送出第一份礼物', check: (c) => gifts(c).length >= 1 },
  { id: 'twenty_gifts', title: '送礼达人', description: '送出 20 份礼物', check: (c) => gifts(c).length >= 20 },
  { id: 'first_note', title: '第一页笔记', description: '记下第一条笔记', check: (c) => real(c).some((p) => p.notes.length > 0) },
  { id: 'ten_birthdays', title: '生日记事本', description: '记住 10 个人的生日', check: (c) => real(c).filter((p) => p.birth).length >= 10 },
  { id: 'thirty_prefs', title: '知根知底', description: '累计记下 30 条喜好', check: (c) => real(c).reduce((n, p) => n + p.preferences.filter((x) => x.source !== 'fortune').length, 0) >= 30 },
  { id: 'five_hearts', title: '老朋友', description: '有人到达 5 颗心', check: (c) => real(c).some((p) => hearts(p) >= 5) },
  { id: 'full_hearts', title: '挚友殿堂', description: '有人满心', check: (c) => real(c).some((p) => hearts(p) >= 10) },
  { id: 'streak_7', title: '七日不辍', description: '连续 7 天完成任务', check: (c) => doneStreak(c.quests, c.now) >= 7 },
  { id: 'fifty_interactions', title: '常来常往', description: '累计记录 50 次互动', check: (c) => c.interactions.filter((i) => i.type !== 'relationChange').length >= 50 },
  // ---- 隐藏成就 ----
  { id: 'hidden_hate_gift', title: '你在想什么？', description: '送出了一份 TA 最讨厌的礼物', hidden: true, check: (c) => gifts(c).some((g) => g.gift?.tier === 'hate') },
  {
    id: 'hidden_birthday_love',
    title: '生日惊喜',
    description: '在 TA 生日当天送出最爱的礼物',
    hidden: true,
    check: (c) => gifts(c).some((g) => g.gift?.tier === 'love' && g.reason?.includes('生日')),
  },
  { id: 'hidden_night_owl', title: '夜猫子', description: '在凌晨两点到五点之间记录互动', hidden: true, check: (c) => c.interactions.some((i) => { const h = new Date(i.createdAt).getHours(); return h >= 2 && h < 5; }) },
  {
    id: 'hidden_busy_day',
    title: '社交达人',
    description: '同一天记录 5 次互动',
    hidden: true,
    check: (c) => {
      const byDay = new Map<string, number>();
      for (const i of c.interactions) {
        if (i.type === 'relationChange') continue;
        const d = new Date(i.at);
        const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        byDay.set(k, (byDay.get(k) ?? 0) + 1);
      }
      return [...byDay.values()].some((n) => n >= 5);
    },
  },
  { id: 'hidden_encyclopedia', title: '活百科', description: '一个人的喜好超过 10 条', hidden: true, check: (c) => real(c).some((p) => p.preferences.filter((x) => x.source !== 'fortune').length > 10) },
];
