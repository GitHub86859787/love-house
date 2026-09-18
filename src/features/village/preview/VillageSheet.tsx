/**
 * 第 7 类 · 场景组装验收：真实数据的整村，季节 / 时段 / 倍数可选，网格 / 区域 / 空地检查 / 命中区开关，角上显示性能数字。
 */
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { useSettings } from '@/db/settings';
import type { Season } from '@/lib/season';
import { Select } from '@/ui/Field';
import { buildVillageModel } from '../model';
import { SLOTS, SLOT_LABEL, type Slot } from '../sprites/daylight';
import { VillageCanvas } from '../VillageCanvas';
import type { Perf } from '../renderer/scene';
import styles from './PreviewPage.module.css';

interface Props {
  season: Season;
  scale: 1 | 3;
  animate: boolean;
  frame: number;
  /** URL 参数：slot、debug */
  slotParam?: string | null;
  debugParam?: string | null;
}

export function VillageSheet({ season, scale, animate, frame, slotParam, debugParam }: Props) {
  const settings = useSettings();
  const all = useLiveQuery(() => db.persons.toArray(), []);
  const model = buildVillageModel(all ?? [], settings);
  const [slot, setSlot] = useState<Slot | 'auto'>((slotParam as Slot) || 'auto');
  const [flags, setFlags] = useState(() => new Set((debugParam ?? '').split(',').filter(Boolean)));
  const [perf, setPerf] = useState<Perf | null>(null);
  const toggle = (k: string) => setFlags((f) => { const n = new Set(f); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const debug = { grid: flags.has('grid'), areas: flags.has('areas'), empty: flags.has('empty'), hit: flags.has('hit') };
  return (
    <div className={styles.sheet} data-shot="sheet">
      <div className={styles.controls}>
        <span className={styles.label}>时段</span>
        <Select value={slot} onChange={(e) => setSlot(e.target.value as Slot | 'auto')} style={{ flex: 1 }}>
          <option value="auto">跟真实时间</option>
          {SLOTS.map((s) => (
            <option key={s} value={s}>
              {SLOT_LABEL[s]}
            </option>
          ))}
        </Select>
      </div>
      <div className={styles.controls} style={{ flexWrap: 'wrap' }}>
        {(['grid', 'areas', 'empty', 'hit'] as const).map((k) => (
          <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--fs-sm)' }}>
            <input type="checkbox" checked={flags.has(k)} onChange={() => toggle(k)} />
            {{ grid: '网格', areas: '区域 / 可走格', empty: '空地检查', hit: '命中区' }[k]}
          </label>
        ))}
      </div>
      <p className={styles.note}>
        真实数据 · {model.villagers.length} 位村民{model.me ? ' + 我' : ''} · {scale}×
        {perf && ` · 建层 ${perf.buildMs.toFixed(0)} ms · 首帧 ${perf.firstFrameMs.toFixed(0)} ms · 每帧 ${perf.frameMs.toFixed(2)} ms（${perf.frames} 帧）`}
      </p>
      <div className={styles.demo} data-shot="village" style={{ padding: 0, border: 0, background: 'transparent' }}>
        <VillageCanvas model={model} season={season} slot={slot === 'auto' ? undefined : slot} scale={scale} animate={animate} frame={animate ? undefined : frame} debug={debug} onPerf={setPerf} />
      </div>
    </div>
  );
}
