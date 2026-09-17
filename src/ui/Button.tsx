import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';
import { icon, type IconName } from '@/pixel/sprites/icons';
import { Sprite } from '@/pixel/Sprite';
import { play } from '@/audio/sound';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'danger' | 'ghost';
  size?: 'default' | 'small';
  block?: boolean;
  iconName?: IconName;
  children?: ReactNode;
}

const ICON_COLOR: Record<NonNullable<Props['variant']>, string> = {
  default: '#f4e4bc',
  primary: '#3b2412',
  danger: '#fff8e7',
  ghost: '#3b2412',
};

/** 木框按钮，按下整体下沉 2px */
export function Button({ variant = 'default', size = 'default', block, iconName, children, className, type = 'button', onClick, ...rest }: Props) {
  const cls = [
    styles.btn,
    'px-corner',
    variant !== 'default' ? styles[variant] : '',
    size === 'small' ? styles.small : '',
    block ? styles.block : '',
    iconName && !children ? styles.iconOnly : '',
    className ?? '',
  ].join(' ');
  return (
    <button
      type={type}
      className={cls}
      onClick={(e) => {
        play('click');
        onClick?.(e);
      }}
      {...rest}
    >
      {iconName && <Sprite grid={icon(iconName, ICON_COLOR[variant])} scale={size === 'small' ? 1 : 2} />}
      {children}
    </button>
  );
}
