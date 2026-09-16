/**
 * 拼装式像素头像：24×24 网格，五类部件（脸型 / 发型 / 眼睛 / 上衣 / 配饰），
 * 每个部件都是一个"画法"函数，接收基础色，阴影 / 高光自动派生，因此每个部件都能独立换色。
 */
import { Grid } from '../painter';
import { shade, tint } from '@/lib/color';

export const AVATAR_SIZE = 24;
const INK = '#3b2412';

export interface PartDef {
  name: string;
  draw: (g: Grid, color: string) => void;
}

/* ------------------------------ 脸型（肤色为颜色） ------------------------------ */
export const FACES: PartDef[] = [
  {
    name: '圆脸',
    draw: (g, c) => {
      g.ellipse(11.5, 10, 6.5, 6.5, c);
      g.rect(7, 15, 10, 1, shade(c, 0.15));
      neck(g, c);
    },
  },
  {
    name: '鹅蛋脸',
    draw: (g, c) => {
      g.ellipse(11.5, 10, 5.5, 7, c);
      g.rect(8, 16, 8, 1, shade(c, 0.15));
      neck(g, c);
    },
  },
  {
    name: '方脸',
    draw: (g, c) => {
      g.rect(5, 4, 14, 12, c);
      g.rect(6, 16, 12, 1, c);
      g.rect(6, 16, 12, 1, shade(c, 0.15));
      neck(g, c);
    },
  },
  {
    name: '婴儿肥',
    draw: (g, c) => {
      g.ellipse(11.5, 9, 6, 6, c);
      g.ellipse(11.5, 12, 7, 4.5, c);
      g.rect(6, 16, 12, 1, shade(c, 0.15));
      neck(g, c);
    },
  },
  {
    name: '尖下巴',
    draw: (g, c) => {
      g.ellipse(11.5, 9, 6.5, 6, c);
      g.rect(8, 14, 8, 1, c).rect(9, 15, 6, 1, c).rect(10, 16, 4, 1, c);
      g.rect(10, 16, 4, 1, shade(c, 0.15));
      neck(g, c);
    },
  },
  {
    name: '长脸',
    draw: (g, c) => {
      g.rect(6, 4, 12, 13, c);
      g.rect(7, 17, 10, 1, c);
      g.rect(7, 17, 10, 1, shade(c, 0.15));
      neck(g, c);
    },
  },
];

function neck(g: Grid, c: string) {
  g.rect(10, 16, 4, 3, shade(c, 0.1));
}

/* ------------------------------ 发型 ------------------------------ */
export const HAIRS: PartDef[] = [
  {
    name: '短发',
    draw: (g, c) => {
      g.ellipse(11.5, 6, 7, 4, c);
      g.rect(5, 6, 14, 2, c);
      g.rect(5, 8, 2, 3, c).rect(17, 8, 2, 3, c);
      g.hline(7, 3, 4, tint(c, 0.25));
    },
  },
  {
    name: '波波头',
    draw: (g, c) => {
      g.ellipse(11.5, 6, 7.5, 4.5, c);
      g.rect(4, 6, 16, 3, c);
      g.rect(4, 9, 3, 6, c).rect(17, 9, 3, 6, c);
      g.rect(5, 15, 2, 1, shade(c, 0.2)).rect(17, 15, 2, 1, shade(c, 0.2));
      g.hline(6, 3, 5, tint(c, 0.25));
    },
  },
  {
    name: '长直发',
    draw: (g, c) => {
      g.ellipse(11.5, 6, 7.5, 4.5, c);
      g.rect(4, 6, 16, 3, c);
      g.rect(3, 9, 3, 12, c).rect(18, 9, 3, 12, c);
      g.rect(3, 20, 3, 1, shade(c, 0.2)).rect(18, 20, 3, 1, shade(c, 0.2));
      g.hline(7, 3, 3, tint(c, 0.25));
    },
  },
  {
    name: '丸子头',
    draw: (g, c) => {
      g.ellipse(11.5, 6, 7, 4, c);
      g.rect(5, 6, 14, 2, c);
      g.rect(5, 8, 2, 2, c).rect(17, 8, 2, 2, c);
      g.ellipse(11.5, 1.5, 3, 2, c);
      g.set(10, 0, tint(c, 0.3));
      g.hline(8, 3, 3, tint(c, 0.25));
    },
  },
  {
    name: '刺刺头',
    draw: (g, c) => {
      g.rect(5, 5, 14, 3, c);
      g.rect(5, 8, 2, 2, c).rect(17, 8, 2, 2, c);
      const spikes = [5, 8, 11, 14, 17];
      spikes.forEach((x, i) => {
        g.rect(x, 3, 2, 2, c);
        g.set(x + (i % 2), 1 + (i % 2), c);
        g.set(x + (i % 2), 2, c);
      });
      g.hline(9, 5, 3, tint(c, 0.25));
    },
  },
  {
    name: '寸头',
    draw: (g, c) => {
      g.ellipse(11.5, 6, 6.5, 3.5, c);
      g.rect(6, 6, 12, 1, c);
      g.set(9, 4, tint(c, 0.2));
    },
  },
  {
    name: '卷发',
    draw: (g, c) => {
      g.ellipse(11.5, 6, 8, 5, c);
      g.rect(3, 6, 18, 4, c);
      g.rect(3, 10, 3, 4, c).rect(18, 10, 3, 4, c);
      // 卷：交错的凸点
      [3, 6, 9, 12, 15, 18].forEach((x, i) => g.set(x + 1, i % 2 === 0 ? 1 : 2, c));
      g.set(4, 14, c).set(19, 14, c);
      g.set(6, 3, tint(c, 0.25)).set(9, 2, tint(c, 0.25)).set(14, 2, tint(c, 0.25));
    },
  },
  {
    name: '中分',
    draw: (g, c) => {
      g.ellipse(11.5, 6, 7.5, 4.5, c);
      g.rect(4, 6, 16, 2, c);
      g.rect(4, 8, 3, 5, c).rect(17, 8, 3, 5, c);
      // 中分露出的额头
      g.rect(11, 3, 2, 5, null);
      g.rect(10, 7, 4, 1, null);
      g.hline(6, 3, 3, tint(c, 0.25)).hline(15, 3, 3, tint(c, 0.25));
    },
  },
];

