import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Person } from '@/db/types';
import type { VillageModel } from '@/features/village/model';
import { Avatar } from '@/pixel/avatar/Avatar';
import { Sprite } from '@/pixel/Sprite';
import { GATE, HOME_SIGN, QUESTION_BUBBLE, TENT, bush, house, tree } from '@/pixel/sprites/village';
import { HEART_SMALL } from '@/pixel/sprites/heart';
import { currentSeason, SEASON_PALETTE } from '@/lib/season';
import { FORTUNE_TELLER } from '@/config/fortune-prompt';
import { fortuneTellerAvatar } from '@/features/fortune/teller';
import { play } from '@/audio/sound';
import styles from './VillageScene.module.css';

interface Props {
  model: VillageModel;
}

/**
 * 横向可滑动的小村庄（当前实现：一排房子）。
 * 只消费 VillageModel，不碰数据库；未来重做分区村庄时整体替换本组件即可。
 */
export function VillageScene({ model }: Props) {
  const nav = useNavigate();
  const season = currentSeason();
  const pal = SEASON_PALETTE[season];
  const treeGrid = useMemo(() => tree(pal.leaf), [pal.leaf]);
  const bushGrid = useMemo(() => bush(pal.grass === '#e8f0f4' ? '#c3d3dc' : pal.grassDark), [pal]);
  const [entering, setEntering] = useState(false);

  const vars = {
    '--sky-c': pal.sky,
    '--grass-c': pal.grass,
    '--grass-dark-c': pal.grassDark,
    '--path-c': pal.path,
  } as React.CSSProperties;

  const enterTent = () => {
    if (entering) return;
    play('pop');
    setEntering(true);
    // 走进去的过场：画面变暗 → 帐篷内景淡入
    window.setTimeout(() => nav('/fortune'), 420);
  };

  const goMe = () => nav(model.me ? `/person/${model.me.id}` : '/person/new?me=1');

  return (
    <div className={`${styles.scene} ${entering ? styles.entering : ''}`} style={vars} data-season={season}>
      <div className={styles.track}>
        <div className={styles.gate}>
          <Sprite grid={GATE} scale={2} className={styles.gateSprite} />
          <span className={styles.gateLabel}>村口</span>
        </div>

        {/* 我的家：最左边 */}
        <div className={styles.slot} onClick={goMe} role="link" aria-label="我的家">
          <Sprite grid={house('#f5c542', false)} scale={2} className={styles.house} />
          <Sprite grid={HOME_SIGN} scale={2} className={styles.homeSign} />
          <div className={styles.villager}>{model.me ? <Avatar config={model.me.avatar} scale={2} /> : <div className={styles.meEmpty}>?</div>}</div>
          <span className={styles.name}>{model.me ? model.me.nickname || model.me.name : '我'}</span>
          <div className={styles.hearts}>
            <span className={styles.homeTag}>{model.me ? '我的家' : '建我的档案'}</span>
          </div>
        </div>

        {model.villagers.map((v, i) => (
          <VillagerSlot key={v.person.id} index={i} person={v.person} hearts={v.hearts} golden={v.golden} ghost={v.ghost} roofColor={v.roofColor} moved={v.recentlyMoved} treeGrid={treeGrid} bushGrid={bushGrid} onClick={() => nav(`/person/${v.person.id}`)} />
        ))}

        {/* 星婆婆的帐篷：村口另一头 */}
        <div className={`${styles.slot} ${styles.tentSlot}`} onClick={enterTent} role="link" aria-label="星婆婆的帐篷">
          <Sprite grid={TENT} scale={2} className={styles.tent} />
          <div className={styles.tentTeller}>
            <Avatar config={fortuneTellerAvatar} scale={2} />
          </div>
          <span className={styles.name} style={{ bottom: 8 }}>
            {FORTUNE_TELLER.name}的帐篷
          </span>
        </div>

        {model.villagers.length === 0 && <div className={styles.empty}>村里还没有人，点下面的按钮认识第一位村民吧</div>}
      </div>
    </div>
  );
}

interface SlotProps {
  index: number;
  person: Person;
  hearts: number;
  golden: boolean;
  ghost: boolean;
  roofColor: string;
  moved: boolean;
  treeGrid: ReturnType<typeof tree>;
  bushGrid: ReturnType<typeof bush>;
  onClick: () => void;
}

function VillagerSlot({ index, person, hearts, golden, ghost, roofColor, moved, treeGrid, bushGrid, onClick }: SlotProps) {
  return (
    <div className={styles.slot} onClick={onClick} role="link" aria-label={person.name}>
      {index % 2 === 1 && <Sprite grid={treeGrid} scale={2} className={styles.tree} style={{ left: 0 }} />}
      {index % 3 === 0 && <Sprite grid={bushGrid} scale={2} className={styles.bush} style={{ left: 84 }} />}
      <Sprite grid={house(roofColor, golden)} scale={2} className={`${styles.house} ${moved ? styles.roofFlash : ''}`} />
      <div className={`${styles.villager} ${ghost ? '' : styles.bob}`} style={{ animationDelay: `${(index % 4) * 150}ms` }}>
        <Avatar config={person.avatar} scale={2} ghost={ghost} />
      </div>
      {ghost && <Sprite grid={QUESTION_BUBBLE} scale={2} className={styles.bubble} />}
      <span className={styles.name}>{person.nickname || person.name}</span>
      <div className={styles.hearts}>
        {Array.from({ length: Math.min(hearts, 10) }).map((_, k) => (
          <Sprite key={k} grid={HEART_SMALL} scale={1} />
        ))}
      </div>
    </div>
  );
}
