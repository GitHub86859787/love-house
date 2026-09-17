import { describe, expect, it } from 'vitest';
import { computeScore, giftsThisWeek, matchGift, weekStart } from './engine';
import type { Interaction, Person } from '@/db/types';

function person(over: Partial<Person> = {}): Person {
  return {
    id: 'p1',
    name: '小雨',
    relation: 'friend',
    avatar: {} as Person['avatar'],
    tags: [],
    selfTags: [],
    preferences: [
      { id: 'a', name: '手冲咖啡', category: 'food', tier: 'love', source: 'manual', createdAt: 0 },
      { id: 'b', name: '香菜', category: 'food', tier: 'hate', source: 'manual', createdAt: 0 },
      { id: 'c', name: '占卜猜的', category: 'item', tier: 'like', source: 'fortune', createdAt: 0 },
    ],
    taboos: [],
    notes: [],
    affection: 0,
    milestonesUnlocked: [],
    createdAt: 0,
    updatedAt: 0,
    ...over,
  };
}

function inter(type: Interaction['type'], at: number): Interaction {
  return { id: String(at), personId: 'p1', at, type, computedPoints: 0, points: 0, createdAt: at };
}

const wed = new Date(2026, 8, 16, 12); // 2026-09-16 周三

describe('computeScore', () => {
  it('送礼按档位', () => {
    expect(computeScore({ person: person(), type: 'gift', giftTier: 'love', at: wed, history: [], weeklyGiftLimitEnabled: true }).points).toBe(80);
    expect(computeScore({ person: person(), type: 'gift', giftTier: 'hate', at: wed, history: [], weeklyGiftLimitEnabled: true }).points).toBe(-40);
  });
  it('生日送礼 ×8，且不受每周上限', () => {
    const p = person({ birth: { month: 9, day: 16 } });
    const history = [inter('gift', wed.getTime() - 86400000), inter('gift', wed.getTime() - 2 * 86400000)];
    const r = computeScore({ person: p, type: 'gift', giftTier: 'love', at: wed, history, weeklyGiftLimitEnabled: true });
    expect(r.points).toBe(640);
    expect(r.giftLimitHit).toBe(false);
  });
  it('每周第三次送礼不计分（周一重置）', () => {
    const history = [inter('gift', new Date(2026, 8, 14, 9).getTime()), inter('gift', new Date(2026, 8, 15, 9).getTime())];
    const r = computeScore({ person: person(), type: 'gift', giftTier: 'like', at: wed, history, weeklyGiftLimitEnabled: true });
    expect(r.points).toBe(0);
    expect(r.giftLimitHit).toBe(true);
    const old = [inter('gift', new Date(2026, 8, 13, 9).getTime()), inter('gift', new Date(2026, 8, 12, 9).getTime())];
    expect(computeScore({ person: person(), type: 'gift', giftTier: 'like', at: wed, history: old, weeklyGiftLimitEnabled: true }).points).toBe(45);
    expect(computeScore({ person: person(), type: 'gift', giftTier: 'like', at: wed, history, weeklyGiftLimitEnabled: false }).points).toBe(45);
  });
  it('聊天一天只算一次，其他类型第二次减半', () => {
    const history = [inter('chat', wed.getTime() - 3600000), inter('meet', wed.getTime() - 3600000)];
    expect(computeScore({ person: person(), type: 'chat', at: wed, history, weeklyGiftLimitEnabled: true }).points).toBe(0);
    expect(computeScore({ person: person(), type: 'meet', at: wed, history, weeklyGiftLimitEnabled: true }).points).toBe(20);
    expect(computeScore({ person: person(), type: 'help', at: wed, history, weeklyGiftLimitEnabled: true }).points).toBe(50);
  });
  it('生日非送礼互动 ×2，先减半再乘 2', () => {
    const p = person({ birth: { month: 9, day: 16 } });
    expect(computeScore({ person: p, type: 'meet', at: wed, history: [], weeklyGiftLimitEnabled: true }).points).toBe(80);
    const history = [inter('meet', wed.getTime() - 3600000)];
    expect(computeScore({ person: p, type: 'meet', at: wed, history, weeklyGiftLimitEnabled: true }).points).toBe(40);
  });
  it('对方送礼不加分', () => {
    expect(computeScore({ person: person(), type: 'receivedGift', at: wed, history: [], weeklyGiftLimitEnabled: true }).points).toBe(0);
  });
  it('农历生日按农历判断', () => {
    // 2026-09-25 是农历八月十五
    const p = person({ birth: { month: 8, day: 15, isLunar: true } });
    expect(computeScore({ person: p, type: 'gift', giftTier: 'like', at: new Date(2026, 8, 25, 12), history: [], weeklyGiftLimitEnabled: true }).points).toBe(360);
    expect(computeScore({ person: p, type: 'gift', giftTier: 'like', at: new Date(2026, 7, 15, 12), history: [], weeklyGiftLimitEnabled: true }).points).toBe(45);
  });
});

describe('weekStart / giftsThisWeek', () => {
  it('周一为一周开始', () => {
    expect(weekStart(wed).getDate()).toBe(14);
    expect(weekStart(new Date(2026, 8, 13)).getDate()).toBe(7);
    expect(weekStart(new Date(2026, 8, 14, 0, 0, 1)).getDate()).toBe(14);
  });
  it('只数本周', () => {
    const h = [inter('gift', new Date(2026, 8, 13).getTime()), inter('gift', new Date(2026, 8, 14).getTime()), inter('chat', new Date(2026, 8, 15).getTime())];
    expect(giftsThisWeek(h, wed)).toBe(1);
  });
});

describe('matchGift', () => {
  it('精确与包含匹配，忽略占卜推测', () => {
    expect(matchGift(person(), '手冲咖啡').tier).toBe('love');
    expect(matchGift(person(), '一包香菜').tier).toBe('hate');
    expect(matchGift(person(), '占卜猜的').tier).toBe('neutral');
    expect(matchGift(person(), '不认识的东西').tier).toBe('neutral');
  });
});
