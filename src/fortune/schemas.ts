import { z } from 'zod';

export const ReadingSchema = z.object({
  dialogue: z.array(z.string()),
  traits: z.array(z.object({ text: z.string(), basis: z.string() })),
  guessedLikes: z.array(
    z.object({
      name: z.string(),
      category: z.enum(['food', 'item', 'activity', 'topic', 'personType', 'other']),
      tier: z.enum(['like', 'love', 'dislike']),
      basis: z.string(),
    }),
  ),
  tips: z.array(z.string()),
  topics: z.array(z.string()),
  systems: z.object({
    zodiac: z.string().nullable(),
    numerology: z.string().nullable(),
    bazi: z.string().nullable(),
  }),
});
export type Reading = z.infer<typeof ReadingSchema>;

export const SynastrySchema = z.object({
  dialogue: z.array(z.string()),
  harmony: z.array(z.string()),
  friction: z.array(z.string()),
  advice: z.array(z.string()),
  summary: z.string(),
});
export type Synastry = z.infer<typeof SynastrySchema>;

/** 存在 person.fortune.data 里的结构 */
export interface FortuneData {
  reading: Reading & { traitVerdicts?: ('hit' | 'miss' | null)[] };
  /** 推测喜好是否已写入喜好列表 */
  likesWritten: boolean;
  synastry?: { data: Synastry; inputHash: string; createdAt: number };
}
