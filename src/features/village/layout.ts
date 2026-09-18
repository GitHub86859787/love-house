/**
 * 村庄布局：24×22 图块表、九处建筑的落位、站位 / 可走格、光源、小物填充规则、空地检查。
 * 只描述「哪里是什么」，不画图；渲染在 renderer/ 里。
 *
 * 地面图例：M 远山（只在第 0 行）、f 田、. 草（小物件填满）、= 土路、S 石板（广场）、~ 水、B 木桥。
 * 建筑脚下的地面按图例铺（广场是石板、牌坊下是路），建筑本体另画。
 */
import type { AreaId } from './areas';
import { TILE } from './sprites/tile';
import { hash2 } from './sprites/tile';

export const COLS = 24;
export const ROWS = 22;
export const MAP_W = COLS * TILE;
export const MAP_H = ROWS * TILE;

export type Ground = 'M' | 'f' | '.' | '=' | 'S' | '~' | 'B';

// prettier-ignore
const MAP: string[] = [
  'MMMMMMMMMMMMMMMMMMMMMM~~', // 0
  '..ffffffff............~~', // 1
  '........ff............~~', // 2
  '........ff............~~', // 3
  '......................~~', // 4
  '......................~~', // 5
  '......................~~', // 6
  '......................~~', // 7
  '......................~~', // 8
  '.=====================~~', // 9
  '.===============~~~~~~~~', // 10
  '........SSSSSSSS~~~~~~~~', // 11
  '........SSSSSSSS~~......', // 12
  '........SSSSSSSS~~......', // 13
  '........SSSSSSSS~~......', // 14
  '..======SSSSSSSS~~......', // 15
  '.......==.=....=BB======', // 16
  '.......==.=....=BB====..', // 17
  '.......==.=.....~~......', // 18
  '......=====.....~~......', // 19
  '.=========~~~~~~~~~~~~~~', // 20
  '......====~~~~~~~~~~~~~~', // 21
];

export function groundAt(x: number, y: number): Ground {
  if (y < 0 || y >= ROWS || x < 0 || x >= COLS) return '.';
  const row = MAP[y];
  const ch = x < row.length ? row[x] : '.';
  return ch as Ground;
}

/* ------------------------------ 建筑 ------------------------------ */
export type BuildingKey = 'oldhouse' | 'home' | 'inn' | 'workshop' | 'tent' | 'plaza' | 'teahouse' | 'lakehouse' | 'gate';

export interface Placement {
  key: BuildingKey;
  /** 左上角 tile */
  x: number;
  y: number;
  /** 占几格 */
  w: number;
  h: number;
  /** 对应的区域（点建筑弹哪一区的名单）；牌坊 = 全部；茶馆借广场 */
  area: AreaId | 'all';
  label: string;
  /** 门口站位（村民按顺序站这些格，第一格是门口） */
  cells: [number, number][];
  /** 站位朝向循环 */
  faces: ('down' | 'left' | 'right' | 'up')[];
  /** 最多站几个，超出画 +N */
  cap: number;
}

export const PLACEMENTS: Placement[] = [
  { key: 'oldhouse', x: 2, y: 2, w: 6, h: 7, area: 'family', label: '老宅', cells: [[4, 9], [6, 9], [2, 10], [7, 10], [3, 9], [5, 10]], faces: ['down', 'left', 'right', 'down'], cap: 4 },
  { key: 'home', x: 10, y: 3, w: 5, h: 6, area: 'home', label: '我的家', cells: [[12, 9], [10, 9], [14, 10], [11, 10]], faces: ['down', 'right', 'left', 'down'], cap: 2 },
  { key: 'workshop', x: 16, y: 4, w: 6, h: 5, area: 'workshop', label: '工坊', cells: [[18, 9], [20, 9], [16, 9], [21, 9], [17, 9], [19, 9]], faces: ['down', 'left', 'right', 'down'], cap: 4 },
  { key: 'tent', x: 2, y: 11, w: 5, h: 4, area: 'tent', label: '星婆婆的帐篷', cells: [[4, 15], [6, 15]], faces: ['down', 'left'], cap: 1 },
  { key: 'plaza', x: 10, y: 12, w: 4, h: 3, area: 'plaza', label: '朋友广场', cells: [[9, 14], [14, 13], [11, 15], [8, 12], [15, 11], [13, 15], [9, 11], [14, 15]], faces: ['right', 'left', 'down', 'down', 'left', 'up'], cap: 6 },
  { key: 'teahouse', x: 19, y: 12, w: 4, h: 4, area: 'plaza', label: '茶馆', cells: [[20, 16], [22, 16], [19, 17]], faces: ['down', 'left', 'right'], cap: 3 },
  { key: 'inn', x: 1, y: 15, w: 5, h: 5, area: 'inn', label: '旅店', cells: [[3, 20], [5, 20], [1, 20], [2, 20]], faces: ['down', 'left', 'right', 'up'], cap: 4 },
  { key: 'lakehouse', x: 11, y: 16, w: 5, h: 5, area: 'lakeside', label: '湖边小屋', cells: [[12, 19], [14, 19], [10, 18], [11, 19]], faces: ['down', 'left', 'right', 'down'], cap: 3 },
  { key: 'gate', x: 6, y: 19, w: 4, h: 3, area: 'all', label: '村口', cells: [[7, 18], [8, 18]], faces: ['down', 'down'], cap: 0 },
];

