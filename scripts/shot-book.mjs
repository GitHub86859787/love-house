// 命书截图：不真发 AI 请求，往 IndexedDB 注入一本假命书渲染界面
import { chromium, devices } from 'playwright';
const BASE = process.env.SHOT_BASE ?? 'http://localhost:4173/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
const ctx = await browser.newContext({ ...devices['iPhone 14'], locale: 'zh-CN' });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('pageerror', e.message));
const shot = (n) => page.screenshot({ path: `shots/${n}.png` });

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
  await page.getByRole('button', { name: p.me ? '建好我的档案' : '搬进村里' }).click();
  await page.waitForURL(/#\/person\/(?!new)[^/]+$/);
  return page.url().split('/').pop();
}

await page.goto(BASE + '#/');
await page.waitForSelector('text=人情村');
const ids = {};
ids.me = await createPerson({ me: true, name: '我', month: '8', day: '15', year: '1995', time: '14:30', place: '北京' });
ids.xiaoyu = await createPerson({ name: '林小雨', nick: '小雨', relation: 'friend', month: '3', day: '12', year: '1998', time: '09:20', place: '深圳' });
ids.chenmo = await createPerson({ name: '陈默', relation: 'colleague', month: '11', day: '2' });

// 注入假命书
await page.evaluate(async ({ ids }) => {
  const fnv = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };
  const db = await new Promise((res) => { const r = indexedDB.open('renqing-village'); r.onsuccess = () => res(r.result); });
  const tx = db.transaction('persons', 'readwrite');
  const store = tx.objectStore('persons');
  const all = await new Promise((res) => { const r = store.getAll(); r.onsuccess = () => res(r.result); });
  const now = Date.now();
  const day = 86400000;
  const me = all.find((p) => p.isMe);
  for (const p of all) {
    if (p.id === ids.xiaoyu) {
      p.affection = 1375; p.milestonesUnlocked = [2, 4];
      const hash = fnv(`3|${JSON.stringify(p.birth)}|${p.relation}`);
      const synHash = fnv(`3|${JSON.stringify(me.birth)}|${JSON.stringify(p.birth)}|${p.relation}`);
      const model = 'claude-opus-5';
      const chapters = {
        overview: {
          inputHash: hash, model, updatedAt: now - 2 * day,
          rounds: [{ createdAt: now - 2 * day, sections: [
            { title: '几套盘都指向的那一处', body: '小雨这孩子，星盘上太阳落双鱼二十一度，八字里日主是乙木，灵数算出来是 4。三处看下来，指向了同一个地方：外头看着软和随性，里头其实有一套自己的秩序。乙木是藤蔓一样的木，看着柔，缠上去就不松手；灵数 4 又是最讲规矩的数。所以她可能是那种嘴上说「随便」，心里早就把时间表排好了的人。' },
            { title: '外头一面、里头一面', body: '双鱼太阳让她共情力强，别人的情绪她接得快；但月亮落在摩羯，八字里火又少，热情不往脸上挂。这两下一合，可能就是「听你说得很认真，但自己的事不轻易开口」。什么时候是哪一面？人多的场合是双鱼那面，两个人安静待着的时候，摩羯那面才慢慢出来。' },
            { title: '整体是个什么质地的人', body: '我猜她像一泓春水：面上平，底下有自己的流向。和她处，别急着往前冲，她要的是你稳稳当当地在那儿。这几章我会一章一章细说，星盘那章讲度数，八字那章讲柱，你想听哪个先翻哪个。' },
            { title: '婆婆要去浇地了', body: '今儿先说到这儿。地里的菜等着浇水呢，你慢慢翻，翻到哪儿不明白再来问我。' },
          ] }],
          traits: [
            { text: '嘴上说随便，心里早排好了时间表', basis: '灵数 4 · 八字日主乙木', verdict: 'hit' },
            { text: '接别人情绪快，自己的事不轻易开口', basis: '星盘太阳双鱼、月亮摩羯', verdict: null },
            { text: '认准了就不松手，有藤蔓一样的韧性', basis: '八字日主乙木', verdict: null },
          ],
        },
        bazi: {
          inputHash: hash, model, updatedAt: now - day,
          rounds: [
            { createdAt: now - day, sections: [
              { title: '日主乙木', body: '总论里提过乙木是藤蔓一样的木，这里再往深处说。乙木不跟人硬碰，它绕着走，但方向从来不变。所以小雨在争执里可能不吵，过两天你发现她还是按自己的来了。' },
              { title: '年柱戊寅', body: '戊土坐在寅木上，寅是木的老家，土在这儿站不太稳。年柱说的是她早年的底色：可能从小就在一个规矩多、但撑得住她的环境里长大，所以她既守规矩又想往外长。' },
              { title: '月柱乙卯', body: '月柱是乙木坐卯木，木气极旺，这是她性子里最硬的一块：主意正。和这样的人相处要注意，别替她做决定，哪怕是小事。' },
              { title: '日柱乙未', body: '日柱乙未，未是燥土，木坐在上头要费点力气扎根。她可能对「自己的地方」看得重，一间收拾得舒服的屋子对她意义不一般。' },
              { title: '时柱己巳', body: '按真太阳时校正过，深圳的九点二十，折回去还是巳时。己巳，土坐火上，这一柱是她三十岁后慢慢显出来的一面：可能比现在暖一些，愿意把火拿出来给人看了。' },
              { title: '五行：木旺火弱', body: '四柱里木占了一半，火只有时柱一点。木旺人主意正、生长力强；火少，热情不外露。生活里补火的法子不是迷信那套，是多带她去有人气、有光的地方，暖色的东西她可能会慢慢喜欢上。' },
            ] },
            { createdAt: now - 3600000, sections: [
              { title: '再说说年柱纳音', body: '戊寅的纳音是城头土。城头土是筑在高处的土，不肥，但稳。这和她那份「守规矩又想往外长」是对得上的：她的根是稳的，往外长是长在稳当的基础上，不是漂着的。' },
              { title: '木旺的人怎么歇', body: '木旺的人不容易停，脑子里总有下一件事。你要是想让她歇一歇，别说「你休息一下」，说「我们去看看那棵树」，她可能就真的停下来了。' },
            ] },
          ],
          traits: [
            { text: '不吵架，但过两天还是按自己的来', basis: '八字日主乙木', verdict: 'hit' },
            { text: '别替她做决定，哪怕小事', basis: '八字月柱乙卯木旺', verdict: 'miss' },
            { text: '对「自己的地方」看得重', basis: '八字日柱乙未', verdict: null },
            { text: '热情不外露，暖色的东西可能慢慢喜欢上', basis: '八字五行火弱', verdict: null },
          ],
        },
        synastry: {
          inputHash: synHash, model, updatedAt: now - day,
          rounds: [{ createdAt: now - day, sections: [
            { title: '合得来的地方', body: '你的太阳狮子，她的月亮摩羯，一个爱亮着，一个稳得住，狮子的火照得着摩羯的土。八字上你日主丙火，她乙木，木生火，她可能是那个默默给你添柴的人。' },
            { title: '可能得多商量的地方', body: '你们俩在「做决定的快慢」上可能得多商量：你灵数 1，说干就干；她灵数 4，得先把表排好。' },
            { title: '三条建议', body: '一、约她的事提前说，别临时改。二、她安静的时候别追问，坐着就行。三、你的热情她接得住，但要给她时间回应。' },
            { title: '放在一起是什么样', body: '一盏灯和一棵树：灯亮着，树慢慢往灯那边长。' },
          ] }],
          traits: [],
        },
      };
      const guide = {
        inputHash: hash, model, updatedAt: now - 2 * day, sourceStamp: 'old-stamp',
        character: [{ text: '嘴上说随便，心里早排好了时间表', source: '总论' }, { text: '主意正，认准了就不松手', source: '八字' }, { text: '接别人的情绪快，自己的事藏着', source: '总论' }],
        getAlong: [{ text: '别替她做决定，哪怕是点什么菜', source: '八字' }, { text: '约好的事别临时改时间', source: '总论' }, { text: '她安静的时候坐着陪就行，别追问', source: '合盘' }],
        topics: [{ text: '问问她最近想把哪个角落收拾一下', source: '八字' }, { text: '聊一棵树、一条河这类慢慢长的东西', source: '八字' }, { text: '聊她怎么安排一个周末', source: '总论' }],
        gifts: [{ name: '暖色的桌面小灯', category: 'item', tier: 'like', source: '八字' }, { name: '木质收纳盒', category: 'item', tier: 'like', source: '八字' }, { name: '一起去植物园', category: 'activity', tier: 'love', source: '合盘' }],
      };
      p.preferences = [...p.preferences, ...guide.gifts.map((g, i) => ({ id: 'g' + i, name: g.name, category: g.category, tier: g.tier, note: `${g.source}章`, source: 'fortune', createdAt: now }))];
      p.fortune = { inputHash: hash, basis: { birth: JSON.stringify(p.birth), relation: p.relation, promptVersion: 3 }, createdAt: now - 2 * day, rejected: ['别替她做决定，哪怕小事'], hits: 2, misses: 1, lastAskedAt: now - 3600000,
        data: { likesWritten: true, reading: { dialogue: [], traits: [], guessedLikes: [], tips: [], topics: [], systems: { zodiac: null, numerology: null, bazi: null, natal: null } }, book: { chapters, guide } } };
    }
    store.put(p);
  }
  await new Promise((res) => (tx.oncomplete = res));
  localStorage.setItem('renqing.apiKey', 'sk-ant-placeholder-for-screenshots');
}, { ids });

