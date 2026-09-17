import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { Interaction, Person } from '@/db/types';
import { INTERACTIONS } from '@/config/interactions';
import { TIERS } from '@/config/reactions';
import { deleteInteraction, setInteractionPoints } from '@/db/interactions';
import { Button } from '@/ui/Button';
import { Input } from '@/ui/Field';
import { Modal } from '@/ui/Modal';
import { Sprite } from '@/pixel/Sprite';
import { icon } from '@/pixel/sprites/icons';
import { formatDateTime } from '@/lib/date';
import { useToast } from '@/ui/Toast';

function PointsBadge({ points }: { points: number }) {
  const color = points > 0 ? 'var(--grass-dark)' : points < 0 ? 'var(--danger)' : 'var(--ink-soft)';
  return (
    <span style={{ color, fontSize: 'var(--fs-sm)', whiteSpace: 'nowrap' }}>
      {points > 0 ? '+' : ''}
      {points}
    </span>
  );
}

export function TimelineTab({ person, onRecord }: { person: Person; onRecord: () => void }) {
  const toast = useToast();
  const items = useLiveQuery(() => db.interactions.where('personId').equals(person.id).reverse().sortBy('at'), [person.id]);
  const [editing, setEditing] = useState<Interaction | null>(null);
  const [draft, setDraft] = useState('');

  const savePoints = async () => {
    if (!editing) return;
    const n = Number(draft);
    if (!Number.isFinite(n)) return;
    await setInteractionPoints(editing.id, Math.round(n));
    setEditing(null);
    toast('已改分');
  };

  const remove = async () => {
    if (!editing) return;
    await deleteInteraction(editing.id);
    setEditing(null);
    toast('已删除，分数已撤回');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Button variant="primary" block iconName="edit" onClick={onRecord}>
        记一笔和 {person.nickname || person.name} 的互动
      </Button>
      {items && items.length === 0 && <p style={{ textAlign: 'center', color: 'var(--ink-soft)', fontSize: 'var(--fs-sm)', padding: 16 }}>还没有互动记录</p>}
      {items?.map((it) => {
        const cfg = INTERACTIONS[it.type];
        const system = it.type === 'relationChange';
        return (
          <div
            key={it.id}
            className="px-corner-sm"
            onClick={() => {
              if (system) return;
              setEditing(it);
              setDraft(String(it.points));
            }}
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
              padding: '8px 10px',
              background: system ? 'var(--paper-dark)' : 'var(--white)',
              border: '2px solid var(--paper-deep)',
              cursor: system ? 'default' : 'pointer',
            }}
          >
            <Sprite grid={icon(cfg.icon, it.type === 'gift' && it.gift ? TIERS[it.gift.tier].color : '#5c3a1e')} scale={2} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span>
                  {cfg.label}
                  {it.gift && <span style={{ color: 'var(--ink-soft)' }}>：{it.gift.name}</span>}
                </span>
                {!system && <PointsBadge points={it.points} />}
              </div>
              {it.gift && it.type === 'gift' && (
                <div style={{ fontSize: 'var(--fs-sm)', color: TIERS[it.gift.tier].color }}>
                  {TIERS[it.gift.tier].icon} 「{TIERS[it.gift.tier].reaction}」
                </div>
              )}
              {it.memo && <div style={{ fontSize: 'var(--fs-sm)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{it.memo}</div>}
              <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)' }}>
                {formatDateTime(it.at)}
                {it.reason && !system && ` · ${it.reason}`}
                {it.points !== it.computedPoints && !system && ' · 已手动改分'}
              </div>
            </div>
          </div>
        );
      })}

      <Modal open={Boolean(editing)} title="这条互动" onClose={() => setEditing(null)}>
        {editing && (
          <>
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)' }}>
              {INTERACTIONS[editing.type].label} · {formatDateTime(editing.at)}
              <br />
              系统算出 {editing.computedPoints} 分{editing.reason ? `（${editing.reason}）` : ''}
            </p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Input type="number" inputMode="numeric" value={draft} onChange={(e) => setDraft(e.target.value)} />
              <Button variant="primary" onClick={savePoints}>
                改分
              </Button>
            </div>
            <Button variant="danger" block iconName="trash" onClick={remove}>
              删除这条（撤回分数）
            </Button>
          </>
        )}
      </Modal>
    </div>
  );
}
