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

// 캡션도 앱처럼 일부러 틀린 칭찬을 섞는다 (데단해 · 채고야 · GRAET …)
const CAPTIONS = {
  ko: [
    ['home', '언제 뿡할지<br>아무도 모름. 채고야'],
    ['legend', '칭호 따면<br>구린 PPT로 축하해줌'],
    ['burst', '터진 순간이<br>짤이 됨. 데단해'],
    ['jackpot', '0.5% 잭팟 뚫으면<br>돈폭탄 GRAET'],
    ['shop', '배경 · 소품 · 착용<br>가진 것 중 랜덤 난장판'],
    ['rest', '회의 시간엔 쫄?<br>소리 · 진동 일체 없음'],
    ['dex', '칭호 56개 다 모으면<br>당신을 천제입니까?']
  ],
  en: [
    ['home', 'Nobody knows<br>when. AWASOME'],
    ['legend', 'Earn a title,<br>get a cringe PPT'],
    ['burst', 'Every toot<br>becomes a meme'],
    ['jackpot', 'Hit the 0.5% jackpot.<br>Money bomb. GRAET'],
    ['shop', 'Your stuff,<br>randomly shuffled'],
    ['rest', 'Meeting? Chicken hours.<br>No sound, no buzz'],
    ['dex', 'Collect all 56.<br>Are you genious?']
  ]
};
const FEATURE = {
  ko: { title: '방구뿡', sub: '★★★ 아무 때나 뿡 ★★★ 데단해 ★★★ 채고야 ★★★ 정말굉장한걸? ★★★', sticker: 'GRAET' },
  en: { title: 'Pocket Toot', sub: '★★★ TOOTS WHENEVER ★★★ AWASOME ★★★ EXCELENT ★★★ GRAET ★★★', sticker: 'WONDREFUL' }
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
  for (const [id, char, mode, n] of [['meeting_hold', 'cat', 'hold', 2], ['night_quiet', 'tit', 'soft', 1], ['hold3', 'cat', 'hold', 3],
    ['broke', 'hamster', 'loud', 1], ['streak7', 'hamster', 'hold', 1], ['afternoon', 'tit', 'soft', 6], ['hold_basic', 'cat', 'hold', 9],
    ['first_today', 'hamster', 'loud', 5], ['cat', 'cat', 'hold', 4], ['tit_soft', 'tit', 'soft', 2], ['morning', 'hamster', 'soft', 3]])
    titles[id] = { n, first: t - 6 * 86400e3, last: ev(char, mode) };
  return {
    onboarded: true, hero: 'hamster', days, titles,
    recent: [{ ...ev('hamster', 'loud'), title: 'broke' }],
    tips: [], sentConfig: 'demo', coins: 186,
    bought: Object.fromEntries(['bg_office', 'bg_minihompy', 'bg_vapor', 'bg_error', 'prop_whoopee', 'prop_megaphone', 'prop_spray', 'prop_sweetpotato',
      'prop_milk', 'bubble_katalk', 'bubble_shout', 'bubble_torn', 'wear_3d', 'fx_sparkle'].map(id => [id, true])),
    schedule: { on: true, start: 6, end: 0, rest: { on: true, from: 14 * 60, to: 15 * 60 } },
    equip: { bg: 'bg_minihompy', prop: 'prop_megaphone', bubble: 'bubble_shout' }
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
      configure() {}, drainEvents: () => JSON.stringify(window.__events.splice(0)), remainingToday: () => 3, appVersion: () => '2.1.0',
      soundStatus: () => JSON.stringify({ mode: 'loud', vol: 9, max: 15 }), deviceMode: () => 'loud', setMediaMuted() {}, setDim() {}, setKeepAwake() {}, takeResumed: () => false,
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

  const closeAll = () => page.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
  const ko = lang === 'ko';
  await shot('home');
  // 획득 팝업은 직접 띄운다 (등급을 고를 수 있게). 애니메이션이 다 끝난 뒤 찍는다
  const cele = async (name, info) => {
    await closeAll();
    await page.evaluate(async info => (await import('/src/cele.js')).celebrateTitle(info, () => {}), info);
    await page.waitForTimeout(3200);
    await shot(name);
  };
  const info0 = { when: '14:07', mode: ko ? '냄' : 'Out loud', dex: 12, all: 56, unlocked: [] };
  await cele('legend', { ...info0, tier: 'legend', char: 'cat', title: ko ? '회의실 테러범' : 'Meeting Room Menace', coins: 40 });
  await cele('jackpot', { ...info0, tier: 'jackpot', char: 'hamster', title: ko ? '돈 뿌리는 엉덩이' : 'Make It Rain', coins: 100 });
  await closeAll();
  // 짤 화면: 짤 뽑기에서 레전드 짤이 나올 때까지 (하루 3번). 첫 랜덤을 낮게 줘서 레전드 쪽으로 민다
  for (let i = 0; i < 3; i++) {
    await closeAll();
    await page.evaluate(() => {
      const real = Math.random;
      let n = 0;
      Math.random = () => (n++ < 40 ? real() * 0.05 : real());
      setTimeout(() => { Math.random = real; }, 300);
    });
    await page.click('#practice');
    await page.waitForTimeout(1800);
    if (await page.evaluate(() => document.getElementById('burstChip').textContent.match(/레전드|Legend/))) break;
  }
  await shot('burst');
  await closeAll();
  await page.waitForTimeout(500);   // 짤을 닫으면 칭호로 열린 아이템 상자깡이 뜰 수 있다
  await closeAll();
  await page.click('.tab[data-screen="shop"]');
  await page.waitForTimeout(400);
  await shot('shop');
  await page.click('.tab[data-screen="home"]');
  await page.waitForTimeout(300);
  await page.click('#tabSettings');   // 쫄? 버튼은 설정 안에 있다
  await page.waitForTimeout(400);
  await page.click('#restOpen');
  await page.waitForTimeout(600);
  await page.evaluate(() => document.getElementById('settingsSheet').close());
  await page.waitForTimeout(200);
  await shot('rest');
  await closeAll();
  await page.click('.tab[data-screen="dex"]');
  await page.waitForTimeout(400);
  await shot('dex');
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
    await page.setContent(`<style>${font}
      body{margin:0;width:1080px;height:1920px;background:${i % 2 ? '#111' : '#D7FF3D'};font-family:BHS;display:flex;flex-direction:column;align-items:center;overflow:hidden}
      h1{font-weight:normal;font-size:78px;line-height:1.2;text-align:center;color:${i % 2 ? '#D7FF3D' : '#111'};margin:0 40px;height:330px;display:flex;align-items:center;justify-content:center;letter-spacing:-1px}
      img{width:810px;border:8px solid #111;border-radius:48px;box-shadow:0 0 0 6px #fff}
    </style><h1>${caption}</h1><img src="${img}">`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(OUT, lang, `screen-${i + 1}-${name}.png`) });
  }
  // 대표 그림 1024×500
  await page.setViewportSize({ width: 1024, height: 500 });
  const f = FEATURE[lang];
  const real = n => `${base}/assets/faces_real/${n}.webp`;
  const deco = n => `${base}/assets/deco/${n}.webp`;
  const shades = `${base}/assets/faces/sunglasses.png`;
  // 구린 PPT 감성: 무지개 배경 · 금색 워드아트 + 반사 · 파란 전광판 · 흰 테두리 실사 스티커 · 지폐
  await page.setContent(`<style>${font}
    body{margin:0;width:1024px;height:500px;background:linear-gradient(120deg,#22C8FF,#2EFF6A,#FFE600,#FF7A2E,#FF00C8);font-family:BHS;position:relative;overflow:hidden}
    .t{position:absolute;left:44px;top:40px;font-size:${lang === 'ko' ? 150 : 92}px;line-height:1;background:linear-gradient(180deg,#FFF6B0,#E3B320 55%,#7A5600);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-stroke:2px #4A3600;white-space:nowrap}
    .t.m{top:${lang === 'ko' ? 262 : 196}px;transform:scaleY(-1);opacity:.2;height:60px;overflow:hidden}
    .bar{position:absolute;left:0;right:0;top:300px;height:64px;background:#0000AA;border-block:4px ridge #C0C0C0;color:#FFFF00;font-family:system-ui,sans-serif;font-weight:900;font-size:30px;line-height:58px;white-space:nowrap;overflow:hidden}
    .s{position:absolute;filter:drop-shadow(6px 0 0 #fff) drop-shadow(-6px 0 0 #fff) drop-shadow(0 6px 0 #fff) drop-shadow(0 -6px 0 #fff) drop-shadow(8px 10px 0 rgba(0,0,0,.35))}
    .w{position:absolute}.w img{display:block;width:100%}.w .g{position:absolute;left:24%;top:37%;width:52%;image-rendering:pixelated}
    .k{position:absolute;font-size:64px;color:#FF2EA6;-webkit-text-stroke:3px #111;paint-order:stroke fill;transform:rotate(-12deg)}
    .new{position:absolute;left:60px;top:400px;padding:6px 18px;background:#f00;color:#fff;font-family:system-ui,sans-serif;font-weight:900;font-size:34px;border:4px outset #F99}
  </style>
    <img src="${deco('stars')}" style="position:absolute;left:560px;top:20px;width:90px">
    <span class="t">${f.title}</span><span class="t m" aria-hidden="true">${f.title}</span>
    <div class="bar">${f.sub}${f.sub}</div>
    <img src="${deco('money_bill')}" style="position:absolute;left:640px;top:220px;width:130px;transform:rotate(-24deg)">
    <img src="${deco('money_bill')}" style="position:absolute;left:470px;top:380px;width:110px;transform:rotate(18deg)">
    <div class="w s" style="left:650px;top:40px;width:250px;transform:rotate(-8deg)"><img src="${real('cat_shameless')}"><img class="g" src="${shades}"></div>
    <div class="w s" style="left:790px;top:170px;width:260px;transform:rotate(7deg)"><img src="${real('hamster_thumbs_up')}"><img class="g" src="${shades}"></div>
    <span class="new">NEW!!</span>
    <span class="k" style="left:${lang === 'ko' ? 250 : 300}px;top:390px">${f.sticker}</span>`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, lang, 'feature.png') });
  await page.close();
}

for (const lang of ['ko', 'en']) await compose(lang, await captureScreens(lang));
await browser.close();
server.close();
console.log('docs/store 에 저장했어요');
