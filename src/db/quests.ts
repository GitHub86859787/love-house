import { db } from './db';
import type { Quest } from './types';
import { uid } from '@/lib/id';
import { toDateKey } from '@/lib/date';
import { getSettings } from './settings';
import { autoResolve, generateCandidates } from '@/features/quests/rules';

/** 把规则候选同步进 quests 表：新增缺的、自动完成 / 消失该消失的 */
export async function syncQuests(today = new Date()): Promise<void> {
  const settings = await getSettings();
  await db.transaction('rw', db.persons, db.interactions, db.quests, async () => {
    const persons = await db.persons.toArray();
    const interactions = await db.interactions.toArray();
    const candidates = generateCandidates(persons, settings, today);
    const existing = await db.quests.toArray();
    const byKey = new Map(existing.map((q) => [q.ruleKey, q]));
    const now = Date.now();

    // 里程碑任务：每人同时最多一条，做完再出下一条
    const openMilestoneBy = new Set(existing.filter((q) => q.kind === 'milestone' && q.status === 'open').map((q) => q.personId));
    const milestoneAddedBy = new Set<string>();

    for (const c of candidates) {
      if (byKey.has(c.ruleKey)) continue;
      if (c.kind === 'milestone' && c.personId) {
        if (openMilestoneBy.has(c.personId) || milestoneAddedBy.has(c.personId)) continue;
        milestoneAddedBy.add(c.personId);
      }
      await db.quests.add({
        id: uid(),
        type: c.kind === 'milestone' ? 'milestone' : c.kind === 'custom' ? 'custom' : c.kind === 'stale' || c.kind === 'birthday' || c.kind === 'holiday' ? 'reminder' : 'daily',
        kind: c.kind,
        ruleKey: c.ruleKey,
        personId: c.personId,
        title: c.title,
        description: c.description,
        dueDate: c.dueDate,
        status: 'open',
        priority: c.priority,
        createdAt: now,
      });
    }

    for (const q of existing) {
      if (q.status !== 'open') continue;
      const r = autoResolve(q, candidates, persons, interactions, today);
      if (r === 'done') await db.quests.update(q.id, { status: 'done', resolvedAt: now });
      else if (r === 'gone') await db.quests.delete(q.id);
      else {
        // 标题 / 描述随数据刷新（比如"还有 N 天"）
        const c = candidates.find((x) => x.ruleKey === q.ruleKey);
        if (c && (c.title !== q.title || c.description !== q.description)) await db.quests.update(q.id, { title: c.title, description: c.description });
      }
    }
  });
}

export async function completeQuest(id: string): Promise<void> {
  await db.quests.update(id, { status: 'done', resolvedAt: Date.now() });
}

/** 跳过今天：明天再出现（自定义提醒直接消失） */
export async function snoozeQuest(id: string, today = new Date()): Promise<void> {
  const q = await db.quests.get(id);
  if (!q) return;
  if (q.kind === 'custom') {
    await db.quests.update(id, { status: 'skipped', resolvedAt: Date.now() });
    return;
  }
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  await db.quests.update(id, { snoozedUntil: toDateKey(tomorrow) });
}

export async function addCustomReminder(personId: string, title: string, dueDate: string): Promise<Quest> {
  const q: Quest = {
    id: uid(),
    type: 'custom',
    kind: 'custom',
    ruleKey: `custom:${uid()}`,
    personId,
    title,
    dueDate,
    showFrom: dueDate,
    status: 'open',
    priority: 10,
    createdAt: Date.now(),
  };
  await db.quests.add(q);
  return q;
}

export async function deleteQuest(id: string): Promise<void> {
  await db.quests.delete(id);
}

/** 今天应显示的任务（最多 max 条） */
export function visibleQuests(all: Quest[], today = new Date(), max = 5): Quest[] {
  const key = toDateKey(today);
  return all
    .filter((q) => q.status === 'open')
    .filter((q) => !q.snoozedUntil || q.snoozedUntil <= key)
    .filter((q) => !q.showFrom || q.showFrom <= key)
    .sort((a, b) => a.priority - b.priority || a.createdAt - b.createdAt)
    .slice(0, max);
}
