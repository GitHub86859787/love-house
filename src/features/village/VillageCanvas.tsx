/**
 * 村庄场景（canvas）：24×22 tile 的俯视像素村，季节按真实日期、时段按真实时间。
 * 点村民 → 转身 + 心气泡 → 人物页；点建筑 → 弹出该区名单；点帐篷 / 星婆婆 → 走进占卜屋；点我的家 → 我的档案。
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import type { VillageModel } from './model';
import { currentSeason, type Season } from '@/lib/season';
import { play } from '@/audio/sound';
import { FORTUNE_TELLER } from '@/config/fortune-prompt';
import { slotAt, type Slot } from './sprites/daylight';
import { MAP_H, MAP_W, placement, type Placement } from './layout';
import { TILE } from './sprites/tile';
import { Scene, type Debug, type Perf } from './renderer/scene';
import { pokeActor } from './renderer/behavior';
import { AreaPanel } from './AreaPanel';
import styles from './VillageCanvas.module.css';

export interface VillageCanvasProps {
  model: VillageModel;
  /** 预览用：指定季节 / 时段，不传就跟真实时间 */
  season?: Season;
  slot?: Slot;
  next?: Slot;
  /** 显示倍数；不传按容器宽度取 1 或 2 */
  scale?: number;
  animate?: boolean;
  /** 冻结在某一逻辑帧（截图用） */
  frame?: number;
  debug?: Debug;
  /** 门口的区域名牌 */
  signs?: boolean;
  onPerf?: (p: Perf) => void;
  /** 首页：左右出血到页边 */
  bleed?: boolean;
}

declare global {
  interface Window {
    __villagePerf?: Perf;
  }
}

