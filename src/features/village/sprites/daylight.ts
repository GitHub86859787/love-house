/**
 * 昼夜换色表：五个时段（清晨 / 白天 / 傍晚 / 入夜 / 深夜），整点跳变，边界前后各 10 分钟用中间表。
 * 调色板 48 色 → 48 色（先按时段调色，再吸附到最近的调色板色，场景里永远只有这 48 色）；
 * 人物用头像色（不在调色板里），走同一套调色公式但不吸附。
 * 原则：深夜是「月夜」不是「停电」——暗部只压到夜天基阶 / 暗阶，亮部保留一档，轮廓分得开；
 *       傍晚是「金色一小时」——整体往橙金偏、亮部提亮，不往褐色压。
 * 光晕：亮窗 / 路灯在地面上留一块暖光池（内圈换回傍晚表，外圈棋盘抖动）。
 */
import { Grid } from '@/pixel/painter';
import type { Season } from '@/lib/season';
import { hexToRgb, rgbToHex } from '@/lib/color';
import { ALL_COLORS, PALETTE } from '../palette';

export type Slot = 'dawn' | 'day' | 'dusk' | 'evening' | 'night';
export const SLOTS: Slot[] = ['dawn', 'day', 'dusk', 'evening', 'night'];
export const SLOT_LABEL: Record<Slot, string> = { dawn: '清晨', day: '白天', dusk: '傍晚', evening: '入夜', night: '深夜' };

/** 时段边界（小时，整点）：[清晨起, 白天起, 傍晚起, 入夜起, 深夜起] */
const BOUNDS: Record<Season, [number, number, number, number, number]> = {
  spring: [6, 8, 17, 19, 22],
  summer: [5, 7, 18, 20, 23],
  autumn: [6, 8, 17, 19, 22],
  winter: [6, 8, 16, 18, 22],
};

export interface SlotState {
  slot: Slot;
  /** 边界前后 10 分钟内：正在过渡到的下一个时段 */
  next?: Slot;
  /** 灯要不要亮：傍晚起亮 */
  lightsOn: boolean;
}

/** 按真实时间取时段；边界 ±10 分钟内返回 next，用中间表 */
export function slotAt(d: Date, season: Season): SlotState {
  const b = BOUNDS[season];
  const min = d.getHours() * 60 + d.getMinutes();
  const order: Slot[] = ['dawn', 'day', 'dusk', 'evening', 'night'];
  let slot: Slot = 'night';
  for (let i = 0; i < 5; i++) if (min >= b[i] * 60) slot = order[i];
  let next: Slot | undefined;
  for (let i = 0; i < 5; i++) {
    const bm = b[i] * 60;
    const dm = Math.min(Math.abs(min - bm), Math.abs(min - bm + 1440), Math.abs(min - bm - 1440));
    if (dm <= 10) {
      const to = order[i];
      const from = order[(i + 4) % 5];
      // 边界前：当前 from、下一个 to；边界后：当前 to、上一个 from
      if (min < bm || (bm === 0 && min > 1380)) { slot = from; next = to; } else { slot = to; next = from; }
    }
  }
  return { slot, next, lightsOn: lightsOn(next ? blendSlot(slot, next) : slot) };
}

function lightsOn(slot: Slot): boolean {
  return slot === 'dusk' || slot === 'evening' || slot === 'night';
}
/** 中间表用哪一边的灯：往夜里走的边界亮灯 */
function blendSlot(a: Slot, b: Slot): Slot {
  return SLOTS.indexOf(a) > SLOTS.indexOf(b) ? a : b;
}

/* ------------------------------ 调色公式 ------------------------------ */
type RGB = [number, number, number];
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const scale = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k];
const lumOf = (a: RGB) => (0.3 * a[0] + 0.59 * a[1] + 0.11 * a[2]) / 255;

