/** 九处建筑登记表：预览页与场景层都从这里取 */
import type { Grid } from '@/pixel/painter';
import type { Season } from '@/lib/season';
import { oldHouseSprite, OLDHOUSE_H, OLDHOUSE_W } from './oldhouse';
import { gateSprite, GATE_H, GATE_W, homeSprite, HOME_H, HOME_W, innSprite, INN_H, INN_W, lakehouseSprite, LAKEHOUSE_H, LAKEHOUSE_W, plazaSprite, PLAZA_H, PLAZA_W, teahouseSprite, TEAHOUSE_H, TEAHOUSE_W, tentSprite, TENT_H, TENT_W, workshopSprite, WORKSHOP_H, WORKSHOP_W } from './others';

export interface BuildingDef {
  key: string;
  label: string;
  w: number;
  h: number;
  /** 烟囱位置（相对建筑左上），有则四季冒烟 */
  smoke?: [number, number];
  draw: (season: Season, night: boolean, frame: number) => Grid;
}

export const BUILDINGS: BuildingDef[] = [
  { key: 'oldhouse', label: '老宅（家人）', w: OLDHOUSE_W, h: OLDHOUSE_H, smoke: [62, -14], draw: oldHouseSprite },
  { key: 'home', label: '我的家', w: HOME_W, h: HOME_H, draw: (s, n, f) => homeSprite(s, n, f, 'red') },
  { key: 'inn', label: '旅店（新认识）', w: INN_W, h: INN_H, smoke: [54, -14], draw: innSprite },
  { key: 'workshop', label: '工坊（同事）', w: WORKSHOP_W, h: WORKSHOP_H, smoke: [16, -14], draw: workshopSprite },
  { key: 'tent', label: '星婆婆帐篷', w: TENT_W, h: TENT_H, draw: tentSprite },
  { key: 'plaza', label: '广场（朋友）', w: PLAZA_W, h: PLAZA_H, draw: plazaSprite },
  { key: 'teahouse', label: '茶馆（想深交）', w: TEAHOUSE_W, h: TEAHOUSE_H, draw: teahouseSprite },
  { key: 'lakehouse', label: '湖边小屋（恋爱）', w: LAKEHOUSE_W, h: LAKEHOUSE_H, draw: lakehouseSprite },
  { key: 'gate', label: '村口牌坊', w: GATE_W, h: GATE_H, draw: gateSprite },
];
