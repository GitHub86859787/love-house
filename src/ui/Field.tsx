import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import styles from './Field.module.css';

export function Field({ label, hint, children }: { label?: string; hint?: string; children: ReactNode }) {
  return (
    <label className={styles.field}>
      {label && <span className={styles.label}>{label}</span>}
      {children}
      {hint && <span className={styles.hint}>{hint}</span>}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${styles.control} px-corner-sm ${props.className ?? ''}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${styles.control} px-corner-sm ${props.className ?? ''}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${styles.control} px-corner-sm ${props.className ?? ''}`} />;
}

export function Row({ children }: { children: ReactNode }) {
  return <div className={styles.row}>{children}</div>;
}

export function Chips({ children }: { children: ReactNode }) {
  return <div className={styles.chips}>{children}</div>;
}

interface ChipProps {
  children: ReactNode;
  active?: boolean;
  danger?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
}

export function Chip({ children, active, danger, onClick, onRemove }: ChipProps) {
  const cls = [styles.chip, 'px-corner-sm', active ? styles.chipActive : '', danger ? styles.chipDanger : ''].join(' ');
  return (
    <span className={cls} onClick={onClick} role={onClick ? 'button' : undefined}>
      {children}
      {onRemove && (
        <span
          className={styles.chipRemove}
          role="button"
          aria-label="删除"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          ✕
        </span>
      )}
    </span>
  );
}
