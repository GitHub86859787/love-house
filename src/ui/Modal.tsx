import type { ReactNode } from 'react';
import { Panel } from './Panel';
import { Button } from './Button';
import styles from './Modal.module.css';

interface Props {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
  golden?: boolean;
}

/** 弹出面板：缩放弹出动画 */
export function Modal({ open, title, onClose, children, golden }: Props) {
  if (!open) return null;
  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <Panel golden={golden}>
          <div className={styles.header}>
            <h2>{title}</h2>
            <Button size="small" variant="ghost" iconName="close" aria-label="关闭" onClick={onClose} />
          </div>
          <div className={styles.body}>{children}</div>
        </Panel>
      </div>
    </div>
  );
}
