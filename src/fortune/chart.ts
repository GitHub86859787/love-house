/**
 * 排盘：全部本地计算，不交给 AI。
 * 星座 / 生肖 / 生命灵数 / 八字（年月日时四柱）/ 五行分布 / 本命年 / 完整度等级。
 */
import { Lunar, Solar } from 'lunar-typescript';
import type { Birth } from '@/db/types';

export type CompletenessLevel = 0 | 1 | 2 | 3;

export interface ZodiacInfo {
  name: string;
  element: '火' | '土' | '风' | '水';
  planet: string;
  range: string;
}

export interface NumerologyInfo {
  /** 各位数字相加过程，如 "1+9+9+5+8+1+5 = 38 → 3+8 = 11" */
  steps: string;
  /** 主数（11 / 22 / 33 保留） */
  master: number;
  /** 化简到个位 */
  reduced: number;
}

export type WuXing = '木' | '火' | '土' | '金' | '水';

export interface Pillar {
  gan: string;
  zhi: string;
  ganWuXing: WuXing;
  zhiWuXing: WuXing;
}

export interface BaziInfo {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  /** 时柱未知为 null */
  hour: Pillar | null;
  /** 五行计数（六字或八字） */
  wuxing: Record<WuXing, number>;
  missing: WuXing[];
  strongest: WuXing[];
  /** 日主（日干）及其五行 */
  dayMaster: string;
  dayMasterWuXing: WuXing;
  /** 年柱纳音 */
  naYin: string;
  /** 农历生日文字 */
  lunarText: string;
  /** 节气 */
  jieQi?: string;
}

export interface Chart {
  level: CompletenessLevel;
  levelLabel: string;
  zodiac?: ZodiacInfo;
  shengXiao?: string;
  numerology?: NumerologyInfo;
  bazi?: BaziInfo;
  /** 今年是否本命年 */
  benMingNian?: boolean;
  /** 时辰名（子时…） */
  shiChen?: string;
  /** 公历生日（农历生日换算后，用当年） */
  solarText?: string;
  /** 输入是农历时的换算说明，让"勾错了农历"一眼能看出来 */
  lunarInputNote?: string;
  /** 年柱地支对应的生肖（按立春切换），与 shengXiao（按春节切换）可能不同 */
  pillarShengXiao?: string;
}

const ZODIACS: (ZodiacInfo & { from: [number, number]; to: [number, number] })[] = [
  { name: '白羊座', element: '火', planet: '火星', range: '3.21 – 4.19', from: [3, 21], to: [4, 19] },
  { name: '金牛座', element: '土', planet: '金星', range: '4.20 – 5.20', from: [4, 20], to: [5, 20] },
  { name: '双子座', element: '风', planet: '水星', range: '5.21 – 6.21', from: [5, 21], to: [6, 21] },
  { name: '巨蟹座', element: '水', planet: '月亮', range: '6.22 – 7.22', from: [6, 22], to: [7, 22] },
  { name: '狮子座', element: '火', planet: '太阳', range: '7.23 – 8.22', from: [7, 23], to: [8, 22] },
  { name: '处女座', element: '土', planet: '水星', range: '8.23 – 9.22', from: [8, 23], to: [9, 22] },
  { name: '天秤座', element: '风', planet: '金星', range: '9.23 – 10.23', from: [9, 23], to: [10, 23] },
  { name: '天蝎座', element: '水', planet: '冥王星', range: '10.24 – 11.22', from: [10, 24], to: [11, 22] },
  { name: '射手座', element: '火', planet: '木星', range: '11.23 – 12.21', from: [11, 23], to: [12, 21] },
  { name: '摩羯座', element: '土', planet: '土星', range: '12.22 – 1.19', from: [12, 22], to: [1, 19] },
  { name: '水瓶座', element: '风', planet: '天王星', range: '1.20 – 2.18', from: [1, 20], to: [2, 18] },
  { name: '双鱼座', element: '水', planet: '海王星', range: '2.19 – 3.20', from: [2, 19], to: [3, 20] },
];

