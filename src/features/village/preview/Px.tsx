import { useMemo } from 'react';
import { Grid } from '@/pixel/painter';
import { gridToDataURL } from '@/pixel/render';
import styles from './PreviewPage.module.css';

/** 把 Grid 画成 <img>，scale 为整数倍 */
export function Px({ grid, scale, title }: { grid: Grid; scale: number; title?: string }) {
  const src = useMemo(() => gridToDataURL(grid), [grid]);
  return <img src={src} width={grid.w * scale} height={grid.h * scale} alt={title ?? ''} title={title} className={styles.px} draggable={false} />;
}
