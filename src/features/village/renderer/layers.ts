/**
 * 静态分层缓存：地面 / 水（3 帧）/ 小物 / 建筑 / 树（2 帧）。
 * 每层先按白天画成 Grid，再套时段表、铺光池，转成 canvas。季节或时段变了才重建。
 * 建 Grid 的过程按 tile 缓存，第二次同季节建层只剩合成。
 */
import { Grid } from '@/pixel/painter';
import type { Season } from '@/lib/season';
import { TILE } from '../sprites/tile';
import { grassAt, pathTile, stoneTile, fieldTile, type Edges, type Corners } from '../sprites/ground';
import { waterTile, bridgeTile, reedSprite } from '../sprites/water';
import { treeShadow, treeSprite } from '../sprites/flora';
import { mountainTile } from '../sprites/mountain';
import { bushSprite, flowerSprite, rockSprite, stumpSprite, crateSprite, barrelSprite, fenceSprite, lampSprite, signSprite, scarecrowSprite, pumpkinSprite, snowmanSprite, leavesSprite, clotheslineSprite } from '../sprites/props';
import { BUILDINGS } from '../sprites/buildings';
import { applyLightPools, applySlot, type Slot, type Emissive } from '../sprites/daylight';
import { COLS, ROWS, MAP_W, MAP_H, groundAt, PLACEMENTS, TREES, LIGHTS, allProps, type PropSpot } from '../layout';
import { gridToCanvas } from './canvas';

export interface StaticLayers {
  season: Season;
  slot: Slot;
  next?: Slot;
  lightsOn: boolean;
  ground: HTMLCanvasElement;
  buildings: HTMLCanvasElement;
  /** 水 3 帧、小物、树 2 帧：首帧只有 water[0]，其余在后面几帧里补齐（null = 还没建） */
  water: (HTMLCanvasElement | null)[];
  decor: HTMLCanvasElement | null;
  trees: (HTMLCanvasElement | null)[];
  /** 还没做的建层步骤，每帧做一步 */
  pending: (() => void)[];
  /** 首批（地面 + 建筑 + 水 0）花了多少毫秒 */
  buildMs: number;
  /** 全部建完时累计的建层毫秒 */
  totalMs: number;
}

const LIT: Set<Slot> = new Set(['dusk', 'evening', 'night']);
export const lightsOnFor = (slot: Slot, next?: Slot) => LIT.has(slot) && (!next || LIT.has(next) || slot !== 'dusk');

/* ------------------------------ tile 缓存 ------------------------------ */
const tileCache = new Map<string, Grid>();
function tile(key: string, make: () => Grid): Grid {
  let g = tileCache.get(key);
  if (!g) {
    g = make();
    if (tileCache.size > 3000) tileCache.clear();
    tileCache.set(key, g);
  }
  return g;
}

const isWater = (x: number, y: number) => groundAt(x, y) === '~';
const isPathy = (x: number, y: number) => {
  const g = groundAt(x, y);
  return g === '=' || g === 'S' || g === 'B';
};

/** 地面：远山、草、田、路、石板（水另画，但水下先铺草让岸边透出） */
export function groundGrid(season: Season): Grid {
  return tile(`ground|${season}`, () => {
    const g = new Grid(MAP_W, MAP_H);
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) {
        const k = groundAt(x, y);
        let t: Grid;
        if (k === 'M') t = tile(`M|${season}|${x}`, () => mountainTile(season, x));
        else if (k === 'f') t = tile(`f|${season}|${x}|${y}`, () => fieldTile(season, x, y));
        else if (k === 'S') t = tile(`S|${season}|${x}|${y}`, () => stoneTile(season, x, y));
        else if (k === '=') {
          // 路的锯齿边草侧是透明的，先铺草再铺路，别让画布底色漏出来
          g.compose(tile(`.|${season}|${x}|${y}`, () => grassAt(season, x, y)), x * TILE, y * TILE);
          const e: Edges = { n: !isPathy(x, y - 1), s: !isPathy(x, y + 1), e: !isPathy(x + 1, y), w: !isPathy(x - 1, y) };
          const c: Corners = { ne: !isPathy(x + 1, y - 1), nw: !isPathy(x - 1, y - 1), se: !isPathy(x + 1, y + 1), sw: !isPathy(x - 1, y + 1) };
          t = tile(`=|${season}|${x}|${y}`, () => pathTile(season, e, x, y, c));
        } else t = tile(`.|${season}|${x}|${y}`, () => grassAt(season, x, y));
        g.compose(t, x * TILE, y * TILE);
      }
    return g;
  });
}

