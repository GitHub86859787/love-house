import { useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '@/db/db';
import type { Person, Quest } from '@/db/types';
import { completeQuest, snoozeQuest, syncQuests, visibleQuests } from '@/db/quests';
import { Panel, Inset } from '@/ui/Panel';
import { Button } from '@/ui/Button';
import { Avatar } from '@/pixel/avatar/Avatar';
import { Sprite } from '@/pixel/Sprite';
import { icon, type IconName } from '@/pixel/sprites/icons';
import { useToast } from '@/ui/Toast';
import { play } from '@/audio/sound';
import { QUEST_KIND_LABEL } from './rules';
import { toDateKey } from '@/lib/date';
import styles from './TaskBoard.module.css';

const KIND_ICON: Record<Quest['kind'], IconName> = {
  birthday: 'cake',
  stale: 'chat',
  profile: 'question',
  milestone: 'star',
  holiday: 'gift',
  benmingnian: 'star',
  custom: 'edit',
  backup: 'book',
};

export function TaskBoard({ persons }: { persons: Person[] }) {
  const nav = useNavigate();
  const toast = useToast();
  const quests = useLiveQuery(() => db.quests.toArray(), []);
  const interactionsCount = useLiveQuery(() => db.interactions.count(), []);
  const settingsRec = useLiveQuery(() => db.settings.get('app'), []);

  // 人物 / 互动 / 设置一变就重新同步任务
  useEffect(() => {
    syncQuests().catch(() => {});
  }, [persons, interactionsCount, settingsRec]);

  const visible = useMemo(() => visibleQuests(quests ?? []), [quests]);
  const doneToday = useMemo(() => {
    const key = toDateKey();
    return (quests ?? []).filter((q) => q.status === 'done' && q.resolvedAt && toDateKey(new Date(q.resolvedAt)) === key).length;
  }, [quests]);
  const personOf = (id?: string) => persons.find((p) => p.id === id);

  const complete = async (q: Quest) => {
    await completeQuest(q.id);
    play('done');
    toast('完成！');
  };
  const skipAll = async () => {
    for (const q of visible) await snoozeQuest(q.id);
    play('click');
  };

  return (
    <Panel title="今日任务板">
      {visible.length === 0 ? (
        <Inset>
          <p style={{ color: 'var(--ink-soft)', fontSize: 'var(--fs-sm)' }}>
            {persons.length === 0 ? '任务板空空的。先认识几位村民，任务会自动出现。' : doneToday > 0 ? `今天的任务都做完了，完成 ${doneToday} 条。` : '今天没什么要做的，去村里走走吧。'}
          </p>
        </Inset>
      ) : (
        <div className={styles.list}>
          {visible.map((q) => {
            const p = personOf(q.personId);
            const go = () => (p ? nav(`/person/${p.id}`) : q.kind === 'backup' ? nav('/settings#data') : undefined);
            return (
              <div key={q.id} className={`${styles.item} px-corner-sm`}>
                <div className={styles.avatar} onClick={go}>
                  {p ? <Avatar config={p.avatar} scale={2} /> : <Sprite grid={icon(KIND_ICON[q.kind], '#5c3a1e')} scale={2} />}
                </div>
                <div className={styles.body} onClick={go}>
                  <div className={styles.title}>
                    <span className={`${styles.kind} px-corner-sm`}>{QUEST_KIND_LABEL[q.kind]}</span>
                    {q.title}
                  </div>
                  {q.description && <div className={styles.desc}>{q.description}</div>}
                </div>
                <div className={styles.actions}>
                  <Button size="small" variant="primary" iconName="check" aria-label="完成" onClick={() => complete(q)} />
                  <Button size="small" variant="ghost" iconName="close" aria-label="跳过今天" onClick={() => snoozeQuest(q.id)} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className={styles.footer}>
        <span>{doneToday > 0 ? `今天已完成 ${doneToday} 条` : '最多显示 5 条'}</span>
        {visible.length > 0 && (
          <Button size="small" variant="ghost" onClick={skipAll}>
            一键跳过今天
          </Button>
        )}
      </div>
    </Panel>
  );
}
