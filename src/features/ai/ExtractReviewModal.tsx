import { useEffect, useState } from 'react';
import type { Person, Preference } from '@/db/types';
import type { ExtractResult } from '@/ai/schemas';
import { CATEGORIES, TIERS } from '@/config/reactions';
import { updatePerson } from '@/db/persons';
import { Modal } from '@/ui/Modal';
import { Button } from '@/ui/Button';
import { TierIcon } from '@/ui/TierIcon';
import { useToast } from '@/ui/Toast';
import { uid } from '@/lib/id';
import { play } from '@/audio/sound';

interface Props {
  person: Person;
  result: ExtractResult | null;
  /** 本次整理涉及的笔记 id，写入后打标记 */
  noteIds: string[];
  onClose: () => void;
}

function CheckRow({ checked, onToggle, children }: { checked: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <label className="px-corner-sm" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', background: checked ? 'var(--white)' : 'var(--paper-dark)', border: `2px solid ${checked ? 'var(--gold-dark)' : 'var(--paper-deep)'}`, cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={onToggle} style={{ width: 20, height: 20, marginTop: 2, flex: 'none' }} />
      <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--fs-sm)' }}>{children}</span>
    </label>
  );
}

/** AI 提取结果逐条勾选确认；只有勾了的才写入 */
export function ExtractReviewModal({ person, result, noteIds, onClose }: Props) {
  const toast = useToast();
  const [prefs, setPrefs] = useState<boolean[]>([]);
  const [traits, setTraits] = useState<boolean[]>([]);
  const [taboos, setTaboos] = useState<boolean[]>([]);

  useEffect(() => {
    if (!result) return;
    setPrefs(result.preferences.map(() => true));
    setTraits(result.traits.map((t) => !person.tags.includes(t)));
    setTaboos(result.taboos.map(() => true));
  }, [result, person.tags]);

  if (!result) return null;
  const total = prefs.filter(Boolean).length + traits.filter(Boolean).length + taboos.filter(Boolean).length;
  const empty = result.preferences.length + result.traits.length + result.taboos.length === 0;

  const apply = async () => {
    const now = Date.now();
    const newPrefs: Preference[] = result.preferences
      .filter((_, i) => prefs[i])
      .map((p) => ({ id: uid(), name: p.name, category: p.category, tier: p.tier, note: p.basis ? `依据：${p.basis}` : undefined, source: 'ai', createdAt: now }));
    const newTags = result.traits.filter((_, i) => traits[i]).filter((t) => !person.tags.includes(t));
    const newTaboos = result.taboos.filter((_, i) => taboos[i]).map((t) => t.text).filter((t) => !person.taboos.includes(t));
    const notes = person.notes.map((n) => (noteIds.includes(n.id) ? { ...n, aiProcessedAt: now } : n));
    await updatePerson(person.id, {
      preferences: [...person.preferences, ...newPrefs],
      tags: [...person.tags, ...newTags],
      taboos: [...person.taboos, ...newTaboos],
      notes,
    });
    play('done');
    toast(total > 0 ? `写入了 ${total} 条` : '已标记为整理过');
    onClose();
  };

  return (
    <Modal open title="AI 整理出的候选" onClose={onClose}>
      <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)' }}>勾选的才会写入，AI 不会直接改你的数据。</p>
      {empty && <p style={{ fontSize: 'var(--fs-sm)' }}>这几条笔记里没提取出新的东西。</p>}
      {result.preferences.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--gold-dark)' }}>喜好候选</div>
          {result.preferences.map((p, i) => (
            <CheckRow key={i} checked={prefs[i] ?? false} onToggle={() => setPrefs((xs) => xs.map((v, k) => (k === i ? !v : v)))}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <TierIcon tier={p.tier} scale={1} />
                <b>{p.name}</b>
                <span style={{ color: 'var(--ink-soft)' }}>
                  {CATEGORIES[p.category]} · {TIERS[p.tier].label}
                </span>
              </span>
              <div style={{ color: 'var(--ink-soft)', fontSize: 10 }}>依据：{p.basis}</div>
            </CheckRow>
          ))}
        </div>
      )}
      {result.traits.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--gold-dark)' }}>性格标签候选</div>
          {result.traits.map((t, i) => (
            <CheckRow key={i} checked={traits[i] ?? false} onToggle={() => setTraits((xs) => xs.map((v, k) => (k === i ? !v : v)))}>
              {t}
              {person.tags.includes(t) && <span style={{ color: 'var(--ink-soft)' }}>（已有）</span>}
            </CheckRow>
          ))}
        </div>
      )}
      {result.taboos.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--danger)' }}>雷区候选</div>
          {result.taboos.map((t, i) => (
            <CheckRow key={i} checked={taboos[i] ?? false} onToggle={() => setTaboos((xs) => xs.map((v, k) => (k === i ? !v : v)))}>
              <b>{t.text}</b>
              <div style={{ color: 'var(--ink-soft)', fontSize: 10 }}>依据：{t.basis}</div>
            </CheckRow>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <Button block variant="ghost" onClick={onClose}>
          先不写
        </Button>
        <Button block variant="primary" onClick={apply}>
          {empty ? '标记为已整理' : `写入 ${total} 条`}
        </Button>
      </div>
    </Modal>
  );
}
