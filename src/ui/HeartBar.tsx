import { useEffect, useRef, useState } from 'react';
import { HEART, type HeartState } from '@/pixel/sprites/heart';
import { Sprite } from '@/pixel/Sprite';
import { SCORING } from '@/config/scoring';
import styles from './HeartBar.module.css';

interface Props {
  points: number;
  scale?: number;
  showText?: boolean;
  /** 涨心时那颗心放大弹一下 */
  animate?: boolean;
}

export function heartStates(points: number): HeartState[] {
  const per = SCORING.pointsPerHeart;
  const clamped = Math.max(0, Math.min(SCORING.maxPoints, points));
  const full = Math.floor(clamped / per);
  const rem = clamped - full * per;
  const states: HeartState[] = [];
  for (let i = 0; i < SCORING.maxHearts; i++) {
    if (i < full) states.push('full');
    else if (i === full && rem >= SCORING.halfHeartThreshold) states.push('half');
    else states.push('empty');
  }
  return states;
}

export function heartsOf(points: number): number {
  return Math.floor(Math.max(0, Math.min(SCORING.maxPoints, points)) / SCORING.pointsPerHeart);
}

export function HeartBar({ points, scale = 1, showText, animate = true }: Props) {
  const states = heartStates(points);
  const prev = useRef(states);
  const [bouncing, setBouncing] = useState<number | null>(null);

  useEffect(() => {
    if (!animate) return;
    const before = prev.current;
    const idx = states.findIndex((s, i) => s !== before[i] && s !== 'empty' && (before[i] === 'empty' || (before[i] === 'half' && s === 'full')));
    prev.current = states;
    if (idx >= 0) {
      setBouncing(idx);
      const t = setTimeout(() => setBouncing(null), 600);
      return () => clearTimeout(t);
    }
  }, [points]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={styles.bar} aria-label={`${heartsOf(points)} 颗心`}>
      <span className={styles.hearts} style={{ '--overlap': `${scale}px` } as React.CSSProperties}>
        {states.map((s, i) => (
          <span key={i} className={`${styles.heart} ${bouncing === i ? styles.bounce : ''}`}>
            <Sprite grid={HEART[s]} scale={scale} />
          </span>
        ))}
      </span>
      {showText && (
        <span className={styles.text}>
          {points}/{SCORING.maxPoints}
        </span>
      )}
    </div>
  );
}
