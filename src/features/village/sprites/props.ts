/**
 * 小物：灌木、花丛、石头、树桩、木箱、木桶、围栏、路灯（亮 / 灭）、告示板、稻草人、晾衣绳（2 帧）、南瓜、雪人、落叶。
 * 全部透明底，按格对齐；光源左上；描边用各色系描边色。
 */
import { Grid } from '@/pixel/painter';
import type { Season } from '@/lib/season';
import { ramp, SEASON_RAMPS } from '../palette';
import { irange, makeRng } from './ground';
import { TILE } from './tile';

function art(rows: string[], map: Record<string, string>, w?: number, h?: number): Grid {
  const g = new Grid(w ?? rows[0].length, h ?? rows.length);
  g.paste(0, 0, rows, map);
  return g;
}

/* ------------------------------ 灌木 ------------------------------ */
/** 灌木 16×16：两团叶（左上亮、右下暗）+ 叶簇凸起 + 描边；冬天顶雪 */
export function bushSprite(season: Season, variant = 0): Grid {
  const l = season === 'spring' ? ramp('grass') : SEASON_RAMPS[season].leaf;
  const rnd = makeRng(variant, 0, 900);
  const g = new Grid(TILE, TILE);
  const blob = (cx: number, cy: number, rx: number, ry: number, c: string) => {
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) g.set(x, y, c);
    }
  };
  if (season === 'winter') {
    const w = ramp('wood');
    const sn = ramp('snow');
    blob(8, 10, 6.5, 4.5, w.dark);
    blob(6, 9, 3.5, 3, w.base);
    blob(8, 7, 6, 2.5, sn.base);
    blob(6, 6, 3, 1.5, sn.light);
    g.outline(w.outline);
    return g;
  }
  blob(8, 10, 6.5, 4.5, l.dark);
  blob(7, 8, 5, 3.5, l.base);
  blob(5.5, 7, 2.5, 2, l.light);
  blob(11, 8, 2.5, 2, l.base);
  // 叶簇凸起与缺口
  for (let k = 0; k < 5; k++) {
    const x = irange(rnd, 1, 13);
    const y = irange(rnd, 4, 13);
    if (!g.get(x, y) && (g.get(x + 1, y) || g.get(x - 1, y) || g.get(x, y + 1))) g.set(x, y, g.get(x, y + 1) ?? g.get(x + 1, y) ?? l.base);
  }
  g.set(irange(rnd, 4, 10), irange(rnd, 8, 12), l.dark);
  g.set(irange(rnd, 4, 10), irange(rnd, 6, 9), l.light);
  if (season === 'spring') {
    const pk = ramp('pink');
    g.set(irange(rnd, 3, 12), irange(rnd, 5, 10), pk.light);
    g.set(irange(rnd, 3, 12), irange(rnd, 5, 10), pk.base);
  }
  if (season === 'autumn') g.set(irange(rnd, 3, 12), irange(rnd, 5, 10), ramp('gold').base);
  g.outline(l.outline);
  return g;
}

/* ------------------------------ 花丛 ------------------------------ */
/** 花丛 16×8：草茬 + 3–4 朵小花（春粉黄 / 夏白黄 / 秋橙 / 冬无花只剩枯草） */
export function flowerSprite(season: Season, variant = 0): Grid {
  const gr = SEASON_RAMPS[season].grass;
  const rnd = makeRng(variant, 1, 901);
  const g = new Grid(TILE, 8);
  const stalk = season === 'winter' ? ramp('autumn') : gr;
  for (let k = 0; k < 4; k++) {
    const x = 1 + k * 4 + irange(rnd, 0, 1);
    g.set(x, 7, stalk.dark);
    g.set(x, 6, stalk.dark);
    g.set(x + 1, 7, stalk.dark);
    g.set(x, 5, stalk.base);
  }
  if (season === 'winter') return g;
  const colors = season === 'spring' ? [ramp('pink').light, ramp('gold').light, ramp('pink').base] : season === 'summer' ? [ramp('plaster').light, ramp('gold').base, ramp('plaster').light] : [ramp('brick').light, ramp('gold').base, ramp('gold').dark];
  for (let k = 0; k < irange(rnd, 3, 4); k++) {
    const x = 1 + k * 4 + irange(rnd, 0, 1);
    const y = irange(rnd, 2, 4);
    const c = colors[k % colors.length];
    g.set(x, y, c);
    g.set(x + 1, y, c);
    g.set(x, y + 1, c);
    g.set(x + 1, y + 1, colors[(k + 1) % colors.length]);
    g.set(x, y + 2, stalk.dark);
  }
  return g;
}

