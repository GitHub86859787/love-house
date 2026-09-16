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

截图（需本机有 Chromium）：先 `npx vite preview --port 4173`，再 `node scripts/shots.mjs`，输出到 `shots/`。

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
  features/   村庄场景、人物卡、头像编辑器
  pages/      村口 / 人物详情 / 编辑 / 图鉴 / 设置
```

字体：缝合像素字体 Fusion Pixel 12px（OFL-1.1），文件在 `src/assets/fonts/`。
