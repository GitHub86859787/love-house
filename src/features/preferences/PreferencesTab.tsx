import { useState } from 'react';
import type { Person, Preference, PreferenceTier } from '@/db/types';
import { TIER_ORDER, TIERS } from '@/config/reactions';
import { updatePerson } from '@/db/persons';
import { Inset } from '@/ui/Panel';
import { Button } from '@/ui/Button';
import { Chips } from '@/ui/Field';
import { PreferenceChip } from './PreferenceChip';
import { PreferenceEditor } from './PreferenceEditor';

export function PreferencesTab({ person }: { person: Person }) {
  const [editing, setEditing] = useState<Preference | null>(null);
  const [open, setOpen] = useState(false);
  const [defaultTier, setDefaultTier] = useState<PreferenceTier>('like');

  const confirmed = person.preferences.filter((p) => p.source !== 'fortune');
  const guesses = person.preferences.filter((p) => p.source === 'fortune');

  const save = async (pref: Preference) => {
    const exists = person.preferences.some((p) => p.id === pref.id);
    const next = exists ? person.preferences.map((p) => (p.id === pref.id ? pref : p)) : [...person.preferences, pref];
    await updatePerson(person.id, { preferences: next });
  };
  const remove = async (id: string) => {
    await updatePerson(person.id, { preferences: person.preferences.filter((p) => p.id !== id) });
  };
  const openNew = (tier: PreferenceTier) => {
    setEditing(null);
    setDefaultTier(tier);
    setOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)' }}>长按条目可以看 TA 收到时的反应。</p>
      {TIER_ORDER.map((tier) => {
        const items = confirmed.filter((p) => p.tier === tier);
        return (
          <Inset key={tier}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--fs-sm)', color: TIERS[tier].color }}>
              <span>{TIERS[tier].icon}</span>
              <span>{TIERS[tier].label}</span>
              <span style={{ color: 'var(--ink-soft)', flex: 1 }}>· {items.length}</span>
              <Button size="small" variant="ghost" iconName="plus" aria-label={`添加${TIERS[tier].label}`} onClick={() => openNew(tier)} />
            </div>
            {items.length > 0 && (
              <div style={{ marginTop: 6 }}>
                <Chips>
                  {items.map((p) => (
                    <PreferenceChip
                      key={p.id}
                      pref={p}
                      onClick={() => {
                        setEditing(p);
                        setOpen(true);
                      }}
                    />
                  ))}
                </Chips>
              </div>
            )}
          </Inset>
        );
      })}

      {guesses.length > 0 && (
        <Inset style={{ borderStyle: 'dashed' }}>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)' }}>🔮 占卜师的猜测 · {guesses.length}</div>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)' }}>确认与标记功能将在占卜师阶段开放。</p>
        </Inset>
      )}

      <Button variant="primary" block iconName="plus" onClick={() => openNew('like')}>
        添加喜好
      </Button>

      <PreferenceEditor open={open} initial={editing} defaultTier={defaultTier} onClose={() => setOpen(false)} onSave={save} onDelete={remove} />
    </div>
  );
}
