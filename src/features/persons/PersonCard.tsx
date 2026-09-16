import { useNavigate } from 'react-router-dom';
import type { Person } from '@/db/types';
import { RELATIONS } from '@/config/relations';
import { Avatar } from '@/pixel/avatar/Avatar';
import { HeartBar, heartsOf } from '@/ui/HeartBar';
import { Panel } from '@/ui/Panel';
import { formatRelative } from '@/lib/date';
import { isGhost } from './VillageScene';
import { SCORING } from '@/config/scoring';
import styles from './PersonCard.module.css';

export function PersonCard({ person }: { person: Person }) {
  const nav = useNavigate();
  const ghost = isGhost(person);
  return (
    <Panel tight golden={heartsOf(person.affection) >= SCORING.maxHearts} className={styles.card} onClick={() => nav(`/person/${person.id}`)}>
      <div className={`${styles.avatarBox} px-corner-sm`}>
        <Avatar config={person.avatar} scale={2} ghost={ghost} />
      </div>
      <div className={styles.body}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{person.name}</span>
          <span className={`${styles.relation} px-corner-sm`}>{RELATIONS[person.relation].label}</span>
        </div>
        <HeartBar points={person.affection} scale={1} animate={false} />
        <span className={styles.meta}>
          {person.lastInteractionAt ? `上次互动 ${formatRelative(person.lastInteractionAt)}` : '还没有互动记录'}
        </span>
      </div>
    </Panel>
  );
}
