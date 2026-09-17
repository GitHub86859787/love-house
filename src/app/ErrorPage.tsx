import { useRouteError } from 'react-router-dom';
import { Page, PageHeader } from './Layout';
import { Panel } from '@/ui/Panel';
import { Button } from '@/ui/Button';

/** 路由错误页：分块加载失败 / 渲染出错时显示，代替 react-router 的默认黑屏 */
export function ErrorPage() {
  const err = useRouteError();
  const msg = err instanceof Error ? err.message : String(err ?? '');
  const chunk = /import|chunk|Failed to fetch|Loading/i.test(msg);
  return (
    <Page>
      <PageHeader title="这一页翻不开" subtitle={chunk ? '可能是刚更新了版本' : '出了点问题'} />
      <Panel>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)', marginBottom: 12 }}>
          {chunk ? 'App 刚更新过，旧页面还留着，刷新一次就好。你的数据都在本机，不会丢。' : '刷新一次试试。你的数据都在本机，不会丢。'}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button block variant="primary" onClick={() => window.location.reload()}>
            刷新
          </Button>
          <Button
            block
            variant="ghost"
            onClick={() => {
              window.location.hash = '#/';
              window.location.reload();
            }}
          >
            回村口
          </Button>
        </div>
        {msg && <p style={{ fontSize: 10, color: 'var(--ink-soft)', marginTop: 12, wordBreak: 'break-all' }}>{msg.slice(0, 200)}</p>}
      </Panel>
    </Page>
  );
}
