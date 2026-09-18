/**
 * 第 7 类截图：造一村真实数据（走表单 + 注入），然后
 *  - 12 张全景：4 季 × 清晨 / 白天 / 深夜，1× 与 3× 各一套（预览页「7 场景」）
 *  - 空地检查一张
 *  - 交互三张：点建筑弹面板、点村民心气泡、走进帐篷过场（首页）
 *  - 首页整体（iPhone 14）
 *  - 性能数字写到 shots/village-perf.json
 * 用法：node scripts/shot-village.mjs   （需先 npx vite preview --port 4173）
 */
import { chromium, devices } from 'playwright';
import { writeFileSync } from 'node:fs';

const BASE = process.env.SHOT_BASE ?? 'http://localhost:4173/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
const phone = await browser.newContext({ ...devices['iPhone 14'], locale: 'zh-CN' });
const page = await phone.newPage();
page.on('pageerror', (e) => console.error('pageerror', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('console.error', m.text().slice(0, 300)); });
const clickCentered = async (loc) => { await loc.evaluate((el) => el.scrollIntoView({ block: 'center' })); await page.waitForTimeout(120); await loc.click(); };

async function createPerson(p) {
  await page.goto(BASE + (p.me ? '#/person/new?me=1' : '#/person/new'));
  await page.getByRole('heading', { name: p.me ? '我的档案' : '认识新村民' }).waitFor();
  await page.getByPlaceholder('真名或你叫 TA 的名字').fill(p.name);
  if (p.nick) await page.getByPlaceholder('村里显示的名字').fill(p.nick);
  if (!p.me) await page.locator('select').first().selectOption(p.relation);
  if (p.month) { await page.getByPlaceholder('月').fill(p.month); await page.getByPlaceholder('日').fill(p.day); }
  await clickCentered(page.getByRole('button', { name: p.me ? '建好我的档案' : '搬进村里' }));
  await page.waitForURL(/#\/person\/(?!new)[^/]+$/);
  return page.url().split('/').pop();
}

// 一村人：家人 3、朋友 4、想深交 1、同事 3、恋爱 1、新认识 2、其他 1
const people = [
  { me: true, name: '我', month: '8', day: '15' },
  { name: '外婆', relation: 'family', month: '8', day: '15', affection: 2500 },
  { name: '老爸', relation: 'family', month: '2', day: '3', affection: 1600 },
  { name: '表哥', relation: 'family', month: '6', day: '9', affection: 700 },
  { name: '林小雨', nick: '小雨', relation: 'friend', month: '3', day: '12', affection: 1375 },
  { name: '阿泽', relation: 'friend', month: '5', day: '20', affection: 900 },
  { name: '周周', relation: 'friend', month: '9', day: '1', affection: 300, stale: true },
  { name: '王大力', relation: 'friend', month: '1', day: '30', affection: 1100 },
  { name: '苏苏', relation: 'deepen', month: '10', day: '10', affection: 400 },
  { name: '陈默', relation: 'colleague', month: '11', day: '2', affection: 520 },
  { name: '李姐', relation: 'colleague', month: '4', day: '18', affection: 800 },
  { name: '小方', relation: 'colleague', month: '7', day: '7', affection: 260 },
  { name: '阿岚', relation: 'romance', month: '12', day: '24', affection: 1900 },
  { name: '快递小哥', relation: 'new', month: '2', day: '14', affection: 120 },
  { name: '楼下咖啡师', relation: 'new', month: '5', day: '5', affection: 200 },
  { name: '房东', relation: 'other', month: '9', day: '9', affection: 150 },
];
const ids = {};
for (const p of people) ids[p.name] = await createPerson(p);

await page.evaluate(async ({ people, ids }) => {
  const db = await new Promise((res) => { const r = indexedDB.open('renqing-village'); r.onsuccess = () => res(r.result); });
  const now = Date.now(), day = 86400000;
  const tx = db.transaction(['persons', 'settings'], 'readwrite');
  const store = tx.objectStore('persons');
  const all = await new Promise((res) => { const r = store.getAll(); r.onsuccess = () => res(r.result); });
  for (const p of all) {
    const spec = people.find((x) => ids[x.name] === p.id);
    if (!spec || spec.me) continue;
    p.affection = spec.affection;
    p.createdAt = now - 120 * day;
    p.lastInteractionAt = spec.stale ? now - 60 * day : now - day;
    p.milestonesUnlocked = [2, 4, 6, 8, 10].filter((h) => h <= Math.floor(spec.affection / 250));
    store.put(p);
  }
  const sRec = await new Promise((res) => { const r = tx.objectStore('settings').get('app'); r.onsuccess = () => res(r.result); });
  tx.objectStore('settings').put({ key: 'app', value: { ...(sRec?.value ?? {}), tutorialDone: true, fortuneIntroSeen: true } });
  await new Promise((res) => (tx.oncomplete = res));
}, { people, ids });

// ---- 首页（iPhone 14）：整体 + 交互三张 ----
await page.goto(BASE + '#/');
await page.reload();
await page.waitForSelector('canvas[aria-label="人情村"]');
await page.waitForTimeout(1200);
const closeDialogs = async () => { const c = page.getByRole('button', { name: '关闭' }); while (await c.count()) { await c.first().click(); await page.waitForTimeout(250); } };
await closeDialogs();
await page.screenshot({ path: 'shots/village-home.png', fullPage: false });
console.log('wrote village-home.png');
const perfHome = await page.evaluate(() => window.__villagePerf);

const canvas = page.locator('canvas[aria-label="人情村"]');
const box = async () => canvas.boundingBox();
const T = 16;
const clickTile = async (tx, ty) => { const b = await box(); await page.mouse.click(b.x + (tx + 0.5) * T, b.y + (ty + 0.5) * T); };
// 点老宅 → 面板
await clickTile(4, 5);
await page.waitForSelector('[role="dialog"][aria-label="老宅"]');
await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/village-panel.png' });
console.log('wrote village-panel.png');
await clickTile(0, 5); // 关面板
await page.waitForTimeout(200);
// 点村民（老宅门口第一位 (4,9)）→ 心气泡
await page.evaluate(() => window.scrollTo(0, 0));
await clickTile(4, 9);
await page.waitForTimeout(350);
await page.screenshot({ path: 'shots/village-poke.png' });
console.log('wrote village-poke.png');
await page.waitForURL(/#\/person\//, { timeout: 4000 }).catch(() => {});
// 走进帐篷过场
await page.goto(BASE + '#/');
await page.waitForSelector('canvas[aria-label="人情村"]');
await page.waitForTimeout(600);
await closeDialogs();
await clickTile(4, 12);
await page.waitForTimeout(260);
await page.screenshot({ path: 'shots/village-enter-tent.png' });
console.log('wrote village-enter-tent.png');
await page.waitForURL(/#\/fortune/, { timeout: 4000 }).catch(() => {});

// ---- 预览页：12 张全景 + 空地检查 + 性能 ----
const wide = await browser.newContext({ viewport: { width: 1300, height: 1300 }, deviceScaleFactor: 1, locale: 'zh-CN', storageState: await phone.storageState() });
const p2 = await wide.newPage();
// IndexedDB 不在 storageState 里：预览页和首页同源，同一个浏览器 profile 才共享。这里改用同一个 context。
await p2.close();
await wide.close();
await page.setViewportSize({ width: 1300, height: 1300 });
const perf = { home: perfHome };
for (const scale of [1, 3]) {
  for (const season of ['spring', 'summer', 'autumn', 'winter']) {
    for (const slot of ['dawn', 'day', 'night']) {
      await page.goto(`${BASE}#/preview?tab=village&season=${season}&slot=${slot}&scale=${scale}&shot=1&anim=0&frame=40`);
      await page.reload();
      await page.waitForSelector('[data-shot="village"] canvas');
      await page.waitForTimeout(500);
      await page.locator('[data-shot="village"]').screenshot({ path: `shots/village-${scale}x-${season}-${slot}.png` });
      console.log('wrote', `village-${scale}x-${season}-${slot}.png`);
      if (scale === 1) perf[`${season}-${slot}`] = await page.evaluate(() => window.__villagePerf);
    }
  }
}
// 空地检查（春 白天 3×）
await page.goto(`${BASE}#/preview?tab=village&season=spring&slot=day&scale=3&shot=1&anim=0&frame=0&debug=empty,grid`);
await page.reload();
await page.waitForSelector('[data-shot="village"] canvas');
await page.waitForTimeout(500);
await page.locator('[data-shot="village"]').screenshot({ path: 'shots/village-empty-check.png' });
console.log('wrote village-empty-check.png');
// 稳定运行 100 帧的每帧耗时（动画开着，等 13 s）
await page.goto(`${BASE}#/preview?tab=village&season=spring&slot=night&scale=1&shot=1`);
await page.reload();
await page.waitForSelector('[data-shot="village"] canvas');
await page.waitForTimeout(13000);
perf.steady = await page.evaluate(() => window.__villagePerf);
writeFileSync('shots/village-perf.json', JSON.stringify(perf, null, 2));
console.log('perf', JSON.stringify(perf.steady), 'home', JSON.stringify(perfHome));
await browser.close();
