// 美术阶段截图：色卡一张、图块表 1× 一张、3× 一张、四季各一张（3×）。用法：node scripts/shot-art.mjs ground
import { chromium } from 'playwright';
const cat = process.argv[2] ?? 'ground';
const BASE = process.env.SHOT_BASE ?? 'http://localhost:4173/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
const ctx = await browser.newContext({ viewport: { width: 760, height: 1200 }, deviceScaleFactor: 1, locale: 'zh-CN' });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('pageerror', e.message));
const shotEl = async (sel, file) => {
  await page.waitForSelector(sel);
  await page.waitForTimeout(300);
  await page.locator(sel).screenshot({ path: `shots/${file}` });
  console.log('wrote', file);
};
await page.goto(`${BASE}#/preview?tab=palette&shot=1`);
await shotEl('[data-shot="palette"]', `art-palette.png`);
await page.goto(`${BASE}#/preview?tab=${cat}&season=spring&scale=1&shot=1&anim=0`);
await page.reload();
await shotEl('[data-shot="sheet"]', `art-${cat}-1x.png`);
for (const s of ['spring', 'summer', 'autumn', 'winter']) {
  await page.goto(`${BASE}#/preview?tab=${cat}&season=${s}&scale=3&shot=1&anim=0`);
  await page.reload();
  await shotEl('[data-shot="sheet"]', `art-${cat}-3x-${s}.png`);
  if (s === 'spring' && (await page.locator('[data-shot="anim"]').count())) await shotEl('[data-shot="anim"]', `art-${cat}-anim.png`);
}
await browser.close();
