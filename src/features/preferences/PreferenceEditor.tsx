import { useEffect, useState } from 'react';
import type { Preference, PreferenceCategory, PreferenceTier } from '@/db/types';
import { CATEGORIES, TIER_ORDER, TIERS } from '@/config/reactions';
import { QUICK_PREFS } from '@/config/quick-prefs';
import { Modal } from '@/ui/Modal';
import { Button } from '@/ui/Button';
import { Chip, Chips, Field, Input, Select } from '@/ui/Field';
import { uid } from '@/lib/id';

interface Props {
  open: boolean;
  initial?: Preference | null;
  /** 新建时的默认档位 */
  defaultTier?: PreferenceTier;
  onClose: () => void;
  onSave: (pref: Preference) => void;
  onDelete?: (id: string) => void;
}

const CATEGORY_KEYS = Object.keys(CATEGORIES) as PreferenceCategory[];

export function PreferenceEditor({ open, initial, defaultTier = 'like', onClose, onSave, onDelete }: Props) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<PreferenceCategory>('food');
  const [tier, setTier] = useState<PreferenceTier>(defaultTier);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setCategory(initial?.category ?? 'food');
    setTier(initial?.tier ?? defaultTier);
    setNote(initial?.note ?? '');
  }, [open, initial, defaultTier]);

  const save = () => {
    const n = name.trim();
    if (!n) return;
    onSave({
      id: initial?.id ?? uid(),
      name: n,
      category,
      tier,
      note: note.trim() || undefined,
      source: initial?.source ?? 'manual',
      createdAt: initial?.createdAt ?? Date.now(),
    });
    onClose();
  };

  return (
    <Modal open={open} title={initial ? '编辑喜好' : '添加喜好'} onClose={onClose}>
      <Field label="名称">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="比如：手冲咖啡" maxLength={30} autoFocus />
      </Field>
      <Field label="分类">
        <Select value={category} onChange={(e) => setCategory(e.target.value as PreferenceCategory)}>
          {CATEGORY_KEYS.map((c) => (
            <option key={c} value={c}>
              {CATEGORIES[c]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="常用">
        <Chips>
          {QUICK_PREFS[category].map((q) => (
            <Chip key={q} active={q === name} onClick={() => setName(q)}>
              {q}
            </Chip>
          ))}
        </Chips>
      </Field>
      <Field label="档位">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {TIER_ORDER.map((t) => (
            <button
              key={t}
              type="button"
              className="px-corner-sm"
              onClick={() => setTier(t)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px',
                background: tier === t ? 'var(--gold)' : 'var(--white)',
                border: `2px solid ${tier === t ? 'var(--gold-dark)' : 'var(--wood-light)'}`,
                fontSize: 'var(--fs-sm)',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <span style={{ width: 40 }}>{TIERS[t].icon}</span>
              <span style={{ width: 48, color: TIERS[t].color }}>{TIERS[t].label}</span>
              <span style={{ color: 'var(--ink-soft)' }}>「{TIERS[t].reaction}」</span>
            </button>
          ))}
        </div>
      </Field>
      <Field label="备注（可选）">
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="比如：只喝浅烘" maxLength={60} />
      </Field>
      <div style={{ display: 'flex', gap: 8 }}>
        {initial && onDelete && (
          <Button
            variant="danger"
            iconName="trash"
            aria-label="删除"
            onClick={() => {
              onDelete(initial.id);
              onClose();
            }}
          />
        )}
        <Button block variant="primary" onClick={save} disabled={!name.trim()}>
          保存
        </Button>
      </div>
    </Modal>
  );
}
