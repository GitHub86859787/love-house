/**
 * 村里的小人：16×24 俯视角色，部件与颜色全部来自头像的 AvatarConfig，所以头像和小人一定对得上。
 * 结构：头 10×10（压住上一格）、身 8×8、腿 4 行；头大身小。
 * 颜色：每个部件基色取头像配置，暗阶 L−18% S+6%，亮阶 L+14%，描边墨中（#3b2a24）。
 * 1× 辨识硬指标：发型块 ≥ 8 px 宽；发色与肤色明度差不足时把头发整体压暗一阶，发际线永远用发暗阶。
 * 动画：待机 4 帧（起伏 1 px、第 3 帧眨眼），行走 4 帧（腿交替、手臂摆、头 1 px 起伏）；朝向 下 / 上 / 右，左由右镜像。
 */
import { Grid } from '@/pixel/painter';
import type { AvatarConfig } from '@/db/types';
import { hexToRgb, rgbToHex } from '@/lib/color';
import { ramp } from '../../palette';

export const CHAR_W = 16;
export const CHAR_H = 24;
export const CHAR_FRAMES = 4;
export const INK_OUTLINE = '#3b2a24';

export type Dir = 'down' | 'up' | 'left' | 'right';
export type Anim = 'idle' | 'walk' | 'sit';

/* ------------------------------ 颜色派生 ------------------------------ */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
}
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
function adjust(hex: string, dl: number, ds = 0): string {
  const [h, s, l] = rgbToHsl(...hexToRgb(hex));
  return rgbToHex(...hslToRgb(h, clamp01(s + ds), clamp01(l + dl)));
}
export function lum(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (0.3 * r + 0.59 * g + 0.11 * b) / 255;
}
export interface Tri {
  dark: string;
  base: string;
  light: string;
}
export function tri(hex: string): Tri {
  return { dark: adjust(hex, -0.18, 0.06), base: hex, light: adjust(hex, 0.14) };
}

/** 发色与肤色明度差 < 0.2 时把头发整体往远离肤色的方向压一阶，直到分得开（最多三步），保证 1× 能分出头发 */
export const HAIR_MIN_CONTRAST = 0.2;
export function hairTri(cfg: AvatarConfig): Tri {
  let t = tri(cfg.hairColor);
  const skinL = lum(cfg.skinColor);
  for (let i = 0; i < 3 && Math.abs(lum(t.base) - skinL) < HAIR_MIN_CONTRAST; i++) {
    t = skinL > 0.5
      ? { light: t.base, base: t.dark, dark: adjust(t.dark, -0.18, 0.06) }
      : { dark: t.base, base: t.light, light: adjust(t.light, 0.14) };
  }
  return t;
}

const PANTS: Tri = { dark: '#3a2f45', base: '#5a4c66', light: '#736684' };
const SHOE = '#5e3a2e';
const CREAM = '#fff8e7';

/* ------------------------------ 几何 ------------------------------ */
// 头：x 3..12，y 2..11（10×10）；身：x 4..11，y 12..19；腿：y 20..23
const HX = 3, HY = 2, HW = 10, HH = 10;
const BX = 4, BY = 12, BW = 8, BH = 8;
const LY = 20;

interface Pose {
  dy: number; // 头 + 身整体上下起伏
  legL: number; // 左腿伸出量（-1 收 / 0 / +1 伸）
  legR: number;
  armL: number; // 手臂上下摆
  armR: number;
  blink: boolean;
}

function pose(anim: Anim, frame: number): Pose {
  const f = ((frame % CHAR_FRAMES) + CHAR_FRAMES) % CHAR_FRAMES;
  if (anim === 'walk') {
    const leg = [0, 1, 0, -1][f];
    return { dy: f % 2 === 1 ? -1 : 0, legL: leg, legR: -leg, armL: -leg, armR: leg, blink: false };
  }
  if (anim === 'sit') return { dy: 0, legL: 0, legR: 0, armL: 0, armR: 0, blink: f === 2 };
  return { dy: f === 1 || f === 2 ? 1 : 0, legL: 0, legR: 0, armL: 0, armR: 0, blink: f === 2 };
}

