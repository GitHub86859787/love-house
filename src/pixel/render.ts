import type { Grid } from './painter';

const cache = new Map<string, string>();

/** 把网格渲染为 PNG data URL（带缓存，同样的图只画一次） */
export function gridToDataURL(grid: Grid): string {
  const key = grid.key();
  const hit = cache.get(key);
  if (hit) return hit;
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = grid.w;
  canvas.height = grid.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const img = ctx.createImageData(grid.w, grid.h);
  for (let k = 0; k < grid.data.length; k++) {
    const c = grid.data[k];
    if (!c) continue;
    const h = c.replace('#', '');
    const full = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
    const n = parseInt(full, 16);
    img.data[k * 4] = (n >> 16) & 255;
    img.data[k * 4 + 1] = (n >> 8) & 255;
    img.data[k * 4 + 2] = n & 255;
    img.data[k * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const url = canvas.toDataURL('image/png');
  if (cache.size > 2000) cache.clear();
  cache.set(key, url);
  return url;
}
