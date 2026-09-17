import { db } from './db';
import type { FortuneCache, Person, Preference } from './types';
import { uid } from '@/lib/id';
import type { FortuneData, Reading, Synastry } from '@/fortune/schemas';

export function fortuneData(p: Person): FortuneData | null {
  return (p.fortune?.data as FortuneData | undefined) ?? null;
}

/** 保存解读；推测喜好自动写入「占卜师的猜测」分组（source = fortune） */
export async function saveReading(person: Person, reading: Reading, inputHash: string): Promise<void> {
  const prev = person.fortune;
  const now = Date.now();
  const data: FortuneData = { reading: { ...reading, traitVerdicts: reading.traits.map(() => null) }, likesWritten: true };
  // 旧的猜测清掉，换成新的
  const kept = person.preferences.filter((p) => p.source !== 'fortune');
  const rejected = new Set(prev?.rejected ?? []);
  const guesses: Preference[] = reading.guessedLikes
    .filter((g) => !rejected.has(g.name))
    .map((g) => ({ id: uid(), name: g.name, category: g.category, tier: g.tier, note: g.basis, source: 'fortune', createdAt: now }));
  const fortune: FortuneCache = {
    inputHash,
    createdAt: now,
    data,
    rejected: prev?.rejected ?? [],
    hits: prev?.hits ?? 0,
    misses: prev?.misses ?? 0,
    lastAskedAt: now,
  };
  // 保留合盘缓存
  const prevData = prev?.data as FortuneData | undefined;
  if (prevData?.synastry) data.synastry = prevData.synastry;
  await db.persons.update(person.id, { fortune, preferences: [...kept, ...guesses], updatedAt: now });
}

export async function saveSynastry(person: Person, synastry: Synastry, inputHash: string): Promise<void> {
  const now = Date.now();
  const data = (fortuneData(person) ?? { reading: { dialogue: [], traits: [], guessedLikes: [], tips: [], topics: [], systems: { zodiac: null, numerology: null, bazi: null } }, likesWritten: false }) as FortuneData;
  data.synastry = { data: synastry, inputHash, createdAt: now };
  const fortune: FortuneCache = {
    inputHash: person.fortune?.inputHash ?? '',
    createdAt: person.fortune?.createdAt ?? now,
    data,
    rejected: person.fortune?.rejected ?? [],
    hits: person.fortune?.hits ?? 0,
    misses: person.fortune?.misses ?? 0,
    lastAskedAt: person.fortune?.lastAskedAt,
  };
  await db.persons.update(person.id, { fortune, updatedAt: now });
}

/** 性格特点标记 准 / 不准 */
export async function markTrait(person: Person, index: number, verdict: 'hit' | 'miss'): Promise<void> {
  const data = fortuneData(person);
  if (!data || !person.fortune) return;
  const verdicts = [...(data.reading.traitVerdicts ?? data.reading.traits.map(() => null))];
  const prevV = verdicts[index];
  if (prevV === verdict) return;
  verdicts[index] = verdict;
  const trait = data.reading.traits[index];
  const rejected = new Set(person.fortune.rejected);
  if (verdict === 'miss') rejected.add(trait.text);
  else rejected.delete(trait.text);
  const hits = person.fortune.hits + (verdict === 'hit' ? 1 : 0) - (prevV === 'hit' ? 1 : 0);
  const misses = person.fortune.misses + (verdict === 'miss' ? 1 : 0) - (prevV === 'miss' ? 1 : 0);
  await db.persons.update(person.id, {
    fortune: { ...person.fortune, data: { ...data, reading: { ...data.reading, traitVerdicts: verdicts } }, rejected: [...rejected], hits, misses },
  });
}

/** 推测喜好：确认 → 正式条目（来源占卜确认）；不准 → 删除并记入 rejected */
export async function resolveGuess(person: Person, prefId: string, verdict: 'confirm' | 'miss'): Promise<void> {
  const pref = person.preferences.find((p) => p.id === prefId);
  if (!pref || !person.fortune) return;
  if (verdict === 'confirm') {
    const preferences = person.preferences.map((p) => (p.id === prefId ? { ...p, source: 'manual' as const, note: `占卜确认 · ${p.note ?? ''}`.trim() } : p));
    await db.persons.update(person.id, { preferences, fortune: { ...person.fortune, hits: person.fortune.hits + 1 } });
  } else {
    const preferences = person.preferences.filter((p) => p.id !== prefId);
    await db.persons.update(person.id, {
      preferences,
      fortune: { ...person.fortune, rejected: [...new Set([...person.fortune.rejected, pref.name])], misses: person.fortune.misses + 1 },
    });
  }
}

/** 全村的占卜战绩 */
export function fortuneStats(persons: Person[]): { hits: number; misses: number; readings: number; synastries: number } {
  let hits = 0;
  let misses = 0;
  let readings = 0;
  let synastries = 0;
  for (const p of persons) {
    if (!p.fortune) continue;
    hits += p.fortune.hits;
    misses += p.fortune.misses;
    if (fortuneData(p)?.reading.dialogue.length) readings++;
    if (fortuneData(p)?.synastry) synastries++;
  }
  return { hits, misses, readings, synastries };
}
