/**
 * 大树：2×3 tile（32×48）。树冠三层（顶亮 / 中基 / 底暗）由椭圆并集 + 周边叶簇凸起 + 缺口生成，
 * 每层轮廓不规则；冠内 3–5 处亮阶透光点、2–3 处暗阶叶隙；树干木色三阶带树皮竖纹，根部两侧暗阶；
 * 树下椭圆影子（棋盘抖动，放地面装饰层）。四季四套；两帧摇动只动冠边缘。
 */
import { Grid } from '@/pixel/painter';
import type { Season } from '@/lib/season';
import { ramp, SEASON_RAMPS } from '../palette';
import { irange, makeRng, type Rng } from './ground';

export const TREE_W = 32;
export const TREE_H = 48;
export type TreeShape = 'round' | 'tall';

/** 0 透明，1 底暗，2 中基，3 顶亮 */
type Layer = 0 | 1 | 2 | 3;

function ellipse(m: Layer[][], cx: number, cy: number, rx: number, ry: number, layer: Layer) {
  for (let y = 0; y < m.length; y++) {
    for (let x = 0; x < m[0].length; x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) m[y][x] = layer;
    }
  }
}

function crownLayers(shape: TreeShape, rnd: Rng): Layer[][] {
  const H = 34;
  const m: Layer[][] = Array.from({ length: H }, () => Array<Layer>(TREE_W).fill(0));
  if (shape === 'round') {
    ellipse(m, 16, 21, 14.5, 8, 1);
    ellipse(m, 15.5, 14, 13.5, 10, 2);
    ellipse(m, 8, 17, 6.5, 5.5, 2);
    ellipse(m, 24, 16, 6.5, 5.5, 2);
    ellipse(m, 14, 8, 9.5, 6, 3);
    ellipse(m, 21, 7.5, 5, 4, 3);
    ellipse(m, 9, 10, 4, 3, 3);
  } else {
    // 尖冠：窄而高，顶部尖，两侧各一小团
    ellipse(m, 16, 26, 10.5, 6, 1);
    ellipse(m, 16, 17, 9, 12, 2);
    ellipse(m, 10, 21, 4.5, 5, 2);
    ellipse(m, 22, 20, 4.5, 5, 2);
    ellipse(m, 15.5, 7, 5.5, 7, 3);
    ellipse(m, 19, 12, 3.5, 3.5, 3);
    ellipse(m, 12, 13, 3, 3, 3);
  }
  const at = (x: number, y: number): Layer => (y < 0 || y >= H || x < 0 || x >= TREE_W ? 0 : m[y][x]);
  // 层间边界抖动：每行 60% 几率把边界向左或右挪 1 px
  for (let y = 0; y < H; y++) {
    for (let x = 1; x < TREE_W; x++) {
      if (m[y][x] && m[y][x - 1] && m[y][x] !== m[y][x - 1] && rnd() < 0.6) {
        if (rnd() < 0.5) m[y][x] = m[y][x - 1];
        else m[y][x - 1] = m[y][x];
      }
    }
  }
  // 周边叶簇凸起：12–16 处 2×2 / 3×2 块贴在轮廓外
  const perimeter: [number, number][] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < TREE_W; x++) if (m[y][x] && (!at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1))) perimeter.push([x, y]);
  const bumps = irange(rnd, 12, 16);
  for (let k = 0; k < bumps && perimeter.length; k++) {
    const [px, py] = perimeter[irange(rnd, 0, perimeter.length - 1)];
    const layer = m[py][px];
    const dx = !at(px - 1, py) ? -1 : !at(px + 1, py) ? 1 : 0;
    const dy = !at(px, py - 1) ? -1 : !at(px, py + 1) ? 1 : 0;
    const w = irange(rnd, 2, 3);
    const h = 2;
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const x = px + (dx < 0 ? -i : dx > 0 ? i : i - 1);
        const y = py + (dy < 0 ? -j : dy > 0 ? j : j - 1);
        if (y >= 0 && y < H && x >= 0 && x < TREE_W && m[y][x] === 0) m[y][x] = layer;
      }
    }
  }
  // 缺口：5–7 处轮廓向内凹 1–2 px
  for (let k = 0; k < irange(rnd, 5, 7) && perimeter.length; k++) {
    const [px, py] = perimeter[irange(rnd, 0, perimeter.length - 1)];
    m[py][px] = 0;
    if (rnd() < 0.5 && at(px + 1, py)) m[py][px + 1] = 0;
  }
  // 去掉孤立像素
  for (let y = 0; y < H; y++) for (let x = 0; x < TREE_W; x++) if (m[y][x] && !at(x - 1, y) && !at(x + 1, y) && !at(x, y - 1) && !at(x, y + 1)) m[y][x] = 0;
  return m;
}

