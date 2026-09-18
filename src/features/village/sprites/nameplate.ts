/**
 * 区域名牌：每栋门口一块 14×10 的小木牌，牌面画区域图标（字太小画不清，区域名在点建筑的面板标题里）。
 *  家人 = 小房子、我的家 = 金心、朋友 = 两个人、同事 = 锤子、恋爱 = 粉心、新认识 = 星、星婆婆 = 水晶球、茶馆 = 茶杯
 */
import { Grid } from '@/pixel/painter';
import { ramp } from '../palette';
import type { BuildingKey } from '../layout';

export const PLATE_W = 14;
export const PLATE_H = 10;

const cache = new Map<string, Grid>();

export function nameplateSprite(key: BuildingKey): Grid {
  const hit = cache.get(key);
  if (hit) return hit;
  const wd = ramp('wood'), ink = ramp('ink'), gd = ramp('gold'), pk = ramp('pink'), br = ramp('brick'), pl = ramp('plaster'), pu = ramp('purple'), wa = ramp('water'), st = ramp('stone');
  const g = new Grid(PLATE_W, PLATE_H);
  // 牌面 + 两根短桩
  g.rect(0, 0, PLATE_W, 8, wd.base);
  g.hline(1, 0, PLATE_W - 2, wd.light);
  g.hline(0, 7, PLATE_W, wd.dark);
  g.rect(2, 8, 2, 2, wd.dark);
  g.rect(PLATE_W - 4, 8, 2, 2, wd.dark);
  const P = (rows: string[], map: Record<string, string>, x0 = 3, y0 = 1) => g.paste(x0, y0, rows, map);
  switch (key) {
    case 'oldhouse': // 小房子
      P(['...#....', '..###...', '.#####..', '.#WWW#..', '.#W#W#..', '.#####..'], { '#': br.base, W: pl.light });
      break;
    case 'home': // 金心
      P(['.##.##..', '#######.', '#######.', '.#####..', '..###...', '...#....'], { '#': gd.base });
      g.set(4, 2, gd.light);
      break;
    case 'plaza': // 两个人
    case 'gate':
      P(['.##..##.', '.##..##.', '.##..##.', '####.###', '####.###', '####.###'], { '#': ink.base });
      g.set(4, 1, pl.light); g.set(9, 1, pl.light);
      break;
    case 'workshop': // 锤子
      P(['.####...', '.####...', '.####...', '...##...', '...WW...', '...WW...'], { '#': st.base, W: wd.dark });
      g.set(4, 1, st.light);
      break;
    case 'lakehouse': // 粉心
      P(['.##..##.', '#######.', '#######.', '.#####..', '..###...', '...#....'], { '#': pk.base });
      g.set(4, 2, pk.light);
      break;
    case 'inn': // 星
      P(['...#....', '...#....', '.#####..', '..###...', '.##.##..', '........'], { '#': gd.base });
      g.set(6, 3, gd.light);
      break;
    case 'tent': // 水晶球
      P(['..###...', '.#####..', '.#####..', '..###...', '.#####..', '........'], { '#': wa.light });
      g.rect(4, 5, 5, 1, pu.dark); g.set(4, 2, pl.light); g.rect(4, 3, 5, 1, wa.base);
      break;
    case 'teahouse': // 茶杯
      P(['.#.#....', '#####.#.', '#####.#.', '.###.#..', '.#####..', '........'], { '#': pl.light });
      g.rect(4, 3, 3, 1, ink.base); g.set(3, 1, ink.light); g.set(5, 1, ink.light);
      break;
  }
  g.outline(wd.outline);
  cache.set(key, g);
  return g;
}
