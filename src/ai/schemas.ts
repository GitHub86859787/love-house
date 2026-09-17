import { z } from 'zod';

export const ExtractSchema = z.object({
  preferences: z.array(
    z.object({
      name: z.string(),
      category: z.enum(['food', 'item', 'activity', 'topic', 'personType', 'other']),
      tier: z.enum(['love', 'like', 'dislike', 'hate']),
      basis: z.string(),
    }),
  ),
  traits: z.array(z.string()),
  taboos: z.array(z.object({ text: z.string(), basis: z.string() })),
});
export type ExtractResult = z.infer<typeof ExtractSchema>;

export const SummarySchema = z.object({
  summary: z.string(),
  tips: z.array(z.string()),
});
export type SummaryResult = z.infer<typeof SummarySchema>;
