// Playwright iPhone 触控模拟：建人 → 加喜好 → 记一笔 → 任务板 / 里程碑 / 图鉴 → 截图
import { chromium, devices } from 'playwright';

const BASE = process.env.SHOT_BASE ?? 'http://localhost:4173/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
const ctx = await browser.newContext({ ...devices['iPhone 14'], locale: 'zh-CN' });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('pageerror', e.message));
const shot = (name) => page.screenshot({ path: `shots/${name}.png` });

const people = [
  { name: '林小雨', nick: '小雨', relation: 'friend', month: '9', day: '20', tags: ['爱吐槽', '靠谱'], taboos: ['不吃香菜'], points: 480 },
  { name: '陈默', nick: '', relation: 'colleague', month: '', day: '', tags: ['慢热'], taboos: [], points: 520 },
  { name: '外婆', nick: '', relation: 'family', month: '8', day: '15', lunar: true, year: '1950', tags: ['唠叨', '心软'], taboos: ['别提搬家'], points: 2500 },
  { name: '阿哲', nick: '', relation: 'romance', month: '2', day: '14', tags: [], taboos: [], points: 1000 },
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
  if (p.year) await page.getByPlaceholder('年（可选）').fill(p.year);
  if (p.lunar) await page.getByText('TA 过农历生日').click();
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

// 直接改 IndexedDB 里的点数（并把已到达的里程碑标记为已看，避免一开始弹一堆卡）
await page.evaluate(async (pts) => {
  const req = indexedDB.open('renqing-village');
  const db = await new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
  const tx = db.transaction('persons', 'readwrite');
  const store = tx.objectStore('persons');
  const all = await new Promise((res) => { const r = store.getAll(); r.onsuccess = () => res(r.result); });
  for (const p of all) {
    const target = pts.find((x) => x.name === p.name);
    if (!target) continue;
    p.affection = target.points;
    p.milestonesUnlocked = [2, 4, 6, 8, 10].filter((h) => Math.floor(target.points / 250) >= h);
    if (p.name === '陈默') p.lastInteractionAt = Date.now() - 40 * 86400000;
    store.put(p);
  }
  await new Promise((res) => (tx.oncomplete = res));
}, people);

await page.goto(BASE + '#/');
await page.reload();
await page.waitForSelector('text=村民名册');
await page.waitForTimeout(800);
await shot('01-home-taskboard');

// 触控横滑村庄
const scene = page.locator('[data-season]');
const sb = await scene.boundingBox();
const before = await page.evaluate(() => document.querySelector('[data-season]').scrollLeft);
await page.evaluate(async ({ x, y }) => {
  const el = document.elementFromPoint(x, y);
  const t = (type, cx) => el.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: type === 'touchend' ? [] : [new Touch({ identifier: 1, target: el, clientX: cx, clientY: y })] }));
  t('touchstart', x); for (let i = 1; i <= 10; i++) { t('touchmove', x - i * 20); await new Promise((r) => setTimeout(r, 16)); } t('touchend', 0);
}, { x: sb.x + 300, y: sb.y + 100 });
await scene.evaluate((el) => { el.scrollBy({ left: 160 }); });
await page.waitForTimeout(300);
const after = await scene.evaluate((el) => el.scrollLeft);
console.log('village scroll: overflow?', await scene.evaluate((el) => el.scrollWidth > el.clientWidth), 'scrollLeft', before, '->', after);

// 底部导航与 safe-area
const nav = await page.locator('nav').boundingBox();
const vh = await page.evaluate(() => window.innerHeight);
console.log('nav bottom', nav.y + nav.height, 'viewport', vh, 'safe-bottom var', await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom')));

// 小雨：加喜好、长按（触控）
await page.getByText('林小雨').first().click();
await page.waitForSelector('text=里程碑');
await page.getByRole('button', { name: '添加最爱' }).click();
await page.getByPlaceholder('比如：手冲咖啡').fill('手冲咖啡');
await page.getByRole('dialog').getByRole('button', { name: '保存' }).click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: '添加最讨厌' }).click();
await page.getByRole('dialog').getByText('香菜', { exact: true }).click();
await page.getByRole('dialog').getByRole('button', { name: '保存' }).click();
await page.waitForTimeout(300);
const chip = page.getByText('手冲咖啡', { exact: true }).first();
const box = await chip.boundingBox();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + 10, y: box.y + box.height / 2 }] });
await page.waitForTimeout(650);
await shot('02-detail-tooltip-touch');
console.log('tooltip visible after touch long-press:', await page.getByRole('tooltip').isVisible().catch(() => false));
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await page.waitForTimeout(200);
console.log('tooltip hidden after release:', !(await page.getByRole('tooltip').isVisible().catch(() => false)), '| editor wrongly opened:', await page.getByRole('dialog').isVisible().catch(() => false));
await shot('03-detail-header');
const personUrl = page.url();
const personId = personUrl.split('/').pop();

// 记一笔送礼 → 跨 2 心 → 里程碑卡
await page.goto(BASE + '#/record?person=' + personId);
await page.getByRole('heading', { name: '记一笔' }).waitFor();
await page.getByRole('button', { name: /^送礼/ }).click();
await page.getByPlaceholder('比如：手冲咖啡豆').fill('手冲咖啡');
await page.waitForTimeout(300);
await shot('04-record-gift');
await page.getByRole('button', { name: '记下来' }).click();
await page.waitForTimeout(900);
await shot('05-score');
await page.waitForTimeout(1600);
await shot('06-milestone-card');
await page.getByRole('button', { name: '继续', exact: true }).click();
await page.getByRole('button', { name: '完成' }).click();
await page.waitForURL(personUrl);

// 提醒
await page.getByRole('tab', { name: '互动' }).click();
await page.getByRole('button', { name: '某天提醒我' }).click();
await page.getByPlaceholder('比如：问问面试结果').fill('问问她爬山约哪天');
await page.getByRole('button', { name: '加进任务板' }).click();
await page.waitForTimeout(300);
await shot('07-timeline-reminder');

// 任务板完成一条
await page.goto(BASE + '#/');
await page.waitForSelector('text=今日任务板');
await page.waitForTimeout(600);
await shot('08-home-after');
await page.getByRole('button', { name: '完成' }).first().click();
await page.waitForTimeout(400);

// 图鉴
await page.goto(BASE + '#/collection');
await page.waitForSelector('text=礼物');
await page.waitForTimeout(300);
await shot('09-collection-gifts');
await page.getByRole('tab', { name: '人物卡' }).click();
await page.waitForTimeout(200);
await page.getByText('林小雨').first().click();
await page.waitForTimeout(500);
await shot('10-collection-persons');
await page.getByRole('tab', { name: '成就' }).click();
await page.waitForTimeout(300);
await shot('11-collection-achievements');

await page.goto(BASE + '#/');
await page.reload();
console.log('after reload:', await page.locator('text=村民名册').textContent());
await browser.close();
