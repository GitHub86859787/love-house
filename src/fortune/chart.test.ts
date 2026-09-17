import { describe, expect, it } from 'vitest';
import { buildChart, chartToText, numerologyOf, shiChenOf, zodiacOf } from './chart';

describe('zodiacOf', () => {
  it('区间与跨年', () => {
    expect(zodiacOf(3, 21).name).toBe('白羊座');
    expect(zodiacOf(4, 19).name).toBe('白羊座');
    expect(zodiacOf(4, 20).name).toBe('金牛座');
    expect(zodiacOf(12, 25).name).toBe('摩羯座');
    expect(zodiacOf(1, 10).name).toBe('摩羯座');
    expect(zodiacOf(1, 20).name).toBe('水瓶座');
    expect(zodiacOf(8, 15).name).toBe('狮子座');
  });
});

describe('numerologyOf', () => {
  it('1995-08-15 → 38 → 11 主数，化简 2', () => {
    const n = numerologyOf(1995, 8, 15);
    expect(n.master).toBe(11);
    expect(n.reduced).toBe(2);
    expect(n.steps).toContain('1+9+9+5+0+8+1+5 = 38');
  });
  it('普通数化到个位', () => {
    const n = numerologyOf(1990, 6, 1);
    expect(n.master).toBe(8); // 1+9+9+0+0+6+0+1 = 26 → 8
    expect(n.reduced).toBe(8);
  });
});

describe('buildChart', () => {
  it('L0 / L1 / L2 / L3 等级', () => {
    expect(buildChart(undefined).level).toBe(0);
    expect(buildChart({ month: 8, day: 15 }).level).toBe(1);
    expect(buildChart({ month: 8, day: 15, year: 1995 }).level).toBe(2);
    expect(buildChart({ month: 8, day: 15, year: 1995, hour: 14 }).level).toBe(3);
  });
  it('1995-08-15 14:30 四柱：乙亥 甲申 戊寅 己未，属猪', () => {
    const c = buildChart({ month: 8, day: 15, year: 1995, hour: 14, minute: 30 }, new Date(2026, 8, 17));
    expect(c.shengXiao).toBe('猪');
    expect(c.bazi?.year.gan + c.bazi!.year.zhi).toBe('乙亥');
    expect(c.bazi?.month.gan + c.bazi!.month.zhi).toBe('甲申');
    expect(c.bazi?.day.gan + c.bazi!.day.zhi).toBe('戊寅');
    expect(c.bazi?.hour?.gan + c.bazi!.hour!.zhi).toBe('己未');
    expect(c.bazi?.dayMaster).toBe('戊');
    expect(c.shiChen).toBe('未时');
    expect(c.benMingNian).toBe(false);
    // 五行：木水 木金 土木 土土 → 木3 火0 土3 金1 水1
    expect(c.bazi?.wuxing).toEqual({ 木: 3, 火: 0, 土: 3, 金: 1, 水: 1 });
    expect(c.bazi?.missing).toEqual(['火']);
    expect(c.bazi?.strongest).toEqual(['木', '土']);
  });
  it('缺时辰只有三柱，时柱为 null', () => {
    const c = buildChart({ month: 8, day: 15, year: 1995 });
    expect(c.bazi?.hour).toBeNull();
    expect(Object.values(c.bazi!.wuxing).reduce((a, b) => a + b, 0)).toBe(6);
    expect(chartToText(c)).toContain('时柱缺失');
  });
  it('农历生日换算：1995 年七月二十 = 公历 1995-08-15', () => {
    const c = buildChart({ month: 7, day: 20, year: 1995, isLunar: true });
    expect(c.bazi?.day.gan + c.bazi!.day.zhi).toBe('戊寅');
    expect(c.zodiac?.name).toBe('狮子座');
  });
  it('本命年：1990 马年生人在 2026（丙午）为本命年；立春前按上一年算', () => {
    expect(buildChart({ month: 6, day: 1, year: 1990 }, new Date(2026, 8, 17)).benMingNian).toBe(true);
    expect(buildChart({ month: 6, day: 1, year: 1990 }, new Date(2026, 0, 10)).benMingNian).toBe(false);
  });
});

describe('shiChenOf', () => {
  it('钟点 → 时辰', () => {
    expect(shiChenOf(23)).toBe('子时');
    expect(shiChenOf(0)).toBe('子时');
    expect(shiChenOf(1)).toBe('丑时');
    expect(shiChenOf(14)).toBe('未时');
    expect(shiChenOf(12)).toBe('午时');
  });
});
