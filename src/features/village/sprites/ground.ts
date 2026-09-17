/**
 * 地面图块（返工版）：每一格都是"画"出来的，不是填出来的。
 * - 草：每格 4–6 簇草茬 + 1–2 块暗阶密处 + 散点，四个变体肉眼可辨（普通 / 暗块多 / 稀疏 / 带小花小石）
 * - 路：颗粒 + 石色碎石 + 断续车辙；草路交界锯齿（草侵入 1–2 px，直线不超 4 px）；上左亮、下右暗，路面微凹
 * - 田：垄顶亮、垄侧基、垄沟暗（沟底再压一点木暗）；作物四季不同高度
 * - 石板：缝里青苔（春夏草暗 / 秋冬土暗），每块左上高光右下暗
 * - 屋前土地：脚印、碎石、颗粒
 * 光源左上。所有颜色来自 palette.ts；密度 ≥ 15% 非基色像素由单测保证。
 */
import { Grid } from '@/pixel/painter';
import type { Season } from '@/lib/season';
import { ramp, SEASON_RAMPS, type Ramp } from '../palette';
import { hash2, TILE } from './tile';

/* ------------------------------ 工具 ------------------------------ */
export type Rng = () => number;
/** 同一格同一用途每次画出来一样 */
export function makeRng(x: number, y: number, salt: number): Rng {
  let i = 0;
  return () => hash2(x, y, salt * 1000 + i++);
}
export const pick = <T,>(rnd: Rng, arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
export const irange = (rnd: Rng, lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));

/** 非基色像素数不够就补散点，直到达到 min（验收：≥ 15% ≈ 39 px） */
function ensureDensity(g: Grid, base: string, min: number, rnd: Rng, colors: string[]) {
  let count = g.data.filter((c) => c && c !== base).length;
  let guard = 0;
  while (count < min && guard++ < 400) {
    const px = irange(rnd, 0, TILE - 1);
    const py = irange(rnd, 0, TILE - 1);
    if (g.get(px, py) === base) {
      g.set(px, py, pick(rnd, colors));
      count++;
    }
  }
}

/* ------------------------------ 草 ------------------------------ */
export type GrassVariant = 'normal' | 'dense' | 'sparse' | 'flowers';
export const GRASS_VARIANTS: GrassVariant[] = ['normal', 'dense', 'sparse', 'flowers'];

/** 一簇草茬：三种形，2–3 像素，暗阶为主，偶尔顶部亮阶 */
function tuft(g: Grid, x: number, y: number, r: Ramp, rnd: Rng, allowLight: boolean) {
  const shape = irange(rnd, 0, 2);
  if (shape === 0) {
    // L 形
    g.set(x, y, r.dark);
    g.set(x + 1, y, r.dark);
    g.set(x, y - 1, allowLight && rnd() < 0.3 ? r.light : r.dark);
  } else if (shape === 1) {
    // 斜两点
    g.set(x, y, r.dark);
    g.set(x + 1, y - 1, r.dark);
  } else {
    // 三叶
    g.set(x, y, r.dark);
    g.set(x + 1, y, r.dark);
    g.set(x + 2, y, r.dark);
    g.set(x + 1, y - 1, allowLight && rnd() < 0.4 ? r.light : r.dark);
  }
}

