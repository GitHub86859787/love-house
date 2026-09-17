import { useEffect, useRef, useState } from 'react';
import { play } from '@/audio/sound';
import styles from './DialogueBox.module.css';

interface Props {
  speaker: string;
  lines: string[];
  /** 全部说完 */
  onDone?: () => void;
  /** 每次重新开始的 key */
  resetKey?: string | number;
}

/** 原作式对话框：逐字显示，点一下跳到整段 / 下一段 */
export function DialogueBox({ speaker, lines, onDone, resetKey }: Props) {
  const [idx, setIdx] = useState(0);
  const [shown, setShown] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const timer = useRef<number | null>(null);
  const line = lines[idx] ?? '';
  const done = idx >= lines.length - 1 && shown >= line.length;

  useEffect(() => {
    setIdx(0);
    setShown(0);
    setShowAll(false);
  }, [resetKey, lines]);

  useEffect(() => {
    if (showAll) return;
    if (shown >= line.length) return;
    timer.current = window.setTimeout(() => setShown((n) => n + 1), 28);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [shown, line, showAll]);

  const tap = () => {
    if (showAll) return;
    if (shown < line.length) {
      setShown(line.length);
      return;
    }
    if (idx < lines.length - 1) {
      play('click');
      setIdx(idx + 1);
      setShown(0);
    } else {
      onDone?.();
    }
  };

  if (showAll) {
    return (
      <div className={`${styles.box} px-corner`} style={{ cursor: 'default', userSelect: 'text' }}>
        <span className={`${styles.speaker} px-corner-sm`}>{speaker}</span>
        <div className={styles.text} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lines.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.box} px-corner`} onClick={tap} role="button">
      <span className={`${styles.speaker} px-corner-sm`}>{speaker}</span>
      <div className={styles.text}>
        {line.slice(0, shown)}
        {shown < line.length && <span className={styles.cursor} />}
      </div>
      <span className={styles.progress}>
        {idx + 1}/{lines.length}
        {lines.length > 1 && (
          <>
            {' · '}
            <span
              onClick={(e) => {
                e.stopPropagation();
                setShowAll(true);
                onDone?.();
              }}
              style={{ textDecoration: 'underline' }}
            >
              全部显示
            </span>
          </>
        )}
      </span>
      {shown >= line.length && <span className={styles.next}>{done ? '■' : '▼'}</span>}
    </div>
  );
}
