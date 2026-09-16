import Dexie, { type EntityTable } from 'dexie';
import type { AchievementRecord, Interaction, Person, Quest, SettingRecord } from './types';

export class VillageDB extends Dexie {
  persons!: EntityTable<Person, 'id'>;
  interactions!: EntityTable<Interaction, 'id'>;
  quests!: EntityTable<Quest, 'id'>;
  achievements!: EntityTable<AchievementRecord, 'id'>;
  settings!: EntityTable<SettingRecord, 'key'>;

  constructor() {
    super('renqing-village');
    this.version(1).stores({
      persons: 'id, name, relation, affection, lastInteractionAt, createdAt',
      interactions: 'id, personId, at, type, [personId+at]',
      quests: 'id, ruleKey, personId, status, dueDate, type',
      achievements: 'id',
      settings: 'key',
    });
  }
}

export const db = new VillageDB();
