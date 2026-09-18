/**
 * 第 6 类 · 昼夜 / 光晕 / 粒子验收视图：
 *  同一个样例场景（老宅 + 树 + 路灯 + 两个人 + 一段溪）横排五个时段，春天一行、冬天一行；
 *  下面是四种粒子的 4 帧分解和一格实时动画。
 */
import { useMemo } from 'react';
import { Grid } from '@/pixel/painter';
import type { Season } from '@/lib/season';
import { PALETTE } from '../palette';
import { grassAt, pathTile } from '../sprites/ground';
import { composeWater, type Cell } from '../sprites/water';
import { treeShadow, treeSprite } from '../sprites/flora';
import { lampSprite } from '../sprites/props';
import { BUILDINGS } from '../sprites/buildings';
import { smokeSprite } from '../sprites/buildings/oldhouse';
import { charSprite } from '../sprites/chars/char';
import { applyLightPools, applySlot, SLOT_LABEL, SLOTS, type Slot } from '../sprites/daylight';
import { drawParticles, fxKind, fxStrip, type FxKind } from '../sprites/fx';
import { TILE } from '../sprites/tile';
import { samplePeople } from './CharSheet';
import { Px } from './Px';
import styles from './PreviewPage.module.css';

const COLS = 11;
const ROWS = 10;
export const SCENE_W = COLS * TILE;
export const SCENE_H = ROWS * TILE;

const LIT: Set<Slot> = new Set(['dusk', 'evening', 'night']);

/** 样例场景（白天原图，带不带灯由 lightsOn 决定） */
function dayScene(season: Season, lightsOn: boolean, frame: number): Grid {
  const g = new Grid(SCENE_W, SCENE_H);
  // 地面
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) g.compose(grassAt(season, x + 80, y + 80), x * TILE, y * TILE);
  g.compose(pathTile(season, { n: true, s: false, e: true, w: true }, 3, 8), 3 * TILE, 8 * TILE);
  g.compose(pathTile(season, { n: false, s: false, e: true, w: true }, 3, 9), 3 * TILE, 9 * TILE);
  // 溪：右侧两格宽
  const map: Cell[][] = Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill('g'));
  for (let y = 0; y < ROWS; y++) { map[y][9] = 'w'; map[y][10] = 'w'; }
  composeWater(season, frame % 3, map, g);
  // 树影 → 老宅 → 树 → 路灯 → 人
  g.compose(treeShadow(season, 1), 110, 100);
  const house = BUILDINGS[0];
  g.compose(house.draw(season, lightsOn, frame), 8, 14);
  if (house.smoke) g.compose(smokeSprite(frame), 8 + house.smoke[0], 14 + house.smoke[1]);
  g.compose(treeSprite(season, 'round', frame, 1), 108, 60);
  g.compose(lampSprite(lightsOn), 66, 118);
  const [a, b] = samplePeople(2, 3);
  g.compose(charSprite(a, 'down', 'idle', frame), 24, 130);
  g.compose(charSprite(b, 'left', 'walk', frame), 84, 134);
  return g;
}

export function sampleScene(season: Season, slot: Slot, frame: number, next?: Slot): Grid {
  const lightsOn = LIT.has(slot) || (next !== undefined && LIT.has(next) && LIT.has(slot));
  const day = dayScene(season, lightsOn, frame);
  let out = applySlot(day, slot, next, [
    { x: 8, y: 14, w: 96, h: 112 },
    { x: 66, y: 118, w: 16, h: 32 },
  ]);
  if (lightsOn && slot !== 'dusk') {
    out = applyLightPools(out, day, [
      { cx: 52, cy: 133, rx: 15, ry: 6 }, // 老宅门口台阶前
      { cx: 74, cy: 152, rx: 13, ry: 5 }, // 路灯下
      { cx: 30, cy: 128, rx: 7, ry: 3 }, // 一层左窗漏出的光
      { cx: 84, cy: 128, rx: 7, ry: 3 }, // 一层右窗
    ]);
  }
  drawParticles(out, fxKind(season, slot), frame, 1);
  return out;
}

function row(season: Season, frame: number): Grid {
  const gap = 6;
  const g = new Grid(SLOTS.length * (SCENE_W + gap) - gap, SCENE_H);
  SLOTS.forEach((s, i) => g.compose(sampleScene(season, s, frame), i * (SCENE_W + gap), 0));
  return g;
}

const FX: { kind: FxKind; label: string; bg: string }[] = [
  { kind: 'petal', label: '春 · 樱花', bg: PALETTE.grass.base },
  { kind: 'leaf', label: '秋 · 落叶', bg: PALETTE.autumn.base },
  { kind: 'snow', label: '冬 · 雪', bg: PALETTE.mist.dark },
  { kind: 'firefly', label: '夏夜 · 萤火', bg: PALETTE.night.base },
];

function fxLive(frame: number): Grid {
  const cell = 48, gap = 6;
  const g = new Grid(FX.length * (cell + gap) - gap, cell);
  FX.forEach((f, i) => {
    const c = new Grid(cell, cell);
    c.rect(0, 0, cell, cell, f.bg);
    drawParticles(c, f.kind, frame, 2);
    g.compose(c, i * (cell + gap), 0);
  });
  return g;
}

export function LightSheet({ scale, frame }: { scale: 1 | 3; frame: number }) {
  const spring = useMemo(() => row('spring', frame), [frame]);
  const winter = useMemo(() => row('winter', frame), [frame]);
  const strips = useMemo(() => FX.map((f) => ({ ...f, grid: fxStrip(f.kind, 4, 48, 48, f.bg, 2) })), []);
  const live = useMemo(() => fxLive(frame), [frame]);
  const colW = SCENE_W * scale + 6 * scale;
  return (
    <div className={styles.sheet} data-shot="sheet">
      <p className={styles.note}>同一样例场景 × 五个时段（{scale}×）。上春下冬。傍晚起亮灯；入夜 / 深夜门口与路灯下有光池。</p>
      <div className={styles.demo} data-shot="light">
        <div style={{ display: 'flex', gap: 0, color: '#e6d9c6', fontSize: 12, marginBottom: 4 }}>
          {SLOTS.map((s) => (
            <div key={s} style={{ width: colW, textAlign: 'center' }}>
              {SLOT_LABEL[s]}
            </div>
          ))}
        </div>
        <div>
          <Px grid={spring} scale={scale} />
        </div>
        <div style={{ marginTop: 6 * scale }}>
          <Px grid={winter} scale={scale} />
        </div>
      </div>
      <p className={styles.note}>粒子 4 帧分解（每格隔 2 逻辑帧 = 0.25 s）：樱花 / 落叶 / 雪 / 萤火</p>
      <div className={styles.demo} data-shot="fx">
        {strips.map((s) => (
          <div key={s.kind} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <span style={{ color: '#e6d9c6', fontSize: 12, width: 72 }}>{s.label}</span>
            <Px grid={s.grid} scale={scale} />
          </div>
        ))}
      </div>
      <p className={styles.note}>粒子实时（8 fps）</p>
      <div className={styles.demo} data-shot="fx-live">
        <Px grid={live} scale={scale} />
      </div>
    </div>
  );
}
