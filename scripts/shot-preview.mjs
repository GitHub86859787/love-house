// 场景预览页截图：色卡 + 四季地面
import { chromium, devices } from 'playwright';
const BASE = process.env.SHOT_BASE ?? 'http://localhost:4173/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
const ctx = await browser.newContext({ ...devices['iPhone 14'], locale: 'zh-CN' });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('pageerror', e.message));
await page.goto(BASE + '#/preview');
await page.waitForSelector('text=场景预览');
await page.waitForTimeout(500);
await page.screenshot({ path: 'shots/art1-palette.png', fullPage: true });
await page.getByRole('tab', { name: '1 地面' }).click();
for (const [val, name] of [['spring', 'spring'], ['summer', 'summer'], ['autumn', 'autumn'], ['winter', 'winter']]) {
  await page.locator('select').first().selectOption(val);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `shots/art1-ground-${name}.png`, fullPage: true });
}
await browser.close();