/* ------------------------------ 石头 ------------------------------ */
const ROCK_A = ['.....OOOO.....', '...OOLLLBO....', '..OLLLBBBBO...', '.OLLBBBBBDDO..', '.OLBBBBBDDDO..', '.OBBBBDDDDDO..', '..ODDDDDDDO...', '...OOOOOOO....'];
const ROCK_B = ['...OOO....', '..OLLBO...', '.OLBBBDO..', '.OBBBDDO..', '..ODDDO...', '...OOO....'];
export function rockSprite(variant = 0, season: Season = 'spring'): Grid {
  const st = ramp('stone');
  const g = art(variant === 0 ? ROCK_A : ROCK_B, { O: st.outline, L: st.light, B: st.base, D: st.dark });
  if (season === 'winter') {
    const sn = ramp('snow');
    for (let x = 0; x < g.w; x++) {
      for (let y = 0; y < g.h; y++) {
        if (g.get(x, y) && g.get(x, y) !== st.outline) {
          g.set(x, y, sn.light);
          if (y + 1 < g.h && g.get(x, y + 1) && g.get(x, y + 1) !== st.outline) g.set(x, y + 1, sn.base);
          break;
        }
      }
    }
  }
  return g;
}

/* ------------------------------ 树桩 ------------------------------ */
const STUMP = ['..OOOOOOOO..', '.OLLLLLLBBO.', 'OLLBDDDBBBBO', 'OLBDLLLDBBBO', 'OLBDLDLDBBDO', 'OLBBDDDBBDDO', '.OLBBBBBDDO.', '.OBBBBBBDDO.', '.OBBBBBBDDO.', '.OBBBBBDDDO.', 'OOBBBBBDDDOO', 'ODDDDDDDDDDO', '.OOOOOOOOOO.'];
export function stumpSprite(): Grid {
  const w = ramp('wood');
  return art(STUMP, { O: w.outline, L: w.light, B: w.base, D: w.dark });
}

/* ------------------------------ 木箱 / 木桶 ------------------------------ */
const CRATE = ['OOOOOOOOOOOO', 'OLLLLLLLLLDO', 'OLBDBBBBDBDO', 'OLBBDBBDBBDO', 'OLBBBDDBBBDO', 'OLBBBDDBBBDO', 'OLBBDBBDBBDO', 'OLBDBBBBDBDO', 'ODDDDDDDDDDO', 'OOOOOOOOOOOO'];
export function crateSprite(): Grid {
  const w = ramp('wood');
  return art(CRATE, { O: w.outline, L: w.light, B: w.base, D: w.dark });
}
const BARREL = ['..OOOOOO..', '.OLBBBBDO.', 'OSSSSSSSSO', 'OLBBBBBDDO', 'OLBBBBBDDO', 'OSSSSSSSSO', 'OLBBBBBDDO', 'OLBBBBBDDO', 'OSSSSSSSSO', '.ODDDDDDO.', '..OOOOOO..'];
export function barrelSprite(): Grid {
  const w = ramp('wood');
  const st = ramp('stone');
  return art(BARREL, { O: w.outline, L: w.light, B: w.base, D: w.dark, S: st.dark });
}

