/**
 * 老宅（家人区）：两层木屋，6×7 tile = 96×112。
 * 一层：宽门廊贯穿正面，四根木柱、木板地、三级台阶、栏杆（柱头小圆球）、左长凳右摇椅、小狗趴着（2 帧）。
 * 二层：略窄，三扇十字窗，中间窗上方老虎窗。屋顶深红棕木瓦（砖红暗 + 木暗交错），两层各有屋檐，
 * 二层屋檐在门廊顶上压出全屋最暗的一条。石砌烟囱四季冒烟。横向木板墙、包角板、石色矮基座。
 * 白天窗玻璃远山亮阶 + 斜向亮阶反光；傍晚全部窗亮 + 门灯亮 + 两圈光晕，门廊地板被照亮的部分换亮阶。
 */
import { Grid } from '@/pixel/painter';
import type { Season } from '@/lib/season';
import { ramp } from '../../palette';
import { irange, makeRng } from '../ground';

export const OLDHOUSE_W = 96;
export const OLDHOUSE_H = 112;

export function oldHouseSprite(season: Season, night: boolean, frame = 0): Grid {
  const g = new Grid(OLDHOUSE_W, OLDHOUSE_H);
  const wd = ramp('wood');
  const br = ramp('brick');
  const st = ramp('stone');
  const gd = ramp('gold');
  const nt = ramp('night');
  const mi = ramp('mist');
  const pl = ramp('plaster');
  const sn = ramp('snow');
  const gr = ramp('grass');
  const O = wd.dark;
  const rnd = makeRng(3, 3, 1200);

  /* ---------- 尺寸 ---------- */
  const RIDGE = 6; // 上层屋脊
  const UP_EAVE = 30; // 上层檐口
  const W2_X0 = 20; // 二层墙
  const W2_X1 = 75;
  const W2_TOP = UP_EAVE + 1;
  const W2_BOT = 62;
  const PR_TOP = 62; // 门廊顶（一层屋檐）
  const PR_BOT = 70;
  const W1_X0 = 12; // 一层墙
  const W1_X1 = 83;
  const W1_TOP = PR_BOT + 1;
  const FLOOR = 98; // 门廊地板顶
  const FLOOR_BOT = 103;

  /* ---------- 木板墙 ---------- */
  const boards = (x0: number, x1: number, y0: number, y1: number) => {
    g.rect(x0, y0, x1 - x0 + 1, y1 - y0 + 1, wd.base);
    for (let y = y0 + 3; y <= y1; y += 4) g.hline(x0, y, x1 - x0 + 1, wd.dark);
    for (let k = 0; k < 6; k++) {
      const bx = irange(rnd, x0 + 2, x1 - 6);
      const by = y0 + irange(rnd, 0, Math.floor((y1 - y0) / 4)) * 4;
      if (by <= y1 - 1) g.hline(bx, by, 4, wd.light);
    }
    // 包角板
    g.rect(x0, y0, 2, y1 - y0 + 1, wd.dark);
    g.rect(x1 - 1, y0, 2, y1 - y0 + 1, wd.dark);
    g.vline(x0 + 1, y0, y1 - y0 + 1, wd.base);
  };
  boards(W2_X0, W2_X1, W2_TOP, W2_BOT);
  boards(W1_X0, W1_X1, W1_TOP, FLOOR - 1);
  // 石色矮基座（一层墙脚，门廊地板两侧露出）
  g.rect(W1_X0 - 2, FLOOR_BOT + 1, 2, 2, st.base);
  g.rect(W1_X1 + 1, FLOOR_BOT + 1, 2, 2, st.base);

  /* ---------- 屋顶：木瓦（砖红暗 + 木暗交错），厚 ---------- */
  const shingles = (y0: number, y1: number, leftAt: (y: number) => number, rightAt: (y: number) => number, litTop: boolean) => {
    for (let y = y0; y <= y1; y++) {
      const l = leftAt(y);
      const r = rightAt(y);
      const course = Math.floor((y - y0) / 3);
      const phase = (y - y0) % 3;
      for (let x = l; x <= r; x++) {
        const k = Math.floor((x + course * 2) / 3) % 2;
        let c = k === 0 ? br.dark : wd.dark;
        if (phase === 2) c = wd.dark; // 每排下缘一条暗
        if (phase === 0 && k === 0) c = br.base; // 瓦顶受光
        if (litTop && course < 2 && phase === 0) c = br.light;
        if (x > r - 10 && c === br.base) c = br.dark; // 右侧背光
        if ((x + course) % 3 === 2 && phase !== 2) c = k === 0 ? br.dark : wd.dark; // 瓦缝
        g.set(x, y, c);
      }
    }
  };
  // 上层：梯形，脊 x 24..71，檐 x 4..91
  shingles(RIDGE, UP_EAVE, (y) => Math.round(24 - ((y - RIDGE) * 20) / (UP_EAVE - RIDGE)), (y) => Math.round(71 + ((y - RIDGE) * 20) / (UP_EAVE - RIDGE)), true);
  // 屋脊
  g.hline(23, RIDGE, 50, wd.dark);
  g.hline(24, RIDGE - 1, 48, br.base);
  for (let x = 26; x < 71; x += 5) g.set(x, RIDGE - 1, br.light);
  // 上层檐口：暗边 + 檐板
  g.hline(4, UP_EAVE, 88, wd.dark);
  g.hline(4, UP_EAVE + 1, 88, wd.base);
  g.hline(4, UP_EAVE + 2, 88, wd.dark);
  // 老虎窗：中间窗上方的小山墙
  const DORM_X0 = 40;
  const DORM_X1 = 55;
  for (let y = 12; y <= UP_EAVE; y++) {
    const half = Math.min(8, Math.round(((y - 12) * 8) / 8));
    const cx = 47.5;
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      if (x < DORM_X0 || x > DORM_X1) continue;
      if (y < 20) g.set(x, y, y - 12 === Math.round(Math.abs(x - cx)) - 0 ? br.base : br.dark); // 山墙面
      else g.set(x, y, wd.base);
    }
  }
  g.rect(DORM_X0, 20, 16, UP_EAVE - 20 + 1, wd.base);
  for (let y = 23; y <= UP_EAVE; y += 4) g.hline(DORM_X0, y, 16, wd.dark);
  // 老虎窗屋顶（两坡）
  for (let i = 0; i < 9; i++) {
    g.set(47 - i, 12 + i, br.base);
    g.set(48 + i, 12 + i, br.base);
    g.set(47 - i, 13 + i, br.dark);
    g.set(48 + i, 13 + i, br.dark);
  }
  g.rect(DORM_X0 - 1, 20, 18, 1, wd.dark);
  // 烟囱：石砌，右侧
  g.rect(66, 0, 8, 14, st.base);
  g.vline(66, 0, 14, st.light);
  g.vline(73, 0, 14, st.dark);
  for (let y = 3; y < 14; y += 3) for (let x = 67 + (y % 2) * 2; x < 73; x += 4) g.set(x, y, st.dark);
  g.rect(65, 0, 10, 2, st.dark);
  g.hline(65, 0, 10, st.light);
  // 上层檐下阴影（二层墙顶）
  for (let x = W2_X0; x <= W2_X1; x++) for (let d = 3; d <= 5; d++) if (g.get(x, UP_EAVE + d) === wd.base || (d < 5 && g.get(x, UP_EAVE + d) === wd.light)) g.set(x, UP_EAVE + d, wd.dark);

  /* ---------- 门廊顶（一层屋檐）：斜坡木瓦 ---------- */
  shingles(PR_TOP, PR_BOT - 1, () => 0, () => 95, false);
  g.hline(0, PR_BOT, 96, wd.dark);
  g.hline(0, PR_BOT + 1, 96, wd.base);
  // 全屋最暗的一条：门廊顶下的一层墙
  for (let x = W1_X0; x <= W1_X1; x++) {
    g.set(x, PR_BOT + 2, wd.dark);
    g.set(x, PR_BOT + 3, wd.dark);
    if ((x + PR_BOT) % 2 === 0) g.set(x, PR_BOT + 4, wd.dark);
  }
  g.hline(W1_X0, PR_BOT + 2, W1_X1 - W1_X0 + 1, O);

  /* ---------- 窗 ---------- */
  const flowerColors = season === 'spring' ? [ramp('pink').base, gd.light, ramp('pink').light] : season === 'summer' ? [gd.base, pl.light, gd.light] : season === 'autumn' ? [br.light, gd.base, br.base] : [];
  const glass = (x0: number, y0: number, w: number, h: number) => {
    g.rect(x0, y0, w, h, night ? gd.base : mi.light);
    if (night) {
      g.set(x0 + 1, y0 + 1, gd.light);
      g.set(x0 + w - 2, y0 + h - 2, gd.dark);
    } else {
      // 斜向反光
      for (let i = 0; i < Math.min(w, h) - 1; i++) g.set(x0 + w - 2 - i, y0 + 1 + i, pl.light);
    }
  };
  const win = (x0: number, y0: number, w: number, h: number, sill: boolean, box: boolean) => {
    g.rect(x0 - 1, y0 - 1, w + 2, h + 2, wd.dark);
    glass(x0, y0, w, h);
    const mx = x0 + Math.floor(w / 2);
    const my = y0 + Math.floor(h / 2);
    g.vline(mx, y0, h, wd.base);
    g.hline(x0, my, w, wd.base);
    if (sill) {
      g.rect(x0 - 2, y0 + h + 1, w + 4, 2, wd.base);
      g.hline(x0 - 2, y0 + h + 1, w + 4, wd.light);
    }
    if (box) {
      g.rect(x0 - 1, y0 + h + 3, w + 2, 3, wd.base);
      g.hline(x0 - 1, y0 + h + 5, w + 2, wd.dark);
      g.vline(x0 - 1, y0 + h + 3, 3, wd.light);
      if (flowerColors.length) {
        for (let i = 0; i < Math.floor(w / 3); i++) {
          const fx = x0 + 1 + i * 3;
          g.set(fx, y0 + h + 1, flowerColors[i % 3]);
          g.set(fx + 1, y0 + h + 1, flowerColors[(i + 1) % 3]);
          g.set(fx, y0 + h, flowerColors[(i + 2) % 3]);
          g.set(fx + 1, y0 + h + 2, gr.dark);
        }
      } else g.hline(x0 - 1, y0 + h + 2, w + 2, sn.light);
    }
  };
  // 二层三扇
  win(24, 40, 9, 11, true, false);
  win(43, 40, 9, 11, true, false);
  win(62, 40, 9, 11, true, false);
  // 老虎窗的小窗
  g.rect(45, 22, 6, 6, wd.dark);
  glass(46, 23, 4, 4);
  g.set(48, 23, wd.base); g.set(48, 24, wd.base); g.set(48, 25, wd.base); g.set(48, 26, wd.base);
  g.hline(46, 25, 4, wd.base);
  // 一层两扇大窗 + 花箱
  win(18, 78, 12, 12, true, true);
  win(66, 78, 12, 12, true, true);

  /* ---------- 门：双开木门，上半玻璃，铜灯 ---------- */
  const DX0 = 40;
  const DX1 = 55;
  const DY0 = 76;
  g.rect(DX0 - 1, DY0 - 1, DX1 - DX0 + 3, FLOOR - DY0 + 1, wd.dark);
  g.rect(DX0, DY0, DX1 - DX0 + 1, FLOOR - DY0, wd.base);
  g.vline(47, DY0, FLOOR - DY0, wd.dark);
  g.vline(48, DY0, FLOOR - DY0, wd.light);
  // 上半玻璃两块
  glass(DX0 + 1, DY0 + 1, 6, 8);
  glass(49, DY0 + 1, 6, 8);
  g.rect(DX0 + 1, DY0 + 9, 6, 1, wd.dark);
  g.rect(49, DY0 + 9, 6, 1, wd.dark);
  // 下半门板
  g.rect(DX0 + 2, DY0 + 12, 4, 7, wd.dark);
  g.rect(DX0 + 3, DY0 + 13, 2, 5, wd.base);
  g.rect(50, DY0 + 12, 4, 7, wd.dark);
  g.rect(51, DY0 + 13, 2, 5, wd.base);
  // 把手
  g.set(46, DY0 + 12, gd.dark);
  g.set(49, DY0 + 12, gd.dark);
  // 铜灯（门上方）
  g.rect(46, PR_BOT + 4, 4, 4, night ? gd.base : gd.dark);
  g.rect(47, PR_BOT + 5, 2, 2, night ? gd.light : gd.dark);
  g.hline(45, PR_BOT + 3, 6, O);
  g.hline(46, PR_BOT + 8, 4, O);
  g.set(45, PR_BOT + 4, O); g.set(45, PR_BOT + 7, O); g.set(50, PR_BOT + 4, O); g.set(50, PR_BOT + 7, O);

  /* ---------- 门廊：柱、栏杆、地板、台阶 ---------- */
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
  // 栏杆：上下横杆 + 立柱，柱头小圆球
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
  // 台阶三级
  for (let i = 0; i < 3; i++) {
    const y = FLOOR_BOT + 1 + i * 3;
    const w = 20 + i * 4;
    const x = 48 - w / 2;
    g.rect(x, y, w, 3, wd.base);
    g.hline(x, y, w, wd.light);
    g.hline(x, y + 2, w, wd.dark);
  }
  // 长凳（左）
  g.rect(12, 92, 16, 2, wd.base);
  g.hline(12, 92, 16, wd.light);
  g.rect(13, 94, 2, 4, wd.dark);
  g.rect(25, 94, 2, 4, wd.dark);
  g.hline(12, 89, 16, wd.dark); // 靠背
  g.vline(12, 89, 3, wd.dark);
  g.vline(27, 89, 3, wd.dark);
  // 摇椅（右）
  g.rect(70, 90, 10, 2, wd.base);
  g.vline(79, 84, 8, wd.dark);
  g.hline(78, 84, 2, wd.dark);
  g.rect(70, 92, 2, 4, wd.dark);
  g.rect(78, 92, 2, 4, wd.dark);
  for (let i = 0; i < 12; i++) g.set(69 + i, 96 + (i < 2 || i > 9 ? -1 : 0), wd.dark); // 弧形底
  // 小狗趴着（门右侧）
  const dog = (x: number, y: number, f: number) => {
    const e = ramp('earth');
    const rows = f % 2 === 0
      ? ['...OOOO.....', '..OBBBBO....', '.OBBBLBBOOO.', 'OBBBBBBBBBBO', 'OBKBBBBBBBBO', '.OBBBOOOBBO.', '..OOO...OO..']
      : ['............', '...OOOO.....', '..OBBBBOOO..', '.OBBBLBBBBO.', 'OBBBBBBBBBBO', 'OBKBBOOOBBBO', '.OOOO...OO..'];
    g.paste(x, y, rows, { O, B: e.base, L: e.light, K: ramp('ink').dark });
  };
  dog(57, FLOOR - 7, frame);

  /* ---------- 傍晚：光晕与被照亮的地板 ---------- */
  if (night) {
    const ok = (c: string | null) => !c || c === wd.base || c === wd.light || c === wd.dark;
    const halo = (x0: number, y0: number, x1: number, y1: number) => {
      const ring = (d: number, c: string) => {
        for (let x = x0 - d; x <= x1 + d; x++) for (const y of [y0 - d, y1 + d]) if (ok(g.get(x, y))) g.set(x, y, c);
        for (let y = y0 - d; y <= y1 + d; y++) for (const x of [x0 - d, x1 + d]) if (ok(g.get(x, y))) g.set(x, y, c);
      };
      ring(2, nt.light);
      ring(1, gd.dark);
    };
    halo(23, 39, 33, 51);
    halo(42, 39, 52, 51);
    halo(61, 39, 71, 51);
    halo(17, 77, 30, 90);
    halo(65, 77, 78, 90);
    halo(45, PR_BOT + 3, 50, PR_BOT + 8);
    for (let x = 34; x <= 61; x++) for (let y = FLOOR; y <= FLOOR_BOT; y++) if (g.get(x, y) === wd.base) g.set(x, y, wd.light);
    for (let x = 40; x <= 55; x++) for (let y = FLOOR_BOT + 1; y < FLOOR_BOT + 4; y++) if (g.get(x, y) === wd.base) g.set(x, y, wd.light);
  }

  /* ---------- 屋侧：柴堆（左）、木桶带盖（右）、晾衣绳（右后） ---------- */
  const log = (x: number, y: number) => {
    g.rect(x, y, 4, 3, wd.base);
    g.set(x, y, wd.light);
    g.set(x + 1, y + 1, wd.dark);
    g.set(x + 3, y + 2, wd.dark);
  };
  for (let row = 0; row < 3; row++) for (let i = 0; i < 2; i++) log(0 + i * 4 + (row % 2) * 1, 88 + row * 3);
  // 木桶带盖
  g.rect(87, 88, 8, 9, wd.base);
  g.vline(87, 88, 9, wd.light);
  g.vline(94, 88, 9, wd.dark);
  g.hline(87, 90, 8, st.dark);
  g.hline(87, 94, 8, st.dark);
  g.rect(86, 86, 10, 2, wd.dark);
  g.hline(87, 86, 8, wd.light);
  // 晾衣绳（右侧靠后，紧凑版：两根杆、两件衣）
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

  /* ---------- 门前：石板小径、矮篱笆、花丛 ---------- */
  // 石板从台阶底到下边
  for (let y = FLOOR_BOT + 10; y < OLDHOUSE_H; y++) for (let x = 42; x <= 53; x++) g.set(x, y, (x + y) % 5 === 0 ? st.dark : (x * 3 + y) % 7 === 0 ? st.light : st.base);
  // 矮篱笆两侧
  for (const [x0, x1] of [[18, 35], [61, 78]] as [number, number][]) {
    g.hline(x0, 106, x1 - x0 + 1, wd.base);
    g.hline(x0, 107, x1 - x0 + 1, wd.dark);
    for (let x = x0; x <= x1; x += 4) g.vline(x, 104, 5, wd.base);
    // 花丛
    for (let x = x0 + 1; x < x1; x += 3) {
      g.set(x, 109, gr.dark);
      g.set(x + 1, 110, gr.dark);
      if (flowerColors.length) g.set(x + 1, 108, flowerColors[(x / 3) % 3 | 0]);
    }
  }
  if (season === 'winter') {
    for (let y = RIDGE; y <= UP_EAVE; y += 3) for (let x = 4; x <= 91; x++) if (g.get(x, y) && g.get(x, y) !== null && (x * 5 + y) % 4 !== 0) { const c = g.get(x, y); if (c === br.base || c === br.light || c === br.dark || c === wd.dark) g.set(x, y, sn.light); }
    g.hline(0, PR_TOP, 96, sn.light);
    g.hline(65, 0, 10, sn.light);
  }

  /* ---------- 描边：外圈木暗阶 ---------- */
  const src = g.clone();
  for (let y = 0; y < OLDHOUSE_H; y++) for (let x = 0; x < OLDHOUSE_W; x++) {
    if (src.get(x, y)) continue;
    if (src.get(x - 1, y) || src.get(x + 1, y) || src.get(x, y - 1) || src.get(x, y + 1)) g.set(x, y, O);
  }
  return g;
}

/** 烟：4 帧，三团往右上飘、越飘越小；16×16 透明底，放在烟囱顶 */
export function smokeSprite(frame: number): Grid {
  const st = ramp('stone');
  const pl = ramp('plaster');
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
  return g;
}
