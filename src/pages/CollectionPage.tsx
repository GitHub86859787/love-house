import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '@/db/db';
import type { Interaction, Person } from '@/db/types';
import { Page, PageHeader } from '@/app/Layout';
import { Panel, Inset } from '@/ui/Panel';
import { Tabs } from '@/ui/Tabs';
import { Button } from '@/ui/Button';
import { Modal } from '@/ui/Modal';
import { Select } from '@/ui/Field';
import { TierIcon } from '@/ui/TierIcon';
import { Sprite } from '@/pixel/Sprite';
import { icon } from '@/pixel/sprites/icons';
import { HEART_SMALL } from '@/pixel/sprites/heart';
import { Avatar } from '@/pixel/avatar/Avatar';
import { TIERS } from '@/config/reactions';
import { ACHIEVEMENTS } from '@/config/achievements';
import { RELATIONS } from '@/config/relations';
import { buildGiftCards, type GiftCard } from '@/features/collection/gifts';
import { unlockItems, UNLOCK_MAX } from '@/features/collection/unlock';
import { mergeGiftCards } from '@/db/gifts';
import { formatDate } from '@/lib/date';
import { useToast } from '@/ui/Toast';
import { play } from '@/audio/sound';
import styles from './CollectionPage.module.css';

type Tab = 'gifts' | 'received' | 'persons' | 'achievements';
const TABS: { key: Tab; label: string }[] = [
  { key: 'gifts', label: '礼物' },
  { key: 'received', label: '收到的' },
  { key: 'persons', label: '人物卡' },
  { key: 'achievements', label: '成就' },
];

export function CollectionPage() {
  const [tab, setTab] = useState<Tab>('gifts');
  const persons = useLiveQuery(() => db.persons.filter((p) => !p.isMe).toArray(), []);
  const interactions = useLiveQuery(() => db.interactions.toArray(), []);
  const unlocked = useLiveQuery(() => db.achievements.toArray(), []);

  return (
    <Page>
      <PageHeader title="图鉴" subtitle="礼物、人物卡与成就" />
      <Panel tight>
        <Tabs tabs={TABS} value={tab} onChange={setTab} />
        {tab === 'gifts' && <GiftTab type="gift" interactions={interactions ?? []} persons={persons ?? []} />}
        {tab === 'received' && <GiftTab type="receivedGift" interactions={interactions ?? []} persons={persons ?? []} />}
        {tab === 'persons' && <PersonCards persons={persons ?? []} interactions={interactions ?? []} />}
        {tab === 'achievements' && <Achievements unlocked={new Map((unlocked ?? []).map((a) => [a.id, a.unlockedAt]))} />}
      </Panel>
    </Page>
  );
}

