/**
 * 粒子：全部是亮阶单像素（偶尔 2 像素），按 8 fps 逻辑帧确定性运动，不存状态。
 *  - 春 樱花：粉亮阶，往右下慢飘，横向摆
 *  - 秋 落叶：秋草亮阶 / 金基阶，斜向飘，翻转时 2 像素
 *  - 冬 雪：雪亮阶，竖直慢落，微摆；深夜也下
 *  - 夏夜 萤火：金亮阶，慢游 + 呼吸闪（亮 3 帧灭 3 帧）
 */
import { Grid } from '@/pixel/painter';
import type { Season } from '@/lib/season';
import { PALETTE } from '../palette';
import type { Slot } from './daylight';
import { hash2 } from './tile';

export type FxKind = 'petal' | 'leaf' | 'snow' | 'firefly' | 'none';

export function fxKind(season: Season, slot: Slot): FxKind {
  if (season === 'spring') return 'petal';
  if (season === 'autumn') return 'leaf';
  if (season === 'winter') return 'snow';
  if (season === 'summer' && (slot === 'evening' || slot === 'night')) return 'firefly';
  return 'none';
}

export interface Particle {
  x: number;
  y: number;
  color: string;
  /** 第二个像素（翻转的叶子 / 更亮的雪） */
  tail?: [number, number];
}

export const FX_COUNT: Record<FxKind, number> = { petal: 14, leaf: 9, snow: 14, firefly: 8, none: 0 };

/** 帧 frame 时所有粒子的位置（逻辑帧 8 fps） */
export function particlesAt(kind: FxKind, frame: number, w: number, h: number, seed = 0): Particle[] {
  const n = FX_COUNT[kind];
  const out: Particle[] = [];
  for (let i = 0; i < n; i++) {
    const r1 = hash2(i, seed, 11), r2 = hash2(i, seed, 12), r3 = hash2(i, seed, 13);
    const t = frame + r3 * 97; // 各粒子相位错开
    switch (kind) {
      case 'petal': {
        // 每帧 x +0.6、y +0.9，横向 ±2 摆，周期 16 帧
        const x = (r1 * w + t * 0.6 + 2 * Math.sin((t / 16) * Math.PI * 2)) % w;
        const y = (r2 * h + t * 0.9) % h;
        out.push({ x: Math.floor(x), y: Math.floor(y), color: i % 3 === 0 ? PALETTE.pink.base : PALETTE.pink.light, tail: i % 2 === 0 ? [1, 0] : undefined });
        break;
      }
      case 'leaf': {
        // 斜向 x +1.1、y +0.7，摆幅大；每 8 帧翻一次身（翻身时多 1 像素）
        const x = (r1 * w + t * 1.1 + 3 * Math.sin((t / 20) * Math.PI * 2)) % w;
        const y = (r2 * h + t * 0.7 + Math.abs(Math.sin((t / 10) * Math.PI))) % h;
        const flip = Math.floor(t / 4) % 2 === 0;
        const color = i % 2 === 0 ? PALETTE.autumn.light : PALETTE.gold.base;
        out.push({ x: Math.floor(x), y: Math.floor(y), color, tail: flip ? [1, 0] : undefined });
        break;
      }
      case 'snow': {
        // 慢落 y +0.5，微摆 ±1，周期 24 帧
        const x = (r1 * w + Math.sin((t / 24) * Math.PI * 2 + r1 * 6) * 1.2 + t * 0.15) % w;
        const y = (r2 * h + t * 0.5) % h;
        out.push({ x: Math.floor(x), y: Math.floor(y), color: PALETTE.snow.light, tail: i % 4 === 0 ? [0, 1] : undefined });
        break;
      }
      case 'firefly': {
        // 慢游：利萨如小圈；呼吸：周期 12 帧亮 6 帧
        const cx = r1 * w, cy = r2 * h * 0.8 + h * 0.1;
        const x = cx + 4 * Math.sin((t / 40) * Math.PI * 2);
        const y = cy + 3 * Math.sin((t / 28) * Math.PI * 2 + 1);
        const on = Math.floor(t) % 12 < 8;
        if (on) out.push({ x: Math.floor(x), y: Math.floor(y), color: Math.floor(t) % 12 < 3 ? PALETTE.gold.light : PALETTE.gold.base });
        break;
      }
      default:
        break;
    }
  }
  return out.map((p) => ({ ...p, x: ((p.x % w) + w) % w, y: ((p.y % h) + h) % h }));
}

/** 把粒子叠到图上（只覆盖非透明像素之上，粒子层永远在最上） */
export function drawParticles(g: Grid, kind: FxKind, frame: number, seed = 0): Grid {
  for (const p of particlesAt(kind, frame, g.w, g.h, seed)) {
    g.set(p.x, p.y, p.color);
    if (p.tail) g.set(p.x + p.tail[0], p.y + p.tail[1], p.color);
  }
  return g;
}

/** 分解图：一种粒子连续 frames 帧，每帧一格（透明底上叠夜天基阶方块看得清） */
export function fxStrip(kind: FxKind, frames: number, w: number, h: number, bg: string, seed = 0, gap = 4): Grid {
  const g = new Grid(frames * (w + gap) - gap, h);
  for (let f = 0; f < frames; f++) {
    const cell = new Grid(w, h);
    cell.rect(0, 0, w, h, bg);
    drawParticles(cell, kind, f * 2, seed);
    g.compose(cell, f * (w + gap), 0);
  }
  return g;
}
