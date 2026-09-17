import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { Person } from '@/db/types';
import { createClient, estimateTokens, type AiModelId } from '@/ai/client';
import { FORTUNE_PROMPT_VERSION, FORTUNE_SYSTEM, SYNASTRY_SYSTEM } from '@/config/fortune-prompt';
import { RELATIONS } from '@/config/relations';
import { buildChart, chartToText, type Chart } from './chart';
import { ReadingSchema, SynastrySchema, type Reading, type Synastry } from './schemas';

function hash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

/** 解读缓存指纹：生辰 + 关系类型 + 提示词版本 */
export function readingHash(person: Person): string {
  return hash(`${FORTUNE_PROMPT_VERSION}|${JSON.stringify(person.birth ?? null)}|${person.relation}`);
}

export function synastryHash(me: Person, other: Person): string {
  return hash(`${FORTUNE_PROMPT_VERSION}|${JSON.stringify(me.birth ?? null)}|${JSON.stringify(other.birth ?? null)}|${other.relation}`);
}

export const COOLDOWN_MS = 24 * 3600 * 1000;

export function cooldownLeft(person: Person, now = Date.now()): number {
  const last = person.fortune?.lastAskedAt ?? 0;
  return Math.max(0, last + COOLDOWN_MS - now);
}

export function readingInput(person: Person, chart: Chart): string {
  const confirmed = person.preferences.filter((p) => p.source !== 'fortune').length;
  const rejected = person.fortune?.rejected ?? [];
  return [
    `关系类型：${person.isMe ? '这是用户本人' : RELATIONS[person.relation].label}`,
    `称呼：${person.nickname || person.name}`,
    `已知性格标签数量：${person.tags.length}；已确认喜好数量：${confirmed}（内容不提供）`,
    person.selfTags.length ? `TA 自己说的标签：${person.selfTags.map((t) => `${t.key}=${t.value}`).join('，')}` : '',
    rejected.length ? `之前被标记为"不准"的推测（请换角度，别重复）：\n${rejected.map((r) => `- ${r}`).join('\n')}` : '',
    '',
    '排盘：',
    chartToText(chart),
  ]
    .filter((x) => x !== '')
    .join('\n');
}

export function estimateReadingTokens(person: Person): number {
  const chart = buildChart(person.birth);
  return estimateTokens(FORTUNE_SYSTEM + readingInput(person, chart)) + 3000;
}

export async function requestReading(person: Person, model: AiModelId): Promise<Reading> {
  const client = createClient();
  if (!client) throw new Error('no api key');
  const chart = buildChart(person.birth);
  const res = await client.messages.parse({
    model,
    max_tokens: 16000,
    system: FORTUNE_SYSTEM,
    messages: [{ role: 'user', content: readingInput(person, chart) }],
    output_config: { format: zodOutputFormat(ReadingSchema) },
  });
  if (res.stop_reason === 'refusal') throw new Error('refusal');
  if (!res.parsed_output) throw new Error('parse failed');
  return res.parsed_output;
}

export function synastryInput(me: Person, other: Person): string {
  return [
    `关系类型：${RELATIONS[other.relation].label}`,
    `「我」的排盘：`,
    chartToText(buildChart(me.birth)),
    '',
    `「TA」（${other.nickname || other.name}）的排盘：`,
    chartToText(buildChart(other.birth)),
  ].join('\n');
}

export function estimateSynastryTokens(me: Person, other: Person): number {
  return estimateTokens(SYNASTRY_SYSTEM + synastryInput(me, other)) + 2500;
}

export async function requestSynastry(me: Person, other: Person, model: AiModelId): Promise<Synastry> {
  const client = createClient();
  if (!client) throw new Error('no api key');
  const res = await client.messages.parse({
    model,
    max_tokens: 16000,
    system: SYNASTRY_SYSTEM,
    messages: [{ role: 'user', content: synastryInput(me, other) }],
    output_config: { format: zodOutputFormat(SynastrySchema) },
  });
  if (res.stop_reason === 'refusal') throw new Error('refusal');
  if (!res.parsed_output) throw new Error('parse failed');
  return res.parsed_output;
}
