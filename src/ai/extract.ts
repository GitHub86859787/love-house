import type { Note, Person } from '@/db/types';
import { createClient, loadZodFormat, type AiModelId } from './client';
import { EXTRACT_SYSTEM } from '@/config/ai-prompts';
import { ExtractSchema, type ExtractResult } from './schemas';

/** 笔记 → 喜好 / 性格 / 雷区候选。只返回候选，不写数据。 */
export async function extractFromNotes(person: Person, notes: Note[], model: AiModelId): Promise<ExtractResult> {
  const client = await createClient();
  if (!client) throw new Error('no api key');
  const zodOutputFormat = await loadZodFormat();
  const known = person.preferences.filter((p) => p.source !== 'fortune').map((p) => p.name);
  const body = notes.map((n, i) => `【笔记 ${i + 1}】${n.text}`).join('\n\n');
  const context = `这个人：${person.name}（${person.nickname ?? ''}）。已经记录过的喜好名称（不要重复提取）：${known.join('、') || '无'}。已记录的雷区：${person.taboos.join('、') || '无'}。`;
  const res = await client.messages.parse({
    model,
    max_tokens: 4096,
    system: EXTRACT_SYSTEM,
    messages: [{ role: 'user', content: `${context}\n\n${body}` }],
    output_config: { format: zodOutputFormat(ExtractSchema) },
  });
  if (res.stop_reason === 'refusal') throw new Error('refusal');
  if (!res.parsed_output) throw new Error('parse failed');
  return res.parsed_output;
}