function grassBase(season: Season, variant: GrassVariant, x: number, y: number): Grid {
  const r = SEASON_RAMPS[season].grass;
  const g = new Grid(TILE, TILE).rect(0, 0, TILE, TILE, r.base);
  const rnd = makeRng(x, y, 100 + GRASS_VARIANTS.indexOf(variant));

  if (season === 'winter') {
    // 雪地：小阴影窝、雪堆边、反光点；dense 变体露几根枯草
    const drifts = variant === 'dense' ? 3 : variant === 'sparse' ? 1 : 2;
    for (let k = 0; k < drifts; k++) {
      const w = irange(rnd, 2, 4);
      g.rect(irange(rnd, 0, TILE - w), irange(rnd, 0, TILE - 2), w, 1, r.dark);
    }
    const dots = variant === 'sparse' ? 3 : 5;
    for (let k = 0; k < dots; k++) g.set(irange(rnd, 0, TILE - 1), irange(rnd, 0, TILE - 1), r.dark);
    for (let k = 0; k < 4; k++) g.set(irange(rnd, 0, TILE - 1), irange(rnd, 0, TILE - 1), r.light);
    if (variant === 'dense') {
      const a = ramp('autumn');
      for (let k = 0; k < 2; k++) {
        const sx = irange(rnd, 1, TILE - 2);
        const sy = irange(rnd, 3, TILE - 1);
        g.set(sx, sy, a.dark);
        g.set(sx, sy - 1, a.dark);
        g.set(sx + (rnd() < 0.5 ? 1 : -1), sy - 2, a.base);
      }
    }
    if (variant === 'flowers') {
      // 雪里露出的一小块土
      const e = ramp('earth');
      const sx = irange(rnd, 2, TILE - 4);
      const sy = irange(rnd, 2, TILE - 3);
      g.rect(sx, sy, 2, 1, e.dark);
    }
    ensureDensity(g, r.base, 40, rnd, [r.dark, r.dark, r.light]);
    return g;
  }

  // 暗阶密处：2×2 或 3×2
  const blocks = variant === 'dense' ? 2 : variant === 'sparse' ? 1 : variant === 'flowers' ? 1 : 1;
  for (let k = 0; k < blocks; k++) {
    const w = rnd() < 0.5 ? 2 : 3;
    g.rect(irange(rnd, 0, TILE - w), irange(rnd, 0, TILE - 2), w, 2, r.dark);
  }
  // 草茬簇：分布不均匀（先挑一个重心，簇往那边偏）
  const tufts = variant === 'dense' ? 6 : variant === 'sparse' ? 4 : 5;
  const cx = irange(rnd, 3, 12);
  const cy = irange(rnd, 3, 12);
  for (let k = 0; k < tufts; k++) {
    const near = rnd() < 0.6;
    const tx = near ? Math.max(0, Math.min(TILE - 3, cx + irange(rnd, -4, 4))) : irange(rnd, 0, TILE - 3);
    const ty = near ? Math.max(1, Math.min(TILE - 1, cy + irange(rnd, -4, 4))) : irange(rnd, 1, TILE - 1);
    tuft(g, tx, ty, r, rnd, variant !== 'dense');
  }
  // 散点
  const specks = variant === 'dense' ? 10 : variant === 'sparse' ? 4 : 7;
  for (let k = 0; k < specks; k++) g.set(irange(rnd, 0, TILE - 1), irange(rnd, 0, TILE - 1), r.dark);
  if (variant === 'sparse') for (let k = 0; k < 3; k++) g.set(irange(rnd, 0, TILE - 1), irange(rnd, 0, TILE - 1), r.light);

  if (variant === 'flowers') {
    const p = ramp('plaster');
    const s = ramp('stone');
    const flowerColor = season === 'autumn' ? ramp('gold').light : p.light;
    const flowerSide = season === 'autumn' ? ramp('gold').base : p.base;
    for (let k = 0; k < 2; k++) {
      const fx = irange(rnd, 1, TILE - 3);
      const fy = irange(rnd, 1, TILE - 2);
      g.set(fx, fy, flowerColor);
      g.set(fx + 1, fy, flowerSide);
      g.set(fx, fy + 1, r.dark);
    }
    void s;
  }
  ensureDensity(g, r.base, 40, rnd, [r.dark, r.dark, r.dark, r.light]);
  return g;
}

export function grassTile(season: Season, variant: GrassVariant | number, x = 0, y = 0): Grid {
  const v = typeof variant === 'number' ? GRASS_VARIANTS[variant % GRASS_VARIANTS.length] : variant;
  return grassBase(season, v, x, y);
}

/** 按坐标挑变体：普通为主，暗块多 / 稀疏 / 小花各占一部分 */
export function grassAt(season: Season, x: number, y: number): Grid {
  const h = hash2(x, y, 1);
  const v: GrassVariant = h < 0.5 ? 'normal' : h < 0.7 ? 'dense' : h < 0.88 ? 'sparse' : 'flowers';
  return grassBase(season, v, x, y);
}

/* ------------------------------ 路：锯齿轮廓 ------------------------------ */
export interface Edges {
  n: boolean;
  s: boolean;
  e: boolean;
  w: boolean;
}
export interface Corners {
  ne: boolean;
  nw: boolean;
  se: boolean;
  sw: boolean;
}
const NO_CORNERS: Corners = { ne: false, nw: false, se: false, sw: false };

/**
 * 锯齿轮廓：沿边每个位置草侵入路的深度 0–2 px，按 2–4 px 一段，相邻段深度不同，
 * 所以交界处任何一段直线都不超过 4 px。
 */
