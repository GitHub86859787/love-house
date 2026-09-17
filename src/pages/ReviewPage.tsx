import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '@/db/db';
import { useSettings } from '@/db/settings';
import { Page, PageHeader } from '@/app/Layout';
import { Panel, Inset } from '@/ui/Panel';
import { Button } from '@/ui/Button';
import { Select } from '@/ui/Field';
import { useToast } from '@/ui/Toast';
import { play } from '@/audio/sound';
import { availableYears, yearStats } from '@/features/review/stats';
import { CARD_H, CARD_W, drawReviewCard, ensureFont } from '@/features/review/card';
import { isIOS, saveFile } from '@/features/backup/file';

export function ReviewPage() {
  const nav = useNavigate();
  const toast = useToast();
  const settings = useSettings();
  const persons = useLiveQuery(() => db.persons.toArray(), []);
  const interactions = useLiveQuery(() => db.interactions.toArray(), []);
  const quests = useLiveQuery(() => db.quests.toArray(), []);
  const achievements = useLiveQuery(() => db.achievements.toArray(), []);
  const years = useMemo(() => availableYears(settings.firstUseDate, persons ?? []), [settings.firstUseDate, persons]);
  const [year, setYear] = useState(new Date().getFullYear());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [saving, setSaving] = useState(false);

  const stats = useMemo(() => (persons && interactions && quests && achievements ? yearStats(persons, interactions, quests, achievements, year) : null), [persons, interactions, quests, achievements, year]);
  const me = persons?.find((p) => p.isMe);

  useEffect(() => {
    if (!stats || !canvasRef.current) return;
    const canvas = canvasRef.current;
    let cancelled = false;
    ensureFont().then(() => {
      if (!cancelled) drawReviewCard(canvas, stats, me?.name);
    });
    return () => {
      cancelled = true;
    };
  }, [stats, me?.name]);

  const save = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    try {
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
      if (!blob) throw new Error('生成图片失败');
      const how = await saveFile(blob, `人情村${year}年度回顾.png`);
      play('done');
      toast(how === 'shared' ? '已交给系统分享，可以存到相册' : '图片已下载');
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') toast('取消了');
      else toast(e instanceof Error ? e.message : '存图失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page>
      <PageHeader title="年度回顾" subtitle="这一年在村里的往来" left={<Button variant="ghost" iconName="back" aria-label="返回" onClick={() => nav('/settings')} />} />
      <Panel tight>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
          <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)' }}>看哪一年</span>
          <Select value={String(year)} onChange={(e) => setYear(Number(e.target.value))} style={{ flex: 1 }}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y} 年
              </option>
            ))}
          </Select>
          <Button variant="primary" size="small" disabled={saving || !stats} onClick={save}>
            {saving ? '生成中…' : '存图'}
          </Button>
        </div>
      </Panel>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <canvas ref={canvasRef} style={{ width: '100%', maxWidth: CARD_W, aspectRatio: `${CARD_W} / ${CARD_H}`, imageRendering: 'pixelated' }} aria-label={`${year} 年度回顾卡`} />
      </div>
      {stats && stats.byType.length > 0 && (
        <Panel title="往来明细" tight>
          <Inset>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', fontSize: 'var(--fs-sm)' }}>
              {stats.byType.map((t) => (
                <span key={t.type}>
                  {t.label} {t.count}
                </span>
              ))}
            </div>
          </Inset>
        </Panel>
      )}
      <p style={{ fontSize: 10, color: 'var(--ink-soft)', textAlign: 'center' }}>{isIOS() ? '点「存图」后在分享面板选「存储图像」就进相册了。' : '点「存图」下载 PNG。'}</p>
    </Page>
  );
}
