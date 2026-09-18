import { describe, expect, it } from 'vitest';
import type { Grid } from '@/pixel/painter';
import { ALL_COLORS, COLOR_SET, FAMILIES } from './palette';
import { demoLayout, groundDemo, groundSheet, jaggedProfile } from './sprites/ground';
import { waterAnimStrip, waterDemo, waterSheet } from './sprites/water';
import { floraDemo, floraSheet, treeSprite, treeStrip } from './sprites/flora';
import { BUILDINGS } from './sprites/buildings';
import { hash2, TILE } from './sprites/tile';

function colorsOf(g: Grid): Set<string> {
  const s = new Set<string>();
  for (const c of g.data) if (c) s.add(c.toLowerCase());
  return s;
}

describe('调色板', () => {
  it('恰好 48 色，两两不同，无纯黑纯白', () => {
    expect(ALL_COLORS).toHaveLength(48);
    expect(new Set(ALL_COLORS.map((c) => c.toLowerCase())).size).toBe(48);
    for (const c of ALL_COLORS) {
      expect(c).toMatch(/^#[0-9a-f]{6}$/);
      expect(c).not.toBe('#000000');
      expect(c).not.toBe('#ffffff');
    }
  });
  it('描边色都来自 48 色', () => {
    for (const f of FAMILIES) expect(COLOR_SET.has(f.outline)).toBe(true);
  });
  it('暗阶比基阶暗、亮阶比基阶亮', () => {
    const lum = (hex: string) => {
      const n = parseInt(hex.slice(1), 16);
      return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
    };
    for (const f of FAMILIES) {
      expect(lum(f.dark)).toBeLessThan(lum(f.base));
      expect(lum(f.light)).toBeGreaterThan(lum(f.base));
    }
  });
});

describe('地面图块只用调色板颜色', () => {
  for (const season of ['spring', 'summer', 'autumn', 'winter'] as const) {
    it(`${season}：图块表与拼合样例`, () => {
      const grids = [...groundSheet(season).map((i) => i.grid), groundDemo(season)];
      for (const g of grids) for (const c of colorsOf(g)) expect(COLOR_SET.has(c)).toBe(true);
    });
  }
});

describe('地面图块密度与交界', () => {
  const seasons = ['spring', 'summer', 'autumn', 'winter'] as const;
  it('每块图块非基色像素 ≥ 15%（按最多的那种颜色算基色）', () => {
    for (const season of seasons) {
      for (const it of groundSheet(season)) {
        const counts = new Map<string, number>();
        let total = 0;
        for (const c of it.grid.data) {
          if (!c) continue;
          total++;
          counts.set(c, (counts.get(c) ?? 0) + 1);
        }
        const base = Math.max(...counts.values());
        const ratio = 1 - base / total;
        expect(ratio, `${season} ${it.name} 非基色占比 ${(ratio * 100).toFixed(0)}%`).toBeGreaterThanOrEqual(0.15);
      }
    }
  });
  it('锯齿轮廓：同一深度连续不超过 4 px，且不是一条直线', () => {
    let i = 0;
    const rnd = () => hash2(7, 9, 900 + i++);
    for (let k = 0; k < 20; k++) {
      const p = jaggedProfile(TILE, rnd);
      expect(p).toHaveLength(TILE);
      let run = 1;
      for (let x = 1; x < TILE; x++) {
        run = p[x] === p[x - 1] ? run + 1 : 1;
        expect(run).toBeLessThanOrEqual(4);
      }
      expect(new Set(p).size).toBeGreaterThan(1);
    }
  });
  it('拼合样例里草与路的交界没有超过 4 px 的直线', () => {
    // 逐行扫：草→路的水平分界如果在同一 y 上连续超过 4 列相同，就算直线
    const earth = new Set(['#9a7048', '#c4965e', '#e1bd85', '#8a8ea0', '#5f6076', '#b8bcc8']);
    for (const season of seasons) {
      const g = groundDemo(season);
      const isEarth = (x: number, y: number) => {
        const c = g.get(x, y);
        return Boolean(c && earth.has(c));
      };
      // 竖直方向的分界（路的上下边）：对每一列找第一次进入路的 y；相邻列同 y 连续 >4 视为直线
      let straight = 0;
      const layout = demoLayout();
      for (let x0 = 0; x0 < g.w; x0 += TILE) {
        // 只看上方是草的横路上边（竖路、石板列跳过）
        if (layout[2][x0 / TILE] !== 'g') continue;
        const ys: number[] = [];
        for (let x = x0; x < x0 + TILE; x++) {
          let y = 3 * TILE - 4;
          while (y < 3 * TILE + 6 && !isEarth(x, y)) y++;
          ys.push(y);
        }
        let run = 1;
        for (let k = 1; k < ys.length; k++) {
          run = ys[k] === ys[k - 1] ? run + 1 : 1;
          if (run > 4) straight++;
        }
      }
      expect(straight, `${season} 横路上边有直线段`).toBe(0);
    }
  });
});

describe('水系图块只用调色板颜色，且有密度', () => {
  for (const season of ['spring', 'summer', 'autumn', 'winter'] as const) {
    it(`${season}`, () => {
      const grids = [...waterSheet(season, 0).map((i) => i.grid), waterDemo(season, 1), waterAnimStrip(season)];
      for (const g of grids) for (const c of colorsOf(g)) expect(COLOR_SET.has(c)).toBe(true);
      // 水中块也要有 15% 非基色
      const mid = waterSheet(season, 0)[0].grid;
      const counts = new Map<string, number>();
      for (const c of mid.data) if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
      expect(1 - Math.max(...counts.values()) / 256).toBeGreaterThanOrEqual(0.15);
    });
  }
  it('三帧互不相同', () => {
    const a = waterDemo('spring', 0).key();
    const b = waterDemo('spring', 1).key();
    const c = waterDemo('spring', 2).key();
    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
  });
});

describe('植被与小物只用调色板颜色', () => {
  for (const season of ['spring', 'summer', 'autumn', 'winter'] as const) {
    it(`${season}`, () => {
      const grids = [...floraSheet(season, 0).map((i) => i.grid), ...floraSheet(season, 1).map((i) => i.grid), floraDemo(season, 0), treeStrip(0)];
      for (const g of grids) for (const c of colorsOf(g)) expect(COLOR_SET.has(c), `${season} 有调色板外颜色 ${c}`).toBe(true);
    });
  }
  it('大树两帧只在冠边缘不同，树干一致', () => {
    const a = treeSprite('summer', 'round', 0);
    const b = treeSprite('summer', 'round', 1);
    let diff = 0;
    for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) if (a.get(x, y) !== b.get(x, y)) diff++;
    expect(diff).toBeGreaterThan(10);
    expect(diff).toBeLessThan(160);
    // 树干区（底部 8 行中间 8 列）完全一致
    for (let y = 40; y < 48; y++) for (let x = 12; x < 20; x++) expect(a.get(x, y)).toBe(b.get(x, y));
  });
  it('树冠不是椭圆：轮廓每行宽度不单调', () => {
    const g = treeSprite('summer', 'round', 0);
    const widths: number[] = [];
    for (let y = 0; y < 30; y++) {
      let l = -1;
      let r = -1;
      for (let x = 0; x < g.w; x++) if (g.get(x, y)) { if (l < 0) l = x; r = x; }
      if (l >= 0) widths.push(r - l + 1);
    }
    let turns = 0;
    for (let i = 2; i < widths.length; i++) if (Math.sign(widths[i] - widths[i - 1]) !== Math.sign(widths[i - 1] - widths[i - 2]) && widths[i] !== widths[i - 1]) turns++;
    expect(turns).toBeGreaterThanOrEqual(3);
  });
});

describe('九处建筑只用调色板颜色', () => {
  for (const b of BUILDINGS) {
    it(b.label, () => {
      for (const season of ['spring', 'autumn', 'winter'] as const) for (const night of [false, true]) {
        const g = b.draw(season, night, 0);
        expect(g.w).toBe(b.w);
        expect(g.h).toBe(b.h);
        for (const c of colorsOf(g)) expect(COLOR_SET.has(c), `${b.key} ${season} ${night ? '夜' : '昼'} 有调色板外颜色 ${c}`).toBe(true);
      }
    });
  }
});