export function jaggedProfile(len: number, rnd: Rng, avoidFirst = -1): number[] {
  const out: number[] = [];
  let last = avoidFirst;
  while (out.length < len) {
    let d = irange(rnd, 0, 2);
    if (d === last) d = (d + 1 + irange(rnd, 0, 1)) % 3;
    const run = irange(rnd, 2, 4);
    for (let k = 0; k < run && out.length < len; k++) out.push(d);
    last = d;
  }
  return out;
}

/** 路格的路 / 草掩码：true = 路 */
/** 某格某侧的锯齿轮廓；首段深度避开左（上）邻格末段深度，跨格也不连成直线 */
function edgeProfile(x: number, y: number, side: 'n' | 's' | 'w' | 'e'): number[] {
  const salt = { n: 201, s: 202, w: 203, e: 204 }[side];
  const gen = (px: number, py: number, avoid: number) => jaggedProfile(TILE, makeRng(px, py, salt), avoid);
  const prevX = side === 'n' || side === 's' ? x - 1 : x;
  const prevY = side === 'n' || side === 's' ? y : y - 1;
  const prev = gen(prevX, prevY, -1);
  return gen(x, y, prev[TILE - 1]);
}

export function walkMask(edges: Edges, corners: Corners, rnd: Rng, x: number, y: number): boolean[][] {
  const m: boolean[][] = Array.from({ length: TILE }, () => Array<boolean>(TILE).fill(true));
  const n = edges.n ? edgeProfile(x, y, 'n') : null;
  const s = edges.s ? edgeProfile(x, y, 's') : null;
  const w = edges.w ? edgeProfile(x, y, 'w') : null;
  const e = edges.e ? edgeProfile(x, y, 'e') : null;
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      let grass = false;
      if (n && y < n[x]) grass = true;
      if (s && y >= TILE - s[x]) grass = true;
      if (w && x < w[y]) grass = true;
      if (e && x >= TILE - e[y]) grass = true;
      if (grass) m[y][x] = false;
    }
  }
  // 外圆角：两边都是草的角再切一个 3 px 斜角，带一点随机
  const cut = (cx: number, cy: number, dx: number, dy: number) => {
    const r = irange(rnd, 3, 4);
    for (let j = 0; j < r; j++) for (let i = 0; i < r - j; i++) m[cy + dy * j][cx + dx * i] = false;
  };
  if (edges.n && edges.w) cut(0, 0, 1, 1);
  if (edges.n && edges.e) cut(TILE - 1, 0, -1, 1);
  if (edges.s && edges.w) cut(0, TILE - 1, 1, -1);
  if (edges.s && edges.e) cut(TILE - 1, TILE - 1, -1, -1);
  // 内角：斜对角是草而两侧都是路时，角上补一小块草，让拐角圆润
  const inner = (cx: number, cy: number, dx: number, dy: number) => {
    const r = irange(rnd, 2, 3);
    for (let j = 0; j < r; j++) for (let i = 0; i < r - j; i++) m[cy + dy * j][cx + dx * i] = false;
  };
  if (corners.nw && !edges.n && !edges.w) inner(0, 0, 1, 1);
  if (corners.ne && !edges.n && !edges.e) inner(TILE - 1, 0, -1, 1);
  if (corners.sw && !edges.s && !edges.w) inner(0, TILE - 1, 1, -1);
  if (corners.se && !edges.s && !edges.e) inner(TILE - 1, TILE - 1, -1, -1);
  return m;
}

/**
 * 路块。edges：哪一侧接草；corners：哪个斜对角是草（用于内角）。
 * 草的部分透明（底下的草格透出来），交界处在草侧点几粒草暗阶。
 */
