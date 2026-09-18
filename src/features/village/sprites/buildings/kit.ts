/**
 * 建筑通用件：木板墙、木瓦屋顶、玻璃窗、光晕、灯、烟囱、石阶、外圈描边。九栋建筑共用同一套材质语言。
 */
import { Grid } from '@/pixel/painter';
import type { Season } from '@/lib/season';
import { ramp, type Ramp } from '../../palette';
import { irange, type Rng } from '../ground';

export const wd = ramp('wood');
export const br = ramp('brick');
export const st = ramp('stone');
export const gd = ramp('gold');
export const pl = ramp('plaster');
export const mi = ramp('mist');
export const sn = ramp('snow');
export const gr = ramp('grass');
export const ink = ramp('ink');
/** 全部建筑描边色：木暗阶 */
export const O = wd.dark;

export function flowerColors(season: Season): string[] {
  if (season === 'spring') return [ramp('pink').base, gd.light, ramp('pink').light];
  if (season === 'summer') return [gd.base, pl.light, gd.light];
  if (season === 'autumn') return [br.light, gd.base, br.base];
  return [];
}

/** 横向木板墙：fill 基色、seam 板缝、hi 偶尔一块亮板；两侧包角板 */
export function boards(g: Grid, x0: number, x1: number, y0: number, y1: number, rnd: Rng, c: { fill: string; seam: string; hi: string } = { fill: wd.base, seam: wd.dark, hi: wd.light }, corner = true) {
  g.rect(x0, y0, x1 - x0 + 1, y1 - y0 + 1, c.fill);
  for (let y = y0 + 3; y <= y1; y += 4) g.hline(x0, y, x1 - x0 + 1, c.seam);
  for (let k = 0; k < Math.max(3, Math.floor((x1 - x0) / 12)); k++) {
    const bx = irange(rnd, x0 + 2, Math.max(x0 + 2, x1 - 6));
    const by = y0 + irange(rnd, 0, Math.max(0, Math.floor((y1 - y0) / 4) - 1)) * 4;
    if (by <= y1 - 1) g.hline(bx, by, 4, c.hi);
  }
  if (corner) {
    g.rect(x0, y0, 2, y1 - y0 + 1, wd.dark);
    g.rect(x1 - 1, y0, 2, y1 - y0 + 1, wd.dark);
    g.vline(x0 + 1, y0, y1 - y0 + 1, c.fill === wd.light ? wd.base : wd.base);
  }
}

/** 砖墙：砖基 + 白灰暗阶灰缝，砖错缝，偶有亮砖 / 暗砖 */
export function bricks(g: Grid, x0: number, x1: number, y0: number, y1: number, rnd: Rng) {
  g.rect(x0, y0, x1 - x0 + 1, y1 - y0 + 1, br.base);
  for (let y = y0; y <= y1; y++) {
    const row = Math.floor((y - y0) / 4);
    if ((y - y0) % 4 === 3) {
      g.hline(x0, y, x1 - x0 + 1, pl.dark);
      continue;
    }
    for (let x = x0 + ((row % 2) * 4); x <= x1; x += 8) g.set(x, y, pl.dark);
  }
  for (let k = 0; k < Math.floor((x1 - x0) / 6); k++) {
    const bx = x0 + irange(rnd, 0, Math.floor((x1 - x0) / 8)) * 8 + irange(rnd, 0, 1) * 4 + 1;
    const by = y0 + irange(rnd, 0, Math.floor((y1 - y0) / 4)) * 4;
    if (bx + 2 <= x1 && by + 2 <= y1) g.rect(bx, by, 3, 3, rnd() < 0.5 ? br.light : br.dark);
  }
}

export interface ShingleColors {
  /** 交错的两种瓦色 */
  a: string;
  b: string;
  /** 瓦顶受光 */
  top: string;
  /** 靛顶亮阶 */
  hi: string;
  /** 排缝 */
  seam: string;
}
export const SHINGLE_RED: ShingleColors = { a: br.dark, b: wd.dark, top: br.base, hi: br.light, seam: wd.dark };
export const SHINGLE_WOOD: ShingleColors = { a: wd.base, b: wd.dark, top: wd.light, hi: wd.light, seam: wd.dark };
export const SHINGLE_SLATE: ShingleColors = { a: st.dark, b: st.base, top: st.light, hi: st.light, seam: st.dark };
export const SHINGLE_PINK: ShingleColors = { a: ramp('pink').dark, b: ramp('pink').base, top: ramp('pink').light, hi: ramp('pink').light, seam: ramp('pink').dark };
export const SHINGLE_ORANGE: ShingleColors = { a: br.light, b: br.base, top: gd.base, hi: gd.light, seam: br.dark };

