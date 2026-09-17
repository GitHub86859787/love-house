/**
 * 命书的纯数据层：类型、缓存指纹、可用性、过期判断、字数统计。
 * 不依赖 zod / SDK / 天文库，首屏可以安全引用。
 */
import type { Person } from '@/db/types';
import { CHAPTERS, type ChapterKey } from '@/config/fortune-book';
import { FORTUNE_PROMPT_VERSION } from '@/config/fortune-prompt';
import type { Chart } from './chart';

export interface Section {
  title: string;
  body: string;
}
export interface ChapterTrait {
  text: string;
  basis: string;
  verdict?: 'hit' | 'miss' | null;
}
export interface ChapterRound {
  sections: Section[];
  createdAt: number;
  /** 中途断掉，只保留了已写出的部分 */
  incomplete?: boolean;
  /** 断掉的原因（给用户看） */
  error?: string;
}
/** 生成方式：新写 / 再讲讲（追加一轮）/ 接着讲（补完断掉的那一轮） */
export type GenerateMode = 'new' | 'continue' | 'resume';
export interface BookChapter {
  rounds: ChapterRound[];
  traits: ChapterTrait[];
  inputHash: string;
  model: string;
  updatedAt: number;
}
export interface GuideItem {
  text: string;
  source: string;
}
export interface GuideGift {
  name: string;
  category: 'food' | 'item' | 'activity' | 'topic' | 'personType' | 'other';
  tier: 'like' | 'love';
  source: string;
}
export interface GuideChapter {
  character: GuideItem[];
  getAlong: GuideItem[];
  topics: GuideItem[];
  gifts: GuideGift[];
  /** 生成时所依据的各章版本戳，用于"有新内容，更新" */
  sourceStamp: string;
  inputHash: string;
  model: string;
  updatedAt: number;
}
export interface FortuneBook {
  chapters: Partial<Record<Exclude<ChapterKey, 'guide'>, BookChapter>>;
  guide?: GuideChapter;
}

/* ------------------------------ 指纹 ------------------------------ */
function fnv(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}
export function bookHash(person: Person): string {
  return fnv(`${FORTUNE_PROMPT_VERSION}|${JSON.stringify(person.birth ?? null)}|${person.relation}`);
}
export function synastryBookHash(me: Person, other: Person): string {
  return fnv(`${FORTUNE_PROMPT_VERSION}|${JSON.stringify(me.birth ?? null)}|${JSON.stringify(other.birth ?? null)}|${other.relation}`);
}
export function chapterHash(key: ChapterKey, person: Person, me: Person | null): string {
  return key === 'synastry' && me ? synastryBookHash(me, person) : bookHash(person);
}

/** 缓存依据快照：判断是「改过生日」还是「关系变了」 */
export function currentBasis(person: Person): { birth: string; relation: string; promptVersion: number } {
  return { birth: JSON.stringify(person.birth ?? null), relation: person.relation, promptVersion: FORTUNE_PROMPT_VERSION };
}

/**
 * 整本书为什么过期了；null 表示各章都还是最新的。
 * 只有合盘章过期（改的是「我」的生辰）时返回专门的说明。
 */
export function bookStaleReason(person: Person, me: Person | null, book: FortuneBook | null): string | null {
  if (!book) return null;
  const written = (Object.keys(book.chapters) as Exclude<ChapterKey, 'guide'>[]).filter((k) => book.chapters[k]?.rounds.length);
  if (written.length === 0) return null;
  const ownStale = written.some((k) => k !== 'synastry' && book.chapters[k]!.inputHash !== bookHash(person));
  if (ownStale) {
    const now = currentBasis(person);
    const was = person.fortune?.basis;
    if (was) {
      if (was.birth !== now.birth) return '你改过生日，这本书是按旧生日写的，各章都要重新写';
      if (was.relation !== now.relation) return '关系类型变了，这本书可能对不上了，各章都要重新写';
      if (was.promptVersion !== now.promptVersion) return '星婆婆的写法更新了，各章可以重新写';
    }
    return '生辰或关系有变，这本书可能不准了，各章都要重新写';
  }
  const syn = book.chapters.synastry;
  if (syn && me && syn.inputHash !== synastryBookHash(me, person)) return '你改过自己的生辰，合盘那一章要重新写';
  return null;
}

/* ------------------------------ 可用性 ------------------------------ */
export interface Availability {
  ok: boolean;
  missing?: string;
}
export function chapterAvailability(key: ChapterKey, person: Person, chart: Chart, me: Person | null, book: FortuneBook | null): Availability {
  const noYear = { ok: false, missing: '缺出生年份才能翻开' };
  switch (key) {
    case 'overview':
      return chart.level >= 1 ? { ok: true } : { ok: false, missing: '缺生日才能翻开' };
    case 'natal':
      if (chart.natal) return { ok: true };
      if (!person.birth?.year) return noYear;
      return { ok: false, missing: '缺出生时辰才能翻开' };
    case 'bazi':
      return chart.bazi ? { ok: true } : noYear;
    case 'numerology':
      return chart.numerology ? { ok: true } : noYear;
    case 'shengxiao':
      return chart.shengXiao ? { ok: true } : noYear;
    case 'synastry':
      if (person.isMe) return { ok: false, missing: '这是你自己的书，合盘在别人的书里' };
      if (!me?.birth) return { ok: false, missing: '缺你自己的生辰才能翻开' };
      if (!person.birth) return { ok: false, missing: '缺 TA 的生日才能翻开' };
      if (Math.floor(person.affection / 250) < 2) return { ok: false, missing: '到 2 颗心才能翻开' };
      return { ok: true };
    case 'guide': {
      const has = book && Object.values(book.chapters).some((c) => c && c.rounds.length > 0);
      return has ? { ok: true } : { ok: false, missing: '先翻开至少一章' };
    }
  }
}

export function chapterTitle(key: ChapterKey): string {
  return CHAPTERS.find((c) => c.key === key)?.title ?? key;
}

export function chapterToText(key: ChapterKey, ch: BookChapter): string {
  return ch.rounds
    .map((r, i) => `${i > 0 ? `（第 ${i + 1} 次讲）\n` : ''}${r.sections.map((s) => `【${s.title}】\n${s.body}`).join('\n\n')}`)
    .join('\n\n')
    .replace(/^/, `《${chapterTitle(key)}》\n`);
}

/** 指南章依据的章节版本戳 */
export function guideSourceStamp(book: FortuneBook): string {
  return (Object.keys(book.chapters) as Exclude<ChapterKey, 'guide'>[])
    .filter((k) => book.chapters[k]?.rounds.length)
    .sort()
    .map((k) => `${k}:${book.chapters[k]!.updatedAt}:${book.chapters[k]!.rounds.length}`)
    .join('|');
}

/** 一章大约多少字（不含空白） */
export function chapterCharCount(ch: BookChapter): number {
  let n = 0;
  for (const r of ch.rounds) for (const s of r.sections) n += (s.title + s.body).replace(/\s/g, '').length;
  return n;
}
export function guideCharCount(g: GuideChapter): number {
  const all = [...g.character, ...g.getAlong, ...g.topics].map((x) => x.text).concat(g.gifts.map((x) => x.name));
  return all.join('').replace(/\s/g, '').length;
}
