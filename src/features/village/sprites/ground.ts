/**
 * 地面图块：草（每季 4 变体）、土路（自动拼接 13 块）、广场石板、田（四季）、屋前土地。
 * 光源左上：亮阶只出现在上 / 左侧，暗阶在下 / 右侧。
 */
import { Grid } from '@/pixel/painter';
import type { Season } from '@/lib/season';
import { ramp, SEASON_RAMPS, type Ramp } from '../palette';
import { hash2, letters, TILE, tile, type Art } from './tile';

/* ------------------------------ 草 ------------------------------ */
// 四个变体：草茬位置不同；冬天变体是雪地（雪暗阶做小阴影、亮阶做反光）
const GRASS_ART: Art[] = [
  [
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBDBBBBB',
    'BBBDBBBBBDLDBBBB',
    'BBDLDBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBDBBBBBBBB',
    'BBBBBBDLDBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBDBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
  ],
  [
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBDBBB',
    'BBBDBBBBBBBDLDBB',
    'BBDLDBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBDBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
  ],
  [
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
  ],
  [
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBDBBBBB',
    'BBBBBBBBBDLDBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
  ],
];

// 雪地变体：小阴影窝（D）与反光点（L）
const SNOW_ART: Art[] = [
  [
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBLBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBDDBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBLBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
  ],
  [
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBLBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBDDBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
  ],
  GRASS_ART[2],
  GRASS_ART[2],
];

export function grassTile(season: Season, variant: number): Grid {
  const r = SEASON_RAMPS[season].grass;
  const art = season === 'winter' ? SNOW_ART : GRASS_ART;
  return tile(art[variant % art.length], letters(r));
}

/** 按坐标挑变体：大部分是平草，约 40% 带草茬 */
export function grassAt(season: Season, x: number, y: number): Grid {
  const h = hash2(x, y, 1);
  const variant = h < 0.6 ? 2 : h < 0.75 ? 0 : h < 0.9 ? 1 : 3;
  return grassTile(season, variant);
}

/* ------------------------------ 土路（自动拼接） ------------------------------ */
export type Dir = 'n' | 's' | 'e' | 'w';
export interface Edges {
  n: boolean;
  s: boolean;
  e: boolean;
  w: boolean;
}

/** 路面本体：土基阶 + 稀疏碎石（亮）与土痕（暗），按坐标撒 */
function pathBody(r: Ramp, x: number, y: number): Grid {
  const g = new Grid(TILE, TILE).rect(0, 0, TILE, TILE, r.base);
  for (let k = 0; k < 3; k++) {
    const px = Math.floor(hash2(x, y, 10 + k) * 14) + 1;
    const py = Math.floor(hash2(x, y, 20 + k) * 14) + 1;
    g.set(px, py, k === 0 ? r.dark : r.light);
    if (k === 1) g.set(px + 1, py, r.light);
  }
  return g;
}

/**
 * 路块：edges 标出哪一侧接的是草（要描边 + 切圆角）。
 * 描边用土暗阶 1 px；朝上 / 左的边里侧再加 1 px 亮阶（左上光源）。
 */
export function pathTile(season: Season, edges: Edges, x = 0, y = 0): Grid {
  const r = ramp('earth');
  const g = pathBody(r, x, y);
  const n = TILE - 1;
  if (edges.n) {
    g.hline(0, 0, TILE, r.dark);
    g.hline(1, 1, TILE - 2, r.light);
  }
  if (edges.s) g.hline(0, n, TILE, r.dark);
  if (edges.w) {
    g.vline(0, 0, TILE, r.dark);
    g.vline(1, 1, TILE - 2, r.light);
  }
  if (edges.e) g.vline(n, 0, TILE, r.dark);
  // 外圆角：两边都接草的角切掉 2 px（透出草）
  const corner = (cx: number, cy: number, dx: number, dy: number) => {
    g.set(cx, cy, null);
    g.set(cx + dx, cy, null);
    g.set(cx, cy + dy, null);
    g.set(cx + dx * 2, cy, r.dark);
    g.set(cx, cy + dy * 2, r.dark);
    g.set(cx + dx, cy + dy, r.dark);
  };
  if (edges.n && edges.w) corner(0, 0, 1, 1);
  if (edges.n && edges.e) corner(n, 0, -1, 1);
  if (edges.s && edges.w) corner(0, n, 1, -1);
  if (edges.s && edges.e) corner(n, n, -1, -1);
  void season;
  return g;
}

