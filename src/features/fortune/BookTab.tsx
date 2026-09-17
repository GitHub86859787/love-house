import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '@/db/db';
import type { Person } from '@/db/types';
import { CHAPTERS, type ChapterKey } from '@/config/fortune-book';
import { FORTUNE_TELLER } from '@/config/fortune-prompt';
import { buildChart } from '@/fortune/chart';
import {
  bookStaleReason,
  chapterAvailability,
  chapterCharCount,
  chapterHash,
  guideCharCount,
  guideSourceStamp,
  partialChapter,
  partialGuide,
  textCharCount,
  type BookChapter,
  type FortuneBook,
  type GenerateMode,
  type GuideItem,
  type Section,
} from '@/fortune/book';
import { startBookJob, useBookJobs, type BookJob } from '@/fortune/bookRuntime';
import { bookOf, markChapterTrait } from '@/db/fortune';
import { useAi } from '@/features/ai/useAi';
import { Avatar } from '@/pixel/avatar/Avatar';
import { Button } from '@/ui/Button';
import { useToast } from '@/ui/Toast';
import { play } from '@/audio/sound';
import { formatDate } from '@/lib/date';
import { fortuneTellerAvatar } from './teller';
import styles from './BookTab.module.css';

type View = { kind: 'toc' } | { kind: 'chapter'; key: ChapterKey };
const NUMERALS = ['一', '二', '三', '四', '五', '六', '七'];

function fmtCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')} 千` : String(n);
}

