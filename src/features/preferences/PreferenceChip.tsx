import type { Preference } from '@/db/types';
import { CATEGORIES, TIERS } from '@/config/reactions';
import { Chip } from '@/ui/Field';
import { useLongPress } from '@/ui/useLongPress';
import { useTooltip } from '@/ui/Tooltip';

interface Props {
  pref: Preference;
  onClick?: () => void;
}

/** 喜好条目：点击编辑，长按弹出提示框（名称 / 分类 / 反应档位） */
export function PreferenceChip({ pref, onClick }: Props) {
  const tip = useTooltip();
  const lp = useLongPress(
    (e) =>
      tip.show(
        {
          name: pref.name,
          sub: `${CATEGORIES[pref.category]} · ${TIERS[pref.tier].label}${pref.note ? ` · ${pref.note}` : ''}`,
          reaction: TIERS[pref.tier].reaction,
          reactionColor: TIERS[pref.tier].color,
        },
        e.clientX,
        e.clientY,
      ),
    () => tip.hide(),
  );
  return (
    <span {...lp} style={{ display: 'inline-flex', touchAction: 'pan-y' }}>
      <Chip onClick={onClick}>
        {pref.name}
        {pref.source === 'ai' && <span style={{ color: 'var(--ink-soft)', fontSize: 10 }}>AI</span>}
      </Chip>
    </span>
  );
}
