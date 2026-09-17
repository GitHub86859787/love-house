import { createClient, loadZodFormat, type AiModelId } from './client';
import { SUMMARY_SYSTEM } from '@/config/ai-prompts';
import { SummarySchema, type SummaryResult } from './schemas';

export { summaryHash, summaryInput } from './summaryInput';

export async function generateSummary(input: string, model: AiModelId): Promise<SummaryResult> {
  const client = await createClient();
  if (!client) throw new Error('no api key');
  const zodOutputFormat = await loadZodFormat();
  const res = await client.messages.parse({
    model,
    max_tokens: 2048,
    system: SUMMARY_SYSTEM,
    messages: [{ role: 'user', content: input }],
    output_config: { format: zodOutputFormat(SummarySchema) },
  });
  if (res.stop_reason === 'refusal') throw new Error('refusal');
  if (!res.parsed_output) throw new Error('parse failed');
  return { summary: res.parsed_output.summary, tips: res.parsed_output.tips.slice(0, 3) };
}
