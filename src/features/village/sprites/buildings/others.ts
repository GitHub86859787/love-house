/**
 * 其余八处建筑：我的家、旅店、工坊、帐篷、广场（井 + 公告板 + 长凳）、茶馆、湖边小屋、村口牌坊。
 * 一律：暖墙、厚顶、木暗阶描边、门口有生活痕迹、夜灯。白天 / 傍晚两态，冬天顶雪。
 */
import { Grid } from '@/pixel/painter';
import type { Season } from '@/lib/season';
import { ramp } from '../../palette';
import { makeRng } from '../ground';
import { boards, bricks, br, chimney, flowerColors, gd, glass, gr, halo, ink, lamp, lantern, mi, outlineAll, pl, shingles, SHINGLE_ORANGE, SHINGLE_PINK, SHINGLE_RED, SHINGLE_SLATE, SHINGLE_WOOD, sn, st, steps, stonePath, wallish, wd, win, type ShingleColors } from './kit';

/* ============================== 我的家 5×6 = 80×96 ============================== */
export const HOME_W = 80;
export const HOME_H = 96;
/** 屋顶色可换：砖红 / 木 / 青瓦灰 / 粉 / 橙 */
export type RoofColor = 'red' | 'wood' | 'slate' | 'pink' | 'orange';
const ROOFS: Record<RoofColor, ShingleColors> = { red: SHINGLE_RED, wood: SHINGLE_WOOD, slate: SHINGLE_SLATE, pink: SHINGLE_PINK, orange: SHINGLE_ORANGE };

