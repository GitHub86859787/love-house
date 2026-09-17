import { describe, expect, it } from 'vitest';
import type { Person, Quest } from '@/db/types';
import { buildIcs, icsEventCount } from './ics';
import { villageToMarkdown } from './markdown';

const base: Person = {
  id: 'p1',
  name: '林小雨',
  nickname: '小雨',
  relation: 'friend',
  avatar: { face: 0, skinColor: '#fff', hair: 0, hairColor: '#000', eyes: 0, eyeColor: '#000', shirt: 0, shirtColor: '#000', accessory: 0, accessoryColor: '#000' },
  tags: ['靠谱'],
  selfTags: [],
  preferences: [{ id: 'a', name: '手冲咖啡', category: 'food', tier: 'love', source: 'manual', createdAt: 0 }],
  taboos: ['不吃香菜'],
  notes: [{ id: 'n', text: '爱爬山', createdAt: new Date(2026, 2, 1).getTime() }],
  affection: 700,
  milestonesUnlocked: [2],
  createdAt: 0,
  updatedAt: 0,
  birth: { year: 1998, month: 3, day: 12, remind: 'both' },
};

describe('ics', () => {
  it('公历生日按年重复，农历生日逐年一条，自定义提醒一条', () => {
    const quests: Quest[] = [{ id: 'q1', type: 'custom', kind: 'custom', ruleKey: 'custom:x', personId: 'p1', title: '问问面试结果', dueDate: '2026-10-01', status: 'open', priority: 10, createdAt: 0 }];
    const ics = buildIcs([base], quests, new Date(2026, 8, 17), 3);
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true);
    expect(ics).toContain('RRULE:FREQ=YEARLY');
    // 公历 1 条 + 农历 3 年里 2026 的（4 月初）已过去不列，剩 2 条 + 提醒 1 条
    expect(icsEventCount(ics)).toBe(4);
    expect(ics).toContain('SUMMARY:小雨 的生日');
    expect(ics).toContain('DTSTART;VALUE=DATE:20261001');
    // 全部 CRLF 换行
    expect(ics.split('\r\n').every((l) => !l.includes('\n'))).toBe(true);
  });
  it('只填月日、没年份：只有公历一条', () => {
    const p = { ...base, birth: { month: 11, day: 2 } };
    const ics = buildIcs([p], [], new Date(2026, 8, 17));
    expect(icsEventCount(ics)).toBe(1);
  });
});

describe('markdown', () => {
  it('每人一节，包含资料 / 喜好 / 雷区 / 笔记', () => {
    const md = villageToMarkdown([base], [], new Date(2026, 8, 17));
    expect(md).toContain('## 林小雨「小雨」');
    expect(md).toContain('- 关系：朋友');
    expect(md).toContain('**最爱**：手冲咖啡');
    expect(md).toContain('- 不吃香菜');
    expect(md).toContain('爱爬山');
    expect(md).not.toContain('星婆婆命书');
  });
});
