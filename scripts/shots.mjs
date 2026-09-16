// 用 Playwright 在 iPhone 尺寸下走一遍 UI：建 3 个人 → 设点数 → 截图
import { chromium } from 'playwright';

const BASE = process.env.SHOT_BASE ?? 'http://localhost:4173/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'zh-CN' });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('pageerror', e.message));

const people = [
  { name: '林小雨', nick: '小雨', relation: 'friend', month: '3', day: '12', tags: ['爱吐槽', '靠谱'], taboos: ['不吃香菜'], points: 1375 },
  { name: '陈默', nick: '', relation: 'colleague', month: '', day: '', tags: ['慢热'], taboos: [], points: 520 },
  { name: '外婆', nick: '', relation: 'family', month: '10', day: '2', tags: ['唠叨', '心软'], taboos: ['别提搬家'], points: 2500 },
];

await page.goto(BASE + '#/');
await page.waitForSelector('text=人情村');
for (const p of people) {
  await page.goto(BASE + '#/person/new');
  await page.getByRole('heading', { name: '认识新村民' }).waitFor();
  await page.getByPlaceholder('真名或你叫 TA 的名字').fill(p.name);
  if (p.nick) await page.getByPlaceholder('村里显示的名字').fill(p.nick);
  await page.locator('select').selectOption(p.relation);
  if (p.month) {
    await page.getByPlaceholder('月').fill(p.month);
    await page.getByPlaceholder('日').fill(p.day);
  }
  for (const t of p.tags) {
    await page.getByPlaceholder('比如：慢热、爱吐槽、靠谱').fill(t);
    await page.getByPlaceholder('比如：慢热、爱吐槽、靠谱').press('Enter');
  }
  for (const t of p.taboos) {
    await page.getByPlaceholder('比如：别问工资、不吃香菜').fill(t);
    await page.getByPlaceholder('比如：别问工资、不吃香菜').press('Enter');
  }
  await page.getByRole('button', { name: '搬进村里' }).click();
  await page.waitForURL(/#\/person\/(?!new)[^/]+$/);
}

// 直接改 IndexedDB 里的点数，模拟不同心数
await page.evaluate(async (pts) => {
  const req = indexedDB.open('renqing-village');
  const db = await new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
  const tx = db.transaction('persons', 'readwrite');
  const store = tx.objectStore('persons');
  const all = await new Promise((res) => { const r = store.getAll(); r.onsuccess = () => res(r.result); });
  for (const p of all) {
    const target = pts.find((x) => x.name === p.name);
    if (target) { p.affection = target.points; if (p.name === '陈默') p.lastInteractionAt = Date.now() - 40 * 86400000; store.put(p); }
  }
  await new Promise((res) => (tx.oncomplete = res));
}, people);

await page.goto(BASE + '#/');
await page.reload();
await page.waitForSelector('text=村民名册');
await page.waitForTimeout(400);
await page.screenshot({ path: 'shots/01-home.png' });

await page.getByText('林小雨').first().click();
await page.waitForSelector('text=里程碑');
await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/02-detail.png' });
await page.getByRole('tab', { name: '笔记' }).click();
await page.getByPlaceholder(/随手记一段/).fill('今天她说最近迷上手冲咖啡，但闻不了香菜味，周末想去爬山');
await page.getByRole('button', { name: '记下来' }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/03-notes.png' });

await page.goto(BASE + '#/person/new');
await page.getByRole('heading', { name: '认识新村民' }).waitFor();
await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/04-form.png' });

// 刷新后数据仍在
await page.goto(BASE + '#/');
await page.reload();
const count = await page.locator('text=村民名册').textContent();
console.log('after reload:', count);
await browser.close();