export function pathTile(season: Season, edges: Edges, x = 0, y = 0, corners: Corners = NO_CORNERS): Grid {
  const r = ramp('earth');
  const gr = SEASON_RAMPS[season].grass;
  const st = ramp('stone');
  const rnd = makeRng(x, y, 200);
  const mask = walkMask(edges, corners, rnd, x, y);
  const isPath = (px: number, py: number): boolean => {
    if (px >= 0 && px < TILE && py >= 0 && py < TILE) return mask[py][px];
    // 格外：接草的那一侧算草，其他方向算路
    if (py < 0) return !edges.n && !(px < 0 && corners.nw) && !(px >= TILE && corners.ne);
    if (py >= TILE) return !edges.s && !(px < 0 && corners.sw) && !(px >= TILE && corners.se);
    if (px < 0) return !edges.w;
    return !edges.e;
  };
  const g = new Grid(TILE, TILE);
  const interior: [number, number][] = [];
  for (let py = 0; py < TILE; py++) {
    for (let px = 0; px < TILE; px++) {
      if (!mask[py][px]) {
        // 草侧：交界处点草茬
        if ((isPath(px + 1, py) || isPath(px - 1, py) || isPath(px, py + 1) || isPath(px, py - 1)) && rnd() < 0.35) g.set(px, py, gr.dark);
        continue;
      }
      const grassN = !isPath(px, py - 1);
      const grassW = !isPath(px - 1, py);
      const grassS = !isPath(px, py + 1);
      const grassE = !isPath(px + 1, py);
      if (grassN || grassW) g.set(px, py, r.light);
      else if (grassS || grassE) g.set(px, py, r.dark);
      else {
        g.set(px, py, r.base);
        interior.push([px, py]);
      }
    }
  }
  // 车辙：沿路方向两条断续暗阶线，间距 6 px
  const horizontal = edges.n || edges.s ? !(edges.e || edges.w) : edges.e || edges.w ? false : rnd() < 0.5;
  const straight = (edges.n || edges.s) !== (edges.e || edges.w) || (!edges.n && !edges.s && !edges.e && !edges.w);
  if (straight) {
    const off = irange(rnd, 0, 4);
    for (let k = 0; k < TILE; k++) {
      if ((k + off) % 5 >= 3) continue;
      for (const line of [5, 11]) {
        const px = horizontal ? k : line;
        const py = horizontal ? line : k;
        if (mask[py][px] && g.get(px, py) === r.base) g.set(px, py, r.dark);
      }
    }
  }
  // 颗粒 10–14：暗为主，亮做碎石反光
  const grains = irange(rnd, 10, 14);
  for (let k = 0; k < grains && interior.length; k++) {
    const [px, py] = pick(rnd, interior);
    if (g.get(px, py) === r.base) g.set(px, py, rnd() < 0.6 ? r.dark : r.light);
  }
  // 碎石：每格最多 1 处，土暗 2×1（不用石色，3× 下不会成蓝点）
  if (interior.length && rnd() < 0.7) {
    const [px, py] = pick(rnd, interior);
    if (px + 1 < TILE && mask[py][px + 1]) {
      g.set(px, py, r.dark);
      g.set(px + 1, py, r.dark);
    }
  }
  void st;
  // 密度兜底：路面像素里非基色 ≥ 15%
  const pathPixels = g.data.filter((c) => c).length;
  ensureDensity(g, r.base, Math.ceil(pathPixels * 0.16), rnd, [r.dark, r.dark, r.light]);
  return g;
}

/* ------------------------------ 屋前土地 ------------------------------ */
export function dirtTile(x = 0, y = 0): Grid {
  const r = ramp('earth');
  const st = ramp('stone');
  const rnd = makeRng(x, y, 300);
  const g = new Grid(TILE, TILE).rect(0, 0, TILE, TILE, r.base);
  // 脚印：2×3 暗阶，两只一组错开
  const fx = irange(rnd, 1, 9);
  const fy = irange(rnd, 1, 9);
  g.rect(fx, fy, 2, 3, r.dark);
  g.rect(fx + 3, fy + 2, 2, 3, r.dark);
  // 碎石：土暗 2×1 一处
  const sx = irange(rnd, 1, TILE - 4);
  const sy = irange(rnd, 1, TILE - 3);
  g.rect(sx, sy, 2, 1, r.dark);
  void st;
  // 颗粒
  for (let k = 0; k < 9; k++) g.set(irange(rnd, 0, TILE - 1), irange(rnd, 0, TILE - 1), rnd() < 0.65 ? r.dark : r.light);
  ensureDensity(g, r.base, 40, rnd, [r.dark, r.dark, r.light]);
  return g;
}

/* ------------------------------ 广场石板 ------------------------------ */
/**
 * 石板：8×8 一块横向错缝；缝里点青苔（春夏草暗 / 秋冬土暗）；每块左上 1 px 亮、右下 1 px 暗；偶有缺角板。
 */
