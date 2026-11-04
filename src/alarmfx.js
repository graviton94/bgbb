// 기상 알람 20연타 FX: 발라트로 · 뱀서 감성. 캔버스 하나에 앱 그림(소품 · 효과 · 동전 · 지폐 · 얼굴)이
// 버튼에서 튀어나와 중력 받으며 날아다니고, 불꽃 · 충격파 · 숫자 팝. 5번마다 콤보 폭발, 20번째에 초신성.
const ASSETS = [
  'assets/deco/money_bill.webp', 'assets/deco/stars.webp', 'assets/deco/balloon.webp', 'assets/deco/sun.webp', 'assets/deco/moon.webp',
  'assets/deco/cloud.webp', 'assets/deco/carrot.webp', 'assets/deco/sunflower.webp', 'assets/deco/box.webp', 'assets/deco/campfire.webp',
  'assets/skin/fx/fx_beans.webp', 'assets/skin/fx/fx_hearts.webp', 'assets/skin/fx/fx_petals.webp', 'assets/skin/fx/fx_pixel.webp',
  'assets/skin/fx/fx_poop.webp', 'assets/skin/fx/fx_rainbow.webp', 'assets/skin/fx/fx_skull.webp', 'assets/skin/fx/fx_sparkle.webp',
  'assets/skin/prop/prop_trophy.webp', 'assets/skin/prop/prop_megaphone.webp', 'assets/skin/prop/prop_whoopee.webp', 'assets/skin/prop/prop_medal.webp',
  'assets/skin/prop/prop_pumpkin.webp', 'assets/skin/prop/prop_beans.webp', 'assets/skin/prop/prop_extinguisher.webp', 'assets/skin/prop/prop_gasmask.webp',
  'assets/shop/coin.webp', 'assets/shop/coin.webp', 'assets/shop/coin.webp',
  'assets/faces/hamster_burst.webp', 'assets/faces/tit_burst.webp', 'assets/faces/cat_burst.webp'
];
const COLORS = ['#D7FF3D', '#FFD400', '#FF6FB5', '#7EC8FF', '#FFFFFF', '#FF2E2E', '#B98CFF'];
const imgs = [];
let cv = null, g = null, raf = 0, parts = [], rings = [], pops = [], shake = 0, flash = 0, dpr = 1, last = 0;
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

function preload() {
  if (imgs.length) return;
  for (const src of ASSETS) { const im = new Image(); im.src = src; imgs.push(im); }
}
const R = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];

function resize() {
  dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = cv.clientWidth * dpr;
  cv.height = cv.clientHeight * dpr;
}

export function startAlarmFx(canvas) {
  cv = canvas;
  g = cv.getContext('2d');
  preload();
  resize();
  parts = []; rings = []; pops = []; shake = 0; flash = 0;
  cancelAnimationFrame(raf);
  last = performance.now();
  raf = requestAnimationFrame(frame);
}

export function stopAlarmFx() {
  cancelAnimationFrame(raf);
  raf = 0;
  parts = []; rings = []; pops = [];
  if (g) g.clearRect(0, 0, cv.width, cv.height);
}

/** 그림 조각 하나: 위로 튀었다가 중력으로 떨어지며 빙글빙글 */
function sprite(x, y, power) {
  const ok = imgs.filter(im => im.complete && im.naturalWidth);
  if (!ok.length) return;
  const a = R(-Math.PI * 0.95, -Math.PI * 0.05);
  const v = R(500, 1100) * power * dpr;
  parts.push({ kind: 'img', im: pick(ok), x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: R(0, 6.28), vr: R(-9, 9), s: R(34, 70), life: R(1.4, 2.2), t: 0 });
}
function spark(x, y, power, color) {
  const a = R(0, 6.28), v = R(200, 900) * power * dpr;
  parts.push({ kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, s: R(3, 7), life: R(0.35, 0.8), t: 0, c: color || pick(COLORS) });
}
function ring(x, y, max, color) { rings.push({ x, y, r: 6, max, t: 0, life: 0.45, c: color }); }
/** 튀어 오르는 글자 ('+15' · 'x3' · 'COMBO!') */
function pop(x, y, text, size, color) { pops.push({ x, y, text, size, c: color, t: 0, life: 0.9, vy: -160, rot: R(-0.25, 0.25) }); }

/** 한 번 누를 때. x, y = 화면 좌표(CSS px), taps = 몇 번째, mult = 콤보 배수 */
export function hitFx(x, y, taps, mult) {
  if (!cv) return;
  const X = x * dpr, Y = y * dpr;
  const power = 1 + taps / 20;
  const n = calm ? 1 : Math.min(9, 2 + Math.floor(taps / 3));
  for (let i = 0; i < n; i++) sprite(X, Y, power);
  for (let i = 0; i < (calm ? 4 : 14 + taps); i++) spark(X, Y, power);
  ring(X, Y, (120 + taps * 9) * dpr, pick(COLORS));
  pop(X + R(-60, 60) * dpr, Y - 40 * dpr, `+${10 * mult}`, (34 + taps) * dpr, pick(['#7EC8FF', '#FF2E2E', '#D7FF3D']));
  shake = Math.min(26, 4 + taps * 0.9);
  flash = Math.max(flash, 0.08 + taps * 0.006);
}