/* ------------------------------ 头形（脸 6 种） ------------------------------ */
function headShape(face: number): { x0: number; w: number; h: number; chin: 'round' | 'square' | 'point' | 'wide' } {
  switch (((face % 6) + 6) % 6) {
    case 1: return { x0: HX + 1, w: HW - 2, h: HH, chin: 'round' }; // 鹅蛋
    case 2: return { x0: HX, w: HW, h: HH, chin: 'square' }; // 方脸
    case 3: return { x0: HX, w: HW, h: HH, chin: 'wide' }; // 婴儿肥
    case 4: return { x0: HX, w: HW, h: HH, chin: 'point' }; // 尖下巴
    case 5: return { x0: HX + 1, w: HW - 2, h: HH + 1, chin: 'square' }; // 长脸
    default: return { x0: HX, w: HW, h: HH, chin: 'round' };
  }
}

function drawHead(g: Grid, face: number, skin: Tri, dy: number) {
  const s = headShape(face);
  const y0 = HY + dy;
  g.rect(s.x0, y0, s.w, s.h, skin.base);
  const x1 = s.x0 + s.w - 1;
  const yb = y0 + s.h - 1;
  // 顶角永远削 1 px
  g.set(s.x0, y0, null); g.set(x1, y0, null);
  switch (s.chin) {
    case 'round':
      g.set(s.x0, yb, null); g.set(x1, yb, null); g.set(s.x0 + 1, yb, null); g.set(x1 - 1, yb, null);
      g.set(s.x0, yb - 1, null); g.set(x1, yb - 1, null);
      break;
    case 'point':
      g.rect(s.x0, yb - 2, 1, 3, null); g.rect(x1, yb - 2, 1, 3, null);
      g.rect(s.x0 + 1, yb - 1, 1, 2, null); g.rect(x1 - 1, yb - 1, 1, 2, null);
      g.set(s.x0 + 2, yb, null); g.set(x1 - 2, yb, null);
      break;
    case 'wide':
      g.set(s.x0, yb, null); g.set(x1, yb, null);
      g.set(s.x0 - 1, yb - 3, skin.base); g.set(s.x0 - 1, yb - 2, skin.base); g.set(x1 + 1, yb - 3, skin.base); g.set(x1 + 1, yb - 2, skin.base);
      break;
    default:
      g.set(s.x0, yb, null); g.set(x1, yb, null);
  }
  // 下巴阴影一行
  for (let x = s.x0; x <= x1; x++) if (g.get(x, yb)) g.set(x, yb, skin.dark);
}

/* ------------------------------ 眼睛 / 特征 ------------------------------ */
function drawEyes(g: Grid, cfg: AvatarConfig, dir: Dir, dy: number, blink: boolean) {
  const s = headShape(cfg.face);
  const ey = HY + dy + 5;
  const eye = cfg.eyeColor;
  const style = ((cfg.eyes % 6) + 6) % 6;
  const closed = blink || style === 2; // 眯眯眼常闭
  if (dir === 'down') {
    const lx = s.x0 + 1, rx = s.x0 + s.w - 3;
    if (closed) {
      g.rect(lx, ey + 1, 2, 1, eye); g.rect(rx, ey + 1, 2, 1, eye);
    } else if (style === 3) {
      // 笑眼：上弧
      g.set(lx, ey + 1, eye); g.set(lx + 1, ey, eye); g.set(rx, ey, eye); g.set(rx + 1, ey + 1, eye);
    } else if (style === 4) {
      g.rect(lx, ey, 2, 2, eye); g.rect(rx, ey + 1, 2, 1, eye);
    } else {
      g.rect(lx, ey, 2, 2, eye); g.rect(rx, ey, 2, 2, eye);
      if (style === 1 || style === 5) { g.set(lx, ey, CREAM); g.set(rx, ey, CREAM); }
    }
    if (style === 3) { g.set(s.x0, ey + 2, '#f0a0a0'); g.set(s.x0 + s.w - 1, ey + 2, '#f0a0a0'); }
  } else if (dir === 'right') {
    const rx = s.x0 + s.w - 3;
    if (closed) g.rect(rx, ey + 1, 2, 1, eye);
    else g.rect(rx, ey, 2, 2, eye);
    // 鼻尖 1 px
    g.set(s.x0 + s.w, ey + 2, g.get(s.x0 + s.w - 1, ey + 2));
  }
}

