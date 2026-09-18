/**
 * 场景合成：每逻辑帧把缓存层 drawImage 到主 canvas，再画动件（烟、鸭子、船、人物、气泡、粒子）。
 * 命中区也在这里算（人物优先于建筑）。
 */
import type { Season } from '@/lib/season';
import type { VillageModel } from '../model';
import { PLACEMENTS, DUCK_PATHS, BOAT_AT, TELLER_CELL, CAT_CELL, ME_CELL, MAP_W, MAP_H, AREA_CELLS, emptyCheck, walkable, COLS, ROWS, type Placement } from '../layout';
import { TILE } from '../sprites/tile';
import { charSprite, ghostSprite, starSprite, catSprite, stoolSprite, heartBubble } from '../sprites/chars/char';
import { smokeSprite } from '../sprites/buildings/oldhouse';
import { duckSprite, boatSprite } from '../sprites/water';
import { fxKind, particlesAt } from '../sprites/fx';
import { gradeColor, type Slot } from '../sprites/daylight';
import { fortuneTellerAvatar } from '@/features/fortune/teller';
import { buildLayers, buildStep, type StaticLayers } from './layers';
import { spriteCanvas, memoGrid } from './canvas';
import { placeVillagers, stepActors, type Actor, type Overflow } from './behavior';
import { ramp } from '../palette';
import { nameplateSprite } from '../sprites/nameplate';


export interface Debug {
  /** 门口的区域名牌 */
  signs?: boolean;
  grid?: boolean;
  areas?: boolean;
  empty?: boolean;
  hit?: boolean;
}

export type HitTarget = { kind: 'villager'; actor: Actor } | { kind: 'building'; placement: Placement } | { kind: 'me' } | { kind: 'teller' };

export interface HitRect {
  x: number;
  y: number;
  w: number;
  h: number;
  target: HitTarget;
}

export interface Perf {
  /** 首帧：首批建层 + 第一次绘制 */
  firstFrameMs: number;
  /** 首批建层（地面 + 建筑 + 水 0） */
  buildMs: number;
  /** 全部层建完的累计建层时间 */
  totalBuildMs: number;
  frameMs: number;
  frames: number;
}

export class Scene {
  layers: StaticLayers | null = null;
  actors: Actor[] = [];
  overflow: Overflow[] = [];
  frame = 0;
  perf: Perf = { firstFrameMs: 0, buildMs: 0, totalBuildMs: 0, frameMs: 0, frames: 0 };
  private frameAcc = 0;
  private model: VillageModel | null = null;

  constructor(private ctx: CanvasRenderingContext2D) {
    ctx.imageSmoothingEnabled = false;
  }

  setModel(model: VillageModel) {
    // 人还是那些人就不重新站位（保留走动状态）
    const ids = model.villagers.map((v) => `${v.person.id}:${v.area}:${v.ghost}:${v.golden}`).join('|');
    if (this.model && this.model.villagers.map((v) => `${v.person.id}:${v.area}:${v.ghost}:${v.golden}`).join('|') === ids) {
      this.model = model;
      for (const a of this.actors) a.v = model.villagers.find((v) => v.person.id === a.v.person.id) ?? a.v;
      return;
    }
    this.model = model;
    const { actors, overflow } = placeVillagers(model.villagers);
    this.actors = actors;
    this.overflow = overflow;
  }

  ensureLayers(season: Season, slot: Slot, next?: Slot) {
    const l = this.layers;
    if (l && l.season === season && l.slot === slot && l.next === next) return;
    this.layers = buildLayers(season, slot, next);
    this.perf.buildMs = this.layers.buildMs;
    this.perf.totalBuildMs = this.layers.totalMs;
  }

  tick() {
    const occupied = new Set(this.actors.map((a) => `${Math.round(a.x / TILE)},${Math.round(a.y / TILE)}`));
    stepActors(this.actors, this.frame, occupied);
    this.frame++;
  }

