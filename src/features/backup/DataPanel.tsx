import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useLocation } from 'react-router-dom';
import { db } from '@/db/db';
import { useSettings } from '@/db/settings';
import { Panel, Inset } from '@/ui/Panel';
import { Button } from '@/ui/Button';
import { Modal } from '@/ui/Modal';
import { Input } from '@/ui/Field';
import { useToast } from '@/ui/Toast';
import { play } from '@/audio/sound';
import { formatRelative } from '@/lib/date';
import { applyBackup, applyMe, exportBackup, exportMe, importSummary, parseImport, type ParsedImport } from './backup';
import { villageToMarkdown } from './markdown';
import { buildIcs, icsEventCount } from './ics';
import { dateStamp, isIOS, pickFile, saveFile } from './file';
import { BACKUP_REMIND_DAYS } from '@/features/quests/rules';

/** 设置页「数据」面板：导出 / 导入 / 日历 / 清空 */
export function DataPanel() {
  const toast = useToast();
  const settings = useSettings();
  const loc = useLocation();
  const counts = useLiveQuery(async () => ({ persons: await db.persons.count(), interactions: await db.interactions.count() }), []);
  const [pending, setPending] = useState<ParsedImport | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearText, setClearText] = useState('');

  // 任务板「该备份了」跳过来时滚到这里
  useEffect(() => {
    if (loc.hash === '#data') document.getElementById('data-panel')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [loc.hash]);

  const run = async (label: string, fn: () => Promise<string | void>) => {
    setBusy(label);
    try {
      const msg = await fn();
      play('done');
      toast(msg || `${label}好了`);
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') toast('取消了');
      else toast(e instanceof Error ? e.message : `${label}失败`, 'error');
    } finally {
      setBusy(null);
    }
  };

  const doExport = () => run('导出', async () => {
    await exportBackup();
    return isIOS() ? '已交给系统分享，存到「文件」或隔空投送到电脑' : '备份已下载';
  });
  const doExportMe = () => run('导出我的档案', async () => {
    const ok = await exportMe();
    if (!ok) throw new Error('还没有「我的档案」');
  });
  const doMarkdown = () => run('导出 Markdown', async () => {
    const [persons, interactions] = await Promise.all([db.persons.toArray(), db.interactions.toArray()]);
    const md = villageToMarkdown(persons, interactions);
    await saveFile(new Blob([md], { type: 'text/markdown' }), `人情村-${dateStamp()}.md`);
  });
  const doIcs = () => run('生成日历', async () => {
    const [persons, quests] = await Promise.all([db.persons.toArray(), db.quests.toArray()]);
    const ics = buildIcs(persons, quests);
    const n = icsEventCount(ics);
    if (n === 0) throw new Error('还没有生日或提醒可以加进日历');
    await saveFile(new Blob([ics], { type: 'text/calendar' }), `人情村日历-${dateStamp()}.ics`);
    return `${n} 条日程已生成，打开文件即可加进手机日历`;
  });
  const doPick = async () => {
    const file = await pickFile('application/json,.json');
    if (!file) return;
    try {
      const parsed = parseImport(await file.text());
      setPending(parsed);
    } catch (e) {
      toast(e instanceof Error ? e.message : '读不了这个文件', 'error');
    }
  };
  const doImport = () => {
    const p = pending;
    if (!p) return;
    setPending(null);
    run('导入', async () => {
      if (p.kind === 'backup') {
        // 覆盖前先把现在的数据导出一份，用户取消分享就不导入
        if ((counts?.persons ?? 0) > 0) await exportBackup({ silentStamp: true });
        await applyBackup(p.data);
        return '导入完成，已覆盖为备份里的数据';
      }
      await applyMe(p.data);
      return '「我的档案」已导入';
    });
  };
  const clearAll = async () => {
    if (clearText !== '清空') return;
    await db.transaction('rw', db.tables, async () => {
      for (const t of db.tables) await t.clear();
    });
    setConfirmClear(false);
    setClearText('');
    toast('已清空全部数据');
  };

  const lastText = settings.lastExportAt ? `上次导出：${formatRelative(settings.lastExportAt)}` : '还没导出过';

  return (
    <Panel title="数据">
      <div id="data-panel" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)' }}>
          所有数据只在这台设备的浏览器里，换手机、清缓存都会丢。{lastText}
          {counts ? ` · ${counts.persons} 人 · ${counts.interactions} 条互动` : ''}。超过 {BACKUP_REMIND_DAYS} 天没导出，任务板会提醒。
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Button variant="primary" block disabled={Boolean(busy)} onClick={doExport}>
            导出备份 JSON
          </Button>
          <Button variant="ghost" block disabled={Boolean(busy)} onClick={doPick}>
            导入备份
          </Button>
          <Button variant="ghost" block disabled={Boolean(busy)} onClick={doExportMe}>
            只导出我的档案
          </Button>
          <Button variant="ghost" block disabled={Boolean(busy)} onClick={doMarkdown}>
            导出 Markdown
          </Button>
        </div>
        <Inset>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ flex: 1, fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)' }}>生日和自定义提醒生成 .ics，打开就能加进手机日历（公历生日按年重复，农历生日逐年列出 10 年）</span>
            <Button size="small" variant="primary" disabled={Boolean(busy)} onClick={doIcs}>
              生成日历
            </Button>
          </div>
        </Inset>
        <p style={{ fontSize: 10, color: 'var(--ink-soft)' }}>备份不含 API Key。导入会整体覆盖现有数据，导入前会先自动导出一份当前数据。</p>
        <Button variant="danger" block iconName="trash" onClick={() => setConfirmClear(true)}>
          清空全部数据
        </Button>
      </div>

      <Modal open={Boolean(pending)} title={pending?.kind === 'me' ? '导入我的档案？' : '导入备份？'} onClose={() => setPending(null)}>
        {pending && (
          <>
            <p style={{ fontSize: 'var(--fs-sm)' }}>{importSummary(pending)}</p>
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--danger)' }}>
              {pending.kind === 'backup' ? '会覆盖现在的全部数据。确认后先自动导出一份当前数据，再导入。' : '会替换现有的「我的档案」（其他村民不动）。'}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button block variant="ghost" onClick={() => setPending(null)}>
                取消
              </Button>
              <Button block variant="primary" onClick={doImport}>
                {pending.kind === 'backup' ? '先备份，再导入' : '导入'}
              </Button>
            </div>
          </>
        )}
      </Modal>

      <Modal open={confirmClear} title="确定清空？" onClose={() => setConfirmClear(false)}>
        <p>所有村民、互动、任务、设置都会被删除，无法恢复。建议先导出备份。输入「清空」两个字确认：</p>
        <Input value={clearText} onChange={(e) => setClearText(e.target.value)} placeholder="清空" />
        <div style={{ display: 'flex', gap: 8 }}>
          <Button block variant="ghost" onClick={() => setConfirmClear(false)}>
            取消
          </Button>
          <Button block variant="danger" onClick={clearAll} disabled={clearText !== '清空'}>
            清空
          </Button>
        </div>
      </Modal>
    </Panel>
  );
}
