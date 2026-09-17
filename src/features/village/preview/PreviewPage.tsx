import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Page, PageHeader } from '@/app/Layout';
import { Panel, Inset } from '@/ui/Panel';
import { Button } from '@/ui/Button';
import { Tabs } from '@/ui/Tabs';
import { Select } from '@/ui/Field';
import { Grid } from '@/pixel/painter';
import { gridToDataURL } from '@/pixel/render';
import { currentSeason, type Season } from '@/lib/season';
import { FAMILIES, SEASON_RAMPS } from '../palette';
import { groundDemo, groundSheet } from '../sprites/ground';
import { WATER_FRAMES, waterAnimStrip, waterDemo, waterSheet } from '../sprites/water';
import { floraDemo, floraSheet, treeStrip } from '../sprites/flora';
import { oldHouseSprite, smokeSprite, OLDHOUSE_H, OLDHOUSE_W } from '../sprites/buildings/oldhouse';
import { grassAt } from '../sprites/ground';
import { TILE } from '../sprites/tile';
import styles from './PreviewPage.module.css';

type Tab = 'palette' | 'ground' | 'water' | 'flora' | 'buildings';
const TABS: { key: Tab; label: string }[] = [
  { key: 'palette', label: '色卡' },
  { key: 'ground', label: '1 地面' },
  { key: 'water', label: '2 水系' },
  { key: 'flora', label: '3 植被小物' },
  { key: 'buildings', label: '4 建筑' },
];
const SEASONS: { key: Season; label: string }[] = [
  { key: 'spring', label: '春' },
  { key: 'summer', label: '夏' },
  { key: 'autumn', label: '秋' },
  { key: 'winter', label: '冬' },
];

/** 把 Grid 画成 <img>，scale 为整数倍 */
function Px({ grid, scale, title }: { grid: Grid; scale: number; title?: string }) {
  const src = useMemo(() => gridToDataURL(grid), [grid]);
  return <img src={src} width={grid.w * scale} height={grid.h * scale} alt={title ?? ''} title={title} className={styles.px} draggable={false} />;
}

type Scale = 1 | 3;

/** 隐藏的场景预览页；支持 URL 参数 ?tab=ground&season=spring&scale=3 供截图脚本直达 */
export function PreviewPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'palette');
  const [season, setSeason] = useState<Season | 'auto'>((params.get('season') as Season) || 'auto');
  const [scale, setScale] = useState<Scale>(params.get('scale') === '1' ? 1 : 3);
  const [frame, setFrame] = useState(Number(params.get('frame') ?? 0));
  const [animate, setAnimate] = useState(params.get('anim') !== '0');
  // 8 fps 逻辑帧：水面三帧循环
  useEffect(() => {
    if (!animate) return;
    const t = window.setInterval(() => setFrame((f) => (f + 1) % WATER_FRAMES), 250);
    return () => window.clearInterval(t);
  }, [animate]);
  const s: Season = season === 'auto' ? currentSeason() : season;
  // 截图模式：隐藏顶栏 / 底栏，页面不限宽，让 3× 图块表完整露出来
  const shot = params.get('shot') === '1';
  useEffect(() => {
    if (!shot) return;
    document.documentElement.dataset.shot = '1';
    return () => {
      delete document.documentElement.dataset.shot;
    };
  }, [shot]);

  return (
    <Page>
      <PageHeader title="场景预览" subtitle="美术阶段验收用 · 不在导航里" left={<Button variant="ghost" iconName="back" aria-label="返回" onClick={() => nav('/settings')} />} />
      <Panel tight>
        <div className={styles.controls}>
          <span className={styles.label}>季节</span>
          <Select value={season} onChange={(e) => setSeason(e.target.value as Season | 'auto')} style={{ flex: 1 }}>
            <option value="auto">跟真实日期（{SEASONS.find((x) => x.key === currentSeason())?.label}）</option>
            {SEASONS.map((x) => (
              <option key={x.key} value={x.key}>
                {x.label}
              </option>
            ))}
          </Select>
          <span className={styles.label}>比例</span>
          <Button size="small" variant={scale === 1 ? 'primary' : 'ghost'} onClick={() => setScale(1)}>
            1×
          </Button>
          <Button size="small" variant={scale === 3 ? 'primary' : 'ghost'} onClick={() => setScale(3)}>
            3×
          </Button>
        </div>
      </Panel>
      <Panel tight>
        <Tabs tabs={TABS} value={tab} onChange={setTab} />
        {tab === 'palette' && <PaletteCard season={s} />}
        {tab === 'ground' && <GroundSheet season={s} scale={scale} />}
        {tab === 'buildings' && <BuildingSheet season={s} scale={scale} frame={frame} />}
        {tab === 'flora' && <FloraSheet season={s} scale={scale} frame={frame} />}
        {tab === 'water' && <WaterSheet season={s} scale={scale} frame={frame} animate={animate} onToggle={() => setAnimate((a) => !a)} />}
      </Panel>
    </Page>
  );
}

