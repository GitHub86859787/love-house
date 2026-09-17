import type { RelationType } from './relations';

/** 节日提醒配置：提前 daysBefore 天出任务；relations 为 'all' 或适用关系类型 */
export interface HolidayConfig {
  id: string;
  name: string;
  month: number;
  day: number;
  lunar: boolean;
  daysBefore: number;
  relations: 'all' | RelationType[];
  greeting: string;
}

export const HOLIDAYS: HolidayConfig[] = [
  { id: 'newyear', name: '元旦', month: 1, day: 1, lunar: false, daysBefore: 2, relations: 'all', greeting: '新年快乐' },
  { id: 'spring', name: '春节', month: 1, day: 1, lunar: true, daysBefore: 5, relations: 'all', greeting: '新春快乐' },
  { id: 'lantern', name: '元宵', month: 1, day: 15, lunar: true, daysBefore: 1, relations: ['family', 'romance'], greeting: '元宵快乐' },
  { id: 'valentine', name: '情人节', month: 2, day: 14, lunar: false, daysBefore: 3, relations: ['romance'], greeting: '情人节快乐' },
  { id: 'duanwu', name: '端午', month: 5, day: 5, lunar: true, daysBefore: 2, relations: 'all', greeting: '端午安康' },
  { id: 'qixi', name: '七夕', month: 7, day: 7, lunar: true, daysBefore: 2, relations: ['romance'], greeting: '七夕快乐' },
  { id: 'midautumn', name: '中秋', month: 8, day: 15, lunar: true, daysBefore: 3, relations: 'all', greeting: '中秋快乐' },
  { id: 'chongyang', name: '重阳', month: 9, day: 9, lunar: true, daysBefore: 1, relations: ['family'], greeting: '重阳安康' },
];
