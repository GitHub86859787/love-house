import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export interface ToastItem {
  id: number;
  text: string;
  kind: 'info' | 'error' | 'achievement';
}

interface ToastState {
  current: ToastItem | null;
  leaving: boolean;
}

const PushCtx = createContext<(text: string, kind?: ToastItem['kind']) => void>(() => {});
const StateCtx = createContext<ToastState>({ current: null, leaving: false });

export function useToast() {
  return useContext(PushCtx);
}

/** 顶栏状态行用它来显示当前提示 */
export function useToastState() {
  return useContext(StateCtx);
}

const DURATION: Record<ToastItem['kind'], number> = { info: 2000, error: 2600, achievement: 2600 };

/**
 * 提示：排队一条条出。不再悬浮覆盖内容，而是显示在页面顶栏下方的状态行里（见 PageHeader）。
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const queue = useRef<ToastItem[]>([]);
  const [current, setCurrent] = useState<ToastItem | null>(null);
  const [leaving, setLeaving] = useState(false);

  const showNext = useCallback(() => {
    const next = queue.current.shift();
    setLeaving(false);
    setCurrent(next ?? null);
  }, []);

  const push = useCallback((text: string, kind: ToastItem['kind'] = 'info') => {
    const item = { id: Date.now() + Math.random(), text, kind };
    queue.current.push(item);
    setCurrent((cur) => cur ?? queue.current.shift() ?? null);
  }, []);

  useEffect(() => {
    if (!current) return;
    const t1 = window.setTimeout(() => setLeaving(true), DURATION[current.kind]);
    const t2 = window.setTimeout(showNext, DURATION[current.kind] + 160);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [current, showNext]);

  const state = useMemo(() => ({ current, leaving }), [current, leaving]);
  return (
    <PushCtx.Provider value={push}>
      <StateCtx.Provider value={state}>{children}</StateCtx.Provider>
    </PushCtx.Provider>
  );
}

/** 状态行里的提示内容（由 PageHeader 渲染） */
export function ToastLine({ fallback }: { fallback?: ReactNode }) {
  const { current, leaving } = useToastState();
  if (!current) return <>{fallback}</>;
  const color = current.kind === 'error' ? 'var(--danger)' : current.kind === 'achievement' ? 'var(--gold-dark)' : 'var(--ink)';
  return (
    <span
      key={current.id}
      role="status"
      style={{
        color,
        fontWeight: current.kind === 'achievement' ? 'bold' : undefined,
        animation: leaving ? 'fade-in 160ms steps(3) reverse both' : 'pop-in 160ms steps(4) both',
        display: 'inline-block',
        maxWidth: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {current.text}
    </span>
  );
}