/**
 * 木瓦：每排 3 行；每排错开半片瓦（1–2 px 交替）；随机去掉一些暗缝；顶部两排亮阶；右侧背光。
 */
export function shingles(g: Grid, y0: number, y1: number, leftAt: (y: number) => number, rightAt: (y: number) => number, c: ShingleColors, rnd: Rng, litTop = true) {
  for (let y = y0; y <= y1; y++) {
    const l = leftAt(y);
    const r = rightAt(y);
    const course = Math.floor((y - y0) / 3);
    const phase = (y - y0) % 3;
    const off = course % 2 === 0 ? 0 : 2;
    for (let x = l; x <= r; x++) {
      const idx = Math.floor((x + off + course) / 3);
      const k = idx % 2;
      let col = k === 0 ? c.a : c.b;
      if (phase === 0 && k === 0) col = c.top;
      if (litTop && course < 2 && phase === 0) col = c.hi;
      if (phase === 2 && rnd() < 0.75) col = c.seam; // 排缝，随机缺几处
      if ((x + off + course) % 3 === 2 && phase !== 2 && rnd() < 0.85) col = k === 0 ? c.a : c.b; // 瓦缝
      if (x > r - 8 && col === c.top) col = c.a;
      g.set(x, y, col);
    }
  }
}

/** 玻璃：白天远山亮阶 + 斜向白灰反光；夜里金基阶 + 亮点 */
export function glass(g: Grid, x0: number, y0: number, w: number, h: number, night: boolean) {
  g.rect(x0, y0, w, h, night ? gd.base : mi.light);
  if (night) {
    g.set(x0 + 1, y0 + 1, gd.light);
    if (w > 3 && h > 3) g.set(x0 + w - 2, y0 + h - 2, gd.dark);
  } else {
    for (let i = 0; i < Math.min(w, h) - 1; i++) g.set(x0 + w - 2 - i, y0 + 1 + i, pl.light);
  }
}

/** 十字棂窗：框木暗，窗台，可带花箱。夜里只换玻璃，框不变 */
export function win(g: Grid, x0: number, y0: number, w: number, h: number, night: boolean, opts: { sill?: boolean; box?: string[] } = {}) {
  g.rect(x0 - 1, y0 - 1, w + 2, h + 2, wd.dark);
  glass(g, x0, y0, w, h, night);
  g.vline(x0 + Math.floor(w / 2), y0, h, wd.base);
  g.hline(x0, y0 + Math.floor(h / 2), w, wd.base);
  if (opts.sill) {
    g.rect(x0 - 2, y0 + h + 1, w + 4, 2, wd.base);
    g.hline(x0 - 2, y0 + h + 1, w + 4, wd.light);
  }
  if (opts.box) {
    g.rect(x0 - 1, y0 + h + 3, w + 2, 3, wd.base);
    g.hline(x0 - 1, y0 + h + 5, w + 2, wd.dark);
    g.vline(x0 - 1, y0 + h + 3, 3, wd.light);
    if (opts.box.length) {
      for (let i = 0; i < Math.floor(w / 3); i++) {
        const fx = x0 + 1 + i * 3;
        g.set(fx, y0 + h + 1, opts.box[i % 3]);
        g.set(fx + 1, y0 + h + 1, opts.box[(i + 1) % 3]);
        g.set(fx, y0 + h, opts.box[(i + 2) % 3]);
        g.set(fx + 1, y0 + h + 2, gr.dark);
      }
    } else g.hline(x0 - 1, y0 + h + 2, w + 2, sn.light);
  }
}

/**
 * 光晕：只落在墙 / 空白上，不碰窗框。第一圈金暗阶实心，第二圈金暗阶棋盘（不用蓝，整体保持暖色）。
 */
export function halo(g: Grid, x0: number, y0: number, x1: number, y1: number, allowed: (c: string | null) => boolean) {
  const ring = (d: number, dither: boolean) => {
    const put = (x: number, y: number) => {
      if (dither && (x + y) % 2 === 1) return;
      if (allowed(g.get(x, y))) g.set(x, y, gd.dark);
    };
    for (let x = x0 - d; x <= x1 + d; x++) {
      put(x, y0 - d);
      put(x, y1 + d);
    }
    for (let y = y0 - d; y <= y1 + d; y++) {
      put(x0 - d, y);
      put(x1 + d, y);
    }
  };
  ring(1, false);
  ring(2, true);
}

