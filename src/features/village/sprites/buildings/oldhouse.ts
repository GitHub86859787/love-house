/**
 * 老宅（家人区）重画：暖米色灰泥墙 + 深木梁柱外露 + 厚厚的稻草茅顶（压得低，右檐拖长盖住门廊）。
 * 6×5 tile = 96×80。描边全部用木暗阶。烟囱石砌四季冒烟；门口挂灯白天灭、傍晚起亮；
 * 夜里窗与挂灯换金基阶，两圈光晕，门廊地板被灯照到的部分换亮阶。小狗趴在门廊上，2 帧呼吸。
 */
import { Grid } from '@/pixel/painter';
import type { Season } from '@/lib/season';
import { ramp } from '../../palette';
import { irange, makeRng } from '../ground';
import { clotheslineSprite } from '../props';

export const OLDHOUSE_W = 96;
export const OLDHOUSE_H = 80;

export function oldHouseSprite(season: Season, night: boolean, frame = 0): Grid {
  const g = new Grid(OLDHOUSE_W, OLDHOUSE_H);
  const th = ramp('autumn'); // 茅草
  const pl = ramp('plaster');
  const st = ramp('stone');
  const wd = ramp('wood');
  const gd = ramp('gold');
  const nt = ramp('night');
  const sn = ramp('snow');
  const O = wd.dark; // 统一描边
  const rnd = makeRng(2, 2, 1100);

  const RIDGE = 4;
  const leftAt = (y: number) => Math.max(0, Math.round(20 - ((y - RIDGE) * 20) / 26));
  const rightAt = (y: number) => Math.min(95, Math.round(70 + ((y - RIDGE) * 25) / 36));
  /** 檐口高度：左半 y=30，右半往门廊上方拖到 y=40 */
  const eaveAt = (x: number) => (x <= 52 ? 30 : 30 + Math.round(((x - 52) * 10) / 43));
  const WALL_X0 = 16;
  const WALL_X1 = 79;
  const WALL_BOT = 62;

  /* ---------- 墙：暖米色灰泥 + 深木梁柱 ---------- */
  g.rect(WALL_X0, 20, WALL_X1 - WALL_X0 + 1, WALL_BOT - 20 + 1, pl.base);
  // 灰泥斑驳
  for (let k = 0; k < irange(rnd, 8, 11); k++) {
    const x = irange(rnd, WALL_X0 + 3, WALL_X1 - 4);
    const y = irange(rnd, 36, WALL_BOT - 4);
    g.set(x, y, pl.dark);
    if (rnd() < 0.5) g.set(x + 1, y, pl.dark);
  }
  // 木梁：两侧立柱、两根中柱、一根横梁、两处斜撑
  const beam = (x: number, y: number, w: number, h: number) => {
    g.rect(x, y, w, h, wd.base);
    if (w >= h) {
      g.hline(x, y, w, wd.light);
      g.hline(x, y + h - 1, w, wd.dark);
    } else {
      g.vline(x, y, h, wd.light);
      g.vline(x + w - 1, y, h, wd.dark);
    }
  };
  beam(WALL_X0, 20, 3, WALL_BOT - 20 + 1);
  beam(WALL_X1 - 2, 20, 3, WALL_BOT - 20 + 1);
  beam(36, 20, 3, WALL_BOT - 20 + 1);
  beam(55, 20, 3, WALL_BOT - 20 + 1);
  beam(WALL_X0, 44, WALL_X1 - WALL_X0 + 1, 3);
  beam(WALL_X0, WALL_BOT - 2, WALL_X1 - WALL_X0 + 1, 3);
  // 斜撑（左窗上方两根）
  for (let i = 0; i < 5; i++) {
    g.set(19 + i, 36 - i, wd.base);
    g.set(35 - i, 36 - i, wd.base);
    g.set(19 + i, 37 - i, wd.dark);
    g.set(35 - i, 37 - i, wd.dark);
  }

  /* ---------- 门廊：木地板 + 两根柱 + 一级台阶 ---------- */
  const PX0 = 54;
  const PX1 = 92;
  const FLOOR_Y = 58;
  g.rect(PX0, FLOOR_Y, PX1 - PX0 + 1, 6, wd.base);
  for (let x = PX0; x <= PX1; x += 5) g.vline(x, FLOOR_Y, 6, wd.dark);
  g.hline(PX0, FLOOR_Y, PX1 - PX0 + 1, wd.light);
  g.hline(PX0, FLOOR_Y + 5, PX1 - PX0 + 1, wd.dark);
  // 台阶
  g.rect(60, FLOOR_Y + 6, 26, 3, wd.base);
  g.hline(60, FLOOR_Y + 6, 26, wd.light);
  g.hline(60, FLOOR_Y + 8, 26, wd.dark);
  // 柱子
  for (const px of [PX0 + 1, PX1 - 2]) {
    g.rect(px, 30, 2, FLOOR_Y - 30, wd.base);
    g.vline(px, 30, FLOOR_Y - 30, wd.light);
    g.vline(px + 1, 30, FLOOR_Y - 30, wd.dark);
  }

  /* ---------- 门：圆顶木门 + 小圆窗 + 金把手 ---------- */
  const DX0 = 61;
  const DX1 = 72;
  const DY0 = 40;
  for (let y = DY0; y < FLOOR_Y; y++) {
    for (let x = DX0; x <= DX1; x++) {
      const cx = (DX0 + DX1) / 2;
      const r = (DX1 - DX0) / 2 + 0.5;
      const dy = y - (DY0 + r);
      if (dy < 0 && (x + 0.5 - cx) ** 2 + dy ** 2 > r * r) continue;
      g.set(x, y, wd.base);
    }
  }
  for (let x = DX0 + 1; x <= DX1 - 1; x += 3) g.vline(x, DY0 + 4, FLOOR_Y - DY0 - 4, wd.dark); // 门板缝
  g.hline(DX0, FLOOR_Y - 5, DX1 - DX0 + 1, wd.dark);
  g.hline(DX0 + 1, DY0 + 5, DX1 - DX0 - 1, wd.light);
  // 小圆窗
  const wc = night ? gd.base : pl.light;
  g.rect(65, 45, 4, 4, wc);
  g.set(65, 45, night ? gd.light : pl.light);
  g.set(68, 48, wd.dark);
  g.set(64, 46, O); g.set(64, 47, O); g.set(69, 46, O); g.set(69, 47, O); g.set(66, 44, O); g.set(67, 44, O); g.set(66, 49, O); g.set(67, 49, O);
  // 把手
  g.set(70, 52, gd.dark);
  g.set(70, 53, gd.dark);

  /* ---------- 窗：十字棂小方窗 + 花箱 ---------- */
  const flowerColors = season === 'spring' ? [ramp('pink').base, gd.light, ramp('pink').light] : season === 'summer' ? [gd.base, pl.light, gd.light] : season === 'autumn' ? [ramp('brick').light, gd.base, ramp('brick').base] : [];
  const win = (x0: number, y0: number) => {
    const w = 10;
    const h = 10;
    g.rect(x0 - 1, y0 - 1, w + 2, h + 2, wd.dark);
    g.rect(x0, y0, w, h, night ? gd.base : pl.light);
    g.vline(x0 + 4, y0, h, wd.base);
    g.vline(x0 + 5, y0, h, wd.dark);
    g.hline(x0, y0 + 4, w, wd.base);
    g.hline(x0, y0 + 5, w, wd.dark);
    if (night) {
      g.set(x0 + 1, y0 + 1, gd.light);
      g.set(x0 + 7, y0 + 7, gd.light);
    }
    // 窗台 + 花箱
    g.rect(x0 - 2, y0 + h + 1, w + 4, 2, wd.base);
    g.hline(x0 - 2, y0 + h + 1, w + 4, wd.light);
    g.rect(x0 - 1, y0 + h + 3, w + 2, 3, wd.base);
    g.hline(x0 - 1, y0 + h + 5, w + 2, wd.dark);
    g.vline(x0 - 1, y0 + h + 3, 3, wd.light);
    if (flowerColors.length) {
      for (let i = 0; i < 4; i++) {
        const fx = x0 + 1 + i * 3;
        g.set(fx, y0 + h + 1, flowerColors[i % 3]);
        g.set(fx + 1, y0 + h + 1, flowerColors[(i + 1) % 3]);
        g.set(fx, y0 + h, flowerColors[(i + 2) % 3]);
        g.set(fx + 1, y0 + h + 2, ramp('grass').dark);
      }
    } else {
      g.hline(x0 - 1, y0 + h + 2, w + 2, sn.light);
    }
  };
  win(22, 47);
  win(42, 47);
  // 夜晚光晕（窗）
  const halo = (x0: number, y0: number, x1: number, y1: number) => {
    const ok = (c: string | null) => !c || c === pl.base || c === pl.dark || c === pl.light || c === wd.base || c === wd.light;
    const ring = (d: number, c: string) => {
      for (let x = x0 - d; x <= x1 + d; x++) for (const y of [y0 - d, y1 + d]) if (ok(g.get(x, y))) g.set(x, y, c);
      for (let y = y0 - d; y <= y1 + d; y++) for (const x of [x0 - d, x1 + d]) if (ok(g.get(x, y))) g.set(x, y, c);
    };
    ring(2, nt.light);
    ring(1, gd.dark);
  };
  if (night) {
    halo(21, 46, 32, 57);
    halo(41, 46, 52, 57);
  }

  /* ---------- 挂灯（门廊左柱） ---------- */
  g.hline(PX0 + 3, 36, 4, wd.dark); // 支架
  g.set(PX0 + 6, 37, wd.dark);
  g.rect(PX0 + 5, 38, 4, 5, night ? gd.base : st.base);
  g.rect(PX0 + 6, 39, 2, 3, night ? gd.light : st.light);
  g.hline(PX0 + 4, 38, 6, O);
  g.hline(PX0 + 5, 43, 4, O);
  g.set(PX0 + 4, 39, O); g.set(PX0 + 4, 42, O); g.set(PX0 + 9, 39, O); g.set(PX0 + 9, 42, O);
  if (night) {
    // 灯的光晕 + 被照亮的门廊地板
    const okp = (c: string | null) => !c || c === pl.base || c === pl.dark || c === wd.base;
    for (let y = 36; y <= 45; y++) for (let x = PX0 + 2; x <= PX0 + 11; x++) {
      const d = Math.max(Math.abs(x - (PX0 + 6.5)), Math.abs(y - 40.5));
      if (d > 3 && d <= 4 && okp(g.get(x, y))) g.set(x, y, gd.dark);
      else if (d > 4 && d <= 5 && okp(g.get(x, y))) g.set(x, y, nt.light);
    }
    for (let x = PX0 + 1; x <= PX0 + 16; x++) for (let y = FLOOR_Y; y < FLOOR_Y + 5; y++) if (g.get(x, y) === wd.base) g.set(x, y, wd.light);
  }

  /* ---------- 小狗趴在门廊上（2 帧呼吸） ---------- */
  const dog = (x: number, y: number, f: number) => {
    const body = ramp('earth');
    const rows = f % 2 === 0
      ? ['...OOOO.....', '..OBBBBO....', '.OBBBLBBOOO.', 'OBBBBBBBBBBO', 'OBKBBBBBBBBO', '.OBBBOOOBBO.', '..OOO...OO..']
      : ['............', '...OOOO.....', '..OBBBBOOO..', '.OBBBLBBBBO.', 'OBBBBBBBBBBO', 'OBKBBOOOBBBO', '.OOOO...OO..'];
    g.paste(x, y, rows, { O, B: body.base, L: body.light, K: ramp('ink').dark });
  };
  dog(76, FLOOR_Y - 7, frame);

  /* ---------- 屋顶：稻草茅顶，厚、低、右檐拖长 ---------- */
  for (let y = RIDGE; y <= 40; y++) {
    const l = leftAt(y);
    const r = rightAt(y);
    for (let x = l; x <= r; x++) {
      if (y > eaveAt(x)) continue;
      const layer = Math.floor((y - RIDGE) / 6);
      const phase = (y - RIDGE) % 6;
      let c = phase === 0 ? th.light : phase === 5 ? th.dark : th.base;
      if (layer === 0 && phase <= 2) c = th.light; // 顶部亮阶多
      // 一束束的草：竖向暗线，每层束宽 4–6 不等、起点错开；束里偶尔一根亮草
      const pitch = 4 + ((layer * 7 + Math.floor(x / 9)) % 3);
      const off = (layer * 3 + Math.floor(x / 23)) % pitch;
      if (phase >= 1 && phase <= 4 && (x + off) % pitch === 0) c = th.dark;
      if (phase >= 2 && phase <= 3 && (x * 5 + y * 3) % 17 === 0) c = th.light;
      if (layer === 0 && phase <= 2 && (x + 1) % 5 === 0) c = th.base;
      // 右侧背光
      if (x > 72 && c === th.light) c = th.base;
      if (x > 84 && c === th.base) c = th.dark;
      g.set(x, y, c);
    }
  }
  // 檐口：底边暗阶 + 参差的草穗
  for (let x = 0; x < 96; x++) {
    const ey = eaveAt(x);
    if (x < leftAt(ey) || x > rightAt(ey)) continue;
    g.set(x, ey, th.dark);
    if (x % 3 === 0) g.set(x, ey + 1, th.dark);
    if (x % 7 === 0) g.set(x, ey + 2, th.dark);
  }
  // 檐下阴影：墙面 3 px（2 px 实 + 1 px 抖动）
  for (let x = WALL_X0; x <= WALL_X1; x++) {
    const ey = eaveAt(x);
    for (let d = 1; d <= 3; d++) {
      const y = ey + d;
      const c = g.get(x, y);
      if (c === pl.base || c === pl.light) {
        if (d < 3 || (x + y) % 2 === 0) g.set(x, y, pl.dark);
      } else if (c === wd.base && d === 1) g.set(x, y, wd.dark);
    }
  }
  // 屋脊：暗阶 + 一排亮点，两端微翘
  g.hline(20, RIDGE, 51, th.dark);
  g.hline(21, RIDGE - 1, 49, th.base);
  for (let x = 22; x < 70; x += 4) g.set(x, RIDGE - 1, th.light);
  g.set(19, RIDGE - 1, th.dark);
  g.set(71, RIDGE - 1, th.dark);
  // 烟囱：石砌，右后方
  g.rect(64, 0, 8, 12, st.base);
  g.vline(64, 0, 12, st.light);
  g.vline(71, 0, 12, st.dark);
  for (let y = 2; y < 12; y += 3) for (let x = 65 + (y % 2) * 2; x < 71; x += 4) g.set(x, y, st.dark);
  g.rect(63, 0, 10, 2, st.dark);
  g.hline(63, 0, 10, st.light);
  // 冬天：屋顶积雪（每层顶部一行 + 零散）
  if (season === 'winter') {
    for (let y = RIDGE; y <= 40; y++) {
      const l = leftAt(y);
      const r = rightAt(y);
      const layerTop = (y - RIDGE) % 6 === 0;
      for (let x = l; x <= r; x++) if (y <= eaveAt(x) && (layerTop || (x * 7 + y * 3) % 11 === 0)) g.set(x, y, sn.light);
    }
    g.hline(63, 0, 10, sn.light);
  }

  /* ---------- 屋侧：柴堆 + 扫帚 ---------- */
  const log = (x: number, y: number) => {
    g.rect(x, y, 4, 3, wd.base);
    g.set(x, y, wd.light);
    g.set(x + 3, y + 2, wd.dark);
    g.set(x + 1, y + 1, wd.dark);
  };
  for (let row = 0; row < 3; row++) for (let i = 0; i < 3 - (row === 2 ? 1 : 0); i++) log(3 + i * 4 + (row % 2) * 2, 53 + row * 3);
  // 扫帚靠墙
  g.vline(14, 40, 14, wd.base);
  g.set(14, 40, wd.light);
  g.rect(12, 53, 5, 5, th.base);
  g.vline(13, 54, 4, th.dark);
  g.vline(15, 54, 4, th.dark);
  g.hline(12, 57, 5, th.dark);

  /* ---------- 屋前：水缸、花盆、晾衣绳 ---------- */
  const jar = (x: number, y: number) => {
    g.rect(x, y + 1, 10, 9, st.base);
    g.rect(x + 1, y, 8, 1, st.dark);
    g.rect(x + 1, y + 1, 8, 1, ramp('water').dark);
    g.set(x + 2, y + 1, ramp('water').light);
    g.vline(x, y + 1, 9, st.light);
    g.vline(x + 9, y + 1, 9, st.dark);
    g.hline(x + 1, y + 5, 8, st.dark);
    g.rect(x + 1, y + 10, 8, 1, st.dark);
  };
  jar(4, 66);
  const pot = (x: number, y: number, i: number) => {
    g.rect(x, y + 3, 6, 4, ramp('brick').base);
    g.hline(x, y + 3, 6, ramp('brick').light);
    g.vline(x + 5, y + 3, 4, ramp('brick').dark);
    g.rect(x + 1, y + 7, 4, 1, ramp('brick').dark);
    const fc = flowerColors.length ? flowerColors[i % 3] : sn.light;
    g.rect(x + 1, y, 4, 3, season === 'winter' ? sn.base : ramp('grass').base);
    g.set(x + 1, y, fc);
    g.set(x + 3, y + 1, fc);
    g.set(x + 4, y, flowerColors.length ? flowerColors[(i + 1) % 3] : sn.light);
  };
  pot(20, 68, 0);
  pot(29, 70, 1);
  pot(38, 68, 2);
  g.compose(clotheslineSprite(frame), 62, 64);

  /* ---------- 描边：整体外圈木暗阶（不用墨色） ---------- */
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
