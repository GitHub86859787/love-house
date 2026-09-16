import { describe, expect, it } from 'vitest';
import { heartStates, heartsOf } from './HeartBar';

describe('heartStates', () => {
  it('0 点全空', () => {
    expect(heartStates(0)).toEqual(Array(10).fill('empty'));
  });
  it('125 点显示半心', () => {
    expect(heartStates(125)[0]).toBe('half');
    expect(heartStates(124)[0]).toBe('empty');
  });
  it('250 点一颗整心', () => {
    const s = heartStates(250);
    expect(s[0]).toBe('full');
    expect(s[1]).toBe('empty');
  });
  it('875 点 = 3 心半', () => {
    const s = heartStates(875);
    expect(s.filter((x) => x === 'full')).toHaveLength(3);
    expect(s[3]).toBe('half');
  });
  it('封顶 2500 = 10 心，超出不溢出', () => {
    expect(heartStates(9999).every((x) => x === 'full')).toBe(true);
    expect(heartsOf(9999)).toBe(10);
  });
});
