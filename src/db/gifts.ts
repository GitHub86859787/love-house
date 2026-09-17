import { db } from './db';
import { normalizeGiftName } from '@/features/collection/gifts';

/** 合并两张礼物卡：把 from 名下的送礼记录改名为 to */
export async function mergeGiftCards(from: string, to: string): Promise<number> {
  const fromKey = normalizeGiftName(from);
  let n = 0;
  await db.transaction('rw', db.interactions, async () => {
    const all = await db.interactions.filter((i) => Boolean(i.gift) && normalizeGiftName(i.gift!.name) === fromKey).toArray();
    for (const it of all) {
      await db.interactions.update(it.id, { gift: { ...it.gift!, name: to.trim() } });
      n++;
    }
  });
  return n;
}