function drawFeature(g: Grid, cfg: AvatarConfig, dir: Dir, dy: number) {
  if (dir === 'up') return;
  const f = ((cfg.feature ?? 0) % 7 + 7) % 7;
  if (f === 0) return;
  const c = cfg.featureColor ?? '#3b2412';
  const s = headShape(cfg.face);
  const ey = HY + dy + 5;
  const x0 = s.x0, x1 = s.x0 + s.w - 1;
  const side = dir === 'right';
  const wrinkle = () => { if (!side) g.set(x0 + 1, ey + 3, c); g.set(x1 - 1, ey + 3, c); };
  const mustache = () => { if (side) g.rect(x1 - 2, ey + 3, 3, 1, c); else g.rect(x0 + 2, ey + 3, s.w - 4, 1, c); };
  switch (f) {
    case 1: wrinkle(); break;
    case 2: mustache(); break;
    case 3: // 大胡子
      if (side) g.rect(x1 - 3, ey + 3, 4, 2, c); else { g.rect(x0 + 1, ey + 3, s.w - 2, 2, c); g.rect(x0 + 2, ey + 5, s.w - 4, 1, c); }
      break;
    case 4: wrinkle(); mustache(); break;
    case 5: // 雀斑
      if (side) { g.set(x1 - 1, ey + 2, c); g.set(x1 - 3, ey + 3, c); } else { g.set(x0 + 1, ey + 2, c); g.set(x0 + 2, ey + 3, c); g.set(x1 - 1, ey + 2, c); g.set(x1 - 2, ey + 3, c); }
      break;
    case 6: g.set(side ? x1 - 1 : x1 - 2, ey + 3, c); break;
  }
}

/* ------------------------------ 头发（8 种，分朝向） ------------------------------ */
interface HairSpec {
  /** 顶部覆盖到的行（从 HY 起算，含） */
  fringeRows: number;
  /** 两侧垂下到的行（相对 HY） */
  sideTo: number;
  /** 侧发厚度（px） */
  sideW: number;
  /** 头发外扩：比头宽出的像素数（每侧） */
  ext: number;
  bun?: boolean;
  spikes?: boolean;
  curly?: boolean;
  part?: boolean;
  /** 背面长发垂到的行 */
  backTo: number;
}
function hairSpec(hair: number): HairSpec {
  switch (((hair % 8) + 8) % 8) {
    case 1: return { fringeRows: 4, sideTo: 8, sideW: 2, ext: 1, backTo: 9 }; // 波波头
    case 2: return { fringeRows: 4, sideTo: 13, sideW: 2, ext: 1, backTo: 15 }; // 长直发
    case 3: return { fringeRows: 4, sideTo: 5, sideW: 1, ext: 0, bun: true, backTo: 5 }; // 丸子头
    case 4: return { fringeRows: 4, sideTo: 5, sideW: 1, ext: 0, spikes: true, backTo: 5 }; // 刺刺头
    case 5: return { fringeRows: 3, sideTo: 3, sideW: 1, ext: 0, backTo: 4 }; // 寸头
    case 6: return { fringeRows: 4, sideTo: 8, sideW: 2, ext: 1, curly: true, backTo: 9 }; // 卷发
    case 7: return { fringeRows: 4, sideTo: 7, sideW: 2, ext: 1, part: true, backTo: 8 }; // 中分
    default: return { fringeRows: 4, sideTo: 5, sideW: 1, ext: 1, backTo: 5 }; // 短发
  }
}