/** 星婆婆命书：封面 + 目录 → 翻页进各章 */
export function BookTab({ person }: { person: Person }) {
  const nav = useNavigate();
  const toast = useToast();
  const ai = useAi();
  const me = useLiveQuery(() => db.persons.filter((p) => Boolean(p.isMe)).first(), []) ?? null;
  const [view, setView] = useState<View>({ kind: 'toc' });
  const [flipping, setFlipping] = useState(false);
  const jobs = useBookJobs();
  const [, tick] = useState(0);
  const pageRef = useRef<HTMLDivElement>(null);

  const chart = buildChart(person.birth);
  const book = bookOf(person);
  const jobOf = (key: ChapterKey): BookJob | null => jobs[`${person.id}:${key}`] ?? null;
  const anyJob = Object.values(jobs).some((j) => j.personId === person.id);

  // 生成中每秒刷新一次秒数
  useEffect(() => {
    if (!anyJob) return;
    const t = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [anyJob]);

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
  const isWritten = (key: ChapterKey): boolean => (key === 'guide' ? Boolean(book?.guide) : Boolean(book?.chapters[key]?.rounds.length));

  const generate = (key: ChapterKey, mode: GenerateMode = 'new') => {
    if (!ai.available) {
      toast('先去设置里打开 AI 助手、填上 Key', 'error');
      return;
    }
    if (jobOf(key)) return;
    const started = startBookJob({ person, me, key, mode, model: ai.fortuneModel });
    if (started) play('pop');
  };

  const statusOf = (key: ChapterKey): { text: string; cls: string } => {
    if (jobOf(key)) return { text: '正在写…', cls: styles.st_busy };
    if (key === 'guide') {
      if (!book?.guide) return { text: '未生成', cls: '' };
      if (guideOutdated) return { text: '有新内容，更新', cls: styles.st_new };
      return { text: '已生成', cls: styles.st_done };
    }
    const ch = book?.chapters[key];
    if (!ch || ch.rounds.length === 0) return { text: '未生成', cls: '' };
    if (staleOf(key)) return { text: '已过期', cls: styles.st_stale };
    if (ch.rounds[ch.rounds.length - 1].incomplete) return { text: '没写完', cls: styles.st_new };
    return ch.rounds.length > 1 ? { text: `已讲 ${ch.rounds.length} 次`, cls: styles.st_done } : { text: '已生成', cls: styles.st_done };
  };

  const countOf = (key: ChapterKey): number => {
    const job = jobOf(key);
    if (job && key !== 'guide') {
      const base = book?.chapters[key] ? chapterCharCount(book.chapters[key]!) : 0;
      return (job.mode === 'new' ? 0 : base) + textCharCount(job.text);
    }
    if (key === 'guide') return book?.guide ? guideCharCount(book.guide) : 0;
    const ch = book?.chapters[key];
    return ch ? chapterCharCount(ch) : 0;
  };

  // 上一章 / 下一章：只在能翻开的章之间走
  const openable = CHAPTERS.filter((c) => chapterAvailability(c.key, person, chart, me, book).ok).map((c) => c.key);
  const neighbor = (key: ChapterKey, dir: -1 | 1): ChapterKey | null => {
    const i = openable.indexOf(key);
    if (i < 0) return null;
    return openable[i + dir] ?? null;
  };
  const goNeighbor = (key: ChapterKey) => {
    flipTo({ kind: 'chapter', key });
    if (!isWritten(key) && !jobOf(key)) window.setTimeout(() => generate(key), 400);
  };
  const NavRow = ({ current }: { current: ChapterKey }) => {
    const prev = neighbor(current, -1);
    const next = neighbor(current, 1);
    const label = (k: ChapterKey, dir: -1 | 1) => {
      const t = CHAPTERS.find((c) => c.key === k)!.title;
      const written = isWritten(k) || jobOf(k);
      if (dir < 0) return written ? `← 上一章 · ${t}` : `← 翻开上一章 · ${t}`;
      return written ? `下一章 · ${t} →` : `翻开下一章 · ${t} →`;
    };
    return (
      <div className={styles.navRow}>
        {prev ? (
          <Button block size="small" variant="ghost" onClick={() => goNeighbor(prev)}>
            {label(prev, -1)}
          </Button>
        ) : (
          <span />
        )}
        {next ? (
          <Button block size="small" variant="ghost" onClick={() => goNeighbor(next)}>
            {label(next, 1)}
          </Button>
        ) : (
          <span />
        )}
      </div>
    );
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
                const n = av.ok ? countOf(c.key) : 0;
                return (
                  <button key={c.key} type="button" className={`${styles.tocItem} px-corner-sm`} disabled={!av.ok} onClick={() => flipTo({ kind: 'chapter', key: c.key })}>
                    <span className={styles.tocGlyph}>{c.glyph}</span>
                    <span className={styles.tocBody}>
                      <span className={styles.tocTitle}>
                        <span className={styles.tocNo}>第{NUMERALS[i]}章</span>
                        <span>{c.title}</span>
                      </span>
                      <div className={styles.tocSub}>
                        {av.ok ? c.subtitle : av.missing}
                        {n > 0 && <span className={styles.tocCount}> · 约 {fmtCount(n)} 字</span>}
                      </div>
                    </span>
                    {av.ok && <span className={`${styles.tocStatus} px-corner-sm ${st.cls}`}>{st.text}</span>}
                  </button>
                );
              })}
            </div>
            {anyJob && <p className={styles.hint}>{FORTUNE_TELLER.name}正在写，你可以先去别处，写完回来就有。</p>}
            <div className={styles.actions}>
              <Button size="small" variant="ghost" onClick={() => nav(`/fortune?person=${person.id}`)}>
                去占卜屋找{FORTUNE_TELLER.name}
              </Button>
            </div>
          </>
        ) : view.kind === 'chapter' && view.key === 'guide' ? (
          <GuideView book={book} job={jobOf('guide')} outdated={guideOutdated} onBack={() => flipTo({ kind: 'toc' })} onGenerate={() => generate('guide')} nav={<NavRow current="guide" />} />
        ) : (
          <ChapterView
            keyName={view.key as Exclude<ChapterKey, 'guide'>}
            chapter={book?.chapters[view.key as Exclude<ChapterKey, 'guide'>] ?? null}
            stale={staleOf(view.key)}
            job={jobOf(view.key)}
            onBack={() => flipTo({ kind: 'toc' })}
            onGenerate={(mode) => generate(view.key, mode)}
            onMark={(i, v) => {
              play(v === 'hit' ? 'done' : 'click');
              markChapterTrait(person, view.key as Exclude<ChapterKey, 'guide'>, i, v);
            }}
            nav={<NavRow current={view.key} />}
          />
        )}
      </div>
      <p className={styles.hint}>命书里的话都是推测，不参与计分和解锁度；只有你确认的才会变成正式资料。</p>
    </div>
  );
}

