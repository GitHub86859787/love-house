import type { Person } from '@/db/types';
import type { Settings } from '@/db/settings';
import { RELATIONS } from '@/config/relations';
import { SCORING } from '@/config/scoring';
import { isStale } from '@/features/scoring/decay';
import { areaOfRelation, type AreaId } from './areas';

/** 场景需要的全部信息：由数据层算好，场景组件不直接碰数据库 */
export interface Villager {
  person: Person;
  hearts: number;
  golden: boolean;
  ghost: boolean;
  area: AreaId;
  roofColor: string;
  /** 关系刚变更（用于屋顶动画） */
  recentlyMoved: boolean;
}

export interface VillageModel {
  me: Person | null;
  /** 按心数排序，心多的靠村口 */
  villagers: Villager[];
}

export function buildVillageModel(persons: Person[], settings: Settings, now = Date.now()): VillageModel {
  const me = persons.find((p) => p.isMe) ?? null;
  const villagers = persons
    .filter((p) => !p.isMe)
    .sort((a, b) => b.affection - a.affection || a.createdAt - b.createdAt)
    .map((p) => {
      const hearts = Math.floor(p.affection / SCORING.pointsPerHeart);
      return {
        person: p,
        hearts,
        golden: hearts >= SCORING.maxHearts,
        ghost: isStale(p, settings, new Date(now)),
        area: areaOfRelation(p.relation),
        roofColor: RELATIONS[p.relation].roofColor,
        recentlyMoved: Boolean(p.relationChangedAt && now - p.relationChangedAt < 60000),
      };
    });
  return { me, villagers };
}