export const placement = (key: BuildingKey): Placement => PLACEMENTS.find((p) => p.key === key)!;

/** 每个区域可以走动的格子（都是路 / 石板 / 桥 / 甲板） */
export const AREA_CELLS: Record<AreaId | 'all', [number, number][]> = {
  family: cellsIn(1, 9, 8, 10),
  home: cellsIn(9, 9, 15, 10),
  workshop: cellsIn(16, 9, 21, 9),
  tent: cellsIn(2, 15, 7, 15),
  plaza: [...cellsIn(8, 11, 15, 15).filter(([x, y]) => !(x >= 10 && x <= 13 && y >= 12 && y <= 14)), [15, 16], [15, 17], [16, 16], [17, 16], [16, 17], [17, 17], ...cellsIn(18, 16, 23, 16), ...cellsIn(18, 17, 21, 17)],
  inn: [...cellsIn(1, 20, 5, 20), ...cellsIn(6, 21, 9, 21)],
  lakeside: [...cellsIn(11, 19, 15, 19), [10, 16], [10, 17], [10, 18], [10, 19]],
  field: cellsIn(1, 9, 8, 10),
  all: [...cellsIn(7, 16, 8, 18), ...cellsIn(6, 19, 9, 19)],
};

function cellsIn(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  const out: [number, number][] = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push([x, y]);
  return out;
}

/* ------------------------------ 可走性 ------------------------------ */
/** 湖边小屋甲板那一行踩得上 */
const DECK: [number, number][] = cellsIn(11, 19, 15, 19);

export function walkable(x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return false;
  const g = groundAt(x, y);
  if (g === '=' || g === 'S' || g === 'B') return !insidePlazaProp(x, y);
  return DECK.some(([cx, cy]) => cx === x && cy === y);
}

function insidePlazaProp(x: number, y: number): boolean {
  const p = placement('plaza');
  return x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h;
}

/** 广度优先：从 from 到 to 的格路径（含两端），走不到返回 null */
export function findPath(from: [number, number], to: [number, number], allow: (x: number, y: number) => boolean = walkable): [number, number][] | null {
  const key = (x: number, y: number) => y * COLS + x;
  const prev = new Map<number, number>();
  const q: [number, number][] = [from];
  prev.set(key(...from), -1);
  while (q.length) {
    const [x, y] = q.shift()!;
    if (x === to[0] && y === to[1]) {
      const out: [number, number][] = [];
      let k = key(x, y);
      while (k !== -1) {
        out.unshift([k % COLS, Math.floor(k / COLS)]);
        k = prev.get(k)!;
      }
      return out;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx, ny = y + dy;
      if (!allow(nx, ny) || prev.has(key(nx, ny))) continue;
      prev.set(key(nx, ny), key(x, y));
      q.push([nx, ny]);
    }
  }
  return null;
}

/** 村口台阶下那格：连通性检查的起点 */
export const GATE_ENTRY: [number, number] = [7, 21];

/* ------------------------------ 树 ------------------------------ */
/** 树的落点（树根所在 tile，树占 2 宽 3 高，向上长） */
export interface TreeSpot {
  x: number;
  y: number;
  shape: 'round' | 'tall';
  seed: number;
}
export const TREES: TreeSpot[] = [
  { x: 0, y: 1, shape: 'tall', seed: 1 },
  { x: 10, y: 1, shape: 'round', seed: 2 },
  { x: 14, y: 1, shape: 'tall', seed: 3 },
  { x: 20, y: 1, shape: 'round', seed: 4 },
  { x: 0, y: 13, shape: 'round', seed: 5 },
  { x: 22, y: 19, shape: 'round', seed: 6 },
];

