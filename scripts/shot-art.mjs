// 美术阶段截图：色卡一张、图块表 1× 一张、3× 一张、四季各一张（3×）。用法：node scripts/shot-art.mjs ground
import { chromium } from 'playwright';
const cat = process.argv[2] ?? 'ground';
const BASE = process.env.SHOT_BASE ?? 'http://localhost:4173/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
const ctx = await browser.newContext({ viewport: { width: cat === 'buildings' || cat === 'chars' ? 1700 : 760, height: 1200 }, deviceScaleFactor: 1, locale: 'zh-CN' });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('pageerror', e.message));
const shotEl = async (sel, file) => {
  await page.waitForSelector(sel);
  await page.waitForTimeout(300);
  await page.locator(sel).screenshot({ path: `shots/${file}` });
  console.log('wrote', file);
};
if (cat === 'chars') {
  await page.goto(`${BASE}#/preview?tab=chars&scale=3&shot=1&anim=0`);
  await page.reload();
  await page.waitForSelector('[data-shot="special"]');
  await page.waitForTimeout(400);
  for (const k of ['ident', 'match', 'anim', 'special']) {
    await page.locator(`[data-shot="${k}"]`).screenshot({ path: `shots/art-c-${k}.png` });
    console.log('wrote', `art-c-${k}.png`);
  }
  await browser.close();
  process.exit(0);
}
if (cat === 'buildings') {
  await page.goto(`${BASE}#/preview?tab=buildings&scale=3&shot=1&anim=0`);
  await page.reload();
  await page.waitForSelector('[data-shot="lineup"]');
  await page.waitForTimeout(400);
  const blocks = await page.locator('[data-shot^="b-"]').all();
  for (const el of blocks) {
    const key = (await el.getAttribute('data-shot')).slice(2);
    await el.screenshot({ path: `shots/art-b-${key}.png` });
    console.log('wrote', `art-b-${key}.png`);
  }
  await page.locator('[data-shot="lineup"]').screenshot({ path: 'shots/art-b-lineup.png' });
  console.log('wrote art-b-lineup.png');
  await page.locator('[data-shot="grid"]').screenshot({ path: 'shots/art-b-grid.png' });
  console.log('wrote art-b-grid.png');
  await browser.close();
  process.exit(0);
}
await page.goto(`${BASE}#/preview?tab=palette&shot=1`);
await shotEl('[data-shot="palette"]', `art-palette.png`);
await page.goto(`${BASE}#/preview?tab=${cat}&season=spring&scale=1&shot=1&anim=0`);
await page.reload();
await shotEl('[data-shot="sheet"]', `art-${cat}-1x.png`);
for (const s of ['spring', 'summer', 'autumn', 'winter']) {
  await page.goto(`${BASE}#/preview?tab=${cat}&season=${s}&scale=3&shot=1&anim=0`);
  await page.reload();
  await shotEl('[data-shot="sheet"]', `art-${cat}-3x-${s}.png`);
  if (s === 'spring' && (await page.locator('[data-shot="extra"]').count())) await shotEl('[data-shot="extra"]', `art-${cat}-extra.png`);
}
await browser.close();
