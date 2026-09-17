/**
 * 星婆婆命书：章节可用性判断、缓存指纹、每章独立的 API 请求（流式、max_tokens 取模型最大值）。
 */
import { z } from 'zod';
import type { Person } from '@/db/types';
import { createClient, loadZodFormat, maxOutputOf, type AiModelId } from '@/ai/client';
import { RELATIONS } from '@/config/relations';
import { BOOK_SYSTEM, CHAPTER_INSTRUCTIONS, CONTINUE_INSTRUCTION, GUIDE_SYSTEM, L1_OVERVIEW_NOTE, RESUME_INSTRUCTION, type ChapterKey } from '@/config/fortune-book';
import { buildChart, chartToText, type Chart } from './chart';
import { chapterTitle, chapterToText, type FortuneBook, type GenerateMode, type GuideItem, type Section } from './bookCore';

export * from './bookCore';
import './natal';

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

/** 该章的排盘数据（本章细讲的体系放全量，其他体系放一行摘要供交叉引用） */
function chartTextFor(key: ChapterKey, chart: Chart): string {
  const full = chartToText(chart);
  if (key === 'overview' || key === 'synastry') return full;
  const head = `本章重点体系：${chapterTitle(key)}。完整排盘如下（其他体系只用于交叉引用，不要在本章细讲它们）：`;
  return `${head}\n${full}`;
}

export function buildChapterPrompt(opts: { key: Exclude<ChapterKey, 'guide'>; person: Person; me: Person | null; book: FortuneBook | null; mode?: GenerateMode }): { system: string; user: string } {
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
  const mode = opts.mode ?? 'new';
  if (mode === 'continue' && cur) {
    parts.push(`${CONTINUE_INSTRUCTION}\n\n本章已有内容：\n${chapterToText(key, cur)}`);
  } else if (mode === 'resume' && cur) {
    parts.push(`${RESUME_INSTRUCTION}\n\n已写好的部分：\n${chapterToText(key, cur)}`);
  } else {
    parts.push(CHAPTER_INSTRUCTIONS[key]);
    if (key === 'overview' && chart.level === 1) parts.push(L1_OVERVIEW_NOTE);
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

/* ------------------------------ 请求（流式） ------------------------------ */
const inflight = new Set<string>();
export function isInflight(personId: string, key: ChapterKey): boolean {
  return inflight.has(`${personId}:${key}`);
}

async function requestJson<T>(system: string, user: string, schema: z.ZodType<T>, model: AiModelId, onProgress?: (text: string) => void): Promise<T> {
  const client = await createClient();
  if (!client) throw new Error('no api key');
  const zodOutputFormat = await loadZodFormat();
  // 长输出必须流式，max_tokens 取模型最大值，篇幅由内容决定
  const stream = client.messages.stream({
    model,
    max_tokens: maxOutputOf(model),
    system,
    messages: [{ role: 'user', content: user }],
    output_config: { format: zodOutputFormat(schema) },
  });
  let text = '';
  stream.on('text', (delta) => {
    text += delta;
    onProgress?.(text);
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === 'refusal') throw new Error('refusal');
  if (msg.stop_reason === 'max_tokens') throw new Error('输出超过了模型上限，被截断了');
  const full = msg.content.filter((b) => b.type === 'text').map((b) => (b.type === 'text' ? b.text : '')).join('');
  return schema.parse(JSON.parse(full));
}

export async function requestChapter(opts: { key: Exclude<ChapterKey, 'guide'>; person: Person; me: Person | null; book: FortuneBook | null; mode?: GenerateMode; model: AiModelId; onProgress?: (text: string) => void }): Promise<z.infer<typeof ChapterSchema>> {
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

export async function requestGuide(person: Person, book: FortuneBook, model: AiModelId, onProgress?: (text: string) => void): Promise<z.infer<typeof GuideSchema>> {
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

/* ------------------------------ 流式中途解析 ------------------------------ */
/**
 * 把还没输出完的 JSON 补齐括号后解析，用于文字逐段出现。解析不了返回 null。
 */
export function parsePartialJson(text: string): unknown {
  const s = text.trimStart();
  if (!s.startsWith('{')) return null;
  let inStr = false;
  let esc = false;
  const stack: string[] = [];
  for (const ch of s) {
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '{') stack.push('}');
    else if (ch === '[') stack.push(']');
    else if (ch === '}' || ch === ']') stack.pop();
  }
  let fixed = s;
  if (esc) fixed = fixed.slice(0, -1);
  if (inStr) fixed += '"';
  fixed = fixed.replace(/,\s*$/, '');
  // 只写了一半的键（`"bo` / `"body":`）去掉
  fixed = fixed.replace(/,?\s*"[^"]*"\s*:\s*$/, '');
  fixed = fixed.replace(/,\s*"[^"]*"\s*$/, '');
  fixed = fixed.replace(/,\s*$/, '');
  while (stack.length) fixed += stack.pop();
  try {
    return JSON.parse(fixed);
  } catch {
    return null;
  }
}

/** 流式途中的章节内容：只取已经出现的小节 */
export function partialChapter(text: string): { sections: Section[]; traits: { text: string; basis: string }[] } | null {
  const v = parsePartialJson(text) as { sections?: unknown; traits?: unknown } | null;
  if (!v || typeof v !== 'object') return null;
  const sections = Array.isArray(v.sections)
    ? (v.sections as unknown[])
        .filter((x): x is Partial<Section> => Boolean(x) && typeof x === 'object')
        .map((x) => ({ title: typeof x.title === 'string' ? x.title : '', body: typeof x.body === 'string' ? x.body : '' }))
        .filter((x) => x.title || x.body)
    : [];
  const traits = Array.isArray(v.traits)
    ? (v.traits as unknown[])
        .filter((x): x is { text?: unknown; basis?: unknown } => Boolean(x) && typeof x === 'object')
        .filter((x) => typeof x.text === 'string' && x.text && typeof x.basis === 'string')
        .map((x) => ({ text: x.text as string, basis: x.basis as string }))
    : [];
  return { sections, traits };
}

/** 流式途中的指南内容 */
export function partialGuide(text: string): { title: string; items: GuideItem[] }[] | null {
  const v = parsePartialJson(text) as Record<string, unknown> | null;
  if (!v || typeof v !== 'object') return null;
  const list = (k: string): GuideItem[] =>
    Array.isArray(v[k])
      ? (v[k] as unknown[])
          .filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === 'object')
          .map((x) => ({ text: typeof x.text === 'string' ? x.text : typeof x.name === 'string' ? x.name : '', source: typeof x.source === 'string' ? x.source : '' }))
          .filter((x) => x.text)
      : [];
  return [
    { title: '性格', items: list('character') },
    { title: '相处', items: list('getAlong') },
    { title: '话题', items: list('topics') },
    { title: '送礼方向', items: list('gifts') },
  ].filter((g) => g.items.length);
}

export function textCharCount(text: string): number {
  // 流式途中：粗略按正文字符数估
  const p = partialChapter(text);
  if (!p) return 0;
  return p.sections.reduce((n, s) => n + (s.title + s.body).replace(/\s/g, '').length, 0);
}