/** 时段调色：只做「往某个色偏 + 明度缩放」两步，保证暗 / 基 / 亮的顺序不变 */
export function gradeRgb(c: RGB, slot: Slot): RGB {
  const l = lumOf(c);
  switch (slot) {
    case 'dawn': // 雾蓝粉的清晨：往雾基阶偏（发灰发蓝），亮部不提，晨雾把对比压低
      return scale(mix(mix(c, hexToRgb('#8f9dbf'), 0.3), hexToRgb('#f7b6c6'), 0.06 * (1 - l)), 0.96);
    case 'dusk': // 金色一小时：往橙金偏，亮部更亮，暗部保持（不压成褐色）
      return scale(mix(c, hexToRgb('#f0a040'), 0.28), 1 + 0.1 * l);
    case 'evening': // 入夜：往夜天亮阶偏，整体压到 62%
      return scale(mix(c, hexToRgb('#4b5590'), 0.42), 0.68);
    case 'night': // 深夜（月夜）：往夜天基阶偏，压到 58%；亮部留一点雪亮（月光）
      return mix(scale(mix(c, hexToRgb('#2c3465'), 0.45), 0.58), hexToRgb('#d6e2ee'), 0.08 * l);
    default:
      return c;
  }
}

const PAL_RGB: [string, RGB][] = ALL_COLORS.map((h) => [h, hexToRgb(h)]);
function nearestPalette(c: RGB): string {
  let best = PAL_RGB[0][0];
  let bd = Infinity;
  for (const [h, p] of PAL_RGB) {
    const dr = c[0] - p[0], dg = c[1] - p[1], db = c[2] - p[2];
    const d = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
    if (d < bd) { bd = d; best = h; }
  }
  return best;
}

/** 单张时段换色表（调色板 48 色 → 48 色） */
export type SwapTable = Map<string, string>;
const tableCache = new Map<string, SwapTable>();

/** 手工修正：吸附结果不对的几处（金色灯光在夜里不能变暗，由 emissive 区域处理，这里不管） */
const FIXES: Partial<Record<Slot, Record<string, string>>> = {
  night: {
    // 木头：不能压成墨暗阶（那是停电），墙板留木暗 / 墨亮两档，描边落到墨基
    [PALETTE.wood.light]: PALETTE.wood.dark,
    [PALETTE.wood.base]: PALETTE.ink.light,
    [PALETTE.wood.dark]: PALETTE.ink.base,
    [PALETTE.earth.light]: PALETTE.stone.dark,
    [PALETTE.earth.base]: PALETTE.ink.light,
    [PALETTE.brick.light]: PALETTE.brick.dark,
    [PALETTE.brick.base]: PALETTE.purple.dark,
    // 草地：深夜草基阶吸附到青瓦基阶（偏蓝绿）而不是夜天，才有「月光下的草地」
    [PALETTE.grass.base]: PALETTE.tile.base,
    [PALETTE.grass.light]: PALETTE.tile.light,
    [PALETTE.grass.dark]: PALETTE.tile.dark,
    [PALETTE.snow.light]: PALETTE.mist.light,
    [PALETTE.snow.base]: PALETTE.mist.base,
    [PALETTE.snow.dark]: PALETTE.mist.dark,
    [PALETTE.water.light]: PALETTE.mist.base,
    [PALETTE.plaster.light]: PALETTE.mist.light,
    [PALETTE.plaster.base]: PALETTE.mist.base,
  },
  evening: {
    [PALETTE.grass.light]: PALETTE.grass.base,
    [PALETTE.grass.base]: PALETTE.tile.light,
    [PALETTE.grass.dark]: PALETTE.tile.base,
    [PALETTE.snow.light]: PALETTE.snow.base,
    [PALETTE.snow.base]: PALETTE.mist.light,
    [PALETTE.snow.dark]: PALETTE.mist.base,
  },
  dusk: {
    [PALETTE.grass.light]: PALETTE.autumn.light,
    [PALETTE.snow.light]: PALETTE.plaster.light,
    [PALETTE.snow.base]: PALETTE.plaster.base,
    [PALETTE.plaster.light]: PALETTE.gold.light,
  },
  dawn: {
    [PALETTE.grass.light]: PALETTE.grass.base,
    [PALETTE.grass.base]: PALETTE.grass.base,
    [PALETTE.grass.dark]: PALETTE.tile.base,
    [PALETTE.water.light]: PALETTE.mist.light,
  },
};

