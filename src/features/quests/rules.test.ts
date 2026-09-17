import { describe, expect, it } from 'vitest';
import { autoResolve, generateCandidates } from './rules';
import { DEFAULT_SETTINGS } from '@/db/settings';
import type { Person, Quest } from '@/db/types';

const DAY = 86400000;
const today = new Date(2026, 8, 17); // 周四

function person(over: Partial<Person> = {}): Person {
  return {
    id: 'p',
    name: '小雨',
    relation: 'friend',
    avatar: {} as Person['avatar'],
    tags: [],
    selfTags: [],
    preferences: [],
    taboos: [],
    notes: [],
    affection: 0,
    milestonesUnlocked: [],
    lastInteractionAt: today.getTime() - DAY,
    createdAt: today.getTime() - 100 * DAY,
    updatedAt: 0,
    ...over,
  };
}

const keys = (ps: Person[]) => generateCandidates(ps, DEFAULT_SETTINGS, today).map((c) => c.ruleKey);

describe('generateCandidates', () => {
  it('生日提前 7 / 3 / 当天', () => {
    expect(keys([person({ birth: { month: 9, day: 24 } })])).toContain('birthday:p:2026:solar:7');
    expect(keys([person({ birth: { month: 9, day: 19 } })])).toContain('birthday:p:2026:solar:3');
    expect(keys([person({ birth: { month: 9, day: 17 } })])).toContain('birthday:p:2026:solar:0');
    expect(keys([person({ birth: { month: 9, day: 30 } })]).some((k) => k.startsWith('birthday'))).toBe(false);
  });
  it('农历生日按农历：2026-09-25 是八月十五', () => {
    const k = generateCandidates([person({ birth: { month: 8, day: 15, isLunar: true } })], DEFAULT_SETTINGS, new Date(2026, 8, 18)).map((c) => c.ruleKey);
    expect(k).toContain('birthday:p:2026:lunar:7');
    expect(keys([person({ birth: { month: 8, day: 15, isLunar: true } })]).some((x) => x.startsWith('birthday'))).toBe(false);
  });
  it('有年份且两种历法都提醒时，公历、农历各出一条', () => {
    // 1995-08-15 公历 = 农历七月二十；2026 年农历七月二十 = 公历 9/1，公历生日 8/15
    const aug14 = new Date(2026, 7, 14);
    const k = generateCandidates([person({ birth: { year: 1995, month: 8, day: 15 } })], DEFAULT_SETTINGS, aug14).map((c) => c.ruleKey);
    expect(k).toContain('birthday:p:2026:solar:3');
    const aug28 = new Date(2026, 7, 29);
    const k2 = generateCandidates([person({ birth: { year: 1995, month: 8, day: 15 } })], DEFAULT_SETTINGS, aug28).map((c) => c.ruleKey);
    expect(k2).toContain('birthday:p:2026:lunar:3');
    const only = generateCandidates([person({ birth: { year: 1995, month: 8, day: 15, remind: 'solar' } })], DEFAULT_SETTINGS, aug28).map((c) => c.ruleKey);
    expect(only.some((x) => x.includes('lunar'))).toBe(false);
  });
  it('久未联系与资料补全', () => {
    const k = keys([person({ lastInteractionAt: today.getTime() - 20 * DAY })]);
    expect(k.some((x) => x.startsWith('stale:p:'))).toBe(true);
    expect(k).toContain('profile:prefs:p');
    const full = person({
      preferences: [1, 2, 3].map((i) => ({ id: String(i), name: String(i), category: 'food', tier: 'like', source: 'manual', createdAt: 0 })),
    });
    expect(keys([full])).not.toContain('profile:prefs:p');
  });
  it('里程碑任务按心数解锁', () => {
    expect(keys([person({ affection: 1000 })])).toEqual(expect.arrayContaining(['milestone:p:2:0', 'milestone:p:4:0', 'milestone:p:4:1']));
    expect(keys([person({ affection: 300 })])).not.toContain('milestone:p:4:0');
  });
  it('节日：中秋（2026-09-25）提前 3 天，9-17 还不出；情人节只对恋爱', () => {
    expect(keys([person()]).some((k) => k.startsWith('holiday:midautumn'))).toBe(false);
    const near = generateCandidates([person()], DEFAULT_SETTINGS, new Date(2026, 8, 23)).map((c) => c.ruleKey);
    expect(near).toContain('holiday:midautumn:2026');
    const feb = new Date(2027, 1, 12);
    expect(generateCandidates([person()], DEFAULT_SETTINGS, feb).map((c) => c.ruleKey)).not.toContain('holiday:valentine:2027');
    expect(generateCandidates([person({ relation: 'romance' })], DEFAULT_SETTINGS, feb).map((c) => c.ruleKey)).toContain('holiday:valentine:2027');
  });
  it('本命年：2026 丙午马年，1990 年生的人在春节后 30 天内出提醒', () => {
    const spring = new Date(2026, 1, 20); // 2026-02-17 是春节
    const k = generateCandidates([person({ birth: { year: 1990, month: 6, day: 1 } })], DEFAULT_SETTINGS, spring).map((c) => c.ruleKey);
    expect(k).toContain('benmingnian:p:2026');
    expect(generateCandidates([person({ birth: { year: 1991, month: 6, day: 1 } })], DEFAULT_SETTINGS, spring).map((c) => c.ruleKey)).not.toContain('benmingnian:p:2026');
  });
  it('「我」不生成任务', () => {
    expect(keys([person({ isMe: true, birth: { month: 9, day: 17 } })])).toEqual([]);
  });
});

describe('autoResolve', () => {
  const base: Quest = { id: 'q', type: 'daily', kind: 'stale', ruleKey: 'stale:p:2026-08-01', title: '', status: 'open', priority: 60, createdAt: 0 };
  it('久未联系任务在联系后自动完成', () => {
    expect(autoResolve(base, [], [], [], today)).toBe('done');
    expect(autoResolve(base, [{ ...base, kind: 'stale' } as never], [], [], today)).toBe(null);
  });
  it('自定义提醒过期消失', () => {
    const q: Quest = { ...base, kind: 'custom', ruleKey: 'custom:1', dueDate: '2026-09-16' };
    expect(autoResolve(q, [], [], [], today)).toBe('gone');
    expect(autoResolve({ ...q, dueDate: '2026-09-17' }, [], [], [], today)).toBe(null);
  });
  it('里程碑任务满足条件自动完成', () => {
    const p = person({ affection: 600, birth: { month: 1, day: 1 } });
    const cands = generateCandidates([p], DEFAULT_SETTINGS, today);
    const q: Quest = { ...base, kind: 'milestone', ruleKey: 'milestone:p:2:0', personId: 'p' };
    expect(autoResolve(q, cands, [p], [], today)).toBe('done');
  });
});