/** 摇动帧：只动冠边缘。偶数行段右缘外扩 1 px、左缘内缩 1 px；奇数行段反过来 */
function sway(m: Layer[][]): Layer[][] {
  const out = m.map((r) => r.slice());
  for (let y = 0; y < m.length; y++) {
    let l = -1;
    let r = -1;
    for (let x = 0; x < TREE_W; x++) if (m[y][x]) { if (l < 0) l = x; r = x; }
    if (l < 0) continue;
    const phase = (y >> 2) % 2 === 0;
    if (phase) {
      if (r + 1 < TREE_W) out[y][r + 1] = m[y][r];
      out[y][l] = 0;
    } else {
      if (l - 1 >= 0) out[y][l - 1] = m[y][l];
      out[y][r] = 0;
    }
  }
  return out;
}

interface LeafColors {
  light: string;
  base: string;
  dark: string;
  outline: string;
}
function leafColors(season: Season): LeafColors {
  const l = SEASON_RAMPS[season].leaf;
  if (season === 'spring') {
    // 春天树冠仍是绿的，粉花只点缀冠边
    const g = ramp('grass');
    return { light: g.light, base: g.base, dark: g.dark, outline: g.outline };
  }
  return { light: l.light, base: l.base, dark: l.dark, outline: l.outline };
}

function paintCrown(g: Grid, m: Layer[][], c: LeafColors, rnd: Rng, season: Season) {
  const H = m.length;
  for (let y = 0; y < H; y++) for (let x = 0; x < TREE_W; x++) {
    const L = m[y][x];
    if (L === 0) continue;
    g.set(x, y, L === 3 ? c.light : L === 2 ? c.base : c.dark);
  }
  // 透光点：3–5 处，2–3 px，落在中层
  const mids: [number, number][] = [];
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < TREE_W - 2; x++) if (m[y][x] === 2) mids.push([x, y]);
  for (let k = 0; k < irange(rnd, 3, 5) && mids.length; k++) {
    const [px, py] = mids[irange(rnd, 0, mids.length - 1)];
    g.set(px, py, c.light);
    g.set(px + 1, py, c.light);
    if (rnd() < 0.6) g.set(px, py - 1, c.light);
  }
  // 叶隙：2–3 处 2×2 暗阶（在中层 / 顶层里），带一点描边色更深
  const ups: [number, number][] = [];
  for (let y = 2; y < H - 3; y++) for (let x = 2; x < TREE_W - 3; x++) if (m[y][x] >= 2 && m[y + 1][x + 1] >= 2) ups.push([x, y]);
  for (let k = 0; k < irange(rnd, 2, 3) && ups.length; k++) {
    const [px, py] = ups[irange(rnd, 0, ups.length - 1)];
    g.set(px, py, c.dark);
    g.set(px + 1, py, c.dark);
    g.set(px, py + 1, c.outline);
    g.set(px + 1, py + 1, c.dark);
  }
  // 春：粉花点缀在冠边（8–12 点）
  if (season === 'spring') {
    const pk = ramp('pink');
    const edge: [number, number][] = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < TREE_W; x++) if (m[y][x] && (x === 0 || y === 0 || !m[y][x - 1] || !m[y - 1][x] || (x + 1 < TREE_W && !m[y][x + 1]))) edge.push([x, y]);
    for (let k = 0; k < irange(rnd, 9, 12) && edge.length; k++) {
      const [px, py] = edge[irange(rnd, 0, edge.length - 1)];
      g.set(px, py, rnd() < 0.6 ? pk.light : pk.base);
    }
  }
  g.outline(c.outline);
}

