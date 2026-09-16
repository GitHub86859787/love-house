import { Page, PageHeader } from '@/app/Layout';
import { Panel } from '@/ui/Panel';

export function CollectionPage() {
  return (
    <Page>
      <PageHeader title="图鉴" />
      <Panel>
        <p style={{ color: 'var(--ink-soft)' }}>礼物图鉴、人物卡和成就将在阶段 3 开放。</p>
      </Panel>
    </Page>
  );
}
