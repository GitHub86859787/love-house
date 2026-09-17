/**
 * 排盘自检：把标准答案表和日期换算用例跑一遍，返回逐项比对结果。
 * 设置页「排盘自检」和单测共用同一份标准答案（reference.ts）。
 */
import { buildChart, zodiacOf } from './chart';
import { REFERENCE_CASES, ZODIAC_BOUNDARIES } from './reference';
import { birthdayInYear, daysUntilBirthday, lunarToSolar } from '@/lib/birthday';
import { toDateKey } from '@/lib/date';

export interface CheckCell {
  label: string;
  expected?: string;
  actual: string;
  ok: boolean;
}

export interface CheckRow {
  label: string;
  note?: string;
  cells: CheckCell[];
}

function cell(label: string, actual: string, expected?: string): CheckCell {
  return { label, actual, expected, ok: expected === undefined || actual === expected };
}

export function runReferenceChecks(today = new Date()): CheckRow[] {
  return REFERENCE_CASES.map((c) => {
    const ch = buildChart(c.birth, today);
    const b = ch.bazi;
    const p = (x?: { gan: string; zhi: string } | null) => (x ? x.gan + x.zhi : '—');
    return {
      label: c.label,
      note: c.note,
      cells: [
        cell('星座', ch.zodiac?.name ?? '—', c.zodiac),
        cell('生肖', ch.shengXiao ?? '—', c.shengXiao),
        cell('年柱', p(b?.year), c.year),
        cell('月柱', p(b?.month), c.month),
        cell('日柱', p(b?.day), c.day),
        cell('时柱', p(b?.hour), c.hour),
      ],
    };
  });
}

export function runZodiacBoundaryChecks(): CheckRow[] {
  return ZODIAC_BOUNDARIES.map((z) => ({
    label: z.label,
    cells: [cell('星座', zodiacOf(z.month, z.day).name, z.zodiac), cell('经 buildChart', buildChart({ month: z.month, day: z.day }).zodiac?.name ?? '—', z.zodiac)],
  }));
}

/** 月份换算：所有进出 JS Date 的路径 */
export function runDateChecks(): CheckRow[] {
  const t = new Date(2026, 8, 17);
  const rows: [string, string, string][] = [
    ['公历 9/25 落在 2026 年', toDateKey(birthdayInYear({ month: 9, day: 25 }, 2026)), '2026-09-25'],
    ['公历 1/1 落在 2026 年', toDateKey(birthdayInYear({ month: 1, day: 1 }, 2026)), '2026-01-01'],
    ['公历 12/31 落在 2026 年', toDateKey(birthdayInYear({ month: 12, day: 31 }, 2026)), '2026-12-31'],
    ['2/29 平年退到 2/28', toDateKey(birthdayInYear({ month: 2, day: 29 }, 2026)), '2026-02-28'],
    ['农历 2026 八月十五 → 公历', toDateKey(lunarToSolar(2026, 8, 15)), '2026-09-25'],
    ['农历 2026 正月初一 → 公历', toDateKey(lunarToSolar(2026, 1, 1)), '2026-02-17'],
    ['农历 2026 五月初五 → 公历', toDateKey(lunarToSolar(2026, 5, 5)), '2026-06-19'],
    ['农历生日八月十五在 2026 年', toDateKey(birthdayInYear({ month: 8, day: 15, isLunar: true }, 2026)), '2026-09-25'],
    ['农历腊月三十在 2024 年（除夕）', toDateKey(birthdayInYear({ month: 12, day: 30, isLunar: true }, 2024)), '2024-02-09'],
    ['9/17 到 9/25 倒计时', String(daysUntilBirthday({ month: 9, day: 25 }, t)), '8'],
    ['9/17 到农历八月十五倒计时', String(daysUntilBirthday({ month: 8, day: 15, isLunar: true }, t)), '8'],
    ['生日当天倒计时', String(daysUntilBirthday({ month: 9, day: 17 }, t)), '0'],
  ];
  return rows.map(([label, actual, expected]) => ({ label, cells: [cell('结果', actual, expected)] }));
}

export function summarize(rows: CheckRow[]): { total: number; failed: number } {
  let total = 0;
  let failed = 0;
  for (const r of rows) for (const c of r.cells) if (c.expected !== undefined) {
    total++;
    if (!c.ok) failed++;
  }
  return { total, failed };
}
