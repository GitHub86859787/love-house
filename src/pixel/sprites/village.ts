import { Grid } from '../painter';


/** 占卜屋内景用的三个小件（村庄场景已改为 canvas，旧的房子 / 树 / 牌坊都删了） */
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