// 设置：打开 AI，看两个模型下拉
await page.goto(BASE + '#/settings');
await page.reload();
await page.waitForSelector('text=AI 助手');
await page.getByRole('switch').first().click();
await page.waitForTimeout(400);
await page.getByText('命书 / 合盘用的模型').scrollIntoViewIfNeeded();
await page.evaluate(() => window.scrollBy(0, 120));
await page.waitForTimeout(200);
await shot('book-00-settings-models');

// 占卜屋
await page.goto(BASE + '#/fortune');
await page.waitForSelector('text=翻谁的命书');
await page.getByRole('button', { name: /小雨/ }).click();
await page.waitForTimeout(1800);
await shot('book-01-fortune-room');

// 目录
await page.getByRole('button', { name: /翻开 小雨 的命书/ }).click();
await page.waitForSelector('text=小雨的命书');
await page.waitForTimeout(300);
await page.getByText('小雨的命书').scrollIntoViewIfNeeded();
await page.evaluate(() => window.scrollBy(0, -110));
await page.waitForTimeout(200);
await shot('book-02-toc');
await page.evaluate(() => window.scrollBy(0, 300));
await page.waitForTimeout(200);
await shot('book-03-toc-bottom');

// 八字章（两轮 + 准不准）
await page.getByRole('button', { name: /第三章/ }).click();
await page.waitForTimeout(150);
await shot('book-04-flip');
await page.waitForTimeout(500);
await page.getByText('八字', { exact: false }).first().scrollIntoViewIfNeeded();
await page.evaluate(() => window.scrollBy(0, -110));
await shot('book-05-chapter-bazi');
await page.getByText('第 2 次讲').scrollIntoViewIfNeeded();
await page.evaluate(() => window.scrollBy(0, -120));
await page.waitForTimeout(200);
await shot('book-06-chapter-round2');
await page.getByText('这章的性格特点').scrollIntoViewIfNeeded();
await page.evaluate(() => window.scrollBy(0, -120));
await page.waitForTimeout(200);
await shot('book-07-chapter-traits');

