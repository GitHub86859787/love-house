import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page, PageHeader } from '@/app/Layout';
import { Panel, Inset } from '@/ui/Panel';
import { Button } from '@/ui/Button';
import { Field, Input, Row, Select } from '@/ui/Field';
import { buildChart, chartToText, SHICHEN_OPTIONS } from '@/fortune/chart';
import { runDateChecks, runNatalChecks, runReferenceChecks, runZodiacBoundaryChecks, summarize, type CheckRow } from '@/fortune/selfcheck';
import { ChartCards, ChartSummaryRow } from '@/features/fortune/ChartCards';
import type { Birth } from '@/db/types';

function Table({ rows, firstCol }: { rows: CheckRow[]; firstCol: string }) {
  const cols = rows[0]?.cells.map((c) => c.label) ?? [];
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: 'var(--fs-sm)', width: '100%', minWidth: cols.length > 2 ? 420 : undefined }}>
        <thead>
          <tr>
            <th style={th}>{firstCol}</th>
            {cols.map((c) => (
              <th key={c} style={th}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td style={td}>
                {r.label}
                {r.note && <div style={{ fontSize: 10, color: 'var(--ink-soft)' }}>{r.note}</div>}
              </td>
              {r.cells.map((c) => (
                <td key={c.label} style={{ ...td, background: c.ok ? undefined : '#f7d9d9', color: c.ok ? undefined : 'var(--danger)' }}>
                  <div>{c.actual}</div>
                  {c.expected !== undefined && !c.ok && <div style={{ fontSize: 10 }}>应为 {c.expected}</div>}
                  {c.expected === undefined && <div style={{ fontSize: 10, color: 'var(--ink-soft)' }}>（无标准）</div>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: 'left', padding: '4px 6px', borderBottom: '2px solid var(--wood-light)', color: 'var(--ink-soft)', fontWeight: 'normal', whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '4px 6px', borderBottom: '1px solid var(--paper-deep)', verticalAlign: 'top', whiteSpace: 'nowrap' };

/** 设置页 → 排盘自检：标准答案表 + 星座边界 + 日期换算，不一致标红；下面可以任意试算 */
export function SelfCheckPage() {
  const nav = useNavigate();
  const ref = useMemo(() => runReferenceChecks(), []);
  const zb = useMemo(() => runZodiacBoundaryChecks(), []);
  const dc = useMemo(() => runDateChecks(), []);
  const nc = useMemo(() => runNatalChecks(), []);
  const sum = summarize([...ref, ...zb, ...dc, ...nc]);

  const [y, setY] = useState('2001');
  const [m, setM] = useState('9');
  const [d, setD] = useState('25');
  const [sc, setSc] = useState('');
  const [lunar, setLunar] = useState(false);
  const birth: Birth | null = useMemo(() => {
    const month = Number(m);
    const day = Number(d);
    if (!(month >= 1 && month <= 12 && day >= 1 && day <= 31)) return null;
    const year = y ? Number(y) : undefined;
    const opt = SHICHEN_OPTIONS.find((o) => o.zhi === sc);
    return { month, day, ...(year ? { year } : {}), ...(lunar ? { isLunar: true } : {}), ...(opt ? { hour: opt.hour } : {}) };
  }, [y, m, d, sc, lunar]);
  const chart = birth ? buildChart(birth) : null;

  return (
    <Page>
      <PageHeader title="排盘自检" subtitle={sum.failed === 0 ? `全部 ${sum.total} 项一致` : `${sum.failed} / ${sum.total} 项不一致`} left={<Button variant="ghost" iconName="back" aria-label="返回" onClick={() => nav('/settings')} />} />

      <Panel title={sum.failed === 0 ? '✓ 排盘全部正确' : `✗ 有 ${sum.failed} 项不一致`} golden={sum.failed === 0}>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)' }}>
          约定：生肖按农历年切换（春节当天换），八字年柱按立春切换，两者分开算。星座按公历月日；农历生日先换算成公历再算星座。标红的格子是计算值与标准值不一致。
        </p>
      </Panel>

      <Panel title="标准答案表" tight>
        <Table rows={ref} firstCol="公历生日" />
      </Panel>

      <Panel title="星座边界" tight>
        <Table rows={zb} firstCol="月/日" />
      </Panel>

      <Panel title="日期换算（月份 ±1 路径）" tight>
        <Table rows={dc} firstCol="检查项" />
      </Panel>

      <Panel title="本命盘与手动排盘" tight>
        <Table rows={nc} firstCol="检查项" />
      </Panel>

      <Panel title="试算">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Row>
            <Field label="年（可空）">
              <Input inputMode="numeric" value={y} onChange={(e) => setY(e.target.value.replace(/\D/g, '').slice(0, 4))} />
            </Field>
            <Field label="月">
              <Input inputMode="numeric" value={m} onChange={(e) => setM(e.target.value.replace(/\D/g, '').slice(0, 2))} />
            </Field>
            <Field label="日">
              <Input inputMode="numeric" value={d} onChange={(e) => setD(e.target.value.replace(/\D/g, '').slice(0, 2))} />
            </Field>
          </Row>
          <Row>
            <Field label="时辰">
              <Select value={sc} onChange={(e) => setSc(e.target.value)}>
                <option value="">不知道</option>
                {SHICHEN_OPTIONS.map((o) => (
                  <option key={o.zhi} value={o.zhi}>
                    {o.label} {o.range}
                  </option>
                ))}
              </Select>
            </Field>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--fs-sm)', alignSelf: 'flex-end', minHeight: 40 }}>
              <input type="checkbox" checked={lunar} onChange={(e) => setLunar(e.target.checked)} style={{ width: 20, height: 20 }} />
              输入的是农历
            </label>
          </Row>
          {chart && (
            <>
              <Inset>
                <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)', marginBottom: 4 }}>
                  解释为：{lunar ? '农历' : '公历'} {y || '？'} 年 {m} 月 {d} 日{chart.lunarInputNote ? ` · ${chart.lunarInputNote}` : ''} · 完整度 L{chart.level}
                </div>
                <ChartSummaryRow chart={chart} />
                {chart.pillarShengXiao && chart.pillarShengXiao !== chart.shengXiao && (
                  <div style={{ fontSize: 10, color: 'var(--ink-soft)', marginTop: 4 }}>
                    生肖按春节为{chart.shengXiao}，年柱按立春已是{chart.pillarShengXiao}年
                  </div>
                )}
              </Inset>
              <ChartCards chart={chart} />
              <pre style={{ fontSize: 10, whiteSpace: 'pre-wrap', color: 'var(--ink-soft)', margin: 0, userSelect: 'text' }}>{chartToText(chart)}</pre>
            </>
          )}
        </div>
      </Panel>
    </Page>
  );
}
