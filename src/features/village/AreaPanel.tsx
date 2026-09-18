/**
 * 点建筑弹出的像素小面板：该区村民（头像 + 名字 + 心）→ 人物页；牌坊 = 全部；我的家 → 我的档案；帐篷 → 进占卜屋。
 */
import { useNavigate } from 'react-router-dom';
import type { VillageModel } from './model';
import type { Placement } from './layout';
import { AREAS } from './areas';
import { Avatar } from '@/pixel/avatar/Avatar';
import { Sprite } from '@/pixel/Sprite';
import { HEART_SMALL } from '@/pixel/sprites/heart';
import { FORTUNE_TELLER } from '@/config/fortune-prompt';
import styles from './VillageCanvas.module.css';

interface Props {
  placement: Placement;
  model: VillageModel;
  anchor: { x: number; y: number };
  bounds: { w: number; h: number };
  onClose: () => void;
  onEnterTent: () => void;
}

const W = 200;

export function AreaPanel({ placement, model, anchor, bounds, onClose, onEnterTent }: Props) {
  const nav = useNavigate();
  const list = placement.area === 'all' ? model.villagers : model.villagers.filter((v) => v.area === placement.area);
  const left = Math.max(4, Math.min(bounds.w - W - 4, anchor.x - W / 2));
  const top = Math.min(bounds.h - 60, anchor.y + 6);
  const arrowX = Math.max(8, Math.min(W - 20, anchor.x - left - 4));
  const areaLabel = placement.area === 'all' ? '全村' : AREAS.find((a) => a.id === placement.area)?.label ?? placement.label;
  const go = (path: string) => {
    onClose();
    nav(path);
  };

  return (
    <div className={`${styles.panel} px-corner-sm`} style={{ left, top, ['--arrow-x' as string]: `${arrowX}px` }} role="dialog" aria-label={placement.label} onClick={(e) => e.stopPropagation()}>
      <div className={styles.panelHead}>
        <h3 className={styles.panelTitle}>{placement.label}</h3>
        <span className={styles.panelSub}>{placement.area === 'home' ? '我的档案' : placement.area === 'tent' ? FORTUNE_TELLER.name : `${areaLabel} · ${list.length} 人`}</span>
      </div>
      {placement.area === 'home' && (
        <div className={styles.row} onClick={() => go(model.me ? `/person/${model.me.id}` : '/person/new?me=1')}>
          {model.me ? <Avatar config={model.me.avatar} scale={1} /> : <span style={{ width: 24, textAlign: 'center' }}>?</span>}
          <span className={styles.rowName}>{model.me ? model.me.nickname || model.me.name : '还没建我的档案'}</span>
          <span className={styles.panelSub}>→</span>
        </div>
      )}
      {placement.area === 'tent' && (
        <button type="button" className={styles.panelBtn} onClick={onEnterTent}>
          走进帐篷找{FORTUNE_TELLER.name}
        </button>
      )}
      {placement.area !== 'home' && placement.area !== 'tent' && (
        <>
          {list.length === 0 && <div className={styles.panelEmpty}>{placement.key === 'teahouse' ? '茶馆里现在没人，广场上的朋友偶尔过来歇脚' : '这里还没有人'}</div>}
          {list.map((v) => (
            <div key={v.person.id} className={styles.row} onClick={() => go(`/person/${v.person.id}`)} role="link">
              <Avatar config={v.person.avatar} scale={1} ghost={v.ghost} />
              <span className={styles.rowName}>{v.person.nickname || v.person.name}</span>
              <span className={styles.hearts} aria-label={`${v.hearts} 心`}>
                {Array.from({ length: Math.min(v.hearts, 10) }).map((_, k) => (
                  <Sprite key={k} grid={HEART_SMALL} scale={1} />
                ))}
              </span>
            </div>
          ))}
          {placement.key === 'teahouse' && list.length > 0 && <div className={styles.panelEmpty}>朋友广场的人也常来喝茶</div>}
        </>
      )}
    </div>
  );
}