/** 水层（3 帧）：只有水格和桥 */
export function waterGrid(season: Season, frame: number): Grid {
  return tile(`water|${season}|${frame % 3}`, () => {
    const g = new Grid(MAP_W, MAP_H);
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) {
        const k = groundAt(x, y);
        if (k === '~') {
          const w = (xx: number, yy: number) => isWater(xx, yy) || groundAt(xx, yy) === 'B';
          const e: Edges = { n: !w(x, y - 1), s: !w(x, y + 1), e: !w(x + 1, y), w: !w(x - 1, y) };
          const c: Corners = { ne: !w(x + 1, y - 1), nw: !w(x - 1, y - 1), se: !w(x + 1, y + 1), sw: !w(x - 1, y + 1) };
          g.compose(waterTile(season, e, frame % 3, x, y, c), x * TILE, y * TILE);
        } else if (k === 'B') {
          // 桥：两格长（东西向），上下两行各一条；只在最外侧画栏杆
          const part = groundAt(x - 1, y) === 'B' ? 'end' : 'start';
          const b = tile(`B|${part}`, () => bridgeTile('h', part)).clone();
          // 去掉朝向另一行桥面那一侧的栏杆
          const innerTop = groundAt(x, y - 1) === 'B';
          const innerBottom = groundAt(x, y + 1) === 'B';
          const wd = b.get(8, 8)!;
          if (innerTop) for (let px = 0; px < TILE; px++) { b.set(px, 0, wd); b.set(px, 1, wd); }
          if (innerBottom) for (let px = 0; px < TILE; px++) { b.set(px, TILE - 1, wd); b.set(px, TILE - 2, wd); }
          g.compose(b, x * TILE, y * TILE);
        }
      }
    return g;
  });
}

function propGrid(p: PropSpot, season: Season, lit: boolean, frame: number): { g: Grid; dx: number; dy: number } | null {
  const v = p.variant ?? 0;
  switch (p.kind) {
    case 'bush': return { g: bushSprite(season, v), dx: 0, dy: 0 };
    case 'flower': return { g: flowerSprite(season, v), dx: 0, dy: 8 };
    case 'rock': return { g: rockSprite(v, season), dx: 0, dy: 0 };
    case 'stump': return { g: stumpSprite(), dx: 0, dy: 0 };
    case 'crate': return { g: crateSprite(), dx: 0, dy: 0 };
    case 'barrel': return { g: barrelSprite(), dx: 0, dy: 0 };
    case 'fenceH': return { g: fenceSprite('h', season), dx: 0, dy: 0 };
    case 'fenceV': return { g: fenceSprite('v', season), dx: 0, dy: 0 };
    case 'fencePost': return { g: fenceSprite('post', season), dx: 0, dy: 0 };
    case 'lamp': return { g: lampSprite(lit), dx: 0, dy: -16 };
    case 'sign': return { g: signSprite(), dx: 0, dy: 0 };
    case 'scarecrow': return { g: scarecrowSprite(), dx: 0, dy: -8 };
    case 'pumpkin': return season === 'autumn' ? { g: pumpkinSprite(), dx: 0, dy: 0 } : { g: bushSprite(season, 1), dx: 0, dy: 0 };
    case 'snowman': return season === 'winter' ? { g: snowmanSprite(), dx: 0, dy: -8 } : { g: rockSprite(1, season), dx: 0, dy: 0 };
    case 'leaves': return season === 'autumn' ? { g: leavesSprite(v), dx: 0, dy: 0 } : { g: flowerSprite(season, v), dx: 0, dy: 8 };
    case 'reed': return { g: reedSprite(season, v), dx: 0, dy: 0 };
    case 'clothesline': return { g: clotheslineSprite(frame), dx: 0, dy: 0 };
    default: return null;
  }
}