/* ------------------------------ 眼睛（颜色为瞳色） ------------------------------ */
export const EYES: PartDef[] = [
  {
    name: '圆眼',
    draw: (g, c) => {
      g.rect(8, 9, 2, 2, c).rect(14, 9, 2, 2, c);
      g.set(8, 9, tint(c, 0.6)).set(14, 9, tint(c, 0.6));
      mouth(g);
    },
  },
  {
    name: '大眼',
    draw: (g, c) => {
      g.rect(7, 8, 3, 3, '#fff8e7').rect(14, 8, 3, 3, '#fff8e7');
      g.rect(8, 9, 2, 2, c).rect(15, 9, 2, 2, c);
      g.set(8, 9, tint(c, 0.6)).set(15, 9, tint(c, 0.6));
      mouth(g);
    },
  },
  {
    name: '眯眯眼',
    draw: (g, c) => {
      g.rect(7, 10, 3, 1, c).rect(14, 10, 3, 1, c);
      g.set(8, 12, '#3b2412').set(15, 12, '#3b2412');
      g.rect(10, 13, 4, 1, '#3b2412');
    },
  },
  {
    name: '笑眼',
    draw: (g, c) => {
      g.paste(7, 9, ['.##', '#..'], { '#': c });
      g.paste(14, 9, ['##.', '..#'], { '#': c });
      g.rect(10, 13, 4, 1, '#3b2412').set(9, 12, '#3b2412').set(14, 12, '#3b2412');
      blush(g);
    },
  },
  {
    name: '单边眨眼',
    draw: (g, c) => {
      g.rect(8, 9, 2, 2, c).set(8, 9, tint(c, 0.6));
      g.rect(14, 10, 3, 1, c);
      mouth(g);
    },
  },
  {
    name: '星星眼',
    draw: (g, c) => {
      g.paste(7, 8, ['.#.', '###', '.#.'], { '#': c });
      g.paste(14, 8, ['.#.', '###', '.#.'], { '#': c });
      g.set(8, 9, tint(c, 0.7)).set(15, 9, tint(c, 0.7));
      g.rect(10, 13, 4, 1, '#3b2412').set(10, 12, '#3b2412').set(13, 12, '#3b2412');
    },
  },
];

function mouth(g: Grid) {
  g.rect(11, 13, 2, 1, '#3b2412');
}

function blush(g: Grid) {
  g.set(7, 12, '#f0a0a0').set(16, 12, '#f0a0a0');
}

/* ------------------------------ 上衣 ------------------------------ */
export const SHIRTS: PartDef[] = [
  {
    name: '圆领衫',
    draw: (g, c) => {
      shoulders(g, c);
      g.rect(9, 18, 6, 1, shade(c, 0.3));
    },
  },
  {
    name: '衬衫',
    draw: (g, c) => {
      shoulders(g, c);
      g.rect(8, 18, 2, 2, '#fff8e7').rect(14, 18, 2, 2, '#fff8e7');
      g.vline(11, 19, 5, shade(c, 0.35));
      g.set(12, 20, '#fff8e7').set(12, 22, '#fff8e7');
    },
  },
  {
    name: 'V 领',
    draw: (g, c) => {
      shoulders(g, c);
      g.rect(10, 18, 4, 1, null).rect(11, 19, 2, 1, null);
      g.rect(10, 18, 1, 1, shade(c, 0.3)).rect(13, 18, 1, 1, shade(c, 0.3));
    },
  },
  {
    name: '条纹衫',
    draw: (g, c) => {
      shoulders(g, c);
      g.rect(3, 20, 18, 1, tint(c, 0.45)).rect(3, 22, 18, 1, tint(c, 0.45));
    },
  },
  {
    name: '背带裤',
    draw: (g, c) => {
      shoulders(g, '#fff8e7');
      g.rect(7, 18, 2, 6, c).rect(15, 18, 2, 6, c);
      g.rect(6, 22, 12, 2, c);
      g.set(7, 19, '#f5c542').set(16, 19, '#f5c542');
    },
  },
  {
    name: '连帽衫',
    draw: (g, c) => {
      shoulders(g, c);
      g.rect(6, 17, 3, 2, shade(c, 0.2)).rect(15, 17, 3, 2, shade(c, 0.2));
      g.rect(9, 18, 6, 1, shade(c, 0.3));
      g.vline(11, 20, 3, '#fff8e7').vline(12, 20, 3, '#fff8e7');
    },
  },
];

