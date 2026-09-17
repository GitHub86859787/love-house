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
    // v2：birthday → birth，新增 selfTags / isMe 等字段
    this.version(2)
      .stores({
        persons: 'id, name, relation, affection, lastInteractionAt, createdAt, isMe',
        interactions: 'id, personId, at, type, [personId+at]',
        quests: 'id, ruleKey, personId, status, dueDate, type',
        achievements: 'id',
        settings: 'key',
      })
      .upgrade((tx) =>
        tx
          .table('persons')
          .toCollection()
          .modify((p: Person & { birthday?: { month: number; day: number; year?: number } }) => {
            if (p.birthday && !p.birth) p.birth = { ...p.birthday };
            delete p.birthday;
            p.selfTags ??= [];
            p.preferences ??= [];
            p.notes ??= [];
            p.tags ??= [];
            p.taboos ??= [];
          }),
      );
  }
}

export const db = new VillageDB();