/** 小物层：树影 + 全部小物件（路灯亮不亮跟时段） */
export function decorGrid(season: Season, lit: boolean): Grid {
  return tile(`decor|${season}|${lit}`, () => {
    const g = new Grid(MAP_W, MAP_H);
    for (const t of TREES) g.compose(treeShadow(season, t.seed), t.x * TILE + 2, t.y * TILE + 6);
    for (const p of allProps()) {
      const s = propGrid(p, season, lit, 0);
      if (s) g.compose(s.g, p.x * TILE + s.dx, p.y * TILE + s.dy);
    }
    return g;
  });
}

/** 建筑层：九栋，亮灯与否跟时段 */
export function buildingsGrid(season: Season, lit: boolean): Grid {
  return tile(`buildings|${season}|${lit}`, () => {
    const g = new Grid(MAP_W, MAP_H);
    for (const p of PLACEMENTS) {
      const b = BUILDINGS.find((x) => x.key === p.key)!;
      g.compose(b.draw(season, lit, 0), p.x * TILE, p.y * TILE);
    }
    return g;
  });
}

/** 树层（2 帧摇动） */
export function treesGrid(season: Season, frame: number): Grid {
  return tile(`trees|${season}|${frame % 2}`, () => {
    const g = new Grid(MAP_W, MAP_H);
    for (const t of TREES) g.compose(treeSprite(season, t.shape, frame % 2, t.seed), t.x * TILE, (t.y - 2) * TILE);
    return g;
  });
}

/** 发光区：建筑整块 + 路灯格 */
export function emissiveRects(): Emissive[] {
  const out: Emissive[] = PLACEMENTS.map((p) => ({ x: p.x * TILE, y: p.y * TILE, w: p.w * TILE, h: p.h * TILE }));
  for (const p of allProps()) if (p.kind === 'lamp') out.push({ x: p.x * TILE, y: p.y * TILE - 16, w: TILE, h: 32 });
  return out;
}

/** 建静态层：先出地面 + 建筑 + 水第 0 帧，其余排进 pending，由场景每帧补一步 */
export function buildLayers(season: Season, slot: Slot, next?: Slot): StaticLayers {
  const t0 = performance.now();
  const lit = lightsOnFor(slot, next);
  const em = emissiveRects();
  const pools = lit && slot !== 'dusk' ? LIGHTS : [];
  const grade = (day: Grid) => {
    const n = applySlot(day, slot, next, em);
    return pools.length ? applyLightPools(n, day, pools) : n;
  };
  const ground = gridToCanvas(grade(groundGrid(season)));
  const buildings = gridToCanvas(grade(buildingsGrid(season, lit)));
  const water0 = gridToCanvas(grade(waterGrid(season, 0)));
  const L: StaticLayers = { season, slot, next, lightsOn: lit, ground, buildings, water: [water0, null, null], decor: null, trees: [null, null], pending: [], buildMs: 0, totalMs: 0 };
  L.buildMs = performance.now() - t0;
  L.totalMs = L.buildMs;
  const step = (f: () => void) => () => {
    const a = performance.now();
    f();
    L.totalMs += performance.now() - a;
  };
  L.pending = [
    step(() => { L.decor = gridToCanvas(grade(decorGrid(season, lit))); }),
    step(() => { L.trees[0] = gridToCanvas(grade(treesGrid(season, 0))); }),
    step(() => { L.water[1] = gridToCanvas(grade(waterGrid(season, 1))); }),
    step(() => { L.water[2] = gridToCanvas(grade(waterGrid(season, 2))); }),
    step(() => { L.trees[1] = gridToCanvas(grade(treesGrid(season, 1))); }),
  ];
  return L;
}

/** 做一步没做完的建层；全做完返回 false */
export function buildStep(L: StaticLayers): boolean {
  const f = L.pending.shift();
  if (!f) return false;
  f();
  return true;
}
