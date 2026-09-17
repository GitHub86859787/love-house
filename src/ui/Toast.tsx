import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

interface ToastItem {
  id: number;
  text: string;
  kind: 'info' | 'error' | 'achievement';
}

const ToastCtx = createContext<(text: string, kind?: ToastItem['kind']) => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

const DURATION: Record<ToastItem['kind'], number> = { info: 2000, error: 2600, achievement: 2600 };

/** 提示：排队一条条出，固定在页面顶部，不挡任何按钮 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const queue = useRef<ToastItem[]>([]);
  const [current, setCurrent] = useState<ToastItem | null>(null);
  const [leaving, setLeaving] = useState(false);

  const showNext = useCallback(() => {
    const next = queue.current.shift();
    setLeaving(false);
    setCurrent(next ?? null);
  }, []);

  const push = useCallback(
    (text: string, kind: ToastItem['kind'] = 'info') => {
      const item = { id: Date.now() + Math.random(), text, kind };
      queue.current.push(item);
      setCurrent((cur) => {
        if (cur) return cur;
        return queue.current.shift() ?? null;
      });
    },
    [],
  );

  useEffect(() => {
    if (!current) return;
    const t1 = window.setTimeout(() => setLeaving(true), DURATION[current.kind]);
    const t2 = window.setTimeout(showNext, DURATION[current.kind] + 160);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [current, showNext]);

  const value = useMemo(() => push, [push]);
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          top: 'calc(var(--safe-top) + 8px)',
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 300,
        }}
      >
        {current && (
          <div
            key={current.id}
            className="px-corner-sm"
            role="status"
            style={{
              background: current.kind === 'error' ? 'var(--danger)' : current.kind === 'achievement' ? 'var(--gold-dark)' : 'var(--wood-dark)',
              color: current.kind === 'achievement' ? 'var(--white)' : 'var(--paper)',
              border: `2px solid ${current.kind === 'achievement' ? 'var(--gold)' : 'var(--wood-light)'}`,
              padding: '6px 16px',
              fontSize: 'var(--fs-sm)',
              maxWidth: 'calc(100% - 32px)',
              animation: leaving ? 'fade-in 160ms steps(3) reverse both' : 'pop-in 160ms steps(4) both',
            }}
          >
            {current.text}
          </div>
        )}
      </div>
    </ToastCtx.Provider>
  );
}
