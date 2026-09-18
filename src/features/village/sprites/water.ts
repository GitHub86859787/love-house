/**
 * 水系：溪 / 湖（自动拼接岸边、3 帧波纹）、木桥（两向）、芦苇、鸭子、小船、冬季岸边结冰。
 * 岸：土暗 1 px 贴水、土基 1 px 在外，其余透出草地；水侧一圈亮阶浪花随帧移动。
 * 光源左上；颜色全部来自 palette.ts。
 */
import { Grid } from '@/pixel/painter';
import type { Season } from '@/lib/season';
import { ramp, SEASON_RAMPS, type Ramp } from '../palette';
import { TILE } from './tile';
import { irange, makeRng, walkMask, type Corners, type Edges, type SheetItem } from './ground';

export const WATER_FRAMES = 3;
const NO_CORNERS: Corners = { ne: false, nw: false, se: false, sw: false };

/** 当季的水色带：冬天整体压暗一阶（暗阶借夜天亮） */
function waterRamp(season: Season): Ramp {
  const w = ramp('water');
  if (season === 'winter') return { light: w.base, base: w.dark, dark: ramp('night').light, outline: w.dark };
  if (season === 'autumn') return { light: w.light, base: w.base, dark: w.dark, outline: w.dark };
  return w;
}

/* ------------------------------ 水块 ------------------------------ */
/**
 * 水块：edges 标出哪一侧是陆地（岸），corners 标斜对角陆地（内角）。
 * 陆地部分透明（草透出），岸边画土；水面按 frame 画浪花与波纹。
 */
export function waterTile(season: Season, edges: Edges, frame: number, x = 0, y = 0, corners: Corners = NO_CORNERS): Grid {
  const w = waterRamp(season);
  const e = ramp('earth');
  const snow = ramp('snow');
  const rnd = makeRng(x, y, 600);
  const mask = walkMask(edges, corners, rnd, x, y); // true = 水
  const isWater = (px: number, py: number): boolean => {
    if (px >= 0 && px < TILE && py >= 0 && py < TILE) return mask[py][px];
    if (py < 0) return !edges.n && !(px < 0 && corners.nw) && !(px >= TILE && corners.ne);
    if (py >= TILE) return !edges.s && !(px < 0 && corners.sw) && !(px >= TILE && corners.se);
    if (px < 0) return !edges.w;
    return !edges.e;
  };
  /** 到最近陆地的曼哈顿距离（最多查 4） */
  const landDist = (px: number, py: number): number => {
    for (let d = 1; d <= 4; d++) {
      for (let dx = -d; dx <= d; dx++) {
        const dy = d - Math.abs(dx);
        if (!isWater(px + dx, py + dy) || !isWater(px + dx, py - dy)) return d;
      }
    }
    return 5;
  };
  const g = new Grid(TILE, TILE);
  const anyLand = edges.n || edges.s || edges.e || edges.w || corners.ne || corners.nw || corners.se || corners.sw;
  for (let py = 0; py < TILE; py++) {
    for (let px = 0; px < TILE; px++) {
      if (!mask[py][px]) {
        // 岸：贴水 1 px 土暗，再外 1 px 土基；其余透明
        const near1 = isWater(px + 1, py) || isWater(px - 1, py) || isWater(px, py + 1) || isWater(px, py - 1);
        const near2 = !near1 && (isWater(px + 2, py) || isWater(px - 2, py) || isWater(px, py + 2) || isWater(px, py - 2) || isWater(px + 1, py + 1) || isWater(px - 1, py - 1) || isWater(px + 1, py - 1) || isWater(px - 1, py + 1));
        if (near1) g.set(px, py, e.dark);
        else if (near2) g.set(px, py, e.base);
        continue;
      }
      const d = anyLand ? landDist(px, py) : 5;
      if (season === 'winter' && d <= 3) {
        // 岸边结冰：雪基，贴岸一圈雪亮，偶尔一道水暗裂纹
        g.set(px, py, d === 1 ? snow.light : snow.base);
        if (d === 3 && (px * 3 + py * 5 + frame) % 7 === 0) g.set(px, py, w.dark);
        continue;
      }
      if (d === 1) {
        // 浪花：亮阶断续，随帧移动
        g.set(px, py, (px + py + frame) % 3 === 0 ? w.base : w.light);
      } else if (d === 2) {
        g.set(px, py, (px + py + frame * 2) % 5 === 0 ? w.light : w.base);
      } else g.set(px, py, w.base);
    }
  }
  // 波纹：3–4 道亮阶短横线（2–3 px），按帧右移 1 px；2 道暗阶短线反向移动，做出流动感
  const ripples = anyLand ? irange(rnd, 3, 4) : irange(rnd, 5, 6);
  for (let k = 0; k < ripples; k++) {
    const len = irange(rnd, 2, 3);
    const rx = irange(rnd, 0, TILE - 1);
    const ry = irange(rnd, 0, TILE - 1);
    for (let i = 0; i < len; i++) {
      const px = (rx + i + frame) % TILE;
      if (mask[ry][px] && g.get(px, ry) === w.base) g.set(px, ry, w.light);
    }
  }
  for (let k = 0; k < 2; k++) {
    const rx = irange(rnd, 0, TILE - 1);
    const ry = irange(rnd, 0, TILE - 1);
    for (let i = 0; i < 2; i++) {
      const px = (rx + i - frame + TILE) % TILE;
      if (mask[ry][px] && g.get(px, ry) === w.base) g.set(px, ry, w.dark);
    }
  }
  // 大面积水：两三片棋盘格暗斑（深水），位置随格变化，不成整块
  if (!anyLand) {
    const patches = irange(rnd, 3, 4);
    for (let k = 0; k < patches; k++) {
      const pw = irange(rnd, 5, 7);
      const ph = irange(rnd, 3, 4);
      const px0 = irange(rnd, 0, TILE - pw);
      const py0 = irange(rnd, 0, TILE - ph);
      for (let py = py0; py < py0 + ph; py++) for (let px = px0; px < px0 + pw; px++) if ((px + py) % 2 === 0 && g.get(px, py) === w.base) g.set(px, py, w.dark);
    }
  }
  return g;
}