function drawHair(g: Grid, cfg: AvatarConfig, dir: Dir, dy: number) {
  const hs = hairSpec(cfg.hair);
  const h = hairTri(cfg);
  const s = headShape(cfg.face);
  const y0 = HY + dy;
  const x0 = s.x0 - hs.ext, x1 = s.x0 + s.w - 1 + hs.ext;
  const w = x1 - x0 + 1;
  // 顶块：比头高出 1 行
  g.rect(x0, y0 - 1, w, hs.fringeRows + 1, h.base);
  g.set(x0, y0 - 1, null); g.set(x1, y0 - 1, null);
  if (hs.ext) { g.set(x0, y0, null); g.set(x1, y0, null); }
  // 顶光：亮阶一小段
  g.hline(x0 + 2, y0 - 1, 3, h.light);
  if (dir === 'up') {
    // 背面：整颗头都是头发，长发往下垂
    g.rect(x0, y0 - 1, w, Math.min(hs.backTo, s.h) + 1, h.base);
    g.set(x0, y0 - 1, null); g.set(x1, y0 - 1, null);
    if (hs.ext) { g.set(x0, y0, null); g.set(x1, y0, null); }
    if (hs.backTo > s.h - 1) {
      // 垂到肩下的部分窄一圈
      g.rect(x0 + 1, y0 + s.h, w - 2, hs.backTo - s.h + 1, h.base);
      g.hline(x0 + 1, y0 + hs.backTo, w - 2, h.dark);
    } else g.hline(x0 + 1, y0 + Math.min(hs.backTo, s.h - 1), w - 2, h.dark);
    g.hline(x0 + 2, y0 - 1, 3, h.light);
    g.vline(x0 + 1, y0 + 1, 2, h.light);
  } else {
    // 发际线：暗阶一行（永远和皮肤分开）
    g.hline(x0 + (hs.ext ? 1 : 0), y0 + hs.fringeRows - 1 + 1, w - (hs.ext ? 2 : 0), h.dark);
    if (dir === 'down') {
      // 两侧垂发
      if (hs.sideTo > hs.fringeRows) {
        g.rect(x0, y0 + hs.fringeRows, hs.sideW, hs.sideTo - hs.fringeRows + 1, h.base);
        g.rect(x1 - hs.sideW + 1, y0 + hs.fringeRows, hs.sideW, hs.sideTo - hs.fringeRows + 1, h.base);
        g.hline(x0, y0 + hs.sideTo, hs.sideW, h.dark); g.hline(x1 - hs.sideW + 1, y0 + hs.sideTo, hs.sideW, h.dark);
      }
      if (hs.part) {
        const cx = x0 + Math.floor(w / 2);
        g.rect(cx - 1, y0 + 1, 2, hs.fringeRows, null);
        g.set(cx - 1, y0 + hs.fringeRows, h.dark); g.set(cx, y0 + hs.fringeRows, h.dark);
      }
    } else {
      // 侧面：后脑一大块，前额一小段
      const backW = Math.floor(w * 0.55);
      g.rect(x0, y0 + hs.fringeRows, backW, hs.sideTo - hs.fringeRows + 1, h.base);
      g.hline(x0, y0 + hs.sideTo, backW, h.dark);
      g.vline(x0 + backW - 1, y0 + hs.fringeRows, hs.sideTo - hs.fringeRows, h.dark);
      if (hs.sideTo > s.h - 1) g.hline(x0, y0 + hs.sideTo, backW, h.dark);
    }
  }
  if (hs.bun) { g.rect(x0 + Math.floor(w / 2) - 2, y0 - 3, 4, 2, h.base); g.set(x0 + Math.floor(w / 2) - 1, y0 - 3, h.light); }
  if (hs.spikes) for (let i = 0; i < w; i += 3) { g.set(x0 + 1 + i, y0 - 2, h.base); if (i % 2 === 0) g.set(x0 + 1 + i, y0 - 3, h.base); }
  if (hs.curly) {
    for (let i = 1; i < w - 1; i += 2) g.set(x0 + i, y0 - 2, h.base);
    g.set(x0 - 1, y0 + 2, h.base); g.set(x1 + 1, y0 + 2, h.base); g.set(x0 - 1, y0 + 4, h.base); g.set(x1 + 1, y0 + 4, h.base);
    g.set(x0 + 1, y0 + 1, h.light); g.set(x0 + 4, y0, h.light);
  }
}

