import { Grid } from '../painter';

const HEART_LEFT = [
  '........',
  '...OOO..',
  '..ORRRO.',
  '.ORHRRRO',
  '.ORHRRRR',
  '.ORRRRRR',
  '.ORRRRRR',
  '..ORRRRR',
  '..ODRRRR',
  '...ODRRR',
  '....ODRR',
  '.....ODR',
  '......OO',
  '........',
  '........',
  '........',
];

export type HeartState = 'full' | 'half' | 'empty';

const COLORS = {
  full: { O: '#7a1018', R: '#e6323c', H: '#ff8a8f', D: '#b0202a' },
  empty: { O: '#9c8c6c', R: null, H: null, D: null },
};

function build(state: HeartState): Grid {
  const g = new Grid(16, 16);
  const rightMap = state === 'full' ? COLORS.full : COLORS.empty;
  const leftMap = state === 'empty' ? COLORS.empty : COLORS.full;
  g.paste(0, 0, HEART_LEFT, leftMap);
  // 右半边：镜像后贴上
  const mirrored = HEART_LEFT.map((row) => row.split('').reverse().join(''));
  g.paste(8, 0, mirrored, rightMap);
  if (state === 'half') {
    // 半心：中线补一条暗色分界，右半空心
    for (let y = 2; y <= 12; y++) if (g.get(8, y) === null) g.set(8, y, '#9c8c6c');
  }
  return g;
}

export const HEART: Record<HeartState, Grid> = {
  full: build('full'),
  half: build('half'),
  empty: build('empty'),
};

/** 小号 8×8 心，用于列表 / 标签 */
export const HEART_SMALL = new Grid(8, 8).paste(
  0,
  0,
  ['.OO..OO.', 'ORROORRO', 'ORRRRRRO', 'ORRRRRRO', '.ORRRRO.', '..ORRO..', '...OO...', '........'],
  { O: '#7a1018', R: '#e6323c' },
);