/* ------------------------------ 光源（夜里地面的光池） ------------------------------ */
export interface Light {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}
export const LIGHTS: Light[] = [
  { cx: 2 * TILE + 44, cy: 9 * TILE + 5, rx: 15, ry: 6 }, // 老宅门口
  { cx: 2 * TILE + 22, cy: 9 * TILE, rx: 7, ry: 3 }, // 老宅左窗
  { cx: 2 * TILE + 76, cy: 9 * TILE, rx: 7, ry: 3 }, // 老宅右窗
  { cx: 10 * TILE + 40, cy: 9 * TILE + 4, rx: 12, ry: 5 }, // 我的家门口
  { cx: 16 * TILE + 44, cy: 9 * TILE + 4, rx: 13, ry: 5 }, // 工坊门口
  { cx: 1 * TILE + 40, cy: 20 * TILE + 4, rx: 12, ry: 5 }, // 旅店门口
  { cx: 11 * TILE + 46, cy: 19 * TILE + 10, rx: 12, ry: 4 }, // 湖边小屋门口平台
  { cx: 19 * TILE + 32, cy: 16 * TILE + 4, rx: 12, ry: 5 }, // 茶馆台阶前
  { cx: 6 * TILE + 8, cy: 21 * TILE + 2, rx: 6, ry: 3 }, // 牌坊左石灯
  { cx: 6 * TILE + 60, cy: 21 * TILE + 2, rx: 6, ry: 3 }, // 牌坊右石灯
  { cx: 10 * TILE + 6, cy: 15 * TILE - 2, rx: 10, ry: 4 }, // 广场路灯
  { cx: 4 * TILE + 8, cy: 15 * TILE + 8, rx: 9, ry: 4 }, // 帐篷前灯笼
];

/* ------------------------------ 小物件 ------------------------------ */
export type PropKind = 'bush' | 'flower' | 'rock' | 'stump' | 'crate' | 'barrel' | 'fenceH' | 'fenceV' | 'fencePost' | 'lamp' | 'sign' | 'scarecrow' | 'pumpkin' | 'snowman' | 'leaves' | 'reed' | 'clothesline';

export interface PropSpot {
  kind: PropKind;
  x: number;
  y: number;
  variant?: number;
}

/** 手放的重点小物（先放） */
const HERO_PROPS: PropSpot[] = [
  { kind: 'scarecrow', x: 8, y: 1 },
  { kind: 'lamp', x: 9, y: 8 },
  { kind: 'sign', x: 8, y: 8 },
  { kind: 'lamp', x: 15, y: 8 },
  { kind: 'lamp', x: 1, y: 14 },
  { kind: 'lamp', x: 9, y: 16 },
  { kind: 'lamp', x: 18, y: 18 },
  { kind: 'sign', x: 10, y: 21 },
  { kind: 'sign', x: 5, y: 21 },
  { kind: 'crate', x: 16, y: 3 },
  { kind: 'barrel', x: 17, y: 3 },
  { kind: 'crate', x: 21, y: 3 },
  { kind: 'barrel', x: 16, y: 2 },
  { kind: 'clothesline', x: 12, y: 2 },
  { kind: 'pumpkin', x: 9, y: 2 },
  { kind: 'snowman', x: 0, y: 21 },
  { kind: 'reed', x: 18, y: 12 },
  { kind: 'reed', x: 15, y: 18 },
  { kind: 'reed', x: 18, y: 19 },
  { kind: 'reed', x: 21, y: 19 },
  { kind: 'reed', x: 20, y: 18 },
  { kind: 'reed', x: 14, y: 12 },
  { kind: 'reed', x: 21, y: 9 },
  { kind: 'reed', x: 21, y: 1 },
  { kind: 'reed', x: 21, y: 6 },
  { kind: 'bush', x: 0, y: 15 },
  { kind: 'bush', x: 0, y: 18 },
];

/** 围栏：沿主路两侧、田边 */
const FENCES: PropSpot[] = [
  ...[2, 3, 5, 6].map((x) => ({ kind: 'fenceH' as const, x, y: 1 - 1 + 0, variant: 0 })).filter(() => false), // 占位：田边不围（田本身有垄）
  ...[16, 17, 18, 19, 20, 21].map((x) => ({ kind: 'fenceH' as const, x, y: 10 - 0 })).filter(() => false),
  { kind: 'fenceV', x: 0, y: 2 }, { kind: 'fenceV', x: 0, y: 3 }, { kind: 'fenceV', x: 0, y: 4 }, { kind: 'fenceV', x: 0, y: 5 }, { kind: 'fenceV', x: 0, y: 6 }, { kind: 'fencePost', x: 0, y: 7 },
  { kind: 'fenceH', x: 7, y: 11 },
  { kind: 'fenceH', x: 18, y: 8 }, { kind: 'fenceH', x: 19, y: 8 },
  { kind: 'fenceH', x: 19, y: 18 }, { kind: 'fencePost', x: 22, y: 18 },
  { kind: 'fenceH', x: 1, y: 16 }, { kind: 'fencePost', x: 6, y: 16 }, { kind: 'fenceV', x: 6, y: 17 }, { kind: 'fenceV', x: 9, y: 17 }, { kind: 'fenceV', x: 9, y: 18 },
];

