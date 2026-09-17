import { useEffect, useState } from 'react';
import { useSettings } from '@/db/settings';
import { getApiKey, type AiModelId } from '@/ai/client';

/** AI 是否可用（开关打开且填了 Key）+ 当前模型 */
export function useAi(): { available: boolean; enabled: boolean; hasKey: boolean; model: AiModelId } {
  const settings = useSettings();
  const [hasKey, setHasKey] = useState(() => Boolean(getApiKey()));
  useEffect(() => {
    const onStorage = () => setHasKey(Boolean(getApiKey()));
    window.addEventListener('storage', onStorage);
    window.addEventListener('renqing:apikey', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('renqing:apikey', onStorage);
    };
  }, []);
  return { available: settings.aiEnabled && hasKey, enabled: settings.aiEnabled, hasKey, model: settings.aiModel as AiModelId };
}
