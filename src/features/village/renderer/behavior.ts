/**
 * 村民行为：站门口，每 6–15 秒在本区可走格里走 2–3 格再回来；灰化的坐着不动。
 * 全部按 8 fps 逻辑帧推进，不依赖真实时间，预览页冻结帧时位置也稳定。
 */
import type { Villager } from '../model';
import type { AreaId } from '../areas';
import { AREA_CELLS, PLACEMENTS, findPath, walkable, type Placement } from '../layout';
import { TILE } from '../sprites/tile';
import type { Dir } from '../sprites/chars/char';

export interface Actor {
  v: Villager;
  /** 家（门口站位）tile */
  home: [number, number];
  /** 当前像素位置（脚底中点所在 tile 的左上） */
  x: number;
  y: number;
  dir: Dir;
  walking: boolean;
  /** 剩余路径（tile） */
  path: [number, number][];
  /** 下次出门的逻辑帧 */
  nextMoveAt: number;
  /** 被点中：转身 + 心气泡，到这一帧为止 */
  bubbleUntil: number;
  /** 行走帧计数 */
  step: number;
  seed: number;
}

export interface Overflow {
  placement: Placement;
  n: number;
}

const ORDER: Record<AreaId, Placement['key']> = { family: 'oldhouse', home: 'home', plaza: 'plaza', workshop: 'workshop', lakeside: 'lakehouse', inn: 'inn', tent: 'tent', field: 'oldhouse' };

/** 把村民分到各区门口：同区多人错开 1–2 格、朝向不同；超出上限的记 +N */
export function placeVillagers(villagers: Villager[]): { actors: Actor[]; overflow: Overflow[] } {
  const actors: Actor[] = [];
  const overflow: Overflow[] = [];
  const byArea = new Map<AreaId, Villager[]>();
  for (const v of villagers) {
    const list = byArea.get(v.area) ?? [];
    list.push(v);
    byArea.set(v.area, list);
  }
  for (const [area, list] of byArea) {
    const p = PLACEMENTS.find((x) => x.key === ORDER[area])!;
    // 广场的人多时借茶馆的站位
    const cells = area === 'plaza' ? [...p.cells, ...PLACEMENTS.find((x) => x.key === 'teahouse')!.cells] : p.cells;
    const cap = area === 'plaza' ? p.cap + 3 : p.cap;
    list.forEach((v, i) => {
      if (i >= cap || i >= cells.length) return;
      const cell = cells[i];
      actors.push({
        v,
        home: cell,
        x: cell[0] * TILE,
        y: cell[1] * TILE,
        dir: p.faces[i % p.faces.length],
        walking: false,
        path: [],
        nextMoveAt: 48 + ((i * 37 + hashStr(v.person.id)) % 72),
        bubbleUntil: -1,
        step: 0,
        seed: hashStr(v.person.id),
      });
    });
    if (list.length > cap) overflow.push({ placement: p, n: list.length - cap });
  }
  return { actors, overflow };
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 100000;
}

function rnd(a: Actor, k: number): number {
  const x = Math.sin(a.seed * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const SPEED = 2; // px / 逻辑帧 → 8 帧走一格

/** 推进一帧 */
export function stepActors(actors: Actor[], frame: number, occupied: Set<string>) {
  for (const a of actors) {
    if (a.v.ghost) continue; // 坐着
    if (frame < a.bubbleUntil) { a.walking = false; a.dir = 'down'; continue; }
    if (a.walking) {
      const target = a.path[0];
      if (!target) { a.walking = false; a.step = 0; a.nextMoveAt = frame + 48 + Math.floor(rnd(a, frame) * 72); continue; }
      const tx = target[0] * TILE, ty = target[1] * TILE;
      const dx = Math.sign(tx - a.x), dy = Math.sign(ty - a.y);
      if (dx !== 0) a.dir = dx > 0 ? 'right' : 'left';
      else if (dy !== 0) a.dir = dy > 0 ? 'down' : 'up';
      a.x += dx * SPEED;
      a.y += dy * SPEED;
      a.step++;
      if (a.x === tx && a.y === ty) a.path.shift();
      continue;
    }
    if (frame >= a.nextMoveAt) {
      const cells = AREA_CELLS[a.v.area];
      const here: [number, number] = [Math.round(a.x / TILE), Math.round(a.y / TILE)];
      const atHome = here[0] === a.home[0] && here[1] === a.home[1];
      // 在家：挑 2–3 格内的一格走过去；不在家：走回家
      let goal: [number, number] | null = null;
      if (atHome) {
        const near = cells.filter(([x, y]) => Math.abs(x - here[0]) + Math.abs(y - here[1]) >= 2 && Math.abs(x - here[0]) + Math.abs(y - here[1]) <= 3 && !occupied.has(`${x},${y}`));
        if (near.length) goal = near[Math.floor(rnd(a, frame + 1) * near.length)];
      } else goal = a.home;
      if (goal) {
        const allow = (x: number, y: number) => walkable(x, y) && cells.some(([cx, cy]) => cx === x && cy === y);
        const path = findPath(here, goal, allow);
        if (path && path.length > 1) {
          a.path = path.slice(1);
          a.walking = true;
          continue;
        }
      }
      a.nextMoveAt = frame + 40 + Math.floor(rnd(a, frame + 2) * 40);
      // 待机时偶尔换个方向
      if (rnd(a, frame + 3) < 0.4) a.dir = (['down', 'left', 'right'] as Dir[])[Math.floor(rnd(a, frame + 4) * 3)];
    }
  }
}

/** 点中：转向镜头 + 气泡 12 帧（1.5 s） */
export function pokeActor(a: Actor, frame: number) {
  a.bubbleUntil = frame + 12;
  a.dir = 'down';
  a.walking = false;
  a.path = [];
  // 停在整格上
  a.x = Math.round(a.x / TILE) * TILE;
  a.y = Math.round(a.y / TILE) * TILE;
}
