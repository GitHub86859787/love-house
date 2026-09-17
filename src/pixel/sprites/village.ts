import { Grid } from '../painter';
import { shade, tint } from '@/lib/color';

const INK = '#3b2412';

/** 32×32 小房子，屋顶按关系类型换色；金边表示满心 */
export function house(roofColor: string, golden = false): Grid {
  const g = new Grid(32, 32);
  const wall = '#f4e4bc';
  const wallShade = '#e8d5a3';
  const roof = roofColor;
  const roofDark = shade(roofColor, 0.3);
  const roofLight = tint(roofColor, 0.25);
  const wood = '#8b5a2b';
  const woodDark = '#5c3a1e';
  const glass = '#6fb7e8';
  const glassLight = '#b6e0f7';

  // 墙体
  g.rect(5, 15, 22, 15, wall);
  g.rect(5, 26, 22, 4, wallShade);
  // 屋顶（三角）
  for (let y = 0; y < 12; y++) {
    const half = y + 2;
    g.hline(16 - half, 4 + y, half * 2, y < 3 ? roofLight : roof);
  }
  g.hline(2, 15, 28, roofDark);
  g.hline(3, 14, 26, roofDark);
  // 烟囱
  g.rect(22, 3, 4, 7, wood).rect(22, 3, 4, 1, woodDark);
  // 门
  g.rect(13, 20, 6, 10, wood).rect(13, 20, 6, 1, woodDark).set(17, 25, '#f5c542');
  // 窗
  g.rect(7, 18, 5, 5, glass).rect(8, 19, 1, 1, glassLight).rect(20, 18, 5, 5, glass).rect(21, 19, 1, 1, glassLight);
  g.rect(6, 17, 7, 1, woodDark).rect(19, 17, 7, 1, woodDark);
  g.rect(6, 23, 7, 1, woodDark).rect(19, 23, 7, 1, woodDark);
  // 描边
  g.outline(golden ? '#b8891c' : INK);
  if (golden) {
    // 金边房子多一层金色装饰
    for (let k = 0; k < g.data.length; k++) if (g.data[k] === '#b8891c') g.data[k] = '#f5c542';
  }
  return g;
}

/** 村口牌子 24×32 */
export const GATE = (() => {
  const g = new Grid(24, 32);
  const wood = '#8b5a2b';
  const dark = '#5c3a1e';
  g.rect(2, 6, 3, 24, wood).rect(19, 6, 3, 24, wood);
  g.rect(2, 6, 3, 1, dark).rect(19, 6, 3, 1, dark);
  g.rect(0, 8, 24, 8, '#c98b45').rect(0, 8, 24, 1, '#e0a960').rect(0, 15, 24, 1, dark);
  // 牌子上的小像素字：两个方块示意
  g.rect(5, 10, 5, 4, dark).rect(6, 11, 3, 2, '#c98b45');
  g.rect(14, 10, 5, 4, dark).rect(15, 11, 3, 2, '#c98b45');
  g.outline('#3b2412');
  return g;
})();

/** 树 16×24，可换叶子颜色（四季） */
export function tree(leaf: string): Grid {
  const g = new Grid(16, 24);
  const leafDark = shade(leaf, 0.25);
  const leafLight = tint(leaf, 0.25);
  g.rect(6, 16, 4, 8, '#8b5a2b').rect(6, 16, 1, 8, '#5c3a1e');
  g.ellipse(7.5, 9, 7, 7, leaf);
  g.ellipse(7.5, 6, 4, 4, leafLight);
  g.rect(3, 13, 10, 3, leafDark);
  g.set(4, 5, leafLight).set(10, 11, leafDark).set(11, 8, leafDark);
  g.outline('#3b2412');
  return g;
}

/** 小灌木 12×8 */
export function bush(leaf: string): Grid {
  const g = new Grid(12, 8);
  g.ellipse(5.5, 4.5, 5, 3, leaf);
  g.ellipse(4, 3, 2, 1.5, tint(leaf, 0.3));
  g.outline('#3b2412');
  return g;
}

/** 问号气泡 16×16（久未联系） */
export const QUESTION_BUBBLE = (() => {
  const g = new Grid(16, 16);
  g.rect(1, 1, 14, 11, '#fff8e7');
  g.rect(3, 12, 3, 1, '#fff8e7').rect(3, 13, 2, 1, '#fff8e7').rect(3, 14, 1, 1, '#fff8e7');
  g.paste(4, 2, ['.####..', '##..##.', '....##.', '...##..', '..##...', '..##...', '.......', '..##...', '..##...'], {
    '#': '#3b2412',
  });
  g.outline('#3b2412');
  return g;
})();

