import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { adjustAffection, setAffection } from '@/db/interactions';
import type { Note, Person } from '@/db/types';
import { updatePerson } from '@/db/persons';
import { RELATIONS } from '@/config/relations';
import { MILESTONES } from '@/config/milestones';
import { SCORING } from '@/config/scoring';
import { Page, PageHeader } from '@/app/Layout';
import { Panel } from '@/ui/Panel';
import { Button } from '@/ui/Button';
import { HeartBar, heartsOf } from '@/ui/HeartBar';
import { Tabs } from '@/ui/Tabs';
import { Modal } from '@/ui/Modal';
import { Chip, Chips, Input, Textarea } from '@/ui/Field';
import { useToast } from '@/ui/Toast';
import { Avatar } from '@/pixel/avatar/Avatar';
import { isStale } from '@/features/scoring/decay';
import { PreferencesTab } from '@/features/preferences/PreferencesTab';
import { TimelineTab } from '@/features/interactions/TimelineTab';
import { ReminderSection } from '@/features/quests/ReminderSection';
import { MilestoneCard } from '@/features/milestones/MilestoneCard';
import { useNotesAi } from '@/features/ai/NotesAi';
import { SummaryPanel } from '@/features/ai/SummaryPanel';
import { FortuneTab } from '@/features/fortune/FortuneTab';
import type { MilestoneConfig } from '@/config/milestones';
import { uid } from '@/lib/id';
import { formatDateTime, formatRelative } from '@/lib/date';
import { daysUntilBirthday, formatBirth } from '@/lib/birthday';
import { useSettings } from '@/db/settings';
import styles from './PersonDetailPage.module.css';

type Tab = 'prefs' | 'notes' | 'timeline' | 'milestones' | 'fortune';

const TABS: { key: Tab; label: string }[] = [
  { key: 'prefs', label: '喜好' },
  { key: 'notes', label: '笔记' },
  { key: 'timeline', label: '互动' },
  { key: 'milestones', label: '里程碑' },
  { key: 'fortune', label: '占卜' },
];
const ME_TABS = TABS.filter((t) => t.key === 'prefs' || t.key === 'notes' || t.key === 'fortune');