/* ------------------------------ 桥 ------------------------------ */
export type BridgeOrient = 'v' | 'h';
export type BridgePart = 'start' | 'mid' | 'end';

function rotate90(src: Grid): Grid {
  const g = new Grid(src.h, src.w);
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) g.set(src.h - 1 - y, x, src.get(x, y));
  return g;
}

/**
 * 木桥。'v' = 南北向走（跨横向的溪）：木板横铺，两侧栏杆；start / end 是两头带柱子的板。
 * 'h' 由 'v' 旋转得到。桥面画满整格，铺在水块上面。
 */
export function bridgeTile(orient: BridgeOrient, part: BridgePart): Grid {
  const wd = ramp('wood');
  const g = new Grid(TILE, TILE).rect(0, 0, TILE, TILE, wd.base);
  // 木板：每 4 行一块，板缝暗，板顶亮
  for (let y = 0; y < TILE; y += 4) {
    g.hline(2, y, TILE - 4, wd.light);
    g.hline(2, y + 3, TILE - 4, wd.dark);
  }
  // 板上的木纹点
  for (let k = 0; k < 5; k++) g.set(3 + ((k * 5) % 10), 1 + ((k * 4) % 12), wd.dark);
  // 栏杆：两侧竖梁 + 横杆
  g.vline(0, 0, TILE, wd.outline);
  g.vline(1, 0, TILE, wd.dark);
  g.vline(TILE - 2, 0, TILE, wd.dark);
  g.vline(TILE - 1, 0, TILE, wd.outline);
  // 柱子：两头一根，中段每 8 px 一根
  const posts = part === 'mid' ? [4, 12] : part === 'start' ? [1, 9] : [6, 14];
  for (const py of posts) {
    for (const px of [0, TILE - 1]) {
      g.rect(px === 0 ? 0 : TILE - 2, py, 2, 3, wd.outline);
      g.set(px === 0 ? 1 : TILE - 2, py, wd.light);
    }
  }
  if (part === 'start') g.hline(0, 0, TILE, wd.outline);
  if (part === 'end') g.hline(0, TILE - 1, TILE, wd.outline);
  return orient === 'v' ? g : rotate90(g);
}

/* ------------------------------ 芦苇 ------------------------------ */
/** 芦苇 16×16 透明底：3 变体；春夏草色杆，秋冬秋草色；带 1–2 个蒲棒 */
export function reedSprite(season: Season, variant: number): Grid {
  const stalk = season === 'spring' || season === 'summer' ? SEASON_RAMPS[season].grass : ramp('autumn');
  const head = ramp('wood');
  const rnd = makeRng(variant, 0, 700);
  const g = new Grid(TILE, TILE);
  const n = 4 + (variant % 3);
  for (let k = 0; k < n; k++) {
    const bx = 2 + Math.floor((k * (TILE - 4)) / n) + irange(rnd, 0, 1);
    const h = irange(rnd, 7, 12);
    const lean = rnd() < 0.5 ? 0 : rnd() < 0.5 ? 1 : -1;
    for (let i = 0; i < h; i++) {
      const px = bx + (i > h / 2 ? lean : 0);
      const py = TILE - 1 - i;
      g.set(px, py, i === h - 1 ? stalk.light : i < 2 ? stalk.dark : stalk.base);
    }
    // 叶子
    if (h > 7) g.set(bx + (lean >= 0 ? 1 : -1), TILE - 1 - Math.floor(h / 2), stalk.light);
    // 蒲棒
    if (k % 2 === 1 && h > 7) {
      const top = TILE - 1 - h;
      g.rect(bx + lean, top + 1, 1, 3, head.base);
      g.set(bx + lean, top + 1, head.light);
      g.set(bx + lean, top + 3, head.dark);
    }
  }
  // 描边（植物描边色），不然春夏在草地上看不见
  g.outline(stalk.outline);
  return g;
}