export function isBuildingCell(x: number, y: number): boolean {
  return PLACEMENTS.some((p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h);
}
export function isTreeCell(x: number, y: number): boolean {
  return TREES.some((t) => x >= t.x && x <= t.x + 1 && y <= t.y && y >= t.y - 2);
}

/** 这格是不是「需要填」的草地：草、没建筑、没树 */
export function isOpenGrass(x: number, y: number): boolean {
  return groundAt(x, y) === '.' && !isBuildingCell(x, y) && !isTreeCell(x, y);
}

const FILLERS: PropKind[] = ['flower', 'flower', 'bush', 'flower', 'rock', 'flower', 'stump', 'bush', 'flower', 'rock', 'leaves'];

/**
 * 全部小物：重点物 + 围栏 + 自动填充。
 * 自动填充规则：任何一行 / 一列里连续 ≥ 3 格没填的草地，隔一格放一个小东西，保证没有 3 格以上的空地。
 */
export function allProps(): PropSpot[] {
  const props: PropSpot[] = [...HERO_PROPS, ...FENCES].filter((p) => isOpenGrass(p.x, p.y));
  const has = (x: number, y: number) => props.some((p) => p.x === x && p.y === y);
  const free = (x: number, y: number) => isOpenGrass(x, y) && !has(x, y);
  const pickFiller = (x: number, y: number): PropKind => {
    // 水边多放芦苇；其余按哈希挑
    const nearWater = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => groundAt(x + dx, y + dy) === '~');
    if (nearWater && hash2(x, y, 31) < 0.7) return 'reed';
    return FILLERS[Math.floor(hash2(x, y, 32) * FILLERS.length)];
  };
  const fillRuns = (horizontal: boolean) => {
    const outer = horizontal ? ROWS : COLS;
    const inner = horizontal ? COLS : ROWS;
    for (let a = 0; a < outer; a++) {
      let run: [number, number][] = [];
      const flush = () => {
        if (run.length >= 3) for (let i = 1; i < run.length; i += 2) props.push({ kind: pickFiller(run[i][0], run[i][1]), x: run[i][0], y: run[i][1], variant: Math.floor(hash2(run[i][0], run[i][1], 33) * 3) });
        run = [];
      };
      for (let b = 0; b < inner; b++) {
        const x = horizontal ? b : a, y = horizontal ? a : b;
        if (free(x, y)) run.push([x, y]);
        else flush();
      }
      flush();
    }
  };
  fillRuns(true);
  fillRuns(false);
  return props;
}

/** 空地检查：返回没填的草格，以及其中处在 ≥3 连续空格里的（红） */
export function emptyCheck(props: PropSpot[] = allProps()): { empty: [number, number][]; bad: [number, number][] } {
  const has = (x: number, y: number) => props.some((p) => p.x === x && p.y === y);
  const empty: [number, number][] = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (isOpenGrass(x, y) && !has(x, y)) empty.push([x, y]);
  const isEmpty = (x: number, y: number) => empty.some(([ex, ey]) => ex === x && ey === y);
  const bad: [number, number][] = [];
  for (const [x, y] of empty) {
    const runH = [-2, -1, 0].some((o) => [0, 1, 2].every((k) => isEmpty(x + o + k, y)));
    const runV = [-2, -1, 0].some((o) => [0, 1, 2].every((k) => isEmpty(x, y + o + k)));
    if (runH || runV) bad.push([x, y]);
  }
  return { empty, bad };
}

/* ------------------------------ 动物 / 小船 ------------------------------ */
/** 鸭子来回的四个点（tile） */
export const DUCK_PATHS: [number, number][][] = [
  [[18, 20], [20, 20], [21, 21], [19, 21]],
  [[13, 21], [15, 21], [16, 20], [14, 20]],
];
export const BOAT_AT: [number, number] = [16, 20];

/** 星婆婆坐的位置、黑猫、「我」 */
export const TELLER_CELL: [number, number] = [4, 15];
export const CAT_CELL: [number, number] = [5, 15];
export const ME_CELL: [number, number] = [10, 8];
