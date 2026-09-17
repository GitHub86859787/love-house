import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { ACHIEVEMENTS } from '@/config/achievements';
import { useToast } from '@/ui/Toast';
import { play } from '@/audio/sound';

/** 全局监听：数据一变就检查成就，新解锁的弹提示 */
export function AchievementWatcher() {
  const toast = useToast();
  const persons = useLiveQuery(() => db.persons.toArray(), []);
  const interactions = useLiveQuery(() => db.interactions.toArray(), []);
  const quests = useLiveQuery(() => db.quests.toArray(), []);
  const unlocked = useLiveQuery(() => db.achievements.toArray(), []);

  useEffect(() => {
    if (!persons || !interactions || !quests || !unlocked) return;
    const have = new Set(unlocked.map((a) => a.id));
    const ctx = { persons, interactions, quests, unlocked, now: new Date() };
    const fresh = ACHIEVEMENTS.filter((a) => !have.has(a.id) && a.check(ctx));
    if (fresh.length === 0) return;
    const now = Date.now();
    db.achievements
      .bulkAdd(fresh.map((a) => ({ id: a.id, unlockedAt: now })))
      .then(() => {
        play('achievement');
        fresh.forEach((a, i) => setTimeout(() => toast(`🏆 成就解锁：${a.title}`), i * 600));
      })
      .catch(() => {});
  }, [persons, interactions, quests, unlocked, toast]);

  return null;
}