// 相处指南（有新内容）
await page.getByLabel('回目录').click();
await page.waitForTimeout(600);
await page.getByRole('button', { name: /第七章/ }).click();
await page.waitForTimeout(600);
await page.getByText('第七章 · 相处指南').scrollIntoViewIfNeeded();
await page.evaluate(() => window.scrollBy(0, -110));
await shot('book-08-guide');
const giftTitle = page.locator('div', { hasText: /^送礼方向$/ }).last(); console.log('gift count', await giftTitle.count()); if (!(await giftTitle.count())) console.log(await page.evaluate(() => document.body.innerText.slice(-600))); await giftTitle.scrollIntoViewIfNeeded();
await page.evaluate(() => window.scrollBy(0, -120));
await page.waitForTimeout(200);
await shot('book-09-guide-gifts');

// 喜好 Tab：星婆婆的猜测
await page.goto(BASE + `#/person/${ids.xiaoyu}?tab=prefs`);
await page.waitForTimeout(500);
const guess = page.getByText(/猜测/).first();
if (await guess.count()) { await guess.scrollIntoViewIfNeeded(); await page.evaluate(() => window.scrollBy(0, -110)); }
await shot('book-10-prefs-guesses');

// 陈默：只有月日 → 缺 X 才能翻开
await page.goto(BASE + `#/person/${ids.chenmo}?tab=fortune`);
await page.waitForSelector('text=陈默的命书');
await page.waitForTimeout(300);
await page.evaluate(() => { const el = [...document.querySelectorAll('span')].find((x) => x.textContent === '第二章'); el?.scrollIntoView({ block: 'center' }); });
await page.waitForTimeout(200);
await shot('book-11-toc-missing');

// 我的命书
await page.goto(BASE + `#/person/${ids.me}?tab=fortune`);
await page.waitForSelector('text=我的命书');
await page.waitForTimeout(300);
await page.evaluate(() => { const el = [...document.querySelectorAll('span')].find((x) => x.textContent === '第二章'); el?.scrollIntoView({ block: 'center' }); });
await page.waitForTimeout(200);
await shot('book-12-toc-me');
await browser.close();
