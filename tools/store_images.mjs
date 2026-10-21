// Play 스토어 이미지 만들기: 진짜 앱 화면을 찍어 문구를 얹는다.
//   npm i -D playwright && npx playwright install chromium   (처음 한 번)
//   npm run store-images
// 결과: docs/store/{ko,en}/screen-*.png (1080×1920), docs/store/{ko,en}/feature.png (1024×500)
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/store');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.wav': 'audio/wav', '.woff2': 'font/woff2', '.png': 'image/png' };

const CAPTIONS = {
  ko: [
    ['home', '평소엔 조용함.<br>언제 터질지는 아무도 모름'],
    ['burst', '터지면 그 순간이<br>속보가 됨'],
    ['card', '칭호 받으면<br>스토리에 바로 퍼뜨리기'],
    ['dex', '회의실 테러범부터<br>새벽의 암살자까지 45개'],
    ['hold', '무음이면 참음.<br>소리 모드면… 진짜 남']
  ],
  en: [
    ['home', 'Quiet most of the time.<br>Nobody knows when'],
    ['burst', 'When it goes off,<br>it’s breaking news'],
    ['card', 'Earn a title,<br>post the news card'],
    ['dex', '45 titles.<br>Collect them all'],
    ['hold', 'Silent? Held in.<br>Sound mode? It’s real']
  ]
};
const FEATURE = {
  ko: { title: '방구뿡', sub: '주머니 속 셋이 아무 때나 뿡' },
  en: { title: 'Pocket Toot', sub: 'Three pocket pals. Toots, whenever.' }
};

// 보기 좋은 예시 기록 (지난 7일, 칭호 몇 개)
function demoState() {
  const days = {};
  const counts = [[2, 1, 3], [1, 2, 4], [3, 0, 2], [0, 1, 5], [2, 2, 3], [1, 0, 6], [1, 0, 1]];
  counts.forEach(([loud, soft, hold], i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days[k] = { loud, soft, hold, chars: ['hamster', 'cat'], last: 'hold' };
  });
  const t = Date.now() - 86400e3;
  const ev = (char, mode) => ({ t, char, mode });
  const titles = {};
  for (const [id, char, mode, n] of [['meeting_hold', 'cat', 'hold', 2], ['dawn_quiet', 'tit', 'soft', 1], ['hold3', 'cat', 'hold', 3],
    ['broke', 'hamster', 'loud', 1], ['streak7', 'hamster', 'hold', 1], ['afternoon', 'tit', 'soft', 6], ['hold_basic', 'cat', 'hold', 9],
    ['first_today', 'hamster', 'loud', 5], ['cat', 'cat', 'hold', 4], ['tit_soft', 'tit', 'soft', 2], ['morning', 'hamster', 'soft', 3]])
    titles[id] = { n, first: t - 6 * 86400e3, last: ev(char, mode) };
  return {
    onboarded: true, hero: 'hamster', days, titles,
    recent: [{ ...ev('hamster', 'loud'), title: 'broke' }],
    tips: [], sentConfig: 'demo'
  };
}

const server = http.createServer(async (req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(ROOT, u === '/' ? 'index.html' : u);
  try {
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(await fs.readFile(file));
  } catch {
    res.writeHead(404);
    res.end();
  }
}).listen(0);
const base = `http://localhost:${server.address().port}`;

const browser = await chromium.launch();