/* ------------------------------ 身体 / 衣服（6 种） ------------------------------ */
function drawBody(g: Grid, cfg: AvatarConfig, dir: Dir, p: Pose, sit: boolean) {
  const sh = tri(cfg.shirtColor);
  const skin = tri(cfg.skinColor);
  const y0 = BY + p.dy;
  const bh = sit ? BH - 2 : BH;
  g.rect(BX, y0, BW, bh, sh.base);
  g.vline(BX, y0, bh, sh.dark);
  g.hline(BX + 1, y0, 3, sh.light);
  const style = ((cfg.shirt % 6) + 6) % 6;
  if (dir !== 'up') {
    switch (style) {
      case 1: // 衬衫：领口 + 中缝
        g.set(BX + 3, y0, CREAM); g.set(BX + 4, y0, CREAM); g.vline(BX + 4, y0 + 1, bh - 1, sh.dark); g.set(BX + 4, y0 + 3, CREAM);
        break;
      case 2: // V 领
        g.set(BX + 3, y0, skin.base); g.set(BX + 4, y0, skin.base); g.set(BX + 3, y0 + 1, skin.dark); g.set(BX + 4, y0 + 1, skin.dark);
        break;
      case 3: // 条纹
        g.hline(BX + 1, y0 + 2, BW - 1, sh.light); g.hline(BX + 1, y0 + 5, BW - 1, sh.light);
        break;
      case 4: // 背带裤：上半奶白，两条带子
        g.rect(BX + 1, y0, BW - 1, 4, CREAM); g.vline(BX + 1, y0, 4, sh.base); g.vline(BX + 6, y0, 4, sh.base); g.set(BX + 1, y0 + 1, '#f5c542'); g.set(BX + 6, y0 + 1, '#f5c542');
        break;
      case 5: // 连帽衫：帽兜暗阶 + 抽绳
        g.rect(BX + 1, y0, 2, 2, sh.dark); g.rect(BX + 5, y0, 2, 2, sh.dark); g.vline(BX + 3, y0 + 1, 3, CREAM); g.vline(BX + 4, y0 + 1, 3, CREAM);
        break;
      default: // 圆领
        g.hline(BX + 3, y0, 2, sh.dark);
    }
  } else if (style === 5) g.rect(BX + 1, y0, BW - 2, 2, sh.dark);
  // 手臂：正 / 背面两侧各 1 px，侧面在身前 2 px
  if (dir === 'down' || dir === 'up') {
    const ah = bh - 1;
    g.rect(BX - 1, y0 + 1 + p.armL, 1, ah - 1, sh.dark);
    g.rect(BX + BW, y0 + 1 + p.armR, 1, ah - 1, sh.dark);
    g.set(BX - 1, y0 + ah + p.armL, skin.base); g.set(BX + BW, y0 + ah + p.armR, skin.base);
  } else {
    g.rect(BX + 3, y0 + 1 + p.armR, 2, bh - 3, sh.dark);
    g.rect(BX + 3, y0 + bh - 2 + p.armR, 2, 1, skin.base);
  }
}

