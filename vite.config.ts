import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// GitHub Pages 部署时通过 BASE_PATH=/love-house/ 注入；本地开发为 /
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.1.0') },
  base,
  build: {
    rollupOptions: {
      output: {
        // 按库拆块：SDK / 天文库只在用到时下载；react / dexie / 农历 单独成块便于缓存
        codeSplitting: {
          groups: [
            { name: 'vite', test: /\0vite\// },
            { name: 'lunar', test: /node_modules[\\/]lunar-typescript/ },
            { name: 'astronomy', test: /node_modules[\\/]astronomy-engine/ },
            { name: 'anthropic', test: /node_modules[\\/](@anthropic-ai|zod)[\\/]/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/ },
            { name: 'dexie', test: /node_modules[\\/]dexie/ },
          ],
        },
      },
    },
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg}'],
        globIgnores: ['**/splash/**'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      manifest: {
        name: '人情村',
        short_name: '人情村',
        description: '像素风人际关系养成',
        lang: 'zh-CN',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        background_color: '#F4E4BC',
        theme_color: '#5C3A1E',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