export function stoneTile(season: Season, x = 0, y = 0): Grid {
  // 注意：石板本身是石色，这是它该有的颜色
  const r = ramp('stone');
  const moss = season === 'spring' || season === 'summer' ? ramp('grass').dark : ramp('earth').dark;
  const rnd = makeRng(x, y, 400);
  const g = new Grid(TILE, TILE).rect(0, 0, TILE, TILE, r.base);
  const shift = y % 2 === 0 ? 0 : 4;
  // 板块起点（x 方向），上排与下排错开
  const rows: { y0: number; xs: number[] }[] = [
    { y0: 0, xs: [shift - 8, shift, shift + 8] },
    { y0: 8, xs: [((shift + 4) % 8) - 8, (shift + 4) % 8, ((shift + 4) % 8) + 8] },
  ];
  for (const row of rows) {
    g.hline(0, row.y0 + 7, TILE, r.dark); // 横缝
    for (const x0 of row.xs) {
      const right = x0 + 7;
      if (right >= 0 && right < TILE) g.vline(right, row.y0, 7, r.dark); // 竖缝
      // 高光 / 暗角
      if (x0 >= 0 && x0 < TILE) {
        g.set(x0, row.y0, r.light);
        g.set(x0 + 1, row.y0, r.light);
        g.set(x0, row.y0 + 1, r.light);
      }
      if (right - 1 >= 0 && right - 1 < TILE) g.set(right - 1, row.y0 + 6, r.dark);
      // 缺角板：偶尔一块右下角缺一小块
      if (rnd() < 0.18 && right - 2 >= 0 && right < TILE) g.rect(right - 2, row.y0 + 5, 2, 2, r.dark);
    }
  }
  // 青苔：缝里 3–5 点
  const mossN = irange(rnd, 3, 5);
  for (let k = 0; k < mossN; k++) {
    const px = irange(rnd, 0, TILE - 1);
    const py = irange(rnd, 0, TILE - 1);
    if (g.get(px, py) === r.dark) g.set(px, py, moss);
  }
  return g;
}

/* ------------------------------ 田 ------------------------------ */
/**
 * 田：垄横向，每 4 行一垄：顶 1 行亮、侧 2 行基、沟 1 行暗（沟里再压 2–3 点木暗）。
 * 作物：春 嫩苗 2 px · 夏 叶簇 3 宽 × 3–4 高 · 秋 麦：杆 + 金穗 · 冬 雪盖垄、沟里露土暗
 */
export function fieldTile(season: Season, x = 0, y = 0): Grid {
  const e = ramp('earth');
  const c = SEASON_RAMPS[season].crop;
  const wood = ramp('wood');
  const rnd = makeRng(x, y, 500);
  const g = new Grid(TILE, TILE);
  if (season === 'winter') {
    g.rect(0, 0, TILE, TILE, c.base);
    for (let row = 0; row < TILE; row += 4) {
      g.hline(0, row, TILE, c.light); // 垄顶反光
      g.hline(0, row + 3, TILE, c.dark); // 沟
      for (let k = 0; k < 3; k++) g.set(irange(rnd, 0, TILE - 1), row + 3, e.dark); // 沟里露土
      g.set(irange(rnd, 0, TILE - 1), row + 1, c.dark);
    }
    return g;
  }
  g.rect(0, 0, TILE, TILE, e.base);
  for (let row = 0; row < TILE; row += 4) {
    g.hline(0, row, TILE, e.light);
    g.hline(0, row + 3, TILE, e.dark);
    for (let k = 0; k < 3; k++) g.set(irange(rnd, 0, TILE - 1), row + 3, wood.dark);
    g.set(irange(rnd, 0, TILE - 1), row + 2, e.dark);
  }
  const off = (x + y) % 2 === 0 ? 1 : 3;
  for (let row = 0; row < TILE; row += 4) {
    for (let k = 0; k < 4; k++) {
      const px = off + k * 4 + (rnd() < 0.3 ? 1 : 0);
      if (px >= TILE - 1) continue;
      if (season === 'spring') {
        g.set(px, row + 1, c.light);
        g.set(px, row + 2, c.base);
      } else if (season === 'summer') {
        // 叶簇：3 宽，3–4 高，顶亮中基底暗
        const tall = rnd() < 0.5;
        const top = tall ? row - 1 : row;
        if (top >= 0) g.set(px, top, c.light);
        g.set(px, top + 1, c.base);
        g.set(px - 1, top + 1, c.base);
        g.set(px + 1, top + 1, c.light);
        g.set(px - 1, top + 2, c.dark);
        g.set(px, top + 2, c.base);
        g.set(px + 1, top + 2, c.dark);
        if (top + 3 <= row + 2) g.set(px, top + 3, c.dark);
      } else {
        // 麦：秋草暗做杆，金穗
        g.set(px, row + 2, c.dark);
        g.set(px, row + 1, c.dark);
        g.set(px, row, c.base);
        g.set(px + 1, row, c.light);
        if (row - 1 >= 0) g.set(px, row - 1, c.light);
      }
    }
  }
  return g;
}

