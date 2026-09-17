// 阶段 6 截图：教程、命书章末导航、数据面板、年度回顾、清空记录
import { chromium, devices } from 'playwright';
const BASE = process.env.SHOT_BASE ?? 'http://localhost:4173/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
const ctx = await browser.newContext({ ...devices['iPhone 14'], locale: 'zh-CN' });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('pageerror', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('console.error', m.text().slice(0, 300)); });
const shot = (n) => page.screenshot({ path: `shots/${n}.png` });
// 底栏是 fixed 的，按钮滚到底边会被它盖住：先滚到屏幕中间再点
const clickCentered = async (loc) => { await loc.evaluate((el) => el.scrollIntoView({ block: 'center' })); await page.waitForTimeout(150); await loc.click(); };
const scrollTo = async (text, dy = -120) => {
  await page.evaluate(({ text, dy }) => {
    const el = [...document.querySelectorAll('span,div,p,h2,button')].find((x) => x.childElementCount === 0 && x.textContent?.trim() === text) ?? [...document.querySelectorAll('span,div,p,h2,button')].find((x) => x.textContent?.includes(text));
    el?.scrollIntoView({ block: 'start' });
    window.scrollBy(0, dy);
  }, { text, dy });
  await page.waitForTimeout(250);
};

async function createPerson(p) {
  await page.goto(BASE + (p.me ? '#/person/new?me=1' : '#/person/new'));
  await page.getByRole('heading', { name: p.me ? '我的档案' : '认识新村民' }).waitFor();
  await page.getByPlaceholder('真名或你叫 TA 的名字').fill(p.name);
  if (p.nick) await page.getByPlaceholder('村里显示的名字').fill(p.nick);
  if (!p.me) await page.locator('select').first().selectOption(p.relation);
  if (p.month) { await page.getByPlaceholder('月').fill(p.month); await page.getByPlaceholder('日').fill(p.day); }
  if (p.year) await page.getByPlaceholder('年（可选）').fill(p.year);
  if (p.time) { await page.locator('select').last().selectOption('exact'); await page.locator('input[type=time]').fill(p.time); }
  if (p.place) { await page.getByRole('button', { name: /更多（农历/ }).click(); await page.locator('select').filter({ hasText: p.place }).selectOption(p.place); }
  await clickCentered(page.getByRole('button', { name: p.me ? '建好我的档案' : '搬进村里' }));
  await page.waitForURL(/#\/person\/(?!new)[^/]+$/);
  return page.url().split('/').pop();
}

// 1. 首次打开：教程第 1 步
await page.goto(BASE + '#/');
await page.waitForSelector('text=人情村');
await page.waitForTimeout(600);
await shot('p6-01-tutorial-step1');

const ids = {};
ids.me = await createPerson({ me: true, name: '我', month: '8', day: '15', year: '1995', time: '14:30', place: '北京' });
ids.xiaoyu = await createPerson({ name: '林小雨', nick: '小雨', relation: 'friend', month: '3', day: '12', year: '1998', time: '09:20', place: '深圳' });
ids.chenmo = await createPerson({ name: '陈默', relation: 'colleague', month: '11', day: '2' });
ids.waipo = await createPerson({ name: '外婆', relation: 'family', month: '8', day: '15', year: '1950' });

// 教程第 2 步（村口）
await page.goto(BASE + '#/');
await page.waitForTimeout(600);
await shot('p6-02-tutorial-step2');

// 注入互动 / 命书 / 设置
await page.evaluate(async ({ ids }) => {
  const fnv = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };
  const db = await new Promise((res) => { const r = indexedDB.open('renqing-village'); r.onsuccess = () => res(r.result); });
  const now = Date.now();
  const day = 86400000;
  const year = new Date().getFullYear();
  const tx = db.transaction(['persons', 'interactions', 'settings', 'achievements'], 'readwrite');
  const persons = tx.objectStore('persons');
  const all = await new Promise((res) => { const r = persons.getAll(); r.onsuccess = () => res(r.result); });
  const inter = tx.objectStore('interactions');
  let n = 0;
  const add = (personId, type, daysAgo, points, gift) => {
    inter.put({ id: 'i' + n++, personId, at: now - daysAgo * day, type, points, computedPoints: points, createdAt: now, ...(gift ? { gift: { name: gift, tier: 'love' } } : {}) });
  };
  for (const p of all) {
    if (p.id === ids.xiaoyu) {
      p.affection = 1375; p.milestonesUnlocked = [2, 4]; p.lastInteractionAt = now - day;
      p.notes = [{ id: 'n1', text: '今天她说最近迷上手冲咖啡，周末想去爬山', createdAt: now - 3 * day }];
      p.preferences = [{ id: 'a', name: '手冲咖啡', category: 'food', tier: 'love', source: 'manual', createdAt: now }];
      p.taboos = ['不吃香菜'];
      for (let k = 0; k < 14; k++) add(p.id, k % 3 === 0 ? 'gift' : k % 3 === 1 ? 'meet' : 'chat', k * 9 + 1, k % 3 === 0 ? 80 : 20, k % 3 === 0 ? (k % 2 ? '手冲咖啡豆' : '登山杖') : undefined);
      const hash = fnv(`3|${JSON.stringify(p.birth)}|${p.relation}`);
      const model = 'claude-opus-5';
      p.fortune = { inputHash: hash, basis: { birth: JSON.stringify(p.birth), relation: p.relation, promptVersion: 3 }, createdAt: now - 2 * day, rejected: [], hits: 1, misses: 0, lastAskedAt: now - 3600000,
        data: { likesWritten: true, reading: { dialogue: [], traits: [], guessedLikes: [], tips: [], topics: [], systems: { zodiac: null, numerology: null, bazi: null, natal: null } }, book: { chapters: {
          overview: { inputHash: hash, model, updatedAt: now - 2 * day, traits: [{ text: '嘴上说随便，心里早排好了时间表', basis: '灵数 4 · 八字日主乙木', verdict: 'hit' }], rounds: [{ createdAt: now - 2 * day, sections: [
            { title: '几套盘都指向的那一处', body: '小雨这孩子，星盘上太阳落双鱼二十一度，八字里日主是乙木，灵数算出来是 4。三处看下来，指向了同一个地方：外头看着软和随性，里头其实有一套自己的秩序。' },
            { title: '婆婆要去浇地了', body: '今儿先说到这儿。地里的菜等着浇水呢，你慢慢翻。' } ] }] },
          bazi: { inputHash: hash, model, updatedAt: now - day, traits: [{ text: '不吵架，但过两天还是按自己的来', basis: '八字日主乙木', verdict: null }], rounds: [
            { createdAt: now - day, sections: [{ title: '日主乙木', body: '总论里提过乙木是藤蔓一样的木，这里再往深处说。乙木不跟人硬碰，它绕着走，但方向从来不变。' }, { title: '五行：木旺火弱', body: '四柱里木占了一半，火只有时柱一点。木旺人主意正、生长力强；火少，热情不外露。' }] },
            { createdAt: now - 3600000, sections: [{ title: '再说说年柱纳音', body: '戊寅的纳音是城头土。城头土是筑在高处的土，不肥，但稳。' }, { title: '写到这里断了', body: '木旺的人不容易停，脑子里总有下一件事。你要是想让她歇一歇，别说' }], incomplete: true, error: '连不上服务器，检查一下网络' },
          ] },
        } } } };
    }
    if (p.id === ids.waipo) { p.affection = 2500; p.milestonesUnlocked = [2, 4, 6, 8, 10]; for (let k = 0; k < 6; k++) add(p.id, 'meet', k * 20 + 2, 20); }
    if (p.id === ids.chenmo) { p.affection = 520; p.milestonesUnlocked = [2]; for (let k = 0; k < 3; k++) add(p.id, 'chat', k * 30 + 5, 10); }
    p.createdAt = now - 200 * day;
    persons.put(p);
  }
  // 40 天前导出过 → 备份提醒；首次使用日期两年前 → 回顾能选年份
  const sRec = await new Promise((res) => { const r = tx.objectStore('settings').get('app'); r.onsuccess = () => res(r.result); });
  const value = { ...(sRec?.value ?? {}), lastExportAt: now - 40 * day, firstUseDate: `${year - 1}-03-01`, aiEnabled: true, tutorialDone: true, fortuneIntroSeen: true };
  tx.objectStore('settings').put({ key: 'app', value });
  tx.objectStore('achievements').put({ id: 'first-friend', unlockedAt: now - 100 * day });
  await new Promise((res) => (tx.oncomplete = res));
  localStorage.setItem('renqing.apiKey', 'sk-ant-placeholder-for-screenshots');
}, { ids });

