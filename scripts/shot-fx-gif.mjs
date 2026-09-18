/**
 * 录 2 秒粒子动画 GIF：预览页 fx-live 块逐帧截图（frame=0..15，8 fps），拼成 shots/art-fx.gif
 * 用法：node scripts/shot-fx-gif.mjs  （需先 npx vite preview --port 4173）
 */
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import gifenc from 'gifenc';
const { GIFEncoder, quantize, applyPalette } = gifenc;
import { writeFileSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:4173/';
const FRAMES = 16;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1000, height: 800 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const gif = GIFEncoder();
for (let f = 0; f < FRAMES; f++) {
  await page.goto(`${BASE}#/preview?tab=light&scale=3&shot=1&anim=0&frame=${f}`);
  await page.reload();
  await page.waitForSelector('[data-shot="fx-live"] img');
  await page.waitForTimeout(150);
  const buf = await page.locator('[data-shot="fx-live"]').screenshot();
  const png = PNG.sync.read(buf);
  const rgba = new Uint8ClampedArray(png.data.buffer, png.data.byteOffset, png.data.length);
  const palette = quantize(rgba, 64);
  const index = applyPalette(rgba, palette);
  gif.writeFrame(index, png.width, png.height, { palette, delay: 125, repeat: 0 });
  console.log('frame', f);
}
gif.finish();
writeFileSync('shots/art-fx.gif', Buffer.from(gif.bytes()));
console.log('wrote art-fx.gif');
await browser.close();
