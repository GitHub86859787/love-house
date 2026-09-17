/**
 * 衰减（宽限制）：超过宽限天数后每天 -2，只掉到当前整心底部。
 * 纯函数 computeDecay + 每次打开 App 调用一次的 runDecay（见 runtime.ts）。
 */
import { SCORING } from '@/config/scoring';
import { RELATIONS } from '@/config/relations';
import type { Person } from '@/db/types';
import type { Settings } from '@/db/settings';
import { daysBetween, parseDateKey, toDateKey } from '@/lib/date';

export function graceDaysOf(person: Person, settings: Settings): number {
  return person.staleDaysOverride ?? settings.graceDays[person.relation] ?? RELATIONS[person.relation].staleDays;
}

/** "多久没联系"的起点：最后互动日，没有则认识日，再没有则建档日 */
export function lastContactDate(person: Person): Date {
  if (person.lastInteractionAt) return new Date(person.lastInteractionAt);
  if (person.metOn) return parseDateKey(person.metOn);
  return new Date(person.createdAt);
}

export function daysSinceContact(person: Person, today = new Date()): number {
  return Math.max(0, daysBetween(lastContactDate(person), today));
}

export function personDecays(person: Person, settings: Settings): boolean {
  if (!settings.decayEnabled) return false;
  if (person.isMe) return false;
  return RELATIONS[person.relation].decays;
}

/** 超过宽限期（用于首页轻提示） */
export function isStale(person: Person, settings: Settings, today = new Date()): boolean {
  if (person.isMe || person.staleReminderMuted) return false;
  return daysSinceContact(person, today) > graceDaysOf(person, settings);
}

export interface DecayResult {
  affection: number;
  lastDecayDate: string;
  lost: number;
}

/**
 * 结算到 today 为止的衰减。
 * 只对"超过宽限期的那些天"扣分；已结算过的天（lastDecayDate 及之前）不重复扣。
 */
export function computeDecay(person: Person, settings: Settings, today = new Date()): DecayResult {
  const todayKey = toDateKey(today);
  const none = { affection: person.affection, lastDecayDate: todayKey, lost: 0 };
  if (!personDecays(person, settings)) return none;
  if (person.affection >= SCORING.maxPoints) return none;

  const grace = graceDaysOf(person, settings);
  const contact = lastContactDate(person);
  const firstDecayDay = new Date(contact.getFullYear(), contact.getMonth(), contact.getDate() + grace + 1);
  const settled = person.lastDecayDate ? parseDateKey(person.lastDecayDate) : contact;
  const from = settled.getTime() >= firstDecayDay.getTime() ? new Date(settled.getFullYear(), settled.getMonth(), settled.getDate() + 1) : firstDecayDay;
  const days = daysBetween(from, today) + 1;
  if (days <= 0) return none;

  const floor = Math.floor(person.affection / SCORING.pointsPerHeart) * SCORING.pointsPerHeart;
  const affection = Math.max(floor, person.affection - days * SCORING.decayPerDay);
  return { affection, lastDecayDate: todayKey, lost: person.affection - affection };
}
