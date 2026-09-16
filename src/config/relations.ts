/** 关系类型配置：标签、默认"久未联系"天数、是否默认衰减 */
export type RelationType =
  | 'friend'
  | 'new'
  | 'deepen'
  | 'colleague'
  | 'family'
  | 'romance'
  | 'other';

export interface RelationConfig {
  label: string;
  /** 超过多少天没互动视为"久未联系" */
  staleDays: number;
  /** 该关系类型默认是否衰减 */
  decays: boolean;
  /** 首页小房子屋顶颜色 */
  roofColor: string;
}

export const RELATIONS: Record<RelationType, RelationConfig> = {
  romance: { label: '恋爱', staleDays: 2, decays: true, roofColor: '#d95d78' },
  deepen: { label: '想深交', staleDays: 4, decays: true, roofColor: '#e0883a' },
  new: { label: '新认识', staleDays: 5, decays: true, roofColor: '#6fb7e8' },
  family: { label: '家人', staleDays: 10, decays: false, roofColor: '#8b5a2b' },
  friend: { label: '朋友', staleDays: 14, decays: true, roofColor: '#c0392b' },
  colleague: { label: '同事', staleDays: 21, decays: true, roofColor: '#5d7fa3' },
  other: { label: '其他', staleDays: 30, decays: true, roofColor: '#7f8c6d' },
};

export const RELATION_ORDER: RelationType[] = [
  'friend',
  'new',
  'deepen',
  'colleague',
  'family',
  'romance',
  'other',
];