function drawLegs(g: Grid, cfg: AvatarConfig, dir: Dir, p: Pose) {
  const y0 = LY;
  const skin = tri(cfg.skinColor);
  void skin;
  const leg = (x: number, ext: number) => {
    g.rect(x, y0 - 1, 2, 3 + ext, PANTS.base);
    g.set(x, y0 - 1, PANTS.light);
    g.rect(x, y0 + 2 + ext, 2, 1, SHOE);
  };
  if (dir === 'right') {
    // 侧面：并拢帧两腿挨着，迈步帧前后分开，迈出的那条腿多伸 1 px
    if (p.legL === 0) { leg(BX + 2, 0); leg(BX + 4, 0); }
    else { leg(BX + 1, p.legL < 0 ? 1 : 0); leg(BX + 5, p.legL > 0 ? 1 : 0); }
  } else {
    leg(BX + 1, p.legL);
    leg(BX + BW - 3, p.legR);
  }
  // 站姿时把伸出的腿收回（不超过 24 行）
  for (let x = 0; x < CHAR_W; x++) g.set(x, CHAR_H, null);
  void cfg;
}

function drawSitLegs(g: Grid, cfg: AvatarConfig, dir: Dir) {
  // 坐姿：腿往前平放两行，鞋在前
  const y = BY + BH - 2;
  const sh = tri(cfg.shirtColor);
  void sh;
  if (dir === 'right') { g.rect(BX + 3, y, 5, 2, PANTS.base); g.rect(BX + 7, y + 1, 2, 1, SHOE); g.set(BX + 3, y, PANTS.light); }
  else { g.rect(BX, y, 3, 2, PANTS.base); g.rect(BX + BW - 3, y, 3, 2, PANTS.base); g.rect(BX, y + 2, 3, 1, SHOE); g.rect(BX + BW - 3, y + 2, 3, 1, SHOE); g.set(BX, y, PANTS.light); g.set(BX + BW - 3, y, PANTS.light); }
}

/* ------------------------------ 配饰（8 种） ------------------------------ */
function drawAccessory(g: Grid, cfg: AvatarConfig, dir: Dir, dy: number) {
  const a = ((cfg.accessory % 8) + 8) % 8;
  if (a === 0) return;
  const c = tri(cfg.accessoryColor);
  const s = headShape(cfg.face);
  const hs = hairSpec(cfg.hair);
  const y0 = HY + dy;
  const x0 = s.x0 - hs.ext, x1 = s.x0 + s.w - 1 + hs.ext;
  const w = x1 - x0 + 1;
  const ey = y0 + 5;
  switch (a) {
    case 1: // 眼镜
      if (dir === 'up') return;
      // 镜框只画竖边和鼻梁，镜片里的眼睛留着
      if (dir === 'down') {
        g.vline(s.x0, ey, 2, c.base); g.vline(s.x0 + 3, ey, 2, c.base); g.vline(s.x0 + s.w - 4, ey, 2, c.base); g.vline(s.x0 + s.w - 1, ey, 2, c.base);
        for (let x = s.x0 + 4; x <= s.x0 + s.w - 5; x++) g.set(x, ey, c.base);
        g.set(s.x0 + 1, ey, c.light); g.set(s.x0 + s.w - 3, ey, c.light);
      } else { g.vline(s.x0 + s.w - 4, ey, 2, c.base); g.vline(s.x0 + s.w - 1, ey, 2, c.base); g.hline(s.x0 + 1, ey, s.w - 5, c.dark); g.set(s.x0 + s.w - 3, ey, c.light); }
      break;
    case 2: // 鸭舌帽：盖住顶块，帽舌朝前
      g.rect(x0, y0 - 1, w, 3, c.base); g.set(x0, y0 - 1, null); g.set(x1, y0 - 1, null);
      g.hline(x0 + 1, y0 - 1, w - 2, c.light); g.hline(x0, y0 + 1, w, c.dark);
      if (dir === 'down') g.hline(x0 - 1, y0 + 2, w + 2, c.dark);
      else if (dir === 'right') g.hline(x1 - 2, y0 + 2, 5, c.dark);
      break;
    case 3: // 发带
      g.hline(x0, y0 + 1, w, c.base); g.set(x0 + 1, y0 + 1, c.light);
      if (dir !== 'up') { g.set(x1 + 1, y0, c.base); g.set(x1 + 2, y0 - 1, c.base); }
      break;
    case 4: // 耳环
      if (dir === 'up') return;
      if (dir === 'down') { g.set(s.x0 - 1, ey + 3, c.base); g.set(s.x0 + s.w, ey + 3, c.base); } else g.set(s.x0 + 1, ey + 3, c.base);
      break;
    case 5: // 小花
      g.set(x1 - 1, y0 - 1, c.base); g.set(x1 - 2, y0 - 2, c.base); g.set(x1, y0 - 2, c.base); g.set(x1 - 1, y0 - 3, c.base); g.set(x1 - 1, y0 - 2, '#f5c542');
      break;
    case 6: { // 围巾：脖子一圈 + 一端垂下
      const y = BY + dy;
      g.rect(BX, y, BW, 2, c.base); g.hline(BX, y + 1, BW, c.dark);
      if (dir !== 'up') { g.rect(BX + BW - 3, y + 2, 2, 3, c.base); g.hline(BX + BW - 3, y + 4, 2, c.dark); } else g.rect(BX + 1, y + 2, 2, 2, c.base);
      break;
    }
    case 7: // 毛线帽：盖满顶块 + 绒球
      g.rect(x0, y0 - 2, w, 5, c.base); g.set(x0, y0 - 2, null); g.set(x1, y0 - 2, null);
      g.hline(x0, y0 + 2, w, c.dark); g.hline(x0 + 1, y0 - 2, 3, c.light);
      g.rect(x0 + Math.floor(w / 2) - 1, y0 - 4, 2, 2, c.light);
      break;
  }
}

