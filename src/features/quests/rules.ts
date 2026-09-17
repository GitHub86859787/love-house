/**
 * 任务板规则：纯函数，从当前数据生成"今天应该存在的任务"候选，
 * 以及判断已有任务是否已自动完成。不用 AI。
 */
import type { Interaction, Person, Quest, QuestKind } from '@/db/types';
import type { Settings } from '@/db/settings';
import { HOLIDAYS } from '@/config/holidays';
import { MILESTONES, type MilestoneQuestCheck } from '@/config/milestones';
import { RELATIONS } from '@/config/relations';
import { birthdayInYear, daysUntilBirthday, lunarToSolar } from '@/lib/birthday';
import { daysBetween, toDateKey } from '@/lib/date';
import { daysSinceContact, graceDaysOf, isStale, lastContactDate } from '@/features/scoring/decay';
import { Solar } from 'lunar-typescript';

export interface QuestCandidate {
  kind: QuestKind;
  ruleKey: string;
  personId?: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority: number;
  /** 判定自动完成 */
  check?: MilestoneQuestCheck;
}

const PRIORITY: Record<QuestKind, number> = {
  custom: 10,
  birthday: 20,
  benmingnian: 30,
  milestone: 40,
  holiday: 50,
  stale: 60,
  profile: 70,
  backup: 80,
};

function hearts(p: Person): number {
  return Math.floor(p.affection / 250);
}

export function generateCandidates(persons: Person[], settings: Settings, today = new Date()): QuestCandidate[] {
  const out: QuestCandidate[] = [];
  const year = today.getFullYear();
  const todayKey = toDateKey(today);
  const real = persons.filter((p) => !p.isMe);

  for (const p of real) {
    const name = p.nickname || p.name;

    // 生日：提前 7 / 3 / 当天
    if (p.birth) {
      const days = daysUntilBirthday(p.birth, today);
      const bYear = days === 0 || birthdayInYear(p.birth, year).getTime() >= new Date(year, today.getMonth(), today.getDate()).getTime() ? year : year + 1;
      const due = toDateKey(birthdayInYear(p.birth, bYear));
      const step = days === 0 ? 0 : days <= 3 ? 3 : days <= 7 ? 7 : -1;
      if (step >= 0) {
        const title = step === 0 ? `今天是 ${name} 的生日！` : `${name} 的生日还有 ${days} 天`;
        out.push({
          kind: 'birthday',
          ruleKey: `birthday:${p.id}:${bYear}:${step}`,
          personId: p.id,
          title,
          description: step === 0 ? '送礼 ×8，别忘了' : '想想送什么、约在哪里',
          dueDate: due,
          priority: PRIORITY.birthday - (step === 0 ? 5 : 0),
        });
      }

      // 本命年：进入本命年那一年（农历），从春节起显示 30 天
      if (settings.benmingnianReminder && p.birth.year) {
        const birthLunarYear = p.birth.isLunar
          ? p.birth.year
          : Solar.fromYmd(p.birth.year, p.birth.month, p.birth.day).getLunar().getYear();
        const lunarNow = Solar.fromYmd(today.getFullYear(), today.getMonth() + 1, today.getDate()).getLunar();
        const lunarYear = lunarNow.getYear();
        if ((lunarYear - birthLunarYear) % 12 === 0 && lunarYear !== birthLunarYear) {
          const springDay = lunarToSolar(lunarYear, 1, 1);
          const sinceSpring = daysBetween(springDay, today);
          if (sinceSpring >= 0 && sinceSpring <= 30) {
            out.push({
              kind: 'benmingnian',
              ruleKey: `benmingnian:${p.id}:${lunarYear}`,
              personId: p.id,
              title: `${name} 今年本命年`,
              description: '送点红色的东西吧',
              priority: PRIORITY.benmingnian,
            });
          }
        }
      }
    }

    // 久未联系：宽限期一到
    if (isStale(p, settings, today)) {
      out.push({
        kind: 'stale',
        ruleKey: `stale:${p.id}:${toDateKey(lastContactDate(p))}`,
        personId: p.id,
        title: `给 ${name} 发个消息`,
        description: `已经 ${daysSinceContact(p, today)} 天没联系了（宽限 ${graceDaysOf(p, settings)} 天）`,
        priority: PRIORITY.stale,
      });
    }

    // 资料补全：喜好少于 3 条
    const prefCount = p.preferences.filter((x) => x.source !== 'fortune').length;
    if (prefCount < 3) {
      out.push({
        kind: 'profile',
        ruleKey: `profile:prefs:${p.id}`,
        personId: p.id,
        title: `多了解一下 ${name} 喜欢什么`,
        description: `现在只记了 ${prefCount} 条喜好，凑到 3 条`,
        priority: PRIORITY.profile,
      });
    }

    // 里程碑任务：到达心数后解锁
    const h = hearts(p);
    for (const m of MILESTONES) {
      if (h < m.hearts) continue;
      m.unlocks.forEach((u, idx) => {
        out.push({
          kind: 'milestone',
          ruleKey: `milestone:${p.id}:${m.hearts}:${idx}`,
          personId: p.id,
          title: `${u.title}（${name}）`,
          description: u.description,
          priority: PRIORITY.milestone,
          check: u.check,
        });
      });
    }
  }

  // 节日：提前 N 天，只对适用关系类型有人时出
  for (const hcfg of HOLIDAYS) {
    if (settings.disabledHolidays?.includes(hcfg.id)) continue;
    const applicable = real.filter((p) => hcfg.relations === 'all' || hcfg.relations.includes(p.relation));
    if (applicable.length === 0) continue;
    for (const y of [year, year + 1]) {
      const date = hcfg.lunar ? lunarToSolar(y, hcfg.month, hcfg.day) : new Date(y, hcfg.month - 1, hcfg.day);
      const days = daysBetween(today, date);
      if (days < 0 || days > hcfg.daysBefore) continue;
      const names = applicable
        .slice(0, 3)
        .map((p) => p.nickname || p.name)
        .join('、');
      out.push({
        kind: 'holiday',
        ruleKey: `holiday:${hcfg.id}:${y}`,
        title: days === 0 ? `今天${hcfg.name}，说声${hcfg.greeting}` : `${hcfg.name}还有 ${days} 天`,
        description: `${applicable.length} 位村民：${names}${applicable.length > 3 ? ' 等' : ''}`,
        dueDate: toDateKey(date),
        priority: PRIORITY.holiday,
      });
      break;
    }
  }

  void todayKey;
  return out;
}

