/**
 * 星婆婆命书：章节可用性判断、缓存指纹、每章独立的 API 请求（流式、max_tokens 取模型最大值）。
 */
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { Person } from '@/db/types';
import { createClient, maxOutputOf, type AiModelId } from '@/ai/client';
import { RELATIONS } from '@/config/relations';
import { BOOK_SYSTEM, CHAPTER_INSTRUCTIONS, CHAPTERS, CONTINUE_INSTRUCTION, GUIDE_SYSTEM, type ChapterKey } from '@/config/fortune-book';
import { FORTUNE_PROMPT_VERSION } from '@/config/fortune-prompt';
import { buildChart, chartToText, type Chart } from './chart';
import { natalToText } from './natal';

/* ------------------------------ 数据结构 ------------------------------ */
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
}
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

/* ------------------------------ 输出 schema ------------------------------ */
export const ChapterSchema = z.object({
  sections: z.array(z.object({ title: z.string(), body: z.string() })),
  traits: z.array(z.object({ text: z.string(), basis: z.string() })),
});
export const GuideSchema = z.object({
  character: z.array(z.object({ text: z.string(), source: z.string() })),
  getAlong: z.array(z.object({ text: z.string(), source: z.string() })),
  topics: z.array(z.object({ text: z.string(), source: z.string() })),
  gifts: z.array(
    z.object({
      name: z.string(),
      category: z.enum(['food', 'item', 'activity', 'topic', 'personType', 'other']),
      tier: z.enum(['like', 'love']),
      source: z.string(),
    }),
  ),
});

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

