// 아지트 월드: 캔버스 하나에 하늘·땅·소품·친구들을 그린다.
// 화면에 보일 때만 30fps 로 돌고, 탭을 옮기거나 앱이 백그라운드면 완전히 멈춘다.
import { CHARACTERS, PROPS, propById } from './data.js';
import { t } from './i18n.js';

const FPS = 30;
const WALK_SPEED = 0.11;      // 화면 너비/초
const images = new Map();

function img(src) {
  if (!images.has(src)) {
    const im = new Image();
    im.src = src;
    images.set(src, im);
  }
  return images.get(src);
}
const ready = im => im.complete && im.naturalWidth > 0;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// 테마별 하늘/땅 색
const PALETTE = {
  meadow: { sky: ['#9FD8F7', '#E3F4FB'], ground: ['#B8E39A', '#8CCB6E'], hill: '#CDEBB0', sun: true, clouds: 1, flowers: true },
  sunset: { sky: ['#F59F80', '#FFE0A3'], ground: ['#C9C27A', '#9FA75E'], hill: '#E2B98A', sun: true, clouds: 0.8, warm: true, flowers: true },
  night:  { sky: ['#1B2147', '#3C4A82'], ground: ['#4C6B4A', '#35503A'], hill: '#3B4F63', moon: true, stars: true, clouds: 0.35, dark: true, fireflies: true },
  city:   { sky: ['#1A0F33', '#4A2363'], ground: ['#4B4B5A', '#34343F'], moon: true, stars: true, skyline: true, dark: true },
  room:   { wall: ['#FCE9D4', '#F7D9BC'], floor: ['#D8A878', '#C08A5B'], indoor: true }
};

export class World {
  constructor(canvas, handlers) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.h = handlers;              // { onPetTap, onPropTap, onArrive }
    this.theme = 'meadow';
    this.placed = new Set();
    this.frozen = false;
    this.active = false;
    this.last = 0;
    this.time = 0;
    this.bg = null;                 // 정적인 배경을 미리 그려 둔 캔버스
    this.propBoxes = new Map();     // 터치 판정용 소품 위치
    this.fx = [];                   // 효과 (방구 구름, 하트, 음표, 도토리 숫자 …)
    this.shake = 0;                 // 화면 흔들림 (대담한 방구!)
    this.stars = Array.from({ length: 40 }, () => [Math.random(), Math.random() * 0.42, Math.random() * 6]);
    this.pets = CHARACTERS.map((c, i) => ({
      id: c.id, c,
      x: [0.25, 0.5, 0.78][i], depth: [0.3, 0.55, 0.2][i],
      tx: 0, td: 0, mode: 'idle', timer: rand(1, 3), facing: i === 2 ? -1 : 1,
      step: 0, hop: 0, alt: 0, bubble: null, goal: null, box: null
    }));
    CHARACTERS.forEach(c => Object.values(c.sprites).forEach(img));
    PROPS.forEach(p => img(`assets/props/${p.id}.webp`));
    ['sun', 'moon', 'stars', 'cloud'].forEach(n => img(`assets/props/${n}.webp`));

