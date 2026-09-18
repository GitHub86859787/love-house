// 只跑资源生成脚本：npx vitest run --config vitest.gen.config.ts
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { environment: 'node', include: ['scripts/*.gen.ts'], testTimeout: 120000 },
});