/* ------------------------------ 围栏 ------------------------------ */
export type FenceKind = 'h' | 'v' | 'post' | 'corner';
/** 围栏 16×16：横段两根横杆 + 立柱；竖段一根立柱带短横；角与单柱 */
export function fenceSprite(kind: FenceKind, season: Season = 'spring'): Grid {
  const w = ramp('wood');
  const g = new Grid(TILE, TILE);
  const post = (x: number) => {
    g.rect(x, 4, 3, 11, w.base);
    g.vline(x, 4, 11, w.light);
    g.vline(x + 2, 4, 11, w.dark);
    g.hline(x, 3, 3, w.light);
    g.hline(x, 15, 3, w.dark);
  };
  const rail = (x0: number, x1: number, y: number) => {
    g.rect(x0, y, x1 - x0, 2, w.base);
    g.hline(x0, y, x1 - x0, w.light);
    g.hline(x0, y + 1, x1 - x0, w.dark);
  };
  if (kind === 'h' || kind === 'corner') {
    rail(0, TILE, 7);
    rail(0, TILE, 11);
    post(2);
    if (kind === 'h') post(11);
  }
  if (kind === 'v' || kind === 'corner') {
    g.rect(3, 0, 2, kind === 'corner' ? 8 : TILE, w.dark);
    g.vline(3, 0, kind === 'corner' ? 8 : TILE, w.base);
    post(2);
  }
  if (kind === 'post') post(6);
  g.outline(w.outline);
  if (season === 'winter') {
    const sn = ramp('snow');
    for (let x = 0; x < TILE; x++) for (let y = 0; y < TILE; y++) if (g.get(x, y) && g.get(x, y) !== w.outline && !g.get(x, y - 1)) { g.set(x, y, sn.light); break; }
  }
  return g;
}

/* ------------------------------ 路灯 ------------------------------ */
/** 路灯 16×32：铁杆 + 灯笼头；lit 时灯罩金亮、两圈光晕（金暗 + 夜天亮）由光照层画，这里只画灯体 */
export function lampSprite(lit: boolean): Grid {
  const st = ramp('stone');
  const gd = ramp('gold');
  const ink = ramp('ink');
  const g = new Grid(TILE, 32);
  // 杆
  g.rect(7, 10, 2, 20, st.dark);
  g.vline(7, 10, 20, st.base);
  // 底座
  g.rect(5, 29, 6, 3, st.dark);
  g.hline(5, 29, 6, st.base);
  // 灯头：屋檐形顶 + 灯罩
  g.rect(5, 3, 6, 6, lit ? gd.base : st.base);
  g.rect(6, 4, 4, 4, lit ? gd.light : st.light);
  g.hline(4, 2, 8, ink.base);
  g.set(7, 1, ink.base);
  g.set(8, 1, ink.base);
  g.hline(5, 9, 6, ink.base);
  g.vline(4, 3, 6, ink.base);
  g.vline(11, 3, 6, ink.base);
  if (lit) {
    g.set(6, 4, gd.light);
    g.set(9, 7, gd.dark);
  }
  g.outline(ink.base);
  return g;
}

/* ------------------------------ 告示板 ------------------------------ */
const SIGN = ['OOOOOOOOOOOOOOOO', 'OLLLLLLLLLLLLLDO', 'OLBBBBBBBBBBBBDO', 'OLBDDDBBDDDDBBDO', 'OLBBBBBBBBBBBBDO', 'OLBDDDDDBBDDDBDO', 'OLBBBBBBBBBBBBDO', 'ODDDDDDDDDDDDDDO', 'OOOOOOOOOOOOOOOO', '...OBDO..OBDO...', '...OBDO..OBDO...', '...OBDO..OBDO...', '...OBDO..OBDO...', '...ODDO..ODDO...'];
export function signSprite(): Grid {
  const w = ramp('wood');
  return art(SIGN, { O: w.outline, L: w.light, B: w.base, D: w.dark });
}

