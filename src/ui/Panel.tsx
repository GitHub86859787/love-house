import type { CSSProperties, ReactNode } from 'react';
import styles from './Panel.module.css';

interface Props {
  children: ReactNode;
  title?: string;
  tight?: boolean;
  golden?: boolean;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}

/** 木框 + 羊皮纸面板；标题牌挂在外层，不受面板像素圆角裁切 */
export function Panel({ children, title, tight, golden, className, style, onClick }: Props) {
  const cls = [styles.panel, 'px-corner', tight ? styles.tight : '', golden ? styles.golden : '', title ? styles.withTitle : '', className ?? ''].join(' ');
  return (
    <div className={`${styles.wrap} ${title ? styles.wrapTitled : ''}`} style={style} onClick={onClick}>
      {title && <span className={`${styles.title} px-corner-sm ${golden ? styles.titleGolden : ''}`}>{title}</span>}
      <section className={cls}>{children}</section>
    </div>
  );
}

/** 面板内的浅色小块（次级区域） */
export function Inset({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={`${styles.paperDark} px-corner-sm ${className ?? ''}`} style={style}>
      {children}
    </div>
  );
}