/** 里程碑任务的自动完成判定 */
export function milestoneCheckPassed(check: MilestoneQuestCheck, person: Person, interactions: Interaction[], unlockedAt: number): boolean {
  switch (check) {
    case 'hasBirthday':
      return Boolean(person.birth);
    case 'threeLoves':
      return person.preferences.filter((x) => x.source !== 'fortune' && x.tier === 'love').length >= 3;
    case 'hasTaboo':
      return person.taboos.length >= 1;
    case 'activityTogether':
      return interactions.some((i) => i.personId === person.id && i.type === 'activity' && i.at >= unlockedAt - 86400000);
    case 'innerNote':
      return Boolean(person.innerNote?.trim());
  }
}

/** 一条已存在的任务现在是否应自动完成 / 自动消失 */
export function autoResolve(
  q: Quest,
  candidates: QuestCandidate[],
  persons: Person[],
  interactions: Interaction[],
  today = new Date(),
): 'done' | 'gone' | null {
  const todayKey = toDateKey(today);
  if (q.kind === 'custom') {
    return q.dueDate && q.dueDate < todayKey ? 'gone' : null;
  }
  const still = candidates.find((c) => c.ruleKey === q.ruleKey);
  if (q.kind === 'milestone') {
    const p = persons.find((x) => x.id === q.personId);
    const cand = still;
    if (!p || !cand) return 'gone';
    if (cand.check && milestoneCheckPassed(cand.check, p, interactions, q.createdAt)) return 'done';
    return null;
  }
  if (q.kind === 'stale' || q.kind === 'profile') {
    // 条件消失 = 做到了
    return still ? null : 'done';
  }
  // 生日 / 节日 / 本命年：日期过了就消失
  if (!still) return 'gone';
  return null;
}

export const QUEST_KIND_LABEL: Record<QuestKind, string> = {
  birthday: '生日',
  stale: '联系',
  profile: '了解',
  milestone: '里程碑',
  holiday: '节日',
  benmingnian: '本命年',
  custom: '提醒',
  backup: '备份',
};

export function relationLabel(p: Person): string {
  return RELATIONS[p.relation].label;
}
