// Play 스토어 이미지 만들기: 진짜 앱 화면을 찍어 문구를 얹는다.
//   npm i -D playwright && npx playwright install chromium   (처음 한 번)
//   npm run store-images
// 결과: docs/store/{ko,en}/screen-*.png (1080×1920, 8장 = Play 최대), docs/store/{ko,en}/feature.png (1024×500)
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
    ['alarm', '20번 연타해야<br>꺼지는 방구 알람'],
    ['missions', '매일 미션 3개<br>깨면 뿡코인 GRAET'],
    ['report', '이번 주 방구 결산<br>MVP는 누구?'],
    ['shop', '방구 소리 팩까지<br>모으는 재미'],
    ['dex', '칭호 119개<br>숨김 업적까지 채고야']
  ],
  en: [
    ['home', 'Nobody knows<br>when. AWASOME'],
    ['legend', 'Earn a title,<br>get a cringe PPT'],
    ['burst', 'Every toot<br>becomes a meme'],
    ['alarm', 'A toot alarm you<br>tap 20 times to stop'],
    ['missions', 'Three missions a day.<br>Coins. GRAET'],
    ['report', 'Your week in toots.<br>Who was MVP?'],
    ['shop', 'Collect toot<br>sound packs too'],
    ['dex', '119 titles,<br>hidden ones too']
  ]
};
const FEATURE = {
  ko: {
    title: '방구뿡', combo: 'COMBO x4!!',
    sub: '★★★ 아무 때나 뿡 ★★★ 데단해 ★★★ 채고야 ★★★ 정말굉장한걸? ★★★ GRAET ★★★',
    chips: [['skin/prop/prop_megaphone', '<b>20연타</b><br>방구 알람'], ['skin/prop/prop_trophy', '칭호<br><b>119개</b>'],
      ['shop/sound_drum', '방구<br><b>소리 팩</b>'], ['shop/coins_m', '매일<br><b>미션 3개</b>']]
  },
  en: {
    title: 'Pocket Toot', combo: 'COMBO x4!!',
    sub: '★★★ TOOTS WHENEVER ★★★ AWASOME ★★★ EXCELENT ★★★ GRAET ★★★ WONDREFUL ★★★',
    chips: [['skin/prop/prop_megaphone', '<b>20-tap</b><br>alarm'], ['skin/prop/prop_trophy', '<b>119</b><br>titles'],
      ['shop/sound_drum', 'Sound<br><b>packs</b>'], ['shop/coins_m', '<b>3 daily</b><br>missions']]
  }
};