/** 5번마다: 화면 가운데서 콤보 폭발 */
export function comboFx(level) {
  if (!cv) return;
  const X = cv.width / 2, Y = cv.height * 0.42;
  for (let i = 0; i < (calm ? 4 : 18); i++) sprite(X, Y, 1.4);
  for (let i = 0; i < (calm ? 10 : 60); i++) spark(X, Y, 1.8);
  ring(X, Y, cv.width * 0.7, '#FFD400');
  ring(X, Y, cv.width * 0.45, '#FF6FB5');
  pop(X, Y, `COMBO x${level}!!`, 64 * dpr, '#FFD400');
  shake = 30;
  flash = 0.45;
}

/** 20번째: 초신성 + 그림 비 */
export function finishFx() {
  if (!cv) return;
  const X = cv.width / 2, Y = cv.height * 0.45;
  for (let i = 0; i < (calm ? 8 : 40); i++) sprite(X, Y, 1.9);
  for (let i = 0; i < (calm ? 20 : 160); i++) spark(X, Y, 2.4);
  for (let k = 0; k < 4; k++) ring(X, Y, cv.width * (0.4 + k * 0.25), COLORS[k]);
  // 위에서 그림 비
  const ok = imgs.filter(im => im.complete && im.naturalWidth);
  for (let i = 0; i < (calm ? 6 : 30) && ok.length; i++) {
    parts.push({ kind: 'img', im: pick(ok), x: R(0, cv.width), y: R(-300, -40) * dpr, vx: R(-80, 80) * dpr, vy: R(200, 500) * dpr, rot: R(0, 6.28), vr: R(-5, 5), s: R(40, 80), life: 2.6, t: 0 });
  }
  shake = 40;
  flash = 0.9;
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (cv.width !== cv.clientWidth * dpr) resize();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, cv.width, cv.height);
  // 화면 흔들림 (캔버스만, 버튼은 CSS 가 흔듦)
  if (shake > 0.3) { g.translate(R(-shake, shake) * dpr * 0.5, R(-shake, shake) * dpr * 0.5); shake *= Math.pow(0.02, dt); }
  const grav = 1500 * dpr;
  parts = parts.filter(p => (p.t += dt) < p.life);
  for (const p of parts) {
    p.vy += (p.kind === 'img' ? grav : grav * 0.3) * dt;
    p.vx *= Math.pow(0.6, dt);
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const k = 1 - p.t / p.life;
    if (p.kind === 'img') {
      p.rot += p.vr * dt;
      const s = p.s * dpr * (0.6 + 0.4 * Math.min(1, p.t * 6));
      g.save();
      g.globalAlpha = Math.min(1, k * 2);
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      g.drawImage(p.im, -s / 2, -s / 2, s, s);
      g.restore();
    } else {
      g.globalAlpha = k;
      g.fillStyle = p.c;
      g.beginPath();
      g.arc(p.x, p.y, p.s * dpr * k, 0, 6.28);
      g.fill();
    }
  }
  g.globalAlpha = 1;
  rings = rings.filter(r => (r.t += dt) < r.life);
  for (const r of rings) {
    const k = r.t / r.life, rr = r.r + (r.max - r.r) * (1 - Math.pow(1 - k, 3));
    g.globalAlpha = 1 - k;
    g.strokeStyle = r.c;
    g.lineWidth = (14 * (1 - k) + 2) * dpr;
    g.beginPath();
    g.arc(r.x, r.y, rr, 0, 6.28);
    g.stroke();
  }
  pops = pops.filter(p => (p.t += dt) < p.life);
  for (const p of pops) {
    const k = p.t / p.life;
    const sc = k < 0.15 ? 0.4 + (k / 0.15) * 1.0 : 1.4 - Math.min(0.4, (k - 0.15) * 1.2);   // 펑 커졌다가 살짝 줄어듦
    p.y += p.vy * dt * dpr;
    g.save();
    g.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
    g.translate(p.x, p.y);
    g.rotate(p.rot + Math.sin(p.t * 18) * 0.06);
    g.scale(sc, sc);
    g.font = `400 ${p.size}px "Black Han Sans", system-ui, sans-serif`;
    g.textAlign = 'center';
    g.lineJoin = 'round';
    g.lineWidth = p.size * 0.18;
    g.strokeStyle = '#111';
    g.strokeText(p.text, 0, 0);
    g.fillStyle = p.c;
    g.fillText(p.text, 0, 0);
    g.restore();
  }
  if (flash > 0.01) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = flash;
    g.fillStyle = '#fff';
    g.fillRect(0, 0, cv.width, cv.height);
    flash *= Math.pow(0.0005, dt);
  }
  g.globalAlpha = 1;
  raf = requestAnimationFrame(frame);
}