function GiftTab({ type, interactions, persons }: { type: 'gift' | 'receivedGift'; interactions: Interaction[]; persons: Person[] }) {
  const toast = useToast();
  const cards = useMemo(() => buildGiftCards(interactions, persons, type), [interactions, persons, type]);
  const [selected, setSelected] = useState<GiftCard | null>(null);
  const [mergeTo, setMergeTo] = useState('');
  const isGift = type === 'gift';

  const doMerge = async () => {
    if (!selected || !mergeTo) return;
    const n = await mergeGiftCards(selected.name, mergeTo);
    toast(`已把 ${n} 条记录合并到「${mergeTo}」`);
    play('pop');
    setSelected(null);
    setMergeTo('');
  };

  if (cards.length === 0) {
    return <p style={{ textAlign: 'center', color: 'var(--ink-soft)', fontSize: 'var(--fs-sm)', padding: 24 }}>{isGift ? '还没送过礼物。记一笔「送礼」就会出现在这里。' : '还没收到过礼物。记一笔「对方送礼」就会出现在这里。'}</p>;
  }

  return (
    <>
      <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)', marginBottom: 8 }}>
        {isGift ? `送出过 ${cards.length} 种礼物` : `收到过 ${cards.length} 种礼物`}
      </p>
      <div className={styles.grid}>
        {cards.map((c) => (
          <div key={c.name} className={`${styles.giftCard} px-corner-sm`} onClick={() => setSelected(c)}>
            <Sprite grid={icon(isGift ? 'gift' : 'giftIn', TIERS[c.tier].color)} scale={3} />
            <span className={styles.giftName}>{c.name}</span>
            <span className={styles.giftMeta}>
              ×{c.count} · {c.recipients.length} 人
            </span>
            {isGift && <TierIcon tier={c.tier} scale={1} />}
          </div>
        ))}
      </div>

      <Modal open={Boolean(selected)} title={selected?.name ?? ''} onClose={() => setSelected(null)}>
        {selected && (
          <>
            <Inset>
              <div style={{ fontSize: 'var(--fs-sm)' }}>
                {isGift ? '送出' : '收到'} {selected.count} 次 · 最近 {formatDate(selected.lastAt)}
                {selected.totalPrice > 0 && ` · 共 ¥${selected.totalPrice}`}
              </div>
            </Inset>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {selected.recipients.map((r) => (
                <div key={r.personId} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--fs-sm)' }}>
                  <span style={{ flex: 1 }}>
                    {r.name} ×{r.count}
                  </span>
                  {isGift && (
                    <span style={{ color: TIERS[r.tier].color, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <TierIcon tier={r.tier} scale={1} />「{TIERS[r.tier].reaction}」
                    </span>
                  )}
                </div>
              ))}
            </div>
            {cards.length > 1 && (
              <div style={{ borderTop: '2px dashed var(--paper-deep)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)' }}>写法不一样但其实是同一种礼物？合并到：</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Select value={mergeTo} onChange={(e) => setMergeTo(e.target.value)}>
                    <option value="">选择一张卡</option>
                    {cards
                      .filter((c) => c.name !== selected.name)
                      .map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                  </Select>
                  <Button variant="primary" disabled={!mergeTo} onClick={doMerge}>
                    合并
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Modal>
    </>
  );
}

function PersonCards({ persons, interactions }: { persons: Person[]; interactions: Interaction[] }) {
  const nav = useNavigate();
  const [flipped, setFlipped] = useState<string | null>(null);
  if (persons.length === 0) return <p style={{ textAlign: 'center', color: 'var(--ink-soft)', fontSize: 'var(--fs-sm)', padding: 24 }}>还没有村民</p>;
  return (
    <>
      <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)', marginBottom: 8 }}>点卡片翻面看解锁度，{UNLOCK_MAX} 项全满变金边。</p>
      <div className={styles.grid}>
        {persons.map((p) => {
          const items = unlockItems(p, interactions);
          const level = items.filter((x) => x.done).length;
          const gold = level >= UNLOCK_MAX;
          const hearts = Math.floor(p.affection / 250);
          return (
            <div
              key={p.id}
              className={`${styles.flip} ${flipped === p.id ? styles.flipped : ''}`}
              onClick={() => {
                play('pop');
                setFlipped(flipped === p.id ? null : p.id);
              }}
            >
              <div className={styles.flipInner}>
                <div className={`${styles.face} px-corner ${gold ? styles.faceGold : ''}`}>
                  <Avatar config={p.avatar} scale={3} />
                  <span style={{ fontSize: 'var(--fs-sm)' }}>{p.name}</span>
                  <span style={{ fontSize: 10, color: 'var(--ink-soft)' }}>{RELATIONS[p.relation].label}</span>
                  <span style={{ display: 'flex', gap: 1 }}>
                    {Array.from({ length: hearts }).map((_, i) => (
                      <Sprite key={i} grid={HEART_SMALL} scale={1} />
                    ))}
                  </span>
                  <span className={styles.level}>
                    解锁 {level}/{UNLOCK_MAX}
                  </span>
                </div>
                <div className={`${styles.face} ${styles.back} px-corner ${gold ? styles.faceGold : ''}`}>
                  <div className={styles.checklist}>
                    {items.map((it) => (
                      <div key={it.key} className={`${styles.check} ${it.done ? '' : styles.checkOff}`}>
                        <span>{it.done ? '■' : '□'}</span>
                        <span>{it.label}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    size="small"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      nav(`/person/${p.id}`);
                    }}
                  >
                    去补全
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function Achievements({ unlocked }: { unlocked: Map<string, number> }) {
  const visible = ACHIEVEMENTS.filter((a) => !a.hidden || unlocked.has(a.id));
  const hiddenLeft = ACHIEVEMENTS.filter((a) => a.hidden && !unlocked.has(a.id)).length;
  return (
    <>
      <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)', marginBottom: 8 }}>
        已解锁 {unlocked.size}/{ACHIEVEMENTS.length}
        {hiddenLeft > 0 && ` · 还有 ${hiddenLeft} 个隐藏成就`}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {visible.map((a) => {
          const at = unlocked.get(a.id);
          return (
            <div key={a.id} className={`${styles.ach} px-corner-sm ${at ? '' : styles.achLocked}`}>
              <Sprite grid={icon('star', at ? '#f5c542' : '#8a8a8a')} scale={2} />
              <div className={styles.achBody}>
                <div className={styles.achTitle}>
                  {a.title}
                  {a.hidden && <span style={{ color: 'var(--gold-dark)', fontSize: 10 }}> · 隐藏</span>}
                </div>
                <div className={styles.achDesc}>
                  {a.description}
                  {at && ` · ${formatDate(at)}`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
