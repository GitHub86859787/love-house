import type { NatalChart } from '@/fortune/natal';
import { SIGN_GLYPHS } from '@/fortune/natal';

/**
 * 像素风简化星盘：外圈十二星座，行星符号落在对应黄经位置。
 * 有上升点时以上升点为左侧（9 点钟方向），否则以白羊 0° 为左侧。
 * 用 SVG 画，crispEdges 保持像素感。
 */
export function NatalWheel({ natal, size = 280 }: { natal: NatalChart; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2 - 4;
  const rSigns = rOuter - 22;
  const rPlanets = rSigns - 26;
  const rInner = rPlanets - 26;
  const asc = natal.asc?.lon ?? 0;
  // 黄经 → 屏幕角度：上升点在正左（180°），黄道逆时针增加（占星盘惯例）
  const ang = (lon: number) => ((180 - (lon - asc)) * Math.PI) / 180;
  const pt = (lon: number, r: number) => ({ x: Math.round(cx + r * Math.cos(ang(lon))), y: Math.round(cy - r * Math.sin(ang(lon))) });

  // 行星防重叠：同一星座内按度数排序后轻微错开半径
  const sorted = [...natal.bodies].sort((a, b) => a.lon - b.lon);
  const offsets = new Map<string, number>();
  for (let i = 0; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const close = prev && Math.abs(sorted[i].lon - prev.lon) < 9;
    offsets.set(sorted[i].key, close ? ((offsets.get(prev.key) ?? 0) + 1) % 3 : 0);
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ shapeRendering: 'crispEdges', display: 'block', margin: '0 auto', fontFamily: 'var(--font-pixel)' }} aria-label="本命盘">
      <circle cx={cx} cy={cy} r={rOuter} fill="#2b1740" stroke="#9a6fd0" strokeWidth={4} />
      <circle cx={cx} cy={cy} r={rSigns} fill="#3a2058" stroke="#6b3fa0" strokeWidth={2} />
      <circle cx={cx} cy={cy} r={rInner} fill="#1c1c24" stroke="#6b3fa0" strokeWidth={2} />
      {/* 十二星座分隔线与符号 */}
      {Array.from({ length: 12 }, (_, i) => {
        const start = i * 30;
        const a = pt(start, rSigns);
        const b = pt(start, rOuter);
        const mid = pt(start + 15, (rSigns + rOuter) / 2);
        const isSun = natal.bodies[0].signIndex === i;
        return (
          <g key={i}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#9a6fd0" strokeWidth={2} />
            <text x={mid.x} y={mid.y + 5} textAnchor="middle" fontSize={14} fill={isSun ? '#f5c542' : '#e8d5a3'}>
              {SIGN_GLYPHS[i]}
            </text>
          </g>
        );
      })}
      {/* 宫位线（等宫制）与宫号 */}
      {natal.houses?.map((h, i) => {
        const a = pt(h, rInner);
        const b = pt(h, rSigns);
        const mid = pt(h + 15, rInner - 14);
        return (
          <g key={i}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={i === 0 || i === 9 ? '#f5c542' : '#4a2a73'} strokeWidth={i === 0 || i === 9 ? 3 : 1} />
            <text x={mid.x} y={mid.y + 4} textAnchor="middle" fontSize={10} fill="#7a5a9a">
              {i + 1}
            </text>
          </g>
        );
      })}
      {/* 行星 */}
      {natal.bodies.map((b) => {
        const off = (offsets.get(b.key) ?? 0) * 9;
        const p = pt(b.lon, rPlanets - off);
        const tick = pt(b.lon, rSigns);
        const tick2 = pt(b.lon, rSigns - 6);
        return (
          <g key={b.key}>
            <line x1={tick.x} y1={tick.y} x2={tick2.x} y2={tick2.y} stroke="#f5c542" strokeWidth={2} />
            <rect x={p.x - 9} y={p.y - 9} width={18} height={18} fill="#2b1740" stroke="#f5c542" strokeWidth={1} />
            <text x={p.x} y={p.y + 5} textAnchor="middle" fontSize={13} fill={b.key === 'sun' ? '#f5c542' : b.key === 'moon' ? '#b6e0f7' : '#fff8e7'}>
              {b.glyph}
            </text>
          </g>
        );
      })}
      {/* 上升 / 天顶标记 */}
      {natal.asc && (
        <text x={pt(natal.asc.lon, rOuter + 0).x + 12} y={pt(natal.asc.lon, rOuter).y + 4} fontSize={10} fill="#f5c542">
          ASC
        </text>
      )}
      {natal.mc && (
        <text x={pt(natal.mc.lon, rSigns - 10).x} y={pt(natal.mc.lon, rSigns - 10).y + 4} textAnchor="middle" fontSize={10} fill="#f5c542">
          MC
        </text>
      )}
      {!natal.asc && (
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize={10} fill="#7a5a9a">
          无出生地
        </text>
      )}
    </svg>
  );
}
