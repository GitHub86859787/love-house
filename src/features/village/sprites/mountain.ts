/**
 * 顶部一排远山（只在第 0 行）：天是雾亮阶，后山雾基阶、前山雾暗阶，两层各自起伏；
 * 后山高峰顶到第 1 行、谷到第 6 行，前山峰到第 6 行、谷到第 12 行，所以一格 16 px 里能看出两层山脊。
 * 冬天两层山顶各带一小片雪（雪亮 / 雪基）。山脚零星树影用青瓦暗阶。
 */
import { Grid } from '@/pixel/painter';
import type { Season } from '@/lib/season';
import { ramp } from '../palette';
import { TILE, hash2 } from './tile';

function backRidge(gx: number): number {
  // 1..6：大起伏 + 小起伏
  return Math.round(3.5 + 2.5 * Math.sin(gx / 17 + 0.6) + 1 * Math.sin(gx / 6.5 + 2));
}
function frontRidge(gx: number): number {
  // 6..12
  return Math.round(9 + 2.5 * Math.sin(gx / 11 + 3.1) + 1 * Math.sin(gx / 4.3));
}

export function mountainTile(season: Season, x: number): Grid {
  const mi = ramp('mist');
  const sn = ramp('snow');
  const t = ramp('tile');
  const g = new Grid(TILE, TILE);
  g.rect(0, 0, TILE, TILE, mi.light);
  for (let px = 0; px < TILE; px++) {
    const gx = x * TILE + px;
    const back = Math.max(1, Math.min(6, backRidge(gx)));
    const front = Math.max(6, Math.min(12, frontRidge(gx)));
    g.vline(px, back, TILE - back, mi.base);
    g.vline(px, front, TILE - front, mi.dark);
    // 山脊亮线：后山顶一像素亮，前山顶一像素基阶，让两层分得开
    g.set(px, back, mi.light);
    g.set(px, front, mi.base);
    if (season === 'winter') {
      // 雪顶：后山峰附近（back ≤ 3）盖 2 行雪亮，前山峰附近（front ≤ 8）盖 1–2 行雪基
      if (back <= 3) { g.set(px, back, sn.light); g.set(px, back + 1, sn.light); if (back <= 2) g.set(px, back + 2, sn.base); }
      if (front <= 8) { g.set(px, front, sn.base); if (front <= 7) g.set(px, front + 1, sn.base); }
    } else if (hash2(gx, 0, 42) < 0.3) g.set(px, back, mi.light);
  }
  // 山脚树影：青瓦暗阶小三角，贴着第 0 行底部
  for (let k = 0; k < 2; k++) {
    if (hash2(x, k, 44) < 0.45) continue;
    const tx = 2 + Math.floor(hash2(x, k, 45) * 11);
    g.set(tx, 12, t.dark); g.hline(tx - 1, 13, 3, t.dark); g.hline(tx - 1, 14, 3, t.dark); g.hline(tx - 2, 15, 5, t.dark);
  }
  return g;
}
