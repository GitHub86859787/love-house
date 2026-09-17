import type { RelationType } from '@/config/relations';

/**
 * 村庄分区映射层：人物按关系类型映射到区域，场景组件只消费这里的结果。
 * 现在的场景是"一排房子"，未来重做成分区村庄时只换场景组件，不动这里的数据逻辑。
 */
export type AreaId = 'home' | 'family' | 'plaza' | 'workshop' | 'lakeside' | 'inn' | 'field' | 'tent';

export interface AreaConfig {
  id: AreaId;
  label: string;
  relations: RelationType[];
  /** 在横向场景中的排序 */
  order: number;
}

export const AREAS: AreaConfig[] = [
  { id: 'home', label: '我的家', relations: [], order: 0 },
  { id: 'family', label: '家人区', relations: ['family'], order: 1 },
  { id: 'plaza', label: '朋友广场', relations: ['friend', 'deepen'], order: 2 },
  { id: 'workshop', label: '同事工坊', relations: ['colleague'], order: 3 },
  { id: 'lakeside', label: '湖边小屋', relations: ['romance'], order: 4 },
  { id: 'inn', label: '村口旅店', relations: ['new', 'other'], order: 5 },
  { id: 'tent', label: '星婆婆的帐篷', relations: [], order: 6 },
];

export function areaOfRelation(relation: RelationType): AreaId {
  return AREAS.find((a) => a.relations.includes(relation))?.id ?? 'inn';
}
