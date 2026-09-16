import type { AvatarConfig } from '@/db/types';
import { Avatar } from '@/pixel/avatar/Avatar';
import { PART_GROUPS, PART_KEYS, type PartKey } from '@/pixel/avatar/parts';
import { randomAvatar } from '@/pixel/avatar/build';
import { Button } from '@/ui/Button';
import styles from './AvatarEditor.module.css';

interface Props {
  value: AvatarConfig;
  onChange: (next: AvatarConfig) => void;
}

const COLOR_KEY: Record<PartKey, keyof AvatarConfig> = {
  face: 'skinColor',
  hair: 'hairColor',
  eyes: 'eyeColor',
  shirt: 'shirtColor',
  accessory: 'accessoryColor',
};

/** 拼装式头像编辑器：每个部件左右切换形状 + 独立换色 */
export function AvatarEditor({ value, onChange }: Props) {
  const step = (key: PartKey, dir: 1 | -1) => {
    const n = PART_GROUPS[key].parts.length;
    const cur = value[key] as number;
    onChange({ ...value, [key]: (cur + dir + n) % n });
  };
  const setColor = (key: PartKey, color: string) => onChange({ ...value, [COLOR_KEY[key]]: color });

  return (
    <div className={styles.editor}>
      <div className={`${styles.preview} px-corner-sm`}>
        <Avatar config={value} scale={5} />
        <Button size="small" variant="ghost" onClick={() => onChange(randomAvatar())}>
          随机一个
        </Button>
      </div>
      {PART_KEYS.map((key) => {
        const group = PART_GROUPS[key];
        const idx = value[key] as number;
        const color = value[COLOR_KEY[key]] as string;
        return (
          <div key={key} className={styles.group}>
            <div className={styles.groupHead}>
              <span className={styles.groupLabel}>{group.label}</span>
              <Button size="small" variant="ghost" aria-label="上一个" onClick={() => step(key, -1)}>
                ◀
              </Button>
              <span className={`${styles.partName} px-corner-sm`}>
                {group.parts[idx]?.name} ({idx + 1}/{group.parts.length})
              </span>
              <Button size="small" variant="ghost" aria-label="下一个" onClick={() => step(key, 1)}>
                ▶
              </Button>
            </div>
            <div className={styles.swatches}>
              {group.colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`${group.colorLabel} ${c}`}
                  className={`${styles.swatch} px-corner-sm ${c === color ? styles.swatchActive : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(key, c)}
                />
              ))}
              <span className={`${styles.custom} px-corner-sm`} title="自定义颜色">
                <input type="color" value={color} onChange={(e) => setColor(key, e.target.value)} aria-label={`自定义${group.colorLabel}`} />
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
