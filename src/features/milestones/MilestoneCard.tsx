import type { MilestoneConfig } from '@/config/milestones';
import type { Person } from '@/db/types';
import { Modal } from '@/ui/Modal';
import { Button } from '@/ui/Button';
import { Avatar } from '@/pixel/avatar/Avatar';
import { Sprite } from '@/pixel/Sprite';
import { HEART } from '@/pixel/sprites/heart';
import { icon } from '@/pixel/sprites/icons';
import styles from './MilestoneCard.module.css';

interface Props {
  person: Person | null;
  milestone: MilestoneConfig | null;
  onClose: () => void;
  /** 回看模式：不显示"解锁"字样 */
  replay?: boolean;
}

const SPARKS = Array.from({ length: 10 }, (_, i) => {
  const a = (i / 10) * Math.PI * 2;
  return { px: `${Math.round(Math.cos(a) * 90)}px`, py: `${Math.round(Math.sin(a) * 70)}px`, delay: `${i * 40}ms` };
});

/** 像素风事件卡：到达心数时弹出 */
export function MilestoneCard({ person, milestone, onClose, replay }: Props) {
  if (!person || !milestone) return null;
  const golden = milestone.hearts >= 10;
  return (
    <Modal open title={replay ? '里程碑回看' : '关系里程碑'} onClose={onClose} golden={golden}>
      <div className={styles.card}>
        <span className={`${styles.ribbon} px-corner-sm`}>{milestone.hearts} 颗心</span>
        <div style={{ position: 'relative' }}>
          <Avatar config={person.avatar} scale={5} />
          {!replay &&
            SPARKS.map((s, i) => (
              <span key={i} className={styles.sparkle} style={{ left: 48, top: 48, '--px': s.px, '--py': s.py, animationDelay: s.delay } as React.CSSProperties}>
                <Sprite grid={icon('star', golden ? '#f5c542' : '#e6323c')} scale={1} />
              </span>
            ))}
        </div>
        <div className={styles.hearts}>
          {Array.from({ length: 10 }).map((_, i) => (
            <Sprite key={i} grid={HEART[i < milestone.hearts ? 'full' : 'empty']} scale={1} />
          ))}
        </div>
        <div className={styles.title}>{milestone.title}</div>
        <p className={styles.desc}>
          {person.nickname || person.name}：{milestone.description}
        </p>
        {milestone.unlocks.length > 0 && (
          <div className={styles.unlocks}>
            <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--gold-dark)' }}>{replay ? '这一级的任务' : '解锁新任务'}</div>
            {milestone.unlocks.map((u) => (
              <div key={u.title} className={`${styles.unlock} px-corner-sm`}>
                <Sprite grid={icon('star', '#b8891c')} scale={1} />
                {u.title}
              </div>
            ))}
          </div>
        )}
        <Button variant="primary" block onClick={onClose}>
          {replay ? '关闭' : golden ? '进入挚友殿堂' : '继续'}
        </Button>
      </div>
    </Modal>
  );
}
