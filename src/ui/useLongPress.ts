import { useCallback, useRef } from 'react';

/** 长按（默认 450ms）触发；移动或提前松开则取消。返回可直接展开到元素上的事件处理器 */
export function useLongPress(onLongPress: (e: { clientX: number; clientY: number }) => void, onCancel?: () => void, ms = 450) {
  const timer = useRef<number | null>(null);
  const fired = useRef(false);

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
      // 手指移动超过 8px 视为滚动，取消长按
      if (timer.current && (Math.abs(e.movementX) > 8 || Math.abs(e.movementY) > 8)) clear();
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    /** 长按触发后，阻止随后的 click */
    onClickCapture: (e: React.MouseEvent) => {
      if (fired.current) {
        e.stopPropagation();
        e.preventDefault();
      }
    },
  };
}
