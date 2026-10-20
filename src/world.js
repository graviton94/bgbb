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
  meadow: { sky: ['#9FD8F7', '#E3F4FB'], ground: ['#B8E39A', '#8CCB6E'], sun: true, clouds: 1 },
  sunset: { sky: ['#F59F80', '#FFE0A3'], ground: ['#C9C27A', '#9FA75E'], sun: true, clouds: 0.8, warm: true },
  night:  { sky: ['#1B2147', '#3C4A82'], ground: ['#4C6B4A', '#35503A'], moon: true, stars: true, clouds: 0.35, dark: true },
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
    p.bubble = { text, until: this.time + secs };
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
      if (!this.frozen) this.pets.forEach(p => this.update(p, Math.min(dt, 0.1)));
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
    if (p.c.special === 'fly') { p.mode = 'fly'; p.timer = rand(2.5, 4); this.say(p.id, t('world.flap')); }
    else if (p.c.special === 'sleep') { p.mode = 'sleep'; p.timer = rand(5, 9); this.say(p.id, t('world.loaf'), 3); }
    else { p.mode = 'react'; p.timer = 1; this.say(p.id, t('world.toot')); }
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
    if (!this.bg) this.bg = this.paintBackground(pal);
    ctx.drawImage(this.bg, 0, 0, w, h);
    if (!pal.indoor) this.drawSky(pal);

    // 소품과 친구들을 깊이(뒤→앞) 순으로
    const items = [];
    PROPS.forEach(pr => this.placed.has(pr.id) && items.push({ depth: pr.depth, draw: () => this.drawProp(pr) }));
    this.pets.forEach(p => items.push({ depth: p.depth - 0.001, draw: () => this.drawPet(p) }));
    items.sort((a, b) => b.depth - a.depth).forEach(it => it.draw());

    if (pal.dark) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgba(120, 130, 190, 0.55)';
      ctx.fillRect(0, h * 0.45, w, h);
      ctx.restore();
      if (this.placed.has('campfire')) this.drawFireGlow();
    }
    if (pal.warm) {
      ctx.fillStyle = 'rgba(255, 150, 80, 0.12)';
      ctx.fillRect(0, 0, w, h);
    }
    if (this.frozen) {
      ctx.fillStyle = 'rgba(190, 225, 255, 0.45)';
      ctx.fillRect(0, 0, w, h);
    }
    this.pets.forEach(p => this.drawBubble(p));
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
    g.fillStyle = grad(horizon, h, pal.ground);
    g.beginPath();
    g.moveTo(0, horizon + 8);
    for (let x = 0; x <= w; x += 20) g.lineTo(x, horizon + 4 * Math.sin(x / 37) + 4);
    g.lineTo(w, h);
    g.lineTo(0, h);
    g.fill();
    if (!pal.skyline) {
      g.fillStyle = 'rgba(40, 90, 30, 0.18)';
      for (let i = 0; i < 40; i++) {
        const x = (i * 97) % w, y = horizon + 20 + ((i * 53) % (h - horizon - 24));
        g.fillRect(x, y, 2, 6);
        g.fillRect(x + 3, y + 1, 2, 5);
      }
    }
    return c;
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
    if (pal.stars) draw('stars', w * 0.3, h * 0.14, h * 0.13, 0.6 + 0.4 * Math.sin(time * 2));
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
    if (p.mode === 'walk') return Math.floor(p.step * 6) % 2 ? s.walk : s.base;
    return s.base;
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

    ctx.save();
    ctx.translate(cx, y + size / 2);
    ctx.scale(p.facing, 1);
    if (p.mode === 'walk') ctx.rotate(Math.sin(p.step * 9) * 0.06);
    ctx.drawImage(im, -sw / 2, -size / 2, sw, size);
    ctx.restore();
    p.box = { x: cx - sw / 2, y, w: sw, h: size };
  }

  drawBubble(p) {
    if (!p.bubble || !p.box) return;
    if (this.time > p.bubble.until) { p.bubble = null; return; }
    const { ctx } = this;
    ctx.font = `${Math.round(Math.max(13, this.hgt * 0.045))}px Jua, sans-serif`;
    const tw = ctx.measureText(p.bubble.text).width;
    const bw = tw + 18, bh = this.hgt * 0.07 + 6;
    const x = Math.min(this.w - bw - 4, Math.max(4, p.box.x + p.box.w / 2 - bw / 2));
    const y = Math.max(4, p.box.y - bh - 8);
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#3A3532';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, bw, bh, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#282523';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.bubble.text, x + 9, y + bh / 2 + 1);
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

