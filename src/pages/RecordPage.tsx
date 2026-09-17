import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { InteractionType, Person, PreferenceTier } from '@/db/types';
import { sortByAffection } from '@/db/persons';
import { addInteraction, previewScore } from '@/db/interactions';
import { INTERACTIONS, SELECTABLE_TYPES } from '@/config/interactions';
import { TIER_ORDER, TIERS } from '@/config/reactions';
import { TierIcon } from '@/ui/TierIcon';
import { SCORING } from '@/config/scoring';
import { matchGift, type ScoreResult } from '@/features/scoring/engine';
import { ScoreAnimation } from '@/features/interactions/ScoreAnimation';
import { Page, PageHeader } from '@/app/Layout';
import { Panel, Inset } from '@/ui/Panel';
import { Button } from '@/ui/Button';
import { Chip, Field, Input, Textarea } from '@/ui/Field';
import { HeartBar } from '@/ui/HeartBar';
import { Avatar } from '@/pixel/avatar/Avatar';
import { Sprite } from '@/pixel/Sprite';
import { icon } from '@/pixel/sprites/icons';
import { useToast } from '@/ui/Toast';
import styles from './RecordPage.module.css';

type Step = 'person' | 'type' | 'detail' | 'result';

export function RecordPage() {
  const nav = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const presetId = params.get('person');
  const persons = useLiveQuery(() => db.persons.filter((p) => !p.isMe).toArray(), []);
  const sorted = useMemo(() => sortByAffection(persons ?? []), [persons]);

  const [personId, setPersonId] = useState<string | null>(presetId);
  const [step, setStep] = useState<Step>(presetId ? 'type' : 'person');
  const [type, setType] = useState<InteractionType | null>(null);
  const [giftName, setGiftName] = useState('');
  const [giftTier, setGiftTier] = useState<PreferenceTier>('neutral');
  const [matchedId, setMatchedId] = useState<string | undefined>();
  const [tierTouched, setTierTouched] = useState(false);
  const [price, setPrice] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [memo, setMemo] = useState('');
  const [preview, setPreview] = useState<ScoreResult | null>(null);
  const [override, setOverride] = useState('');
  const [result, setResult] = useState<{ before: number; after: number; points: number } | null>(null);
  const [animating, setAnimating] = useState(false);

  const person = sorted.find((p) => p.id === personId) ?? null;

  // 礼物名变化时自动匹配喜好
  useEffect(() => {
    if (!person || type !== 'gift' || tierTouched) return;
    const m = matchGift(person, giftName);
    setGiftTier(m.tier);
    setMatchedId(m.preferenceId);
  }, [giftName, person, type, tierTouched]);

  // 预览得分
  useEffect(() => {
    if (!person || !type) return;
    let alive = true;
    previewScore(person, type, type === 'gift' ? giftTier : undefined).then((r) => alive && setPreview(r));
    return () => {
      alive = false;
    };
  }, [person, type, giftTier]);

  const reset = (keepPerson: boolean) => {
    setType(null);
    setGiftName('');
    setGiftTier('neutral');
    setMatchedId(undefined);
    setTierTouched(false);
    setPrice('');
    setShowMore(false);
    setMemo('');
    setPreview(null);
    setOverride('');
    setResult(null);
    setStep(keepPerson ? 'type' : 'person');
    if (!keepPerson) setPersonId(null);
  };

  const submit = async () => {
    if (!person || !type) return;
    if ((type === 'gift' || type === 'receivedGift') && !giftName.trim()) {
      toast('填一下礼物名字', 'error');
      return;
    }
    const pointsOverride = override.trim() ? Math.round(Number(override)) : undefined;
    const r = await addInteraction({
      personId: person.id,
      type,
      gift:
        type === 'gift' || type === 'receivedGift'
          ? { name: giftName.trim(), tier: type === 'gift' ? giftTier : 'neutral', matchedPreferenceId: matchedId, price: price ? Number(price) : undefined }
          : undefined,
      memo,
      pointsOverride: Number.isFinite(pointsOverride) ? pointsOverride : undefined,
    });
    setResult({ before: r.before, after: r.after, points: r.interaction.points });
    setAnimating(true);
    setStep('result');
  };

  const stepIndex = { person: 0, type: 1, detail: 2, result: 3 }[step];
  const giftLike = type === 'gift' || type === 'receivedGift';
  const suggestions = person ? person.preferences.filter((p) => p.source !== 'fortune' && (p.tier === 'love' || p.tier === 'like') && (p.category === 'food' || p.category === 'item')).slice(0, 8) : [];
  const giftIsDisliked = type === 'gift' && matchedId && (giftTier === 'dislike' || giftTier === 'hate');

  return (
    <Page>
      <PageHeader title="记一笔" left={<Button variant="ghost" iconName="back" aria-label="返回" onClick={() => nav(-1)} />} />
      <div className={styles.steps}>
        {[0, 1, 2].map((i) => (
          <span key={i} className={`${styles.step} ${i <= stepIndex ? styles.stepDone : ''}`} />
        ))}
      </div>

      {step === 'person' && (
        <Panel title="1 · 和谁">
          {sorted.length === 0 && <p style={{ color: 'var(--ink-soft)', fontSize: 'var(--fs-sm)' }}>村里还没有人，先去认识一位村民。</p>}
          <div className={styles.people}>
            {sorted.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`${styles.personBtn} px-corner-sm ${p.id === personId ? styles.personActive : ''}`}
                onClick={() => {
                  setPersonId(p.id);
                  setStep('type');
                }}
              >
                <Avatar config={p.avatar} scale={2} />
                <span className={styles.personName}>{p.nickname || p.name}</span>
              </button>
            ))}
          </div>
        </Panel>
      )}

      {step === 'type' && person && (
        <Panel title="2 · 做了什么">
          <PersonRow person={person} onChange={() => setStep('person')} />
          <div className={styles.types}>
            {SELECTABLE_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                className={`${styles.typeBtn} px-corner-sm ${t === type ? styles.typeActive : ''}`}
                onClick={() => {
                  setType(t);
                  setStep('detail');
                }}
              >
                <Sprite grid={icon(INTERACTIONS[t].icon, '#5c3a1e')} scale={2} />
                <span>
                  <div>{INTERACTIONS[t].label}</div>
                  <div className={styles.typeHint}>
                    {t === 'gift' ? '按喜好档位' : t === 'receivedGift' ? '不加分' : `+${SCORING.interaction[t]}`}
                  </div>
                </span>
              </button>
            ))}
          </div>
        </Panel>
      )}

      {step === 'detail' && person && type && (
        <Panel title={`3 · ${INTERACTIONS[type].label}`}>
          <PersonRow person={person} onChange={() => setStep('person')} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {giftLike && (
              <>
                <Field label={type === 'gift' ? '送了什么' : 'TA 送了什么'}>
                  <Input value={giftName} onChange={(e) => setGiftName(e.target.value)} placeholder="比如：手冲咖啡豆" maxLength={30} autoFocus />
                </Field>
                {suggestions.length > 0 && type === 'gift' && (
                  <div className={styles.suggest}>
                    {suggestions.map((p) => (
                      <Chip key={p.id} active={p.name === giftName} onClick={() => setGiftName(p.name)}>
                        <TierIcon tier={p.tier} scale={1} /> {p.name}
                      </Chip>
                    ))}
                  </div>
                )}
                {type === 'gift' && (
                  <Field label={giftIsDisliked ? '⚠ 这是 TA 讨厌的东西，确定要送吗？' : matchedId ? '自动匹配到了 TA 的喜好，可改档' : '没匹配到喜好，按「一般」，可改档'}>
                    <div className={styles.tierRow}>
                      {TIER_ORDER.map((t) => (
                        <button
                          key={t}
                          type="button"
                          className={`${styles.tierBtn} px-corner-sm ${t === giftTier ? styles.tierActive : ''}`}
                          onClick={() => {
                            setGiftTier(t);
                            setTierTouched(true);
                          }}
                        >
                          <div style={{ height: 20 }}>
                            <TierIcon tier={t} scale={2} />
                          </div>
                          <div style={{ color: TIERS[t].color }}>{TIERS[t].label}</div>
                        </button>
                      ))}
                    </div>
                  </Field>
                )}
                <Button size="small" variant="ghost" onClick={() => setShowMore((v) => !v)}>
                  {showMore ? '收起' : '更多'}
                </Button>
                {showMore && (
                  <Field label="价格（可选，只在图鉴和年度回顾里出现）">
                    <Input type="number" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="元" />
                  </Field>
                )}
              </>
            )}
            <Field label="一句话记录（可选）">
              <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="今天聊到了……" style={{ minHeight: 56 }} />
            </Field>
            {preview && (
              <Inset>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ flex: 1 }}>
                    本次得分{' '}
                    <b style={{ color: preview.points > 0 ? 'var(--grass-dark)' : preview.points < 0 ? 'var(--danger)' : 'var(--ink-soft)' }}>
                      {preview.points > 0 ? '+' : ''}
                      {preview.points}
                    </b>
                  </span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={override}
                    onChange={(e) => setOverride(e.target.value)}
                    placeholder="改分"
                    style={{ width: 88, minHeight: 32, padding: '4px 8px' }}
                  />
                </div>
                <div style={{ fontSize: 'var(--fs-sm)', color: preview.giftLimitHit ? 'var(--danger)' : 'var(--ink-soft)', marginTop: 4 }}>
                  {preview.reason}
                  {preview.isBirthday && ' 🎂'}
                </div>
              </Inset>
            )}
            <Button variant="primary" block onClick={submit}>
              记下来
            </Button>
          </div>
        </Panel>
      )}

      {step === 'result' && person && result && type && (
        <Panel title="记好了" golden={result.after >= SCORING.maxPoints}>
          <ScoreAnimation
            person={person}
            points={result.points}
            iconName={type === 'gift' ? 'gift' : INTERACTIONS[type].icon}
            iconColor={type === 'gift' ? TIERS[giftTier].color : '#f5c542'}
            onHit={() => setAnimating(false)}
          />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <HeartBar points={animating ? result.before : result.after} scale={2} showText />
            {type === 'gift' && (
              <div style={{ color: TIERS[giftTier].color, textAlign: 'center' }}>
                {person.nickname || person.name}：「{TIERS[giftTier].reaction}」
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <Button block variant="ghost" onClick={() => reset(true)}>
              继续记一条
            </Button>
            <Button block variant="primary" onClick={() => nav(`/person/${person.id}`, { replace: true })}>
              完成
            </Button>
          </div>
        </Panel>
      )}
    </Page>
  );
}

function PersonRow({ person, onChange }: { person: Person; onChange: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <Avatar config={person.avatar} scale={2} />
      <span style={{ flex: 1 }}>{person.name}</span>
      <Button size="small" variant="ghost" onClick={onChange}>
        换人
      </Button>
    </div>
  );
}
