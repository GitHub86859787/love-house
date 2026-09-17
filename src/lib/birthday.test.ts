import { describe, expect, it } from 'vitest';
import { birthdayInYear, daysUntilBirthday, isBirthdayToday, lunarToSolar } from './birthday';
import { toDateKey } from './date';

/** 约定：birth.month 是 1–12；进出 JS Date 时 ±1。这里用已知日期把每条换算路径都走一遍。 */
describe('公历 / 农历 / JS Date 月份换算', () => {
  it('公历生日落在当年正确的月份（不偏一个月）', () => {
    expect(toDateKey(birthdayInYear({ month: 9, day: 25 }, 2026))).toBe('2026-09-25');
    expect(toDateKey(birthdayInYear({ month: 1, day: 1 }, 2026))).toBe('2026-01-01');
    expect(toDateKey(birthdayInYear({ month: 12, day: 31 }, 2026))).toBe('2026-12-31');
  });
  it('2 月 29 日在平年退到 2 月 28 日', () => {
    expect(toDateKey(birthdayInYear({ month: 2, day: 29 }, 2026))).toBe('2026-02-28');
    expect(toDateKey(birthdayInYear({ month: 2, day: 29 }, 2028))).toBe('2028-02-29');
  });
  it('农历 → 公历：2026 年八月十五 = 9 月 25 日，2026 年正月初一 = 2 月 17 日，2026 年五月初五 = 6 月 19 日', () => {
    expect(toDateKey(lunarToSolar(2026, 8, 15))).toBe('2026-09-25');
    expect(toDateKey(lunarToSolar(2026, 1, 1))).toBe('2026-02-17');
    expect(toDateKey(lunarToSolar(2026, 5, 5))).toBe('2026-06-19');
  });
  it('农历生日在公历年内的落点', () => {
    expect(toDateKey(birthdayInYear({ month: 8, day: 15, isLunar: true }, 2026))).toBe('2026-09-25');
    // 农历腊月三十在 2024 公历年内是 2 月 9 日（癸卯年除夕）
    expect(toDateKey(birthdayInYear({ month: 12, day: 30, isLunar: true }, 2024))).toBe('2024-02-09');
  });
  it('倒计时与当天判断', () => {
    const today = new Date(2026, 8, 17);
    expect(daysUntilBirthday({ month: 9, day: 25 }, today)).toBe(8);
    expect(daysUntilBirthday({ month: 9, day: 17 }, today)).toBe(0);
    expect(daysUntilBirthday({ month: 9, day: 16 }, today)).toBe(364);
    expect(daysUntilBirthday({ month: 8, day: 15, isLunar: true }, today)).toBe(8);
    expect(isBirthdayToday({ month: 9, day: 17 }, today)).toBe(true);
    expect(isBirthdayToday({ month: 10, day: 17 }, today)).toBe(false);
  });
});
