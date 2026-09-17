import { useEffect, useState } from 'react';
import type { Person } from '@/db/types';
import { Avatar } from '@/pixel/avatar/Avatar';
import { Sprite } from '@/pixel/Sprite';
import { icon, type IconName } from '@/pixel/sprites/icons';
import { HEART_SMALL } from '@/pixel/sprites/heart';
import styles from './ScoreAnimation.module.css';
import { play } from '@/audio/sound';

interface Props {
  person: Person;
  points: number;
  /** 飞过去的图标（送礼是礼物盒，其他是类型图标） */
  iconName: IconName;
  iconColor?: string;
  /** 图标命中头像那一刻（此时更新心条，和 +N 同步） */
  onHit?: () => void;
  onDone?: () => void;
}

const PARTICLES = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2;
  return { px: `${Math.round(Math.cos(a) * 56)}px`, py: `${Math.round(Math.sin(a) * 48)}px`, delay: `${i * 30}ms` };
});

/** 记录互动后的得分动画：图标抛物线飞向头像 → 头像弹一下 → 飘出 +N 与像素心粒子 */
export function ScoreAnimation({ person, points, iconName, iconColor = '#f5c542', onHit, onDone }: Props) {
  const [phase, setPhase] = useState<'fly' | 'hit'>('fly');
  useEffect(() => {
    const t1 = window.setTimeout(() => {
      setPhase('hit');
      play(points < 0 ? 'giftBad' : points === 0 ? 'pop' : iconName === 'gift' ? 'giftHit' : 'heartUp');
      onHit?.();
    }, 700);
    const t2 = window.setTimeout(() => onDone?.(), 1700);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [onDone, onHit, points, iconName]);

  const flyVars = { '--fly-dx': 'calc(50vw - 64px)', '--fly-end': '64px' } as React.CSSProperties;

  return (
    <div className={styles.stage}>
      <div className={`${styles.avatar} ${phase === 'hit' ? styles.avatarHit : ''}`}>
        <Avatar config={person.avatar} scale={4} />
      </div>
      {phase === 'fly' && (
        <div className={styles.flyer} style={flyVars}>
          <div className={styles.flyerInner}>
            <Sprite grid={icon(iconName, iconColor)} scale={3} />
          </div>
        </div>
      )}
      {phase === 'hit' && (
        <>
          <div className={`${styles.points} ${points < 0 ? styles.pointsNeg : points === 0 ? styles.pointsZero : ''}`}>
            {points > 0 ? '+' : ''}
            {points}
          </div>
          {points > 0 &&
            PARTICLES.map((p, i) => (
              <span key={i} className={styles.particle} style={{ '--px': p.px, '--py': p.py, animationDelay: p.delay } as React.CSSProperties}>
                <Sprite grid={HEART_SMALL} scale={2} />
              </span>
            ))}
        </>
      )}
    </div>
  );
}
