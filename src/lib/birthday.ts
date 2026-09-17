import { Lunar, Solar } from 'lunar-typescript';
import type { Birth } from '@/db/types';
import { toDateKey } from './date';

export type Calendar = 'solar' | 'lunar';

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

/** 农历 m/d 在指定公历年内的落点（公历年初可能还属上一个农历年） */
function lunarMdInSolarYear(month: number, day: number, solarYear: number): Date {
  const candidates = [lunarToSolar(solarYear, month, day), lunarToSolar(solarYear - 1, month, day)];
  return candidates.find((d) => d.getFullYear() === solarYear) ?? candidates[0];
}

/** 公历 m/d 在指定年份的日期（2 月 29 日在平年退到 2 月 28 日） */
function solarMdInYear(month: number, day: number, year: number): Date {
  // month 是 1–12，new Date 的月份是 0–11；new Date(y, m, 0) 是 1 起的第 m 个月的最后一天
  const d = new Date(year, month - 1, day);
  if (d.getMonth() !== month - 1) return new Date(year, month, 0);
  return d;
}

/**
 * 这个人的生日在两种历法下各是几月几日。
 * 填的是公历：公历 m/d 直接有；农历 m/d 需要出生年份换算。
 * 填的是农历：农历 m/d 直接有；公历 m/d 需要出生年份换算。
 */
export function birthdayMd(birth: Birth): { solar?: { month: number; day: number }; lunar?: { month: number; day: number } } {
  if (birth.isLunar) {
    const out: ReturnType<typeof birthdayMd> = { lunar: { month: birth.month, day: birth.day } };
    if (birth.year) {
      const s = lunarToSolar(birth.year, birth.month, birth.day);
      out.solar = { month: s.getMonth() + 1, day: s.getDate() };
    }
    return out;
  }
  const out: ReturnType<typeof birthdayMd> = { solar: { month: birth.month, day: birth.day } };
  if (birth.year) {
    const l = Solar.fromYmd(birth.year, birth.month, birth.day).getLunar();
    out.lunar = { month: Math.abs(l.getMonth()), day: l.getDay() };
  }
  return out;
}

/** 按提醒设置，这个人在某公历年里要过的生日日期（可能一个或两个） */
export function birthdayDatesInYear(birth: Birth, solarYear: number): { date: Date; calendar: Calendar }[] {
  const md = birthdayMd(birth);
  const mode = birth.remind ?? 'both';
  const out: { date: Date; calendar: Calendar }[] = [];
  if (md.solar && (mode === 'solar' || mode === 'both')) out.push({ date: solarMdInYear(md.solar.month, md.solar.day, solarYear), calendar: 'solar' });
  if (md.lunar && (mode === 'lunar' || mode === 'both')) out.push({ date: lunarMdInSolarYear(md.lunar.month, md.lunar.day, solarYear), calendar: 'lunar' });
  // 选的历法算不出来时（没年份），退回填写的那种历法
  if (out.length === 0) {
    if (md.solar) out.push({ date: solarMdInYear(md.solar.month, md.solar.day, solarYear), calendar: 'solar' });
    else if (md.lunar) out.push({ date: lunarMdInSolarYear(md.lunar.month, md.lunar.day, solarYear), calendar: 'lunar' });
  }
  return out;
}

/** 兼容旧调用：按填写的历法，这个人今年的生日 */
export function birthdayInYear(birth: Birth, solarYear: number): Date {
  const md = birthdayMd(birth);
  if (birth.isLunar && md.lunar) return lunarMdInSolarYear(md.lunar.month, md.lunar.day, solarYear);
  return solarMdInYear(birth.month, birth.day, solarYear);
}

/** 接下来要过的生日（每种历法一条），按天数排序 */
export function upcomingBirthdays(birth: Birth, today = new Date()): { date: Date; calendar: Calendar; days: number }[] {
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const byCal = new Map<Calendar, { date: Date; calendar: Calendar; days: number }>();
  for (const y of [today.getFullYear(), today.getFullYear() + 1]) {
    for (const b of birthdayDatesInYear(birth, y)) {
      const days = Math.round((b.date.getTime() - t0.getTime()) / 86400000);
      if (days < 0) continue;
      const prev = byCal.get(b.calendar);
      if (!prev || days < prev.days) byCal.set(b.calendar, { ...b, days });
    }
  }
  return [...byCal.values()].sort((a, b) => a.days - b.days);
}

export function isBirthdayToday(birth: Birth | undefined, today = new Date()): boolean {
  if (!birth) return false;
  const key = toDateKey(today);
  return birthdayDatesInYear(birth, today.getFullYear()).some((b) => toDateKey(b.date) === key);
}

/** 距离最近一次生日的天数（今天为 0） */
export function daysUntilBirthday(birth: Birth, today = new Date()): number {
  return upcomingBirthdays(birth, today)[0]?.days ?? 0;
}

/** 公历日期 → 农历 "正月初一" 这样的文字 */
export function lunarLabel(d: Date): string {
  const l = Solar.fromYmd(d.getFullYear(), d.getMonth() + 1, d.getDate()).getLunar();
  return `${l.getMonthInChinese()}月${l.getDayInChinese()}`;
}

export function formatBirth(birth: Birth): string {
  const base = birth.isLunar ? `农历 ${birth.month} 月 ${birth.day} 日` : `${birth.month} 月 ${birth.day} 日`;
  const year = birth.year ? `${birth.year} 年 ${base}` : base;
  return birth.hour != null ? `${year} ${String(birth.hour).padStart(2, '0')}:${String(birth.minute ?? 0).padStart(2, '0')}` : year;
}

export const REMIND_LABELS: Record<NonNullable<Birth['remind']>, string> = { solar: '公历', lunar: '农历', both: '都提醒' };