/** 树干：8 宽，从冠底到 48；木色三阶、树皮竖纹、根部外扩 */
function paintTrunk(g: Grid, top: number, rnd: Rng, snow: boolean) {
  const w = ramp('wood');
  const x0 = 12;
  const h = TREE_H - top;
  g.rect(x0, top, 8, h, w.base);
  g.vline(x0, top, h, w.light);
  g.vline(x0 + 1, top, h, w.light);
  g.vline(x0 + 6, top, h, w.dark);
  g.vline(x0 + 7, top, h, w.dark);
  // 树皮竖纹：断续暗线
  for (const bx of [x0 + 3, x0 + 5]) {
    let y = top + irange(rnd, 0, 2);
    while (y < TREE_H - 3) {
      const len = irange(rnd, 2, 4);
      g.vline(bx, y, len, w.dark);
      y += len + irange(rnd, 2, 3);
    }
  }
  g.set(x0 + 2, top + irange(rnd, 3, h - 4), w.light);
  // 根部：两侧外扩 2 px，暗阶
  const ry = TREE_H - 3;
  g.rect(x0 - 2, ry, 2, 3, w.base);
  g.rect(x0 + 8, ry, 2, 3, w.base);
  g.hline(x0 - 2, TREE_H - 1, 12, w.dark);
  g.set(x0 - 2, ry, w.dark);
  g.set(x0 + 9, ry, w.dark);
  g.set(x0 - 1, ry, w.light);
  if (snow) g.rect(x0 - 2, ry - 1, 12, 1, ramp('snow').light);
  // 描边只描树干外圈
  const ink = ramp('ink').base;
  for (let y = top; y < TREE_H; y++) {
    for (let x = x0 - 3; x <= x0 + 10; x++) {
      if (g.get(x, y)) continue;
      if (g.get(x - 1, y) || g.get(x + 1, y) || g.get(x, y + 1)) g.set(x, y, ink);
    }
  }
}

/** 冬天的秃树：主干上分出四五根主枝（2 px 粗），每根再分叉一次；主枝上沿一条雪 */
function paintBareTree(g: Grid, rnd: Rng, shape: TreeShape) {
  const w = ramp('wood');
  const sn = ramp('snow');
  const ink = ramp('ink').base;
  const segs: [number, number, number][] = []; // x, y, depth
  const branch = (x: number, y: number, dx: number, dy: number, len: number, depth: number) => {
    let cx = x;
    let cy = y;
    for (let i = 0; i < len; i++) {
      const px = Math.round(cx);
      const py = Math.round(cy);
      g.set(px, py, depth === 0 ? w.base : w.dark);
      if (depth === 0) g.set(px + 1, py, w.dark);
      segs.push([px, py, depth]);
      cx += dx;
      cy += dy;
    }
    if (depth < 2 && len > 4) {
      const ex = Math.round(cx);
      const ey = Math.round(cy);
      branch(ex, ey, dx * 0.8 + (rnd() < 0.5 ? -0.6 : 0.6), dy * 0.9, Math.max(3, len - irange(rnd, 3, 4)), depth + 1);
      const mx = Math.round(x + dx * (len >> 1));
      const my = Math.round(y + dy * (len >> 1));
      branch(mx, my, dx < 0 ? -1 : 1, -0.7, Math.max(3, len - irange(rnd, 4, 5)), depth + 1);
    }
  };
  paintTrunk(g, 27, rnd, true);
  const spread = shape === 'round' ? 1 : 0.7;
  branch(14, 27, -0.9 * spread, -0.8, 11, 0);
  branch(17, 26, 0.9 * spread, -0.8, 11, 0);
  branch(15, 25, -0.35 * spread, -1, 12, 0);
  branch(16, 24, 0.4 * spread, -1, 12, 0);
  branch(13, 30, -1 * spread, -0.35, 7, 0);
  branch(18, 30, 1 * spread, -0.35, 7, 0);
  // 描边（枝的外圈）
  const src = g.clone();
  for (let y = 0; y < TREE_H; y++) for (let x = 0; x < TREE_W; x++) {
    if (src.get(x, y)) continue;
    const n = src.get(x - 1, y) ?? src.get(x + 1, y) ?? src.get(x, y - 1) ?? src.get(x, y + 1);
    if (n && n !== ink && n !== sn.light && n !== sn.base) g.set(x, y, ink);
  }
  // 雪：只落在枝的上沿（上方是空的地方），主枝隔一粒一粒，次枝更稀；枝头一小团
  const isWood = (c: string | null) => c === w.base || c === w.dark;
  for (const [px, py, depth] of segs) {
    const above = g.get(px, py - 1);
    if (isWood(above)) continue;
    if (depth === 0 ? px % 2 === 0 : (px + py) % 3 === 0) g.set(px, py - 1, sn.light);
  }
  // 枝头雪团：找枝的末端（上方 / 左右都不是木）
  for (const [px, py, depth] of segs) {
    if (depth === 0) continue;
    if (!isWood(g.get(px, py - 1)) && !isWood(g.get(px - 1, py - 1)) && !isWood(g.get(px + 1, py - 1)) && (px * 7 + py * 3) % 4 === 0) {
      g.set(px, py - 1, sn.light);
      g.set(px + 1, py - 1, sn.base);
    }
  }
}

