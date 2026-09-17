/**
 * 排盘自检：把标准答案表和日期换算用例跑一遍，返回逐项比对结果。
 * 设置页「排盘自检」和单测共用同一份标准答案（reference.ts）。
 */
import { baziFromManual, buildChart, zodiacOf } from './chart';
import { ascMc, eclipticLongitude } from './natal';
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

/** 本命盘：用日月食、新月这些确定的天象校验行星黄经；上升 / 天顶用几何性质校验 */
export function runNatalChecks(): CheckRow[] {
  const diff = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
  const ecl = new Date(Date.UTC(2000, 0, 21, 4, 44));
  const nm = new Date(Date.UTC(2000, 0, 6, 18, 14));
  const j2000 = new Date(Date.UTC(2000, 0, 1, 12));
  const sunEcl = eclipticLongitude('sun', ecl);
  const moonEcl = eclipticLongitude('moon', ecl);
  const d1 = diff(moonEcl, sunEcl + 180);
  const d2 = diff(eclipticLongitude('moon', nm), eclipticLongitude('sun', nm));
  const sunJ = eclipticLongitude('sun', j2000);
  // 找 RAMC≈270° 的时刻（赤道上春分点正在东升）
  let ascAt270 = NaN;
  for (let m = 0; m < 1441; m++) {
    const d = new Date(Date.UTC(2000, 0, 1) + m * 60000);
    const r = ascMc(d, 0, 0);
    if (diff(r.ramc, 270) < 0.15) {
      ascAt270 = r.asc;
      break;
    }
  }
  const manual = baziFromManual({ year: '乙亥', month: '甲申', day: '戊寅', hour: '己未' });
  return [
    { label: '2000-01-21 月全食：月−日 = 180°', cells: [cell('偏差', `${d1.toFixed(2)}°`, undefined), { label: '判定', actual: d1 < 0.5 ? '通过' : '偏差过大', expected: '通过', ok: d1 < 0.5 }] },
    { label: '2000-01-06 新月：月 = 日', cells: [cell('偏差', `${d2.toFixed(2)}°`, undefined), { label: '判定', actual: d2 < 0.5 ? '通过' : '偏差过大', expected: '通过', ok: d2 < 0.5 }] },
    { label: 'J2000 太阳黄经 ≈ 280.4°（摩羯 10°）', cells: [cell('黄经', sunJ.toFixed(1), undefined), { label: '判定', actual: Math.abs(sunJ - 280.37) < 0.5 ? '通过' : '偏差过大', expected: '通过', ok: Math.abs(sunJ - 280.37) < 0.5 }] },
    { label: '赤道 RAMC=270° 时上升 = 白羊 0°', cells: [cell('上升黄经', Number.isFinite(ascAt270) ? ascAt270.toFixed(1) : '—', undefined), { label: '判定', actual: diff(ascAt270, 0) < 0.5 ? '通过' : '偏差过大', expected: '通过', ok: diff(ascAt270, 0) < 0.5 }] },
    { label: '手动四柱 乙亥 甲申 戊寅 己未', cells: [cell('五行木', String(manual.wuxing.木), '3'), cell('五行火', String(manual.wuxing.火), '0'), cell('日主', manual.dayMaster, '戊'), cell('纳音', manual.naYin, '山头火')] },
  ];
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