export function zodiacOf(month: number, day: number): ZodiacInfo {
  const md = month * 100 + day;
  for (const z of ZODIACS) {
    const from = z.from[0] * 100 + z.from[1];
    const to = z.to[0] * 100 + z.to[1];
    const hit = from <= to ? md >= from && md <= to : md >= from || md <= to;
    if (hit) return { name: z.name, element: z.element, planet: z.planet, range: z.range };
  }
  return { name: '摩羯座', element: '土', planet: '土星', range: '12.22 – 1.19' };
}

/** 生命灵数：年月日各位相加至个位，11 / 22 / 33 保留为主数 */
export function numerologyOf(year: number, month: number, day: number): NumerologyInfo {
  const digits = `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`.split('').map(Number);
  let sum = digits.reduce((a, b) => a + b, 0);
  const parts = [`${digits.join('+')} = ${sum}`];
  let master = sum;
  while (sum > 9) {
    if (sum === 11 || sum === 22 || sum === 33) {
      master = sum;
      break;
    }
    const ds = String(sum).split('').map(Number);
    const next = ds.reduce((a, b) => a + b, 0);
    parts.push(`${ds.join('+')} = ${next}`);
    sum = next;
    master = sum;
  }
  let reduced = master;
  while (reduced > 9) reduced = String(reduced).split('').map(Number).reduce((a, b) => a + b, 0);
  if (master === 11 || master === 22 || master === 33) parts.push(`主数 ${master}（化简 ${reduced}）`);
  return { steps: parts.join(' → '), master, reduced };
}

const SHICHEN = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
export const SHICHEN_OPTIONS = SHICHEN.map((z, i) => {
  const start = i === 0 ? 23 : i * 2 - 1;
  const end = i === 0 ? 1 : i * 2 + 1;
  return { zhi: z, label: `${z}时`, range: `${String(start).padStart(2, '0')}:00–${String(end).padStart(2, '0')}:00`, hour: i === 0 ? 0 : i * 2 };
});

export function shiChenOf(hour: number): string {
  const idx = hour === 23 ? 0 : Math.floor((hour + 1) / 2) % 12;
  return `${SHICHEN[idx]}时`;
}

function pillar(ganZhi: string, wx: string): Pillar {
  return { gan: ganZhi[0], zhi: ganZhi[1], ganWuXing: wx[0] as WuXing, zhiWuXing: wx[1] as WuXing };
}

/** 生日 → 公历 Solar（农历生日按出生年换算） */
export function birthToSolar(birth: Birth & { year: number }): Solar {
  const hour = birth.hour ?? 0;
  const minute = birth.minute ?? 0;
  if (birth.isLunar) {
    let day = birth.day;
    for (; day >= 28; day--) {
      try {
        return Lunar.fromYmdHms(birth.year, birth.month, day, hour, minute, 0).getSolar();
      } catch {
        // 该农历日不存在则退一天
      }
    }
    return Lunar.fromYmdHms(birth.year, birth.month, day, hour, minute, 0).getSolar();
  }
  return Solar.fromYmdHms(birth.year, birth.month, birth.day, hour, minute, 0);
}