/* ------------------------------ 鸭子 ------------------------------ */
const DUCK: string[][] = [
  [
    '......OO..',
    '.....OWWO.',
    '.....OWKOG',
    '..OOOOWWO.',
    '.OWWWWWWO.',
    '.OWDWWWWO.',
    '..OOOOOO..',
    '..........',
  ],
  [
    '..........',
    '......OO..',
    '.....OWWO.',
    '.....OWKOG',
    '..OOOOWWO.',
    '.OWWWWWWO.',
    '.OWDWWWWO.',
    '..OOOOOO..',
  ],
];

/** 鸭子 10×8，两帧（身子起伏），facing 'r' 朝右 / 'l' 镜像 */
export function duckSprite(frame: number, facing: 'l' | 'r' = 'r', season: Season = 'spring'): Grid {
  const p = ramp('plaster');
  const w = waterRamp(season);
  const map = { O: p.outline, W: p.light, D: p.dark, K: ramp('ink').dark, G: ramp('gold').base };
  const g = new Grid(10, 8);
  g.paste(0, 0, DUCK[frame % 2], map);
  // 尾波：身后两点亮阶
  const wy = frame % 2 === 0 ? 6 : 7;
  g.set(0, wy, w.light);
  if (frame % 2 === 0) g.set(1, wy + 1, w.light);
  if (facing === 'l') {
    const m = new Grid(10, 8);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 10; x++) m.set(9 - x, y, g.get(x, y));
    return m;
  }
  return g;
}

/* ------------------------------ 小船 ------------------------------ */
const BOAT: string[] = [
  '................',
  'OOOOOOOOOOOOOOO.',
  'OLLLLLLLLLLLLLLO',
  'OBBBBBBBBBBBBBBO',
  'OBBDDBBBBBDDBBBO',
  '.OBBBBBBBBBBBBO.',
  '..ODDDDDDDDDDO..',
  '...OOOOOOOOOO...',
  '................',
  '................',
];
/** 小船 16×10，两帧（上下 1 px 轻晃 + 水面亮点） */
export function boatSprite(frame: number, season: Season = 'spring'): Grid {
  const wd = ramp('wood');
  const w = waterRamp(season);
  const g = new Grid(16, 10);
  const dy = frame % 2;
  g.paste(0, dy, BOAT, { O: wd.outline, L: wd.light, B: wd.base, D: wd.dark });
  // 船边水痕
  g.set(frame % 2 === 0 ? 1 : 14, 8 + dy, w.light);
  g.set(frame % 2 === 0 ? 14 : 1, 8 + dy, w.light);
  return g;
}

/* ------------------------------ 图块表与样例 ------------------------------ */
export function waterSheet(season: Season, frame: number): SheetItem[] {
  const items: SheetItem[] = [];
  const E = (n: boolean, s: boolean, e: boolean, w: boolean): Edges => ({ n, s, e, w });
  const W = (name: string, edges: Edges, corners?: Corners, salt = 0) => items.push({ name, grid: waterTile(season, edges, frame, 4 + salt, 4, corners) });
  W('水 中', E(false, false, false, false));
  W('岸 上', E(true, false, false, false));
  W('岸 下', E(false, true, false, false));
  W('岸 左', E(false, false, false, true));
  W('岸 右', E(false, false, true, false));
  W('溪 横', E(true, true, false, false));
  W('溪 竖', E(false, false, true, true));
  W('湾 左上', E(true, false, false, true));
  W('湾 右下', E(false, true, true, false));
  W('内角', E(false, false, false, false), { ne: true, nw: false, se: false, sw: true }, 1);
  W('溪 尽头', E(true, false, true, true));
  items.push({ name: '桥 南北 头', grid: bridgeTile('v', 'start') });
  items.push({ name: '桥 南北 中', grid: bridgeTile('v', 'mid') });
  items.push({ name: '桥 东西 中', grid: bridgeTile('h', 'mid') });
  items.push({ name: '芦苇 A', grid: reedSprite(season, 0) });
  items.push({ name: '芦苇 B', grid: reedSprite(season, 1) });
  items.push({ name: '芦苇 C', grid: reedSprite(season, 2) });
  items.push({ name: '鸭 帧 1', grid: duckSprite(0, 'r', season) });
  items.push({ name: '鸭 帧 2', grid: duckSprite(1, 'r', season) });
  items.push({ name: '鸭 朝左', grid: duckSprite(0, 'l', season) });
  items.push({ name: '船 帧 1', grid: boatSprite(0, season) });
  items.push({ name: '船 帧 2', grid: boatSprite(1, season) });
  return items;
}

