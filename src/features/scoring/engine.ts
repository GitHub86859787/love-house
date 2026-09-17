/**
 * 计分引擎：纯函数，输入人物、新互动、当天与本周已有互动，输出得分和说明。
 * 规则来自 config/scoring.ts。
 */
import { SCORING } from '@/config/scoring';
import type { Interaction, InteractionType, Person, PreferenceTier } from '@/db/types';
import { TIERS } from '@/config/reactions';
import { isBirthdayToday } from '@/lib/birthday';
import { toDateKey } from '@/lib/date';

export interface ScoreInput {
  person: Person;
  type: InteractionType;
  giftTier?: PreferenceTier;
  at: Date;
  /** 该人物已有的互动（至少包含本周的） */
  history: Interaction[];
  weeklyGiftLimitEnabled: boolean;
}

export interface ScoreResult {
  points: number;
  reason: string;
  /** 送礼超过每周上限：记录但不加分 */
  giftLimitHit: boolean;
  isBirthday: boolean;
}

/** 本地时区的周一 00:00 */
export function weekStart(d: Date): Date {
  const day = (d.getDay() + 6) % 7; // 周一 = 0
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
}

export function giftsThisWeek(history: Interaction[], at: Date): number {
  const start = weekStart(at).getTime();
  const end = start + 7 * 86400000;
  return history.filter((h) => h.type === 'gift' && h.at >= start && h.at < end).length;
}

export function computeScore(input: ScoreInput): ScoreResult {
  const { person, type, at, history } = input;
  const birthday = isBirthdayToday(person.birth, at);
  const todayKey = toDateKey(at);
  const sameDay = history.filter((h) => toDateKey(new Date(h.at)) === todayKey && h.type === type);
  const parts: string[] = [];

  if (type === 'receivedGift' || type === 'relationChange') {
    return { points: 0, reason: type === 'receivedGift' ? '对方送礼，记下来不加分' : '关系变更', giftLimitHit: false, isBirthday: birthday };
  }

  if (type === 'gift') {
    const tier = input.giftTier ?? 'neutral';
    let pts: number = SCORING.gift[tier];
    parts.push(`${TIERS[tier].label} ${pts >= 0 ? '+' : ''}${pts}`);
    let limitHit = false;
    if (input.weeklyGiftLimitEnabled && !birthday && giftsThisWeek(history, at) >= SCORING.weeklyGiftLimit) {
      limitHit = true;
      pts = 0;
      parts.push('这周已经送过两次啦，本次不计分');
    } else if (birthday) {
      pts *= SCORING.birthdayGiftMultiplier;
      parts.push(`生日 ×${SCORING.birthdayGiftMultiplier}`);
    }
    return { points: pts, reason: parts.join('，'), giftLimitHit: limitHit, isBirthday: birthday };
  }

  let pts: number = SCORING.interaction[type];
  parts.push(`${pts >= 0 ? '+' : ''}${pts}`);
  if (type === 'chat' && sameDay.length > 0) {
    pts = 0;
    parts.push('今天已经聊过，不重复计分');
  } else if (sameDay.length > 0) {
    pts = Math.round(pts * SCORING.sameDayRepeatFactor);
    parts.push(`今天第 ${sameDay.length + 1} 次，减半`);
  }
  if (birthday && pts > 0) {
    pts *= SCORING.birthdayOtherMultiplier;
    parts.push(`生日 ×${SCORING.birthdayOtherMultiplier}`);
  }
  return { points: pts, reason: parts.join('，'), giftLimitHit: false, isBirthday: birthday };
}

export function clampPoints(p: number): number {
  return Math.max(0, Math.min(SCORING.maxPoints, Math.round(p)));
}

/** 礼物名自动匹配喜好列表（不含占卜师推测） */
export function matchGift(person: Person, giftName: string): { tier: PreferenceTier; preferenceId?: string } {
  const name = giftName.trim().toLowerCase();
  if (!name) return { tier: 'neutral' };
  const candidates = person.preferences.filter((p) => p.source !== 'fortune');
  const exact = candidates.find((p) => p.name.toLowerCase() === name);
  if (exact) return { tier: exact.tier, preferenceId: exact.id };
  const partial = candidates.find((p) => name.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(name));
  if (partial) return { tier: partial.tier, preferenceId: partial.id };
  return { tier: 'neutral' };
}
