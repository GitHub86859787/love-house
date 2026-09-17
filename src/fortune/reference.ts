/**
 * 排盘标准答案表：单测和设置页「排盘自检」共用同一份数据。
 * 约定：生肖按农历年切换（春节当天换）；八字年柱按立春切换；两者分开算。
 */
import type { Birth } from '@/db/types';

export interface ReferenceCase {
  label: string;
  birth: Birth;
  zodiac: string;
  shengXiao: string;
  year?: string;
  month?: string;
  day?: string;
  hour?: string;
  note?: string;
}

export const REFERENCE_CASES: ReferenceCase[] = [
  { label: '1995-08-15 14:30', birth: { year: 1995, month: 8, day: 15, hour: 14, minute: 30 }, zodiac: '狮子座', shengXiao: '猪', year: '乙亥', month: '甲申', day: '戊寅', hour: '己未' },
  { label: '2001-06-15', birth: { year: 2001, month: 6, day: 15 }, zodiac: '双子座', shengXiao: '蛇', year: '辛巳', month: '甲午' },
  { label: '2001-09-25', birth: { year: 2001, month: 9, day: 25 }, zodiac: '天秤座', shengXiao: '蛇', year: '辛巳', month: '丁酉' },
  { label: '1988-12-31', birth: { year: 1988, month: 12, day: 31 }, zodiac: '摩羯座', shengXiao: '龙', year: '戊辰', month: '甲子' },
  { label: '2000-01-01', birth: { year: 2000, month: 1, day: 1 }, zodiac: '摩羯座', shengXiao: '兔', year: '己卯', month: '丙子', day: '戊午', note: '春节前属己卯年；立春前年柱仍为己卯' },
  { label: '2024-02-09', birth: { year: 2024, month: 2, day: 9 }, zodiac: '水瓶座', shengXiao: '兔', year: '甲辰', note: '除夕：生肖仍是兔，年柱已过立春（2/4）为甲辰' },
  { label: '2024-02-10', birth: { year: 2024, month: 2, day: 10 }, zodiac: '水瓶座', shengXiao: '龙', year: '甲辰', note: '春节：生肖换成龙' },
];

/** 星座边界（只看月日） */
export const ZODIAC_BOUNDARIES: { label: string; month: number; day: number; zodiac: string }[] = [
  { label: '1/19', month: 1, day: 19, zodiac: '摩羯座' },
  { label: '1/20', month: 1, day: 20, zodiac: '水瓶座' },
  { label: '8/22', month: 8, day: 22, zodiac: '狮子座' },
  { label: '8/23', month: 8, day: 23, zodiac: '处女座' },
  { label: '12/22', month: 12, day: 22, zodiac: '摩羯座' },
];
