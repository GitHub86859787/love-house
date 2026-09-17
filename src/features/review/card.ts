/**
 * 年度回顾卡：直接画在 canvas 上（所见即所存），像素字体 + 像素素材。
 */
import type { Grid } from '@/pixel/painter';
import { buildAvatar } from '@/pixel/avatar/build';
import { HEART } from '@/pixel/sprites/heart';
import { icon } from '@/pixel/sprites/icons';
import type { YearStats } from './stats';

export const CARD_W = 360;
export const CARD_H = 600;

const C = {
  woodDark: '#5c3a1e',
  woodLight: '#8b5a2b',
  woodShadow: '#3b2412',
  paper: '#f4e4bc',
  paperDark: '#e8d5a3',
  paperDeep: '#d9c08a',
  ink: '#3b2412',
  inkSoft: '#7a5a3a',
  gold: '#f5c542',
  goldDark: '#b8891c',
  heart: '#e6323c',
  purple: '#6b3fa0',
  white: '#fff8e7',
};

function drawGrid(ctx: CanvasRenderingContext2D, g: Grid, x: number, y: number, scale: number) {
  for (let j = 0; j < g.h; j++) {
    for (let i = 0; i < g.w; i++) {
      const c = g.data[j * g.w + i];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(x + i * scale, y + j * scale, scale, scale);
    }
  }
}

function pxFrame(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, border: string, inner?: string) {
  ctx.fillStyle = border;
  ctx.fillRect(x + 2, y, w - 4, h);
  ctx.fillRect(x, y + 2, w, h - 4);
  ctx.fillStyle = fill;
  ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
  if (inner) {
    ctx.fillStyle = inner;
    ctx.fillRect(x + 4, y + 4, w - 8, 2);
    ctx.fillRect(x + 4, y + 4, 2, h - 8);
  }
}