    new ResizeObserver(() => this.resize()).observe(canvas);
    canvas.addEventListener('click', e => this.tap(e));
    document.addEventListener('visibilitychange', () => this.kick());
    this.resize();
  }

  // ---------------------------------------------------------- 외부 API
  setScene(theme, placed) {
    if (theme !== this.theme) { this.theme = theme; this.bg = null; }
    this.placed = new Set(placed);
    this.kick();
  }

  setFrozen(on, announce = true) {
    this.frozen = on;
    this.pets.forEach(p => {
      p.goal = null;
      p.mode = 'idle';
      p.timer = 1;
      if (announce) this.say(p.id, t(on ? 'world.freeze' : 'world.thaw'), 2.5);
    });
    this.kick();
  }

  setActive(on) {
    this.active = on;
    this.kick();
  }

  say(id, text, secs = 2.2) {
    const p = this.pet(id);
    p.bubble = { text, start: this.time, until: this.time + secs };
    this.kick();
  }

  react(id, text) {
    const p = this.pet(id);
    p.mode = 'react';
    p.timer = 1.4;
    p.goal = null;
    if (text) this.say(id, text);
    this.kick();
  }

  /**
   * 효과 뿌리기. kind: 'toot'(방구 구름) · 'bigToot'(대담: 큰 구름 + 화면 흔들림) · 'bubbles'(소심)
   * · 'sweat'(꾹참) · 'hearts' · 'notes' · 'crumbs' · 'sparkle' · 'coin'(text 에 "+3🌰")
   */
  burst(id, kind, text) {
    const p = this.pet(id);
    if (!p?.box) return;
    const b = p.box;
    const cx = b.x + b.w / 2, top = b.y + b.h * 0.15, mid = b.y + b.h * 0.55, back = cx - p.facing * b.w * 0.42;
    const add = (o) => this.fx.push({ age: 0, life: 1.2, vx: 0, vy: 0, size: 1, rot: 0, ...o });
    const H = this.hgt;
    switch (kind) {
      case 'bigToot':
        this.shake = 0.45;
        for (let i = 0; i < 9; i++) add({ kind: 'puff', x: back, y: mid + H * 0.04, vx: -p.facing * rand(20, 90), vy: rand(-50, -10), size: rand(0.05, 0.09) * H, life: rand(1.2, 1.9) });
        add({ kind: 'text', x: back, y: mid - H * 0.04, vy: -30, text: t('world.bigToot'), size: H * 0.065, life: 1.4, outline: true });
        break;
      case 'toot':
        for (let i = 0; i < 4; i++) add({ kind: 'puff', x: back, y: mid + H * 0.03, vx: -p.facing * rand(15, 50), vy: rand(-35, -10), size: rand(0.03, 0.05) * H, life: rand(1, 1.5) });
        break;
      case 'bubbles':
        for (let i = 0; i < 6; i++) add({ kind: 'bubble', x: back + rand(-8, 8), y: mid, vx: rand(-15, 15), vy: rand(-60, -30), size: rand(0.012, 0.025) * H, life: rand(0.9, 1.5) });
        break;
      case 'sweat':
        add({ kind: 'sweat', x: b.x + b.w * (p.facing > 0 ? 0.85 : 0.15), y: top, vy: 25, size: H * 0.035, life: 1.1 });
        add({ kind: 'text', x: cx, y: top - H * 0.02, vy: -18, text: '!!', size: H * 0.06, life: 1, color: '#E03131' });
        break;
      case 'hearts':
        for (let i = 0; i < 4; i++) add({ kind: 'text', x: cx + rand(-b.w * 0.3, b.w * 0.3), y: top, vy: rand(-55, -35), vx: rand(-10, 10), text: '💗', size: H * rand(0.035, 0.05), life: rand(1, 1.5) });
        break;
      case 'notes':
        for (let i = 0; i < 3; i++) add({ kind: 'text', x: cx + rand(-10, 20), y: top, vy: rand(-50, -30), vx: rand(5, 25) * p.facing, text: pick(['♪', '♫']), size: H * 0.05, life: rand(1.1, 1.6), color: '#282523' });
        break;
      case 'zzz':
        add({ kind: 'text', x: cx + b.w * 0.25, y: top, vy: -18, vx: 10, text: 'z', size: H * 0.04, life: 1.8, color: '#5C7CFA' });
        break;
      case 'crumbs':
        for (let i = 0; i < 6; i++) add({ kind: 'dot', x: cx + rand(-10, 10), y: mid, vx: rand(-60, 60), vy: rand(-90, -40), g: 260, size: rand(2, 4), life: 0.8, color: pick(['#E8A33D', '#C77D2A', '#F2C14E']) });
        break;
      case 'sparkle':
        for (let i = 0; i < 8; i++) add({ kind: 'text', x: cx + rand(-b.w * 0.5, b.w * 0.5), y: rand(b.y, b.y + b.h), vy: -12, text: '✨', size: H * rand(0.03, 0.045), life: rand(0.8, 1.3) });
        break;
      case 'coin':
        add({ kind: 'text', x: cx + p.facing * b.w * 0.55, y: b.y + b.h * 0.25, vy: -34, text, size: H * 0.05, life: 1.3, color: '#C2410C', outline: true });
        break;
    }
    this.kick();
  }

  /** 소품으로 달려가기. 도착하면 handlers.onArrive(charId, propId, rewarded) */
  visit(propId, rewarded) {
    const prop = propById(propId);
    const p = this.pet(prop.pet);
    p.mode = 'walk';
    p.goal = { propId, rewarded };
    p.tx = Math.min(0.94, Math.max(0.06, prop.x + (prop.x > 0.5 ? -0.09 : 0.09)));
    p.td = Math.max(0, prop.depth - 0.06);
    p.facing = p.tx > p.x ? 1 : -1;
    if (rewarded) this.say(p.id, t('world.run'), 1.2);
    this.kick();
  }

  pet(id) { return this.pets.find(p => p.id === id); }

  // ---------------------------------------------------------- 루프
  kick() {
    if (this.raf || !this.active || document.hidden) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(t => this.frame(t));
  }

  frame(now) {
    this.raf = 0;
    if (!this.active || document.hidden) return;
    const dt = (now - this.last) / 1000;
    if (dt >= 1 / FPS - 0.002) {
      this.last = now;
      this.time += Math.min(dt, 0.1);
      const step = Math.min(dt, 0.1);
      if (!this.frozen) this.pets.forEach(p => this.update(p, step));
      this.updateFx(step);
      this.draw();
    }
    this.raf = requestAnimationFrame(t => this.frame(t));
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = Math.max(1, r.width);
    this.hgt = Math.max(1, r.height);
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.hgt * dpr);
    this.dpr = dpr;
    this.bg = null;
    if (this.active) this.draw();
  }

  // ---------------------------------------------------------- 시뮬레이션
  updateFx(dt) {
    this.shake = Math.max(0, this.shake - dt);
    for (const f of this.fx) {
      f.age += dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      if (f.g) f.vy += f.g * dt;
      if (f.kind === 'puff') { f.vx *= 0.97; f.vy *= 0.97; }
    }
    this.fx = this.fx.filter(f => f.age < f.life);
    // 자는 친구 머리 위로 z 가 하나씩
    for (const p of this.pets) {
      if (p.mode === 'sleep' && Math.random() < dt * 0.9) this.burst(p.id, 'zzz');
    }
    // 밤의 반딧불
    if (PALETTE[this.theme].fireflies && this.fx.filter(f => f.kind === 'firefly').length < 7 && Math.random() < dt * 2) {
      this.fx.push({ kind: 'firefly', age: 0, life: rand(3, 6), x: rand(0, this.w), y: rand(this.hgt * 0.55, this.hgt * 0.9), vx: rand(-8, 8), vy: rand(-6, 2), size: rand(2, 3.5), rot: rand(0, 6) });
    }
  }

  update(p, dt) {
    p.timer -= dt;
    if (p.mode === 'react') {
      p.hop = Math.abs(Math.sin(p.timer * 11)) * Math.max(0, p.timer) * 0.05;
      if (p.timer <= 0) { p.mode = 'idle'; p.hop = 0; p.timer = rand(1.5, 4); }
      return;
    }
    if (p.mode === 'walk') {
      const dx = p.tx - p.x, dd = p.td - p.depth;
      const dist = Math.hypot(dx, dd * 0.7);
      const speed = WALK_SPEED * (p.goal ? 1.6 : 1) * dt;
      if (dist > speed) {
        p.x += (dx / dist) * speed;
        p.depth += (dd / dist) * speed * 0.7;
        p.step += dt;
        p.hop = Math.abs(Math.sin(p.step * 9)) * 0.012;
      } else {
        p.hop = 0;
        if (p.goal) {
          const g = p.goal;
          p.goal = null;
          this.react(p.id);
          this.h.onArrive?.(p.id, g.propId, g.rewarded);
        } else {
          p.mode = 'idle';
          p.timer = rand(2, 5);
        }
      }
      return;
    }
    if (p.mode === 'fly') {
      p.alt = 0.18 + Math.sin(this.time * 3) * 0.04;
      p.x += p.facing * 0.14 * dt;
      if (p.x > 0.92 || p.x < 0.08) p.facing *= -1;
      if (p.timer <= 0) { p.mode = 'walk'; p.tx = p.x; p.td = p.depth; }
      return;
    }
    p.alt = Math.max(0, p.alt - dt * 0.6);
    if (p.timer > 0) return;
    this.decide(p);
  }

  decide(p) {
    const r = Math.random();
    const mine = PROPS.filter(pr => pr.pet === p.id && this.placed.has(pr.id));
    if (r < 0.25 && mine.length) return this.visit(pick(mine).id, false);
    if (r < 0.65) {
      const [lo, hi] = p.c.lane;
      p.mode = 'walk';
      p.tx = rand(lo, hi);
      p.td = rand(0.05, 0.7);
      p.facing = p.tx > p.x ? 1 : -1;
      return;
    }
    if (r < 0.85) { p.mode = 'idle'; p.timer = rand(2, 5); return; }
    // 캐릭터별 특기
    if (p.c.special === 'fly') { p.mode = 'fly'; p.timer = rand(2.5, 4); this.say(p.id, t('world.flap')); this.burst(p.id, 'notes'); }
    else if (p.c.special === 'sleep') { p.mode = 'sleep'; p.timer = rand(5, 9); this.say(p.id, t('world.loaf'), 3); }
    else { p.mode = 'react'; p.timer = 1; this.say(p.id, t('world.toot')); this.burst(p.id, 'toot'); }
  }

  // ---------------------------------------------------------- 그리기
  groundY(depth) {
    const horizon = this.hgt * (PALETTE[this.theme].indoor ? 0.52 : 0.5);
    const bottom = this.hgt * 0.95;
    return bottom - depth * (bottom - horizon - this.hgt * 0.04);
  }
  scaleAt(depth) { return 1 - depth * 0.38; }

  draw() {
    const { ctx, w, hgt: h } = this;
    const pal = PALETTE[this.theme];
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.shake > 0) {
      const k = this.shake * 14;
      ctx.translate(rand(-k, k), rand(-k, k) * 0.6);
    }
    if (!this.bg) this.bg = this.paintBackground(pal);
    ctx.drawImage(this.bg, -12, -12, w + 24, h + 24);   // 흔들려도 가장자리가 비지 않게 조금 크게
    if (!pal.indoor) this.drawSky(pal);

    // 소품과 친구들을 깊이(뒤→앞) 순으로
    const items = [];
    PROPS.forEach(pr => this.placed.has(pr.id) && items.push({ depth: pr.depth, draw: () => this.drawProp(pr) }));
    this.pets.forEach(p => items.push({ depth: p.depth - 0.001, draw: () => this.drawPet(p) }));
    items.sort((a, b) => b.depth - a.depth).forEach(it => it.draw());

    if (pal.dark) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgba(130, 140, 200, 0.42)';
      ctx.fillRect(0, h * 0.45, w, h);
      ctx.restore();
      if (this.placed.has('campfire')) this.drawFireGlow();
    }
    if (pal.warm) {
      ctx.fillStyle = 'rgba(255, 150, 80, 0.12)';
      ctx.fillRect(0, 0, w, h);
    }
    this.drawFx();
    if (this.frozen) this.drawFrost();
    this.drawBubbles();
  }

  drawFx() {
    const { ctx } = this;
    for (const f of this.fx) {
      const u = f.age / f.life;
      const fade = u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85;
      ctx.save();
      ctx.globalAlpha = Math.max(0, fade);
      if (f.kind === 'puff') {
        // 크레용으로 그린 듯한 민트색 방구 구름 (자라면서 흐려진다)
        const r = f.size * (0.6 + u * 0.9);
        ctx.fillStyle = '#BFE8CF';
        ctx.strokeStyle = '#5E9C7A';
        ctx.lineWidth = 4;   // 외곽선을 먼저 그리고 그 위에 채워서 바깥 테두리만 남긴다
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const ox = f.x + (i - 1) * r * 0.55, oy = f.y + (i === 1 ? -r * 0.25 : 0), rr = r * (i === 1 ? 0.75 : 0.6);
          ctx.moveTo(ox + rr, oy);
          ctx.arc(ox, oy, rr, 0, Math.PI * 2);
        }
        ctx.stroke();
        ctx.fill();
      } else if (f.kind === 'bubble') {
        ctx.strokeStyle = '#4C6EF5';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(219, 228, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(f.x + Math.sin(f.age * 9) * 4, f.y, f.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (f.kind === 'sweat') {
        ctx.fillStyle = '#74C0FC';
        ctx.strokeStyle = '#1C7ED6';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(f.x, f.y - f.size);
        ctx.quadraticCurveTo(f.x + f.size * 0.7, f.y, f.x, f.y + f.size * 0.5);
        ctx.quadraticCurveTo(f.x - f.size * 0.7, f.y, f.x, f.y - f.size);
        ctx.fill();
        ctx.stroke();
      } else if (f.kind === 'dot') {
        ctx.fillStyle = f.color;
        ctx.fillRect(f.x, f.y, f.size, f.size);
      } else if (f.kind === 'firefly') {
        ctx.globalAlpha = Math.max(0, fade) * (0.5 + 0.5 * Math.sin(f.age * 4 + f.rot));
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size * 4);
        g.addColorStop(0, 'rgba(255, 244, 150, 0.95)');
        g.addColorStop(1, 'rgba(255, 230, 90, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(f.x - f.size * 4, f.y - f.size * 4, f.size * 8, f.size * 8);
      } else if (f.kind === 'text') {
        ctx.font = `${Math.round(f.size)}px Jua, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (f.outline) {
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#FFFFFF';
          ctx.strokeText(f.text, f.x, f.y);
        }
        ctx.fillStyle = f.color || '#282523';
        ctx.fillText(f.text, f.x, f.y);
      }
      ctx.restore();
    }
  }

  drawFrost() {
    const { ctx, w, hgt: h } = this;
    ctx.save();
    ctx.fillStyle = 'rgba(200, 230, 255, 0.42)';
    ctx.fillRect(0, 0, w, h);
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(235, 247, 255, 0.85)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `${Math.round(h * 0.04)}px sans-serif`;
    ctx.textAlign = 'center';
    for (let i = 0; i < 14; i++) {
      const x = ((i * 0.137 + this.time * 0.01 * (1 + (i % 3))) % 1) * w;
      const y = ((i * 0.291 + this.time * 0.04 * (1 + (i % 2))) % 1) * h;
      ctx.fillText('❄', x, y);
    }
    ctx.restore();
  }

  paintBackground(pal) {
    const c = document.createElement('canvas');
    c.width = this.canvas.width;
    c.height = this.canvas.height;
    const g = c.getContext('2d');
    g.scale(this.dpr, this.dpr);
    const { w, hgt: h } = this;
    const grad = (y0, y1, [a, b]) => {
      const lg = g.createLinearGradient(0, y0, 0, y1);
      lg.addColorStop(0, a);
      lg.addColorStop(1, b);
      return lg;
    };
    if (pal.indoor) {
      const floorY = h * 0.52;
      g.fillStyle = grad(0, floorY, pal.wall);
      g.fillRect(0, 0, w, floorY);
      g.fillStyle = 'rgba(255,255,255,0.35)';
      for (let x = 0; x < w; x += 28) g.fillRect(x, 0, 12, floorY);
      // 창문 너머로 지금 시간대 하늘
      const out = PALETTE[new Date().getHours() >= 6 && new Date().getHours() < 18 ? 'meadow' : 'night'];
      const wx = w * 0.62, wy = h * 0.1, ww = w * 0.26, wh = h * 0.24;
      g.fillStyle = grad(wy, wy + wh, out.sky);
      g.fillRect(wx, wy, ww, wh);
      g.strokeStyle = '#8A5A3B';
      g.lineWidth = 5;
      g.strokeRect(wx, wy, ww, wh);
      g.beginPath();
      g.moveTo(wx + ww / 2, wy); g.lineTo(wx + ww / 2, wy + wh);
      g.moveTo(wx, wy + wh / 2); g.lineTo(wx + ww, wy + wh / 2);
      g.stroke();
      g.fillStyle = grad(floorY, h, pal.floor);
      g.fillRect(0, floorY, w, h - floorY);
      g.strokeStyle = 'rgba(90,50,20,0.25)';
      g.lineWidth = 1.5;
      for (let y = floorY + 14; y < h; y += 18) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.fillStyle = '#B7835A';
      g.fillRect(0, floorY - 6, w, 8);
      // 동그란 러그
      g.fillStyle = 'rgba(255, 168, 168, 0.55)';
      g.beginPath();
      g.ellipse(w * 0.5, h * 0.8, w * 0.36, h * 0.09, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(200, 90, 90, 0.5)';
      g.setLineDash([6, 5]);
      g.lineWidth = 2;
      g.beginPath();
      g.ellipse(w * 0.5, h * 0.8, w * 0.32, h * 0.075, 0, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
      this.paintGrain(g, w, h);
      return c;
    }
    const horizon = h * 0.5;
    g.fillStyle = grad(0, horizon, pal.sky);
    g.fillRect(0, 0, w, horizon + 2);
    if (pal.skyline) {
      let seed = 7;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let x = -10; x < w; ) {
        const bw = 26 + rnd() * 40, bh = h * (0.12 + rnd() * 0.26);
        g.fillStyle = rnd() > 0.5 ? '#2A1E45' : '#33264F';
        g.fillRect(x, horizon - bh, bw, bh);
        g.fillStyle = 'rgba(255, 214, 102, 0.85)';
        for (let yy = horizon - bh + 8; yy < horizon - 8; yy += 12) {
          for (let xx = x + 5; xx < x + bw - 6; xx += 10) if (rnd() > 0.55) g.fillRect(xx, yy, 4, 5);
        }
        x += bw + 2;
      }
    }
    if (pal.warm) {   // 지는 해 주변 노을빛
      const sg = g.createRadialGradient(w * 0.82, h * 0.34, 0, w * 0.82, h * 0.34, h * 0.45);
      sg.addColorStop(0, 'rgba(255, 214, 140, 0.8)');
      sg.addColorStop(1, 'rgba(255, 180, 120, 0)');
      g.fillStyle = sg;
      g.fillRect(0, 0, w, horizon);
    }
    if (pal.hill) {   // 먼 언덕
      g.fillStyle = pal.hill;
      g.beginPath();
      g.moveTo(0, horizon + 6);
      for (let x = 0; x <= w; x += 8) g.lineTo(x, horizon - h * (0.05 + 0.035 * Math.sin(x / (w * 0.18) + 1.3) + 0.02 * Math.sin(x / (w * 0.07))));
      g.lineTo(w, horizon + 6);
      g.fill();
    }
    g.fillStyle = grad(horizon, h, pal.ground);
    g.beginPath();
    g.moveTo(0, horizon + 8);
    for (let x = 0; x <= w; x += 20) g.lineTo(x, horizon + 4 * Math.sin(x / 37) + 4);
    g.lineTo(w, h);
    g.lineTo(0, h);
    g.fill();
    if (!pal.skyline) {
      // 크레용 풀잎: 앞쪽일수록 크게
      let seed = 3;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      g.strokeStyle = pal.dark ? 'rgba(20, 40, 25, 0.35)' : 'rgba(50, 110, 40, 0.35)';
      g.lineCap = 'round';
      for (let i = 0; i < 70; i++) {
        const y = horizon + 14 + rnd() * (h - horizon - 18);
        const x = rnd() * w;
        const s = 3 + (y - horizon) / (h - horizon) * 7;
        g.lineWidth = 1.3;
        g.beginPath();
        g.moveTo(x, y); g.lineTo(x - s * 0.4, y - s);
        g.moveTo(x + 2, y); g.lineTo(x + 2 + s * 0.3, y - s * 1.1);
        g.stroke();
      }
      if (pal.flowers) {
        for (let i = 0; i < 14; i++) {
          const y = horizon + 24 + rnd() * (h - horizon - 30);
          const x = rnd() * w;
          const r = 1.6 + (y - horizon) / (h - horizon) * 2.4;
          g.fillStyle = ['#FFFFFF', '#FFD43B', '#FFA8A8', '#D0BFFF'][i % 4];
          for (let k = 0; k < 5; k++) {
            g.beginPath();
            g.arc(x + Math.cos(k * 1.256) * r, y + Math.sin(k * 1.256) * r, r * 0.8, 0, Math.PI * 2);
            g.fill();
          }
          g.fillStyle = '#F59F00';
          g.beginPath();
          g.arc(x, y, r * 0.6, 0, Math.PI * 2);
          g.fill();
        }
      }
    }
    this.paintGrain(g, w, h);
    return c;
  }

  /** 크레용·종이 느낌의 결 (배경에 한 번만 그려 둔다) */
  paintGrain(g, w, h) {
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    g.save();
    for (let i = 0; i < 900; i++) {
      g.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(60,40,20,0.06)';
      g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1);
    }
    g.restore();
  }

  drawSky(pal) {
    const { ctx, w, hgt: h, time } = this;
    const draw = (name, x, y, size, alpha = 1) => {
      const im = img(`assets/props/${name}.webp`);
      if (!ready(im)) return;
      ctx.globalAlpha = alpha;
      const sw = size * im.naturalWidth / im.naturalHeight;
      ctx.drawImage(im, x - sw / 2, y - size / 2, sw, size);
      ctx.globalAlpha = 1;
    };
    if (pal.stars) {
      ctx.fillStyle = '#FFF6C9';
      for (const [sx, sy, ph] of this.stars) {
        ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(time * 1.3 + ph));
        ctx.fillRect(sx * w, sy * h, 2, 2);
      }
      ctx.globalAlpha = 1;
      draw('stars', w * 0.3, h * 0.14, h * 0.13, 0.6 + 0.4 * Math.sin(time * 2));
    }
    if (pal.sun) draw('sun', w * 0.82, pal.warm ? h * 0.34 : h * 0.14, h * 0.17);
    if (pal.moon) draw('moon', w * 0.82, h * 0.14, h * 0.15);
    if (pal.clouds) {
      [[0.2, 0.18, 0.012], [0.65, 0.3, 0.008]].forEach(([x0, y, v], i) => {
        const x = ((x0 + time * v) % 1.3) - 0.15;
        draw('cloud', x * w, h * y, h * (0.1 - i * 0.02), pal.clouds);
      });
    }
  }

  drawProp(pr) {
    const im = img(`assets/props/${pr.id}.webp`);
    if (!ready(im)) return;
    const { ctx } = this;
    let size = pr.h * this.hgt * this.scaleAt(pr.depth);
    let lift = 0;
    if (pr.id === 'campfire') size *= 1 + 0.04 * Math.sin(this.time * 13);
    if (pr.id === 'balloon') lift = Math.sin(this.time * 1.6) * size * 0.06;
    const sw = size * im.naturalWidth / im.naturalHeight;
    const x = pr.x * this.w - sw / 2, y = this.groundY(pr.depth) - size - lift;
    ctx.drawImage(im, x, y, sw, size);
    this.propBoxes.set(pr.id, { x, y, w: sw, h: size });
  }

  drawFireGlow() {
    const pr = propById('campfire');
    const x = pr.x * this.w, y = this.groundY(pr.depth) - this.hgt * 0.05;
    const r = this.hgt * (0.17 + 0.015 * Math.sin(this.time * 9));
    const g = this.ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255, 170, 70, 0.32)');
    g.addColorStop(1, 'rgba(255, 120, 40, 0)');
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'lighter';
    this.ctx.fillStyle = g;
    this.ctx.fillRect(x - r, y - r, r * 2, r * 2);
    this.ctx.restore();
  }

  spriteFor(p) {
    const s = p.c.sprites;
    if (p.mode === 'react') return s.react;
    if (p.mode === 'sleep') return s.sleep;
    if (p.mode === 'fly' && s.fly) return s.fly;
    if (p.mode === 'walk') return Math.floor(p.step * 6) % 2 ? s.walk : s.idle;
    return s.idle;
  }

  drawPet(p) {
    const im = img(this.spriteFor(p));
    if (!ready(im)) return;
    const { ctx } = this;
    const size = p.c.height * this.hgt * this.scaleAt(p.depth);
    const sw = size * im.naturalWidth / im.naturalHeight;
    const cx = p.x * this.w;
    const footY = this.groundY(p.depth);
    const y = footY - size - (p.hop + p.alt) * this.hgt;

    ctx.fillStyle = 'rgba(40, 30, 20, 0.16)';
    ctx.beginPath();
    ctx.ellipse(cx, footY - 2, sw * 0.36 * (1 - p.alt * 2), size * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();

    // 통통 튈 때 찌그러졌다 늘어나기 (발바닥 기준)
    const bounce = p.mode === 'react' ? Math.sin(p.timer * 22) * 0.07 * Math.min(1, p.timer) : p.mode === 'walk' ? Math.sin(p.step * 18) * 0.025 : Math.sin(this.time * 2 + p.x * 9) * 0.012;
    ctx.save();
    ctx.translate(cx, y + size);
    ctx.scale(p.facing * (1 - bounce), 1 + bounce);
    if (p.mode === 'walk') ctx.rotate(Math.sin(p.step * 9) * 0.05);
    ctx.drawImage(im, -sw / 2, -size, sw, size);
    ctx.restore();
    p.box = { x: cx - sw / 2, y, w: sw, h: size };
  }

  /** 말풍선: 길면 두 줄, 서로 겹치면 위로 비켜 쌓고, 꼬리는 친구를 가리킨다 */
  drawBubbles() {
    const { ctx } = this;
    const fs = Math.round(Math.max(13, this.hgt * 0.045));
    ctx.font = `${fs}px Jua, sans-serif`;
    const maxW = this.w * 0.62;
    const placed = [];
    const list = this.pets.filter(p => p.bubble && p.box && this.time <= p.bubble.until);
    this.pets.forEach(p => { if (p.bubble && this.time > p.bubble.until) p.bubble = null; });
    list.sort((a, b) => a.box.y - b.box.y);
    for (const p of list) {
      const lines = this.wrapLines(p.bubble.text, maxW - 18);
      const tw = Math.max(...lines.map(l => ctx.measureText(l).width));
      const lh = fs * 1.2;
      const bw = tw + 18, bh = lines.length * lh + 10;
      const anchor = p.box.x + p.box.w / 2;
      let x = Math.min(this.w - bw - 4, Math.max(4, anchor - bw / 2));
      let y = Math.max(4, p.box.y - bh - 10);
      for (const q of placed) {
        if (x < q.x + q.w && x + bw > q.x && y < q.y + q.h + 4 && y + bh > q.y - 4) y = Math.max(4, q.y - bh - 6);
      }
      placed.push({ x, y, w: bw, h: bh });
      const age = this.time - p.bubble.start;
      const pop = Math.min(1, Math.max(0.6, age * 6));
      ctx.save();
      ctx.translate(anchor, y + bh);
      ctx.scale(pop, pop);
      ctx.translate(-anchor, -(y + bh));
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#3A3532';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, bw, bh, 12);
      ctx.fill();
      ctx.stroke();
      // 꼬리
      const tx = Math.min(x + bw - 14, Math.max(x + 14, anchor));
      ctx.beginPath();
      ctx.moveTo(tx - 6, y + bh - 1);
      ctx.lineTo(tx, Math.min(p.box.y + 4, y + bh + 9));
      ctx.lineTo(tx + 6, y + bh - 1);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(tx - 6, y + bh);
      ctx.lineTo(tx, Math.min(p.box.y + 4, y + bh + 9));
      ctx.lineTo(tx + 6, y + bh);
      ctx.stroke();
      ctx.fillStyle = '#282523';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      lines.forEach((l, i) => ctx.fillText(l, x + 9, y + 5 + lh * (i + 0.5) + 1));
      ctx.restore();
    }
  }

  wrapLines(text, maxW) {
    const { ctx } = this;
    if (ctx.measureText(text).width <= maxW) return [text];
    const words = text.split(' ');
    const lines = [''];
    for (const word of words) {
      const cur = lines[lines.length - 1];
      const next = cur ? `${cur} ${word}` : word;
      if (ctx.measureText(next).width > maxW && cur && lines.length < 2) lines.push(word);
      else lines[lines.length - 1] = next;
    }
    return lines;
  }

  // ---------------------------------------------------------- 터치
  tap(e) {
    const r = this.canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const inside = b => b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
    const pet = [...this.pets].sort((a, b) => a.depth - b.depth).find(p => inside(p.box));
    if (pet) return this.h.onPetTap?.(pet.id);
    const prop = [...PROPS].filter(p => this.placed.has(p.id)).sort((a, b) => a.depth - b.depth).find(p => inside(this.propBoxes.get(p.id)));
    if (prop) this.h.onPropTap?.(prop.id);
  }
}

