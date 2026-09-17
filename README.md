# 人情村

像素风人际关系养成 App（PWA）。把《星露谷物语》的 NPC 好感度系统搬到现实：记录身边每个人的喜好、性格、忌讳和互动，用"心数"表示亲密度。数据只存本机，不需要账号。

## 开发

```bash
npm install
npm run dev        # 本地开发
npm run build      # 产物在 dist/
npm test           # 纯逻辑单元测试（vitest）
npm run typecheck
```

截图（需本机有 Chromium）：先 `npx vite preview --port 4173`，再 `node scripts/shots.mjs`（阶段 2–5）、`node scripts/shot-book.mjs`（命书）、`node scripts/shot-phase6.mjs`（阶段 6），输出到 `shots/`。

图标与 iOS 启动画面由 `node scripts/gen-icons.mjs` / `node scripts/gen-splash.mjs` 生成到 `public/`。

## 部署

推送到 `main` 分支后，GitHub Actions 自动构建并发布到 GitHub Pages（仓库 Settings → Pages → Source 选 **GitHub Actions**）。
Pages 子路径通过 `BASE_PATH` 注入，路由用 Hash 模式，刷新不会 404。

## 目录

```
src/
  config/     数值规则、关系类型、五档反应文案、里程碑（都是可改的配置）
  db/         Dexie 表结构与类型、人物 CRUD
  pixel/      像素画引擎、精灵（心 / 房子 / 图标）、拼装头像
  ui/         木框面板、按钮、心条、弹窗、表单控件
  features/   村庄场景、人物卡、头像编辑器、任务板、里程碑、图鉴、AI、占卜、备份导出、年度回顾、新手教程
  features/village/  分区映射层（关系类型 → 区域）与场景数据模型，场景组件只消费它
  ai/         Anthropic API 客户端（Key 存 localStorage，浏览器直连）、笔记提取、人物摘要
  fortune/    占卜师：本地排盘（星座 / 生肖 / 灵数 / 八字 / 五行 / 本命盘）、星婆婆命书（分章流式生成、后台任务）
  pages/      村口 / 人物详情 / 编辑 / 记一笔 / 图鉴 / 占卜屋 / 设置 / 年度回顾 / 排盘自检
```

AI 与占卜的提示词在 `src/config/ai-prompts.ts`、`src/config/fortune-prompt.ts` 与 `src/config/fortune-book.ts`；改了命书提示词请把 `FORTUNE_PROMPT_VERSION` +1，各章会标为过期。

## 包体

首屏只带村口 / 人物 / 记一笔用到的代码（react、dexie、农历库）；Anthropic SDK + zod、astronomy-engine、设置 / 图鉴 / 占卜屋 / 年度回顾 / 排盘自检页面都按需加载（`vite.config.ts` 里的 `codeSplitting` 分组 + `React.lazy`）。本命盘算法通过 `registerNatal` 注册进 `buildChart`，只有占卜相关页面导入 `fortune/natal.ts`。

## 备份

设置 → 数据：导出 / 导入 JSON（导入前自动导出一份）、单独导出「我的档案」、Markdown、生日与提醒的 .ics。备份不含 API Key。超过 30 天没导出，任务板会挂一条提醒。

字体：缝合像素字体 Fusion Pixel 12px（OFL-1.1），文件在 `src/assets/fonts/`。