export type Cell = 'g' | 'w';
/** 样例 12×8：溪从右上蜿蜒到左下汇成湖，中段一座南北向木桥 */
function waterLayout(): { map: Cell[][]; bridge: [number, number][]; reeds: [number, number, number][]; ducks: [number, number, 'l' | 'r'][]; boat: [number, number] } {
  const W = 12;
  const H = 8;
  const map: Cell[][] = Array.from({ length: H }, () => Array<Cell>(W).fill('g'));
  const stream: [number, number][] = [
    [11, 0], [10, 0], [10, 1], [9, 1], [9, 2], [8, 2], [8, 3], [7, 3], [6, 3], [5, 3], [5, 4], [4, 4], [4, 5], [3, 5],
  ];
  for (const [x, y] of stream) map[y][x] = 'w';
  for (let y = 5; y < H; y++) for (let x = 0; x < 4; x++) map[y][x] = 'w';
  map[7][4] = 'w';
  return {
    map,
    bridge: [[6, 2], [6, 3], [6, 4]],
    reeds: [[4, 6, 0], [1, 4, 1], [9, 3, 2], [5, 5, 0]],
    ducks: [[1, 6, 'r'], [2, 7, 'l'], [9, 2, 'l']],
    boat: [1, 5],
  };
}

/** 把水铺进一张底图（底图已铺好草）。walkable 表示哪些格是水 */
export function composeWater(season: Season, frame: number, map: Cell[][], base: Grid): Grid {
  const H = map.length;
  const W = map[0].length;
  const at = (x: number, y: number): Cell => (y < 0 || y >= H || x < 0 || x >= W ? 'g' : map[y][x]);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (map[y][x] !== 'w') continue;
      const edges: Edges = { n: at(x, y - 1) !== 'w', s: at(x, y + 1) !== 'w', e: at(x + 1, y) !== 'w', w: at(x - 1, y) !== 'w' };
      const corners: Corners = { ne: at(x + 1, y - 1) !== 'w', nw: at(x - 1, y - 1) !== 'w', se: at(x + 1, y + 1) !== 'w', sw: at(x - 1, y + 1) !== 'w' };
      base.compose(waterTile(season, edges, frame, x, y, corners), x * TILE, y * TILE);
    }
  }
  return base;
}

import { grassAt } from './ground';

export function waterDemo(season: Season, frame: number): Grid {
  const { map, bridge, reeds, ducks, boat } = waterLayout();
  const H = map.length;
  const W = map[0].length;
  const g = new Grid(W * TILE, H * TILE);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) g.compose(grassAt(season, x, y), x * TILE, y * TILE);
  composeWater(season, frame, map, g);
  bridge.forEach(([x, y], i) => g.compose(bridgeTile('v', i === 0 ? 'start' : i === bridge.length - 1 ? 'end' : 'mid'), x * TILE, y * TILE));
  for (const [x, y, v] of reeds) g.compose(reedSprite(season, v), x * TILE, y * TILE + 2);
  for (const [x, y, f] of ducks) g.compose(duckSprite(frame, f, season), x * TILE + 3, y * TILE + 4);
  g.compose(boatSprite(frame, season), boat[0] * TILE, boat[1] * TILE + 3);
  return g;
}

/** 三帧并排的动画分解：2×2 水块（含一侧岸）+ 鸭子 + 船 */
export function waterAnimStrip(season: Season): Grid {
  const cell = 3 * TILE;
  const gap = 8;
  const out = new Grid(cell * WATER_FRAMES + gap * (WATER_FRAMES - 1), cell);
  for (let f = 0; f < WATER_FRAMES; f++) {
    const map: Cell[][] = [
      ['g', 'g', 'g'],
      ['g', 'w', 'w'],
      ['w', 'w', 'w'],
    ];
    const g = new Grid(cell, cell);
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) g.compose(grassAt(season, x + 20, y + 20), x * TILE, y * TILE);
    composeWater(season, f, map, g);
    g.compose(duckSprite(f, 'r', season), 20, 22);
    g.compose(boatSprite(f, season), 2, 34);
    out.compose(g, f * (cell + gap), 0);
  }
  return out;
}
