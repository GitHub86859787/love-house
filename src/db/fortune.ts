import { db } from './db';
import type { FortuneCache, Person, Preference } from './types';
import { uid } from '@/lib/id';
import type { FortuneData } from '@/fortune/schemas';
import type { BookChapter, ChapterSchema, FortuneBook, GuideSchema } from '@/fortune/book';
import { bookHash, currentBasis, guideSourceStamp } from '@/fortune/book';
import type { ChapterKey } from '@/config/fortune-book';
import type { z } from 'zod';

export function fortuneData(p: Person): FortuneData | null {
  return (p.fortune?.data as FortuneData | undefined) ?? null;
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
    const book = fortuneData(p)?.book;
    if (book && Object.values(book.chapters).some((c) => c && c.rounds.length > 0)) readings++;
    if (book?.chapters.synastry?.rounds.length) synastries++;
  }
  return { hits, misses, readings, synastries };
}


/* ------------------------------ 命书 ------------------------------ */
const EMPTY_READING = { dialogue: [], traits: [], guessedLikes: [], tips: [], topics: [], systems: { zodiac: null, numerology: null, bazi: null, natal: null } };

export function bookOf(p: Person): FortuneBook | null {
  return fortuneData(p)?.book ?? null;
}

function ensureData(p: Person): FortuneData {
  return fortuneData(p) ?? { reading: EMPTY_READING, likesWritten: false };
}

function cacheOf(p: Person, now: number): FortuneCache {
  return {
    inputHash: p.fortune?.inputHash ?? '',
    basis: p.fortune?.basis,
    createdAt: p.fortune?.createdAt ?? now,
    data: p.fortune?.data ?? ensureData(p),
    rejected: p.fortune?.rejected ?? [],
    hits: p.fortune?.hits ?? 0,
    misses: p.fortune?.misses ?? 0,
    lastAskedAt: p.fortune?.lastAskedAt,
  };
}

/** 写入（或重写）一章的第一轮 */
export async function saveChapter(person: Person, key: Exclude<ChapterKey, 'guide'>, out: z.infer<typeof ChapterSchema>, inputHash: string, model: string): Promise<void> {
  const now = Date.now();
  const data = ensureData(person);
  const book: FortuneBook = data.book ?? { chapters: {} };
  const chapter: BookChapter = {
    rounds: [{ sections: out.sections, createdAt: now }],
    traits: out.traits.map((t) => ({ ...t, verdict: null })),
    inputHash,
    model,
    updatedAt: now,
  };
  book.chapters = { ...book.chapters, [key]: chapter };
  const cache = cacheOf(person, now);
  cache.data = { ...data, book };
  cache.inputHash = bookHash(person);
  cache.basis = currentBasis(person);
  cache.lastAskedAt = now;
  await db.persons.update(person.id, { fortune: cache, updatedAt: now });
}

/** 「再讲讲」：追加一轮，合并新性格特点 */
export async function appendChapterRound(person: Person, key: Exclude<ChapterKey, 'guide'>, out: z.infer<typeof ChapterSchema>, model: string): Promise<void> {
  const now = Date.now();
  const data = ensureData(person);
  const book = data.book;
  const cur = book?.chapters[key];
  if (!book || !cur) return;
  const known = new Set(cur.traits.map((t) => t.text));
  const chapter: BookChapter = {
    ...cur,
    rounds: [...cur.rounds, { sections: out.sections, createdAt: now }],
    traits: [...cur.traits, ...out.traits.filter((t) => !known.has(t.text)).map((t) => ({ ...t, verdict: null }))],
    model,
    updatedAt: now,
  };
  book.chapters = { ...book.chapters, [key]: chapter };
  const cache = cacheOf(person, now);
  cache.data = { ...data, book };
  cache.lastAskedAt = now;
  await db.persons.update(person.id, { fortune: cache, updatedAt: now });
}

/** 相处指南：写入，并把送礼方向落成「星婆婆的猜测」喜好条目（替换旧猜测） */
export async function saveGuide(person: Person, out: z.infer<typeof GuideSchema>, inputHash: string, model: string): Promise<void> {
  const now = Date.now();
  const data = ensureData(person);
  const book: FortuneBook = data.book ?? { chapters: {} };
  book.guide = { ...out, sourceStamp: guideSourceStamp(book), inputHash, model, updatedAt: now };
  const rejected = new Set(person.fortune?.rejected ?? []);
  const kept = person.preferences.filter((p) => p.source !== 'fortune');
  const guesses: Preference[] = out.gifts
    .filter((g) => !rejected.has(g.name))
    .map((g) => ({ id: uid(), name: g.name, category: g.category, tier: g.tier, note: `${g.source}章`, source: 'fortune', createdAt: now }));
  const cache = cacheOf(person, now);
  cache.data = { ...data, book };
  await db.persons.update(person.id, { fortune: cache, preferences: [...kept, ...guesses], updatedAt: now });
}

/** 某章的性格特点标 准 / 不准 */
export async function markChapterTrait(person: Person, key: Exclude<ChapterKey, 'guide'>, index: number, verdict: 'hit' | 'miss'): Promise<void> {
  const data = fortuneData(person);
  const chapter = data?.book?.chapters[key];
  if (!data || !data.book || !chapter || !person.fortune) return;
  const trait = chapter.traits[index];
  if (!trait || trait.verdict === verdict) return;
  const prev = trait.verdict ?? null;
  const traits = chapter.traits.map((t, i) => (i === index ? { ...t, verdict } : t));
  const rejected = new Set(person.fortune.rejected);
  if (verdict === 'miss') rejected.add(trait.text);
  else rejected.delete(trait.text);
  const book: FortuneBook = { ...data.book, chapters: { ...data.book.chapters, [key]: { ...chapter, traits } } };
  await db.persons.update(person.id, {
    fortune: {
      ...person.fortune,
      data: { ...data, book },
      rejected: [...rejected],
      hits: person.fortune.hits + (verdict === 'hit' ? 1 : 0) - (prev === 'hit' ? 1 : 0),
      misses: person.fortune.misses + (verdict === 'miss' ? 1 : 0) - (prev === 'miss' ? 1 : 0),
    },
  });
}