/** 壁灯 / 挂灯 6×6：灭时石色，亮时金色 */
export function lamp(g: Grid, x: number, y: number, night: boolean, kind: 'copper' | 'iron' = 'iron') {
  const body = night ? gd.base : kind === 'copper' ? gd.dark : st.base;
  const core = night ? gd.light : kind === 'copper' ? gd.dark : st.light;
  g.rect(x + 1, y + 1, 4, 4, body);
  g.rect(x + 2, y + 2, 2, 2, core);
  g.hline(x, y, 6, O);
  g.hline(x + 1, y + 5, 4, O);
  g.set(x, y + 1, O);
  g.set(x, y + 4, O);
  g.set(x + 5, y + 1, O);
  g.set(x + 5, y + 4, O);
  g.set(x + 2, y - 1, O);
  g.set(x + 3, y - 1, O);
}

/** 纸灯笼 6×8：红纸、金穗；亮时纸换金 */
export function lantern(g: Grid, x: number, y: number, night: boolean) {
  g.rect(x + 1, y + 1, 4, 5, night ? gd.base : br.base);
  g.vline(x + 1, y + 1, 5, night ? gd.light : br.light);
  g.vline(x + 4, y + 1, 5, night ? gd.dark : br.dark);
  g.hline(x + 1, y, 4, O);
  g.hline(x + 1, y + 6, 4, O);
  g.set(x, y + 2, O);
  g.set(x, y + 4, O);
  g.set(x + 5, y + 2, O);
  g.set(x + 5, y + 4, O);
  g.set(x + 2, y + 7, gd.dark);
  g.set(x + 3, y + 7, gd.dark);
  g.set(x + 2, y - 1, wd.dark);
  g.set(x + 3, y - 1, wd.dark);
}

/** 石砌烟囱 */
export function chimney(g: Grid, x: number, y0: number, h: number, w = 8) {
  g.rect(x, y0, w, h, st.base);
  g.vline(x, y0, h, st.light);
  g.vline(x + w - 1, y0, h, st.dark);
  for (let y = y0 + 3; y < y0 + h; y += 3) for (let bx = x + 1 + (y % 2) * 2; bx < x + w - 1; bx += 4) g.set(bx, y, st.dark);
  g.rect(x - 1, y0, w + 2, 2, st.dark);
  g.hline(x - 1, y0, w + 2, st.light);
}

/** 木台阶 n 级，从 y 往下，每级 3 行、每级两边各宽 2 px */
export function steps(g: Grid, cx: number, y: number, w0: number, n: number, c: Ramp = wd) {
  for (let i = 0; i < n; i++) {
    const w = w0 + i * 4;
    const x = Math.round(cx - w / 2);
    g.rect(x, y + i * 3, w, 3, c.base);
    g.hline(x, y + i * 3, w, c.light);
    g.hline(x, y + i * 3 + 2, w, c.dark);
  }
}

/** 石板小径：宽 12，从 y0 到 y1 */
export function stonePath(g: Grid, x0: number, y0: number, y1: number, w = 12) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x < x0 + w; x++) g.set(x, y, (x + y) % 5 === 0 ? st.dark : (x * 3 + y) % 7 === 0 ? st.light : st.base);
}

/** 整体外圈描边（木暗阶） */
export function outlineAll(g: Grid, color = O) {
  const src = g.clone();
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    if (src.get(x, y)) continue;
    if (src.get(x - 1, y) || src.get(x + 1, y) || src.get(x, y - 1) || src.get(x, y + 1)) g.set(x, y, color);
  }
}

/** 屋顶积雪：在给定颜色集合的像素上按行铺雪 */
export function snowOn(g: Grid, x0: number, x1: number, y0: number, y1: number, roofColors: Set<string>, every = 3) {
  for (let y = y0; y <= y1; y += every) for (let x = x0; x <= x1; x++) {
    const c = g.get(x, y);
    if (c && roofColors.has(c) && (x * 5 + y) % 4 !== 0) g.set(x, y, sn.light);
  }
}

/** 趴着的小狗 12×7，2 帧 */
export function dog(g: Grid, x: number, y: number, frame: number) {
  const e = ramp('earth');
  const rows = frame % 2 === 0
    ? ['...OOOO.....', '..OBBBBO....', '.OBBBLBBOOO.', 'OBBBBBBBBBBO', 'OBKBBBBBBBBO', '.OBBBOOOBBO.', '..OOO...OO..']
    : ['............', '...OOOO.....', '..OBBBBOOO..', '.OBBBLBBBBO.', 'OBBBBBBBBBBO', 'OBKBBOOOBBBO', '.OOOO...OO..'];
  g.paste(x, y, rows, { O, B: e.base, L: e.light, K: ink.dark });
}

/** 允许光晕覆盖的颜色：墙、空白 */
export const wallish = (c: string | null) => !c || c === wd.base || c === wd.light || c === wd.dark || c === pl.base || c === pl.light || c === pl.dark || c === br.base || c === br.light || c === st.base;

export const ROOF_RED_SET = new Set([br.dark, br.base, br.light, wd.dark]);
