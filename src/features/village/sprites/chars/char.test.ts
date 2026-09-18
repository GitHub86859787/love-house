import { describe, expect, it } from 'vitest';
import { randomAvatar } from '@/pixel/avatar/build';
import { fortuneTellerAvatar } from '@/features/fortune/teller';
import { CHAR_H, CHAR_W, HAIR_MIN_CONTRAST, catSprite, charSprite, flipX, ghostSprite, hairTri, lum, starSprite, type Dir } from './char';
import { ALL_COLORS } from '../../palette';

const DIRS: Dir[] = ['down', 'up', 'left', 'right'];
const people = Array.from({ length: 40 }, (_, i) => randomAvatar(i % 3 === 0 ? 'family' : 'friend', ((i + 1) * 0.6180339887) % 1));

describe('村民小人', () => {
  it('尺寸 16×24，四朝向 × 待机 / 行走 × 4 帧都能画', () => {
    for (const p of people.slice(0, 10))
      for (const d of DIRS)
        for (const a of ['idle', 'walk'] as const)
          for (let f = 0; f < 4; f++) {
            const g = charSprite(p, d, a, f);
            expect(g.w).toBe(CHAR_W);
            expect(g.h).toBe(CHAR_H);
            expect(g.data.some((c) => c)).toBe(true);
          }
  });

  it('1× 辨识：正面顶部头发块 ≥ 8 px 宽，且发色与肤色明度差 ≥ 0.2', () => {
    for (const p of people) {
      const h = hairTri(p);
      expect(Math.abs(lum(h.base) - lum(p.skinColor))).toBeGreaterThanOrEqual(HAIR_MIN_CONTRAST - 1e-9);
      const g = charSprite(p, 'down', 'idle', 0);
      const hairSet = new Set([h.base, h.light, h.dark]);
      let best = 0;
      for (let y = 0; y < 8; y++) {
        let n = 0;
        for (let x = 0; x < g.w; x++) if (hairSet.has(g.get(x, y) ?? '')) n++;
        best = Math.max(best, n);
      }
      // 帽子会盖住头发：鸭舌帽 / 毛线帽时看帽色块
      if (p.accessory === 2 || p.accessory === 7) {
        let hat = 0;
        for (let y = 0; y < 8; y++) {
          let n = 0;
          for (let x = 0; x < g.w; x++) if ((g.get(x, y) ?? '').toLowerCase() === p.accessoryColor.toLowerCase()) n++;
          hat = Math.max(hat, n);
        }
        expect(hat + best).toBeGreaterThanOrEqual(8);
      } else expect(best).toBeGreaterThanOrEqual(8);
    }
  });

  it('衣服块用的是头像的衣色；左朝向是右朝向的镜像', () => {
    for (const p of people.slice(0, 12)) {
      const g = charSprite(p, 'down', 'idle', 0);
      let n = 0;
      for (let y = 12; y < 20; y++) for (let x = 4; x < 12; x++) if ((g.get(x, y) ?? '').toLowerCase() === p.shirtColor.toLowerCase()) n++;
      // 背带裤上半是奶白，其余至少一半像素是衣色
      expect(n).toBeGreaterThanOrEqual(p.shirt === 4 ? 16 : 30);
      const l = charSprite(p, 'left', 'walk', 1);
      const r = charSprite(p, 'right', 'walk', 1);
      expect(l.key()).toBe(flipX(r).key());
    }
  });

  it('待机 4 帧有起伏和眨眼；行走 4 帧腿不同', () => {
    const p = people.find((x) => x.eyes !== 2 && x.accessory !== 2 && x.accessory !== 7)!;
    const idle = Array.from({ length: 4 }, (_, f) => charSprite(p, 'down', 'idle', f).key());
    expect(new Set(idle).size).toBeGreaterThanOrEqual(3);
    const walk = Array.from({ length: 4 }, (_, f) => charSprite(p, 'down', 'walk', f).key());
    expect(new Set(walk).size).toBeGreaterThanOrEqual(3);
  });

  it('星婆婆坐姿、黑猫、灰化、金星只用调色板颜色（人物除外）', () => {
    expect(charSprite(fortuneTellerAvatar, 'down', 'sit', 0).h).toBe(CHAR_H);
    const set = new Set(ALL_COLORS);
    for (const g of [catSprite(0), catSprite(1), starSprite(0), starSprite(1), ghostSprite(people[1], 0), ghostSprite(people[1], 1)])
      for (const c of g.data) if (c) expect(set.has(c), c).toBe(true);
    // 灰化剪影内部是棋盘抖动：存在透明像素夹在实心之间
    const gh = ghostSprite(people[1], 0);
    let holes = 0;
    for (let y = 9; y < gh.h - 1; y++) for (let x = 1; x < gh.w - 1; x++) if (!gh.get(x, y) && gh.get(x - 1, y) && gh.get(x + 1, y)) holes++;
    expect(holes).toBeGreaterThan(10);
  });
});
