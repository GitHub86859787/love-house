import { useMemo, useState } from 'react';
import type { Birth, BirthPlace, ManualPillars } from '@/db/types';
import { CITIES } from '@/config/cities';
import { buildChart, GAN_LIST, SHICHEN_OPTIONS, ZHI_LIST } from '@/fortune/chart';
import { REMIND_LABELS, lunarLabel } from '@/lib/birthday';
import { Button } from '@/ui/Button';
import { Field, Input, Row, Select } from '@/ui/Field';
import { Inset } from '@/ui/Panel';

export interface BirthDraft {
  bMonth: string;
  bDay: string;
  bYear: string;
  isLunar: boolean;
  /** '' 未知，'exact' 具体时间，否则地支 */
  shichen: string;
  exactTime: string;
  remind: 'solar' | 'lunar' | 'both';
  placeName: string;
  manual: boolean;
  mp: { yG: string; yZ: string; mG: string; mZ: string; dG: string; dZ: string; hG: string; hZ: string };
}

export const EMPTY_BIRTH_DRAFT: BirthDraft = {
  bMonth: '',
  bDay: '',
  bYear: '',
  isLunar: false,
  shichen: '',
  exactTime: '',
  remind: 'both',
  placeName: '',
  manual: false,
  mp: { yG: '', yZ: '', mG: '', mZ: '', dG: '', dZ: '', hG: '', hZ: '' },
};

export function draftFromBirth(b?: Birth): BirthDraft {
  if (!b) return EMPTY_BIRTH_DRAFT;
  const mp = b.manualPillars;
  return {
    bMonth: String(b.month),
    bDay: String(b.day),
    bYear: b.year ? String(b.year) : '',
    isLunar: b.isLunar ?? false,
    shichen: b.hour == null ? '' : b.minute != null ? 'exact' : SHICHEN_OPTIONS.find((o) => o.hour === b.hour)?.zhi ?? 'exact',
    exactTime: b.hour == null ? '' : `${String(b.hour).padStart(2, '0')}:${String(b.minute ?? 0).padStart(2, '0')}`,
    remind: b.remind ?? 'both',
    placeName: b.place?.name ?? '',
    manual: Boolean(mp),
    mp: { yG: mp?.year[0] ?? '', yZ: mp?.year[1] ?? '', mG: mp?.month[0] ?? '', mZ: mp?.month[1] ?? '', dG: mp?.day[0] ?? '', dZ: mp?.day[1] ?? '', hG: mp?.hour?.[0] ?? '', hZ: mp?.hour?.[1] ?? '' },
  };
}

/** 草稿 → Birth；返回 'invalid' 表示填得不对，undefined 表示没填 */
export function birthFromDraft(d: BirthDraft): Birth | undefined | 'invalid' {
  if (!d.bMonth && !d.bDay) return undefined;
  const month = Number(d.bMonth);
  const day = Number(d.bDay);
  if (!(month >= 1 && month <= 12 && day >= 1 && day <= 31)) return 'invalid';
  const year = d.bYear ? Number(d.bYear) : undefined;
  if (year !== undefined && !(year >= 1900 && year <= 2100)) return 'invalid';
  let time: { hour?: number; minute?: number } = {};
  if (d.shichen === 'exact' && d.exactTime) {
    const [h, m] = d.exactTime.split(':').map(Number);
    if (h >= 0 && h <= 23) time = { hour: h, minute: Number.isFinite(m) ? m : 0 };
  } else if (d.shichen) {
    const opt = SHICHEN_OPTIONS.find((o) => o.zhi === d.shichen);
    if (opt) time = { hour: opt.hour };
  }
  const place: BirthPlace | undefined = CITIES.find((c) => c.name === d.placeName);
  let manualPillars: ManualPillars | undefined;
  if (d.manual) {
    const { yG, yZ, mG, mZ, dG, dZ, hG, hZ } = d.mp;
    if (!(yG && yZ && mG && mZ && dG && dZ)) return 'invalid';
    manualPillars = { year: yG + yZ, month: mG + mZ, day: dG + dZ, ...(hG && hZ ? { hour: hG + hZ } : {}) };
  }
  // 没年份时提醒只能按填的历法
  const remind = year ? d.remind : d.isLunar ? 'lunar' : 'solar';
  return { month, day, ...(year ? { year } : {}), ...(d.isLunar ? { isLunar: true } : {}), ...time, remind, ...(place ? { place } : {}), ...(manualPillars ? { manualPillars } : {}) };
}

interface Props {
  value: BirthDraft;
  onChange: (next: BirthDraft) => void;
  isMe?: boolean;
}