// 보기 좋은 예시 기록 (지난 7일, 칭호 몇 개)
function demoState() {
  const days = {};
  const counts = [[2, 1, 3], [1, 2, 4], [3, 0, 2], [0, 1, 5], [2, 2, 3], [1, 0, 6], [1, 0, 1]];
  counts.forEach(([loud, soft, hold], i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days[k] = { loud, soft, hold, chars: ['hamster', 'cat', 'tit'], last: 'hold', by: { cat: hold + 1, hamster: loud + 1, tit: soft }, loudH: loud ? [10, 20].slice(0, loud) : [], hours: [8, 12, 15, 19] };
  });
  const t = Date.now() - 86400e3;
  const ev = (char, mode) => ({ t, char, mode });
  const titles = {};
  for (const [id, char, mode, n] of [['meeting_hold', 'cat', 'hold', 2], ['night_quiet', 'tit', 'soft', 1], ['hold3', 'cat', 'hold', 3],
    ['broke', 'hamster', 'loud', 1], ['streak7', 'hamster', 'hold', 1], ['afternoon', 'tit', 'soft', 6], ['hold_basic', 'cat', 'hold', 9],
    ['first_today', 'hamster', 'loud', 5], ['cat', 'cat', 'hold', 4], ['tit_soft', 'tit', 'soft', 2], ['morning', 'hamster', 'soft', 3]])
    titles[id] = { n, first: t - 6 * 86400e3, last: ev(char, mode) };
  return {
    onboarded: true, guideV: 3, rulesSeen: true, seenVersion: '2.4.3', reportSeen: '', hero: 'hamster', days, titles,
    recent: [{ ...ev('hamster', 'loud'), title: 'broke' }],
    tips: [], sentConfig: 'demo', coins: 186,
    bought: Object.fromEntries(['bg_office', 'bg_minihompy', 'prop_whoopee', 'prop_megaphone', 'prop_spray', 'prop_sweetpotato',
      'prop_milk', 'bubble_katalk', 'bubble_shout', 'bubble_torn', 'wear_3d', 'fx_sparkle', 'sound_drum', 'sound_halloween'].map(id => [id, true])),
    equip: { bg: 'bg_minihompy', prop: 'prop_megaphone', bubble: 'bubble_shout', sound: 'sound_drum' },
    daily: { day: new Date().toISOString().slice(0, 10), counts: { tap: 22, gacha: 1 }, claimed: [] },
    schedule: { on: true, start: 6, end: 0, rest: { on: true, from: 14 * 60, to: 15 * 60 }, wake: { on: true, at: 7 * 60 + 30, days: [false, true, true, true, true, true, false], once: 0 } }
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
      configure() {}, drainEvents: () => JSON.stringify(window.__events.splice(0)), remainingToday: () => 3, appVersion: () => '2.4.3',
      effectsAllowed: () => true, exactAllowed: () => true, wakeRinging: () => !!window.__ring, stopWake() {}, snoozeWake() {}, adReady: () => true,
      setWidgetInfo() {}, playToot() {}, previewPack() {}, requestReview() {}, checkUpdate() {},
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
  // 앱을 열면 지난주 결산이 먼저 뜬다 (reportSeen 비움)
  await page.waitForTimeout(900);
  await shot('report');
  await closeAll();
  await page.waitForTimeout(400);
  await shot('home');
  // 획득 팝업은 직접 띄운다 (등급을 고를 수 있게). 애니메이션이 다 끝난 뒤 찍는다
  const cele = async (name, info) => {
    await closeAll();
    await page.evaluate(async info => (await import('/src/cele.js')).celebrateTitle(info, () => {}), info);
    await page.waitForTimeout(3200);
    await shot(name);
  };
  const info0 = { when: '14:07', mode: ko ? '냄' : 'Out loud', dex: 12, all: 119, unlocked: [] };
  await cele('legend', { ...info0, tier: 'legend', char: 'cat', title: ko ? '회의실 테러범' : 'Meeting Room Menace', coins: 40 });
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
  // 오늘의 미션
  await page.click('#topMission');
  await page.waitForTimeout(500);
  await shot('missions');
  await closeAll();
  // 기상 알람: 한창 연타하는 중 (FX 가 날아다니는 순간)
  await page.evaluate(() => { window.__ring = true; window.bgbbOnWake(); });
  await page.waitForTimeout(700);
  for (let i = 0; i < 13; i++) { await page.click('#waOk'); await page.waitForTimeout(95); }
  await page.waitForTimeout(60);
  await shot('alarm');
  await page.evaluate(() => { window.__ring = false; });
  await closeAll();
  await page.waitForTimeout(300);
  // 꾸미기: 방구 소리 칸
  await page.click('.tab[data-screen="shop"]');
  await page.waitForTimeout(400);
  await page.click('.chip[data-s="sound"]');
  await page.waitForTimeout(400);
  await shot('shop');
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
  await page.close();
}

// 대표 그림 1024×500: 구린 PPT 무지개 + 워드아트는 그대로, v2.4 기능 네 개(알람 20연타 · 칭호 119 · 소리 팩 · 미션)를 클립아트 상자로,
// 오른쪽엔 알람 20연타 FX 처럼 터지는 셋 + 날아다니는 소품 · 동전 · 콤보 글자
async function feature(lang) {
  await fs.mkdir(path.join(OUT, lang), { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1024, height: 500 } });
  const bhs = (await fs.readFile(path.join(ROOT, 'assets/fonts/blackhansans.woff2'))).toString('base64');
  const font = `@font-face{font-family:BHS;src:url(data:font/woff2;base64,${bhs}) format('woff2')}`;
  const f = FEATURE[lang];
  const a = n => `${base}/assets/${n}.webp`;
  const shades = `${base}/assets/faces/sunglasses.png`;
  const chip = ([icon, text], i) => `<div class="c" style="transform:rotate(${[-2, 1.5, 1, -1.5][i]}deg)"><img src="${a(icon)}"><span>${text}</span></div>`;
  const fly = (src, x, y, w, r) => `<img class="fly" src="${a(src)}" style="left:${x}px;top:${y}px;width:${w}px;transform:rotate(${r}deg)">`;
  const face = (n, x, y, w, r, z) => `<div class="w s" style="left:${x}px;top:${y}px;width:${w}px;transform:rotate(${r}deg);z-index:${z}"><img src="${a('faces_real/' + n)}"><img class="g" src="${shades}"></div>`;
  await page.setContent(`<style>${font}
    body{margin:0;width:1024px;height:500px;background:linear-gradient(120deg,#22C8FF,#2EFF6A,#FFE600,#FF7A2E,#FF00C8);font-family:BHS;position:relative;overflow:hidden}
    .rays{position:absolute;left:790px;top:200px;width:1400px;height:1400px;margin:-700px 0 0 -700px;background:repeating-conic-gradient(rgba(255,255,255,.34) 0 9deg,transparent 9deg 18deg);border-radius:50%}
    .ring{position:absolute;border-radius:50%;border:10px solid;transform:translate(-50%,-50%)}
    .t{position:absolute;left:40px;top:22px;font-size:${lang === 'ko' ? 136 : 80}px;line-height:1;background:linear-gradient(180deg,#FFF6B0,#E3B320 55%,#7A5600);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-stroke:2px #4A3600;white-space:nowrap;filter:drop-shadow(4px 5px 0 rgba(0,0,0,.35))}
    .new{position:absolute;left:${lang === 'ko' ? 410 : 300}px;top:${lang === 'ko' ? 30 : 106}px;padding:4px 14px;background:#f00;color:#ff0;font-family:system-ui,sans-serif;font-weight:900;font-size:28px;border:4px outset #F99;transform:rotate(10deg)}
    .grid{position:absolute;left:40px;top:${lang === 'ko' ? 182 : 170}px;width:520px;display:grid;grid-template-columns:1fr 1fr;gap:14px 16px}
    .c{display:flex;align-items:center;gap:10px;height:${lang === 'ko' ? 92 : 98}px;padding:0 14px;background:linear-gradient(180deg,#FFFFFF,#FFF59A);border:4px outset #E0E0E0;box-shadow:6px 7px 0 rgba(0,0,0,.4);font-size:${lang === 'ko' ? 31 : 30}px;line-height:1.08;color:#111;word-break:keep-all}
    .c img{width:62px;height:62px;object-fit:contain;flex:none}
    .c span b{color:#E0006E;font-weight:normal}
    .w{position:absolute}.w img{display:block;width:100%}.w .g{position:absolute;left:24%;top:37%;width:52%;image-rendering:pixelated}
    .s{filter:drop-shadow(5px 0 0 #fff) drop-shadow(-5px 0 0 #fff) drop-shadow(0 5px 0 #fff) drop-shadow(0 -5px 0 #fff) drop-shadow(8px 10px 0 rgba(0,0,0,.35))}
    .fly{position:absolute;filter:drop-shadow(4px 5px 0 rgba(0,0,0,.3))}
    .pop{position:absolute;color:#FFD400;-webkit-text-stroke:7px #111;paint-order:stroke fill;white-space:nowrap}
    .bar{position:absolute;left:0;right:0;top:438px;height:62px;background:#0000AA;border-top:4px ridge #C0C0C0;color:#FFFF00;font-family:system-ui,sans-serif;font-weight:900;font-size:28px;line-height:58px;white-space:nowrap;overflow:hidden}
  </style>
    <div class="rays"></div>
    <div class="ring" style="left:790px;top:215px;width:430px;height:430px;border-color:#FFD400"></div>
    <div class="ring" style="left:790px;top:215px;width:300px;height:300px;border-color:#FF6FB5;border-width:7px"></div>
    <span class="t">${f.title}</span><span class="new">v2.4 NEW!!</span>
    <div class="grid">${f.chips.map(chip).join('')}</div>
    ${fly('shop/coin', 600, 40, 70, -18)}${fly('shop/coin', 960, 70, 56, 22)}${fly('shop/coin', 640, 360, 52, 30)}
    ${fly('skin/prop/prop_whoopee', 944, 236, 76, 18)}
    ${fly('deco/money_bill', 860, 20, 120, -14)}${fly('skin/fx/fx_sparkle', 700, 6, 70, 0)}${fly('skin/fx/fx_poop', 966, 196, 54, -10)}
    ${face('cat_burst', 622, 96, 190, -10, 2)}${face('tit_burst', 830, 118, 180, 9, 2)}${face('hamster_burst', 704, 176, 220, 2, 3)}
    <span class="pop" style="left:600px;top:378px;font-size:50px;transform:rotate(-8deg);z-index:5">${f.combo}</span>
    <span class="pop" style="left:900px;top:318px;font-size:44px;color:#7EC8FF;transform:rotate(10deg);z-index:5">+200</span>
    <div class="bar">${f.sub}${f.sub}</div>`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, lang, 'feature.png') });
  await page.close();
}

// --feature 면 대표 그림만 다시 만든다
const onlyFeature = process.argv.includes('--feature');
for (const lang of ['ko', 'en']) {
  if (!onlyFeature) await compose(lang, await captureScreens(lang));
  await feature(lang);
}
await browser.close();
server.close();
console.log('docs/store 에 저장했어요');
