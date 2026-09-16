import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Person } from '@/db/types';
import { RELATIONS } from '@/config/relations';
import { SCORING } from '@/config/scoring';
import { Avatar } from '@/pixel/avatar/Avatar';
import { Sprite } from '@/pixel/Sprite';
import { GATE, QUESTION_BUBBLE, bush, house, tree } from '@/pixel/sprites/village';
import { HEART_SMALL } from '@/pixel/sprites/heart';
import { heartsOf } from '@/ui/HeartBar';
import { currentSeason, SEASON_PALETTE } from '@/lib/season';
import { daysBetween } from '@/lib/date';
import styles from './VillageScene.module.css';

interface Props {
  persons: Person[];
}

export function isGhost(p: Person, now = new Date()): boolean {
  const last = p.lastInteractionAt ?? p.createdAt;
  return daysBetween(new Date(last), now) > SCORING.ghostAfterDays;
}

/** 横向可滑动的小村庄：心多的离村口近 */
export function VillageScene({ persons }: Props) {
  const nav = useNavigate();
  const season = currentSeason();
  const pal = SEASON_PALETTE[season];
  const treeGrid = useMemo(() => tree(pal.leaf), [pal.leaf]);
  const bushGrid = useMemo(() => bush(pal.grass === '#e8f0f4' ? '#c3d3dc' : pal.grassDark), [pal]);

  const vars = {
    '--sky-c': pal.sky,
    '--grass-c': pal.grass,
    '--grass-dark-c': pal.grassDark,
    '--path-c': pal.path,
  } as React.CSSProperties;

  return (
    <div className={styles.scene} style={vars} data-season={season}>
      <div className={styles.track}>
        <div className={styles.gate}>
          <Sprite grid={GATE} scale={2} className={styles.gateSprite} />
          <span className={styles.gateLabel}>村口</span>
        </div>
        {persons.map((p, i) => {
          const hearts = heartsOf(p.affection);
          const ghost = isGhost(p);
          const golden = hearts >= SCORING.maxHearts;
          return (
            <div key={p.id} className={styles.slot} onClick={() => nav(`/person/${p.id}`)} role="link" aria-label={p.name}>
              {i % 2 === 1 && <Sprite grid={treeGrid} scale={2} className={styles.tree} style={{ left: 0 }} />}
              {i % 3 === 0 && <Sprite grid={bushGrid} scale={2} className={styles.bush} style={{ left: 84 }} />}
              <Sprite grid={house(RELATIONS[p.relation].roofColor, golden)} scale={2} className={styles.house} />
              <div className={`${styles.villager} ${ghost ? '' : styles.bob}`} style={{ animationDelay: `${(i % 4) * 150}ms` }}>
                <Avatar config={p.avatar} scale={2} ghost={ghost} />
              </div>
              {ghost && <Sprite grid={QUESTION_BUBBLE} scale={2} className={styles.bubble} />}
              <span className={styles.name}>{p.nickname || p.name}</span>
              <div className={styles.hearts}>
                {Array.from({ length: Math.min(hearts, 10) }).map((_, k) => (
                  <Sprite key={k} grid={HEART_SMALL} scale={1} />
                ))}
              </div>
            </div>
          );
        })}
        {persons.length === 0 && <div className={styles.empty}>村里还没有人，点下面的按钮认识第一位村民吧</div>}
      </div>
    </div>
  );
}
