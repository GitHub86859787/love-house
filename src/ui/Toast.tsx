import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface ToastItem {
  id: number;
  text: string;
  kind: 'info' | 'error';
}

const ToastCtx = createContext<(text: string, kind?: ToastItem['kind']) => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((text: string, kind: ToastItem['kind'] = 'info') => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs, { id, text, kind }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 2400);
  }, []);
  const value = useMemo(() => push, [push]);
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 'calc(var(--nav-height) + var(--safe-bottom) + 16px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          pointerEvents: 'none',
          zIndex: 200,
        }}
      >
        {items.map((t) => (
          <div
            key={t.id}
            className="px-corner-sm"
            style={{
              background: t.kind === 'error' ? 'var(--danger)' : 'var(--wood-dark)',
              color: 'var(--paper)',
              border: '2px solid var(--wood-light)',
              padding: '8px 16px',
              fontSize: 'var(--fs-sm)',
              animation: 'pop-in 160ms steps(4) both',
              maxWidth: 'calc(100% - 32px)',
            }}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
