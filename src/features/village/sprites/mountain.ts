/**
 * 顶部一排远山：雾色系两层山脊 + 山脚零星树影，只在第 0 行用。
 * 后山用雾基阶、前山用雾暗阶、天用雾亮阶（换色表会把它带进各时段）。
 */
import { Grid } from '@/pixel/painter';
import type { Season } from '@/lib/season';
import { ramp } from '../palette';
import { TILE, hash2 } from './tile';

export function mountainTile(season: Season, x: number): Grid {
  const mi = ramp('mist');
  const sn = ramp('snow');
  const g = new Grid(TILE, TILE);
  g.rect(0, 0, TILE, TILE, mi.light);
  // 后山：慢起伏
  for (let px = 0; px < TILE; px++) {
    const gx = x * TILE + px;
    const back = 4 + Math.round(2.5 * Math.sin(gx / 9) + 1.5 * Math.sin(gx / 23 + 1));
    g.vline(px, back, TILE - back, mi.base);
    const front = 9 + Math.round(2 * Math.sin(gx / 5 + 2) + Math.sin(gx / 13));
    g.vline(px, front, TILE - front, mi.dark);
    // 雪顶 / 山脊亮线
    if (season === 'winter' && hash2(gx, 0, 41) < 0.6) g.set(px, back, sn.light);
    else if (hash2(gx, 0, 42) < 0.35) g.set(px, back, mi.light);
    if (hash2(gx, 1, 43) < 0.3) g.set(px, front, mi.base);
  }
  // 山脚树影：青瓦暗阶小三角
  const t = ramp('tile');
  for (let k = 0; k < 2; k++) {
    if (hash2(x, k, 44) < 0.5) continue;
    const tx = 2 + Math.floor(hash2(x, k, 45) * 11);
    g.set(tx, 13, t.dark); g.hline(tx - 1, 14, 3, t.dark); g.hline(tx - 1, 15, 3, t.dark);
  }
  return g;
}
