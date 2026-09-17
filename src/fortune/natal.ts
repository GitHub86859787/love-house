/**
 * 本命盘（占星）：用 astronomy-engine 本地计算，不交给 AI。
 * 有出生时间 → 太阳到冥王星各自的星座；再有出生地 → 上升、天顶、十二宫（等宫制）。
 */
import * as A from 'astronomy-engine';
import type { Birth } from '@/db/types';
import { birthToSolar } from './chart';

export const SIGNS = ['白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座', '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座'] as const;
export const SIGN_GLYPHS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'] as const;

export interface NatalBody {
  key: string;
  name: string;
  glyph: string;
  /** 黄经 0–360 */
  lon: number;
  sign: string;
  signIndex: number;
  /** 星座内度数 0–30 */
  degree: number;
  house?: number;
}

export interface NatalChart {
  bodies: NatalBody[];
  asc?: NatalBody;
  mc?: NatalBody;
  /** 十二宫起点黄经（等宫制，从上升点起每 30°） */
  houses?: number[];
  /** 假定的时区（小时），没有出生地时按东八区 */
  tz: number;
  assumedTz: boolean;
  utc: string;
  /** 'time' 有时间无地点；'place' 有时间有地点 */
  level: 'time' | 'place';
}

const BODIES: { key: string; name: string; glyph: string; body?: A.Body }[] = [
  { key: 'sun', name: '太阳', glyph: '☉' },
  { key: 'moon', name: '月亮', glyph: '☽' },
  { key: 'mercury', name: '水星', glyph: '☿', body: A.Body.Mercury },
  { key: 'venus', name: '金星', glyph: '♀', body: A.Body.Venus },
  { key: 'mars', name: '火星', glyph: '♂', body: A.Body.Mars },
  { key: 'jupiter', name: '木星', glyph: '♃', body: A.Body.Jupiter },
  { key: 'saturn', name: '土星', glyph: '♄', body: A.Body.Saturn },
  { key: 'uranus', name: '天王星', glyph: '♅', body: A.Body.Uranus },
  { key: 'neptune', name: '海王星', glyph: '♆', body: A.Body.Neptune },
  { key: 'pluto', name: '冥王星', glyph: '♇', body: A.Body.Pluto },
];

export function norm360(x: number): number {
  return ((x % 360) + 360) % 360;
}

function toBody(key: string, name: string, glyph: string, lon: number): NatalBody {
  const l = norm360(lon);
  const signIndex = Math.floor(l / 30);
  return { key, name, glyph, lon: l, sign: SIGNS[signIndex], signIndex, degree: l - signIndex * 30 };
}

/** 地心黄经（真黄道、当日春分点），单位度 */
export function eclipticLongitude(key: string, date: Date): number {
  if (key === 'sun') return A.SunPosition(date).elon;
  if (key === 'moon') return A.EclipticGeoMoon(date).lon;
  const def = BODIES.find((b) => b.key === key);
  if (!def?.body) throw new Error(`unknown body ${key}`);
  const vec = A.GeoVector(def.body, date, true);
  const ect = A.RotateVector(A.Rotation_EQJ_ECT(date), vec);
  return norm360(A.SphereFromVector(ect).lon);
}

/**
 * 上升点与天顶：由当地恒星时（RAMC）、黄赤交角 ε 与纬度 φ 算出。
 * MC = atan2(sin RAMC, cos RAMC · cos ε)
 * ASC = atan2(cos RAMC, −(sin ε · tan φ + cos ε · sin RAMC))
 */
export function ascMc(date: Date, lon: number, lat: number): { asc: number; mc: number; ramc: number } {
  const gast = A.SiderealTime(date); // 小时
  const ramc = norm360(gast * 15 + lon);
  const eps = A.e_tilt(A.MakeTime(date)).tobl;
  const rad = Math.PI / 180;
  const R = ramc * rad;
  const E = eps * rad;
  const P = lat * rad;
  const mc = norm360(Math.atan2(Math.sin(R), Math.cos(R) * Math.cos(E)) / rad);
  const asc = norm360(Math.atan2(Math.cos(R), -(Math.sin(E) * Math.tan(P) + Math.cos(E) * Math.sin(R))) / rad);
  return { asc, mc, ramc };
}

export function houseOf(lon: number, asc: number): number {
  return Math.floor(norm360(lon - asc) / 30) + 1;
}

/** 出生本地时间 → UTC。tz 为标准时区小时数（不含夏令时） */
export function birthToUtc(birth: Birth & { year: number; hour: number }, tz: number): Date {
  const solar = birthToSolar(birth); // 农历生日先换成公历
  const y = solar.getYear();
  const m = solar.getMonth();
  const d = solar.getDay();
  return new Date(Date.UTC(y, m - 1, d, birth.hour - tz, birth.minute ?? 0, 0));
}

export function buildNatal(birth: Birth | undefined): NatalChart | null {
  if (!birth || !birth.year || birth.hour == null) return null;
  const tz = birth.place?.tz ?? 8;
  const utc = birthToUtc({ ...birth, year: birth.year, hour: birth.hour }, tz);
  const bodies = BODIES.map((b) => toBody(b.key, b.name, b.glyph, eclipticLongitude(b.key, utc)));
  const chart: NatalChart = { bodies, tz, assumedTz: !birth.place, utc: utc.toISOString(), level: 'time' };
  if (birth.place) {
    const { asc, mc } = ascMc(utc, birth.place.lon, birth.place.lat);
    chart.asc = toBody('asc', '上升', 'ASC', asc);
    chart.mc = toBody('mc', '天顶', 'MC', mc);
    chart.houses = Array.from({ length: 12 }, (_, i) => norm360(asc + i * 30));
    for (const b of chart.bodies) b.house = houseOf(b.lon, asc);
    chart.level = 'place';
  }
  return chart;
}

export function natalToText(n: NatalChart): string {
  const lines = [
    `本命盘（${n.level === 'place' ? '有出生地：含上升、天顶、十二宫（等宫制）' : '无出生地：只有各行星星座'}${n.assumedTz ? '，出生时间按东八区假定' : ''}）：`,
    ...n.bodies.map((b) => `${b.name} ${b.sign} ${b.degree.toFixed(1)}°${b.house ? ` 第${b.house}宫` : ''}`),
  ];
  if (n.asc) lines.push(`上升 ${n.asc.sign} ${n.asc.degree.toFixed(1)}°`);
  if (n.mc) lines.push(`天顶 ${n.mc.sign} ${n.mc.degree.toFixed(1)}°`);
  return lines.join('\n');
}