export function treeSprite(season: Season, shape: TreeShape, frame = 0, seed = 0): Grid {
  const g = new Grid(TREE_W, TREE_H);
  const rnd = makeRng(seed, shape === 'round' ? 1 : 2, 800);
  if (season === 'winter') {
    paintBareTree(g, rnd, shape);
    return g;
  }
  let m = crownLayers(shape, rnd);
  if (frame % 2 === 1) m = sway(m);
  const c = leafColors(season);
  // 先画树干（冠会压在上面）
  const crownBottom = shape === 'round' ? 29 : 31;
  paintTrunk(g, crownBottom - 4, makeRng(seed, 3, 801), false);
  const crown = new Grid(TREE_W, TREE_H);
  paintCrown(crown, m, c, makeRng(seed, 4, 802), season);
  g.compose(crown);
  return g;
}

/** 树影：28×10 椭圆，棋盘抖动的地面暗阶；秋天再落几片叶子 */
export function treeShadow(season: Season, seed = 0): Grid {
  const gr = SEASON_RAMPS[season].grass;
  const g = new Grid(28, 10);
  const shade = season === 'winter' ? gr.dark : gr.dark;
  for (let y = 0; y < 10; y++) for (let x = 0; x < 28; x++) {
    const dx = (x + 0.5 - 14) / 14;
    const dy = (y + 0.5 - 5) / 5;
    if (dx * dx + dy * dy <= 1 && (x + y) % 2 === 0) g.set(x, y, shade);
  }
  if (season === 'autumn') {
    const rnd = makeRng(seed, 5, 803);
    const lf = [ramp('brick').light, ramp('gold').base, ramp('autumn').dark];
    for (let k = 0; k < irange(rnd, 5, 7); k++) {
      const x = irange(rnd, 0, 26);
      const y = irange(rnd, 0, 9);
      g.set(x, y, lf[k % 3]);
      if (rnd() < 0.5) g.set(x + 1, y, lf[(k + 1) % 3]);
    }
  }
  return g;
}

/** 四季并排：两种树形各一排，带影子 */
export function treeStrip(frame = 0): Grid {
  const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
  const cellW = TREE_W + 8;
  const cellH = TREE_H + 8;
  const out = new Grid(cellW * 4, cellH * 2);
  (['round', 'tall'] as TreeShape[]).forEach((shape, row) => {
    seasons.forEach((season, i) => {
      const x0 = i * cellW + 4;
      const y0 = row * cellH + 2;
      out.compose(treeShadow(season), x0 + 2, y0 + TREE_H - 6);
      out.compose(treeSprite(season, shape, frame), x0, y0);
    });
  });
  return out;
}

/* ------------------------------ 图块表与样例 ------------------------------ */
import type { SheetItem } from './ground';
import { composeGround, demoLayout, fieldTile } from './ground';
import { barrelSprite, bushSprite, clotheslineSprite, crateSprite, fenceSprite, flowerSprite, lampSprite, leavesSprite, pumpkinSprite, rockSprite, scarecrowSprite, signSprite, snowmanSprite, stumpSprite } from './props';
import { TILE } from './tile';

