import { describe, expect, it } from 'vitest';
import { ascMc, buildNatal, eclipticLongitude, houseOf, norm360 } from './natal';
import { buildChart, applyTrueSolar, baziFromManual, trueSolarOffsetMinutes } from './chart';

const diff = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

describe('本命盘：行星黄经', () => {
  it('2000-01-21 04:44 UTC 月全食：月亮与太阳黄经相差 180°', () => {
    const d = new Date(Date.UTC(2000, 0, 21, 4, 44));
    expect(diff(eclipticLongitude('moon', d), eclipticLongitude('sun', d) + 180)).toBeLessThan(0.5);
  });
  it('2000-01-06 18:14 UTC 新月：月亮与太阳黄经相同', () => {
    const d = new Date(Date.UTC(2000, 0, 6, 18, 14));
    expect(diff(eclipticLongitude('moon', d), eclipticLongitude('sun', d))).toBeLessThan(0.5);
  });
  it('J2000 太阳在摩羯座 10°，月亮在天蝎座', () => {
    const d = new Date(Date.UTC(2000, 0, 1, 12));
    const sun = eclipticLongitude('sun', d);
    expect(sun).toBeGreaterThan(280);
    expect(sun).toBeLessThan(281);
    const moon = eclipticLongitude('moon', d);
    expect(Math.floor(moon / 30)).toBe(7); // 天蝎 210–240
  });
  it('太阳星座与星座区间表一致：1995-08-15 太阳在狮子座', () => {
    const n = buildNatal({ year: 1995, month: 8, day: 15, hour: 14, minute: 30 });
    expect(n?.bodies.find((b) => b.key === 'sun')?.sign).toBe('狮子座');
    expect(n?.level).toBe('time');
    expect(n?.assumedTz).toBe(true);
  });
});

describe('上升与天顶', () => {
  // 让恒星时落在给定值：找一个日期使 GAST·15 + lon ≈ 目标 RAMC
  function dateForRamc(target: number, lon: number): Date {
    // 从某天起逐分钟搜索（一天内必经过）
    const start = Date.UTC(2000, 0, 1, 0, 0);
    for (let m = 0; m < 1441; m++) {
      const d = new Date(start + m * 60000);
      const r = ascMc(d, lon, 0).ramc;
      if (diff(r, target) < 0.15) return d;
    }
    throw new Error('not found');
  }
  it('RAMC = 0 时天顶在白羊座 0°', () => {
    const d = dateForRamc(0, 0);
    const { mc } = ascMc(d, 0, 30);
    expect(diff(mc, 0)).toBeLessThan(0.5);
  });
  it('赤道上 RAMC = 270° 时上升在白羊座 0°（春分点正在东升）', () => {
    const d = dateForRamc(270, 0);
    const { asc } = ascMc(d, 0, 0);
    expect(diff(asc, 0)).toBeLessThan(0.5);
  });
  it('赤道上 RAMC = 90° 时上升在天秤座 0°', () => {
    const d = dateForRamc(90, 0);
    const { asc } = ascMc(d, 0, 0);
    expect(diff(asc, 180)).toBeLessThan(0.5);
  });
  it('宫位：从上升起每 30° 一宫', () => {
    expect(houseOf(10, 0)).toBe(1);
    expect(houseOf(35, 0)).toBe(2);
    expect(houseOf(350, 0)).toBe(12);
    expect(houseOf(5, 350)).toBe(1);
    expect(norm360(-30)).toBe(330);
  });
  it('有出生地时给出上升、天顶与十二宫', () => {
    const n = buildNatal({ year: 1995, month: 8, day: 15, hour: 14, minute: 30, place: { name: '北京', lon: 116.4, lat: 39.9, tz: 8 } });
    expect(n?.level).toBe('place');
    expect(n?.asc?.sign).toBeTruthy();
    expect(n?.houses).toHaveLength(12);
    expect(n?.bodies.every((b) => b.house && b.house >= 1 && b.house <= 12)).toBe(true);
  });
});

describe('真太阳时与手动排盘', () => {
  it('乌鲁木齐比北京时间慢约两小时', () => {
    const off = trueSolarOffsetMinutes(87.6, 8, 200);
    expect(off).toBeLessThan(-115);
    expect(off).toBeGreaterThan(-145);
  });
  it('真太阳时校正会改动时柱：北京 1995-08-15 14:30 → 约 14:11', () => {
    const ts = applyTrueSolar({ year: 1995, month: 8, day: 15, hour: 14, minute: 30, place: { name: '北京', lon: 116.4, lat: 39.9, tz: 8 } });
    expect(ts?.hour).toBe(14);
    expect(ts!.minute).toBeGreaterThan(5);
    expect(ts!.minute).toBeLessThan(20);
    const c = buildChart({ year: 1995, month: 8, day: 15, hour: 14, minute: 30, place: { name: '北京', lon: 116.4, lat: 39.9, tz: 8 } });
    expect(c.bazi?.trueSolarNote).toContain('北京真太阳时');
    expect(c.bazi?.hour?.gan + c.bazi!.hour!.zhi).toBe('己未'); // 未时 13–15 点，校正后仍在未时
  });
  it('手动四柱：五行、日主、纳音、生肖以手动值为准', () => {
    const b = baziFromManual({ year: '乙亥', month: '甲申', day: '戊寅', hour: '己未' });
    expect(b.manual).toBe(true);
    expect(b.wuxing).toEqual({ 木: 3, 火: 0, 土: 3, 金: 1, 水: 1 });
    expect(b.dayMaster).toBe('戊');
    expect(b.naYin).toBe('山头火');
    const c = buildChart({ month: 8, day: 15, manualPillars: { year: '庚辰', month: '甲申', day: '戊寅' } });
    expect(c.shengXiao).toBe('龙');
    expect(c.level).toBe(2);
    expect(c.bazi?.year.gan + c.bazi!.year.zhi).toBe('庚辰');
  });
});
