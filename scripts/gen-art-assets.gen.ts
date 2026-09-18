/**
 * 用新美术生成 PWA 图标与 iOS 启动画面（在 vitest 里跑，能直接用 TS 精灵）：
 *   npx vitest run --config vitest.gen.config.ts
 * 图标：老宅正面 + 木框（128 基底 → 192 / 512 / 180）
 * 启动画面：羊皮纸底 + 白天春景全村缩略（木框）+ 底部深木色条
 */
import { it } from 'vitest';
import { PNG } from 'pngjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { Grid } from '@/pixel/painter';
import { hexToRgb } from '@/lib/color';
import { grassAt } from '@/features/village/sprites/ground';
import { BUILDINGS } from '@/features/village/sprites/buildings';
import { buildingsGrid, decorGrid, groundGrid, treesGrid, waterGrid } from '@/features/village/renderer/layers';
import { MAP_H, MAP_W } from '@/features/village/layout';
import { TILE } from '@/features/village/sprites/tile';

const W = '#5c3a1e', L = '#8b5a2b', P = '#f4e4bc', D = '#e8d5a3';

function framed(inner: Grid, border = 6): Grid {
  const g = new Grid(inner.w + border * 2, inner.h + border * 2);
  g.rect(0, 0, g.w, g.h, W);
  g.rect(3, 3, g.w - 6, g.h - 6, L);
  g.rect(5, 5, g.w - 10, g.h - 10, D);
  g.compose(inner, border, border);
  // 像素圆角
  for (const [x, y] of [[0, 0], [1, 0], [0, 1], [g.w - 1, 0], [g.w - 2, 0], [g.w - 1, 1], [0, g.h - 1], [1, g.h - 1], [0, g.h - 2], [g.w - 1, g.h - 1], [g.w - 2, g.h - 1], [g.w - 1, g.h - 2]]) g.set(x, y, null);
  return g;
}

function iconGrid(): Grid {
  const inner = new Grid(116, 116);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) inner.compose(grassAt('spring', x + 5, y + 5), x * TILE, y * TILE);
  const house = BUILDINGS[0].draw('spring', false, 0); // 96×112
  inner.compose(house, 10, 2);
  return framed(inner, 6); // 128×128
}

function villageGrid(): Grid {
  const g = new Grid(MAP_W, MAP_H);
  g.compose(groundGrid('spring'));
  g.compose(waterGrid('spring', 0));
  g.compose(decorGrid('spring', false));
  g.compose(buildingsGrid('spring', false));
  g.compose(treesGrid('spring', 0));
  return g;
}

/** 把 Grid 按最近邻放大 / 缩放到目标尺寸并写 PNG（透明像素用 bg 填） */
function writePng(path: string, g: Grid, outW: number, outH: number, bg = P) {
  const png = new PNG({ width: outW, height: outH });
  const bgc = hexToRgb(bg);
  for (let y = 0; y < outH; y++)
    for (let x = 0; x < outW; x++) {
      const sx = Math.floor((x * g.w) / outW), sy = Math.floor((y * g.h) / outH);
      const c = g.get(sx, sy);
      const [r, gg, b] = c ? hexToRgb(c) : bgc;
      const o = (y * outW + x) * 4;
      png.data[o] = r; png.data[o + 1] = gg; png.data[o + 2] = b; png.data[o + 3] = 255;
    }
  writeFileSync(path, PNG.sync.write(png, { colorType: 2, deflateLevel: 9, filterType: 4 }));
}

function splash(lw: number, lh: number, r: number): Grid {
  const w = lw * r, h = lh * r;
  const g = new Grid(w, h);
  g.rect(0, 0, w, h, P);
  const scale = Math.max(1, r - 1); // @3x 放 2 倍、@2x 放 1 倍：缩略图占屏宽七成左右
  const v = framed(villageGrid(), 4);
  const vw = v.w * scale, vh = v.h * scale;
  const ox = Math.floor((w - vw) / 2), oy = Math.floor((h - vh) / 2) - 24 * r;
  for (let y = 0; y < vh; y++) for (let x = 0; x < vw; x++) g.set(ox + x, oy + y, v.get(Math.floor(x / scale), Math.floor(y / scale)) ?? P);
  g.rect(0, h - 4 * r, w, 4 * r, W); // 底部深木色细条，和导航栏同色
  return g;
}

const DEVICES: [number, number, number][] = [
  [440, 956, 3], [402, 874, 3], [430, 932, 3], [393, 852, 3], [390, 844, 3], [375, 812, 3], [414, 896, 3], [414, 896, 2], [375, 667, 2], [414, 736, 3],
];

it('生成图标与启动画面', () => {
  mkdirSync('public/icons', { recursive: true });
  mkdirSync('public/splash', { recursive: true });
  const icon = iconGrid();
  writePng('public/icons/icon-512.png', icon, 512, 512);
  writePng('public/icons/icon-192.png', icon, 192, 192);
  writePng('public/icons/apple-touch-icon.png', icon, 180, 180);
  for (const [lw, lh, r] of DEVICES) {
    const s = splash(lw, lh, r);
    writePng(`public/splash/splash-${lw}x${lh}@${r}x.png`, s, s.w, s.h);
  }
});
