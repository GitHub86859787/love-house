import { db } from './db';
import type { Person } from './types';
import { uid } from '@/lib/id';

export type PersonInput = Omit<Person, 'id' | 'createdAt' | 'updatedAt' | 'affection' | 'milestonesUnlocked' | 'preferences' | 'notes'> &
  Partial<Pick<Person, 'affection' | 'milestonesUnlocked' | 'preferences' | 'notes'>>;

export async function createPerson(input: PersonInput): Promise<Person> {
  const now = Date.now();
  const person: Person = {
    affection: 0,
    milestonesUnlocked: [],
    preferences: [],
    notes: [],
    ...input,
    id: uid(),
    createdAt: now,
    updatedAt: now,
  };
  await db.persons.add(person);
  return person;
}

export async function updatePerson(id: string, patch: Partial<Person>): Promise<void> {
  await db.persons.update(id, { ...patch, updatedAt: Date.now() });
}

export async function deletePerson(id: string): Promise<void> {
  await db.transaction('rw', db.persons, db.interactions, db.quests, async () => {
    await db.persons.delete(id);
    await db.interactions.where('personId').equals(id).delete();
    await db.quests.where('personId').equals(id).delete();
  });
}

/** 「我」的档案（全库唯一） */
export async function getMe(): Promise<Person | undefined> {
  return db.persons.filter((p) => Boolean(p.isMe)).first();
}

/** 按心数（点数）降序，心多的靠村口 */
export function sortByAffection(list: Person[]): Person[] {
  return [...list].sort((a, b) => b.affection - a.affection || a.createdAt - b.createdAt);
}
