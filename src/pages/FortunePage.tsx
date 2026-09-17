import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { Person } from '@/db/types';
import { updateSettings, useSettings } from '@/db/settings';
import { Page, PageHeader } from '@/app/Layout';
import { Panel, Inset } from '@/ui/Panel';
import { Button } from '@/ui/Button';
import { Avatar } from '@/pixel/avatar/Avatar';
import { Sprite } from '@/pixel/Sprite';
import { CANDLE, CAT, CRYSTAL_BALL } from '@/pixel/sprites/village';
import { icon } from '@/pixel/sprites/icons';
import { CHAPTERS } from '@/config/fortune-book';
import { FORTUNE_TELLER } from '@/config/fortune-prompt';
import { fortuneTellerAvatar } from '@/features/fortune/teller';
import { DialogueBox } from '@/features/fortune/DialogueBox';
import { useAi } from '@/features/ai/useAi';
import { buildChart } from '@/fortune/chart';
import { chapterAvailability } from '@/fortune/book';
import { bookOf, fortuneStats } from '@/db/fortune';
import styles from './FortunePage.module.css';

/** 已写好的章数（含相处指南） */
function writtenCount(p: Person): number {
  const book = bookOf(p);
  if (!book) return 0;
  let n = Object.values(book.chapters).filter((c) => c && c.rounds.length > 0).length;
  if (book.guide) n++;
  return n;
}

