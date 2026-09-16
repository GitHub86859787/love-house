import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { deletePerson, updatePerson } from '@/db/persons';
import type { Note } from '@/db/types';
import { RELATIONS } from '@/config/relations';
import { MILESTONES } from '@/config/milestones';
import { TIER_ORDER, TIERS } from '@/config/reactions';
import { Page, PageHeader } from '@/app/Layout';
import { Panel, Inset } from '@/ui/Panel';
import { Button } from '@/ui/Button';
import { HeartBar, heartsOf } from '@/ui/HeartBar';
import { Tabs } from '@/ui/Tabs';
import { Modal } from '@/ui/Modal';
import { Chip, Chips, Textarea } from '@/ui/Field';
import { useToast } from '@/ui/Toast';
import { Avatar } from '@/pixel/avatar/Avatar';
import { isGhost } from '@/features/persons/VillageScene';
import { SCORING } from '@/config/scoring';
import { uid } from '@/lib/id';
import { formatDateTime, formatRelative } from '@/lib/date';
import styles from './PersonDetailPage.module.css';

type Tab = 'prefs' | 'notes' | 'timeline' | 'milestones';

const TABS: { key: Tab; label: string }[] = [
  { key: 'prefs', label: '喜好' },
  { key: 'notes', label: '笔记' },
  { key: 'timeline', label: '互动' },
  { key: 'milestones', label: '里程碑' },
];

export function PersonDetailPage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const person = useLiveQuery(() => db.persons.get(id), [id]);
  const [tab, setTab] = useState<Tab>('prefs');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');

  if (person === undefined) {
    return (
      <Page>
        <PageHeader title="…" left={<Button variant="ghost" iconName="back" aria-label="返回" onClick={() => nav('/')} />} />
      </Page>
    );
  }
  if (person === null) {
    return (
      <Page>
        <PageHeader title="找不到这位村民" left={<Button variant="ghost" iconName="back" aria-label="返回" onClick={() => nav('/')} />} />
      </Page>
    );
  }

  const hearts = heartsOf(person.affection);
  const golden = hearts >= SCORING.maxHearts;
  const ghost = isGhost(person);
  const birthdayText = person.birthday ? `${person.birthday.month} 月 ${person.birthday.day} 日${person.birthday.year ? ` · ${person.birthday.year} 年` : ''}` : '未知';

  const addNote = async () => {
    const text = noteDraft.trim();
    if (!text) return;
    const note: Note = { id: uid(), text, createdAt: Date.now() };
    await updatePerson(person.id, { notes: [note, ...person.notes] });
    setNoteDraft('');
    toast('记下了');
  };

  const removeNote = async (noteId: string) => {
    await updatePerson(person.id, { notes: person.notes.filter((n) => n.id !== noteId) });
  };

  const doDelete = async () => {
    await deletePerson(person.id);
    toast(`${person.name} 搬走了`);
    nav('/', { replace: true });
  };

  return (
    <Page>
      <PageHeader
        title={person.name}
        left={<Button variant="ghost" iconName="back" aria-label="返回" onClick={() => nav('/')} />}
        right={<Button variant="ghost" iconName="edit" aria-label="编辑" onClick={() => nav(`/person/${person.id}/edit`)} />}
      />

      <Panel golden={golden}>
        <div className={styles.hero}>
          <div className={`${styles.avatarBox} px-corner`}>
            <Avatar config={person.avatar} scale={4} ghost={ghost} />
          </div>
          <div className={styles.info}>
            <div className={styles.nameRow}>
              <h2>{person.name}</h2>
              {person.nickname && <span className={styles.nickname}>「{person.nickname}」</span>}
              <span className={`${styles.relation} px-corner-sm`}>{RELATIONS[person.relation].label}</span>
            </div>
            <div className={styles.meta}>
              <span>生日：{birthdayText}</span>
              {person.metOn && <span>认识于 {person.metOn}</span>}
              <span>{person.lastInteractionAt ? `上次互动 ${formatRelative(person.lastInteractionAt)}` : '还没有互动记录'}</span>
            </div>
          </div>
        </div>
        <div className={styles.heartsRow}>
          <HeartBar points={person.affection} scale={2} showText />
        </div>
        {person.tags.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <Chips>
              {person.tags.map((t) => (
                <Chip key={t}>{t}</Chip>
              ))}
            </Chips>
          </div>
        )}
        {person.taboos.length > 0 && (
          <div className={`${styles.tabooBox} px-corner-sm`} style={{ marginTop: 12 }}>
            <div className={styles.tabooTitle}>⚠ 忌讳 / 雷区</div>
            <Chips>
              {person.taboos.map((t) => (
                <Chip key={t} danger>
                  {t}
                </Chip>
              ))}
            </Chips>
          </div>
        )}
      </Panel>

      <Panel tight>
        <Tabs tabs={TABS} value={tab} onChange={setTab} />

        {tab === 'prefs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {TIER_ORDER.map((tier) => {
              const items = person.preferences.filter((p) => p.tier === tier);
              return (
                <Inset key={tier}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--fs-sm)', color: TIERS[tier].color }}>
                    <span>{TIERS[tier].icon}</span>
                    <span>{TIERS[tier].label}</span>
                    <span style={{ color: 'var(--ink-soft)' }}>· {items.length}</span>
                  </div>
                  {items.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      <Chips>
                        {items.map((p) => (
                          <Chip key={p.id}>{p.name}</Chip>
                        ))}
                      </Chips>
                    </div>
                  )}
                </Inset>
              );
            })}
            <p className={styles.empty}>喜好的添加与送礼匹配将在阶段 2 开放</p>
          </div>
        )}

        {tab === 'notes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="随手记一段：今天她说最近迷上手冲咖啡……" />
            <Button variant="primary" onClick={addNote} disabled={!noteDraft.trim()}>
              记下来
            </Button>
            {person.notes.length === 0 && <p className={styles.empty}>还没有笔记</p>}
            {person.notes.map((n) => (
              <div key={n.id} className={`${styles.note} px-corner-sm`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className={styles.noteTime}>{formatDateTime(n.createdAt)}</span>
                  <Button size="small" variant="ghost" iconName="trash" aria-label="删除笔记" onClick={() => removeNote(n.id)} />
                </div>
                <div className={styles.noteText}>{n.text}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'timeline' && <p className={styles.empty}>互动时间线将在阶段 2 开放</p>}

        {tab === 'milestones' && (
          <div>
            {MILESTONES.map((m) => {
              const reached = hearts >= m.hearts;
              return (
                <div key={m.hearts} className={`${styles.milestone} ${reached ? '' : styles.locked}`}>
                  <div className={styles.milestoneHearts}>
                    {m.hearts}
                    <span style={{ fontSize: 'var(--fs-sm)' }}>心</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div>
                      {m.title} {reached ? '✓' : '🔒'}
                    </div>
                    <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)' }}>{m.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Button variant="danger" block iconName="trash" onClick={() => setConfirmDelete(true)}>
        让 TA 搬走（删除）
      </Button>

      <Modal open={confirmDelete} title="确定删除？" onClose={() => setConfirmDelete(false)}>
        <p>
          {person.name} 的资料、笔记和互动记录都会被删除，无法恢复。
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button block variant="ghost" onClick={() => setConfirmDelete(false)}>
            取消
          </Button>
          <Button block variant="danger" onClick={doDelete}>
            删除
          </Button>
        </div>
      </Modal>
    </Page>
  );
}
