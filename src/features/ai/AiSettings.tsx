import { useState } from 'react';
import { updateSettings, useSettings } from '@/db/settings';
import { AI_MODELS, DEFAULT_FORTUNE_MODEL, createClient, friendlyError, getApiKey, setApiKey } from '@/ai/client';
import { Panel, Inset } from '@/ui/Panel';
import { Button } from '@/ui/Button';
import { Field, Input, Select } from '@/ui/Field';
import { useToast } from '@/ui/Toast';

export function AiSettings({ Toggle }: { Toggle: (p: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) => React.ReactElement }) {
  const settings = useSettings();
  const toast = useToast();
  const [key, setKey] = useState(getApiKey());
  const [show, setShow] = useState(false);
  const [testing, setTesting] = useState(false);

  const saveKey = () => {
    setApiKey(key);
    window.dispatchEvent(new Event('renqing:apikey'));
    toast(key.trim() ? 'Key 已保存在本机' : 'Key 已清除');
  };

  const test = async () => {
    setApiKey(key);
    window.dispatchEvent(new Event('renqing:apikey'));
    const client = createClient();
    if (!client) {
      toast('先填 Key', 'error');
      return;
    }
    setTesting(true);
    try {
      const r = await client.messages.create({ model: settings.aiModel, max_tokens: 32, messages: [{ role: 'user', content: '回复"你好"两个字' }] });
      const text = r.content.find((b) => b.type === 'text');
      toast(`连上了：${text && text.type === 'text' ? text.text.slice(0, 20) : 'OK'}`);
    } catch (e) {
      toast(friendlyError(e), 'error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Panel title="AI 助手">
      <Toggle label="启用 AI 功能" hint="笔记整理、人物摘要、星婆婆写命书。关闭后 App 完全可用" checked={settings.aiEnabled} onChange={(v) => updateSettings({ aiEnabled: v })} />
      {settings.aiEnabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Anthropic API Key" hint="只保存在这台设备的浏览器里，只在你点按钮时发给 Anthropic，不经过任何中间服务器">
            <div style={{ display: 'flex', gap: 8 }}>
              <Input type={show ? 'text' : 'password'} value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-ant-…" autoComplete="off" />
              <Button variant="ghost" size="small" onClick={() => setShow((v) => !v)}>
                {show ? '隐藏' : '显示'}
              </Button>
            </div>
          </Field>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button block variant="primary" onClick={saveKey}>
              保存 Key
            </Button>
            <Button block variant="ghost" disabled={testing} onClick={test}>
              {testing ? '测试中…' : '测试连接'}
            </Button>
          </div>
          <Field label="笔记提取 / 摘要用的模型" hint="默认 Sonnet 5，量大、便宜、够用">
            <Select value={settings.aiModel} onChange={(e) => updateSettings({ aiModel: e.target.value })}>
              {AI_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="命书 / 合盘用的模型" hint="默认 Opus 5，一章一章写、写得细，输出不设上限">
            <Select value={settings.fortuneModel || DEFAULT_FORTUNE_MODEL} onChange={(e) => updateSettings({ fortuneModel: e.target.value })}>
              {AI_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
          <Inset>
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)' }}>
              AI 只做三件事：把笔记整理成喜好 / 性格 / 雷区候选（你逐条勾选后才写入）、生成「你眼中的 TA」摘要、星婆婆写命书。不做礼物或话题推荐。
            </p>
          </Inset>
        </div>
      )}
    </Panel>
  );
}
