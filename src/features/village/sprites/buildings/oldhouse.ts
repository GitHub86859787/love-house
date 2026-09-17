/**
 * 老宅（家人区）：6×5 tile = 96×80。白灰墙 + 青瓦翘檐 + 木色双开门 + 木格窗 + 院墙院门 + 水缸 + 晾衣绳 + 烟囱。
 * 白天窗纸白灰亮阶；夜里换金基阶并加两圈光晕（金暗 + 夜天亮）。秋冬烟囱冒烟（smokeSprite 另画，4 帧）。
 * 光源左上：屋顶左侧亮、右侧暗；檐下墙面 2 px 暗阶阴影。
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
  const tile = ramp('tile');
  const pl = ramp('plaster');
  const st = ramp('stone');
  const wd = ramp('wood');
  const gd = ramp('gold');
  const ink = ramp('ink');
  const nt = ramp('night');
  const sn = ramp('snow');
  const rnd = makeRng(1, 1, 1000);

  const RIDGE_Y = 6;
  const EAVE_Y = 26;
  const WALL_X0 = 6;
  const WALL_X1 = 89; // inclusive
  const WALL_TOP = EAVE_Y + 1;
  const BASE_Y = 55; // 石基顶
  const WALL_BOT = 58; // 墙底（含石基）

  /* ---------- 屋顶（歇山式梯形：脊短檐长，两端翘起） ---------- */
  const leftAt = (y: number) => Math.round(13 - ((y - RIDGE_Y) * 13) / (EAVE_Y - RIDGE_Y));
  const rightAt = (y: number) => Math.round(82 + ((y - RIDGE_Y) * 13) / (EAVE_Y - RIDGE_Y));
  // 瓦：每行 4 px（亮 / 基 / 基 / 暗），每片 3 px 宽 + 1 px 暗缝，隔行错 2 px
  for (let y = RIDGE_Y + 2; y <= EAVE_Y; y++) {
    const l = leftAt(y);
    const r = rightAt(y);
    const row = Math.floor((y - RIDGE_Y - 2) / 4);
    const phase = (y - RIDGE_Y - 2) % 4;
    const off = row % 2 === 0 ? 0 : 2;
    for (let x = l; x <= r; x++) {
      const k = (x + off) % 4;
      let c = k === 3 ? tile.dark : phase === 0 ? tile.light : phase === 3 ? tile.dark : tile.base;
      // 右侧背光整体压一阶
      if (x > 60 && c === tile.light) c = tile.base;
      if (x > 78 && c === tile.base) c = tile.dark;
      g.set(x, y, c);
    }
  }
  // 屋脊：墨色 2 px，两端翘起
  g.hline(12, RIDGE_Y, 72, ink.dark);
  g.hline(12, RIDGE_Y + 1, 72, ink.base);
  g.hline(13, RIDGE_Y + 2, 70, tile.light);
  for (const [x, dir] of [[11, -1], [84, 1]] as [number, number][]) {
    g.set(x, RIDGE_Y, ink.dark);
    g.set(x + dir, RIDGE_Y - 1, ink.dark);
    g.set(x + dir * 2, RIDGE_Y - 2, ink.dark);
    g.set(x + dir, RIDGE_Y, ink.base);
  }
  // 屋檐：最下一行暗瓦 + 檐口木色一条
  g.hline(0, EAVE_Y, OLDHOUSE_W, tile.dark);
  g.hline(0, EAVE_Y + 1, OLDHOUSE_W, wd.dark);
  // 两侧檐角翘起
  for (const [x, dir] of [[0, 1], [95, -1]] as [number, number][]) {
    g.set(x, EAVE_Y - 1, tile.dark);
    g.set(x, EAVE_Y - 2, ink.base);
    g.set(x + dir, EAVE_Y - 1, tile.base);
  }
  // 烟囱：屋顶右后方，石色
  g.rect(70, 0, 7, RIDGE_Y + 6, st.base);
  g.vline(70, 0, RIDGE_Y + 6, st.light);
  g.vline(76, 0, RIDGE_Y + 6, st.dark);
  g.rect(69, 0, 9, 2, st.dark);
  g.hline(69, 0, 9, st.light);
  g.rect(71, 1, 5, 1, ink.dark);

  /* ---------- 墙 ---------- */
  g.rect(WALL_X0, WALL_TOP + 1, WALL_X1 - WALL_X0 + 1, WALL_BOT - WALL_TOP, pl.base);
  // 檐下阴影 2 px
  g.rect(WALL_X0, WALL_TOP + 1, WALL_X1 - WALL_X0 + 1, 2, pl.dark);
  // 墙面斑驳：8–12 处 1–2 px 暗阶
  for (let k = 0; k < irange(rnd, 8, 12); k++) {
    const x = irange(rnd, WALL_X0 + 2, WALL_X1 - 3);
    const y = irange(rnd, WALL_TOP + 4, BASE_Y - 2);
    g.set(x, y, pl.dark);
    if (rnd() < 0.5) g.set(x + 1, y, pl.dark);
  }
  // 墙左侧受光一条亮阶
  g.vline(WALL_X0, WALL_TOP + 3, BASE_Y - WALL_TOP - 3, pl.light);
  // 石色基座
  g.rect(WALL_X0, BASE_Y, WALL_X1 - WALL_X0 + 1, WALL_BOT - BASE_Y + 1, st.base);
  g.hline(WALL_X0, BASE_Y, WALL_X1 - WALL_X0 + 1, st.light);
  for (let x = WALL_X0 + 3; x < WALL_X1; x += 7) g.set(x, BASE_Y + 2, st.dark);
  g.hline(WALL_X0, WALL_BOT, WALL_X1 - WALL_X0 + 1, st.dark);
  // 墙描边
  g.vline(WALL_X0 - 1, WALL_TOP + 1, WALL_BOT - WALL_TOP + 1, ink.base);
  g.vline(WALL_X1 + 1, WALL_TOP + 1, WALL_BOT - WALL_TOP + 1, ink.base);

  /* ---------- 门：木色双开，墨色门框，铜钉 ---------- */
  const DX0 = 40;
  const DX1 = 55;
  const DY0 = 38;
  g.rect(DX0 - 1, DY0 - 1, DX1 - DX0 + 3, WALL_BOT - DY0 + 1, ink.base); // 门框
  g.rect(DX0, DY0, DX1 - DX0 + 1, WALL_BOT - DY0, wd.base);
  g.hline(DX0, DY0, DX1 - DX0 + 1, wd.light);
  g.vline(DX0, DY0, WALL_BOT - DY0, wd.light);
  g.vline(DX1, DY0, WALL_BOT - DY0, wd.dark);
  g.vline(47, DY0, WALL_BOT - DY0, ink.base); // 中缝
  g.vline(48, DY0, WALL_BOT - DY0, wd.dark);
  // 门板横档
  g.hline(DX0 + 1, DY0 + 6, 6, wd.dark);
  g.hline(49, DY0 + 6, 6, wd.dark);
  g.hline(DX0 + 1, WALL_BOT - 5, 6, wd.dark);
  g.hline(49, WALL_BOT - 5, 6, wd.dark);
  // 铜钉
  g.set(44, DY0 + 10, gd.dark);
  g.set(51, DY0 + 10, gd.dark);
  // 门槛石
  g.rect(DX0 - 1, WALL_BOT, DX1 - DX0 + 3, 1, st.light);

  /* ---------- 窗：两扇木格窗 ---------- */
  const win = (x0: number) => {
    const y0 = 33;
    const w = 14;
    const h = 13;
    g.rect(x0 - 1, y0 - 1, w + 2, h + 2, wd.dark); // 框
    g.rect(x0, y0, w, h, night ? gd.base : pl.light); // 窗纸
    // 窗棂：田字 + 中间细格
    g.vline(x0 + 7, y0, h, wd.base);
    g.hline(x0, y0 + 6, w, wd.base);
    g.vline(x0 + 3, y0, h, wd.dark);
    g.vline(x0 + 10, y0, h, wd.dark);
    g.hline(x0, y0 + 3, w, wd.dark);
    g.hline(x0, y0 + 9, w, wd.dark);
    if (night) {
      // 亮窗：格子里金亮点
      g.set(x0 + 1, y0 + 1, gd.light);
      g.set(x0 + 8, y0 + 7, gd.light);
      // 两圈光晕：金暗 1 px，再外一圈夜天亮
      const ring = (d: number, c: string) => {
        for (let x = x0 - 1 - d; x <= x0 + w + d; x++) for (const y of [y0 - 1 - d, y0 + h + d]) if (!g.get(x, y) || g.get(x, y) === pl.base || g.get(x, y) === pl.dark || g.get(x, y) === pl.light) g.set(x, y, c);
        for (let y = y0 - 1 - d; y <= y0 + h + d; y++) for (const x of [x0 - 1 - d, x0 + w + d]) if (!g.get(x, y) || g.get(x, y) === pl.base || g.get(x, y) === pl.dark || g.get(x, y) === pl.light) g.set(x, y, c);
      };
      ring(2, nt.light);
      ring(1, gd.dark);
    }
    // 窗台
    g.hline(x0 - 2, y0 + h + 1, w + 4, wd.base);
    g.hline(x0 - 2, y0 + h + 2, w + 4, wd.dark);
  };
  win(15);
  win(67);

  /* ---------- 院子：矮墙一段 + 院门口、水缸、晾衣绳 ---------- */
  const yardWall = (x0: number, x1: number) => {
    const y0 = 72;
    const y1 = 78;
    g.rect(x0, y0, x1 - x0 + 1, y1 - y0 + 1, pl.base);
    g.hline(x0 + 1, y0 + 1, x1 - x0 - 1, pl.light);
    g.hline(x0, y0, x1 - x0 + 1, tile.base); // 墙帽青瓦
    g.hline(x0, y0 - 1, x1 - x0 + 1, tile.dark);
    g.hline(x0, y1, x1 - x0 + 1, st.dark);
    for (let x = x0 + 4; x < x1; x += 9) g.set(x, y0 + 3, pl.dark);
    g.vline(x0, y0 - 1, y1 - y0 + 2, ink.base);
    g.vline(x1, y0 - 1, y1 - y0 + 2, ink.base);
    // 端柱
    g.rect(x0, y0 - 3, 3, 3, st.base);
    g.rect(x1 - 2, y0 - 3, 3, 3, st.base);
    g.set(x0, y0 - 3, st.light);
    g.set(x1 - 2, y0 - 3, st.light);
  };
  yardWall(2, 34);
  yardWall(61, 93);
  // 院门口：两侧石墩
  g.rect(34, 69, 3, 10, st.base);
  g.rect(59, 69, 3, 10, st.base);
  g.vline(36, 69, 10, st.dark);
  g.vline(61, 69, 10, st.dark);
  g.set(34, 69, st.light);
  g.set(59, 69, st.light);
  // 水缸（左院）
  const jar = (x: number, y: number) => {
    g.rect(x + 1, y, 8, 1, ink.base);
    g.rect(x, y + 1, 10, 9, st.base);
    g.rect(x + 1, y + 1, 8, 1, tile.dark); // 缸口的水
    g.set(x + 2, y + 1, tile.light);
    g.vline(x, y + 1, 9, st.light);
    g.vline(x + 9, y + 1, 9, st.dark);
    g.rect(x + 1, y + 10, 8, 1, st.dark);
    g.hline(x + 1, y + 5, 8, st.dark);
    g.outline(ink.base);
  };
  jar(10, 58);
  // 晾衣绳（右院）
  g.compose(clotheslineSprite(frame), 60, 54);
  // 冬天：屋顶与墙帽积雪
  if (season === 'winter') {
    for (let y = RIDGE_Y + 2; y <= EAVE_Y; y += 4) {
      const l = leftAt(y);
      const r = rightAt(y);
      for (let x = l; x <= r; x++) if ((x + y) % 3 !== 0) g.set(x, y, sn.light);
    }
    g.hline(2, 71, 33, sn.light);
    g.hline(61, 71, 33, sn.light);
    g.hline(69, 0, 9, sn.light);
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
