// Playwright iPhone 触控模拟：阶段 4/5 截图（AI 调用不真发，注入假解读渲染界面）
import { chromium, devices } from 'playwright';

const BASE = process.env.SHOT_BASE ?? 'http://localhost:4173/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
const ctx = await browser.newContext({ ...devices['iPhone 14'], locale: 'zh-CN' });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('pageerror', e.message));
const shot = (name) => page.screenshot({ path: `shots/${name}.png` });

async function createPerson(p) {
  await page.goto(BASE + (p.me ? '#/person/new?me=1' : '#/person/new'));
  await page.getByRole('heading', { name: p.me ? '我的档案' : '认识新村民' }).waitFor();
  await page.getByPlaceholder('真名或你叫 TA 的名字').fill(p.name);
  if (p.nick) await page.getByPlaceholder('村里显示的名字').fill(p.nick);
  if (!p.me) await page.locator('select').first().selectOption(p.relation);
  if (p.month) { await page.getByPlaceholder('月').fill(p.month); await page.getByPlaceholder('日').fill(p.day); }
  if (p.year) await page.getByPlaceholder('年（可选）').fill(p.year);
  if (p.lunar) await page.getByText(/过农历生日/).click();
  if (p.time) { await page.locator('select').last().selectOption('exact'); await page.locator('input[type=time]').fill(p.time); }
  for (const t of p.tags ?? []) { await page.getByPlaceholder('比如：慢热、爱吐槽、靠谱').fill(t); await page.getByPlaceholder('比如：慢热、爱吐槽、靠谱').press('Enter'); }
  for (const t of p.taboos ?? []) { await page.getByPlaceholder('比如：别问工资、不吃香菜').fill(t); await page.getByPlaceholder('比如：别问工资、不吃香菜').press('Enter'); }
  await page.getByRole('button', { name: p.me ? '建好我的档案' : '搬进村里' }).click();
  await page.waitForURL(/#\/person\/(?!new)[^/]+$/);
  return page.url().split('/').pop();
}

await page.goto(BASE + '#/');
await page.waitForSelector('text=人情村');
const ids = {};
ids.me = await createPerson({ me: true, name: '我', month: '8', day: '15', year: '1995', time: '14:30' });
ids.xiaoyu = await createPerson({ name: '林小雨', nick: '小雨', relation: 'friend', month: '3', day: '12', year: '1998', tags: ['爱吐槽', '靠谱'], taboos: ['不吃香菜'] });
ids.chenmo = await createPerson({ name: '陈默', relation: 'colleague', tags: ['慢热'] });
ids.waipo = await createPerson({ name: '外婆', relation: 'family', month: '8', day: '15', lunar: true, year: '1950', tags: ['唠叨', '心软'], taboos: ['别提搬家'] });

// 注入点数 + 假的占卜解读（不真调 API）
await page.evaluate(async ({ ids }) => {
  const req = indexedDB.open('renqing-village');
  const db = await new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
  const tx = db.transaction('persons', 'readwrite');
  const store = tx.objectStore('persons');
  const all = await new Promise((res) => { const r = store.getAll(); r.onsuccess = () => res(r.result); });
  const now = Date.now();
  for (const p of all) {
    if (p.name === '林小雨') {
      p.affection = 1375; p.milestonesUnlocked = [2, 4];
      p.notes = [{ id: 'n1', text: '今天她说最近迷上手冲咖啡，但闻不了香菜味，周末想去爬山', createdAt: now - 86400000 }, { id: 'n2', text: '她提到公司最近在裁员，有点焦虑，别主动问工作', createdAt: now - 3 * 86400000, aiProcessedAt: now - 2 * 86400000 }];
      p.preferences = [...p.preferences, { id: 'g1', name: '露营', category: 'activity', tier: 'like', note: '双鱼座常喜欢亲近自然的活动', source: 'fortune', createdAt: now }, { id: 'g2', name: '手账文具', category: 'item', tier: 'like', note: '灵数 4 的人可能喜欢有秩序感的小物', source: 'fortune', createdAt: now }];
      p.fortune = {
        inputHash: 'seed', basis: { birth: JSON.stringify({ month: 3, day: 12, year: 1998 }), relation: 'friend', promptVersion: 1 }, createdAt: now, rejected: [], hits: 0, misses: 0, lastAskedAt: now,
        data: { likesWritten: true, reading: {
          dialogue: ['哟，小雨这孩子，双鱼座的，三月里生的。我看她像一泓春水，表面上软和，底下有自己的流向。', '灵数算出来是 4，这样的人也许嘴上爱吐槽，心里头却是最讲规矩、最靠得住的那种。你说她"靠谱"，倒是对得上。', '八字里木旺，火少了些。木旺的人可能主意正、生长力强；火少，也许不太爱把热情挂在脸上，得慢慢处。', '和她相处，别急着往前冲。她要的是你稳稳当当地在那儿。'],
          traits: [{ text: '嘴硬心软，吐槽是关心的一种', basis: '星座（双鱼）' }, { text: '做事讲秩序，讨厌临时变卦', basis: '灵数 4' }, { text: '热情藏在里头，不轻易外露', basis: '八字五行（火少）' }, { text: '对自然和水边有亲近感', basis: '星座（水象）' }],
          guessedLikes: [], tips: ['约她别临时改时间，她可能很在意这个', '她吐槽的时候顺着聊，别急着给建议', '安静的地方比热闹的地方更容易让她放松'], topics: ['你是双鱼座啊，听说双鱼都特别会共情？', '最近有没有去过什么水边的地方？'],
          systems: { zodiac: '双鱼座是水象，共情力强，情绪有潮汐。可能对氛围和别人的情绪特别敏感。', numerology: '灵数 4 讲究踏实和秩序，也许表面随性，其实心里有张时间表。', bazi: '木旺火弱：主意正、生长力强，热情不外露，需要慢慢暖。' },
          traitVerdicts: [null, null, null, null],
        } },
      };
    }
    if (p.name === '外婆') { p.affection = 2500; p.milestonesUnlocked = [2, 4, 6, 8, 10]; }
    if (p.name === '陈默') { p.affection = 520; p.milestonesUnlocked = [2]; p.lastInteractionAt = now - 40 * 86400000; }
    store.put(p);
  }
  await new Promise((res) => (tx.oncomplete = res));
  localStorage.setItem('renqing.apiKey', 'sk-ant-placeholder-for-screenshots');
}, { ids });

// 设置：打开 AI
await page.goto(BASE + '#/settings');
await page.reload();
await page.waitForSelector('text=AI 助手');
await page.getByRole('switch').first().click();
await page.waitForTimeout(400);
await shot('01-settings-ai');

// 首页：我的家 + 帐篷
await page.goto(BASE + '#/');
await page.waitForSelector('text=村民名册');
await page.waitForTimeout(600);
await shot('02-home-village');
await page.locator('[data-season]').evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
await page.waitForTimeout(300);
await shot('03-home-tent');

// 走进帐篷
await page.getByLabel('星婆婆的帐篷').click();
await page.waitForURL(/#\/fortune/);
await page.waitForSelector('text=占卜屋');
await page.waitForTimeout(1800);
await shot('04-fortune-intro');
for (let i = 0; i < 6; i++) { await page.locator('div[role=button]').filter({ hasText: '全部显示' }).first().click(); await page.waitForTimeout(150); }
await page.getByText('小雨', { exact: true }).click();
await page.waitForTimeout(300);
await shot('05-fortune-pick');

// 人物页：占卜 Tab
await page.goto(BASE + `#/person/${ids.xiaoyu}?tab=fortune`);
await page.waitForSelector('text=可能的性格特点');
await page.getByRole('button', { name: '准', exact: true }).first().click();
await page.waitForTimeout(300);
await shot('06-fortune-tab');
await page.getByRole('button', { name: '看排盘细节' }).click();
await page.waitForTimeout(300);
await page.getByText('八字卡').scrollIntoViewIfNeeded();
await shot('07-fortune-chart');

// 改生日 → 解读过期提示
await page.goto(BASE + `#/person/${ids.xiaoyu}/edit`);
await page.getByRole('heading', { name: '编辑村民' }).waitFor();
await page.getByPlaceholder('日').fill('13');
await page.getByRole('button', { name: '保存' }).click();
await page.waitForURL(/#\/person\/[^/]+$/);
await page.goto(BASE + `#/person/${ids.xiaoyu}?tab=fortune`);
await page.waitForSelector('text=可能的性格特点');
await page.getByText(/你改过生日/).scrollIntoViewIfNeeded();
await page.evaluate(() => window.scrollBy(0, -120));
await page.waitForTimeout(300);
await shot('07b-fortune-stale');

// 喜好 Tab：猜测分组
await page.getByRole('tab', { name: '喜好' }).click();
await page.waitForTimeout(300);
await page.getByText('星婆婆的猜测').scrollIntoViewIfNeeded();
await shot('08-prefs-guesses');

// 笔记 Tab：AI 按钮 + 摘要卡
await page.getByRole('tab', { name: '笔记' }).click();
await page.waitForTimeout(300);
await shot('09-notes-ai');

// 我的档案
await page.goto(BASE + `#/person/${ids.me}?tab=fortune`);
await page.waitForSelector('text=我的档案');
await page.waitForTimeout(400);
await shot('10-me-profile');
const btn = page.getByRole('button', { name: /排盘细节/ });
if (await btn.count()) { await btn.first().click(); await page.waitForTimeout(300); await shot('11-me-chart'); } else { console.log('me page buttons:', JSON.stringify(await page.locator('button').allTextContents())); }

await page.goto(BASE + '#/');
await page.reload();
console.log('after reload:', await page.locator('text=村民名册').textContent());
await browser.close();
