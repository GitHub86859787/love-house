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
import { FORTUNE_TELLER } from '@/config/fortune-prompt';
import { fortuneTellerAvatar } from '@/features/fortune/teller';
import { DialogueBox } from '@/features/fortune/DialogueBox';
import { useAi } from '@/features/ai/useAi';
import { friendlyError } from '@/ai/client';
import { buildChart } from '@/fortune/chart';
import { cooldownLeft, estimateReadingTokens, estimateSynastryTokens, readingHash, readingStaleReason, requestReading, requestSynastry, synastryHash } from '@/fortune/api';
import { fortuneData, fortuneStats, saveReading, saveSynastry } from '@/db/fortune';
import { play } from '@/audio/sound';
import styles from './FortunePage.module.css';

type Mode = 'self' | 'pair';

export function FortunePage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const settings = useSettings();
  const ai = useAi();
  const persons = useLiveQuery(() => db.persons.toArray(), []);
  const me = persons?.find((p) => p.isMe) ?? null;
  const others = useMemo(() => (persons ?? []).filter((p) => !p.isMe).sort((a, b) => b.affection - a.affection), [persons]);
  const [selectedId, setSelectedId] = useState<string | null>(params.get('person'));
  const [mode, setMode] = useState<Mode>((params.get('mode') as Mode) || 'self');
  const [lines, setLines] = useState<string[] | null>(null);
  const [lineKey, setLineKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [spoken, setSpoken] = useState(false);
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
    setSpoken(false);
  };

  const canPair = (p: Person) => Boolean(me?.birth) && Boolean(p.birth) && Math.floor(p.affection / 250) >= 2;

  const ask = async () => {
    if (!selected) return;
    if (!ai.available) {
      say(['我这儿的灯还没点上呢。去设置里打开 AI 助手、填上 Key，再来找我。']);
      return;
    }
    if (mode === 'self') {
      if (!selected.birth) return say([FORTUNE_TELLER.noBirth]);
      const cached = fortuneData(selected);
      const hash = readingHash(selected);
      if (cached?.reading.dialogue.length && selected.fortune?.inputHash === hash) {
        // 已有缓存：直接复述，不花钱
        say(cached.reading.dialogue);
        return;
      }
      if (cooldownLeft(selected) > 0 && cached?.reading.dialogue.length) return say([FORTUNE_TELLER.cooldown]);
      setBusy(true);
      say([`让我看看……${selected.nickname || selected.name}，${buildChart(selected.birth).level < 2 ? '只有月日，我就先看个大概。' : '嗯，生辰我记下了。'}`, '（星婆婆盯着水晶球，大约要等一会儿）']);
      try {
        const reading = await requestReading(selected, ai.model);
        await saveReading(selected, reading, hash);
        play('milestone');
        say(reading.dialogue);
      } catch (e) {
        say([`哎呀，星星今天不太配合。（${friendlyError(e)}）`]);
      } finally {
        setBusy(false);
      }
    } else {
      if (!me) return say([FORTUNE_TELLER.synastryNeedMe]);
      if (!me.birth) return say([FORTUNE_TELLER.synastryNeedMe]);
      if (!selected.birth) return say([FORTUNE_TELLER.synastryNeedBirth]);
      if (Math.floor(selected.affection / 250) < 2) return say([FORTUNE_TELLER.synastryLocked]);
      const cached = fortuneData(selected)?.synastry;
      const hash = synastryHash(me, selected);
      if (cached && cached.inputHash === hash) return say(cached.data.dialogue);
      setBusy(true);
      say([`把你和 ${selected.nickname || selected.name} 放在一起瞧瞧……`, '（星婆婆把两张纸并排摆在桌上）']);
      try {
        const syn = await requestSynastry(me, selected, ai.model);
        await saveSynastry(selected, syn, hash, me);
        play('milestone');
        say(syn.dialogue);
      } catch (e) {
        say([`哎呀，星星今天不太配合。（${friendlyError(e)}）`]);
      } finally {
        setBusy(false);
      }
    }
  };

  const level = selected ? buildChart(selected.birth).level : 0;
  const hasCache = selected && mode === 'self' ? Boolean(fortuneData(selected)?.reading.dialogue.length) && selected.fortune?.inputHash === readingHash(selected) : selected && me ? fortuneData(selected)?.synastry?.inputHash === synastryHash(me, selected) : false;
  const cd = selected ? cooldownLeft(selected) : 0;
  const tokens = selected ? (mode === 'self' ? estimateReadingTokens(selected) : me ? estimateSynastryTokens(me, selected) : 0) : 0;
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

      {lines && <DialogueBox speaker={FORTUNE_TELLER.name} lines={lines} resetKey={lineKey} onDone={() => setSpoken(true)} />}

      {!me?.birth && (
        <Button variant="primary" block onClick={() => nav(me ? `/person/${me.id}/edit` : '/person/new?me=1')}>
          {me ? '去填我的生辰' : '先建我的档案'}
        </Button>
      )}

      <Panel title="想让我瞧瞧谁" tight>
        <div className={styles.picker}>
          {me && (
            <button type="button" className={`${styles.pick} px-corner-sm ${selectedId === me.id ? styles.pickActive : ''}`} onClick={() => { setSelectedId(me.id); setMode('self'); }}>
              <Avatar config={me.avatar} scale={2} />
              <span className={styles.pickName}>我</span>
              <span className={styles.level}>L{buildChart(me.birth).level}</span>
            </button>
          )}
          {others.map((p) => (
            <button key={p.id} type="button" className={`${styles.pick} px-corner-sm ${selectedId === p.id ? styles.pickActive : ''}`} onClick={() => setSelectedId(p.id)}>
              <Avatar config={p.avatar} scale={2} />
              <span className={styles.pickName}>{p.nickname || p.name}</span>
              <span className={styles.level}>
                L{buildChart(p.birth).level}
                {fortuneData(p)?.reading.dialogue.length ? ' ✓' : ''}
              </span>
            </button>
          ))}
        </div>

        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {!selected.isMe && (
              <div style={{ display: 'flex', gap: 8 }}>
                <Button block size="small" variant={mode === 'self' ? 'primary' : 'ghost'} onClick={() => setMode('self')}>
                  看 TA
                </Button>
                <Button block size="small" variant={mode === 'pair' ? 'primary' : 'ghost'} onClick={() => setMode('pair')} disabled={!canPair(selected)}>
                  看你们俩{!canPair(selected) && (Math.floor(selected.affection / 250) < 2 ? '（2 心解锁）' : '')}
                </Button>
              </div>
            )}
            <Inset>
              <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)' }}>
                {level === 0 ? FORTUNE_TELLER.noBirth : `完整度 L${level} · ${buildChart(selected.birth).levelLabel}`}
                {level > 0 && level < 3 && <div>补充{level === 1 ? '出生年份' : '时辰'}可以看到更多。</div>}
                {!hasCache && level > 0 && ai.available && <div>这次大约会用掉 {tokens} 个 token。</div>}
                {hasCache && <div>已经看过，直接翻给你看，不花钱。</div>}
                {mode === 'self' && !hasCache && selected.fortune && readingStaleReason(selected) && <div style={{ color: 'var(--danger)' }}>{readingStaleReason(selected)}。重新问不受冷却限制。</div>}
              </div>
            </Inset>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button block variant="primary" disabled={busy || level === 0} onClick={ask}>
                {busy ? '星婆婆在看……' : hasCache ? '再说一遍' : mode === 'self' ? (selected.fortune && readingStaleReason(selected) ? '重新问星婆婆' : '请星婆婆看看') : '请星婆婆看你们俩'}
              </Button>
              {hasCache && mode === 'self' && (
                <Button
                  variant="ghost"
                  disabled={busy || cd > 0}
                  onClick={async () => {
                    if (!selected.birth) return;
                    setBusy(true);
                    say(['好，我再仔细看一遍。', '（星婆婆眯起眼睛）']);
                    try {
                      const reading = await requestReading(selected, ai.model);
                      await saveReading(selected, reading, readingHash(selected));
                      play('milestone');
                      say(reading.dialogue);
                    } catch (e) {
                      say([`哎呀，星星今天不太配合。（${friendlyError(e)}）`]);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {cd > 0 ? `再问一次（${Math.ceil(cd / 3600000)} 小时后）` : '再问一次'}
                </Button>
              )}
            </div>
            {spoken && hasCache && (
              <Button size="small" variant="ghost" block onClick={() => nav(`/person/${selected.id}?tab=fortune`)}>
                已记到 {selected.isMe ? '我' : selected.nickname || selected.name} 的档案里 · 去看解读卡
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
          给 {stats.readings} 个人看过 · 合过 {stats.synastries} 次盘 · 纯属趣味，不影响任何计分
        </div>
      </Panel>
    </Page>
  );
}
