import { describe, expect, it } from 'vitest';
import { Grid } from '@/pixel/painter';
import { ALL_COLORS, FAMILIES, PALETTE } from '../palette';
import { applyLightPools, applySlot, gradeColor, SLOTS, slotAt, swapTable } from './daylight';
import { FX_COUNT, particlesAt, drawParticles } from './fx';

const lum = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.3 * ((n >> 16) & 255) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255;
};

describe('昼夜换色表', () => {
  it('五张表 + 中间表都把 48 色映回 48 色', () => {
    const set = new Set(ALL_COLORS);
    for (const s of SLOTS) for (const v of swapTable(s).values()) expect(set.has(v)).toBe(true);
    for (const v of swapTable('day', 'dusk').values()) expect(set.has(v)).toBe(true);
    for (const v of swapTable('evening', 'night').values()) expect(set.has(v)).toBe(true);
  });

  it('白天表是恒等', () => {
    for (const c of ALL_COLORS) expect(swapTable('day').get(c)).toBe(c);
  });

  it('深夜不是停电：每个色系暗 / 基 / 亮三阶换色后仍至少两档可分，没有一色系全落到同一色', () => {
    const t = swapTable('night');
    let allSame = 0;
    for (const f of FAMILIES) {
      const out = new Set([t.get(f.dark), t.get(f.base), t.get(f.light)]);
      if (out.size === 1) allSame++;
    }
    expect(allSame).toBeLessThanOrEqual(2);
    // 木墙不能落到墨暗阶
    expect(t.get(PALETTE.wood.base)).not.toBe(PALETTE.ink.dark);
    expect(t.get(PALETTE.wood.light)).not.toBe(PALETTE.ink.dark);
    // 整体确实变暗
    const avg = (tbl: Map<string, string>) => ALL_COLORS.reduce((n, c) => n + lum(tbl.get(c)!), 0) / ALL_COLORS.length;
    expect(avg(t)).toBeLessThan(avg(swapTable('evening')));
    expect(avg(swapTable('evening'))).toBeLessThan(avg(swapTable('day')));
  });

  it('傍晚偏暖：换色后的平均 R−B 比白天大', () => {
    const warm = (tbl: Map<string, string>) =>
      ALL_COLORS.reduce((n, c) => {
        const v = parseInt(tbl.get(c)!.slice(1), 16);
        return n + (((v >> 16) & 255) - (v & 255));
      }, 0) / ALL_COLORS.length;
    expect(warm(swapTable('dusk'))).toBeGreaterThan(warm(swapTable('day')) + 10);
    expect(warm(swapTable('night'))).toBeLessThan(warm(swapTable('day')));
  });

  it('非调色板色（人物）也会换色，且明度顺序保持', () => {
    const a = gradeColor('#e6323c', 'night');
    const b = gradeColor('#e6323c', 'day');
    expect(a).not.toBe(b);
    expect(lum(a)).toBeLessThan(lum(b));
    expect(lum(gradeColor('#f8d9b8', 'night'))).toBeGreaterThan(lum(gradeColor('#5c3a1e', 'night')));
  });

  it('时段按小时切换，边界 ±10 分钟走中间表', () => {
    const at = (h: number, m: number) => slotAt(new Date(2026, 3, 10, h, m), 'spring');
    expect(at(12, 0).slot).toBe('day');
    expect(at(12, 0).next).toBeUndefined();
    expect(at(17, 30).slot).toBe('dusk');
    expect(at(17, 30).lightsOn).toBe(true);
    expect(at(16, 55)).toMatchObject({ slot: 'day', next: 'dusk' });
    expect(at(17, 5)).toMatchObject({ slot: 'dusk', next: 'day' });
    expect(at(16, 40).next).toBeUndefined();
    expect(at(3, 0).slot).toBe('night');
    expect(at(6, 30).slot).toBe('dawn');
    expect(at(6, 30).lightsOn).toBe(false);
    // 冬天傍晚早一小时
    expect(slotAt(new Date(2026, 0, 10, 16, 30), 'winter').slot).toBe('dusk');
  });

  it('emissive 区里的金色不换色；光池把地面换回傍晚色', () => {
    const g = new Grid(20, 10);
    g.rect(0, 0, 20, 10, PALETTE.grass.base);
    g.rect(2, 2, 3, 3, PALETTE.gold.base);
    const n = applySlot(g, 'night', undefined, [{ x: 0, y: 0, w: 10, h: 10 }]);
    expect(n.get(3, 3)).toBe(PALETTE.gold.base);
    expect(n.get(15, 5)).toBe(swapTable('night').get(PALETTE.grass.base));
    const lit = applyLightPools(n, g, [{ cx: 15, cy: 5, rx: 4, ry: 2 }]);
    expect(lit.get(15, 5)).toBe(swapTable('dusk').get(PALETTE.grass.base));
    expect(lit.get(0, 0)).toBe(n.get(0, 0));
  });
});

describe('粒子', () => {
  it('数量、只用亮阶 / 基阶单像素、每帧都在动', () => {
    for (const k of ['petal', 'leaf', 'snow', 'firefly'] as const) {
      const a = particlesAt(k, 0, 64, 64);
      const b = particlesAt(k, 1, 64, 64);
      expect(a.length).toBeLessThanOrEqual(FX_COUNT[k]);
      if (k !== 'firefly') expect(a.length).toBe(FX_COUNT[k]);
      expect(a.map((p) => `${p.x},${p.y}`).join('|')).not.toBe(b.map((p) => `${p.x},${p.y}`).join('|'));
      for (const p of a) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThan(64);
        expect([PALETTE.pink.light, PALETTE.pink.base, PALETTE.autumn.light, PALETTE.gold.base, PALETTE.gold.light, PALETTE.snow.light]).toContain(p.color);
      }
    }
    const g = new Grid(32, 32);
    drawParticles(g, 'snow', 3);
    expect(g.data.filter(Boolean).length).toBeGreaterThan(0);
  });
});
