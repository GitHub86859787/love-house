import { useCallback, useRef } from 'react';

/**
 * 长按（默认 450ms）触发；移动或提前松开则取消。
 * 长按触发后，松手时浏览器仍会派发一次 click，这里把它吞掉，避免误开编辑。
 */
export function useLongPress(onLongPress: (e: { clientX: number; clientY: number }) => void, onCancel?: () => void, ms = 450) {
  const timer = useRef<number | null>(null);
  const fired = useRef(false);
  const suppressClick = useRef(false);

  const clear = useCallback(() => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const start = useCallback(
    (x: number, y: number) => {
      clear();
      fired.current = false;
      timer.current = window.setTimeout(() => {
        fired.current = true;
        onLongPress({ clientX: x, clientY: y });
      }, ms);
    },
    [clear, ms, onLongPress],
  );

  const end = useCallback(() => {
    clear();
    if (fired.current) {
      fired.current = false;
      suppressClick.current = true;
      window.setTimeout(() => (suppressClick.current = false), 400);
      onCancel?.();
    }
  }, [clear, onCancel]);

  return {
    onPointerDown: (e: React.PointerEvent) => start(e.clientX, e.clientY),
    onPointerUp: end,
    onPointerLeave: end,
    onPointerCancel: end,
    onPointerMove: (e: React.PointerEvent) => {
      if (e.buttons === 0) return;
      if (timer.current && (Math.abs(e.movementX) > 8 || Math.abs(e.movementY) > 8)) clear();
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onClickCapture: (e: React.MouseEvent) => {
      if (suppressClick.current || fired.current) {
        e.stopPropagation();
        e.preventDefault();
      }
    },
  };
}