function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'left', shadow?: string) {
  ctx.font = `${size}px FusionPixel, "Microsoft YaHei", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  if (shadow) {
    ctx.fillStyle = shadow;
    ctx.fillText(s, x + 2, y + 2);
  }
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}

/** 等宽字体下的粗略换行 */
function wrap(ctx: CanvasRenderingContext2D, s: string, size: number, maxW: number): string[] {
  ctx.font = `${size}px FusionPixel, "Microsoft YaHei", sans-serif`;
  const out: string[] = [];
  let cur = '';
  for (const ch of s) {
    if (ctx.measureText(cur + ch).width > maxW && cur) {
      out.push(cur);
      cur = ch;
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

export async function ensureFont(): Promise<void> {
  try {
    await Promise.all([document.fonts.load('16px FusionPixel'), document.fonts.load('24px FusionPixel'), document.fonts.load('12px FusionPixel')]);
  } catch {
    // 字体加载失败就用后备字体
  }
}

export function drawReviewCard(canvas: HTMLCanvasElement, s: YearStats, meName: string | undefined, dpr = 2) {
  canvas.width = CARD_W * dpr;
  canvas.height = CARD_H * dpr;
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;

  // 木框 + 羊皮纸
  ctx.fillStyle = C.woodShadow;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  pxFrame(ctx, 4, 4, CARD_W - 8, CARD_H - 8, C.paper, C.woodDark, C.paperDark);
  ctx.fillStyle = C.woodLight;
  ctx.fillRect(8, 8, CARD_W - 16, 2);
  ctx.fillRect(8, 8, 2, CARD_H - 16);
  // 网格纸纹
  ctx.fillStyle = 'rgba(59,36,18,0.05)';
  for (let x = 12; x < CARD_W - 12; x += 16) ctx.fillRect(x, 12, 1, CARD_H - 24);
  for (let y = 12; y < CARD_H - 12; y += 16) ctx.fillRect(12, y, CARD_W - 24, 1);

  // 标题
  let y = 22;
  drawGrid(ctx, icon('star', C.gold), 24, y + 2, 2);
  drawGrid(ctx, icon('star', C.gold), CARD_W - 24 - 32, y + 2, 2);
  text(ctx, `${s.year} 年度回顾`, CARD_W / 2, y, 24, C.purple, 'center', C.gold);
  y += 32;
  text(ctx, `${meName ? `${meName}的` : ''}人情村 · 一年往来`, CARD_W / 2, y, 12, C.inkSoft, 'center');
  y += 24;

  // 四格大数字
  const cells = [
    { n: s.newPersons.length, label: '新认识的村民', ic: 'plus' },
    { n: s.interactions, label: '记下的往来', ic: 'edit' },
    { n: s.gifts, label: '送出的礼物', ic: 'gift' },
    { n: s.heartsGained, label: '涨的心（颗）', ic: 'star' },
  ] as const;
  const cw = (CARD_W - 24 - 8) / 2;
  cells.forEach((c, i) => {
    const cx = 12 + (i % 2) * (cw + 8);
    const cy = y + Math.floor(i / 2) * 68;
    pxFrame(ctx, cx, cy, cw, 60, C.white, C.paperDeep);
    drawGrid(ctx, icon(c.ic, C.goldDark), cx + 10, cy + 12, 2);
    text(ctx, String(c.n), cx + 44, cy + 8, 24, C.ink, 'left');
    text(ctx, c.label, cx + 44, cy + 38, 12, C.inkSoft, 'left');
  });
  y += 68 * 2 + 4;

  // 最常联系
  text(ctx, '最常联系', 16, y, 16, C.purple, 'left');
  ctx.fillStyle = C.goldDark;
  for (let x = 96; x < CARD_W - 16; x += 8) ctx.fillRect(x, y + 8, 4, 2);
  y += 24;
  if (s.topPersons.length === 0) {
    text(ctx, '今年还没记过往来', 16, y, 12, C.inkSoft);
    y += 20;
  }
  s.topPersons.forEach((t, i) => {
    const p = t.person;
    drawGrid(ctx, buildAvatar(p.avatar), 16, y, 2);
    text(ctx, `${i + 1}. ${p.nickname || p.name}`, 72, y + 4, 16, C.ink);
    text(ctx, `${t.count} 次往来`, 72, y + 26, 12, C.inkSoft);
    // 心
    const hearts = Math.floor(p.affection / 250);
    const hx = CARD_W - 16 - 5 * 18;
    for (let k = 0; k < 5; k++) {
      const idx = k * 2;
      const state = hearts >= idx + 2 ? 'full' : hearts >= idx + 1 ? 'half' : 'empty';
      drawGrid(ctx, HEART[state], hx + k * 18, y + 14, 1);
    }
    y += 54;
  });
  y += 4;

  // 其他数字
  text(ctx, '还有这些', 16, y, 16, C.purple, 'left');
  ctx.fillStyle = C.goldDark;
  for (let x = 96; x < CARD_W - 16; x += 8) ctx.fillRect(x, y + 8, 4, 2);
  y += 24;
  const lines = [
    s.topGift ? `送得最多的礼物：${s.topGift.name}（${s.topGift.count} 次）` : '',
    s.busiestMonth ? `最热闹的月份：${s.busiestMonth.month} 月，${s.busiestMonth.count} 笔` : '',
    s.fullHearts.length ? `进入挚友殿堂：${s.fullHearts.map((p) => p.nickname || p.name).join('、')}` : '',
    `笔记 ${s.notes} 条 · 命书 ${s.bookChapters} 章 · 任务 ${s.questsDone} 条 · 成就 ${s.achievements} 个`,
  ].filter(Boolean);
  for (const l of lines) {
    for (const w of wrap(ctx, l, 12, CARD_W - 40)) {
      text(ctx, `· ${w}`, 16, y, 12, C.ink);
      y += 18;
    }
  }

  // 一句话
  const boxY = CARD_H - 96;
  pxFrame(ctx, 12, boxY, CARD_W - 24, 56, C.white, C.goldDark);
  const ls = wrap(ctx, s.line, 12, CARD_W - 56);
  ls.slice(0, 2).forEach((l, i) => text(ctx, l, CARD_W / 2, boxY + 12 + i * 18, 12, C.ink, 'center'));
  text(ctx, '人情村 · 数据只在你手机里', CARD_W / 2, CARD_H - 30, 12, C.inkSoft, 'center');
}