// 2. 村口：备份提醒任务
await page.goto(BASE + '#/');
await page.reload();
await page.waitForSelector('text=今日任务板');
await page.waitForTimeout(800);
await scrollTo('今日任务板', -100);
await shot('p6-03-backup-quest');

const closeDialogs = async () => { const c = page.getByRole('button', { name: '关闭' }); if (await c.count()) { await c.first().click(); await page.waitForTimeout(300); } };

// 3. 命书：八字章（两轮 + 断掉 + 接着讲 + 上一章/下一章）
await page.goto(BASE + `#/person/${ids.xiaoyu}?tab=fortune`);
await page.waitForSelector('text=小雨的命书');
await page.waitForTimeout(400);
await closeDialogs();
await scrollTo('第一章', -130);
await shot('p6-04-toc-counts');
await clickCentered(page.getByRole('button', { name: /第三章/ }));
await page.waitForTimeout(700);
await scrollTo('第 2 次讲', -140);
await shot('p6-05-chapter-round-divider');
await scrollTo('接着讲', -300);
await shot('p6-06-chapter-resume-nav');

// 4. 设置：数据面板 + 年度回顾入口
await page.goto(BASE + '#/settings');
await page.waitForSelector('text=年度回顾');
await page.waitForTimeout(400);
await scrollTo('看回顾', -120);
await shot('p6-07-settings-data');
await page.getByRole('button', { name: '导入备份' }).scrollIntoViewIfNeeded();
await page.evaluate(() => window.scrollBy(0, -80));
await page.waitForTimeout(200);
await shot('p6-08-settings-data-2');

// 5. 年度回顾
await clickCentered(page.getByRole('button', { name: '看回顾' }));
await page.waitForSelector('canvas');
await page.waitForTimeout(1200);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(200);
await shot('p6-09-review');
await page.evaluate(() => window.scrollBy(0, 420));
await page.waitForTimeout(200);
await shot('p6-09b-review-bottom');

// 6. 清空记录确认
await page.goto(BASE + `#/person/${ids.xiaoyu}/edit`);
await page.waitForSelector('text=保存');
await clickCentered(page.getByRole('button', { name: /清空 TA 的记录/ }));
await page.waitForTimeout(300);
await page.getByPlaceholder('林小雨').fill('林小雨');
await page.waitForTimeout(200);
await shot('p6-10-clear-person');
await browser.close();
