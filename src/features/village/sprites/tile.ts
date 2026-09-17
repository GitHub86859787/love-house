/**
 * 图块 DSL：16×16 字符画 + 字母 → 颜色表，画成 Grid。
 * 约定字母：L / B / D = 主色带亮 / 基 / 暗，O = 主色带描边；l / b / d / o = 副色带；'.' 透明。
 */
import { Grid } from '@/pixel/painter';
import type { Ramp } from '../palette';

export const TILE = 16;

export type Art = string[];

export function letters(main: Ramp, sub?: Ramp, extra: Record<string, string> = {}): Record<string, string> {
  const m: Record<string, string> = { L: main.light, B: main.base, D: main.dark, O: main.outline };
  if (sub) Object.assign(m, { l: sub.light, b: sub.base, d: sub.dark, o: sub.outline });
  return { ...m, ...extra };
}

export function tile(rows: Art, map: Record<string, string>, w = TILE, h = TILE): Grid {
  const g = new Grid(w, h);
  g.paste(0, 0, rows, map);
  return g;
}

/** 整块填满一色 */
export function solid(c: string, w = TILE, h = TILE): Grid {
  return new Grid(w, h).rect(0, 0, w, h, c);
}

/** 确定性伪随机：同一格每次画出来一样 */
export function hash2(x: number, y: number, salt = 0): number {
  let h = (x * 374761393 + y * 668265263 + salt * 1442695041) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** 把多张 16×16 拼成一张大图（预览 / 场景地面层用） */
export function mosaic(cols: number, rows: number, pick: (x: number, y: number) => Grid | null): Grid {
  const g = new Grid(cols * TILE, rows * TILE);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const t = pick(x, y);
    if (t) g.compose(t, x * TILE, y * TILE);
  }
  return g;
}
