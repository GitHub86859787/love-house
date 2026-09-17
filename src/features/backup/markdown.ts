/**
 * 人类可读的 Markdown 导出：每人一节（资料、喜好、雷区、笔记、命书全文）。
 */
import type { Interaction, Person } from '@/db/types';
import { RELATIONS } from '@/config/relations';
import { CATEGORIES, TIERS, TIER_ORDER } from '@/config/reactions';
import { CHAPTERS } from '@/config/fortune-book';
import { INTERACTIONS } from '@/config/interactions';
import { formatBirth } from '@/lib/birthday';
import { toDateKey } from '@/lib/date';
import { bookOf } from '@/db/fortune';
import type { FortuneBook } from '@/fortune/book';

function dt(ts: number): string {
  const d = new Date(ts);
  return `${toDateKey(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function bookToMarkdown(book: FortuneBook): string {
  const out: string[] = [];
  const nums = ['一', '二', '三', '四', '五', '六', '七'];
  CHAPTERS.forEach((c, i) => {
    if (c.key === 'guide') {
      const g = book.guide;
      if (!g) return;
      out.push(`#### 第${nums[i]}章 ${c.title}`);
      const grp = (title: string, items: { text: string; source: string }[]) => {
        if (!items.length) return;
        out.push(`**${title}**`, '');
        items.forEach((it) => out.push(`- ${it.text}（${it.source}）`));
        out.push('');
      };
      grp('性格', g.character);
      grp('相处', g.getAlong);
      grp('话题', g.topics);
      grp('送礼方向', g.gifts.map((x) => ({ text: `${x.name}（${x.tier === 'love' ? '可能最爱' : '可能喜欢'}）`, source: x.source })));
      return;
    }
    const ch = book.chapters[c.key];
    if (!ch || !ch.rounds.length) return;
    out.push(`#### 第${nums[i]}章 ${c.title}`, '');
    ch.rounds.forEach((r, ri) => {
      if (ri > 0) out.push(`*第 ${ri + 1} 次讲 · ${toDateKey(new Date(r.createdAt))}*`, '');
      for (const s of r.sections) {
        out.push(`**${s.title}**`, '', s.body, '');
      }
      if (r.incomplete) out.push('*（这一轮中途断了，只保留了已写的部分）*', '');
    });
    if (ch.traits.length) {
      out.push('性格特点：', '');
      ch.traits.forEach((t) => out.push(`- ${t.text}（${t.basis}）${t.verdict === 'hit' ? ' ✓ 准' : t.verdict === 'miss' ? ' ✗ 不准' : ''}`));
      out.push('');
    }
  });
  return out.join('\n');
}

export function personToMarkdown(p: Person, interactions: Interaction[]): string {
  const out: string[] = [];
  const title = p.isMe ? `我（${p.name}）` : p.nickname && p.nickname !== p.name ? `${p.name}「${p.nickname}」` : p.name;
  out.push(`## ${title}`, '');
  out.push('### 资料', '');
  if (!p.isMe) out.push(`- 关系：${RELATIONS[p.relation].label}`);
  if (!p.isMe) out.push(`- 好感度：${Math.floor(p.affection / 250)} 心（${p.affection} 点）`);
  out.push(`- 生日：${p.birth ? formatBirth(p.birth) + (p.birth.place ? `，${p.birth.place.name}` : '') : '未知'}`);
  if (p.metOn) out.push(`- 认识于：${p.metOn}`);
  if (p.tags.length) out.push(`- 性格标签：${p.tags.join('、')}`);
  if (p.selfTags.length) out.push(`- TA 自己说：${p.selfTags.map((t) => `${t.key} ${t.value}`).join('、')}`);
  if (p.innerNote) out.push(`- 心事：${p.innerNote}`);
  const mine = interactions.filter((i) => i.personId === p.id);
  if (!p.isMe) out.push(`- 互动：${mine.length} 次${p.lastInteractionAt ? `，最近 ${toDateKey(new Date(p.lastInteractionAt))}` : ''}`);
  out.push('');

  const confirmed = p.preferences.filter((x) => x.source !== 'fortune');
  const guessed = p.preferences.filter((x) => x.source === 'fortune');
  out.push('### 喜好', '');
  if (!confirmed.length) out.push('（还没记）');
  for (const tier of TIER_ORDER) {
    const items = confirmed.filter((x) => x.tier === tier);
    if (!items.length) continue;
    out.push(`- **${TIERS[tier].label}**：${items.map((x) => `${x.name}（${CATEGORIES[x.category]}${x.note ? `，${x.note}` : ''}）`).join('；')}`);
  }
  if (guessed.length) out.push(`- *星婆婆的猜测（未确认，不计分）*：${guessed.map((x) => x.name).join('、')}`);
  out.push('');

  out.push('### 雷区', '');
  out.push(p.taboos.length ? p.taboos.map((t) => `- ${t}`).join('\n') : '（无）');
  out.push('');

  out.push('### 笔记', '');
  if (!p.notes.length) out.push('（无）');
  [...p.notes].sort((a, b) => a.createdAt - b.createdAt).forEach((n) => out.push(`- ${dt(n.createdAt)}：${n.text.replace(/\n/g, ' ')}`));
  out.push('');

  if (mine.length) {
    out.push('### 互动记录', '');
    [...mine]
      .sort((a, b) => a.at - b.at)
      .forEach((i) => out.push(`- ${toDateKey(new Date(i.at))} ${INTERACTIONS[i.type].label}${i.gift ? `：${i.gift.name}（${TIERS[i.gift.tier].label}）` : ''}${i.memo ? `，${i.memo}` : ''}${i.points ? ` ${i.points > 0 ? '+' : ''}${i.points}` : ''}`));
    out.push('');
  }

  const book = bookOf(p);
  if (book && (Object.values(book.chapters).some((c) => c && c.rounds.length) || book.guide)) {
    out.push('### 星婆婆命书', '', '> 命书内容全部是推测，只有确认过的才是正式资料。', '');
    out.push(bookToMarkdown(book));
  }
  return out.join('\n');
}

export function villageToMarkdown(persons: Person[], interactions: Interaction[], now = new Date()): string {
  const me = persons.find((p) => p.isMe);
  const others = persons.filter((p) => !p.isMe).sort((a, b) => b.affection - a.affection);
  const out = [`# 人情村`, '', `导出于 ${toDateKey(now)} · ${others.length} 位村民 · ${interactions.length} 条互动`, ''];
  if (me) out.push(personToMarkdown(me, interactions), '');
  for (const p of others) out.push(personToMarkdown(p, interactions), '');
  return out.join('\n');
}
