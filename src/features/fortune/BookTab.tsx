import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '@/db/db';
import type { Person } from '@/db/types';
import { CHAPTERS, type ChapterKey } from '@/config/fortune-book';
import { FORTUNE_TELLER } from '@/config/fortune-prompt';
import { buildChart } from '@/fortune/chart';
import { bookStaleReason, chapterAvailability, chapterHash, guideSourceStamp, isInflight, requestChapter, requestGuide, type BookChapter, type FortuneBook } from '@/fortune/book';
import { appendChapterRound, bookOf, markChapterTrait, saveChapter, saveGuide } from '@/db/fortune';
import { useAi } from '@/features/ai/useAi';
import { friendlyError } from '@/ai/client';
import { Avatar } from '@/pixel/avatar/Avatar';
import { Button } from '@/ui/Button';
import { useToast } from '@/ui/Toast';
import { play } from '@/audio/sound';
import { formatDate } from '@/lib/date';
import { fortuneTellerAvatar } from './teller';
import styles from './BookTab.module.css';

type View = { kind: 'toc' } | { kind: 'chapter'; key: ChapterKey };

/** 星婆婆命书：封面 + 目录 → 翻页进各章 */
export function BookTab({ person }: { person: Person }) {
  const nav = useNavigate();
  const toast = useToast();
  const ai = useAi();
  const me = useLiveQuery(() => db.persons.filter((p) => Boolean(p.isMe)).first(), []) ?? null;
  const [view, setView] = useState<View>({ kind: 'toc' });
  const [flipping, setFlipping] = useState(false);
  const [busy, setBusy] = useState<{ key: ChapterKey; chars: number; since: number } | null>(null);
  const [, tick] = useState(0);
  const pageRef = useRef<HTMLDivElement>(null);

  const chart = buildChart(person.birth);
  const book = bookOf(person);

  // 生成中每秒刷新一次秒数
  useEffect(() => {
    if (!busy) return;
    const t = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [busy]);

  const flipTo = (next: View) => {
    play('pop');
    setFlipping(true);
    window.setTimeout(() => setView(next), 180);
    window.setTimeout(() => {
      setFlipping(false);
      pageRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, 380);
  };

  const staleOf = (key: ChapterKey): boolean => {
    if (key === 'guide') return false;
    const ch = book?.chapters[key];
    return Boolean(ch && ch.inputHash !== chapterHash(key, person, me));
  };
  const anyStale = CHAPTERS.some((c) => staleOf(c.key));
  const guideOutdated = Boolean(book?.guide && book.guide.sourceStamp !== guideSourceStamp(book));

  const generate = async (key: ChapterKey, continueRound = false) => {
    if (!ai.available) {
      toast('先去设置里打开 AI 助手、填上 Key', 'error');
      return;
    }
    if (busy || isInflight(person.id, key)) return;
    setBusy({ key, chars: 0, since: Date.now() });
    try {
      if (key === 'guide') {
        if (!book) return;
        const out = await requestGuide(person, book, ai.fortuneModel, (chars) => setBusy((b) => (b ? { ...b, chars } : b)));
        await saveGuide(person, out, chapterHash('overview', person, me), ai.fortuneModel);
      } else {
        const out = await requestChapter({ key, person, me, book, continueRound, model: ai.fortuneModel, onProgress: (chars) => setBusy((b) => (b ? { ...b, chars } : b)) });
        if (continueRound) await appendChapterRound(person, key, out, ai.fortuneModel);
        else await saveChapter(person, key, out, chapterHash(key, person, me), ai.fortuneModel);
      }
      play('milestone');
      toast(continueRound ? '星婆婆又讲了一段' : '这一章写好了');
    } catch (e) {
      toast(friendlyError(e), 'error');
    } finally {
      setBusy(null);
    }
  };

  const statusOf = (key: ChapterKey): { text: string; cls: string } => {
    if (busy?.key === key) return { text: '在写…', cls: styles.st_busy };
    if (key === 'guide') {
      if (!book?.guide) return { text: '未生成', cls: '' };
      if (guideOutdated) return { text: '有新内容，更新', cls: styles.st_new };
      return { text: '已生成', cls: styles.st_done };
    }
    const ch = book?.chapters[key];
    if (!ch || ch.rounds.length === 0) return { text: '未生成', cls: '' };
    if (staleOf(key)) return { text: '已过期', cls: styles.st_stale };
    return ch.rounds.length > 1 ? { text: `已讲 ${ch.rounds.length} 次`, cls: styles.st_done } : { text: '已生成', cls: styles.st_done };
  };

  const stale = bookStaleReason(person, me, book);

  return (
    <div className={styles.book}>
      <div ref={pageRef} className={`${styles.page} px-corner ${flipping ? styles.flipping : ''}`}>
        {view.kind === 'toc' ? (
          <>
            <div className={styles.cover}>
              <Avatar config={person.avatar} scale={3} />
              <div className={styles.coverTitle}>{person.isMe ? '我' : person.nickname || person.name}的命书</div>
              <div className={styles.coverSub}>
                {FORTUNE_TELLER.name}执笔 · 完整度 L{chart.level}
                {chart.lunarInputNote && <div style={{ color: 'var(--danger)' }}>{chart.lunarInputNote}</div>}
              </div>
            </div>
            {anyStale && (
              <div className={`${styles.staleBanner} px-corner-sm`}>
                <span style={{ flex: 1 }}>⚠ {stale ?? '生辰或关系有变，各章要重新写'}。</span>
              </div>
            )}
            <div className={styles.toc}>
              {CHAPTERS.map((c, i) => {
                const av = chapterAvailability(c.key, person, chart, me, book);
                const st = statusOf(c.key);
                return (
                  <button key={c.key} type="button" className={`${styles.tocItem} px-corner-sm`} disabled={!av.ok} onClick={() => flipTo({ kind: 'chapter', key: c.key })}>
                    <span className={styles.tocGlyph}>{c.glyph}</span>
                    <span className={styles.tocBody}>
                      <span className={styles.tocTitle}>
                        <span className={styles.tocNo}>第{['一', '二', '三', '四', '五', '六', '七'][i]}章</span>
                        <span>{c.title}</span>
                      </span>
                      <div className={styles.tocSub}>{av.ok ? c.subtitle : av.missing}</div>
                    </span>
                    {av.ok && <span className={`${styles.tocStatus} px-corner-sm ${st.cls}`}>{st.text}</span>}
                  </button>
                );
              })}
            </div>
            <div className={styles.actions}>
              <Button size="small" variant="ghost" onClick={() => nav(`/fortune?person=${person.id}`)}>
                去占卜屋找{FORTUNE_TELLER.name}
              </Button>
            </div>
          </>
        ) : view.kind === 'chapter' && view.key === 'guide' ? (
          <GuideView person={person} book={book} busy={busy?.key === 'guide' ? busy : null} outdated={guideOutdated} onBack={() => flipTo({ kind: 'toc' })} onGenerate={() => generate('guide')} />
        ) : (
          <ChapterView
            person={person}
            keyName={view.key as Exclude<ChapterKey, 'guide'>}
            chapter={book?.chapters[view.key as Exclude<ChapterKey, 'guide'>] ?? null}
            stale={staleOf(view.key)}
            busy={busy?.key === view.key ? busy : null}
            onBack={() => flipTo({ kind: 'toc' })}
            onGenerate={() => generate(view.key)}
            onContinue={() => generate(view.key, true)}
            onMark={(i, v) => {
              play(v === 'hit' ? 'done' : 'click');
              markChapterTrait(person, view.key as Exclude<ChapterKey, 'guide'>, i, v);
            }}
          />
        )}
      </div>
      <p style={{ fontSize: 10, color: 'var(--ink-soft)', textAlign: 'center', marginTop: 8 }}>命书里的话都是推测，不参与计分和解锁度；只有你确认的才会变成正式资料。</p>
    </div>
  );
}

function Busy({ busy, label }: { busy: { chars: number; since: number }; label: string }) {
  const secs = Math.floor((Date.now() - busy.since) / 1000);
  return (
    <div className={styles.busy}>
      <Avatar config={fortuneTellerAvatar} scale={3} />
      <div>{label}</div>
      <div className={styles.dots}>
        <span style={{ animationDelay: '0ms' }} />
        <span style={{ animationDelay: '150ms' }} />
        <span style={{ animationDelay: '300ms' }} />
      </div>
      <div style={{ color: 'var(--ink-soft)' }}>
        已写 {Math.round(busy.chars / 1.3)} 字 · {secs} 秒
      </div>
    </div>
  );
}

interface ChapterViewProps {
  person: Person;
  keyName: Exclude<ChapterKey, 'guide'>;
  chapter: BookChapter | null;
  stale: boolean;
  busy: { chars: number; since: number } | null;
  onBack: () => void;
  onGenerate: () => void;
  onContinue: () => void;
  onMark: (i: number, v: 'hit' | 'miss') => void;
}

function ChapterView({ keyName, chapter, stale, busy, onBack, onGenerate, onContinue, onMark }: ChapterViewProps) {
  const def = CHAPTERS.find((c) => c.key === keyName)!;
  const idx = CHAPTERS.findIndex((c) => c.key === keyName);
  return (
    <>
      <div className={styles.chapterHead}>
        <Button size="small" variant="ghost" iconName="back" aria-label="回目录" onClick={onBack} />
        <span className={styles.chapterTitle}>
          第{['一', '二', '三', '四', '五', '六', '七'][idx]}章 · {def.title}
        </span>
        {chapter && <span className={styles.chapterDate}>{FORTUNE_TELLER.name}写于 {formatDate(chapter.rounds[0].createdAt)}{chapter.rounds.length > 1 ? ` · 讲过 ${chapter.rounds.length} 次` : ''}</span>}
      </div>
      {stale && chapter && (
        <div className={`${styles.staleBanner} px-corner-sm`}>
          <span style={{ flex: 1 }}>⚠ 这一章是按旧的生辰或关系写的，可能不准了</span>
          <Button size="small" variant="primary" disabled={Boolean(busy)} onClick={onGenerate}>
            重新写
          </Button>
        </div>
      )}
      {busy ? (
        <Busy busy={busy} label={`${FORTUNE_TELLER.name}在写「${def.title}」这一章`} />
      ) : !chapter ? (
        <div className={styles.busy}>
          <Avatar config={fortuneTellerAvatar} scale={3} />
          <div>这一章还是空白页。{def.subtitle}。</div>
          <Button variant="primary" onClick={onGenerate}>
            请{FORTUNE_TELLER.name}写这一章
          </Button>
        </div>
      ) : (
        <>
          {chapter.rounds.map((r, ri) => (
            <div key={ri}>
              {ri > 0 && <div className={styles.roundDivider}>第 {ri + 1} 次讲 · {formatDate(r.createdAt)}</div>}
              {r.sections.map((s, si) => (
                <div key={si} className={styles.section}>
                  <div className={styles.sectionTitle}>{s.title}</div>
                  <div className={styles.sectionBody}>{s.body}</div>
                </div>
              ))}
            </div>
          ))}
          {chapter.traits.length > 0 && (
            <div className={styles.traits}>
              <div className={styles.sectionTitle}>这章的性格特点 · 标一下准不准</div>
              {chapter.traits.map((t, i) => (
                <div key={i} className={`${styles.trait} px-corner-sm`}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div>{t.text}</div>
                    <div className={styles.basis}>{t.basis}</div>
                  </div>
                  <button type="button" className={`px-corner-sm ${styles.vbtn} ${t.verdict === 'hit' ? styles.vHit : ''}`} onClick={() => onMark(i, 'hit')}>
                    准
                  </button>
                  <button type="button" className={`px-corner-sm ${styles.vbtn} ${t.verdict === 'miss' ? styles.vMiss : ''}`} onClick={() => onMark(i, 'miss')}>
                    不准
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className={styles.actions}>
            <Button block variant="primary" onClick={onContinue}>
              再讲讲
            </Button>
            <Button block variant="ghost" onClick={onBack}>
              回目录
            </Button>
          </div>
        </>
      )}
    </>
  );
}

interface GuideViewProps {
  person: Person;
  book: FortuneBook | null;
  busy: { chars: number; since: number } | null;
  outdated: boolean;
  onBack: () => void;
  onGenerate: () => void;
}

function GuideView({ book, busy, outdated, onBack, onGenerate }: GuideViewProps) {
  const g = book?.guide;
  const groups: { title: string; items: { text: string; source: string }[] }[] = g
    ? [
        { title: '性格', items: g.character },
        { title: '相处', items: g.getAlong },
        { title: '话题', items: g.topics },
        { title: '送礼方向', items: g.gifts.map((x) => ({ text: `${x.name}（${x.tier === 'love' ? '可能最爱' : '可能喜欢'}）`, source: x.source })) },
      ]
    : [];
  return (
    <>
      <div className={styles.chapterHead}>
        <Button size="small" variant="ghost" iconName="back" aria-label="回目录" onClick={onBack} />
        <span className={styles.chapterTitle}>第七章 · 相处指南</span>
        {g && <span className={styles.chapterDate}>整理于 {formatDate(g.updatedAt)}</span>}
      </div>
      {busy ? (
        <Busy busy={busy} label={`${FORTUNE_TELLER.name}在把各章翻一遍，提炼相处指南`} />
      ) : !g ? (
        <div className={styles.busy}>
          <Avatar config={fortuneTellerAvatar} scale={3} />
          <div>把已经写好的章节提炼成「怎么跟 TA 相处」。只提炼，不新增判断。</div>
          <Button variant="primary" onClick={onGenerate}>
            请{FORTUNE_TELLER.name}整理
          </Button>
        </div>
      ) : (
        <>
          {outdated && (
            <div className={`${styles.staleBanner} px-corner-sm`} style={{ background: '#fff1c2', borderColor: 'var(--gold-dark)', color: 'var(--gold-dark)' }}>
              <span style={{ flex: 1 }}>其他章有新内容了</span>
              <Button size="small" variant="primary" onClick={onGenerate}>
                更新
              </Button>
            </div>
          )}
          {groups.map((grp) => (
            <div key={grp.title} className={styles.guideGroup}>
              <div className={styles.guideTitle}>{grp.title}</div>
              {grp.items.map((it, i) => (
                <div key={i} className={styles.guideItem}>
                  {it.text} <span className={styles.guideSource}>（{it.source}）</span>
                </div>
              ))}
            </div>
          ))}
          <p style={{ fontSize: 10, color: 'var(--ink-soft)' }}>送礼方向已放进喜好 Tab 的「星婆婆的猜测」，确认后才变成正式喜好。</p>
          <div className={styles.actions}>
            <Button block variant="ghost" onClick={onBack}>
              回目录
            </Button>
          </div>
        </>
      )}
    </>
  );
}
