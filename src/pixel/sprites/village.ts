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
