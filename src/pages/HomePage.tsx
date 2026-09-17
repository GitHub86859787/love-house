import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '@/db/db';
import { sortByAffection } from '@/db/persons';
import { useSettings } from '@/db/settings';
import { Page, PageHeader } from '@/app/Layout';
import { Panel, Inset } from '@/ui/Panel';
import { Button } from '@/ui/Button';
import { VillageScene } from '@/features/persons/VillageScene';
import { PersonCard } from '@/features/persons/PersonCard';
import { currentSeason } from '@/lib/season';
import { daysSinceContact, isStale } from '@/features/scoring/decay';

const SEASON_LABEL = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' } as const;

export function HomePage() {
  const nav = useNavigate();
  const settings = useSettings();
  const persons = useLiveQuery(() => db.persons.filter((p) => !p.isMe).toArray(), []);
  const sorted = sortByAffection(persons ?? []);
  const today = new Date();
  const dateText = `${today.getMonth() + 1}月${today.getDate()}日 · ${SEASON_LABEL[currentSeason()]}`;
  const stale = sorted.filter((p) => isStale(p, settings)).slice(0, 3);

  return (
    <Page>
      <PageHeader title="人情村" right={<span style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)' }}>{dateText}</span>} />

      <VillageScene persons={sorted} />

      {stale.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {stale.map((p) => (
            <div
              key={p.id}
              className="px-corner-sm"
              onClick={() => nav(`/person/${p.id}`)}
              style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)', background: 'var(--paper)', border: '2px solid var(--paper-deep)', padding: '4px 12px', cursor: 'pointer' }}
            >
              有一阵没找 {p.nickname || p.name} 了（{daysSinceContact(p)} 天）
            </div>
          ))}
        </div>
      )}

      <Panel title="今日任务板">
        <Inset>
          <p style={{ color: 'var(--ink-soft)', fontSize: 'var(--fs-sm)' }}>
            {sorted.length === 0 ? '任务板空空的。先认识几位村民，任务会自动出现。' : '任务系统将在阶段 3 开放。'}
          </p>
        </Inset>
      </Panel>

      <Button variant="primary" block iconName="plus" onClick={() => nav('/person/new')}>
        认识新村民
      </Button>

      {sorted.length > 0 && (
        <Panel title={`村民名册 · ${sorted.length} 人`} tight>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
            {sorted.map((p) => (
              <PersonCard key={p.id} person={p} />
            ))}
          </div>
        </Panel>
      )}
    </Page>
  );
}