function Swatch({ color, label }: { color: string; label?: string }) {
  return (
    <div className={styles.swatch}>
      <div className={styles.chip} style={{ background: color }} />
      <div className={styles.hex}>
        {label && <div>{label}</div>}
        {color}
      </div>
    </div>
  );
}

function PaletteCard({ season }: { season: Season }) {
  const sr = SEASON_RAMPS[season];
  return (
    <div className={styles.sheet} data-shot="palette">
      <p className={styles.note}>16 个色系 × 三阶 = 48 色。每行：暗 / 基 / 亮 + 描边色（从别的色系借，不新增）。光源左上：亮阶只在上、左侧出现。</p>
      <div className={styles.strip}>
        {FAMILIES.flatMap((f) => [f.dark, f.base, f.light]).map((c) => (
          <span key={c} style={{ background: c }} title={c} />
        ))}
      </div>
      {FAMILIES.map((f) => (
        <div key={f.key} className={styles.familyRow}>
          <div className={styles.familyName}>
            <div>{f.label}</div>
            <div className={styles.usage}>{f.usage}</div>
          </div>
          <Swatch color={f.dark} label="暗" />
          <Swatch color={f.base} label="基" />
          <Swatch color={f.light} label="亮" />
          <div className={styles.outlineBox}>
            <div className={styles.chipSmall} style={{ background: f.outline }} />
            <div className={styles.hex}>描边</div>
          </div>
        </div>
      ))}
      <Inset>
        <div className={styles.note}>当季色带（{SEASONS.find((x) => x.key === season)?.label}）</div>
        {(['grass', 'leaf', 'crop'] as const).map((k) => (
          <div key={k} className={styles.rampRow}>
            <span className={styles.rampName}>{k === 'grass' ? '草地' : k === 'leaf' ? '树冠' : '作物'}</span>
            <span style={{ background: sr[k].dark }} />
            <span style={{ background: sr[k].base }} />
            <span style={{ background: sr[k].light }} />
            <span className={styles.rampOutline} style={{ background: sr[k].outline }} />
          </div>
        ))}
      </Inset>
    </div>
  );
}