function Writing({ job, label }: { job: BookJob; label: string }) {
  const secs = Math.floor((Date.now() - job.since) / 1000);
  return (
    <div className={styles.writing}>
      <Avatar config={fortuneTellerAvatar} scale={2} />
      <div style={{ flex: 1 }}>
        <div>{label}</div>
        <div style={{ color: 'var(--ink-soft)', fontSize: 10 }}>
          已写 {textCharCount(job.text)} 字 · {secs} 秒 · 可以先去别处
        </div>
      </div>
      <div className={styles.dots}>
        <span style={{ animationDelay: '0ms' }} />
        <span style={{ animationDelay: '150ms' }} />
        <span style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

function Sections({ sections, live }: { sections: Section[]; live?: boolean }) {
  return (
    <>
      {sections.map((s, si) => (
        <div key={si} className={styles.section}>
          {s.title && <div className={styles.sectionTitle}>{s.title}</div>}
          <div className={styles.sectionBody}>
            {s.body}
            {live && si === sections.length - 1 && <span className={styles.cursor} />}
          </div>
        </div>
      ))}
    </>
  );
}

function RoundDivider({ n, at }: { n: number; at: number }) {
  return (
    <div className={styles.roundDivider}>
      <div className={styles.roundTitle}>
        第 {n} 次讲 · {formatDate(at)}
      </div>
      <div className={styles.roundRule} />
    </div>
  );
}

interface ChapterViewProps {
  keyName: Exclude<ChapterKey, 'guide'>;
  chapter: BookChapter | null;
  stale: boolean;
  job: BookJob | null;
  onBack: () => void;
  onGenerate: (mode: GenerateMode) => void;
  onMark: (i: number, v: 'hit' | 'miss') => void;
  nav: React.ReactNode;
}

function ChapterView({ keyName, chapter, stale, job, onBack, onGenerate, onMark, nav }: ChapterViewProps) {
  const def = CHAPTERS.find((c) => c.key === keyName)!;
  const idx = CHAPTERS.findIndex((c) => c.key === keyName);
  const live = job ? partialChapter(job.text) : null;
  const lastRound = chapter?.rounds[chapter.rounds.length - 1];
  const broken = Boolean(lastRound?.incomplete) && !job;
  // 正在新写：不显示旧内容（旧的是过期 / 重写前的）
  const showRounds = job?.mode === 'new' ? [] : chapter?.rounds ?? [];

  return (
    <>
      <div className={styles.chapterHead}>
        <Button size="small" variant="ghost" iconName="back" aria-label="回目录" onClick={onBack} />
        <span className={styles.chapterTitle}>
          第{NUMERALS[idx]}章 · {def.title}
        </span>
        {chapter && !job && (
          <span className={styles.chapterDate}>
            {FORTUNE_TELLER.name}写于 {formatDate(chapter.rounds[0].createdAt)}
            {chapter.rounds.length > 1 ? ` · 讲过 ${chapter.rounds.length} 次` : ''} · 约 {fmtCount(chapterCharCount(chapter))} 字
          </span>
        )}
      </div>
      {stale && chapter && !job && (
        <div className={`${styles.staleBanner} px-corner-sm`}>
          <span style={{ flex: 1 }}>⚠ 这一章是按旧的生辰或关系写的，可能不准了</span>
          <Button size="small" variant="primary" onClick={() => onGenerate('new')}>
            重新写
          </Button>
        </div>
      )}
      {job && <Writing job={job} label={job.mode === 'new' ? `${FORTUNE_TELLER.name}在写「${def.title}」这一章` : job.mode === 'continue' ? `${FORTUNE_TELLER.name}在接着讲「${def.title}」` : `${FORTUNE_TELLER.name}在把「${def.title}」补完`} />}

      {!chapter && !job ? (
        <div className={styles.empty}>
          <Avatar config={fortuneTellerAvatar} scale={3} />
          <div>这一章还是空白页。{def.subtitle}。</div>
          <Button variant="primary" onClick={() => onGenerate('new')}>
            请{FORTUNE_TELLER.name}写这一章
          </Button>
        </div>
      ) : (
        <>
          {showRounds.map((r, ri) => (
            <div key={ri}>
              {ri > 0 && <RoundDivider n={ri + 1} at={r.createdAt} />}
              <Sections sections={r.sections} live={Boolean(job && job.mode === 'resume' && ri === showRounds.length - 1 && !live?.sections.length)} />
            </div>
          ))}
          {job && job.mode === 'continue' && <RoundDivider n={showRounds.length + 1} at={job.since} />}
          {job && (live?.sections.length ? <Sections sections={live.sections} live /> : !showRounds.length ? <div className={styles.sectionBody}>{FORTUNE_TELLER.name}翻着排盘，还没落笔……<span className={styles.cursor} /></div> : null)}

          {broken && lastRound && (
            <div className={`${styles.staleBanner} px-corner-sm`} style={{ background: '#fff1c2', borderColor: 'var(--gold-dark)', color: 'var(--gold-dark)', marginTop: 8 }}>
              <span style={{ flex: 1 }}>上次写到这儿断了{lastRound.error ? `（${lastRound.error}）` : ''}，已写的先留着。</span>
              <Button size="small" variant="primary" onClick={() => onGenerate('resume')}>
                接着讲
              </Button>
            </div>
          )}

          {chapter && chapter.traits.length > 0 && !(job?.mode === 'new') && (
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
          {!job && chapter && (
            <div className={styles.actions}>
              {!broken && (
                <Button block variant="primary" onClick={() => onGenerate('continue')}>
                  再讲讲
                </Button>
              )}
              <Button block variant="ghost" onClick={onBack}>
                回目录
              </Button>
            </div>
          )}
          {!job && nav}
        </>
      )}
    </>
  );
}

interface GuideViewProps {
  book: FortuneBook | null;
  job: BookJob | null;
  outdated: boolean;
  onBack: () => void;
  onGenerate: () => void;
  nav: React.ReactNode;
}

function GuideView({ book, job, outdated, onBack, onGenerate, nav }: GuideViewProps) {
  const g = book?.guide;
  const groups: { title: string; items: GuideItem[] }[] = job
    ? partialGuide(job.text) ?? []
    : g
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
        {g && !job && <span className={styles.chapterDate}>整理于 {formatDate(g.updatedAt)} · 约 {fmtCount(guideCharCount(g))} 字</span>}
      </div>
      {job && <Writing job={job} label={`${FORTUNE_TELLER.name}在把各章翻一遍，提炼相处指南`} />}
      {!g && !job ? (
        <div className={styles.empty}>
          <Avatar config={fortuneTellerAvatar} scale={3} />
          <div>把已经写好的章节提炼成「怎么跟 TA 相处」。只提炼，不新增判断。</div>
          <Button variant="primary" onClick={onGenerate}>
            请{FORTUNE_TELLER.name}整理
          </Button>
        </div>
      ) : (
        <>
          {outdated && !job && (
            <div className={`${styles.staleBanner} px-corner-sm`} style={{ background: '#fff1c2', borderColor: 'var(--gold-dark)', color: 'var(--gold-dark)' }}>
              <span style={{ flex: 1 }}>其他章有新内容了</span>
              <Button size="small" variant="primary" onClick={onGenerate}>
                更新
              </Button>
            </div>
          )}
          {groups.map((grp, gi) => (
            <div key={grp.title} className={styles.guideGroup}>
              <div className={styles.guideTitle}>{grp.title}</div>
              {grp.items.map((it, i) => (
                <div key={i} className={styles.guideItem}>
                  {it.text} {it.source && <span className={styles.guideSource}>（{it.source}）</span>}
                  {job && gi === groups.length - 1 && i === grp.items.length - 1 && <span className={styles.cursor} />}
                </div>
              ))}
            </div>
          ))}
          {!job && <p className={styles.hint}>送礼方向已放进喜好 Tab 的「星婆婆的猜测」，确认后才变成正式喜好。</p>}
          {!job && (
            <div className={styles.actions}>
              <Button block variant="ghost" onClick={onBack}>
                回目录
              </Button>
            </div>
          )}
          {!job && nav}
        </>
      )}
    </>
  );
}
