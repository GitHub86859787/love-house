/**
 * Anthropic API 客户端：Key 只存本机 localStorage，浏览器直连，不经任何转发层。
 * 所有 AI 功能都通过这里拿客户端，AI 关闭或没有 Key 时返回 null。
 */
import type Anthropic from '@anthropic-ai/sdk';

export type AnthropicClient = Anthropic;

const KEY_STORAGE = 'renqing.apiKey';

export const AI_MODELS = [
  { id: 'claude-sonnet-5', label: 'Sonnet 5（性价比高）', maxOutput: 128000 },
  { id: 'claude-opus-5', label: 'Opus 5（更强，更贵）', maxOutput: 128000 },
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5（最快最便宜）', maxOutput: 64000 },
] as const;

export type AiModelId = (typeof AI_MODELS)[number]['id'];
/** 笔记提取 / 摘要默认 */
export const DEFAULT_MODEL: AiModelId = 'claude-sonnet-5';
/** 命书 / 合盘默认 */
export const DEFAULT_FORTUNE_MODEL: AiModelId = 'claude-opus-5';

export function maxOutputOf(model: string): number {
  return AI_MODELS.find((m) => m.id === model)?.maxOutput ?? 64000;
}

export function getApiKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}

export function setApiKey(key: string): void {
  try {
    if (key.trim()) localStorage.setItem(KEY_STORAGE, key.trim());
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    // 私密模式等情况下写不进去，静默
  }
}

let sdkPromise: Promise<typeof import('@anthropic-ai/sdk')> | null = null;
/** SDK 按需加载（约 300KB），第一次用到 AI 时才下载 */
export function loadSdk(): Promise<typeof import('@anthropic-ai/sdk')> {
  sdkPromise ??= import('@anthropic-ai/sdk');
  return sdkPromise;
}
export async function loadZodFormat(): Promise<typeof import('@anthropic-ai/sdk/helpers/zod').zodOutputFormat> {
  const m = await import('@anthropic-ai/sdk/helpers/zod');
  return m.zodOutputFormat;
}

export async function createClient(): Promise<Anthropic | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  const { default: Sdk } = await loadSdk();
  // 浏览器直连：Key 只在用户自己的设备上，已在设计中确认接受
  return new Sdk({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 1 });
}

/** 粗略估算 token 数：中文约 1 字 1 token 多一点，英文约 4 字符 1 token */
export function estimateTokens(text: string): number {
  let cjk = 0;
  let other = 0;
  for (const ch of text) {
    if (/[㐀-鿿豈-﫿]/.test(ch)) cjk++;
    else other++;
  }
  return Math.round(cjk * 1.3 + other / 3.5);
}

/** 把 SDK 错误翻译成友好的中文提示（不依赖 SDK 类，按 status / name 判断） */
export function friendlyError(err: unknown): string {
  const e = err as { status?: number; name?: string; message?: string } | null;
  const status = e && typeof e.status === 'number' ? e.status : undefined;
  const name = e?.name ?? '';
  const msg = e?.message ?? '';
  if (status === 401 || name === 'AuthenticationError') return 'API Key 不对或已失效，去设置里检查一下';
  if (status === 403 || name === 'PermissionDeniedError') return '这个 Key 没有权限调用该模型';
  if (status === 429 || name === 'RateLimitError') return '请求太频繁了，歇一会儿再试';
  if (status === 400 || name === 'BadRequestError') return `请求被拒绝：${msg.slice(0, 80)}`;
  if (name === 'APIConnectionError' || name === 'APIConnectionTimeoutError') return '连不上服务器，检查一下网络';
  if (status !== undefined) return `服务出了点问题（${status}），稍后再试`;
  if (err instanceof Error && /refusal/.test(msg)) return 'AI 拒绝了这次请求，换个说法再试';
  if (err instanceof Error && /parse|schema|JSON|Unexpected/i.test(msg)) return 'AI 返回的格式不对，再试一次';
  if (err instanceof Error && /no api key/.test(msg)) return '先去设置里填上 API Key';
  if (err instanceof Error && msg) return msg.slice(0, 80);
  return '出了点问题，再试一次';
}
