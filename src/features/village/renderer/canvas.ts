/**
 * Grid → canvas 的桥：把像素网格一次性写进离屏 canvas，之后每帧只 drawImage。
 * 动态小件（人物、烟、鸭子）按「网格 + 时段」缓存换色后的 canvas。
 */
import { Grid } from '@/pixel/painter';
import { hexToRgb } from '@/lib/color';
import { gradeColor, type Slot } from '../sprites/daylight';

export type Canvas = HTMLCanvasElement | OffscreenCanvas;

const rgbCache = new Map<string, [number, number, number]>();
function rgb(hex: string): [number, number, number] {
  let v = rgbCache.get(hex);
  if (!v) {
    v = hexToRgb(hex);
    rgbCache.set(hex, v);
  }
  return v;
}

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, w);
  c.height = Math.max(1, h);
  return c;
}

/** 把网格画进新 canvas（透明像素保持透明） */
export function gridToCanvas(g: Grid): HTMLCanvasElement {
  const c = makeCanvas(g.w, g.h);
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(g.w, g.h);
  const d = img.data;
  for (let k = 0; k < g.data.length; k++) {
    const px = g.data[k];
    if (!px) continue;
    const [r, gg, b] = rgb(px);
    const o = k * 4;
    d[o] = r; d[o + 1] = gg; d[o + 2] = b; d[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** 给网格套时段表（不吸附的人物色也一起换），返回新网格 */
export function gradeGrid(g: Grid, slot: Slot, next?: Slot): Grid {
  if (slot === 'day' && !next) return g;
  const out = new Grid(g.w, g.h);
  for (let k = 0; k < g.data.length; k++) {
    const c = g.data[k];
    if (c) out.data[k] = gradeColor(c, slot, next);
  }
  return out;
}

/** 动态小件缓存：同一个 Grid 对象 + 同一时段 → 同一个 canvas */
const spriteCache = new WeakMap<Grid, Map<string, HTMLCanvasElement>>();
export function spriteCanvas(g: Grid, slot: Slot, next?: Slot): HTMLCanvasElement {
  let m = spriteCache.get(g);
  if (!m) {
    m = new Map();
    spriteCache.set(g, m);
  }
  const key = `${slot}|${next ?? ''}`;
  let c = m.get(key);
  if (!c) {
    c = gridToCanvas(gradeGrid(g, slot, next));
    m.set(key, c);
  }
  return c;
}

/** 按名字缓存「每帧新建」的网格（烟、鸭子、船这类函数每次都返回新对象） */
const namedCache = new Map<string, Grid>();
export function memoGrid(key: string, make: () => Grid): Grid {
  let g = namedCache.get(key);
  if (!g) {
    g = make();
    if (namedCache.size > 600) namedCache.clear();
    namedCache.set(key, g);
  }
  return g;
}
