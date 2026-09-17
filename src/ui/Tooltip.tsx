import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import styles from './Tooltip.module.css';

export interface TooltipContent {
  name: string;
  sub?: string;
  reaction?: string;
  reactionColor?: string;
}

interface TipState extends TooltipContent {
  x: number;
  y: number;
}

const Ctx = createContext<{ show: (c: TooltipContent, x: number, y: number) => void; hide: () => void }>({ show: () => {}, hide: () => {} });

export function useTooltip() {
  return useContext(Ctx);
}

/** 原作风格的悬浮提示框：长按条目时出现，松手消失 */
export function TooltipProvider({ children }: { children: ReactNode }) {
  const [tip, setTip] = useState<TipState | null>(null);
  const show = useCallback((c: TooltipContent, x: number, y: number) => setTip({ ...c, x, y }), []);
  const hide = useCallback(() => setTip(null), []);
  const value = useMemo(() => ({ show, hide }), [show, hide]);

  let style: React.CSSProperties | undefined;
  if (tip) {
    const w = 220;
    const left = Math.max(8, Math.min(window.innerWidth - w - 8, tip.x - w / 2));
    const top = tip.y - 96 < 8 ? tip.y + 24 : tip.y - 96;
    style = { left, top, width: w };
  }
  return (
    <Ctx.Provider value={value}>
      {children}
      {tip && (
        <div className={`${styles.tip} px-corner`} style={style} role="tooltip">
          <div className={styles.name}>{tip.name}</div>
          {tip.sub && <div className={styles.sub}>{tip.sub}</div>}
          {tip.reaction && (
            <>
              <div className={styles.line} />
              <div className={styles.reaction} style={{ color: tip.reactionColor }}>
                「{tip.reaction}」
              </div>
            </>
          )}
        </div>
      )}
    </Ctx.Provider>
  );
}
