import { chromium, devices } from 'playwright';
const BASE = process.env.SHOT_BASE ?? 'http://localhost:4173/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
const ctx = await browser.newContext({ ...devices['iPhone 14'], locale: 'zh-CN' });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('pageerror', e.message));
const shot = (n) => page.screenshot({ path: `shots/${n}.png` });

// 表单：预览 + 更多
await page.goto(BASE + '#/person/new');
await page.getByRole('heading', { name: '认识新村民' }).waitFor();
await page.getByPlaceholder('真名或你叫 TA 的名字').fill('测试');
await page.getByPlaceholder('月').fill('9');
await page.getByPlaceholder('日').fill('25');
await page.getByPlaceholder('年（可选）').fill('2001');
await page.getByRole('button', { name: /更多（农历/ }).click();
await page.waitForTimeout(200);
await page.getByText('生日（年份可不填）').scrollIntoViewIfNeeded();
await page.evaluate(() => window.scrollBy(0, -100));
await shot('form-more-solar');
await page.getByText('填的这个日期是农历').click();
await page.waitForTimeout(200);
await shot('form-more-lunar');
await page.getByText('填的这个日期是农历').click();

// 我的档案：1995-08-15 14:30 北京
await page.goto(BASE + '#/person/new?me=1');
await page.getByRole('heading', { name: '我的档案' }).waitFor();
await page.getByPlaceholder('真名或你叫 TA 的名字').fill('我');
await page.getByPlaceholder('月').fill('8');
await page.getByPlaceholder('日').fill('15');
await page.getByPlaceholder('年（可选）').fill('1995');
await page.locator('select').first().selectOption('exact');
await page.locator('input[type=time]').fill('14:30');
await page.getByRole('button', { name: /更多（农历/ }).click();
await page.locator('select').filter({ hasText: '北京' }).selectOption('北京');
await page.getByRole('button', { name: '建好我的档案' }).click();
await page.waitForURL(/#\/person\/(?!new)[^/]+$/);
const id = page.url().split('/').pop();
await page.goto(BASE + `#/person/${id}?tab=fortune`);
await page.waitForSelector('text=完整度');
await page.getByRole('button', { name: /排盘细节/ }).click();
await page.waitForTimeout(300);
await page.getByText('本命盘卡').scrollIntoViewIfNeeded();
await page.evaluate(() => window.scrollBy(0, 220));
await page.waitForTimeout(200);
await shot('natal-card');
await page.getByText('八字卡').scrollIntoViewIfNeeded();
await page.evaluate(() => window.scrollBy(0, -90));
await shot('bazi-truesolar');

// 自检
await page.goto(BASE + '#/selfcheck');
await page.waitForSelector('text=本命盘与手动排盘');
await page.getByText('本命盘与手动排盘').scrollIntoViewIfNeeded();
await page.evaluate(() => window.scrollBy(0, -90));
await page.waitForTimeout(200);
await shot('selfcheck-natal');
console.log('status:', await page.locator('header').first().innerText());
await browser.close();
