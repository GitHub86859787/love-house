import type { PreferenceTier } from '@/config/reactions';
import { Sprite } from '@/pixel/Sprite';
import { CIRCLE_SMALL, CROSS_SMALL, HEART_SMALL } from '@/pixel/sprites/heart';

/** 五档的像素图标：最爱两颗心 / 喜欢一颗心 / 一般空心圆 / 讨厌一个叉 / 最讨厌两个叉 */
export function TierIcon({ tier, scale = 2 }: { tier: PreferenceTier; scale?: number }) {
  const grid = tier === 'love' || tier === 'like' ? HEART_SMALL : tier === 'neutral' ? CIRCLE_SMALL : CROSS_SMALL;
  const count = tier === 'love' || tier === 'hate' ? 2 : 1;
  return (
    <span style={{ display: 'inline-flex', gap: 2, verticalAlign: 'middle', flex: 'none' }} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <Sprite key={i} grid={grid} scale={scale} />
      ))}
    </span>
  );
}