export function homeSprite(season: Season, night: boolean, frame = 0, roof: RoofColor = 'red'): Grid {
  const g = new Grid(HOME_W, HOME_H);
  const rnd = makeRng(4, 4, 1300);
  const fc = flowerColors(season);
  const sc = ROOFS[roof];
  const RIDGE = 4;
  const EAVE = 30;
  const WX0 = 12;
  const WX1 = 67;
  const WBOT = 78;
  // 墙（一层，亮一阶）
  boards(g, WX0, WX1, EAVE + 1, WBOT, rnd, { fill: wd.light, seam: wd.base, hi: pl.light });
  g.rect(WX0, WBOT + 1, WX1 - WX0 + 1, 2, st.base);
  g.hline(WX0, WBOT + 2, WX1 - WX0 + 1, st.dark);
  // 屋顶：脊 x 22..57，檐 x 0..79
  shingles(g, RIDGE, EAVE, (y) => Math.round(22 - ((y - RIDGE) * 22) / (EAVE - RIDGE)), (y) => Math.round(57 + ((y - RIDGE) * 22) / (EAVE - RIDGE)), sc, rnd);
  g.hline(21, RIDGE, 38, wd.dark);
  g.hline(22, RIDGE - 1, 36, sc.top);
  g.hline(0, EAVE, 80, wd.dark);
  g.hline(0, EAVE + 1, 80, wd.base);
  for (let x = WX0; x <= WX1; x++) for (let d = 2; d <= 4; d++) if (g.get(x, EAVE + d) === wd.light || (d < 4 && g.get(x, EAVE + d) === wd.base)) g.set(x, EAVE + d, wd.base);
  // 阁楼山墙：正面凸出，圆窗 + 小阳台
  const GX0 = 28;
  const GX1 = 51;
  for (let y = 8; y <= EAVE; y++) {
    const half = Math.min(12, y - 8 + 1);
    for (let x = 40 - half; x <= 39 + half; x++) if (x >= GX0 && x <= GX1) g.set(x, y, wd.base);
  }
  for (let y = 11; y <= EAVE; y += 4) for (let x = GX0; x <= GX1; x++) if (g.get(x, y) === wd.base) g.set(x, y, wd.dark);
  for (let i = 0; i < 13; i++) {
    g.set(39 - i, 8 + i, sc.top);
    g.set(40 + i, 8 + i, sc.top);
    g.set(39 - i, 9 + i, sc.a);
    g.set(40 + i, 9 + i, sc.a);
  }
  // 圆窗
  const cx = 39.5;
  const cy = 18.5;
  for (let y = 14; y <= 23; y++) for (let x = 35; x <= 44; x++) {
    const d = (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2;
    if (d <= 20) g.set(x, y, wd.dark);
    if (d <= 11) g.set(x, y, night ? gd.base : mi.light);
  }
  g.vline(39, 15, 8, wd.base);
  g.hline(36, 18, 8, wd.base);
  if (!night) { g.set(42, 16, pl.light); g.set(41, 17, pl.light); } else g.set(37, 16, gd.light);
  // 小阳台：栏杆凸出在山墙下
  g.rect(GX0 - 2, 26, GX1 - GX0 + 5, 2, wd.base);
  g.hline(GX0 - 2, 26, GX1 - GX0 + 5, wd.light);
  for (let x = GX0 - 1; x <= GX1 + 1; x += 3) g.vline(x, 22, 4, wd.dark);
  g.hline(GX0 - 2, 21, GX1 - GX0 + 5, wd.dark);
  // 窗两扇 + 花箱
  win(g, 17, 44, 10, 11, night, { sill: true, box: fc });
  win(g, 53, 44, 10, 11, night, { sill: true, box: fc });
  // 门：圆顶木门 + 门檩小雨棚 + 壁灯
  const DX0 = 34;
  const DX1 = 45;
  const DY0 = 54;
  for (let y = DY0; y <= WBOT; y++) for (let x = DX0; x <= DX1; x++) {
    const r = 6;
    const dy = y - (DY0 + r);
    if (dy < 0 && (x + 0.5 - 40) ** 2 + dy ** 2 > r * r) continue;
    g.set(x, y, wd.base);
  }
  for (let x = DX0 + 2; x <= DX1 - 1; x += 3) g.vline(x, DY0 + 5, WBOT - DY0 - 5, wd.dark);
  g.rect(38, 59, 4, 4, night ? gd.base : mi.light);
  g.set(38, 59, night ? gd.light : pl.light);
  g.set(43, 68, gd.dark);
  for (let x = DX0 - 3; x <= DX1 + 3; x++) g.set(x, DY0 - 3 + Math.abs(x - 40) / 6 | 0, sc.a);
  g.hline(DX0 - 3, DY0 - 1, DX1 - DX0 + 7, wd.dark);
  lamp(g, DX1 + 3, 56, night);
  steps(g, 40, WBOT + 3, 14, 2);
  // 菜园（左前）：三垄暗土，垄间亮一阶的土脊，苗是 3 像素宽的小叉叶
  const er = ramp('earth');
  g.rect(2, 83, 26, 13, er.dark);
  for (let row = 0; row < 3; row++) {
    const y = 84 + row * 4;
    g.hline(2, y + 3, 26, er.base);
    for (let x = 4; x < 28; x += 5) {
      const leaf = season === 'winter' ? sn.light : season === 'autumn' ? gd.base : gr.base;
      const tip = season === 'winter' ? sn.base : season === 'autumn' ? gd.light : gr.light;
      g.set(x, y + 2, gr.dark); g.set(x - 1, y + 1, leaf); g.set(x + 1, y + 1, leaf); g.set(x, y, tip);
    }
  }
  g.vline(1, 83, 13, wd.dark); g.vline(28, 83, 13, wd.dark); g.hline(1, 83, 28, wd.dark); g.hline(1, 95, 28, wd.dark);
  // 信箱（右前）
  g.rect(66, 78, 2, 12, wd.base);
  g.rect(63, 74, 8, 5, br.base);
  g.hline(63, 74, 8, br.light);
  g.vline(70, 74, 5, br.dark);
  g.set(69, 76, gd.dark);
  // 石板小径
  stonePath(g, 34, WBOT + 9, HOME_H - 1);
  if (season === 'winter') for (let y = RIDGE; y <= EAVE; y += 3) for (let x = 0; x < 80; x++) { const c = g.get(x, y); if (c && (c === sc.a || c === sc.b || c === sc.top) && (x * 5 + y) % 4 !== 0) g.set(x, y, sn.light); }
  void frame;
  outlineAll(g);
  return g;
}

/* ============================== 旅店 5×5 = 80×80 ============================== */
export const INN_W = 80;
export const INN_H = 80;
export function innSprite(season: Season, night: boolean, frame = 0): Grid {
  const g = new Grid(INN_W, INN_H);
  const rnd = makeRng(5, 5, 1400);
  const RIDGE = 6;
  const EAVE = 26;
  const WX0 = 8;
  const WX1 = 71;
  const WBOT = 64;
  boards(g, WX0, WX1, EAVE + 1, WBOT, rnd);
  g.rect(WX0, WBOT + 1, WX1 - WX0 + 1, 2, st.base);
  // 木瓦顶
  shingles(g, RIDGE, EAVE, (y) => Math.round(16 - ((y - RIDGE) * 16) / (EAVE - RIDGE)), (y) => Math.round(63 + ((y - RIDGE) * 16) / (EAVE - RIDGE)), SHINGLE_WOOD, rnd);
  g.hline(15, RIDGE, 50, wd.dark);
  g.hline(0, EAVE, 80, wd.dark);
  g.hline(0, EAVE + 1, 80, wd.base);
  for (let x = WX0; x <= WX1; x++) for (let d = 2; d <= 3; d++) if (g.get(x, EAVE + d) === wd.base) g.set(x, EAVE + d, wd.dark);
  chimney(g, 58, 0, 12, 6);
  // 大门（双开）+ 两扇窗
  g.rect(31, 42, 18, WBOT - 42 + 1, wd.dark);
  g.rect(32, 43, 16, WBOT - 43 + 1, wd.base);
  g.vline(39, 43, WBOT - 43 + 1, wd.dark);
  g.vline(40, 43, WBOT - 43 + 1, wd.light);
  g.hline(32, 43, 16, wd.light);
  glass(g, 33, 45, 5, 5, night);
  glass(g, 42, 45, 5, 5, night);
  g.set(38, 54, gd.dark);
  g.set(41, 54, gd.dark);
  win(g, 14, 40, 10, 10, night, { sill: true });
  win(g, 57, 40, 10, 10, night, { sill: true });
  // 挂牌：木牌 + 月亮与星星（歇脚的意思，字在这尺寸下画不清）
  g.rect(28, 30, 24, 8, pl.base);
  g.rect(28, 30, 24, 1, pl.light);
  g.rect(28, 37, 24, 1, pl.dark);
  // 弯月：外弧 ink，内侧留 plaster
  g.vline(35, 32, 4, ink.base); g.set(36, 31, ink.base); g.set(36, 36, ink.base); g.set(37, 31, ink.base); g.set(37, 36, ink.base); g.set(38, 32, ink.base); g.set(38, 35, ink.base);
  // 星星
  g.set(43, 32, gd.dark); g.set(42, 33, gd.dark); g.set(44, 33, gd.dark); g.set(43, 34, gd.dark); g.set(43, 33, gd.base);
  g.set(31, 35, gd.dark);
  g.set(28, 29, wd.dark); g.set(51, 29, wd.dark);
  // 两盏灯笼
  lantern(g, 10, 31, night);
  lantern(g, 64, 31, night);
  // 门口长椅、木桶
  g.rect(12, 60, 14, 2, wd.base);
  g.hline(12, 60, 14, wd.light);
  g.rect(13, 62, 2, 5, wd.dark);
  g.rect(23, 62, 2, 5, wd.dark);
  g.rect(60, 58, 8, 9, wd.base);
  g.vline(60, 58, 9, wd.light);
  g.vline(67, 58, 9, wd.dark);
  g.hline(60, 60, 8, st.dark);
  g.hline(60, 64, 8, st.dark);
  // 台阶、路
  steps(g, 40, WBOT + 3, 16, 2);
  stonePath(g, 34, WBOT + 9, INN_H - 1);
  // 拴马桩
  g.rect(74, 50, 3, 16, wd.base);
  g.set(74, 50, wd.light);
  g.hline(73, 49, 5, wd.dark);
  if (night) {
    halo(g, 13, 39, 24, 50, wallish);
    halo(g, 56, 39, 67, 50, wallish);
    halo(g, 10, 31, 15, 37, wallish);
    halo(g, 64, 31, 69, 37, wallish);
  }
  if (season === 'winter') for (let y = RIDGE; y <= EAVE; y += 3) for (let x = 0; x < 80; x++) { const c = g.get(x, y); if (c && (c === wd.base || c === wd.dark || c === wd.light) && (x * 5 + y) % 4 !== 0) g.set(x, y, sn.light); }
  void frame;
  outlineAll(g);
  return g;
}

/* ============================== 工坊 6×5 = 96×80 ============================== */
export const WORKSHOP_W = 96;
export const WORKSHOP_H = 80;
export function workshopSprite(season: Season, night: boolean, frame = 0): Grid {
  const g = new Grid(WORKSHOP_W, WORKSHOP_H);
  const rnd = makeRng(6, 6, 1500);
  const RIDGE = 6;
  const EAVE = 26;
  const WX0 = 8;
  const WX1 = 71;
  const WBOT = 66;
  // 主屋砖墙
  bricks(g, WX0, WX1, EAVE + 1, WBOT, rnd);
  g.rect(WX0, WBOT + 1, WX1 - WX0 + 1, 2, st.dark);
  // 侧棚（右）：木板墙、单坡顶
  boards(g, 72, 92, 38, WBOT, rnd, { fill: wd.base, seam: wd.dark, hi: wd.light }, false);
  for (let y = 30; y <= 37; y++) for (let x = 70; x <= 95; x++) g.set(x, y, (y - 30) % 3 === 2 ? st.dark : (x + y) % 6 === 0 ? st.light : st.base);
  g.hline(70, 38, 26, wd.dark);
  // 主屋石板顶（青灰）
  shingles(g, RIDGE, EAVE, (y) => Math.round(16 - ((y - RIDGE) * 16) / (EAVE - RIDGE)), (y) => Math.round(63 + ((y - RIDGE) * 16) / (EAVE - RIDGE)), SHINGLE_SLATE, rnd);
  g.hline(15, RIDGE, 50, st.dark);
  g.hline(0, EAVE, 80, wd.dark);
  g.hline(0, EAVE + 1, 80, wd.base);
  for (let x = WX0; x <= WX1; x++) for (let d = 2; d <= 3; d++) if (g.get(x, EAVE + d) === br.base) g.set(x, EAVE + d, br.dark);
  // 高烟囱
  chimney(g, 20, 0, 16, 8);
  // 双开大门（木，铁箍）
  g.rect(30, 38, 22, WBOT - 38 + 1, wd.dark);
  g.rect(31, 39, 20, WBOT - 39 + 1, wd.base);
  g.vline(40, 39, WBOT - 39 + 1, wd.dark);
  g.vline(41, 39, WBOT - 39 + 1, wd.light);
  for (let y = 44; y <= WBOT; y += 8) { g.hline(31, y, 20, st.dark); g.set(31, y, st.base); g.set(50, y, st.base); }
  for (let i = 0; i < 6; i++) { g.set(33 + i, 41 + i, wd.dark); g.set(48 - i, 41 + i, wd.dark); }
  // 窗（一扇宽窗）
  win(g, 12, 40, 12, 9, night, { sill: true });
  win(g, 56, 40, 12, 9, night, { sill: true });
  // 炉口（傍晚发红光）
  g.rect(78, 50, 8, 8, st.dark);
  g.rect(79, 51, 6, 6, night ? br.light : ink.base);
  if (night) { g.rect(80, 52, 4, 4, gd.base); g.set(81, 53, gd.light); }
  g.hline(77, 49, 10, st.base);
  // 门口木料堆、铁砧、工具
  for (let i = 0; i < 3; i++) { g.rect(2 + i * 2, 60 + i * 4 - 8, 20, 3, wd.base); g.hline(2 + i * 2, 60 + i * 4 - 8, 20, wd.light); g.hline(2 + i * 2, 62 + i * 4 - 8, 20, wd.dark); }
  g.rect(74, 60, 10, 4, st.dark);
  g.rect(76, 64, 6, 4, st.base);
  g.hline(74, 60, 10, st.light);
  // 挂灯
  lamp(g, 26, 30, night);
  lamp(g, 54, 30, night);
  steps(g, 41, WBOT + 3, 22, 1, st);
  stonePath(g, 35, WBOT + 6, WORKSHOP_H - 1);
  if (night) {
    halo(g, 11, 39, 24, 49, wallish);
    halo(g, 55, 39, 68, 49, wallish);
    halo(g, 78, 50, 85, 57, wallish);
  }
  if (season === 'winter') for (let y = RIDGE; y <= EAVE; y += 3) for (let x = 0; x < 80; x++) { const c = g.get(x, y); if (c && (c === st.dark || c === st.base || c === st.light) && (x * 5 + y) % 4 !== 0) g.set(x, y, sn.light); }
  void frame;
  outlineAll(g);
  return g;
}

/* ============================== 星婆婆帐篷 5×4 = 80×64 ============================== */
export const TENT_W = 80;
export const TENT_H = 64;
export function tentSprite(season: Season, night: boolean, frame = 0): Grid {
  const g = new Grid(TENT_W, TENT_H);
  const pu = ramp('purple');
  // 圆锥帐：顶 (40,4)，底 y=52 x 6..73
  for (let y = 4; y <= 52; y++) {
    const half = Math.round(((y - 4) * 34) / 48);
    for (let x = 40 - half; x <= 39 + half; x++) {
      const stripe = Math.floor((x - 40 + half) / Math.max(3, half / 4)) % 2;
      let c = stripe === 0 ? pu.base : pu.dark;
      if (x < 40 - half / 2 && stripe === 0) c = pu.light; // 左侧受光
      if ((x + y) % 7 === 0 && stripe === 1) c = pu.base;
      g.set(x, y, c);
    }
  }
  // 门帘：中间掀开一半，露出暗色内部
  for (let y = 30; y <= 52; y++) {
    const half = Math.round(((y - 30) * 7) / 22) + 3;
    for (let x = 40 - half; x <= 39 + half; x++) g.set(x, y, ink.base);
  }
  for (let y = 32; y <= 52; y++) { g.set(40 - Math.round(((y - 30) * 7) / 22) - 3, y, pu.light); }
  // 顶饰：金穗
  g.rect(39, 1, 2, 4, gd.dark);
  g.set(39, 0, gd.base); g.set(40, 0, gd.base);
  g.set(38, 3, gd.light); g.set(41, 3, gd.light);
  // 帐布上的星星纹
  for (const [x, y] of [[22, 30], [56, 34], [30, 44], [50, 46], [40, 18]] as [number, number][]) { g.set(x, y, gd.light); g.set(x - 1, y, gd.dark); g.set(x + 1, y, gd.dark); g.set(x, y - 1, gd.dark); g.set(x, y + 1, gd.dark); }
  // 地毯边
  g.rect(20, 53, 40, 3, br.base);
  g.hline(20, 53, 40, br.light);
  g.hline(20, 55, 40, br.dark);
  // 水晶球在木架上（门口右）
  g.rect(52, 48, 6, 8, wd.base);
  g.vline(52, 48, 8, wd.light);
  g.vline(57, 48, 8, wd.dark);
  const ballC = night ? gd.light : ramp('water').light;
  for (let y = 41; y <= 47; y++) for (let x = 51; x <= 58; x++) if ((x - 54.5) ** 2 + (y - 44.5) ** 2 <= 12) g.set(x, y, night ? gd.base : ramp('water').base);
  g.set(53, 42, ballC); g.set(54, 42, ballC); g.set(53, 43, ballC);
  if (night) {
    for (let y = 38; y <= 50; y++) for (let x = 48; x <= 61; x++) {
      const d = (x - 54.5) ** 2 + (y - 44.5) ** 2;
      if (d > 12 && d <= 20 && !g.get(x, y)) g.set(x, y, gd.dark);
      else if (d > 20 && d <= 30 && !g.get(x, y) && (x + y) % 2 === 0) g.set(x, y, pu.light);
    }
  }
  // 黑猫（门口左），尾巴 2 帧
  const cat = frame % 2 === 0
    ? ['.O.O......', '.OOO......', 'OOOOOOOO..', 'OOOOOOOOO.', '.OO..OO.OO', '..........']
    : ['.O.O......', '.OOO......', 'OOOOOOOO.O', 'OOOOOOOOOO', '.OO..OO...', '..........'];
  g.paste(22, 50, cat, { O: ink.dark });
  g.set(23, 51, gd.base); g.set(25, 51, gd.base);
  // 挂灯笼
  lantern(g, 8, 44, night);
  // 小凳
  g.rect(12, 52, 6, 2, wd.base);
  g.rect(12, 54, 1, 3, wd.dark);
  g.rect(17, 54, 1, 3, wd.dark);
  // 蜡烛两支
  for (const x of [63, 67]) { g.rect(x, 52, 2, 4, pl.light); g.set(x, 51, night ? gd.light : gd.dark); }
  if (night) halo(g, 8, 44, 13, 50, (c) => !c || c === pu.base || c === pu.dark);
  if (season === 'winter') for (let y = 4; y <= 52; y += 4) for (let x = 6; x <= 73; x++) { const c = g.get(x, y); if (c && (c === pu.base || c === pu.dark || c === pu.light) && (x * 5 + y) % 4 !== 0) g.set(x, y, sn.light); }
  outlineAll(g, pu.outline);
  return g;
}

/* ============================== 广场：井 + 公告板 + 长凳 4×3 = 64×48 ============================== */
export const PLAZA_W = 64;
export const PLAZA_H = 48;
export function plazaSprite(season: Season, night: boolean, frame = 0): Grid {
  const g = new Grid(PLAZA_W, PLAZA_H);
  // 井：石圈 + 木架 + 小顶 + 桶
  for (let y = 30; y <= 44; y++) for (let x = 6; x <= 29; x++) {
    const d = ((x + 0.5 - 18) / 12) ** 2 + ((y + 0.5 - 40) / 5) ** 2;
    if (d <= 1) g.set(x, y, y < 33 ? st.light : (x + y) % 4 === 0 ? st.dark : st.base);
  }
  for (let y = 33; y <= 38; y++) for (let x = 10; x <= 25; x++) { const d = ((x + 0.5 - 18) / 8) ** 2 + ((y + 0.5 - 36) / 3) ** 2; if (d <= 1) g.set(x, y, ramp('water').dark); }
  g.set(14, 35, ramp('water').base);
  g.rect(7, 14, 3, 20, wd.base); g.vline(7, 14, 20, wd.light);
  g.rect(26, 14, 3, 20, wd.base); g.vline(28, 14, 20, wd.dark);
  g.rect(9, 20, 18, 2, wd.dark);
  for (let i = 0; i < 6; i++) { g.hline(11 - i * 2 + 6, 8 + i, 6 + i * 4, i % 2 ? SHINGLE_WOOD.a : SHINGLE_WOOD.top); }
  g.hline(5, 14, 26, wd.dark);
  g.rect(16, 22, 4, 5, wd.base); g.hline(16, 22, 4, wd.light); g.set(17, 21, wd.dark); g.set(18, 21, wd.dark);
  // 公告板
  g.rect(36, 12, 24, 16, wd.base);
  g.rect(36, 12, 24, 1, wd.light);
  g.rect(36, 27, 24, 1, wd.dark);
  g.rect(38, 14, 8, 6, pl.light); g.hline(39, 16, 6, ink.light); g.hline(39, 18, 4, ink.light);
  g.rect(48, 15, 10, 8, pl.base); g.hline(49, 17, 8, ink.light); g.hline(49, 19, 6, ink.light); g.hline(49, 21, 7, ink.light);
  g.rect(37, 28, 3, 12, wd.dark); g.rect(56, 28, 3, 12, wd.dark);
  for (let x = 34; x <= 61; x++) g.set(x, 11 - (Math.abs(x - 47.5) < 6 ? 2 : Math.abs(x - 47.5) < 10 ? 1 : 0), wd.dark);
  // 长凳
  g.rect(38, 42, 20, 2, wd.base); g.hline(38, 42, 20, wd.light); g.rect(40, 44, 2, 3, wd.dark); g.rect(54, 44, 2, 3, wd.dark);
  // 路灯（广场夜灯）
  g.rect(1, 20, 2, 26, st.dark); g.vline(1, 20, 26, st.base);
  g.rect(0, 45, 4, 3, st.dark);
  lamp(g, -1, 13, night);
  if (night) halo(g, -1, 13, 4, 19, (c) => !c);
  if (season === 'winter') { g.hline(6, 30, 24, sn.light); g.hline(36, 12, 24, sn.light); }
  void frame;
  outlineAll(g);
  return g;
}

/* ============================== 茶馆 4×4 = 64×64 ============================== */
export const TEAHOUSE_W = 64;
export const TEAHOUSE_H = 64;
export function teahouseSprite(season: Season, night: boolean, frame = 0): Grid {
  const g = new Grid(TEAHOUSE_W, TEAHOUSE_H);
  const rnd = makeRng(7, 7, 1600);
  // 四柱亭：柱 x 8,54，地台 y 46..50
  g.rect(4, 46, 56, 5, wd.base);
  for (let x = 4; x < 60; x += 6) g.vline(x, 46, 5, wd.dark);
  g.hline(4, 46, 56, wd.light);
  g.hline(4, 50, 56, wd.dark);
  for (const px of [8, 53]) { g.rect(px, 20, 3, 26, wd.base); g.vline(px, 20, 26, wd.light); g.vline(px + 2, 20, 26, wd.dark); }
  // 栏（左右两侧半高）
  for (const [x0, x1] of [[10, 22], [40, 52]] as [number, number][]) { g.hline(x0, 38, x1 - x0, wd.dark); for (let x = x0; x < x1; x += 3) g.vline(x, 39, 7, wd.base); }
  // 橙瓦顶（四坡，翘檐）
  shingles(g, 4, 20, (y) => Math.round(24 - ((y - 4) * 24) / 16), (y) => Math.round(39 + ((y - 4) * 24) / 16), SHINGLE_ORANGE, rnd);
  g.hline(23, 4, 18, br.dark);
  g.rect(30, 0, 4, 4, br.dark); g.set(31, 0, gd.base); g.set(32, 0, gd.base);
  g.hline(0, 20, 64, br.dark);
  g.hline(0, 21, 64, wd.base);
  for (const [x, dir] of [[0, 1], [63, -1]] as [number, number][]) { g.set(x, 19, br.dark); g.set(x, 18, br.dark); g.set(x + dir, 19, br.base); }
  // 幌子：白布垂旗 + 茶杯图样（杯身、把手、两缕热气）
  g.rect(26, 22, 12, 16, pl.light);
  g.vline(37, 22, 16, pl.dark);
  g.rect(28, 30, 6, 4, ink.base); g.hline(29, 34, 4, ink.base); g.set(34, 31, ink.base); g.set(35, 31, ink.base); g.set(35, 32, ink.base); g.set(34, 33, ink.base);
  g.rect(29, 31, 4, 2, pl.light); g.rect(29, 31, 4, 1, br.base);
  g.set(29, 27, ink.base); g.set(30, 26, ink.base); g.set(30, 28, ink.base); g.set(32, 26, ink.base); g.set(33, 27, ink.base); g.set(32, 28, ink.base);
  g.hline(25, 21, 14, wd.dark);
  // 两张矮桌 + 茶壶
  for (const tx of [12, 42]) {
    g.rect(tx, 41, 10, 2, wd.light); g.rect(tx + 1, 43, 8, 3, wd.base);
    g.rect(tx + 3, 38, 4, 3, st.base); g.set(tx + 2, 39, st.dark); g.set(tx + 7, 39, st.dark); g.set(tx + 4, 37, st.light);
  }
  // 灯笼两盏
  lantern(g, 12, 24, night);
  lantern(g, 46, 24, night);
  // 台阶
  steps(g, 32, 51, 14, 2);
  // 石桌旁小花
  const fc = flowerColors(season);
  if (fc.length) { g.set(2, 44, fc[0]); g.set(61, 44, fc[1]); g.set(2, 45, gr.dark); g.set(61, 45, gr.dark); }
  if (night) { halo(g, 12, 24, 17, 30, (c) => !c || c === wd.base); halo(g, 46, 24, 51, 30, (c) => !c || c === wd.base); }
  if (season === 'winter') for (let y = 4; y <= 20; y += 3) for (let x = 0; x < 64; x++) { const c = g.get(x, y); if (c && (c === br.light || c === br.base || c === gd.base) && (x * 5 + y) % 4 !== 0) g.set(x, y, sn.light); }
  void frame;
  outlineAll(g);
  return g;
}

/* ============================== 湖边小屋 5×5 = 80×80 ============================== */
export const LAKEHOUSE_W = 80;
export const LAKEHOUSE_H = 80;
export function lakehouseSprite(season: Season, night: boolean, frame = 0): Grid {
  const g = new Grid(LAKEHOUSE_W, LAKEHOUSE_H);
  const rnd = makeRng(8, 8, 1700);
  const fc = flowerColors(season);
  const WX0 = 10;
  const WX1 = 65;
  const WBOT = 60;
  // 木桩架空
  for (const px of [12, 30, 48, 63]) { g.rect(px, WBOT + 1, 3, 10, wd.dark); g.vline(px, WBOT + 1, 10, wd.base); }
  boards(g, WX0, WX1, 22, WBOT, rnd, { fill: wd.light, seam: wd.base, hi: pl.light });
  // 单坡粉瓦顶：左高右低
  shingles(g, 4, 21, (y) => Math.max(0, Math.round(6 - ((y - 4) * 6) / 17)), () => 75, SHINGLE_PINK, rnd);
  for (let y = 4; y <= 21; y++) for (let x = 0; x < 80; x++) if (g.get(x, y) && y < 4 + Math.round(((75 - x) * 6) / 75)) g.set(x, y, null);
  g.hline(0, 21, 76, wd.dark);
  g.hline(0, 22, 76, wd.base);
  for (let x = WX0; x <= WX1; x++) for (let d = 3; d <= 4; d++) if (g.get(x, 21 + d) === wd.light) g.set(x, 21 + d, wd.base);
  // 大窗（看湖）+ 小窗
  win(g, 16, 30, 16, 12, night, { sill: true, box: fc });
  win(g, 50, 32, 8, 8, night, { sill: true });
  // 门
  g.rect(37, 38, 10, WBOT - 38 + 1, wd.dark);
  g.rect(38, 39, 8, WBOT - 39 + 1, wd.base);
  g.hline(38, 39, 8, wd.light);
  glass(g, 40, 41, 4, 4, night);
  g.set(44, 50, gd.dark);
  lamp(g, 47, 40, night);
  // 门前平台 + 码头板向下延伸
  g.rect(6, WBOT + 1, 66, 4, wd.base);
  for (let x = 6; x < 72; x += 5) g.vline(x, WBOT + 1, 4, wd.dark);
  g.hline(6, WBOT + 1, 66, wd.light);
  g.rect(34, WBOT + 5, 16, LAKEHOUSE_H - WBOT - 5, wd.base);
  for (let y = WBOT + 5; y < LAKEHOUSE_H; y += 4) g.hline(34, y, 16, wd.dark);
  g.vline(34, WBOT + 5, LAKEHOUSE_H - WBOT - 5, wd.light);
  g.vline(49, WBOT + 5, LAKEHOUSE_H - WBOT - 5, wd.dark);
  // 双人小长凳、钓竿、花盆
  g.rect(14, 56, 14, 2, wd.base); g.hline(14, 56, 14, wd.light); g.rect(15, 58, 2, 3, wd.dark); g.rect(25, 58, 2, 3, wd.dark);
  for (let i = 0; i < 14; i++) g.set(66 + Math.round(i * 0.5), 60 - i, wd.dark);
  g.set(73, 46, ink.light);
  g.rect(56, 56, 6, 5, br.base); g.hline(56, 56, 6, br.light); g.rect(57, 53, 4, 3, gr.base); if (fc.length) { g.set(57, 53, fc[0]); g.set(59, 52, fc[2]); }
  if (night) { halo(g, 15, 29, 32, 42, wallish); halo(g, 49, 31, 58, 40, wallish); halo(g, 47, 40, 52, 46, wallish); for (let x = 30; x <= 54; x++) for (let y = WBOT + 1; y <= WBOT + 4; y++) if (g.get(x, y) === wd.base) g.set(x, y, wd.light); }
  if (season === 'winter') for (let y = 4; y <= 21; y += 3) for (let x = 0; x < 80; x++) { const c = g.get(x, y); if (c && (c === SHINGLE_PINK.a || c === SHINGLE_PINK.b || c === SHINGLE_PINK.top) && (x * 5 + y) % 4 !== 0) g.set(x, y, sn.light); }
  void frame;
  outlineAll(g);
  return g;
}

/* ============================== 村口牌坊 4×3 = 64×48 ============================== */
export const GATE_W = 64;
export const GATE_H = 48;
export function gateSprite(season: Season, night: boolean, frame = 0): Grid {
  const g = new Grid(GATE_W, GATE_H);
  // 两根立柱 + 横梁 + 小顶
  for (const px of [10, 50]) { g.rect(px, 12, 4, 30, wd.base); g.vline(px, 12, 30, wd.light); g.vline(px + 3, 12, 30, wd.dark); g.rect(px - 1, 40, 6, 4, st.base); g.hline(px - 1, 40, 6, st.light); }
  g.rect(6, 10, 52, 3, wd.dark);
  g.rect(8, 7, 48, 3, wd.base); g.hline(8, 7, 48, wd.light);
  for (let x = 4; x <= 59; x++) g.set(x, 5 - (x < 8 || x > 55 ? 1 : 0), br.dark);
  for (let x = 6; x <= 57; x++) g.set(x, 6, br.base);
  // 匾额「人情村」：三块字
  g.rect(20, 14, 24, 9, pl.light);
  g.rect(20, 14, 24, 1, pl.dark);
  g.rect(20, 22, 24, 1, pl.dark);
  g.vline(20, 14, 9, wd.dark); g.vline(43, 14, 9, wd.dark);
  // 人
  g.set(24, 16, ink.base); g.set(24, 17, ink.base); g.set(23, 18, ink.base); g.set(25, 18, ink.base); g.set(22, 19, ink.base); g.set(26, 19, ink.base); g.set(21, 20, ink.base); g.set(27, 20, ink.base);
  // 情 → 一颗心（字在 7 像素里画不出来，用心代替）
  const pk = ramp('pink');
  g.set(30, 16, pk.base); g.set(31, 16, pk.base); g.set(33, 16, pk.base); g.set(34, 16, pk.base);
  g.hline(29, 17, 7, pk.base); g.hline(29, 18, 7, pk.base); g.hline(30, 19, 5, pk.base); g.hline(31, 20, 3, pk.base); g.set(32, 21, pk.dark);
  g.set(30, 17, pk.light); g.set(31, 16, pk.light);
  g.hline(29, 18, 7, pk.base); g.set(29, 18, pk.dark); g.set(35, 18, pk.dark); g.set(30, 19, pk.dark); g.set(34, 19, pk.dark); g.set(31, 20, pk.dark); g.set(33, 20, pk.dark);
  // 村：木 + 寸
  g.vline(38, 16, 6, ink.base); g.hline(37, 17, 3, ink.base); g.set(37, 19, ink.base); g.set(39, 19, ink.base); g.set(36, 20, ink.base); g.set(40, 20, ink.base);
  g.hline(40, 17, 3, ink.base); g.vline(42, 16, 6, ink.base); g.set(41, 19, ink.base); g.set(41, 21, ink.base);
  // 石灯两盏
  for (const x of [1, 57]) {
    g.rect(x + 1, 30, 4, 10, st.base); g.vline(x + 1, 30, 10, st.light); g.vline(x + 4, 30, 10, st.dark);
    g.rect(x, 26, 6, 4, night ? gd.base : st.dark); g.rect(x + 2, 27, 2, 2, night ? gd.light : st.base);
    g.rect(x - 1, 25, 8, 1, st.dark); g.rect(x, 24, 6, 1, st.base); g.set(x + 2, 23, st.dark); g.set(x + 3, 23, st.dark);
    g.rect(x, 40, 6, 3, st.dark);
    if (night) halo(g, x, 26, x + 5, 29, (c) => !c);
  }
  // 三级石阶
  steps(g, 32, 39, 24, 3, st);
  // 路牌
  g.rect(53, 28, 8, 5, wd.base); g.hline(53, 28, 8, wd.light); g.set(61, 30, wd.dark); g.hline(55, 30, 4, ink.light);
  if (season === 'winter') { g.hline(6, 5, 52, sn.light); g.hline(4, 4, 56, sn.light); }
  void frame;
  outlineAll(g);
  return g;
}