/* ------------------------------ 稻草人 ------------------------------ */
const SCARECROW = [
  '......OOOO......',
  '.....OGGGGO.....',
  '....OGGLGGGO....',
  '...OOOOOOOOOO...',
  '.....OPPPPO.....',
  '.....OPKPKO.....',
  '.....OPPPPO.....',
  '......OPPO......',
  'OOOOOOOBBOOOOOOO',
  'OBBBBBBBBBBBBBBO',
  'OOOOOOOBBOOOOOOO',
  '......OBBO......',
  '......OBBO......',
  '......OBBO......',
  '.....OSSSSO.....',
  '.....OSSSSO.....',
  '......OSSO......',
  '......OSSO......',
  '......OWWO......',
  '......OWWO......',
  '......OWWO......',
  '.......OO.......',
];
export function scarecrowSprite(): Grid {
  const w = ramp('wood');
  const au = ramp('autumn');
  const pl = ramp('plaster');
  const br = ramp('brick');
  const ink = ramp('ink');
  return art(SCARECROW, { O: ink.base, G: au.base, L: au.light, P: pl.base, K: ink.dark, B: br.base, S: au.dark, W: w.base });
}

/* ------------------------------ 晾衣绳 ------------------------------ */
/** 晾衣绳 32×16 两帧：两根杆之间一根绳，挂 3 件衣服，帧 2 衣角向右飘 */
export function clotheslineSprite(frame: number): Grid {
  const w = ramp('wood');
  const ink = ramp('ink');
  const g = new Grid(32, 16);
  for (const x of [1, 29]) {
    g.rect(x, 2, 2, 14, w.base);
    g.vline(x, 2, 14, w.light);
    g.set(x, 1, w.dark);
    g.set(x + 1, 1, w.dark);
  }
  g.hline(3, 4, 26, ink.light);
  const shirts: [number, string, string][] = [
    [5, ramp('water').light, ramp('water').base],
    [13, ramp('plaster').light, ramp('plaster').base],
    [21, ramp('pink').light, ramp('pink').base],
  ];
  const sw = frame % 2;
  for (const [x, c1, c2] of shirts) {
    g.rect(x, 5, 6, 6, c1);
    g.vline(x + 5, 5, 6, c2);
    g.hline(x, 10, 6, c2);
    g.set(x + sw + 5, 10, c1);
    g.set(x + sw + 5, 11, c2);
    if (sw) g.set(x, 10, null);
    g.set(x + 1, 4, ink.base);
    g.set(x + 4, 4, ink.base);
  }
  g.outline(ink.base);
  return g;
}

/* ------------------------------ 南瓜 / 雪人 ------------------------------ */
const PUMPKIN = ['....OGO....', '...OODOO...', '..OLBBBBO..', '.OLLBDBBBO.', 'OLLBBDBBDBO', 'OLBBBDBBDDO', 'OBBBBDBBDDO', '.OBBDBBDDO.', '..ODDDDDO..', '...OOOOO...'];
export function pumpkinSprite(): Grid {
  const gd = ramp('gold');
  const br = ramp('brick');
  const w = ramp('wood');
  return art(PUMPKIN, { O: br.outline, G: w.base, L: gd.light, B: gd.base, D: br.light });
}
const SNOWMAN = ['....OOOO....', '...OLLLBO...', '..OLLKLKBO..', '..OLLLGLBO..', '...OBBBBO...', '..OLLLLLBO..', '.OLLLKLLBBO.', 'OLLLLLLLBBBO', 'OLLLLKLLBBBO', '.OLLLLLLBBO.', '..OOOOOOOO..'];
export function snowmanSprite(): Grid {
  const sn = ramp('snow');
  const ink = ramp('ink');
  const gd = ramp('gold');
  return art(SNOWMAN, { O: sn.outline, L: sn.light, B: sn.base, K: ink.dark, G: gd.base });
}

/* ------------------------------ 落叶 ------------------------------ */
/** 秋天散落的叶子 16×16：5–7 片 1–2 px */
export function leavesSprite(variant = 0): Grid {
  const rnd = makeRng(variant, 2, 902);
  const g = new Grid(TILE, TILE);
  const cs = [ramp('brick').light, ramp('gold').base, ramp('autumn').dark, ramp('brick').base];
  for (let k = 0; k < irange(rnd, 5, 7); k++) {
    const x = irange(rnd, 0, TILE - 2);
    const y = irange(rnd, 0, TILE - 1);
    g.set(x, y, cs[k % cs.length]);
    if (rnd() < 0.6) g.set(x + 1, y, cs[(k + 2) % cs.length]);
  }
  return g;
}
