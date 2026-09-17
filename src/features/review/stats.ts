/**
 * 年度回顾统计：纯函数，从人物 / 互动 / 任务 / 成就算出一年的数字。
 */
import type { AchievementRecord, Interaction, Person, Quest } from '@/db/types';
import type { InteractionType } from '@/db/types';
import { INTERACTIONS } from '@/config/interactions';
import type { FortuneBook } from '@/fortune/book';

export interface YearStats {
  year: number;
  newPersons: Person[];
  interactions: number;
  byType: { type: InteractionType; label: string; count: number }[];
  gifts: number;
  pointsGained: number;
  heartsGained: number;
  topPersons: { person: Person; count: number }[];
  topGift?: { name: string; count: number };
  fullHearts: Person[];
  notes: number;
  bookChapters: number;
  achievements: number;
  questsDone: number;
  busiestMonth?: { month: number; count: number };
  /** 一句话 */
  line: string;
}

function inYear(ts: number, year: number): boolean {
  return new Date(ts).getFullYear() === year;
}

export function yearStats(persons: Person[], interactions: Interaction[], quests: Quest[], achievements: AchievementRecord[], year: number): YearStats {
  const real = persons.filter((p) => !p.isMe);
  const its = interactions.filter((i) => inYear(i.at, year) && i.type !== 'relationChange');
  const byTypeMap = new Map<InteractionType, number>();
  for (const i of its) byTypeMap.set(i.type, (byTypeMap.get(i.type) ?? 0) + 1);
  const byType = [...byTypeMap.entries()]
    .map(([type, count]) => ({ type, label: INTERACTIONS[type]?.label ?? type, count }))
    .sort((a, b) => b.count - a.count);
  const pointsGained = its.reduce((n, i) => n + Math.max(0, i.points), 0);

  const perPerson = new Map<string, number>();
  for (const i of its) perPerson.set(i.personId, (perPerson.get(i.personId) ?? 0) + 1);
  const topPersons = [...perPerson.entries()]
    .map(([id, count]) => ({ person: real.find((p) => p.id === id)!, count }))
    .filter((x) => x.person)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const giftCount = new Map<string, number>();
  for (const i of its) if (i.type === 'gift' && i.gift) giftCount.set(i.gift.name, (giftCount.get(i.gift.name) ?? 0) + 1);
  const topGiftEntry = [...giftCount.entries()].sort((a, b) => b[1] - a[1])[0];

  const months = new Map<number, number>();
  for (const i of its) {
    const m = new Date(i.at).getMonth() + 1;
    months.set(m, (months.get(m) ?? 0) + 1);
  }
  const busiest = [...months.entries()].sort((a, b) => b[1] - a[1])[0];

  let notes = 0;
  let bookChapters = 0;
  for (const p of persons) {
    notes += p.notes.filter((n) => inYear(n.createdAt, year)).length;
    const book = (p.fortune?.data as { book?: FortuneBook } | undefined)?.book;
    if (book) {
      for (const ch of Object.values(book.chapters)) if (ch) bookChapters += ch.rounds.filter((r) => inYear(r.createdAt, year)).length;
      if (book.guide && inYear(book.guide.updatedAt, year)) bookChapters++;
    }
  }

  const newPersons = real.filter((p) => inYear(p.createdAt, year));
  const fullHearts = real.filter((p) => p.affection >= 2500);
  const stats: YearStats = {
    year,
    newPersons,
    interactions: its.length,
    byType,
    gifts: its.filter((i) => i.type === 'gift').length,
    pointsGained,
    heartsGained: Math.round((pointsGained / 250) * 10) / 10,
    topPersons,
    topGift: topGiftEntry ? { name: topGiftEntry[0], count: topGiftEntry[1] } : undefined,
    fullHearts,
    notes,
    bookChapters,
    achievements: achievements.filter((a) => inYear(a.unlockedAt, year)).length,
    questsDone: quests.filter((q) => q.status === 'done' && q.resolvedAt && inYear(q.resolvedAt, year)).length,
    busiestMonth: busiest ? { month: busiest[0], count: busiest[1] } : undefined,
    line: '',
  };
  stats.line = summaryLine(stats);
  return stats;
}

function summaryLine(s: YearStats): string {
  if (s.interactions === 0 && s.newPersons.length === 0) return '这一年村子还很安静，明年多走动走动。';
  if (s.fullHearts.length > 0) return `有 ${s.fullHearts.length} 个人走进了挚友殿堂，这一年没白过。`;
  if (s.topPersons[0] && s.topPersons[0].count >= 10) return `和 ${s.topPersons[0].person.nickname || s.topPersons[0].person.name} 见得最多，感情是一笔一笔记出来的。`;
  if (s.gifts >= 5) return `送出去 ${s.gifts} 份礼物，心意都记在这儿了。`;
  if (s.newPersons.length >= 3) return `认识了 ${s.newPersons.length} 位新村民，村子热闹起来了。`;
  return `记了 ${s.interactions} 笔，每一笔都是往来。`;
}

/** 可选的年份：从首次使用那年到今年 */
export function availableYears(firstUseDate: string | undefined, persons: Person[], now = new Date()): number[] {
  const cur = now.getFullYear();
  let first = cur;
  if (firstUseDate) first = Math.min(first, Number(firstUseDate.slice(0, 4)) || cur);
  for (const p of persons) first = Math.min(first, new Date(p.createdAt).getFullYear());
  const out: number[] = [];
  for (let y = cur; y >= first && out.length < 6; y--) out.push(y);
  return out;
}
