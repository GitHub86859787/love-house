/**
 * 第 5 类 · 角色验收视图：
 *  1. 1× 辨识：随机 12 人 1× 排一行（下方同一批 3× 对照）
 *  2. 头像一致：随机 8 人，头像与小人并排
 *  3. 动画分解：一个人 待机 4 帧 + 行走 4 帧 × 四朝向
 *  4. 特殊：星婆婆 + 黑猫、「我」、灰化剪影、满心金星
 */
import { useMemo } from 'react';
import { Grid } from '@/pixel/painter';
import type { AvatarConfig } from '@/db/types';
import { buildAvatar, DEFAULT_AVATAR, randomAvatar } from '@/pixel/avatar/build';
import { fortuneTellerAvatar } from '@/features/fortune/teller';
import { grassAt } from '../sprites/ground';
import { TILE } from '../sprites/tile';
import { CHAR_FRAMES, CHAR_H, CHAR_W, catSprite, charSprite, ghostSprite, starSprite, stoolSprite, type Dir } from '../sprites/chars/char';
import { Px } from './Px';
import styles from './PreviewPage.module.css';

/** 固定种子的随机人，保证每次截图一样 */
export function samplePeople(n: number, salt = 0): AvatarConfig[] {
  const out: AvatarConfig[] = [];
  for (let i = 0; i < n; i++) out.push(randomAvatar(i % 4 === 3 ? 'family' : 'friend', ((i + 1) * 0.6180339887 + salt * 0.1) % 1));
  return out;
}

function grassBg(cols: number, rows: number, salt = 0): Grid {
  const g = new Grid(cols * TILE, rows * TILE);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) g.compose(grassAt('spring', x + 60 + salt, y + 60), x * TILE, y * TILE);
  return g;
}

/** 一排人站在草地上：每人占 1 tile 宽、2 tile 高（脚踩下格，头压上格） */
function rowOnGrass(people: AvatarConfig[], frame: number, dir: Dir = 'down', gapTiles = 1): Grid {
  const cols = people.length * (1 + gapTiles) + gapTiles;
  const g = grassBg(cols, 3);
  people.forEach((p, i) => g.compose(charSprite(p, dir, 'idle', frame), (gapTiles + i * (1 + gapTiles)) * TILE, TILE - 8));
  return g;
}

function matchPairs(people: AvatarConfig[], frame: number): Grid {
  const pairW = 24 + 4 + CHAR_W + 12;
  const g = new Grid(people.length * pairW + 4, 32);
  people.forEach((p, i) => {
    const x = 4 + i * pairW;
    g.compose(buildAvatar(p), x, 4);
    g.compose(charSprite(p, 'down', 'idle', frame), x + 28, 4);
  });
  return g;
}

function animSheet(p: AvatarConfig): Grid {
  const dirs: Dir[] = ['down', 'left', 'right', 'up'];
  const cell = CHAR_W + 4;
  const g = grassBg(Math.ceil(((CHAR_FRAMES * 2 + 1) * cell + 8) / TILE), Math.ceil((dirs.length * (CHAR_H + 6) + 6) / TILE), 3);
  dirs.forEach((d, r) => {
    const y = 6 + r * (CHAR_H + 6);
    for (let f = 0; f < CHAR_FRAMES; f++) g.compose(charSprite(p, d, 'idle', f), 4 + f * cell, y);
    for (let f = 0; f < CHAR_FRAMES; f++) g.compose(charSprite(p, d, 'walk', f), 4 + (CHAR_FRAMES + 1 + f) * cell, y);
  });
  return g;
}

function specialSheet(frame: number): Grid {
  const g = grassBg(11, 3, 7);
  // 星婆婆坐小凳 + 黑猫
  g.compose(charSprite(fortuneTellerAvatar, 'down', 'sit', frame), 8, TILE - 8);
  g.compose(stoolSprite(), 9, TILE + 11);
  g.compose(catSprite(frame, 'l'), 26, TILE + 8);
  // 我
  g.compose(charSprite(DEFAULT_AVATAR, 'down', 'idle', frame), 56, TILE - 8);
  // 灰化
  g.compose(ghostSprite(samplePeople(1, 5)[0], frame), 88, TILE - 16);
  // 满心：两帧星星
  const full = samplePeople(1, 9)[0];
  g.compose(charSprite(full, 'down', 'idle', frame), 120, TILE - 8);
  g.compose(starSprite(0), 124, 0);
  g.compose(charSprite(full, 'down', 'idle', frame), 150, TILE - 8);
  g.compose(starSprite(1), 154, 0);
  return g;
}

export function CharSheet({ scale, frame }: { scale: 1 | 3; frame: number }) {
  const twelve = useMemo(() => samplePeople(12), []);
  const eight = useMemo(() => samplePeople(8, 2), []);
  const one = useMemo<AvatarConfig>(() => ({ face: 0, skinColor: '#e2a978', hair: 1, hairColor: '#5c3a1e', eyes: 0, eyeColor: '#2b1d14', shirt: 0, shirtColor: '#e6323c', accessory: 0, accessoryColor: '#3b2412', feature: 0, featureColor: '#3b2412' }), []);
  const row1 = useMemo(() => rowOnGrass(twelve, frame), [twelve, frame]);
  const pairs = useMemo(() => matchPairs(eight, frame), [eight, frame]);
  const anim = useMemo(() => animSheet(one), [one]);
  const special = useMemo(() => specialSheet(frame), [frame]);
  return (
    <div className={styles.sheet} data-shot="sheet">
      <p className={styles.note}>1× 辨识：随机 12 人，上排 1×，下排同一批 3×。要能分出每个人的发型和衣服颜色。</p>
      <div className={styles.demo} data-shot="ident">
        <div>
          <Px grid={row1} scale={1} />
        </div>
        <div style={{ marginTop: 8 }}>
          <Px grid={row1} scale={3} />
        </div>
      </div>
      <p className={styles.note}>头像一致：随机 8 人，左头像 / 右小人（{scale}×）</p>
      <div className={styles.demo} data-shot="match" style={{ background: 'var(--paper, #f3ead8)' }}>
        <Px grid={pairs} scale={scale} />
      </div>
      <p className={styles.note}>动画分解：一个人 · 每排一个朝向（下 / 左 / 右 / 上）· 左 4 帧待机、右 4 帧行走</p>
      <div className={styles.demo} data-shot="anim">
        <Px grid={anim} scale={scale} />
      </div>
      <p className={styles.note}>特殊：星婆婆坐小凳 + 黑猫甩尾 · 「我」 · 灰化剪影（棋盘抖动 + …气泡） · 满心金星两帧</p>
      <div className={styles.demo} data-shot="special">
        <Px grid={special} scale={scale} />
      </div>
    </div>
  );
}
