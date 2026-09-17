import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { Person } from '@/db/types';
import { buildChart } from '@/fortune/chart';
import { fortuneData, markTrait } from '@/db/fortune';
import { readingStaleReason, synastryStaleReason } from '@/fortune/api';
import { FORTUNE_TELLER } from '@/config/fortune-prompt';
import { fortuneTellerAvatar } from '@/features/fortune/teller';
import { Avatar } from '@/pixel/avatar/Avatar';
import { Button } from '@/ui/Button';
import { Inset } from '@/ui/Panel';
import { ChartCards, ChartSummaryRow } from './ChartCards';
import { formatDate } from '@/lib/date';
import { play } from '@/audio/sound';
import styles from './FortuneTab.module.css';

/** 人物详情「占卜」Tab：未算过 / 已算过（卷轴卡 + 排盘细节 + 合盘） */
export function FortuneTab({ person }: { person: Person }) {
  const nav = useNavigate();
  const me = useLiveQuery(() => db.persons.filter((p) => Boolean(p.isMe)).first(), []);
  const [details, setDetails] = useState(false);
  const chart = buildChart(person.birth);
  const data = fortuneData(person);
  const reading = data?.reading.dialogue.length ? data.reading : null;
  const staleReason = reading ? readingStaleReason(person) : null;
  const syn = data?.synastry;
  const synStaleReason = syn && me ? synastryStaleReason(me, person, syn.inputHash, syn.basis) : null;
  const verdicts = reading?.traitVerdicts ?? [];

  const header = (
    <div className={styles.head}>
      <Avatar config={fortuneTellerAvatar} scale={2} />
      <div style={{ flex: 1, fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)' }}>
        {chart.level === 0 ? FORTUNE_TELLER.noBirth : `完整度 L${chart.level} · ${chart.levelLabel}`}
        {chart.lunarInputNote && <div style={{ color: 'var(--danger)' }}>{chart.lunarInputNote}。如果 TA 过的是公历生日，去编辑里取消"农历"。</div>}
        {chart.level > 0 && chart.level < 3 && <div>补充{chart.level === 1 ? '出生年份' : '时辰'}可以看到更多。</div>}
      </div>
    </div>
  );

  if (!reading) {
    return (
      <div className={styles.wrap}>
        {header}
        {chart.level > 0 && (
          <>
            <ChartSummaryRow chart={chart} />
            <Button variant="primary" block onClick={() => nav(`/fortune?person=${person.id}`)}>
              去问问{FORTUNE_TELLER.name}
            </Button>
            <Button size="small" variant="ghost" onClick={() => setDetails((v) => !v)}>
              {details ? '收起排盘' : '先看排盘细节（本地算的，不用 AI）'}
            </Button>
            {details && <ChartCards chart={chart} />}
          </>
        )}
        {chart.level === 0 && (
          <Button variant="ghost" block onClick={() => nav(`/person/${person.id}/edit`)}>
            去填生日
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      {header}
      {staleReason && (
        <div className={`${styles.staleBanner} px-corner-sm`}>
          <span style={{ flex: 1 }}>⚠ {staleReason}</span>
          <Button size="small" variant="primary" onClick={() => nav(`/fortune?person=${person.id}`)}>
            重新问{FORTUNE_TELLER.name}
          </Button>
        </div>
      )}
      <div className={`${styles.scroll} px-corner`} style={staleReason ? { opacity: 0.75 } : undefined}>
        <div className={styles.scrollTop} />
        <ChartSummaryRow chart={chart} />
        <div className={styles.meta}>
          {FORTUNE_TELLER.name}说于 {formatDate(person.fortune!.createdAt)}
          {staleReason && ' · 已过期'}
        </div>
        <div className={styles.dialogue}>
          {reading.dialogue.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </div>
        <div className={styles.scrollBottom} />
      </div>

      <Inset>
        <div className={styles.sectionTitle}>可能的性格特点 · 标一下准不准</div>
        <div className={styles.list}>
          {reading.traits.map((t, i) => (
            <div key={i} className={styles.trait}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div>{t.text}</div>
                <div className={styles.basis}>{t.basis}</div>
              </div>
              <div className={styles.verdict}>
                <button type="button" className={`px-corner-sm ${styles.vbtn} ${verdicts[i] === 'hit' ? styles.vHit : ''}`} onClick={() => { play('done'); markTrait(person, i, 'hit'); }}>
                  准
                </button>
                <button type="button" className={`px-corner-sm ${styles.vbtn} ${verdicts[i] === 'miss' ? styles.vMiss : ''}`} onClick={() => { play('click'); markTrait(person, i, 'miss'); }}>
                  不准
                </button>
              </div>
            </div>
          ))}
        </div>
      </Inset>

      <Inset>
        <div className={styles.sectionTitle}>相处提示</div>
        <ol className={styles.ol}>
          {reading.tips.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ol>
      </Inset>

      <Inset>
        <div className={styles.sectionTitle}>开场话题</div>
        <ul className={styles.ol}>
          {reading.topics.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </Inset>

      <Button size="small" variant="ghost" block onClick={() => setDetails((v) => !v)}>
        {details ? '收起排盘细节' : '看排盘细节'}
      </Button>
      {details && <ChartCards chart={chart} systems={reading.systems} />}

      {syn && (
        <div className={`${styles.scroll} px-corner`} style={{ borderColor: '#d95d78' }}>
          {synStaleReason && (
            <div className={`${styles.staleBanner} px-corner-sm`}>
              <span style={{ flex: 1 }}>⚠ {synStaleReason}</span>
              <Button size="small" variant="primary" onClick={() => nav(`/fortune?person=${person.id}&mode=pair`)}>
                重新合盘
              </Button>
            </div>
          )}
          <div className={styles.sectionTitle} style={{ color: '#d95d78' }}>
            你们俩 · {FORTUNE_TELLER.name}说于 {formatDate(syn.createdAt)}
            {synStaleReason && ' · 已过期'}
          </div>
          <p className={styles.summary}>{syn.data.summary}</p>
          <div className={styles.dialogue}>
            {syn.data.dialogue.map((l, i) => (
              <p key={i}>{l}</p>
            ))}
          </div>
          <div className={styles.sectionTitle}>合得来的地方</div>
          <ul className={styles.ol}>{syn.data.harmony.map((x, i) => <li key={i}>{x}</li>)}</ul>
          <div className={styles.sectionTitle}>可能的摩擦点</div>
          <ul className={styles.ol}>{syn.data.friction.map((x, i) => <li key={i}>{x}</li>)}</ul>
          <div className={styles.sectionTitle}>相处建议</div>
          <ol className={styles.ol}>{syn.data.advice.map((x, i) => <li key={i}>{x}</li>)}</ol>
        </div>
      )}

      <Button variant="ghost" block onClick={() => nav(`/fortune?person=${person.id}`)}>
        去占卜屋{!person.isMe && !syn ? '（看你们俩要 2 心解锁）' : ''}
      </Button>
      <p className={styles.disclaimerFree}>推测不参与计分、不影响解锁度和任务；只有你确认的才会变成正式资料。</p>
    </div>
  );
}
