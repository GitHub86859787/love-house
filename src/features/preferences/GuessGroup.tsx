import type { Person } from '@/db/types';
import { CATEGORIES, TIERS } from '@/config/reactions';
import { resolveGuess } from '@/db/fortune';
import { Inset } from '@/ui/Panel';
import { TierIcon } from '@/ui/TierIcon';
import { Sprite } from '@/pixel/Sprite';
import { icon } from '@/pixel/sprites/icons';
import { play } from '@/audio/sound';

/** 喜好 Tab 里的「占卜师的猜测」分组：确认 → 正式条目；不准 → 删除并记入 rejected */
export function GuessGroup({ person }: { person: Person }) {
  const guesses = person.preferences.filter((p) => p.source === 'fortune');
  if (guesses.length === 0) return null;
  return (
    <Inset style={{ borderStyle: 'dashed', borderColor: '#9a6fd0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-sm)', color: '#6b3fa0' }}>
        <Sprite grid={icon('crystal', '#6b3fa0')} scale={1} />
        星婆婆的猜测 · {guesses.length}
        <span style={{ color: 'var(--ink-soft)', flex: 1 }}>不计分，送礼时不匹配</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
        {guesses.map((g) => (
          <div key={g.id} className="px-corner-sm" style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 8px', background: 'var(--white)', border: '2px dashed #9a6fd0', fontSize: 'var(--fs-sm)' }}>
            <TierIcon tier={g.tier} scale={1} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div>
                {g.name} <span style={{ color: 'var(--ink-soft)', fontSize: 10 }}>{CATEGORIES[g.category]} · {TIERS[g.tier].label}</span>
              </div>
              {g.note && <div style={{ fontSize: 10, color: 'var(--ink-soft)' }}>{g.note}</div>}
            </div>
            <button type="button" className="px-corner-sm" style={{ height: 28, padding: '0 8px', background: 'var(--grass)', color: 'var(--white)', border: '2px solid var(--grass-dark)', fontSize: 'var(--fs-sm)', cursor: 'pointer' }} onClick={() => { play('done'); resolveGuess(person, g.id, 'confirm'); }}>
              确认
            </button>
            <button type="button" className="px-corner-sm" style={{ height: 28, padding: '0 8px', background: 'var(--paper-dark)', border: '2px solid var(--wood-light)', fontSize: 'var(--fs-sm)', cursor: 'pointer' }} onClick={() => { play('click'); resolveGuess(person, g.id, 'miss'); }}>
              不准
            </button>
          </div>
        ))}
      </div>
    </Inset>
  );
}