  /** 画一帧（不推进逻辑帧） */
  draw(season: Season, slot: Slot, next: Slot | undefined, debug: Debug = {}) {
    const t0 = performance.now();
    this.ensureLayers(season, slot, next);
    const L = this.layers!;
    const ctx = this.ctx;
    const f = this.frame;
    ctx.clearRect(0, 0, MAP_W, MAP_H);
    ctx.drawImage(L.ground, 0, 0);
    ctx.drawImage(L.water[f % 3] ?? L.water[0]!, 0, 0);
    if (L.decor) ctx.drawImage(L.decor, 0, 0);
    ctx.drawImage(L.buildings, 0, 0);
    const tree = L.trees[Math.floor(f / 4) % 2] ?? L.trees[0];
    if (tree) ctx.drawImage(tree, 0, 0);

    const put = (g: import('@/pixel/painter').Grid, x: number, y: number) => ctx.drawImage(spriteCanvas(g, slot, next), x, y);

    // 门口的区域名牌（牌坊有自己的匾额；湖边小屋放在甲板左端）
    if (debug.signs)
      for (const p of PLACEMENTS) {
        if (p.key === 'gate') continue;
        const px = p.x * TILE + 1;
        const py = p.key === 'lakehouse' ? (p.y + p.h - 2) * TILE + 4 : (p.y + p.h) * TILE + 2;
        put(nameplateSprite(p.key), px, py);
      }

    // 烟囱烟（老宅、旅店、工坊）
    for (const key of ['oldhouse', 'inn', 'workshop'] as const) {
      const p = PLACEMENTS.find((x) => x.key === key)!;
      const b = SMOKE_AT[key];
      put(memoGrid(`smoke|${f % 4}`, () => smokeSprite(f % 4)), p.x * TILE + b[0], p.y * TILE + b[1]);
    }
    // 鸭子：沿四点来回
    DUCK_PATHS.forEach((path, i) => {
      const seg = Math.floor(f / 24) % path.length;
      const t = (f % 24) / 24;
      const a = path[seg], b = path[(seg + 1) % path.length];
      const x = Math.round((a[0] + (b[0] - a[0]) * t) * TILE) + 3;
      const y = Math.round((a[1] + (b[1] - a[1]) * t) * TILE) + 4;
      const facing = b[0] >= a[0] ? 'r' : 'l';
      put(memoGrid(`duck|${season}|${facing}|${Math.floor(f / 4) % 2}`, () => duckSprite(Math.floor(f / 4) % 2, facing, season)), x, y + (i % 2));
    });
    // 小船
    put(memoGrid(`boat|${season}|${Math.floor(f / 8) % 2}`, () => boatSprite(Math.floor(f / 8) % 2, season)), BOAT_AT[0] * TILE, BOAT_AT[1] * TILE + 3);

    // 星婆婆坐小凳 + 黑猫
    put(charSprite(fortuneTellerAvatar, 'down', 'sit', Math.floor(f / 4) % 4), TELLER_CELL[0] * TILE, TELLER_CELL[1] * TILE - 8);
    put(memoGrid('stool', () => stoolSprite()), TELLER_CELL[0] * TILE + 1, TELLER_CELL[1] * TILE + 11);
    put(memoGrid(`cat|${Math.floor(f / 6) % 2}`, () => catSprite(Math.floor(f / 6) % 2, 'l')), CAT_CELL[0] * TILE + 2, CAT_CELL[1] * TILE + 6);

    // 「我」站菜园边
    const me = this.model?.me;
    if (me) put(charSprite(me.avatar, 'down', 'idle', Math.floor(f / 4) % 4), ME_CELL[0] * TILE, ME_CELL[1] * TILE - 8);

    // 村民：按 y 排序
    const sorted = [...this.actors].sort((a, b) => a.y - b.y);
    for (const a of sorted) {
      if (a.v.ghost) {
        put(ghostSprite(a.v.person.avatar, Math.floor(f / 8) % 2), a.x, a.y - 16);
        continue;
      }
      const anim = a.walking ? 'walk' : 'idle';
      const fr = a.walking ? Math.floor(a.step / 2) % 4 : Math.floor(f / 4) % 4;
      put(charSprite(a.v.person.avatar, a.dir, anim, fr), a.x, a.y - 8);
      if (a.v.golden) put(memoGrid(`star|${Math.floor(f / 4) % 2}`, () => starSprite(Math.floor(f / 4) % 2)), a.x + 4, a.y - 17);
      if (f < a.bubbleUntil) put(memoGrid('heart', () => heartBubble()), a.x + 8, a.y - 18 - (f % 2));
    }
    // 满员 +N
    for (const o of this.overflow) this.badge(o.placement, o.n, slot, next);

    // 粒子
    const kind = fxKind(season, slot);
    if (kind !== 'none') {
      for (const p of particlesAt(kind, f, MAP_W, MAP_H, 3)) {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 1, 1);
        if (p.tail) ctx.fillRect(p.x + p.tail[0], p.y + p.tail[1], 1, 1);
      }
    }

    if (debug.grid || debug.areas || debug.empty || debug.hit) this.drawDebug(debug);

