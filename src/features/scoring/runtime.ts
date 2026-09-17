import { db } from '@/db/db';
import { getSettings, updateSettings } from '@/db/settings';
import { toDateKey } from '@/lib/date';
import { computeDecay } from './decay';

/** 每次打开 App（每天一次）补算所有人的衰减 */
export async function runDecayIfNeeded(today = new Date()): Promise<number> {
  const settings = await getSettings();
  const todayKey = toDateKey(today);
  if (settings.lastDecayRunDate === todayKey) return 0;
  let changed = 0;
  if (settings.decayEnabled) {
    await db.transaction('rw', db.persons, async () => {
      const all = await db.persons.toArray();
      for (const p of all) {
        const r = computeDecay(p, settings, today);
        if (r.lost > 0 || r.lastDecayDate !== p.lastDecayDate) {
          await db.persons.update(p.id, { affection: r.affection, lastDecayDate: r.lastDecayDate });
          if (r.lost > 0) changed++;
        }
      }
    });
  }
  await updateSettings({ lastDecayRunDate: todayKey });
  return changed;
}
