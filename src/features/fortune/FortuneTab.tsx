import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Person } from '@/db/types';
import { buildChart } from '@/fortune/chart';
import { FORTUNE_TELLER } from '@/config/fortune-prompt';
import { Button } from '@/ui/Button';
import { ChartCards, ChartSummaryRow } from './ChartCards';
import { BookTab } from './BookTab';
import styles from './FortuneTab.module.css';

/** 人物详情「占卜」Tab：排盘摘要 + 排盘细节（本地）+ 星婆婆命书 */
export function FortuneTab({ person }: { person: Person }) {
  const nav = useNavigate();
  const [details, setDetails] = useState(false);
  const chart = buildChart(person.birth);

  return (
    <div className={styles.wrap}>
      {chart.level === 0 ? (
        <div className={styles.head}>
          <div style={{ flex: 1, fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)' }}>{FORTUNE_TELLER.noBirth}</div>
          <Button size="small" variant="primary" onClick={() => nav(`/person/${person.id}/edit`)}>
            去填生日
          </Button>
        </div>
      ) : (
        <>
          <div className={styles.head}>
            <div style={{ flex: 1, fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)' }}>
              完整度 L{chart.level} · {chart.levelLabel}
              {chart.lunarInputNote && <div style={{ color: 'var(--danger)' }}>{chart.lunarInputNote}。如果 TA 过的是公历生日，去编辑里取消「农历」。</div>}
              {chart.level < 3 && <div>补充{chart.level === 1 ? '出生年份' : '时辰'}可以翻开更多章。</div>}
            </div>
          </div>
          <ChartSummaryRow chart={chart} />
          <Button size="small" variant="ghost" onClick={() => setDetails((v) => !v)}>
            {details ? '收起排盘细节' : '看排盘细节（本地算的，不用 AI）'}
          </Button>
          {details && <ChartCards chart={chart} />}
        </>
      )}
      <BookTab person={person} />
    </div>
  );
}