export function swapTable(slot: Slot, next?: Slot): SwapTable {
  const key = next ? `${slot}>${next}` : slot;
  const hit = tableCache.get(key);
  if (hit) return hit;
  const t: SwapTable = new Map();
  for (const [h, rgb] of PAL_RGB) {
    if (!next) {
      let v = slot === 'day' ? h : FIXES[slot]?.[h] ?? nearestPalette(gradeRgb(rgb, slot));
      if ((slot === 'night' || slot === 'evening') && v === PALETTE.ink.dark && h !== PALETTE.ink.dark) v = PALETTE.night.dark;
      t.set(h, v);
    } else {
      // 中间表：两个时段结果的中点再吸附
      const a = hexToRgb(swapTable(slot).get(h)!);
      const b = hexToRgb(swapTable(next).get(h)!);
      t.set(h, nearestPalette(mix(a, b, 0.5)));
    }
  }
  tableCache.set(key, t);
  return t;
}

/** 任意颜色（含人物的非调色板色）按时段换色 */
const anyCache = new Map<string, string>();
export function gradeColor(hex: string, slot: Slot, next?: Slot): string {
  const key = `${hex}|${slot}|${next ?? ''}`;
  const hit = anyCache.get(key);
  if (hit) return hit;
  let out: string;
  const table = swapTable(slot, next);
  const inPal = table.get(hex) ?? table.get(hex.toLowerCase());
  if (inPal) out = inPal;
  else {
    const rgb = hexToRgb(hex);
    const a = gradeRgb(rgb, slot);
    const c = next ? mix(a, gradeRgb(rgb, next), 0.5) : a;
    out = rgbToHex(c[0], c[1], c[2]);
  }
  if (anyCache.size > 4000) anyCache.clear();
  anyCache.set(key, out);
  return out;
}

/* ------------------------------ 应用到整张图 ------------------------------ */
export interface Emissive {
  x: number;
  y: number;
  w: number;
  h: number;
}

const GOLD = new Set([PALETTE.gold.dark, PALETTE.gold.base, PALETTE.gold.light]);

/**
 * 给整张合成图套时段表。emissive 里的金色像素（亮窗、灯、水晶球、光晕）不换色。
 * 返回新图，不改原图。
 */
export function applySlot(src: Grid, slot: Slot, next?: Slot, emissive: Emissive[] = []): Grid {
  if (slot === 'day' && !next) return src;
  const out = new Grid(src.w, src.h);
  const isEmissive = (x: number, y: number) => emissive.some((e) => x >= e.x && y >= e.y && x < e.x + e.w && y < e.y + e.h);
  // 一张图里颜色很少（≤ 48 + 人物色），按颜色本地缓存，每个像素只查一次 Map
  const local = new Map<string, string>();
  const w = src.w;
  const data = src.data;
  const od = out.data;
  for (let k = 0; k < data.length; k++) {
    const c = data[k];
    if (!c) continue;
    if (GOLD.has(c) && isEmissive(k % w, (k - (k % w)) / w)) { od[k] = c; continue; }
    let v = local.get(c);
    if (v === undefined) { v = gradeColor(c, slot, next); local.set(c, v); }
    od[k] = v;
  }
  return out;
}

/** 光源：地面上的光池中心（灯下方地面），rx / ry 椭圆半径 */
export interface LightPool {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

/**
 * 在换过夜色的图上铺光池：内圈像素换回「傍晚表」的颜色（暖、亮），外圈 1:1 棋盘抖动。
 * 需要传入换色前的原图 day 来查原色。
 */
export function applyLightPools(night: Grid, day: Grid, pools: LightPool[]): Grid {
  if (!pools.length) return night;
  const out = night.clone();
  for (const p of pools) {
    const x0 = Math.floor(p.cx - p.rx - 2), x1 = Math.ceil(p.cx + p.rx + 2);
    const y0 = Math.floor(p.cy - p.ry - 2), y1 = Math.ceil(p.cy + p.ry + 2);
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const c = day.get(x, y);
        if (!c || !night.get(x, y)) continue;
        const dx = (x + 0.5 - p.cx) / p.rx, dy = (y + 0.5 - p.cy) / p.ry;
        const d = dx * dx + dy * dy;
        if (d <= 0.55) out.set(x, y, gradeColor(c, 'dusk'));
        else if (d <= 1 && (x + y) % 2 === 0) out.set(x, y, gradeColor(c, 'dusk'));
        else if (d <= 1.35 && (x + y) % 2 === 0 && (x >> 1) % 2 === 0) out.set(x, y, gradeColor(c, 'dusk'));
      }
  }
  return out;
}
