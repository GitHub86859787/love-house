import { Lunar, Solar } from 'lunar-typescript';
import type { Birth } from '@/db/types';
import { toDateKey } from './date';

/** 农历某年的 month/day 对应的公历日期；闰月忽略，月份不存在（如小月 30）则退到该月最后一天 */
export function lunarToSolar(year: number, month: number, day: number): Date {
  let d = day;
  for (; d >= 28; d--) {
    try {
      const s = Lunar.fromYmd(year, month, d).getSolar();
      return new Date(s.getYear(), s.getMonth() - 1, s.getDay());
    } catch {
      // 该农历日不存在，往前退一天再试
    }
  }
  const s = Lunar.fromYmd(year, month, d).getSolar();
  return new Date(s.getYear(), s.getMonth() - 1, s.getDay());
}

/** 今年（或指定公历年）这个人过生日的公历日期 */
export function birthdayInYear(birth: Birth, solarYear: number): Date {
  if (birth.isLunar) {
    // 农历生日：先看这个公历年内对应的农历年（公历年初可能还是上一个农历年）
    const candidates = [lunarToSolar(solarYear, birth.month, birth.day), lunarToSolar(solarYear - 1, birth.month, birth.day)];
    const inYear = candidates.find((d) => d.getFullYear() === solarYear);
    return inYear ?? candidates[0];
  }
  // 2 月 29 日在平年退到 2 月 28 日：month 是 1–12，new Date 的月份是 0–11；
  // new Date(y, m, 0) 取的是"第 m 个月（0 起）"的前一天，即 1 起的第 m 个月的最后一天
  const d = new Date(solarYear, birth.month - 1, birth.day);
  if (d.getMonth() !== birth.month - 1) return new Date(solarYear, birth.month, 0);
  return d;
}

export function isBirthdayToday(birth: Birth | undefined, today = new Date()): boolean {
  if (!birth) return false;
  return toDateKey(birthdayInYear(birth, today.getFullYear())) === toDateKey(today);
}

/** 距离下一次生日的天数（今天为 0） */
export function daysUntilBirthday(birth: Birth, today = new Date()): number {
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let next = birthdayInYear(birth, today.getFullYear());
  if (next.getTime() < t0.getTime()) next = birthdayInYear(birth, today.getFullYear() + 1);
  return Math.round((next.getTime() - t0.getTime()) / 86400000);
}

/** 公历日期 → 农历 "正月初一" 这样的文字 */
export function lunarLabel(d: Date): string {
  const l = Solar.fromYmd(d.getFullYear(), d.getMonth() + 1, d.getDate()).getLunar();
  return `${l.getMonthInChinese()}月${l.getDayInChinese()}`;
}

export function formatBirth(birth: Birth): string {
  const base = birth.isLunar ? `农历 ${birth.month} 月 ${birth.day} 日` : `${birth.month} 月 ${birth.day} 日`;
  return birth.year ? `${birth.year} 年 ${base}` : base;
}
