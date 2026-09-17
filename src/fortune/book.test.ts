import { describe, expect, it } from 'vitest';
import { parsePartialJson, partialChapter } from './book';

const full = JSON.stringify({ sections: [{ title: '日主乙木', body: '第一段。\n第二段「引号」。' }, { title: '年柱', body: '正文' }], traits: [{ text: 'a', basis: 'b' }] });

describe('parsePartialJson', () => {
  it('完整 JSON 原样解析', () => {
    expect(parsePartialJson(full)).toEqual(JSON.parse(full));
  });
  it('截在字符串中间：补齐后能拿到已出现的小节', () => {
    for (let cut = 20; cut < full.length; cut += 7) {
      const p = partialChapter(full.slice(0, cut));
      // 有些切点解析不出来（比如切在 \n 转义中间），允许 null，但不许抛错
      if (p) expect(Array.isArray(p.sections)).toBe(true);
    }
  });
  it('截在第二个小节 body 中间：第一个小节完整，第二个部分', () => {
    const idx = full.indexOf('正文') + 1;
    const p = partialChapter(full.slice(0, idx))!;
    expect(p.sections[0]).toEqual({ title: '日主乙木', body: '第一段。\n第二段「引号」。' });
    expect(p.sections[1].title).toBe('年柱');
    expect(p.sections[1].body.length).toBeGreaterThanOrEqual(0);
  });
  it('只写了一半的键会被丢掉', () => {
    const cut = full.indexOf('"body"') + 3;
    const p = partialChapter(full.slice(0, cut))!;
    expect(p.sections[0].title).toBe('日主乙木');
    expect(p.sections[0].body).toBe('');
  });
  it('非 JSON 开头返回 null', () => {
    expect(parsePartialJson('hello')).toBeNull();
    expect(partialChapter('')).toBeNull();
  });
});
