import type { Interaction, Person, PreferenceTier } from '@/db/types';
import { TIER_ORDER } from '@/config/reactions';

export interface GiftCard {
  name: string;
  count: number;
  /** 最常见的反应档位 */
  tier: PreferenceTier;
  lastAt: number;
  totalPrice: number;
  recipients: { personId: string; name: string; tier: PreferenceTier; count: number; lastAt: number }[];
}

export function normalizeGiftName(name: string): string {
  return name.trim().toLowerCase();
}

/** 把送礼 / 收礼互动按礼物名合并成卡片 */
export function buildGiftCards(interactions: Interaction[], persons: Person[], type: 'gift' | 'receivedGift'): GiftCard[] {
  const map = new Map<string, GiftCard & { tierCount: Record<PreferenceTier, number> }>();
  const personName = (id: string) => {
    const p = persons.find((x) => x.id === id);
    return p ? p.nickname || p.name : '（已删除）';
  };
  for (const it of interactions) {
    if (it.type !== type || !it.gift) continue;
    const key = normalizeGiftName(it.gift.name);
    if (!key) continue;
    let card = map.get(key);
    if (!card) {
      card = { name: it.gift.name.trim(), count: 0, tier: 'neutral', lastAt: 0, totalPrice: 0, recipients: [], tierCount: { love: 0, like: 0, neutral: 0, dislike: 0, hate: 0 } };
      map.set(key, card);
    }
    card.count++;
    card.lastAt = Math.max(card.lastAt, it.at);
    card.totalPrice += it.gift.price ?? 0;
    card.tierCount[it.gift.tier]++;
    let r = card.recipients.find((x) => x.personId === it.personId);
    if (!r) {
      r = { personId: it.personId, name: personName(it.personId), tier: it.gift.tier, count: 0, lastAt: 0 };
      card.recipients.push(r);
    }
    r.count++;
    r.lastAt = Math.max(r.lastAt, it.at);
    r.tier = it.gift.tier;
  }
  return [...map.values()]
    .map(({ tierCount, ...c }) => ({ ...c, tier: TIER_ORDER.reduce((best, t) => (tierCount[t] > tierCount[best] ? t : best), 'neutral' as PreferenceTier) }))
    .sort((a, b) => b.lastAt - a.lastAt);
}