    const dt = performance.now() - t0;
    if (this.perf.frames === 0) this.perf.firstFrameMs = dt + this.perf.buildMs;
    this.perf.frames++;
    // 首帧之后每帧只累计绘制耗时（不含补建层）
    if (this.perf.frames > 1) {
      this.frameAcc += dt;
      this.perf.frameMs = this.frameAcc / (this.perf.frames - 1);
    }
    // 画完这帧再补一步没建完的层，下一帧就有了
    if (buildStep(L)) this.perf.totalBuildMs = L.totalMs;
  }

  private badge(p: Placement, n: number, slot: Slot, next?: Slot) {
    const ctx = this.ctx;
    const x = (p.x + p.w) * TILE - 14, y = p.y * TILE + 2;
    const gd = ramp('gold'), ink = ramp('ink');
    ctx.fillStyle = gradeColor(ink.base, slot, next);
    ctx.fillRect(x - 1, y - 1, 15, 9);
    ctx.fillStyle = gd.base;
    ctx.fillRect(x, y, 13, 7);
    ctx.fillStyle = ink.dark;
    ctx.font = '7px monospace';
    ctx.textBaseline = 'top';
    ctx.fillText(`+${n}`, x + 2, y);
  }

  /** 命中区：人物 28×44（tile + 上一格再外扩 6）优先，其次建筑整块 */
  hitRects(): HitRect[] {
    const out: HitRect[] = [];
    for (const a of this.actors) out.push({ x: a.x - 6, y: a.y - 16 - 6, w: TILE + 12, h: 32 + 12, target: { kind: 'villager', actor: a } });
    if (this.model?.me) out.push({ x: ME_CELL[0] * TILE - 6, y: ME_CELL[1] * TILE - 22, w: 28, h: 44, target: { kind: 'me' } });
    out.push({ x: TELLER_CELL[0] * TILE - 6, y: TELLER_CELL[1] * TILE - 22, w: 28, h: 44, target: { kind: 'teller' } });
    for (const p of PLACEMENTS) out.push({ x: p.x * TILE, y: p.y * TILE, w: p.w * TILE, h: p.h * TILE, target: { kind: 'building', placement: p } });
    return out;
  }

  hitTest(x: number, y: number): HitTarget | null {
    for (const r of this.hitRects()) if (x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h) return r.target;
    return null;
  }

  private drawDebug(d: Debug) {
    const ctx = this.ctx;
    if (d.grid) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      for (let x = 0; x <= COLS; x++) ctx.fillRect(x * TILE, 0, 1, MAP_H);
      for (let y = 0; y <= ROWS; y++) ctx.fillRect(0, y * TILE, MAP_W, 1);
    }
    if (d.areas) {
      const colors: Record<string, string> = { family: 'rgba(200,80,80,0.35)', home: 'rgba(240,200,60,0.35)', plaza: 'rgba(80,160,240,0.35)', workshop: 'rgba(120,120,200,0.35)', lakeside: 'rgba(240,120,180,0.35)', inn: 'rgba(80,200,120,0.35)', tent: 'rgba(160,80,200,0.35)', all: 'rgba(255,255,255,0.35)' };
      for (const [k, cells] of Object.entries(AREA_CELLS)) {
        if (k === 'field') continue;
        ctx.fillStyle = colors[k] ?? 'rgba(255,255,255,0.3)';
        for (const [x, y] of cells) ctx.fillRect(x * TILE + 1, y * TILE + 1, TILE - 2, TILE - 2);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (walkable(x, y)) ctx.fillRect(x * TILE + 6, y * TILE + 6, 4, 4);
    }
    if (d.empty) {
      const { empty, bad } = emptyCheck();
      ctx.fillStyle = 'rgba(255,220,0,0.45)';
      for (const [x, y] of empty) ctx.fillRect(x * TILE + 2, y * TILE + 2, TILE - 4, TILE - 4);
      ctx.fillStyle = 'rgba(255,0,0,0.7)';
      for (const [x, y] of bad) ctx.fillRect(x * TILE + 2, y * TILE + 2, TILE - 4, TILE - 4);
    }
    if (d.hit) {
      ctx.strokeStyle = 'rgba(255,80,80,0.9)';
      ctx.lineWidth = 1;
      for (const r of this.hitRects()) ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    }
  }
}

const SMOKE_AT: Record<'oldhouse' | 'inn' | 'workshop', [number, number]> = { oldhouse: [62, -14], inn: [54, -14], workshop: [16, -14] };