export function FortunePage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const settings = useSettings();
  const ai = useAi();
  const persons = useLiveQuery(() => db.persons.toArray(), []);
  const me = persons?.find((p) => p.isMe) ?? null;
  const others = useMemo(() => (persons ?? []).filter((p) => !p.isMe).sort((a, b) => b.affection - a.affection), [persons]);
  const [selectedId, setSelectedId] = useState<string | null>(params.get('person'));
  const [lines, setLines] = useState<string[] | null>(null);
  const [lineKey, setLineKey] = useState(0);
  const stats = fortuneStats(persons ?? []);

  const selected = (persons ?? []).find((p) => p.id === selectedId) ?? null;

  // 开场白：首次介绍；没有「我」的生辰先引导填
  useEffect(() => {
    if (!persons || lines) return;
    if (!settings.fortuneIntroSeen) {
      setLines(FORTUNE_TELLER.intro);
      updateSettings({ fortuneIntroSeen: true });
    } else if (!me?.birth) {
      setLines([FORTUNE_TELLER.greeting[0], FORTUNE_TELLER.synastryNeedMe.replace('想看你们俩合不合，', '')]);
    } else {
      setLines(FORTUNE_TELLER.greeting);
    }
  }, [persons, me, settings.fortuneIntroSeen, lines]);

  const say = (ls: string[]) => {
    setLines(ls);
    setLineKey((k) => k + 1);
  };

  const pick = (p: Person) => {
    setSelectedId(p.id);
    if (!p.birth) {
      say([FORTUNE_TELLER.noBirth]);
      return;
    }
    const n = writtenCount(p);
    const name = p.isMe ? '你' : p.nickname || p.name;
    if (n === 0) say([`${name}的命书还是空白的。翻开它，想看哪章我就给你写哪章。`]);
    else say([`${name}的命书我已经写了 ${n} 章。想接着翻，还是让我再讲讲？`]);
  };

  const level = selected ? buildChart(selected.birth).level : 0;
  const chart = selected ? buildChart(selected.birth) : null;
  const openable = selected && chart ? CHAPTERS.filter((c) => chapterAvailability(c.key, selected, chart, me, bookOf(selected)).ok).length : 0;
  const total = stats.hits + stats.misses;

  return (
    <Page>
      <PageHeader title="占卜屋" subtitle={`${FORTUNE_TELLER.name} · 看星星也种地`} left={<Button variant="ghost" iconName="back" aria-label="返回" onClick={() => nav('/')} />} />

      <div className={`${styles.room} px-corner`}>
        {[
          [30, 20],
          [90, 40],
          [160, 16],
          [250, 36],
          [320, 22],
        ].map(([x, y], i) => (
          <span key={i} className={styles.star} style={{ left: x, top: y, animationDelay: `${i * 300}ms` }}>
            <Sprite grid={icon('star', '#f5c542')} scale={1} />
          </span>
        ))}
        <div className={styles.rug} />
        <Sprite grid={CANDLE} scale={2} className={styles.candleL} />
        <Sprite grid={CANDLE} scale={2} className={styles.candleR} />
        <div className={styles.teller}>
          <Avatar config={fortuneTellerAvatar} scale={3} />
        </div>
        <div className={styles.tablecloth} />
        <div className={styles.table} />
        <Sprite grid={CRYSTAL_BALL} scale={2} className={styles.ball} />
        <Sprite grid={CAT} scale={2} className={styles.cat} />
      </div>

      {lines && <DialogueBox speaker={FORTUNE_TELLER.name} lines={lines} resetKey={lineKey} />}

      {!me?.birth && (
        <Button variant="primary" block onClick={() => nav(me ? `/person/${me.id}/edit` : '/person/new?me=1')}>
          {me ? '去填我的生辰' : '先建我的档案'}
        </Button>
      )}

      {!ai.available && (
        <Inset>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)' }}>我这儿的灯还没点上呢。去设置里打开 AI 助手、填上 Key，才能写新的章节。已经写好的命书随时能翻。</div>
        </Inset>
      )}

      <Panel title="翻谁的命书" tight>
        <div className={styles.picker}>
          {me && (
            <button type="button" className={`${styles.pick} px-corner-sm ${selectedId === me.id ? styles.pickActive : ''}`} onClick={() => pick(me)}>
              <Avatar config={me.avatar} scale={2} />
              <span className={styles.pickName}>我</span>
              <span className={styles.level}>
                L{buildChart(me.birth).level}
                {writtenCount(me) ? ` · ${writtenCount(me)} 章` : ''}
              </span>
            </button>
          )}
          {others.map((p) => (
            <button key={p.id} type="button" className={`${styles.pick} px-corner-sm ${selectedId === p.id ? styles.pickActive : ''}`} onClick={() => pick(p)}>
              <Avatar config={p.avatar} scale={2} />
              <span className={styles.pickName}>{p.nickname || p.name}</span>
              <span className={styles.level}>
                L{buildChart(p.birth).level}
                {writtenCount(p) ? ` · ${writtenCount(p)} 章` : ''}
              </span>
            </button>
          ))}
        </div>

        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            <Inset>
              <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)' }}>
                {level === 0 ? FORTUNE_TELLER.noBirth : `完整度 L${level} · ${chart?.levelLabel}`}
                {level > 0 && level < 3 && <div>补充{level === 1 ? '出生年份' : '时辰'}可以翻开更多章。</div>}
                {level > 0 && (
                  <div>
                    已写 {writtenCount(selected)} 章 · 现在能翻开 {openable} / {CHAPTERS.length} 章
                    {!selected.isMe && !chapterAvailability('synastry', selected, chart!, me, bookOf(selected)).ok && (Math.floor(selected.affection / 250) < 2 ? ' · 合盘两颗心解锁' : !me?.birth ? ' · 合盘要先填我的生辰' : '')}
                  </div>
                )}
              </div>
            </Inset>
            {level === 0 ? (
              <Button block variant="ghost" onClick={() => nav(`/person/${selected.id}/edit`)}>
                去填 {selected.isMe ? '我' : selected.nickname || selected.name} 的生辰
              </Button>
            ) : (
              <Button block variant="primary" onClick={() => nav(`/person/${selected.id}?tab=fortune`)}>
                翻开 {selected.isMe ? '我' : selected.nickname || selected.name} 的命书
              </Button>
            )}
          </div>
        )}
      </Panel>

      <Panel title="星婆婆的战绩" tight>
        <div className={styles.stats}>
          <span>准 {stats.hits}</span>
          <div className={styles.bar}>
            <div className={styles.barFill} style={{ width: total ? `${Math.round((stats.hits / total) * 100)}%` : '0%' }} />
          </div>
          <span>不准 {stats.misses}</span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--ink-soft)', marginTop: 4 }}>
          给 {stats.readings} 个人写过命书 · 合过 {stats.synastries} 次盘 · 纯属趣味，不影响任何计分
        </div>
      </Panel>
    </Page>
  );
}