function GroundSheet({ season, scale }: { season: Season; scale: Scale }) {
  const items = useMemo(() => groundSheet(season), [season]);
  const demo = useMemo(() => groundDemo(season), [season]);
  const label = SEASONS.find((x) => x.key === season)?.label;
  return (
    <div className={styles.sheet} data-shot="sheet">
      <p className={styles.note}>
        地面 · {label} · {scale}×。拼合样例：草地 + 十字路 + 石板 + 田 + 屋前土地。
      </p>
      <div className={styles.demo}>
        <Px grid={demo} scale={scale} title={`${scale}×`} />
      </div>
      <p className={styles.note}>图块表</p>
      <div className={scale === 1 ? styles.gridSmall : styles.grid}>
        {items.map((it) => (
          <div key={it.name} className={styles.item}>
            <div className={styles.pair}>
              <Px grid={it.grid} scale={scale} />
            </div>
            <div className={styles.itemName}>{it.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WaterSheet({ season, scale, frame, animate, onToggle }: { season: Season; scale: Scale; frame: number; animate: boolean; onToggle: () => void }) {
  const items = useMemo(() => waterSheet(season, frame), [season, frame]);
  const demo = useMemo(() => waterDemo(season, frame), [season, frame]);
  const strip = useMemo(() => waterAnimStrip(season), [season]);
  const label = SEASONS.find((x) => x.key === season)?.label;
  return (
    <div className={styles.sheet} data-shot="sheet">
      <p className={styles.note}>
        水系 · {label} · {scale}× · 帧 {frame + 1}/{WATER_FRAMES}{' '}
        <Button size="small" variant="ghost" onClick={onToggle}>
          {animate ? '停' : '动'}
        </Button>
      </p>
      <div className={styles.demo}>
        <Px grid={demo} scale={scale} title={`${scale}×`} />
      </div>
      <p className={styles.note}>三帧分解（浪花与波纹右移、暗纹反向、鸭子与船起伏）</p>
      <div className={styles.demo} data-shot="extra">
        <Px grid={strip} scale={scale} />
      </div>
      <p className={styles.note}>图块表</p>
      <div className={scale === 1 ? styles.gridSmall : styles.grid}>
        {items.map((it) => (
          <div key={it.name} className={styles.item}>
            <div className={styles.pair}>
              <Px grid={it.grid} scale={scale} />
            </div>
            <div className={styles.itemName}>{it.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FloraSheet({ season, scale, frame }: { season: Season; scale: Scale; frame: number }) {
  const f = frame % 2;
  const strip = useMemo(() => treeStrip(f), [f]);
  const items = useMemo(() => floraSheet(season, f), [season, f]);
  const demo = useMemo(() => floraDemo(season, f), [season, f]);
  const label = SEASONS.find((x) => x.key === season)?.label;
  return (
    <div className={styles.sheet} data-shot="sheet">
      <p className={styles.note}>
        植被与小物 · {label} · {scale}× · 帧 {f + 1}/2
      </p>
      <div className={styles.demo}>
        <Px grid={demo} scale={scale} title={`${scale}×`} />
      </div>
      <p className={styles.note}>大树四季并排：上排圆冠、下排尖冠，带影子（秋天影子上落叶）</p>
      <div className={styles.demo} data-shot="extra">
        <Px grid={strip} scale={scale} />
      </div>
      <p className={styles.note}>图块表</p>
      <div className={scale === 1 ? styles.gridSmall : styles.grid}>
        {items.map((it) => (
          <div key={it.name} className={styles.item}>
            <div className={styles.pair}>
              <Px grid={it.grid} scale={scale} />
            </div>
            <div className={styles.itemName}>{it.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 把一栋房子放在春天草地上看（含烟，烟囱四季都冒） */
function houseOnGrass(season: Season, night: boolean, frame: number): Grid {
  const cols = 7;
  const rows = 6;
  const g = new Grid(cols * TILE, rows * TILE);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) g.compose(grassAt('spring', x + 30, y + 30), x * TILE, y * TILE);
  const ox = 8;
  const oy = 14;
  g.compose(oldHouseSprite(season, night, frame), ox, oy);
  g.compose(smokeSprite(frame), ox + 62, oy - 14);
  return g;
}

function BuildingSheet({ scale, frame }: { season: Season; scale: Scale; frame: number }) {
  const day = useMemo(() => houseOnGrass('spring', false, frame), [frame]);
  const dusk = useMemo(() => houseOnGrass('autumn', true, frame), [frame]);
  void OLDHOUSE_W;
  void OLDHOUSE_H;
  return (
    <div className={styles.sheet} data-shot="sheet">
      <p className={styles.note}>建筑 · 老宅 · {scale}× · 左：春天白天 / 右：秋天傍晚亮灯（整体换色表在第 6 类，这里只亮窗和灯）</p>
      <div className={styles.demo} data-shot="extra" style={{ display: 'flex', gap: 12 }}>
        <Px grid={day} scale={scale} title="春 白天" />
        <Px grid={dusk} scale={scale} title="秋 傍晚" />
      </div>
      <p className={styles.note}>1× 自检</p>
      <div className={styles.demo} style={{ display: 'flex', gap: 12 }}>
        <Px grid={day} scale={1} />
        <Px grid={dusk} scale={1} />
      </div>
    </div>
  );
}
