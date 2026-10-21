// 터지는 화면 위 효과: 방구 구름 뿅뿅 (원화), 거품 보글 (도트), 지폐 비 (원화). 화면이 열려 있는 동안만 돈다.
import { pixelCanvas } from './pixels.js';

// 원화 소품 (assets/deco). 처음 한 번만 받아 둔다.
const IMAGES = {};
for (const name of ['fart_bubble', 'money_bill']) {
  const im = new Image();
  im.src = `assets/deco/${name}.webp`;
  IMAGES[name] = im;
}

let raf = 0;

export function stopFx(canvas) {
  cancelAnimationFrame(raf);
  raf = 0;
  canvas?.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

/**
 * kinds: ['puff' | 'bubble' | 'rain'] 여러 개 가능. from = { x, y } (화면 비율 0~1) — 구름·거품이 나오는 곳,
 * gun = { x, y } — 지폐가 튀어나오는 총구.
 */
export function startFx(canvas, kinds, { from = { x: 0.5, y: 0.45 }, gun = { x: 0.25, y: 0.5 } } = {}) {
  stopFx(canvas);
  const dpr = Math.min(2, devicePixelRatio || 1);
  const W = canvas.clientWidth, H = canvas.clientHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  const unit = Math.max(3, Math.round(W / 110));   // 도트 한 칸 크기
  // 크기: 도트 거품은 칸 단위, 원화는 화면 너비 비율
  const SIZE = { toot: 0.24, bill: 0.2 };
  const sprite = name => (name === 'bubble' ? pixelCanvas('bubble', unit * dpr) : IMAGES[name === 'toot' ? 'fart_bubble' : 'money_bill']);
  const parts = [];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const t0 = performance.now();

  // 방구 구름이 엉덩이 쪽에서 옆으로 뿅뿅 날아간다 (오른쪽이 앞)
  const puff = (delay = 0) => {
    const dir = Math.random() < 0.7 ? 1 : -1;
    parts.push({
      kind: 'toot', x: from.x * W + dir * rnd(60, 110), y: from.y * H + rnd(-30, 110), vx: dir * rnd(180, 320), vy: rnd(-60, 30),
      s: rnd(0.6, 1), grow: 0.15, life: rnd(1.1, 1.8), born: delay, flip: dir < 0
    });
  };
  const bubble = (delay = 0) => parts.push({
    kind: 'bubble', x: rnd(0.08, 0.92) * W, y: from.y * H + rnd(40, 200), vx: rnd(-15, 15), vy: rnd(-110, -60),
    s: rnd(0.5, 1.1), grow: 0, life: rnd(2, 3.5), born: delay, wob: rnd(0, 6)
  });
  // 총구에서 줄줄이 튀어나가 오른쪽 위로 날다가 팔랑팔랑 떨어진다
  const bill = (delay = 0, fromGun = false) => parts.push(fromGun
    ? { kind: 'bill', x: gun.x * W, y: gun.y * H, vx: rnd(260, 420), vy: rnd(-420, -260), s: rnd(0.6, 0.9), life: 4, born: delay,
      rot: -0.5 + rnd(-0.2, 0.2), vr: rnd(-1.5, 1.5), gravity: 380, drag: 0.985, flap: rnd(0, 6) }
    : { kind: 'bill', x: rnd(0, W), y: -30, vx: rnd(-30, 30), vy: rnd(60, 140), s: rnd(0.5, 0.8), life: 8, born: delay,
      rot: rnd(-0.6, 0.6), vr: rnd(-1.2, 1.2), gravity: 0, sway: rnd(0, 6), flap: rnd(0, 6) });

  if (kinds.includes('puff')) for (let i = 0; i < 6; i++) puff(0.15 + i * 0.22);
  if (kinds.includes('bubble')) for (let i = 0; i < 9; i++) bubble(0.2 + i * 0.2);
  if (kinds.includes('rain')) for (let i = 0; i < 24; i++) bill(0.6 + i * 0.09, true);

  let last = t0;
  let nextRain = 1.5;
  const frame = now => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const age = (now - t0) / 1000;
    if (kinds.includes('rain') && age > nextRain) { bill(age); nextRain = age + 0.22; }
    if (kinds.includes('bubble') && Math.random() < 0.025) bubble(age);
    g.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      const a = age - p.born;
      if (a < 0) continue;
      if (a > p.life) { parts.splice(i, 1); continue; }
      p.vy += (p.gravity || 0) * dt;
      p.x += p.vx * dt + (p.sway ? Math.sin(age * 2 + p.sway) * 30 * dt : 0) + (p.wob ? Math.sin(age * 4 + p.wob) * 20 * dt : 0);
      p.y += p.vy * dt;
      if (p.kind === 'toot') { p.vx *= 0.97; p.vy *= 0.97; }
      if (p.drag) { p.vx *= p.drag; if (p.vy > 120) p.vy = 120; }
      const img = sprite(p.kind);
      if (!img.width) continue;   // 아직 안 받아진 그림
      const scale = p.s + (p.grow || 0) * a;
      const fade = p.flap !== undefined ? 1 : Math.min(1, (p.life - a) / 0.6);
      g.save();
      g.globalAlpha = Math.max(0, fade);
      g.translate(p.x * dpr, p.y * dpr);
      if (p.rot !== undefined) { p.rot += p.vr * dt; g.rotate(p.rot); }
      // 지폐는 세로로 납작해졌다 펴지며 팔랑인다, 방구 구름은 왼쪽으로 갈 땐 뒤집는다
      g.scale(p.flip ? -scale : scale, p.flap !== undefined ? scale * Math.cos(age * 7 + p.flap) : scale);
      if (SIZE[p.kind]) {
        const w = SIZE[p.kind] * W * dpr, h = w * img.height / img.width;
        g.drawImage(img, -w / 2, -h / 2, w, h);
      } else g.drawImage(img, -img.width / 2, -img.height / 2);
      g.restore();
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
}
