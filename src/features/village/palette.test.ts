import { describe, expect, it } from 'vitest';
import type { Grid } from '@/pixel/painter';
import { ALL_COLORS, COLOR_SET, FAMILIES } from './palette';
import { groundDemo, groundSheet } from './sprites/ground';

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
