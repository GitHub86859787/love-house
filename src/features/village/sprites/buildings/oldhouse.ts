/**
 * 老宅（家人区）：两层木屋，6×7 tile = 96×112。见 kit.ts 的材质语言。
 * 一层墙板比二层亮一阶，柱子栏杆才分得出来；夜里只换玻璃，窗框保持木暗阶；光晕全金。
 */
import { Grid } from '@/pixel/painter';
import type { Season } from '@/lib/season';
import { ramp } from '../../palette';
import { irange, makeRng } from '../ground';
import { boards, chimney, dog, flowerColors, glass, halo, lamp, outlineAll, ROOF_RED_SET, shingles, SHINGLE_RED, snowOn, st, steps, stonePath, wallish, wd, win, gd, gr, pl } from './kit';

export const OLDHOUSE_W = 96;
export const OLDHOUSE_H = 112;

export function oldHouseSprite(season: Season, night: boolean, frame = 0): Grid {
  const g = new Grid(OLDHOUSE_W, OLDHOUSE_H);
  const rnd = makeRng(3, 3, 1200);
  const fc = flowerColors(season);

  const RIDGE = 6;
  const UP_EAVE = 30;
  const W2_X0 = 20;
  const W2_X1 = 75;
  const W2_TOP = UP_EAVE + 1;
  const W2_BOT = 62;
  const PR_TOP = 62;
  const PR_BOT = 70;
  const W1_X0 = 12;
  const W1_X1 = 83;
  const W1_TOP = PR_BOT + 1;
  const FLOOR = 98;
  const FLOOR_BOT = 103;

  /* 墙：二层木基阶，一层提亮一阶 */
  boards(g, W2_X0, W2_X1, W2_TOP, W2_BOT, rnd);
  boards(g, W1_X0, W1_X1, W1_TOP, FLOOR - 1, rnd, { fill: wd.light, seam: wd.base, hi: pl.light });
  g.rect(W1_X0 - 2, FLOOR_BOT + 1, 2, 2, st.base);
  g.rect(W1_X1 + 1, FLOOR_BOT + 1, 2, 2, st.base);

  /* 上层屋顶 */
  shingles(g, RIDGE, UP_EAVE, (y) => Math.round(24 - ((y - RIDGE) * 20) / (UP_EAVE - RIDGE)), (y) => Math.round(71 + ((y - RIDGE) * 20) / (UP_EAVE - RIDGE)), SHINGLE_RED, rnd);
  g.hline(23, RIDGE, 50, wd.dark);
  g.hline(24, RIDGE - 1, 48, ramp('brick').base);
  for (let x = 26; x < 71; x += 5) g.set(x, RIDGE - 1, ramp('brick').light);
  g.hline(4, UP_EAVE, 88, wd.dark);
  g.hline(4, UP_EAVE + 1, 88, wd.base);
  g.hline(4, UP_EAVE + 2, 88, wd.dark);
  // 老虎窗
  const br = ramp('brick');
  g.rect(40, 20, 16, UP_EAVE - 20 + 1, wd.base);
  for (let y = 23; y <= UP_EAVE; y += 4) g.hline(40, y, 16, wd.dark);
  for (let i = 0; i < 9; i++) {
    g.set(47 - i, 12 + i, br.base);
    g.set(48 + i, 12 + i, br.base);
    g.set(47 - i, 13 + i, br.dark);
    g.set(48 + i, 13 + i, br.dark);
    for (let x = 48 - i; x <= 47 + i; x++) if (12 + i + 1 < 20) g.set(x, 13 + i, wd.base);
  }
  g.rect(39, 20, 18, 1, wd.dark);
  g.rect(45, 22, 6, 6, wd.dark);
  glass(g, 46, 23, 4, 4, night);
  g.vline(48, 23, 4, wd.base);
  g.hline(46, 25, 4, wd.base);
  chimney(g, 66, 0, 14);
  // 上层檐下阴影
  for (let x = W2_X0; x <= W2_X1; x++) for (let d = 3; d <= 5; d++) if (g.get(x, UP_EAVE + d) === wd.base || (d < 5 && g.get(x, UP_EAVE + d) === wd.light)) g.set(x, UP_EAVE + d, wd.dark);

  /* 门廊顶：一层屋檐 */
  shingles(g, PR_TOP, PR_BOT - 1, () => 0, () => 95, SHINGLE_RED, rnd, false);
  g.hline(0, PR_BOT, 96, wd.dark);
  g.hline(0, PR_BOT + 1, 96, wd.base);
  for (let x = W1_X0; x <= W1_X1; x++) {
    g.set(x, PR_BOT + 2, wd.dark);
    g.set(x, PR_BOT + 3, wd.dark);
    if ((x + PR_BOT) % 2 === 0) g.set(x, PR_BOT + 4, wd.dark);
  }

  /* 窗 */
  win(g, 24, 40, 9, 11, night, { sill: true });
  win(g, 43, 40, 9, 11, night, { sill: true });
  win(g, 62, 40, 9, 11, night, { sill: true });
  win(g, 18, 78, 12, 12, night, { sill: true, box: fc });
  win(g, 66, 78, 12, 12, night, { sill: true, box: fc });

  /* 门：双开，上半玻璃，铜灯 */
  const DX0 = 40;
  const DX1 = 55;
  const DY0 = 76;
  g.rect(DX0 - 1, DY0 - 1, DX1 - DX0 + 3, FLOOR - DY0 + 1, wd.dark);
  g.rect(DX0, DY0, DX1 - DX0 + 1, FLOOR - DY0, wd.base);
  g.vline(47, DY0, FLOOR - DY0, wd.dark);
  g.vline(48, DY0, FLOOR - DY0, wd.light);
  glass(g, DX0 + 1, DY0 + 1, 6, 8, night);
  glass(g, 49, DY0 + 1, 6, 8, night);
  g.rect(DX0 + 1, DY0 + 9, 6, 1, wd.dark);
  g.rect(49, DY0 + 9, 6, 1, wd.dark);
  g.rect(DX0 + 2, DY0 + 12, 4, 7, wd.dark);
  g.rect(DX0 + 3, DY0 + 13, 2, 5, wd.base);
  g.rect(50, DY0 + 12, 4, 7, wd.dark);
  g.rect(51, DY0 + 13, 2, 5, wd.base);
  g.set(46, DY0 + 12, gd.dark);
  g.set(49, DY0 + 12, gd.dark);
  lamp(g, 45, PR_BOT + 3, night, 'copper');

  /* 门廊 */
  g.rect(2, FLOOR, 92, FLOOR_BOT - FLOOR + 1, wd.base);
  for (let x = 2; x < 94; x += 6) g.vline(x, FLOOR, FLOOR_BOT - FLOOR + 1, wd.dark);
  g.hline(2, FLOOR, 92, wd.light);
  g.hline(2, FLOOR_BOT, 92, wd.dark);
  const posts = [4, 33, 60, 89];
  for (const px of posts) {
    g.rect(px, PR_BOT + 1, 3, FLOOR - PR_BOT - 1, wd.base);
    g.vline(px, PR_BOT + 1, FLOOR - PR_BOT - 1, wd.light);
    g.vline(px + 2, PR_BOT + 1, FLOOR - PR_BOT - 1, wd.dark);
  }
  const rail = (x0: number, x1: number) => {
    g.hline(x0, 88, x1 - x0 + 1, wd.light);
    g.hline(x0, 89, x1 - x0 + 1, wd.dark);
    g.hline(x0, 96, x1 - x0 + 1, wd.dark);
    for (let x = x0 + 3; x < x1; x += 4) g.vline(x, 90, 6, wd.base);
  };
  rail(7, 32);
  rail(63, 88);
  for (const px of posts) {
    g.rect(px, 86, 3, 2, wd.base);
    g.set(px + 1, 85, wd.light);
    g.set(px, 85, wd.dark);
    g.set(px + 2, 85, wd.dark);
  }
  steps(g, 48, FLOOR_BOT + 1, 20, 3);
  // 长凳
  g.rect(12, 92, 16, 2, wd.base);
  g.hline(12, 92, 16, wd.light);
  g.rect(13, 94, 2, 4, wd.dark);
  g.rect(25, 94, 2, 4, wd.dark);
  g.hline(12, 89, 16, wd.dark);
  g.vline(12, 89, 3, wd.dark);
  g.vline(27, 89, 3, wd.dark);
  // 摇椅
  g.rect(70, 90, 10, 2, wd.base);
  g.vline(79, 84, 8, wd.dark);
  g.hline(78, 84, 2, wd.dark);
  g.rect(70, 92, 2, 4, wd.dark);
  g.rect(78, 92, 2, 4, wd.dark);
  for (let i = 0; i < 12; i++) g.set(69 + i, 96 + (i < 2 || i > 9 ? -1 : 0), wd.dark);
  dog(g, 57, FLOOR - 7, frame);

  /* 傍晚光 */
  if (night) {
    halo(g, 23, 39, 33, 51, wallish);
    halo(g, 42, 39, 52, 51, wallish);
    halo(g, 61, 39, 71, 51, wallish);
    halo(g, 17, 77, 30, 90, wallish);
    halo(g, 65, 77, 78, 90, wallish);
    halo(g, 45, PR_BOT + 3, 50, PR_BOT + 8, wallish);
    for (let x = 34; x <= 61; x++) for (let y = FLOOR; y <= FLOOR_BOT; y++) if (g.get(x, y) === wd.base) g.set(x, y, wd.light);
    for (let x = 40; x <= 55; x++) for (let y = FLOOR_BOT + 1; y < FLOOR_BOT + 4; y++) if (g.get(x, y) === wd.base) g.set(x, y, wd.light);
  }

  /* 屋侧 */
  const log = (x: number, y: number) => {
    g.rect(x, y, 4, 3, wd.base);
    g.set(x, y, wd.light);
    g.set(x + 1, y + 1, wd.dark);
    g.set(x + 3, y + 2, wd.dark);
  };
  for (let row = 0; row < 3; row++) for (let i = 0; i < 2; i++) log(0 + i * 4 + (row % 2), 88 + row * 3);
  g.rect(87, 88, 8, 9, wd.base);
  g.vline(87, 88, 9, wd.light);
  g.vline(94, 88, 9, wd.dark);
  g.hline(87, 90, 8, st.dark);
  g.hline(87, 94, 8, st.dark);
  g.rect(86, 86, 10, 2, wd.dark);
  g.hline(87, 86, 8, wd.light);
  for (const x of [78, 94]) {
    g.rect(x, 46, 1, 14, wd.base);
    g.set(x, 45, wd.dark);
  }
  g.hline(79, 47, 15, ramp('ink').light);
  const sw = frame % 2;
  g.rect(80, 48, 5, 5, ramp('water').light);
  g.vline(84, 48, 5, ramp('water').base);
  g.set(84 + sw, 52, ramp('water').light);
  g.rect(87, 48, 5, 5, pl.light);
  g.vline(91, 48, 5, pl.base);
  g.set(91 + sw, 52, pl.light);

  /* 门前 */
  stonePath(g, 42, FLOOR_BOT + 10, OLDHOUSE_H - 1);
  for (const [x0, x1] of [[18, 35], [61, 78]] as [number, number][]) {
    g.hline(x0, 106, x1 - x0 + 1, wd.base);
    g.hline(x0, 107, x1 - x0 + 1, wd.dark);
    for (let x = x0; x <= x1; x += 4) g.vline(x, 104, 5, wd.base);
    for (let x = x0 + 1; x < x1; x += 3) {
      g.set(x, 109, gr.dark);
      g.set(x + 1, 110, gr.dark);
      if (fc.length) g.set(x + 1, 108, fc[(x / 3) % 3 | 0]);
    }
  }
  if (season === 'winter') {
    snowOn(g, 4, 91, RIDGE, UP_EAVE, ROOF_RED_SET);
    snowOn(g, 0, 95, PR_TOP, PR_BOT - 1, ROOF_RED_SET);
    g.hline(65, 0, 10, ramp('snow').light);
  }
  outlineAll(g);
  return g;
}

/** 烟：4 帧，三团往右上飘、越飘越小；16×16 透明底 */
export function smokeSprite(frame: number): Grid {
  const g = new Grid(16, 16);
  const f = frame % 4;
  const puffs: [number, number, number][] = [
    [3, 13 - f, 2],
    [6 + Math.floor(f / 2), 9 - f, f < 2 ? 2 : 1],
    [9 + f, 5 - Math.floor(f / 2), 1],
  ];
  for (const [x, y, r] of puffs) {
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + 1) g.set(x + i, y + j, r >= 2 ? st.light : pl.dark);
    g.set(x - 1, y - 1, pl.light);
  }
  void irange;
  return g;
}