/** 占卜师的帐篷 40×40：紫色帐篷、门口灯笼和水晶球 */
export const TENT = (() => {
  const g = new Grid(40, 40);
  const purple = '#6b3fa0';
  const purpleDark = '#4a2a73';
  const purpleLight = '#9a6fd0';
  const gold = '#f5c542';
  // 帐篷主体（圆顶 + 梯形）
  for (let y = 0; y < 30; y++) {
    const half = Math.round(4 + (y / 29) * 15);
    g.hline(20 - half, 8 + y, half * 2, y % 6 < 3 ? purple : purpleDark);
  }
  g.ellipse(19.5, 9, 5, 4, purpleLight);
  // 顶端小旗
  g.vline(20, 1, 6, '#8b5a2b').rect(21, 1, 5, 3, gold).set(25, 2, gold);
  // 门（暗色）
  g.rect(15, 24, 10, 14, '#2b1740');
  for (let y = 24; y < 38; y++) g.hline(15, y, 10, y % 2 ? '#2b1740' : '#3a2058');
  // 门帘边
  g.vline(14, 22, 16, purpleLight).vline(25, 22, 16, purpleLight);
  // 灯笼
  g.vline(6, 18, 4, '#8b5a2b').rect(4, 22, 5, 6, '#e6323c').rect(5, 23, 3, 4, '#ff8a4c').set(6, 28, gold);
  // 水晶球（门口小桌）
  g.rect(28, 32, 8, 2, '#8b5a2b').rect(29, 34, 6, 4, '#5c3a1e');
  g.ellipse(31.5, 29, 3, 3, '#6fb7e8').set(30, 27, '#ffffff').set(31, 28, '#b6e0f7');
  // 星星装饰
  g.set(10, 12, gold).set(29, 14, gold).set(17, 5, gold).set(20, 16, gold);
  g.outline('#3b2412');
  return g;
})();

/** 「我的家」小房子上的牌子（16×8） */
export const HOME_SIGN = (() => {
  const g = new Grid(16, 8);
  g.rect(0, 0, 16, 6, '#f5c542').rect(1, 1, 14, 4, '#fff8e7');
  g.rect(3, 2, 3, 2, '#3b2412').rect(7, 2, 2, 2, '#3b2412').rect(10, 2, 3, 2, '#3b2412');
  g.vline(3, 6, 2, '#8b5a2b').vline(12, 6, 2, '#8b5a2b');
  g.outline('#3b2412');
  return g;
})();

/** 黑猫 16×12（占卜屋装饰） */
export const CAT = (() => {
  const g = new Grid(16, 12);
  const k = '#1c1c24';
  g.ellipse(8, 8, 6, 3.5, k);
  g.ellipse(4, 5, 3, 3, k);
  g.set(2, 2, k).set(5, 2, k).set(1, 3, k).set(6, 3, k);
  g.set(3, 5, '#f5c542').set(5, 5, '#f5c542');
  g.hline(12, 4, 3, k).vline(14, 2, 3, k);
  g.outline('#3b2412');
  return g;
})();

/** 水晶球 24×24（占卜屋桌上） */
export const CRYSTAL_BALL = (() => {
  const g = new Grid(24, 24);
  g.rect(6, 19, 12, 2, '#8b5a2b').rect(8, 21, 8, 3, '#5c3a1e');
  g.ellipse(11.5, 10, 8.5, 8.5, '#6fb7e8');
  g.ellipse(9, 7, 3, 2.5, '#b6e0f7');
  g.set(7, 5, '#ffffff').set(8, 5, '#ffffff');
  g.ellipse(13, 13, 3, 2, '#5d7fa3');
  g.set(15, 8, '#f5c542').set(9, 14, '#f5c542');
  g.outline('#3b2412');
  return g;
})();

/** 蜡烛 8×16 */
export const CANDLE = (() => {
  const g = new Grid(8, 16);
  g.rect(2, 6, 4, 8, '#fff8e7').rect(2, 6, 1, 8, '#e8d5a3');
  g.rect(1, 14, 6, 2, '#8b5a2b');
  g.rect(3, 2, 2, 4, '#f5c542').set(3, 1, '#ff8a4c').set(4, 0, '#e6323c');
  g.outline('#3b2412');
  return g;
})();
