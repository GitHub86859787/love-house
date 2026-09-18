import { describe, expect, it } from 'vitest';
import { AREA_CELLS, COLS, GATE_ENTRY, PLACEMENTS, ROWS, TREES, allProps, emptyCheck, findPath, groundAt, isBuildingCell, walkable } from './layout';
import { buildingsGrid, decorGrid, groundGrid, treesGrid, waterGrid } from './renderer/layers';
import { ALL_COLORS } from './palette';
import { placeVillagers, stepActors } from './renderer/behavior';
import { randomAvatar } from '@/pixel/avatar/build';
import type { Villager } from './model';
import type { Person } from '@/db/types';

describe('村庄布局', () => {
  it('24×22，每行 24 格，远山只在第 0 行', () => {
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) expect(groundAt(x, y) === 'M').toBe(y === 0 && x < 22);
  });

  it('从村口能走到每一栋门口，站位都在可走格上', () => {
    for (const p of PLACEMENTS)
      for (const c of p.cells) {
        expect(walkable(c[0], c[1]), `${p.key} ${c}`).toBe(true);
        expect(findPath(GATE_ENTRY, c), `${p.key} ${c} 走不到`).not.toBeNull();
      }
    for (const [k, cells] of Object.entries(AREA_CELLS)) for (const c of cells) expect(walkable(c[0], c[1]), `${k} ${c}`).toBe(true);
  });

  it('建筑不压水（只有湖边小屋的码头伸进湖里），树不压路 / 建筑', () => {
    for (const p of PLACEMENTS)
      for (let y = p.y; y < p.y + p.h; y++)
        for (let x = p.x; x < p.x + p.w; x++) if (groundAt(x, y) === '~') expect(p.key === 'lakehouse' && y === 20, `${p.key} ${x},${y}`).toBe(true);
    for (const t of TREES)
      for (let y = Math.max(0, t.y - 2); y <= t.y; y++)
        for (let x = t.x; x <= t.x + 1; x++) {
          expect(isBuildingCell(x, y)).toBe(false);
          expect(['.', 'M', 'f']).toContain(groundAt(x, y));
        }
  });

  it('没有连续 3 格以上的空地', () => {
    const { bad } = emptyCheck(allProps());
    expect(bad).toEqual([]);
  });

  it('静态层只用调色板颜色（人物除外）', () => {
    const set = new Set(ALL_COLORS);
    for (const season of ['spring', 'summer', 'autumn', 'winter'] as const) {
      const grids = [groundGrid(season), waterGrid(season, 0), decorGrid(season, true), decorGrid(season, false), buildingsGrid(season, true), treesGrid(season, 1)];
      for (const g of grids) {
        const off = new Set<string>();
        for (const c of g.data) if (c && !set.has(c)) off.add(c);
        expect([...off], season).toEqual([]);
      }
    }
  });
});

function fakeVillager(i: number, area: Villager['area'], ghost = false): Villager {
  const person = { id: `p${i}`, name: `人${i}`, relation: 'friend', affection: 100, avatar: randomAvatar('friend', (i + 1) / 40), createdAt: 0 } as unknown as Person;
  return { person, hearts: 1, golden: false, ghost, area, roofColor: '#000', recentlyMoved: false };
}

describe('村民站位与走动', () => {
  it('同区多人错开站、朝向不同；超出上限记 +N', () => {
    const vs = [0, 1, 2, 3, 4, 5].map((i) => fakeVillager(i, 'family'));
    const { actors, overflow } = placeVillagers(vs);
    expect(actors.length).toBe(4);
    const cells = new Set(actors.map((a) => `${a.x},${a.y}`));
    expect(cells.size).toBe(4);
    expect(new Set(actors.map((a) => a.dir)).size).toBeGreaterThanOrEqual(2);
    expect(overflow).toEqual([{ placement: PLACEMENTS[0], n: 2 }]);
  });

  it('走动只在本区可走格里，走出去还会回家；灰化的不动', () => {
    const vs = [fakeVillager(0, 'plaza'), fakeVillager(1, 'inn', true)];
    const { actors } = placeVillagers(vs);
    const ghost = actors[1];
    const gx = ghost.x, gy = ghost.y;
    let moved = false;
    for (let f = 0; f < 800; f++) {
      stepActors(actors, f, new Set());
      const a = actors[0];
      const cx = Math.round(a.x / 16), cy = Math.round(a.y / 16);
      if (a.x % 16 === 0 && a.y % 16 === 0) expect(AREA_CELLS.plaza.some(([x, y]) => x === cx && y === cy), `${cx},${cy}`).toBe(true);
      if (a.walking) moved = true;
    }
    expect(moved).toBe(true);
    expect(ghost.x).toBe(gx);
    expect(ghost.y).toBe(gy);
  });
});