/* ------------------------------ 预览用：图块表与拼合样例 ------------------------------ */
export interface SheetItem {
  name: string;
  grid: Grid;
}

export function groundSheet(season: Season): SheetItem[] {
  const items: SheetItem[] = [];
  const names: Record<GrassVariant, string> = { normal: '草 普通', dense: '草 暗块多', sparse: '草 稀疏', flowers: season === 'winter' ? '雪 露土' : '草 小花' };
  GRASS_VARIANTS.forEach((v) => items.push({ name: names[v], grid: grassTile(season, v, 2, 3) }));
  const E = (n: boolean, s: boolean, e: boolean, w: boolean): Edges => ({ n, s, e, w });
  const P = (name: string, edges: Edges, corners?: Corners, salt = 0) => items.push({ name, grid: pathTile(season, edges, 3 + salt, 3, corners) });
  P('路 中', E(false, false, false, false));
  P('路 上边', E(true, false, false, false));
  P('路 下边', E(false, true, false, false));
  P('路 左边', E(false, false, false, true));
  P('路 右边', E(false, false, true, false));
  P('路 左上角', E(true, false, false, true));
  P('路 右上角', E(true, false, true, false));
  P('路 左下角', E(false, true, false, true));
  P('路 右下角', E(false, true, true, false));
  P('路 横带', E(true, true, false, false));
  P('路 竖带', E(false, false, true, true));
  P('路 尽头', E(true, false, true, true));
  P('路 内角', E(false, false, false, false), { ne: false, nw: true, se: true, sw: false }, 1);
  items.push({ name: '土地', grid: dirtTile(1, 2) });
  items.push({ name: '石板 A', grid: stoneTile(season, 0, 0) });
  items.push({ name: '石板 B', grid: stoneTile(season, 0, 1) });
  items.push({ name: '田 A', grid: fieldTile(season, 0, 0) });
  items.push({ name: '田 B', grid: fieldTile(season, 1, 0) });
  return items;
}

type Kind = 'g' | 'p' | 's' | 'f' | 'd';
/** 样例布局 12×8：横路 + 竖路（下端尽头）+ 一条短支路，右上石板，左下田，右下屋前土地 */
export function demoLayout(): Kind[][] {
  const W = 12;
  const H = 8;
  const map: Kind[][] = Array.from({ length: H }, () => Array<Kind>(W).fill('g'));
  for (let x = 0; x < W; x++) map[3][x] = 'p';
  for (let y = 0; y < 6; y++) map[y][5] = 'p';
  map[1][7] = 'p';
  map[2][7] = 'p';
  for (let y = 0; y < 2; y++) for (let x = 9; x < 12; x++) map[y][x] = 's';
  for (let y = 5; y < 7; y++) for (let x = 1; x < 4; x++) map[y][x] = 'f';
  for (let y = 5; y < 7; y++) for (let x = 8; x < 10; x++) map[y][x] = 'd';
  return map;
}

/** 按布局把地面拼成一张图（场景地面层也走这条路） */
export function composeGround(season: Season, map: Kind[][]): Grid {
  const H = map.length;
  const W = map[0].length;
  const at = (x: number, y: number): Kind => (y < 0 || y >= H || x < 0 || x >= W ? 'g' : map[y][x]);
  const walkable = (k: Kind) => k === 'p' || k === 's' || k === 'd';
  const g = new Grid(W * TILE, H * TILE);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = map[y][x];
      if (k !== 'f') g.compose(grassAt(season, x, y), x * TILE, y * TILE);
      let t: Grid | null = null;
      if (k === 'p') {
        const edges: Edges = { n: !walkable(at(x, y - 1)), s: !walkable(at(x, y + 1)), e: !walkable(at(x + 1, y)), w: !walkable(at(x - 1, y)) };
        const corners: Corners = { ne: !walkable(at(x + 1, y - 1)), nw: !walkable(at(x - 1, y - 1)), se: !walkable(at(x + 1, y + 1)), sw: !walkable(at(x - 1, y + 1)) };
        t = pathTile(season, edges, x, y, corners);
      } else if (k === 's') t = stoneTile(season, x, y);
      else if (k === 'f') t = fieldTile(season, x, y);
      else if (k === 'd') t = dirtTile(x, y);
      if (t) g.compose(t, x * TILE, y * TILE);
    }
  }
  return g;
}

export function groundDemo(season: Season): Grid {
  return composeGround(season, demoLayout());
}