export function PersonDetailPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const toast = useToast();
  const person = useLiveQuery(() => db.persons.get(id), [id]);
  const settings = useSettings();
  const [tab, setTab] = useState<Tab>(() => (params.get('tab') as Tab) || 'prefs');
  // 同一个路由组件在不同人物之间切换时不会重建，这里按 URL 重置 Tab
  useEffect(() => {
    setTab((params.get('tab') as Tab) || 'prefs');
  }, [id, params]);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [pointsDraft, setPointsDraft] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [innerDraft, setInnerDraft] = useState<string | null>(null);
  const [replay, setReplay] = useState<MilestoneConfig | null>(null);

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
  const ghost = !person.isMe && isStale(person, settings);
  const birthdayDays = person.birth ? daysUntilBirthday(person.birth) : null;
  const birthdayHint = birthdayDays === null ? '' : birthdayDays === 0 ? ' · 就是今天！' : ` · 还有 ${birthdayDays} 天`;
  const toNextHeart = person.affection >= SCORING.maxPoints ? null : SCORING.pointsPerHeart - (person.affection % SCORING.pointsPerHeart);

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

  const applyPoints = async () => {
    const n = Number(pointsDraft);
    if (!Number.isFinite(n)) return;
    await setAffection(person.id, n);
    setAdjustOpen(false);
  };

  return (
    <Page>
      <PageHeader
        title={person.isMe ? '我的档案' : person.name}
        subtitle={person.isMe ? '村里唯一一份关于你自己的档案' : `${RELATIONS[person.relation].label} · ${person.lastInteractionAt ? `上次互动 ${formatRelative(person.lastInteractionAt)}` : '还没有互动记录'}`}
        left={<Button variant="ghost" iconName="back" aria-label="返回" onClick={() => nav('/')} />}
        right={<Button variant="ghost" iconName="edit" aria-label="编辑" onClick={() => nav(`/person/${person.id}/edit`)} />}
      />

      <Panel golden={golden} title={golden ? '挚友殿堂' : undefined}>
        <div className={styles.hero}>
          <div className={`${styles.avatarBox} px-corner`}>
            <Avatar config={person.avatar} scale={4} ghost={ghost} />
          </div>
          <div className={styles.info}>
            <div className={styles.nameRow}>
              <h2>{person.name}</h2>
              {person.nickname && <span className={styles.nickname}>「{person.nickname}」</span>}
              <span className={`${styles.relation} px-corner-sm`}>{person.isMe ? '我' : RELATIONS[person.relation].label}</span>
            </div>
            <div className={styles.meta}>
              <span>
                生日：{person.birth ? formatBirth(person.birth) : '未知'}
                {birthdayHint}
              </span>
              {person.metOn && <span>认识于 {person.metOn}</span>}
              {!person.isMe && <span>{person.lastInteractionAt ? `上次互动 ${formatRelative(person.lastInteractionAt)}` : '还没有互动记录'}</span>}
            </div>
          </div>
        </div>
        {!person.isMe && (
          <>
            <div className={styles.heartsRow} onClick={() => { setPointsDraft(String(person.affection)); setAdjustOpen(true); }} role="button" aria-label="调整好感度">
              <HeartBar points={person.affection} scale={2} showText />
              <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)', marginTop: 4 }}>
                {toNextHeart === null ? '已满心，进入挚友殿堂' : `距下一颗心还差 ${toNextHeart} 点`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <Button size="small" variant="ghost" iconName="minus" aria-label="减一颗心" onClick={() => adjustAffection(person.id, -SCORING.manualHeartStep)} />
              <Button size="small" variant="ghost" iconName="plus" aria-label="加一颗心" onClick={() => adjustAffection(person.id, SCORING.manualHeartStep)} />
              <span style={{ flex: 1 }} />
              <Button size="small" variant="primary" iconName="edit" onClick={() => nav(`/record?person=${person.id}`)}>
                记一笔
              </Button>
            </div>
          </>
        )}
        {person.selfTags.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)' }}>
            TA 自己说：{person.selfTags.map((t) => `${t.key} ${t.value}`).join(' · ')}
          </div>
        )}
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

      {!person.isMe && <SummaryPanel person={person} />}

      <Panel tight>
        <Tabs tabs={person.isMe ? ME_TABS : TABS} value={tab} onChange={setTab} />

        {tab === 'prefs' && <PreferencesTab person={person} />}

        {tab === 'notes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(hearts >= 8 || person.milestonesUnlocked.includes(8)) && (
              <div className="px-corner-sm" style={{ background: '#efe3f7', border: '2px solid #7a4a8a', padding: '8px 12px' }}>
                <div style={{ fontSize: 'var(--fs-sm)', color: '#7a4a8a', marginBottom: 4 }}>心事 · TA 最近在烦什么 / 在期待什么</div>
                <Textarea
                  value={innerDraft ?? person.innerNote ?? ''}
                  onChange={(e) => setInnerDraft(e.target.value)}
                  onBlur={async () => {
                    if (innerDraft !== null && innerDraft !== (person.innerNote ?? '')) {
                      await updatePerson(person.id, { innerNote: innerDraft.trim() || undefined });
                      toast('心事记下了');
                    }
                    setInnerDraft(null);
                  }}
                  placeholder="8 心解锁：写下 TA 最近的烦恼或期待，下次见面前看一眼"
                  style={{ minHeight: 64 }}
                />
              </div>
            )}
            <Textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="随手记一段：今天她说最近迷上手冲咖啡……" />
            <Button variant="primary" onClick={addNote} disabled={!noteDraft.trim()}>
              记下来
            </Button>
            <NotesList person={person} onRemove={removeNote} />
          </div>
        )}

        {tab === 'timeline' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <ReminderSection person={person} />
            <TimelineTab person={person} onRecord={() => nav(`/record?person=${person.id}`)} />
          </div>
        )}

        {tab === 'fortune' && <FortuneTab person={person} />}

        {tab === 'milestones' && !person.isMe && (
          <div>
            {MILESTONES.map((m) => {
              const reached = hearts >= m.hearts;
              return (
                <div
                  key={m.hearts}
                  className={`${styles.milestone} ${reached ? '' : styles.locked}`}
                  onClick={() => reached && setReplay(m)}
                  style={{ cursor: reached ? 'pointer' : 'default' }}
                >
                  <div className={styles.milestoneHearts}>
                    {m.hearts}
                    <span style={{ fontSize: 'var(--fs-sm)' }}>心</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div>
                      {m.title} {reached ? '✓' : '🔒'}
                      {reached && <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)' }}> · 点击回看事件卡</span>}
                    </div>
                    <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)' }}>{m.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <MilestoneCard person={person} milestone={replay} onClose={() => setReplay(null)} replay />

      <Modal open={adjustOpen} title="调整好感度" onClose={() => setAdjustOpen(false)}>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)' }}>每颗心 250 点，满 {SCORING.maxPoints} 点。直接填点数：</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input type="number" inputMode="numeric" value={pointsDraft} onChange={(e) => setPointsDraft(e.target.value)} />
          <Button variant="primary" onClick={applyPoints}>
            设定
          </Button>
        </div>
      </Modal>

    </Page>
  );
}

function NotesList({ person, onRemove }: { person: Person; onRemove: (id: string) => void }) {
  const ai = useNotesAi(person);
  return (
    <>
      <ai.BatchButton />
      {person.notes.length === 0 && <p className={styles.empty}>还没有笔记</p>}
      {person.notes.map((n) => (
        <div key={n.id} className={`${styles.note} px-corner-sm`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span className={styles.noteTime}>{formatDateTime(n.createdAt)}</span>
            <span style={{ flex: 1 }} />
            <ai.NoteButton note={n} />
            <Button size="small" variant="ghost" iconName="trash" aria-label="删除笔记" onClick={() => onRemove(n.id)} />
          </div>
          <div className={styles.noteText}>{n.text}</div>
        </div>
      ))}
      <ai.ReviewModal />
    </>
  );
}
