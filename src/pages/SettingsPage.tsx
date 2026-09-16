import { useState } from 'react';
import { db } from '@/db/db';
import { Page, PageHeader } from '@/app/Layout';
import { Panel } from '@/ui/Panel';
import { Button } from '@/ui/Button';
import { Modal } from '@/ui/Modal';
import { useToast } from '@/ui/Toast';

export function SettingsPage() {
  const toast = useToast();
  const [confirmClear, setConfirmClear] = useState(false);

  const clearAll = async () => {
    await db.transaction('rw', db.tables, async () => {
      for (const t of db.tables) await t.clear();
    });
    setConfirmClear(false);
    toast('已清空全部数据');
  };

  return (
    <Page>
      <PageHeader title="设置" />

      <Panel title="数据">
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)', marginBottom: 12 }}>
          所有数据只保存在这台设备的浏览器里。导出 / 导入备份将在阶段 5 开放。
        </p>
        <Button variant="danger" block iconName="trash" onClick={() => setConfirmClear(true)}>
          清空全部数据
        </Button>
      </Panel>

      <Panel title="关于">
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)' }}>人情村 v{__APP_VERSION__} · 阶段 1 骨架</p>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)' }}>字体：缝合像素字体 Fusion Pixel（OFL 许可）</p>
      </Panel>

      <Modal open={confirmClear} title="确定清空？" onClose={() => setConfirmClear(false)}>
        <p>所有村民、互动、任务都会被删除，无法恢复。</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button block variant="ghost" onClick={() => setConfirmClear(false)}>
            取消
          </Button>
          <Button block variant="danger" onClick={clearAll}>
            清空
          </Button>
        </div>
      </Modal>
    </Page>
  );
}
