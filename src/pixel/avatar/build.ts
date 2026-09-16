import { Grid } from '../painter';
import type { AvatarConfig } from '@/db/types';
import { ACCESSORIES, AVATAR_SIZE, EYES, FACES, HAIRS, INK, SHIRTS, HAIR_COLORS, SKIN_COLORS, EYE_COLORS, SHIRT_COLORS, ACCESSORY_COLORS } from './parts';

const cache = new Map<string, Grid>();

function pick<T>(arr: readonly T[], i: number): T {
  return arr[((i % arr.length) + arr.length) % arr.length];
}

/** 按配置拼装头像；顺序：上衣 → 脸 → 眼 → 头发 → 配饰 → 整体描边 */
export function buildAvatar(cfg: AvatarConfig, ghost = false): Grid {
  const key = JSON.stringify(cfg) + (ghost ? ':ghost' : '');
  const hit = cache.get(key);
  if (hit) return hit;

  const g = new Grid(AVATAR_SIZE, AVATAR_SIZE);
  pick(SHIRTS, cfg.shirt).draw(g, cfg.shirtColor);
  pick(FACES, cfg.face).draw(g, cfg.skinColor);
  pick(EYES, cfg.eyes).draw(g, cfg.eyeColor);
  pick(HAIRS, cfg.hair).draw(g, cfg.hairColor);
  pick(ACCESSORIES, cfg.accessory).draw(g, cfg.accessoryColor);
  g.outline(INK);

  if (ghost) {
    // 久未联系：整体变灰
    for (let k = 0; k < g.data.length; k++) {
      const c = g.data[k];
      if (!c) continue;
      const n = parseInt(c.slice(1), 16);
      const r = (n >> 16) & 255;
      const gg = (n >> 8) & 255;
      const b = n & 255;
      const l = Math.round(0.3 * r + 0.59 * gg + 0.11 * b);
      const v = Math.round(l * 0.6 + 90);
      g.data[k] = `#${v.toString(16).padStart(2, '0').repeat(3)}`;
    }
  }
  if (cache.size > 500) cache.clear();
  cache.set(key, g);
  return g;
}

export function randomAvatar(seed = Math.random()): AvatarConfig {
  let s = Math.floor(seed * 2 ** 31) || 1;
  const rnd = () => {
    s = (s * 48271) % 2147483647;
    return s / 2147483647;
  };
  const r = (n: number) => Math.floor(rnd() * n);
  return {
    face: r(FACES.length),
    skinColor: SKIN_COLORS[r(SKIN_COLORS.length)],
    hair: r(HAIRS.length),
    hairColor: HAIR_COLORS[r(HAIR_COLORS.length)],
    eyes: r(EYES.length),
    eyeColor: EYE_COLORS[r(EYE_COLORS.length)],
    shirt: r(SHIRTS.length),
    shirtColor: SHIRT_COLORS[r(SHIRT_COLORS.length)],
    accessory: r(ACCESSORIES.length),
    accessoryColor: ACCESSORY_COLORS[r(ACCESSORY_COLORS.length)],
  };
}

export const DEFAULT_AVATAR: AvatarConfig = {
  face: 0,
  skinColor: SKIN_COLORS[1],
  hair: 0,
  hairColor: HAIR_COLORS[1],
  eyes: 0,
  eyeColor: EYE_COLORS[0],
  shirt: 0,
  shirtColor: SHIRT_COLORS[0],
  accessory: 0,
  accessoryColor: ACCESSORY_COLORS[0],
};
