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
    ['home', '주머니 속 친구들이<br>불시에 뿡!'],
    ['friend', '간식 주고 쓰다듬고<br>내 목소리도 장착'],
    ['records', '소리면 대담, 진동이면 소심<br>무음이면 꾹참!'],
    ['diary', '오늘 하루는<br>그림일기 한 장으로'],
    ['night', '밤엔 모닥불 아래<br>도토리로 아지트 꾸미기']
  ],
  en: [
    ['home', 'Your pocket friends<br>toot by surprise!'],
    ['friend', 'Feed, pat, and give them<br>your own voice'],
    ['records', 'Sound = bold · Vibrate = shy<br>Silent = held in!'],
    ['diary', 'Wrap up the day<br>in a picture diary'],
    ['night', 'Campfire nights and<br>a hideout to decorate']
  ]
};
const FEATURE = {
  ko: { title: '방구뿡', sub: '주머니 속 다마고치가 불시에 뿡!' },
  en: { title: 'Pocket Toot', sub: 'Pocket pets that toot by surprise!' }
};

// 보기 좋은 예시 기록 (지난 7일)
function demoState(lang) {
  const days = {};
  const counts = [[2, 1, 3], [1, 2, 4], [3, 0, 2], [0, 1, 5], [2, 2, 3], [1, 0, 6], [2, 1, 4]];
  counts.forEach(([loud, soft, hold], i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days[k] = { loud, soft, hold, tap: 0 };
  });
  return {
    onboarded: true,
    friends: { hamster: { on: true, style: 'loud', bond: 13 }, tit: { on: true, style: 'main', bond: 7 }, cat: { on: true, style: 'main', bond: 9 } },
    theme: 'meadow',
    placed: ['tent', 'sunflower', 'balloon', 'bench', 'box', 'mat', 'campfire', 'carrot', 'churu'],
    owned: ['mat'],
    acorns: 128,
    days,
    fed: true,
    diary: { weather: 0, note: lang === 'ko' ? '회의 중에 꾹 참았다! 아무도 몰랐지 헤헤' : 'Held it in all through the meeting. Nobody knew!', saves: 3 },
    seenTreasures: ['acorn', 'sweet_potato', 'whoopee', 'trophy', 'stamp', 'key', 'mat', 'spray'],
    tips: [],
    sentConfig: 'demo'
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
    localStorage.setItem('bgbb.v1', s);
    // 앱 안에서 보이는 모습으로 찍는다 (브라우저용 안내 문구 대신 앱 문구)
    window.BgbbNative = {
      configure() {}, drainEvents: () => '[]', remainingToday: () => 2, appVersion: () => '1.0.0',
      loadTips() {}, buyTip() {}, fireNow() {}, saveCustomSound: () => true, openUrl() {}, sendFeedback() {}, resetAll() {}
    };
  }, JSON.stringify(demoState(lang)));
  await page.goto(base);
  await page.waitForTimeout(2500);   // 친구들이 자리 잡을 때까지
  const shots = {};
  const shot = async name => { shots[name] = await page.screenshot(); };

  await shot('home');
  // 아지트를 훑어 눌러서 친구 시트가 열리는 곳을 찾는다
  const isOpen = () => page.evaluate(() => document.getElementById('friendSheet').open);
  for (let y = 120; y < 420 && !(await isOpen()); y += 16) {
    for (let x = 30; x < 340 && !(await isOpen()); x += 16) await page.mouse.click(x, y);
  }
  await page.waitForTimeout(600);
  await shot('friend');
  await page.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
  await page.click('.tab[data-screen="records"]');
  await page.waitForTimeout(400);
  await shot('records');
  await page.click('.tab[data-screen="diary"]');
  await page.waitForTimeout(1200);
  await shot('diary');
  await page.click('.tab[data-screen="home"]');
  await page.click('#openDecor');
  await page.click('#themes [data-t="night"]');
  await page.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
  await page.waitForTimeout(1500);
  await shot('night');
  await page.close();
  return shots;
}

async function compose(lang, shots) {
  await fs.mkdir(path.join(OUT, lang), { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  // 글꼴은 data URL 로 직접 넣는다 (다른 출처 글꼴은 CORS 때문에 막힌다)
  const jua = (await fs.readFile(path.join(ROOT, 'assets/fonts/jua.woff2'))).toString('base64');
  const font = `@font-face{font-family:Jua;src:url(data:font/woff2;base64,${jua}) format('woff2')}`;
  for (const [i, [name, caption]] of CAPTIONS[lang].entries()) {
    const img = `data:image/png;base64,${shots[name].toString('base64')}`;
    await page.setContent(`<style>${font}
      body{margin:0;width:1080px;height:1920px;background:#FED36A;font-family:Jua;display:flex;flex-direction:column;align-items:center;overflow:hidden}
      h1{font-weight:normal;font-size:76px;line-height:1.25;text-align:center;color:#282523;margin:0 40px;height:330px;display:flex;align-items:center;justify-content:center}
      img{width:810px;border:8px solid #282523;border-radius:48px;box-shadow:14px 18px 0 #282523}
    </style><h1>${caption}</h1><img src="${img}">`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(OUT, lang, `screen-${i + 1}-${name}.png`) });
  }
  // 대표 그림 1024×500
  await page.setViewportSize({ width: 1024, height: 500 });
  const f = FEATURE[lang];
  const pic = n => `${base}/assets/${n}.webp`;
  await page.setContent(`<style>${font}
    body{margin:0;width:1024px;height:500px;background:linear-gradient(#9FD8F7,#E3F4FB 62%,#B8E39A 62%,#8CCB6E);font-family:Jua;position:relative;overflow:hidden}
    h1{position:absolute;left:60px;top:70px;margin:0;font-weight:normal;font-size:110px;color:#282523}
    p{position:absolute;left:64px;top:215px;margin:0;font-size:40px;color:#282523;background:#FFF;border:5px solid #282523;border-radius:24px;padding:8px 22px;box-shadow:6px 8px 0 #282523}
    img{position:absolute;bottom:40px}
  </style><h1>${f.title}</h1><p>${f.sub}</p>
    <img src="${pic('tit')}" style="left:655px;height:130px">
    <img src="${pic('hamster')}" style="left:745px;height:200px">
    <img src="${pic('cat')}" style="left:870px;height:170px">`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, lang, 'feature.png') });
  await page.close();
}

for (const lang of ['ko', 'en']) await compose(lang, await captureScreens(lang));
await browser.close();
server.close();
console.log('docs/store 에 저장했어요');