export function floraSheet(season: Season, frame = 0): SheetItem[] {
  const f = frame % 2;
  const items: SheetItem[] = [
    { name: '大树 圆冠', grid: treeSprite(season, 'round', f) },
    { name: '大树 尖冠', grid: treeSprite(season, 'tall', f) },
    { name: '树影', grid: treeShadow(season) },
    { name: '灌木 A', grid: bushSprite(season, 0) },
    { name: '灌木 B', grid: bushSprite(season, 1) },
    { name: '花丛 A', grid: flowerSprite(season, 0) },
    { name: '花丛 B', grid: flowerSprite(season, 1) },
    { name: '石头 大', grid: rockSprite(0, season) },
    { name: '石头 小', grid: rockSprite(1, season) },
    { name: '树桩', grid: stumpSprite() },
    { name: '木箱', grid: crateSprite() },
    { name: '木桶', grid: barrelSprite() },
    { name: '围栏 横', grid: fenceSprite('h', season) },
    { name: '围栏 竖', grid: fenceSprite('v', season) },
    { name: '围栏 角', grid: fenceSprite('corner', season) },
    { name: '围栏 柱', grid: fenceSprite('post', season) },
    { name: '路灯 灭', grid: lampSprite(false) },
    { name: '路灯 亮', grid: lampSprite(true) },
    { name: '告示板', grid: signSprite() },
    { name: '稻草人', grid: scarecrowSprite() },
    { name: '晾衣绳 帧 1', grid: clotheslineSprite(0) },
    { name: '晾衣绳 帧 2', grid: clotheslineSprite(1) },
  ];
  if (season === 'autumn') {
    items.push({ name: '南瓜', grid: pumpkinSprite() });
    items.push({ name: '落叶', grid: leavesSprite(0) });
  }
  if (season === 'winter') items.push({ name: '雪人', grid: snowmanSprite() });
  return items;
}

/** 样例 12×8：地面拼合样例上摆两棵树、灌木、花、石、栏、灯、牌、稻草人、晾衣绳等 */
export function floraDemo(season: Season, frame = 0): Grid {
  const f = frame % 2;
  const g = composeGround(season, demoLayout());
  const put = (spr: Grid, tx: number, ty: number, dx = 0, dy = 0) => g.compose(spr, tx * TILE + dx, ty * TILE + dy);
  // 田旁补一块田（稻草人站的地方）
  g.compose(fieldTile(season, 4, 5), 4 * TILE, 5 * TILE);
  g.compose(fieldTile(season, 4, 6), 4 * TILE, 6 * TILE);
  // 影子先画（地面装饰层）
  put(treeShadow(season, 1), 0, 2, 4, 6);
  put(treeShadow(season, 2), 8, 4, 6, 8);
  // 围栏：沿横路上方一排
  for (let x = 0; x < 5; x++) put(fenceSprite(x === 0 ? 'corner' : 'h', season), x, 2);
  put(fenceSprite('v', season), 0, 1);
  // 大树
  put(treeSprite(season, 'round', f, 1), 0, 0, 4, -4);
  put(treeSprite(season, 'tall', f, 2), 8, 2, 6, -2);
  // 灌木、花、石头
  put(bushSprite(season, 0), 7, 1);
  put(bushSprite(season, 1), 11, 4);
  put(flowerSprite(season, 0), 6, 4, 0, 8);
  put(flowerSprite(season, 1), 2, 4, 0, 6);
  put(rockSprite(0, season), 10, 7, 1, 4);
  put(rockSprite(1, season), 3, 1, 3, 6);
  put(stumpSprite(), 11, 1, 2, 2);
  // 屋前土地上的木箱木桶
  put(crateSprite(), 8, 5, 2, 4);
  put(barrelSprite(), 9, 5, 4, 2);
  // 路灯在路口，告示板在路边
  put(lampSprite(false), 4, 2, 0, -14);
  put(signSprite(), 6, 2, 0, 2);
  // 稻草人立在田边，晾衣绳在右下
  put(scarecrowSprite(), 4, 4, 0, 2);
  put(clotheslineSprite(f), 10, 6, -4, -2);
  if (season === 'autumn') {
    put(pumpkinSprite(), 1, 7, 2, 4);
    put(leavesSprite(0), 2, 0);
    put(leavesSprite(1), 7, 6);
    put(leavesSprite(2), 9, 3);
  }
  if (season === 'winter') put(snowmanSprite(), 1, 7, 2, 3);
  return g;
}
