/**
 * Anthropic API 客户端：Key 只存本机 localStorage，浏览器直连，不经任何转发层。
 * 所有 AI 功能都通过这里拿客户端，AI 关闭或没有 Key 时返回 null。
 */
import Anthropic from '@anthropic-ai/sdk';

const KEY_STORAGE = 'renqing.apiKey';

export const AI_MODELS = [
  { id: 'claude-sonnet-5', label: 'Sonnet 5（默认，性价比高）' },
  { id: 'claude-opus-5', label: 'Opus 5（更强，更贵）' },
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5（最快最便宜）' },
] as const;

export type AiModelId = (typeof AI_MODELS)[number]['id'];
export const DEFAULT_MODEL: AiModelId = 'claude-sonnet-5';

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

export function createClient(): Anthropic | null {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  // 浏览器直连：Key 只在用户自己的设备上，已在设计中确认接受
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 1 });
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

/** 把 SDK 错误翻译成友好的中文提示 */
export function friendlyError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return 'API Key 不对或已失效，去设置里检查一下';
  if (err instanceof Anthropic.PermissionDeniedError) return '这个 Key 没有权限调用该模型';
  if (err instanceof Anthropic.RateLimitError) return '请求太频繁了，歇一会儿再试';
  if (err instanceof Anthropic.BadRequestError) return `请求被拒绝：${err.message.slice(0, 80)}`;
  if (err instanceof Anthropic.APIConnectionError) return '连不上服务器，检查一下网络';
  if (err instanceof Anthropic.APIError) return `服务出了点问题（${err.status ?? '?'}），稍后再试`;
  if (err instanceof Error && /parse|schema|JSON/i.test(err.message)) return 'AI 返回的格式不对，再试一次';
  return '出了点问题，再试一次';
}