/** 内角：路的 L 形拐角处补一个暗阶像素，让转角不生硬 */
export function pathInnerCorner(g: Grid, ne: boolean, nw: boolean, se: boolean, sw: boolean): Grid {
  const d = ramp('earth').dark;
  if (nw) g.set(0, 0, d);
  if (ne) g.set(TILE - 1, 0, d);
  if (sw) g.set(0, TILE - 1, d);
  if (se) g.set(TILE - 1, TILE - 1, d);
  return g;
}

/* ------------------------------ 屋前土地（无描边） ------------------------------ */
export function dirtTile(x = 0, y = 0): Grid {
  const r = ramp('earth');
  const g = pathBody(r, x, y);
  // 再撒两点暗阶，比路更「土」
  g.set(Math.floor(hash2(x, y, 31) * 15), Math.floor(hash2(x, y, 32) * 15), r.dark);
  return g;
}

/* ------------------------------ 广场石板 ------------------------------ */
/**
 * 石板：8×8 一块，横向错缝（像砌砖）。缝用石暗阶，块左上一个亮阶反光点，偶有一块换成基阶偏暗做旧。
 */
export function stoneTile(x = 0, y = 0): Grid {
  const r = ramp('stone');
  const g = new Grid(TILE, TILE).rect(0, 0, TILE, TILE, r.base);
  const shift = y % 2 === 0 ? 0 : 4;
  // 横缝
  g.hline(0, 7, TILE, r.dark);
  g.hline(0, 15, TILE, r.dark);
  // 竖缝（上下两排错开）
  for (const cx of [shift + 7, shift + 15]) if (cx < TILE) g.vline(cx, 0, 7, r.dark);
  for (const cx of [(shift + 3) % 8, ((shift + 3) % 8) + 8]) if (cx < TILE) g.vline(cx, 8, 7, r.dark);
  // 反光点：每块左上
  g.set(1, 1, r.light);
  g.set(shift + 9 < TILE ? shift + 9 : 1, 1, r.light);
  g.set(((shift + 3) % 8) + 2, 9, r.light);
  // 做旧：随机一块加一小片暗阶
  if (hash2(x, y, 40) < 0.3) g.rect(3, 10, 2, 1, r.dark);
  return g;
}

/* ------------------------------ 田 ------------------------------ */
/**
 * 田：垄横向，每 4 行一道垄沟（土暗），垄面土基，作物按季：
 * 春 嫩苗（2 px 竖点）· 夏 高株（3 px + 亮顶）· 秋 麦穗（金 3 px + 亮头）· 冬 雪盖垄（雪基 / 沟雪暗）
 */
