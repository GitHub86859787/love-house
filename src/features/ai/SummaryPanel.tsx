import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { Person } from '@/db/types';
import { updatePerson } from '@/db/persons';
import { generateSummary, summaryHash, summaryInput } from '@/ai/summary';
import { estimateTokens, friendlyError } from '@/ai/client';
import { Panel } from '@/ui/Panel';
import { Button } from '@/ui/Button';
import { useToast } from '@/ui/Toast';
import { useAi } from './useAi';
import { formatDate } from '@/lib/date';

/** 人物摘要卡："你眼中的 TA" + 3 条见面前值得记住的事；资料变了才能重新生成 */
export function SummaryPanel({ person }: { person: Person }) {
  const ai = useAi();
  const toast = useToast();
  const interactions = useLiveQuery(() => db.interactions.where('personId').equals(person.id).toArray(), [person.id]);
  const [busy, setBusy] = useState(false);
  if (!ai.available || !interactions) return null;

  const input = summaryInput(person, interactions);
  const hash = summaryHash(input, ai.model);
  const cached = person.aiSummary;
  const stale = !cached || cached.sourceHash !== hash;
  const tokens = estimateTokens(input) + 300;

  const run = async () => {
    setBusy(true);
    try {
      const r = await generateSummary(input, ai.model);
      await updatePerson(person.id, { aiSummary: { text: r.summary, tips: r.tips, sourceHash: hash, createdAt: Date.now() } });
      toast('摘要更新了');
    } catch (e) {
      toast(friendlyError(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="你眼中的 TA" tight>
      {cached ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
          <p style={{ lineHeight: 1.6, userSelect: 'text' }}>{cached.text}</p>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--gold-dark)' }}>下次见面前值得记住的事</div>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 'var(--fs-sm)', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {cached.tips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ol>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: 'var(--ink-soft)' }}>
            <span style={{ flex: 1 }}>
              生成于 {formatDate(cached.createdAt)}
              {stale ? ' · 资料有变化' : ' · 是最新的'}
            </span>
            {stale && (
              <Button size="small" variant="ghost" disabled={busy} onClick={run}>
                {busy ? '生成中…' : `更新（约 ${tokens} token）`}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
          <span style={{ flex: 1, fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)' }}>让 AI 根据你记的资料写一段"你眼中的 TA"。</span>
          <Button size="small" variant="primary" disabled={busy} onClick={run}>
            {busy ? '生成中…' : `生成（约 ${tokens} token）`}
          </Button>
        </div>
      )}
    </Panel>
  );
}