function shoulders(g: Grid, c: string) {
  g.rect(3, 19, 18, 5, c);
  g.rect(5, 18, 14, 1, c);
  g.rect(3, 23, 18, 1, shade(c, 0.2));
  g.rect(3, 19, 1, 5, shade(c, 0.15)).rect(20, 19, 1, 5, shade(c, 0.15));
}

/* ------------------------------ 配饰（画在最上层） ------------------------------ */
export const ACCESSORIES: PartDef[] = [
  { name: '无', draw: () => {} },
  {
    name: '眼镜',
    draw: (g, c) => {
      g.rect(6, 8, 5, 4, c).rect(7, 9, 3, 2, null);
      g.rect(13, 8, 5, 4, c).rect(14, 9, 3, 2, null);
      g.rect(11, 9, 2, 1, c);
    },
  },
  {
    name: '鸭舌帽',
    draw: (g, c) => {
      g.rect(4, 3, 16, 3, c);
      g.ellipse(11.5, 3, 7, 2.5, c);
      g.rect(2, 5, 8, 1, shade(c, 0.25));
      g.rect(4, 1, 16, 1, null);
      g.hline(7, 1, 4, tint(c, 0.2));
    },
  },
  {
    name: '发带',
    draw: (g, c) => {
      g.rect(5, 6, 14, 2, c);
      g.set(17, 5, c).set(18, 5, c).set(19, 6, c).set(20, 7, c);
    },
  },
  {
    name: '耳环',
    draw: (g, c) => {
      g.set(4, 12, c).set(4, 13, c).set(19, 12, c).set(19, 13, c);
    },
  },
  {
    name: '小花',
    draw: (g, c) => {
      g.paste(15, 3, ['.#.', '###', '.#.'], { '#': c });
      g.set(16, 4, '#f5c542');
    },
  },
  {
    name: '围巾',
    draw: (g, c) => {
      g.rect(7, 16, 10, 3, c);
      g.rect(14, 19, 3, 4, c).rect(14, 22, 3, 1, shade(c, 0.25));
      g.rect(7, 18, 10, 1, shade(c, 0.2));
    },
  },
  {
    name: '毛线帽',
    draw: (g, c) => {
      g.ellipse(11.5, 4, 7.5, 3.5, c);
      g.rect(4, 5, 16, 3, c);
      g.rect(4, 7, 16, 1, shade(c, 0.25));
      g.rect(10, 0, 4, 2, tint(c, 0.4));
      g.set(7, 3, tint(c, 0.25));
    },
  },
];

/* ------------------------------ 预设色板 ------------------------------ */
export const SKIN_COLORS = ['#f8d9b8', '#f2c49a', '#e2a978', '#c98b5e', '#a86d43', '#7a4a2a'];
export const HAIR_COLORS = ['#2b1d14', '#5c3a1e', '#8b5a2b', '#c98b45', '#e8c170', '#a8323c', '#4a6fa5', '#8a8a8a'];
export const EYE_COLORS = ['#2b1d14', '#5c3a1e', '#3a6b35', '#3b5fa0', '#7a4a8a', '#8a8a8a'];
export const SHIRT_COLORS = ['#6daa2c', '#6fb7e8', '#e6323c', '#f5c542', '#e0883a', '#7a4a8a', '#3b5fa0', '#fff8e7'];
export const ACCESSORY_COLORS = ['#3b2412', '#e6323c', '#f5c542', '#6fb7e8', '#d95d78', '#6daa2c', '#fff8e7', '#8a8a8a'];

export const PART_GROUPS = {
  face: { label: '脸型', colorLabel: '肤色', parts: FACES, colors: SKIN_COLORS },
  hair: { label: '发型', colorLabel: '发色', parts: HAIRS, colors: HAIR_COLORS },
  eyes: { label: '眼睛', colorLabel: '瞳色', parts: EYES, colors: EYE_COLORS },
  shirt: { label: '上衣', colorLabel: '衣色', parts: SHIRTS, colors: SHIRT_COLORS },
  accessory: { label: '配饰', colorLabel: '配饰色', parts: ACCESSORIES, colors: ACCESSORY_COLORS },
} as const;

export type PartKey = keyof typeof PART_GROUPS;
export const PART_KEYS: PartKey[] = ['face', 'hair', 'eyes', 'shirt', 'accessory'];

export { INK };
