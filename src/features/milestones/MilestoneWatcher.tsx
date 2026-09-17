import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { Person } from '@/db/types';
import { MILESTONES, type MilestoneConfig } from '@/config/milestones';
import { updatePerson } from '@/db/persons';
import { play } from '@/audio/sound';
import { MilestoneCard } from './MilestoneCard';

/** 全局监听：有人到达新的里程碑心数就弹事件卡（延迟一点，让得分动画先播完） */
export function MilestoneWatcher() {
  const persons = useLiveQuery(() => db.persons.filter((p) => !p.isMe).toArray(), []);
  const [queue, setQueue] = useState<{ person: Person; milestone: MilestoneConfig }[]>([]);
  const [current, setCurrent] = useState<{ person: Person; milestone: MilestoneConfig } | null>(null);

  useEffect(() => {
    if (!persons) return;
    const next: { person: Person; milestone: MilestoneConfig }[] = [];
    for (const p of persons) {
      const hearts = Math.floor(p.affection / 250);
      for (const m of MILESTONES) {
        if (hearts >= m.hearts && !p.milestonesUnlocked.includes(m.hearts)) next.push({ person: p, milestone: m });
      }
    }
    if (next.length === 0) return;
    // 先写入，避免重复触发；卡片按顺序弹
    Promise.all(
      next.map(({ person, milestone }) =>
        updatePerson(person.id, { milestonesUnlocked: [...new Set([...person.milestonesUnlocked, milestone.hearts])] }),
      ),
    ).then(() => setQueue((q) => [...q, ...next]));
  }, [persons]);

  useEffect(() => {
    if (current || queue.length === 0) return;
    const t = window.setTimeout(() => {
      setCurrent(queue[0]);
      setQueue((q) => q.slice(1));
      play('milestone');
    }, 1900);
    return () => window.clearTimeout(t);
  }, [queue, current]);

  return <MilestoneCard person={current?.person ?? null} milestone={current?.milestone ?? null} onClose={() => setCurrent(null)} />;
}