/* ------------------------------ 组装 ------------------------------ */
const cache = new Map<string, Grid>();

export function charSprite(cfg: AvatarConfig, dir: Dir = 'down', anim: Anim = 'idle', frame = 0): Grid {
  const key = `${JSON.stringify(cfg)}|${dir}|${anim}|${frame % CHAR_FRAMES}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const mirror = dir === 'left';
  const d: Dir = mirror ? 'right' : dir;
  const p = pose(anim, frame);
  const g = new Grid(CHAR_W, CHAR_H);
  const skin = tri(cfg.skinColor);
  const sit = anim === 'sit';
  if (sit) drawSitLegs(g, cfg, d);
  else drawLegs(g, cfg, d, p);
  drawBody(g, cfg, d, p, sit);
  // 脖子
  g.rect(BX + 2, BY + p.dy - 1, BW - 4, 1, skin.dark);
  drawHead(g, cfg.face, skin, p.dy);
  drawEyes(g, cfg, d, p.dy, p.blink);
  drawFeature(g, cfg, d, p.dy);
  drawHair(g, cfg, d, p.dy);
  drawAccessory(g, cfg, d, p.dy);
  g.outline(INK_OUTLINE);
  const out = mirror ? flipX(g) : g;
  if (cache.size > 800) cache.clear();
  cache.set(key, out);
  return out;
}

export function flipX(g: Grid): Grid {
  const o = new Grid(g.w, g.h);
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) o.set(g.w - 1 - x, y, g.get(x, y));
  return o;
}

/* ------------------------------ 特殊角色 / 状态 ------------------------------ */

/** 灰化剪影：夜天暗阶单色 + 1:1 棋盘抖动，坐姿，头顶「…」气泡（第 2 帧少一个点） */
export function ghostSprite(cfg: AvatarConfig, frame = 0): Grid {
  const base = charSprite(cfg, 'down', 'sit', 0);
  const n = ramp('night');
  const g = new Grid(CHAR_W, CHAR_H + 8);
  const solid = (x: number, y: number) => !!base.get(x, y);
  for (let y = 0; y < base.h; y++)
    for (let x = 0; x < base.w; x++) {
      if (!solid(x, y)) continue;
      const edge = !solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1);
      // 轮廓一圈实心，内部 1:1 棋盘抖动，形状还认得出是个坐着的人
      if (edge || (x + y) % 2 === 0) g.set(x, y + 8, n.dark);
    }
  // 「…」气泡
  const pl = ramp('plaster');
  const bubble = new Grid(CHAR_W, 8);
  bubble.rect(3, 1, 10, 5, pl.light); bubble.set(3, 1, null); bubble.set(12, 1, null); bubble.set(3, 5, null); bubble.set(12, 5, null);
  bubble.set(7, 6, pl.light);
  const dots = frame % 2 === 0 ? [5, 7, 9] : [5, 7];
  for (const x of dots) bubble.set(x, 3, n.base);
  bubble.outline(n.dark);
  g.compose(bubble, 0, 0);
  return g;
}

/** 满心金星：头顶 2 帧闪 */
export function starSprite(frame = 0): Grid {
  const gd = ramp('gold');
  const g = new Grid(7, 7);
  if (frame % 2 === 0) {
    g.paste(0, 0, ['...#...', '...#...', '.#####.', '..###..', '.##.##.', '.#...#.', '.......'], { '#': gd.base });
    g.set(3, 2, gd.light); g.set(3, 3, gd.light); g.set(2, 4, gd.dark); g.set(4, 4, gd.dark);
  } else {
    g.paste(0, 0, ['.......', '...#...', '..###..', '.#####.', '..###..', '..#.#..', '.......'], { '#': gd.base });
    g.set(3, 3, gd.light); g.set(2, 5, gd.dark); g.set(4, 5, gd.dark);
  }
  return g;
}

/** 黑猫：12×9，两帧甩尾，金瞳 */
export function catSprite(frame = 0, facing: 'l' | 'r' = 'r'): Grid {
  const ink = ramp('ink');
  const gd = ramp('gold');
  const g = new Grid(13, 9);
  g.paste(0, 0, [
    '.........#.#.',
    '.........###.',
    '..#####..###.',
    '.#######.##..',
    '.########....',
    '.########....',
    '..#.#..#.#...',
    '.............',
    '.............',
  ], { '#': ink.base });
  // 尾巴两帧
  if (frame % 2 === 0) { g.set(0, 3, ink.base); g.set(0, 2, ink.base); g.set(1, 1, ink.base); }
  else { g.set(0, 4, ink.base); g.set(0, 5, ink.base); g.set(1, 6, ink.base); }
  g.set(10, 3, gd.base); g.set(12, 3, gd.base);
  g.set(9, 4, ramp('pink').base);
  g.hline(2, 3, 3, ink.light);
  g.outline(ink.dark);
  return facing === 'l' ? flipX(g) : g;
}

/** 小木凳（星婆婆坐）：14 宽，凳面两头露在人两侧，凳腿在脚下 */
export function stoolSprite(): Grid {
  const wd = ramp('wood');
  const g = new Grid(14, 6);
  g.rect(0, 0, 14, 2, wd.base); g.hline(1, 0, 12, wd.light); g.hline(0, 1, 14, wd.dark);
  g.rect(1, 2, 2, 4, wd.dark); g.rect(11, 2, 2, 4, wd.dark);
  g.set(1, 2, wd.base); g.set(11, 2, wd.base);
  g.outline(wd.outline);
  return g;
}

/** 心形气泡（点击村民时） */
export function heartBubble(): Grid {
  const pk = ramp('pink');
  const g = new Grid(9, 8);
  g.paste(0, 0, ['.##..##..', '#######..', '#######..', '.#####...', '..###....', '...#.....'], { '#': pk.base });
  g.set(1, 1, pk.light); g.set(2, 1, pk.light); g.set(3, 3, pk.dark);
  g.outline(pk.outline);
  return g;
}
