import { useMemo, type CSSProperties } from 'react';
import type { Grid } from './painter';
import { gridToDataURL } from './render';

interface Props {
  grid: Grid;
  /** 放大倍数，保持整数以免模糊 */
  scale?: number;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

/** 把 Grid 渲染成 <img>，用 image-rendering: pixelated 放大 */
export function Sprite({ grid, scale = 2, alt = '', className, style, title }: Props) {
  const src = useMemo(() => gridToDataURL(grid), [grid]);
  return (
    <img
      src={src}
      alt={alt}
      title={title}
      width={grid.w * scale}
      height={grid.h * scale}
      className={className}
      style={{ imageRendering: 'pixelated', ...style }}
      draggable={false}
    />
  );
}