export function baziOf(birth: Birth & { year: number }, hasHour: boolean): BaziInfo {
  const solar = birthToSolar(birth);
  const lunar = solar.getLunar();
  const ec = lunar.getEightChar();
  const year = pillar(ec.getYear(), ec.getYearWuXing());
  const month = pillar(ec.getMonth(), ec.getMonthWuXing());
  const day = pillar(ec.getDay(), ec.getDayWuXing());
  const hour = hasHour ? pillar(ec.getTime(), ec.getTimeWuXing()) : null;
  const wuxing: Record<WuXing, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  for (const p of [year, month, day, hour]) {
    if (!p) continue;
    wuxing[p.ganWuXing]++;
    wuxing[p.zhiWuXing]++;
  }
  const max = Math.max(...Object.values(wuxing));
  const keys = Object.keys(wuxing) as WuXing[];
  const jq = lunar.getJieQi();
  return {
    year,
    month,
    day,
    hour,
    wuxing,
    missing: keys.filter((k) => wuxing[k] === 0),
    strongest: keys.filter((k) => wuxing[k] === max),
    dayMaster: day.gan,
    dayMasterWuXing: day.ganWuXing,
    naYin: ec.getYearNaYin(),
    lunarText: `${lunar.getYearInChinese()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
    jieQi: jq || undefined,
  };
}

export function completenessOf(birth?: Birth): CompletenessLevel {
  if (!birth) return 0;
  if (!birth.year) return 1;
  if (birth.hour == null) return 2;
  return 3;
}

export const LEVEL_LABELS: Record<CompletenessLevel, string> = {
  0: '没有生日',
  1: '只有月日：能看星座',
  2: '有年月日：星座、生肖、灵数、八字三柱、五行',
  3: '有时辰：完整四柱',
};

export function buildChart(birth: Birth | undefined, today = new Date()): Chart {
  const level = completenessOf(birth);
  const chart: Chart = { level, levelLabel: LEVEL_LABELS[level] };
  if (!birth || level === 0) return chart;

  // 星座按公历月日；农历生日先换算到今年公历
  let sm = birth.month;
  let sd = birth.day;
  if (birth.isLunar) {
    const y = birth.year ?? today.getFullYear();
    const s = birthToSolar({ ...birth, year: y });
    sm = s.getMonth();
    sd = s.getDay();
  }
  chart.zodiac = zodiacOf(sm, sd);
  chart.solarText = `${sm} 月 ${sd} 日`;
  if (birth.isLunar) chart.lunarInputNote = `按农历 ${birth.month} 月 ${birth.day} 日换算为公历 ${sm} 月 ${sd} 日${birth.year ? '' : '（按今年）'}`;
  if (!birth.year) return chart;

  const full = { ...birth, year: birth.year };
  const solar = birthToSolar(full);
  const lunar = solar.getLunar();
  // 生肖：按农历年切换（春节当天换）
  chart.shengXiao = lunar.getYearShengXiao();
  // 年柱：按立春切换（EightChar 内部按节气），它对应的生肖单独记
  chart.pillarShengXiao = lunar.getYearShengXiaoByLiChun();
  chart.numerology = numerologyOf(solar.getYear(), solar.getMonth(), solar.getDay());
  chart.bazi = baziOf(full, level === 3);
  if (level === 3 && birth.hour != null) chart.shiChen = shiChenOf(birth.hour);
  // 本命年：今年农历年的生肖 == 出生农历年的生肖（同样按春节切换）
  const nowLunar = Solar.fromYmd(today.getFullYear(), today.getMonth() + 1, today.getDate()).getLunar();
  chart.benMingNian = nowLunar.getYearShengXiao() === chart.shengXiao;
  return chart;
}

/** 给 AI 看的排盘文字（结构化，缺时辰要明说） */
export function chartToText(chart: Chart): string {
  const lines: string[] = [`完整度：L${chart.level}（${chart.levelLabel}）`];
  if (chart.zodiac) lines.push(`星座：${chart.zodiac.name}（${chart.zodiac.element}象，守护星${chart.zodiac.planet}）`);
  if (chart.lunarInputNote) lines.push(`生日：${chart.lunarInputNote}`);
  if (chart.shengXiao) lines.push(`生肖：${chart.shengXiao}（按农历年）${chart.benMingNian ? '，今年本命年' : ''}${chart.pillarShengXiao && chart.pillarShengXiao !== chart.shengXiao ? `；年柱按立春为${chart.pillarShengXiao}年` : ''}`);
  if (chart.numerology) lines.push(`生命灵数：主数 ${chart.numerology.master}${chart.numerology.master !== chart.numerology.reduced ? `（化简 ${chart.numerology.reduced}）` : ''}，计算：${chart.numerology.steps}`);
  if (chart.bazi) {
    const b = chart.bazi;
    const p = (x: Pillar | null) => (x ? `${x.gan}${x.zhi}（${x.ganWuXing}${x.zhiWuXing}）` : '未知');
    lines.push(`八字：年柱 ${p(b.year)}，月柱 ${p(b.month)}，日柱 ${p(b.day)}，时柱 ${p(b.hour)}${b.hour ? '' : '（时辰未知，时柱缺失）'}`);
    lines.push(`日主：${b.dayMaster}（${b.dayMasterWuXing}）；年柱纳音：${b.naYin}；农历 ${b.lunarText}`);
    lines.push(`五行分布：${(Object.keys(b.wuxing) as WuXing[]).map((k) => `${k}${b.wuxing[k]}`).join(' ')}；最旺：${b.strongest.join('、')}；缺：${b.missing.length ? b.missing.join('、') : '无'}`);
  }
  return lines.join('\n');
}