/** 生辰输入区：年月日 + 时辰 + 实时预览 + "更多"（农历 / 提醒方式 / 出生地 / 手动四柱） */
export function BirthSection({ value: d, onChange, isMe }: Props) {
  const [more, setMore] = useState(Boolean(d.isLunar || d.placeName || d.manual || d.remind !== 'both'));
  const set = <K extends keyof BirthDraft>(k: K, v: BirthDraft[K]) => onChange({ ...d, [k]: v });
  const setMp = (k: keyof BirthDraft['mp'], v: string) => onChange({ ...d, mp: { ...d.mp, [k]: v } });

  const parsed = useMemo(() => birthFromDraft({ ...d, manual: false }), [d]);
  const preview = useMemo(() => {
    if (!parsed || parsed === 'invalid') return null;
    const c = buildChart(parsed);
    const parts: string[] = [];
    if (parsed.isLunar) {
      const sm = c.solarText ?? '';
      parts.push(`农历 ${parsed.month} 月 ${parsed.day} 日 → 公历 ${sm}${parsed.year ? '' : '（按今年）'}`);
    } else {
      parts.push(`公历 ${parsed.month} 月 ${parsed.day} 日`);
      if (parsed.year) parts.push(`农历${lunarLabel(new Date(parsed.year, parsed.month - 1, parsed.day))}`);
    }
    if (c.zodiac) parts.push(c.zodiac.name);
    if (c.shengXiao) parts.push(`属${c.shengXiao}`);
    return parts.join(' · ');
  }, [parsed]);

  const hasYear = Boolean(d.bYear && Number(d.bYear) >= 1900);
  const pillarSelect = (gKey: keyof BirthDraft['mp'], zKey: keyof BirthDraft['mp'], label: string, optional = false) => (
    <Field label={label}>
      <div style={{ display: 'flex', gap: 4 }}>
        <Select value={d.mp[gKey]} onChange={(e) => setMp(gKey, e.target.value)} style={{ padding: '8px 4px', paddingRight: 24 }}>
          <option value="">{optional ? '—' : '干'}</option>
          {GAN_LIST.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </Select>
        <Select value={d.mp[zKey]} onChange={(e) => setMp(zKey, e.target.value)} style={{ padding: '8px 4px', paddingRight: 24 }}>
          <option value="">{optional ? '—' : '支'}</option>
          {ZHI_LIST.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </Select>
      </div>
    </Field>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Field label="生日（年份可不填）">
        <Row>
          <Input inputMode="numeric" placeholder="月" value={d.bMonth} onChange={(e) => set('bMonth', e.target.value.replace(/\D/g, '').slice(0, 2))} />
          <Input inputMode="numeric" placeholder="日" value={d.bDay} onChange={(e) => set('bDay', e.target.value.replace(/\D/g, '').slice(0, 2))} />
          <Input inputMode="numeric" placeholder="年（可选）" value={d.bYear} onChange={(e) => set('bYear', e.target.value.replace(/\D/g, '').slice(0, 4))} />
        </Row>
      </Field>
      {preview && (
        <div className="px-corner-sm" style={{ fontSize: 'var(--fs-sm)', padding: '6px 10px', background: d.isLunar ? '#efe3f7' : 'var(--white)', border: `2px solid ${d.isLunar ? '#6b3fa0' : 'var(--paper-deep)'}`, color: d.isLunar ? '#6b3fa0' : 'var(--ink)' }}>
          {preview}
        </div>
      )}
      {parsed === 'invalid' && !d.manual && <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--danger)' }}>日期填得不太对</div>}

      <Field label="出生时辰（可选，排四柱与本命盘用）">
        <Row>
          <Select value={d.shichen} onChange={(e) => set('shichen', e.target.value)}>
            <option value="">不知道</option>
            {SHICHEN_OPTIONS.map((o) => (
              <option key={o.zhi} value={o.zhi}>
                {o.label} {o.range}
              </option>
            ))}
            <option value="exact">填具体时间</option>
          </Select>
          {d.shichen === 'exact' && <Input type="time" value={d.exactTime} onChange={(e) => set('exactTime', e.target.value)} />}
        </Row>
      </Field>

      <Button size="small" variant="ghost" onClick={() => setMore((v) => !v)}>
        {more ? '收起更多' : '更多（农历 / 提醒方式 / 出生地 / 手动排盘）'}
      </Button>

      {more && (
        <Inset>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 'var(--fs-sm)' }}>
              <input type="checkbox" checked={d.isLunar} onChange={(e) => set('isLunar', e.target.checked)} style={{ width: 20, height: 20, flex: 'none' }} />
              <span>
                {isMe ? '我' : '我'}填的这个日期是农历
                <div style={{ color: 'var(--ink-soft)' }}>只知道农历生日时用。勾上后上面的预览会显示换算成的公历日期。</div>
              </span>
            </label>

            <Field label="生日提醒按" hint={hasYear ? '公历和农历生日可以都提醒' : '没填年份，只能按填写的历法提醒'}>
              <Select value={hasYear ? d.remind : d.isLunar ? 'lunar' : 'solar'} disabled={!hasYear} onChange={(e) => set('remind', e.target.value as BirthDraft['remind'])}>
                {(['both', 'solar', 'lunar'] as const).map((r) => (
                  <option key={r} value={r}>
                    {REMIND_LABELS[r]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="出生地（可选）" hint="用于真太阳时校正时柱，以及本命盘的上升点与宫位。时间按该地标准时区，不考虑夏令时">
              <Select value={d.placeName} onChange={(e) => set('placeName', e.target.value)}>
                <option value="">不填</option>
                {CITIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 'var(--fs-sm)' }}>
              <input type="checkbox" checked={d.manual} onChange={(e) => set('manual', e.target.checked)} style={{ width: 20, height: 20, flex: 'none' }} />
              <span>
                手动填四柱
                <div style={{ color: 'var(--ink-soft)' }}>打开后八字以这里填的干支为准，不再自动排；八字卡会标注"手动排盘"。</div>
              </span>
            </label>
            {d.manual && (
              <>
                <Row>
                  {pillarSelect('yG', 'yZ', '年柱')}
                  {pillarSelect('mG', 'mZ', '月柱')}
                </Row>
                <Row>
                  {pillarSelect('dG', 'dZ', '日柱')}
                  {pillarSelect('hG', 'hZ', '时柱（可空）', true)}
                </Row>
              </>
            )}
          </div>
        </Inset>
      )}
    </div>
  );
}