/* ------------------------------ 提示词拼装 ------------------------------ */
function personIntro(person: Person): string {
  const confirmed = person.preferences.filter((p) => p.source !== 'fortune').length;
  return [
    `这个人：${person.isMe ? '用户本人' : `用户的${RELATIONS[person.relation].label}`}，称呼「${person.nickname || person.name}」。`,
    `已知性格标签 ${person.tags.length} 个、已确认喜好 ${confirmed} 条（内容不提供）。`,
    person.selfTags.length ? `TA 自己说的标签：${person.selfTags.map((t) => `${t.key}＝${t.value}`).join('，')}。` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function chapterTitle(key: ChapterKey): string {
  return CHAPTERS.find((c) => c.key === key)?.title ?? key;
}

export function chapterToText(key: ChapterKey, ch: BookChapter): string {
  return ch.rounds
    .map((r, i) => `${i > 0 ? `（第 ${i + 1} 次讲）\n` : ''}${r.sections.map((s) => `【${s.title}】\n${s.body}`).join('\n\n')}`)
    .join('\n\n')
    .replace(/^/, `《${chapterTitle(key)}》\n`);
}

/** 该章的排盘数据（本章细讲的体系放全量，其他体系放一行摘要供交叉引用） */
function chartTextFor(key: ChapterKey, chart: Chart): string {
  const full = chartToText(chart);
  if (key === 'overview' || key === 'synastry') return full;
  const focus: Record<string, string> = {};
  if (chart.natal) focus.natal = natalToText(chart.natal);
  const head = `本章重点体系：${chapterTitle(key)}。完整排盘如下（其他体系只用于交叉引用，不要在本章细讲它们）：`;
  return `${head}\n${full}${key === 'natal' && focus.natal ? '' : ''}`;
}

export function buildChapterPrompt(opts: { key: Exclude<ChapterKey, 'guide'>; person: Person; me: Person | null; book: FortuneBook | null; continueRound?: boolean }): { system: string; user: string } {
  const { key, person, me, book } = opts;
  const chart = buildChart(person.birth);
  const parts: string[] = [personIntro(person)];
  if (key === 'synastry' && me) {
    parts.push(`「我」的排盘：\n${chartToText(buildChart(me.birth))}`);
    parts.push(`「TA」的排盘：\n${chartToText(chart)}`);
  } else {
    parts.push(chartTextFor(key, chart));
  }
  // 已生成的其他章
  const others = book ? (Object.keys(book.chapters) as Exclude<ChapterKey, 'guide'>[]).filter((k) => k !== key && book.chapters[k]?.rounds.length) : [];
  if (others.length) {
    const ordered = ['overview', ...others.filter((k) => k !== 'overview')].filter((k, i, a) => a.indexOf(k) === i && others.includes(k as never)) as Exclude<ChapterKey, 'guide'>[];
    parts.push(`已经写好的章节（不要重复这些内容，可以引用）：\n\n${ordered.map((k) => chapterToText(k, book!.chapters[k]!)).join('\n\n----\n\n')}`);
  } else if (key !== 'overview') {
    parts.push('总论还没写，本章不必引用总论。');
  }
  const rejected = person.fortune?.rejected ?? [];
  if (rejected.length) parts.push(`之前被标记为「不准」的说法（换角度，别重复）：\n${rejected.map((r) => `- ${r}`).join('\n')}`);
  const cur = book?.chapters[key];
  if (opts.continueRound && cur) {
    parts.push(`${CONTINUE_INSTRUCTION}\n\n本章已有内容：\n${chapterToText(key, cur)}`);
  } else {
    parts.push(CHAPTER_INSTRUCTIONS[key]);
  }
  return { system: BOOK_SYSTEM, user: parts.join('\n\n') };
}

export function buildGuidePrompt(person: Person, book: FortuneBook): { system: string; user: string } {
  const keys = (Object.keys(book.chapters) as Exclude<ChapterKey, 'guide'>[]).filter((k) => book.chapters[k]?.rounds.length);
  const text = keys.map((k) => chapterToText(k, book.chapters[k]!)).join('\n\n----\n\n');
  const rejected = person.fortune?.rejected ?? [];
  return {
    system: GUIDE_SYSTEM,
    user: `${personIntro(person)}\n\n命书已写好的章节：\n\n${text}${rejected.length ? `\n\n之前被标记为「不准」的说法（不要再列）：\n${rejected.map((r) => `- ${r}`).join('\n')}` : ''}`,
  };
}

/** 指南章依据的章节版本戳 */
export function guideSourceStamp(book: FortuneBook): string {
  return (Object.keys(book.chapters) as Exclude<ChapterKey, 'guide'>[])
    .filter((k) => book.chapters[k]?.rounds.length)
    .sort()
    .map((k) => `${k}:${book.chapters[k]!.updatedAt}:${book.chapters[k]!.rounds.length}`)
    .join('|');
}

/* ------------------------------ 请求（流式） ------------------------------ */
const inflight = new Set<string>();
export function isInflight(personId: string, key: ChapterKey): boolean {
  return inflight.has(`${personId}:${key}`);
}

async function requestJson<T>(system: string, user: string, schema: z.ZodType<T>, model: AiModelId, onProgress?: (chars: number) => void): Promise<T> {
  const client = createClient();
  if (!client) throw new Error('no api key');
  // 长输出必须流式，max_tokens 取模型最大值，篇幅由内容决定
  const stream = client.messages.stream({
    model,
    max_tokens: maxOutputOf(model),
    system,
    messages: [{ role: 'user', content: user }],
    output_config: { format: zodOutputFormat(schema) },
  });
  let chars = 0;
  stream.on('text', (delta) => {
    chars += delta.length;
    onProgress?.(chars);
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === 'refusal') throw new Error('refusal');
  if (msg.stop_reason === 'max_tokens') throw new Error('输出超过了模型上限，被截断了');
  const text = msg.content.filter((b) => b.type === 'text').map((b) => (b.type === 'text' ? b.text : '')).join('');
  return schema.parse(JSON.parse(text));
}

export async function requestChapter(opts: { key: Exclude<ChapterKey, 'guide'>; person: Person; me: Person | null; book: FortuneBook | null; continueRound?: boolean; model: AiModelId; onProgress?: (chars: number) => void }): Promise<z.infer<typeof ChapterSchema>> {
  const tag = `${opts.person.id}:${opts.key}`;
  if (inflight.has(tag)) throw new Error('这一章正在写，等它写完');
  inflight.add(tag);
  try {
    const { system, user } = buildChapterPrompt(opts);
    return await requestJson(system, user, ChapterSchema, opts.model, opts.onProgress);
  } finally {
    inflight.delete(tag);
  }
}

export async function requestGuide(person: Person, book: FortuneBook, model: AiModelId, onProgress?: (chars: number) => void): Promise<z.infer<typeof GuideSchema>> {
  const tag = `${person.id}:guide`;
  if (inflight.has(tag)) throw new Error('这一章正在写，等它写完');
  inflight.add(tag);
  try {
    const { system, user } = buildGuidePrompt(person, book);
    return await requestJson(system, user, GuideSchema, model, onProgress);
  } finally {
    inflight.delete(tag);
  }
}
