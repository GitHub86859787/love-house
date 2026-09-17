import type { Interaction, Person } from '@/db/types';
import { AI_PROMPT_VERSION } from '@/config/ai-prompts';
import { RELATIONS } from '@/config/relations';
import { CATEGORIES, TIERS } from '@/config/reactions';
import { INTERACTIONS } from '@/config/interactions';
import { formatBirth } from '@/lib/birthday';
import { formatDate } from '@/lib/date';

/** 摘要输入：只用我确认过的信息，不含占卜推测 */
export function summaryInput(person: Person, interactions: Interaction[]): string {
  const prefs = person.preferences.filter((p) => p.source !== 'fortune');
  const lines = [
    `名字：${person.name}${person.nickname ? `（${person.nickname}）` : ''}，关系：${RELATIONS[person.relation].label}`,
    person.birth ? `生日：${formatBirth(person.birth)}` : '',
    person.metOn ? `认识于：${person.metOn}` : '',
    person.tags.length ? `性格标签：${person.tags.join('、')}` : '',
    prefs.length ? `喜好：${prefs.map((p) => `${p.name}（${CATEGORIES[p.category]}，${TIERS[p.tier].label}${p.note ? `，${p.note}` : ''}）`).join('；')}` : '',
    person.taboos.length ? `雷区：${person.taboos.join('；')}` : '',
    person.innerNote ? `最近的心事：${person.innerNote}` : '',
    person.notes.length ? `笔记：\n${person.notes.slice(0, 30).map((n) => `- ${formatDate(n.createdAt)}：${n.text}`).join('\n')}` : '',
    interactions.length
      ? `互动记录（近 30 条）：\n${interactions
          .slice()
          .sort((a, b) => b.at - a.at)
          .slice(0, 30)
          .map((i) => `- ${formatDate(i.at)} ${INTERACTIONS[i.type].label}${i.gift ? `：${i.gift.name}` : ''}${i.memo ? `，${i.memo}` : ''}`)
          .join('\n')}`
      : '',
  ].filter(Boolean);
  return lines.join('\n');
}

/** 输入指纹：资料变了才重新生成 */
export function summaryHash(input: string, model: string): string {
  let h = 2166136261;
  const s = `${AI_PROMPT_VERSION}|${model}|${input}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