export function fieldTile(season: Season, x = 0, y = 0): Grid {
  const e = ramp('earth');
  const c = SEASON_RAMPS[season].crop;
  const g = new Grid(TILE, TILE);
  if (season === 'winter') {
    g.rect(0, 0, TILE, TILE, c.base);
    for (let row = 3; row < TILE; row += 4) g.hline(0, row, TILE, c.dark);
    for (let row = 0; row < TILE; row += 4) g.hline(0, row, TILE, c.light);
    return g;
  }
  g.rect(0, 0, TILE, TILE, e.base);
  for (let row = 3; row < TILE; row += 4) {
    g.hline(0, row, TILE, e.dark);
    g.hline(0, row - 3, TILE, e.light); // 垄顶受光
  }
  // 作物：每垄 4 株，位置错开
  const off = (x + y) % 2 === 0 ? 1 : 3;
  for (let row = 0; row < TILE; row += 4) {
    for (let k = 0; k < 4; k++) {
      const px = off + k * 4;
      if (px >= TILE) continue;
      if (season === 'spring') {
        g.set(px, row + 1, c.base);
        g.set(px, row + 2, c.dark);
      } else if (season === 'summer') {
        g.set(px, row, c.light);
        g.set(px, row + 1, c.base);
        g.set(px, row + 2, c.dark);
        g.set(px + 1, row + 1, c.dark);
      } else {
        g.set(px, row, c.light);
        g.set(px + 1, row, c.light);
        g.set(px, row + 1, c.base);
        g.set(px, row + 2, c.dark);
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
  for (let v = 0; v < 4; v++) items.push({ name: `草 ${v + 1}`, grid: grassTile(season, v) });
  const E = (n: boolean, s: boolean, e: boolean, w: boolean): Edges => ({ n, s, e, w });
  items.push({ name: '路 中', grid: pathTile(season, E(false, false, false, false), 3, 3) });
  items.push({ name: '路 上边', grid: pathTile(season, E(true, false, false, false)) });
  items.push({ name: '路 下边', grid: pathTile(season, E(false, true, false, false)) });
  items.push({ name: '路 左边', grid: pathTile(season, E(false, false, false, true)) });
  items.push({ name: '路 右边', grid: pathTile(season, E(false, false, true, false)) });
  items.push({ name: '路 左上角', grid: pathTile(season, E(true, false, false, true)) });
  items.push({ name: '路 右上角', grid: pathTile(season, E(true, false, true, false)) });
  items.push({ name: '路 左下角', grid: pathTile(season, E(false, true, false, true)) });
  items.push({ name: '路 右下角', grid: pathTile(season, E(false, true, true, false)) });
  items.push({ name: '路 横带', grid: pathTile(season, E(true, true, false, false)) });
  items.push({ name: '路 竖带', grid: pathTile(season, E(false, false, true, true)) });
  items.push({ name: '路 尽头', grid: pathTile(season, E(true, false, true, true)) });
  items.push({ name: '土地', grid: dirtTile(1, 2) });
  items.push({ name: '石板 A', grid: stoneTile(0, 0) });
  items.push({ name: '石板 B', grid: stoneTile(0, 1) });
  items.push({ name: '田 A', grid: fieldTile(season, 0, 0) });
  items.push({ name: '田 B', grid: fieldTile(season, 1, 0) });
  return items;
}

/**
 * 拼合样例：12×8 格，草地上一条横路一条竖路交叉、右上一片 3×2 石板、左下一片 3×2 田、右下一块屋前土地。
 */
export function groundDemo(season: Season): Grid {
  const W = 12;
  const H = 8;
  type Kind = 'g' | 'p' | 's' | 'f' | 'd';
  const map: Kind[][] = Array.from({ length: H }, () => Array<Kind>(W).fill('g'));
  for (let x = 0; x < W; x++) map[3][x] = 'p';
  for (let y = 0; y < H; y++) map[y][5] = 'p';
  for (let y = 0; y < 2; y++) for (let x = 8; x < 11; x++) map[y][x] = 's';
  for (let y = 5; y < 7; y++) for (let x = 1; x < 4; x++) map[y][x] = 'f';
  for (let y = 5; y < 7; y++) for (let x = 8; x < 10; x++) map[y][x] = 'd';
  const at = (x: number, y: number): Kind => (y < 0 || y >= H || x < 0 || x >= W ? 'p' : map[y][x]);
  const g = new Grid(W * TILE, H * TILE);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      g.compose(grassAt(season, x, y), x * TILE, y * TILE);
      const k = map[y][x];
      let t: Grid | null = null;
      if (k === 'p') {
        const isPath = (kk: Kind) => kk === 'p';
        const edges: Edges = { n: !isPath(at(x, y - 1)), s: !isPath(at(x, y + 1)), e: !isPath(at(x + 1, y)), w: !isPath(at(x - 1, y)) };
        t = pathTile(season, edges, x, y);
        pathInnerCorner(t, !edges.n && !edges.e && !isPath(at(x + 1, y - 1)), !edges.n && !edges.w && !isPath(at(x - 1, y - 1)), !edges.s && !edges.e && !isPath(at(x + 1, y + 1)), !edges.s && !edges.w && !isPath(at(x - 1, y + 1)));
      } else if (k === 's') t = stoneTile(x, y);
      else if (k === 'f') t = fieldTile(season, x, y);
      else if (k === 'd') t = dirtTile(x, y);
      if (t) g.compose(t, x * TILE, y * TILE);
    }
  }
  return g;
}