async function captureScreens(lang) {
  const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, locale: lang === 'ko' ? 'ko-KR' : 'en-US' });
  await page.addInitScript(s => {
    localStorage.setItem('bgbb.v2', s);
    // 앱 안에서 보이는 모습으로 찍는다. 터지는 화면용 기록은 window.__events 로 넣는다.
    window.__events = [];
    window.BgbbNative = {
      configure() {}, drainEvents: () => JSON.stringify(window.__events.splice(0)), remainingToday: () => 3, appVersion: () => '2.0.0',
      setNotify() {}, notificationsAllowed: () => true, requestNotifications: () => true,
      loadTips() {}, buyTip() {}, fireNow() {}, saveCustomSound: () => true, openUrl() {}, sendFeedback() {}, resetAll() {},
      saveAndShareImage: () => true
    };
  }, JSON.stringify(demoState()));
  await page.goto(base);
  await page.waitForTimeout(800);
  const shots = {};
  const shot = async name => { shots[name] = await page.screenshot(); };
  const fire = async (char, mode, hour) => {
    await page.evaluate(([char, mode, hour]) => {
      const d = new Date();
      d.setHours(hour, 7, 0, 0);
      window.__events.push({ t: d.getTime(), char, mode });
      window.bgbbOnNativeResume();
    }, [char, mode, hour]);
    await page.waitForTimeout(1800);   // 애니메이션 끝까지
  };

  await shot('home');
  // 평일 회의 시간에 소리 모드 → 회의실 테러범 (레전드). 오늘이 주말이면 다른 칭호가 나올 수 있다.
  await fire('hamster', 'loud', 14);
  await shot('burst');
  await page.evaluate(() => document.getElementById('burst').close());
  await fire('cat', 'hold', 10);
  await shot('hold');
  await page.evaluate(() => document.getElementById('burst').close());
  await page.click('.tab[data-screen="dex"]');
  await page.waitForTimeout(400);
  await shot('dex');
  // 속보 카드는 앱이 그리는 1080×1920 그림을 그대로 쓴다
  const card = await page.evaluate(async () => {
    const { drawCard } = await import('/src/card.js');
    const { composeMeme } = await import('/src/memes.js');
    const canvas = document.getElementById('card');
    const d = new Date();
    d.setHours(14, 7, 0, 0);
    const ko = document.documentElement.lang === 'ko';
    let meme;   // 방구 구름이 나오는 조립형 짤이 나올 때까지
    do { meme = composeMeme({ id: 'hamster', mode: 'loud', t: d.getTime(), title: ko ? '회의실 테러범' : 'Meeting Room Menace', rarity: 'legend' }); }
    while (meme.name !== 'assembled' || !meme.items.some(it => it.src?.includes('fart_bubble')));
    await drawCard(canvas, {
      meme,
      ev: { t: d.getTime(), char: 'hamster', mode: 'loud' },
      title: document.documentElement.lang === 'ko' ? '회의실 테러범' : 'Meeting Room Menace',
      rarity: document.documentElement.lang === 'ko' ? '레전드' : 'Legend',
      owned: 12, all: 45, nth: 2, streak: 7,
      headline: document.documentElement.lang === 'ko' ? '햄찌, 끝내 참지 못해' : 'Hammy finally lets one go',
      caption: document.documentElement.lang === 'ko' ? '방금 그거 뭐임' : 'what was that'
    });
    return canvas.toDataURL('image/png').split(',')[1];
  });
  shots.card = Buffer.from(card, 'base64');
  await page.close();
  return shots;
}

async function compose(lang, shots) {
  await fs.mkdir(path.join(OUT, lang), { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  // 글꼴은 data URL 로 직접 넣는다 (다른 출처 글꼴은 CORS 때문에 막힌다)
  const bhs = (await fs.readFile(path.join(ROOT, 'assets/fonts/blackhansans.woff2'))).toString('base64');
  const font = `@font-face{font-family:BHS;src:url(data:font/woff2;base64,${bhs}) format('woff2')}`;
  for (const [i, [name, caption]] of CAPTIONS[lang].entries()) {
    const img = `data:image/png;base64,${shots[name].toString('base64')}`;
    const isCard = name === 'card';
    await page.setContent(`<style>${font}
      body{margin:0;width:1080px;height:1920px;background:${i % 2 ? '#111' : '#D7FF3D'};font-family:BHS;display:flex;flex-direction:column;align-items:center;overflow:hidden}
      h1{font-weight:normal;font-size:78px;line-height:1.2;text-align:center;color:${i % 2 ? '#D7FF3D' : '#111'};margin:0 40px;height:330px;display:flex;align-items:center;justify-content:center;letter-spacing:-1px}
      img{width:810px;border:8px solid #111;border-radius:48px;box-shadow:0 0 0 6px #fff}
    </style><h1>${caption}</h1><img src="${img}" style="${isCard ? 'width:860px;border-radius:24px' : ''}">`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(OUT, lang, `screen-${i + 1}-${name}.png`) });
  }
  // 대표 그림 1024×500
  await page.setViewportSize({ width: 1024, height: 500 });
  const f = FEATURE[lang];
  const pic = n => `${base}/assets/faces/${n}.webp`;
  await page.setContent(`<style>${font}
    body{margin:0;width:1024px;height:500px;background:#D7FF3D;font-family:BHS;position:relative;overflow:hidden}
    h1{position:absolute;left:60px;top:60px;margin:0;font-weight:normal;font-size:120px;color:#fff;-webkit-text-stroke:8px #111;paint-order:stroke fill}
    p{position:absolute;left:0;top:300px;margin:0;font-family:system-ui,sans-serif;font-weight:900;font-size:36px;color:#111;background:#fff;padding:14px 30px 14px 150px}
    p::before{content:'${lang === 'ko' ? '속보' : 'NEWS'}';position:absolute;left:0;top:0;bottom:0;width:120px;background:#E8261C;color:#fff;display:flex;align-items:center;justify-content:center}
    img{position:absolute;bottom:40px;filter:drop-shadow(4px 0 0 #fff) drop-shadow(-4px 0 0 #fff) drop-shadow(0 4px 0 #fff) drop-shadow(0 -4px 0 #fff)}
  </style><h1>${f.title}</h1><p>${f.sub}</p>
    <img src="${pic('tit_whistle')}" style="left:600px;height:210px;bottom:250px">
    <img src="${pic('hamster_thumbs_up')}" style="left:660px;height:320px;bottom:-10px">
    <img src="${pic('cat_shameless')}" style="left:820px;height:250px;bottom:190px">`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, lang, 'feature.png') });
  await page.close();
}

for (const lang of ['ko', 'en']) await compose(lang, await captureScreens(lang));
await browser.close();
server.close();
console.log('docs/store 에 저장했어요');
