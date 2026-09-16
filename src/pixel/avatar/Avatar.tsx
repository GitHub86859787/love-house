import { useMemo } from 'react';
import type { AvatarConfig } from '@/db/types';
import { Sprite } from '../Sprite';
import { buildAvatar } from './build';

interface Props {
  config: AvatarConfig;
  scale?: number;
  ghost?: boolean;
  className?: string;
  alt?: string;
}

export function Avatar({ config, scale = 3, ghost = false, className, alt = '' }: Props) {
  const grid = useMemo(() => buildAvatar(config, ghost), [config, ghost]);
  return <Sprite grid={grid} scale={scale} className={className} alt={alt} />;
}