export function VillageCanvas({ model, season, slot, next, scale, animate = true, frame, debug, signs, onPerf, bleed }: VillageCanvasProps) {
  const nav = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const [clock, setClock] = useState(() => Date.now());
  const [autoScale, setAutoScale] = useState(1);
  const [panel, setPanel] = useState<{ placement: Placement; x: number; y: number } | null>(null);
  const [entering, setEntering] = useState(false);
  const dbg = useMemo<Debug>(() => ({ ...(debug ?? {}), signs: signs ?? debug?.signs }), [debug?.grid, debug?.areas, debug?.empty, debug?.hit, debug?.signs, signs]); // eslint-disable-line react-hooks/exhaustive-deps

  const s: Season = season ?? currentSeason(new Date(clock));
  const st = useMemo(() => (slot ? { slot, next, lightsOn: true } : slotAt(new Date(clock), s)), [slot, next, clock, s]);
  const sc = scale ?? autoScale;

  // 每 30 秒看一眼时间：时段边界会切表
  useEffect(() => {
    if (slot) return;
    const t = window.setInterval(() => setClock(Date.now()), 30000);
    return () => window.clearInterval(t);
  }, [slot]);

  // 自动倍数：容器够宽就 2×
  useEffect(() => {
    if (scale) return;
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setAutoScale(el.clientWidth >= MAP_W * 2 + 8 ? 2 : 1));
    ro.observe(el);
    return () => ro.disconnect();
  }, [scale]);

  // 场景实例
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    sceneRef.current = new Scene(ctx);
    return () => {
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setModel(model);
  }, [model]);

  // 绘制循环：8 fps 逻辑帧；页面不可见时停表
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const drawOnce = () => {
      scene.draw(s, st.slot, st.next, dbg);
      window.__villagePerf = scene.perf;
      onPerf?.(scene.perf);
    };
    if (frame !== undefined) {
      while (scene.frame < frame) scene.tick();
      drawOnce();
      return;
    }
    drawOnce();
    if (!animate) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      scene.tick();
      drawOnce();
    }, 125);
    return () => window.clearInterval(id);
  }, [s, st.slot, st.next, dbg, animate, frame, onPerf, model]);

  const toScene = (e: React.MouseEvent): [number, number] => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return [Math.floor(((e.clientX - rect.left) / rect.width) * MAP_W), Math.floor(((e.clientY - rect.top) / rect.height) * MAP_H)];
  };

  const enterTent = useCallback(() => {
    if (entering) return;
    play('pop');
    setEntering(true);
    const ov = overlayRef.current;
    const tent = placement('tent');
    const cx = (tent.x + tent.w / 2) * TILE, cy = (tent.y + tent.h / 2) * TILE + 8;
    let step = 0;
    const draw = () => {
      const ctx = ov?.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, MAP_W, MAP_H);
      const r = Math.max(0, 260 - step * 60);
      ctx.fillStyle = '#1a1f3f';
      // 像素光圈：矩形减去圆（用逐行扫描画）
      for (let y = 0; y < MAP_H; y++) {
        const dy = y + 0.5 - cy;
        const half = r * r - dy * dy;
        if (half <= 0) { ctx.fillRect(0, y, MAP_W, 1); continue; }
        const hw = Math.floor(Math.sqrt(half));
        const x0 = Math.floor(cx - hw), x1 = Math.ceil(cx + hw);
        if (x0 > 0) ctx.fillRect(0, y, x0, 1);
        if (x1 < MAP_W) ctx.fillRect(x1, y, MAP_W - x1, 1);
      }
      step++;
      if (step <= 5) window.setTimeout(draw, 80);
    };
    draw();
    window.setTimeout(() => nav('/fortune'), 520);
  }, [entering, nav]);

  const onClick = (e: React.MouseEvent) => {
    const scene = sceneRef.current;
    if (!scene || entering) return;
    if (panel) { setPanel(null); return; }
    const [x, y] = toScene(e);
    const hit = scene.hitTest(x, y);
    if (!hit) return;
    if (hit.kind === 'villager') {
      play('pop');
      pokeActor(hit.actor, scene.frame);
      scene.draw(s, st.slot, st.next, dbg);
      const id = hit.actor.v.person.id;
      window.setTimeout(() => nav(`/person/${id}`), 1400);
      return;
    }
    if (hit.kind === 'me') { nav(model.me ? `/person/${model.me.id}` : '/person/new?me=1'); return; }
    if (hit.kind === 'teller' || (hit.kind === 'building' && hit.placement.key === 'tent')) { enterTent(); return; }
    if (hit.kind === 'building') {
      play('pop');
      const p = hit.placement;
      setPanel({ placement: p, x: (p.x + p.w / 2) * TILE * sc, y: (p.y + p.h) * TILE * sc });
    }
  };

  const style = { '--vscale': sc } as CSSProperties;
  return (
    <div ref={wrapRef} className={`${styles.frame} ${bleed ? styles.bleed : ''}`} style={style} data-season={s} data-slot={st.slot}>
      <div className={styles.scroll}>
        <div className={styles.stage} style={{ width: MAP_W * sc, height: MAP_H * sc }}>
          <canvas ref={canvasRef} width={MAP_W} height={MAP_H} className={styles.canvas} style={{ width: MAP_W * sc, height: MAP_H * sc }} onClick={onClick} role="img" aria-label="人情村" />
          <canvas ref={overlayRef} width={MAP_W} height={MAP_H} className={`${styles.canvas} ${styles.overlay} ${entering ? styles.overlayOn : ''}`} style={{ width: MAP_W * sc, height: MAP_H * sc }} aria-hidden="true" />
          {entering && <div className={styles.enterText}>走进{FORTUNE_TELLER.name}的帐篷…</div>}
          {panel && (
            <AreaPanel
              placement={panel.placement}
              model={model}
              anchor={{ x: panel.x, y: panel.y }}
              bounds={{ w: MAP_W * sc, h: MAP_H * sc }}
              onClose={() => setPanel(null)}
              onEnterTent={enterTent}
            />
          )}
        </div>
      </div>
      {model.villagers.length === 0 && !model.me && <div className={styles.empty}>村里还没有人，点下面的按钮认识第一位村民吧</div>}
    </div>
  );
}
