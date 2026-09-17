import { describe, expect, it } from 'vitest';
import { computeDecay, daysSinceContact, isStale } from './decay';
import { DEFAULT_SETTINGS } from '@/db/settings';
import type { Person } from '@/db/types';

const DAY = 86400000;
const today = new Date(2026, 8, 16);

function person(over: Partial<Person> = {}): Person {
  return {
    id: 'p',
    name: 'x',
    relation: 'friend', // 宽限 14 天
    avatar: {} as Person['avatar'],
    tags: [],
    selfTags: [],
    preferences: [],
    taboos: [],
    notes: [],
    affection: 760, // 3 心 + 10
    milestonesUnlocked: [],
    createdAt: today.getTime() - 100 * DAY,
    updatedAt: 0,
    ...over,
  };
}

describe('computeDecay', () => {
  it('宽限期内不掉分', () => {
    const p = person({ lastInteractionAt: today.getTime() - 14 * DAY });
    expect(computeDecay(p, DEFAULT_SETTINGS, today).lost).toBe(0);
    expect(isStale(p, DEFAULT_SETTINGS, today)).toBe(false);
  });
  it('超过宽限后每天 -2，从宽限结束次日算', () => {
    const p = person({ lastInteractionAt: today.getTime() - 16 * DAY });
    expect(computeDecay(p, DEFAULT_SETTINGS, today)).toEqual({ affection: 756, lastDecayDate: '2026-09-16', lost: 4 });
    expect(isStale(p, DEFAULT_SETTINGS, today)).toBe(true);
  });
  it('只掉到当前整心底部', () => {
    const p = person({ lastInteractionAt: today.getTime() - 60 * DAY });
    expect(computeDecay(p, DEFAULT_SETTINGS, today).affection).toBe(750);
  });
  it('已结算过的天不重复扣', () => {
    const p = person({ lastInteractionAt: today.getTime() - 20 * DAY, lastDecayDate: '2026-09-14' });
    expect(computeDecay(p, DEFAULT_SETTINGS, today).lost).toBe(4);
    const p2 = person({ lastInteractionAt: today.getTime() - 20 * DAY, lastDecayDate: '2026-09-16' });
    expect(computeDecay(p2, DEFAULT_SETTINGS, today).lost).toBe(0);
  });
  it('家人不衰减，满心不衰减，全局关闭不衰减，「我」不衰减', () => {
    expect(computeDecay(person({ relation: 'family', lastInteractionAt: today.getTime() - 90 * DAY }), DEFAULT_SETTINGS, today).lost).toBe(0);
    expect(computeDecay(person({ affection: 2500, lastInteractionAt: today.getTime() - 90 * DAY }), DEFAULT_SETTINGS, today).lost).toBe(0);
    expect(computeDecay(person({ lastInteractionAt: today.getTime() - 90 * DAY }), { ...DEFAULT_SETTINGS, decayEnabled: false }, today).lost).toBe(0);
    expect(computeDecay(person({ isMe: true, lastInteractionAt: today.getTime() - 90 * DAY }), DEFAULT_SETTINGS, today).lost).toBe(0);
  });
  it('个人覆盖宽限天数', () => {
    const p = person({ lastInteractionAt: today.getTime() - 16 * DAY, staleDaysOverride: 30 });
    expect(computeDecay(p, DEFAULT_SETTINGS, today).lost).toBe(0);
  });
  it('零互动的人从认识日算', () => {
    const p = person({ metOn: '2026-09-10' });
    expect(daysSinceContact(p, today)).toBe(6);
    expect(computeDecay(p, DEFAULT_SETTINGS, today).lost).toBe(0);
  });
});
