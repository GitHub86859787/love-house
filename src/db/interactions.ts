import { db } from './db';
import type { Interaction, InteractionType, Person, PreferenceTier } from './types';
import { uid } from '@/lib/id';
import { clampPoints, computeScore, type ScoreResult } from '@/features/scoring/engine';
import { getSettings } from './settings';
import { toDateKey } from '@/lib/date';

export interface NewInteraction {
  personId: string;
  type: InteractionType;
  at?: number;
  gift?: { name: string; tier: PreferenceTier; matchedPreferenceId?: string; price?: number };
  memo?: string;
  /** 我手动改过的分（不传则用系统算出的） */
  pointsOverride?: number;
}

export async function previewScore(person: Person, type: InteractionType, giftTier?: PreferenceTier, at = new Date()): Promise<ScoreResult> {
  const settings = await getSettings();
  const history = await db.interactions.where('personId').equals(person.id).toArray();
  return computeScore({ person, type, giftTier, at, history, weeklyGiftLimitEnabled: settings.weeklyGiftLimitEnabled });
}

/** 记一条互动：写入记录，更新好感度 / 最后互动时间，返回记录与新旧点数 */
export async function addInteraction(input: NewInteraction): Promise<{ interaction: Interaction; before: number; after: number; score: ScoreResult }> {
  const settings = await getSettings();
  return db.transaction('rw', db.persons, db.interactions, async () => {
    const person = await db.persons.get(input.personId);
    if (!person) throw new Error('person not found');
    const at = input.at ?? Date.now();
    const history = await db.interactions.where('personId').equals(person.id).toArray();
    const score = computeScore({
      person,
      type: input.type,
      giftTier: input.gift?.tier,
      at: new Date(at),
      history,
      weeklyGiftLimitEnabled: settings.weeklyGiftLimitEnabled,
    });
    const points = input.pointsOverride ?? score.points;
    const interaction: Interaction = {
      id: uid(),
      personId: person.id,
      at,
      type: input.type,
      gift: input.gift,
      memo: input.memo?.trim() || undefined,
      computedPoints: score.points,
      points,
      reason: score.reason,
      createdAt: Date.now(),
    };
    await db.interactions.add(interaction);
    const before = person.affection;
    const after = clampPoints(before + points);
    const isReal = input.type !== 'relationChange';
    await db.persons.update(person.id, {
      affection: after,
      updatedAt: Date.now(),
      ...(isReal ? { lastInteractionAt: Math.max(person.lastInteractionAt ?? 0, at), lastDecayDate: toDateKey(new Date(at)) } : {}),
    });
    return { interaction, before, after, score };
  });
}

/** 修改某条互动的得分：差值同步到好感度 */
export async function setInteractionPoints(id: string, points: number): Promise<void> {
  await db.transaction('rw', db.persons, db.interactions, async () => {
    const it = await db.interactions.get(id);
    if (!it) return;
    const person = await db.persons.get(it.personId);
    if (!person) return;
    const diff = points - it.points;
    await db.interactions.update(id, { points });
    await db.persons.update(person.id, { affection: clampPoints(person.affection + diff), updatedAt: Date.now() });
  });
}

/** 删除互动：撤销其得分，并重算最后互动时间 */
export async function deleteInteraction(id: string): Promise<void> {
  await db.transaction('rw', db.persons, db.interactions, async () => {
    const it = await db.interactions.get(id);
    if (!it) return;
    await db.interactions.delete(id);
    const person = await db.persons.get(it.personId);
    if (!person) return;
    const rest = await db.interactions.where('personId').equals(person.id).filter((x) => x.type !== 'relationChange').toArray();
    const last = rest.length ? Math.max(...rest.map((x) => x.at)) : undefined;
    await db.persons.update(person.id, {
      affection: clampPoints(person.affection - it.points),
      lastInteractionAt: last,
      updatedAt: Date.now(),
    });
  });
}

/** 手动加减点数（±250 或任意值） */
export async function adjustAffection(personId: string, delta: number): Promise<void> {
  const person = await db.persons.get(personId);
  if (!person) return;
  await db.persons.update(personId, { affection: clampPoints(person.affection + delta), updatedAt: Date.now() });
}

export async function setAffection(personId: string, points: number): Promise<void> {
  await db.persons.update(personId, { affection: clampPoints(points), updatedAt: Date.now() });
}
