// 자랑 이미지 (1080×1240): 화면에서 본 그 짤 (정사각형) 그대로 + 아래 얇은 띠 (등급 칩 · 칭호 이름 · 앱 이름).
// 속보는 이제 짤 유형 하나라 따로 감싸지 않는다.
import { drawMeme } from './memes.js';
import { t } from './i18n.js';

const W = 1080, STRIP = 160, H = W + STRIP;
const DISPLAY = '"Black Han Sans", sans-serif';
const BODY = 'system-ui, "Noto Sans KR", sans-serif';

/** maxWidth 안에 들어갈 때까지 글자를 줄인다 */
function fitFont(g, text, family, size, maxWidth, weight = '') {
  let s = size;
  do { g.font = `${weight} ${s}px ${family}`; } while (g.measureText(text).width > maxWidth && (s -= 2) > 20);
  return s;
}

const loadImage = src => new Promise(resolve => { const im = new Image(); im.onload = () => resolve(im); im.onerror = () => resolve(null); im.src = src; });

/** 프레임 그림에서 투명하게 뚫린 칸 (짤이 들어갈 자리) 찾기 */
function holeOf(im) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.drawImage(im, 0, 0, W, H);
  const a = g.getImageData(0, 0, W, H).data, see = (x, y) => a[(y * W + x) * 4 + 3] < 20;
  const cx = W >> 1, cy = Math.round(H * 0.45);
  let l = cx, r = cx, t = cy, b = cy;
  while (l > 0 && see(l - 1, cy)) l--;
  while (r < W - 1 && see(r + 1, cy)) r++;
  while (t > 0 && see(cx, t - 1)) t--;
  while (b < H - 1 && see(cx, b + 1)) b++;
  return { x: l, y: t, w: r - l + 1, h: b - t + 1 };
}

/** data: { ev, meme (memes.js spec), rarity (칭호 등급, 없으면 짤 뽑기 · 속보), chip (등급 이름), name (칭호 이름 또는 한 줄), how (조건), sub (누가 · 언제), frame (꾸미기 공유 프레임 그림) } */
export async function drawCard(canvas, data) {
  await document.fonts?.load?.(`80px "Black Han Sans"`);
  const frame = data.frame && await loadImage(data.frame);
  if (frame) {   // 프레임: 뚫린 칸에 짤을 맞춰 넣고 그 위에 프레임을 덮는다 (프레임 그림은 1080×1240)
    canvas.width = W;
    canvas.height = H;
    const g = canvas.getContext('2d');
    const hole = holeOf(frame), S = Math.min(hole.w, hole.h);
    g.fillStyle = '#111';
    g.fillRect(0, 0, W, H);
    await drawMeme(g, data.meme, hole.x + (hole.w - S) / 2, hole.y + (hole.h - S) / 2, S);
    g.drawImage(frame, 0, 0, W, H);
    return;
  }
  await drawTrophy(canvas, data);
}

// ---------------------------------------------------------------- 자랑 카드 (1080×1350, 인스타 4:5)
// 등급마다 바탕이 다르다: 노멀 형광 · 레어 분홍 홀로 · 레전드 형광→하늘 호일 · 잭팟 금박 + 햇살 + 무지개 테두리.
// 위: '칭호 획득!' 리본 + 등급 칩 / 가운데: 짤 (흰 테두리 스티커, 살짝 기울임) / 아래: 큰 칭호 이름 · 조건 · 누가 언제 · 앱 이름 도장
const CW = 1080, CH = 1350;
const THEME = {
  normal: { bg: ['#D7FF3D', '#C6F01E'], ink: '#111', chip: '#FFFFFF', ribbon: '#111', ribbonInk: '#D7FF3D', dots: 'rgba(0,0,0,.07)' },
  rare: { bg: ['#FFD6EC', '#FF9ACD', '#FFE9F4'], ink: '#111', chip: '#FFB3D9', ribbon: '#111', ribbonInk: '#FF9ACD', dots: 'rgba(255,255,255,.35)', shine: true },
  legend: { bg: ['#E9FF6A', '#7DF0FF', '#D7FF3D', '#B9A8FF'], ink: '#111', chip: '#D7FF3D', ribbon: '#111', ribbonInk: '#E9FF6A', dots: 'rgba(255,255,255,.4)', shine: true, stars: 7 },
  jackpot: { bg: ['#FFF3A8', '#FFC700', '#FFE45C', '#E89B00'], ink: '#3A2600', chip: '#FFD400', ribbon: '#3A2600', ribbonInk: '#FFE45C', dots: 'rgba(255,255,255,.3)', shine: true, stars: 12, rays: true, rainbow: true },
  meme: { bg: ['#FFFFFF', '#F2F2F0'], ink: '#111', chip: '#D7FF3D', ribbon: '#111', ribbonInk: '#FFFFFF', dots: 'rgba(0,0,0,.05)' }
};
const RAINBOW = ['#FF2EA6', '#FFD400', '#2EFF6A', '#22C8FF', '#B98CFF', '#FF2EA6'];

function star(g, x, y, r, color) {
  g.save();
  g.translate(x, y);
  g.fillStyle = color;
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4, rr = i % 2 ? r * 0.28 : r;
    g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
  g.restore();
}

/** 글자를 maxWidth 에 맞춰 두 줄까지 (단어 단위) */
function wrap2(g, text, family, size, maxWidth) {
  for (let s = size; s >= 44; s -= 4) {
    g.font = `${s}px ${family}`;
    if (g.measureText(text).width <= maxWidth) return { s, lines: [text] };
    const words = text.split(' ');
    for (let k = words.length - 1; k > 0; k--) {
      const a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
      if (g.measureText(a).width <= maxWidth && g.measureText(b).width <= maxWidth) return { s, lines: [a, b] };
    }
  }
  g.font = `44px ${family}`;
  return { s: 44, lines: [text] };
}

async function drawTrophy(canvas, data) {
  canvas.width = CW;
  canvas.height = CH;
  const g = canvas.getContext('2d');
  const th = THEME[data.theme || data.rarity] || THEME.meme;
  // 바탕: 대각선 그라데이션 + 물방울 무늬
  const bg = g.createLinearGradient(0, 0, CW, CH);
  th.bg.forEach((c, i) => bg.addColorStop(i / (th.bg.length - 1), c));
  g.fillStyle = bg;
  g.fillRect(0, 0, CW, CH);
  if (th.rays) {   // 잭팟: 가운데서 퍼지는 햇살
    g.save();
    g.translate(CW / 2, 560);
    g.fillStyle = 'rgba(255,255,255,.28)';
    for (let i = 0; i < 24; i += 2) {
      g.beginPath();
      g.moveTo(0, 0);
      g.arc(0, 0, 1500, (i * Math.PI) / 12, ((i + 1) * Math.PI) / 12);
      g.closePath();
      g.fill();
    }
    g.restore();
  }
  g.fillStyle = th.dots;
  for (let y = 18; y < CH; y += 36) for (let x = (y / 36) % 2 ? 18 : 36; x < CW; x += 36) { g.beginPath(); g.arc(x, y, 5, 0, 6.283); g.fill(); }
  if (th.shine) {   // 홀로그램 빛 줄기
    g.save();
    g.rotate(-0.35);
    for (const [x, w, a] of [[-120, 160, 0.35], [260, 70, 0.25], [700, 220, 0.3]]) {
      const sh = g.createLinearGradient(x, 0, x + w, 0);
      sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, `rgba(255,255,255,${a})`); sh.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = sh;
      g.fillRect(x, -400, w, CH + 900);
    }
    g.restore();
  }
  if (th.rainbow) {   // 잭팟: 무지개 테두리
    const rb = g.createLinearGradient(0, 0, CW, CH);
    RAINBOW.forEach((c, i) => rb.addColorStop(i / (RAINBOW.length - 1), c));
    g.strokeStyle = rb;
    g.lineWidth = 22;
    g.strokeRect(11, 11, CW - 22, CH - 22);
  }

  // 위: 리본 '칭호 획득!' + 등급 칩
  const ribbon = data.rarity ? t('card.got') : t('card.memeTag');
  g.textBaseline = 'middle';
  g.font = `60px ${DISPLAY}`;
  const rw = g.measureText(ribbon).width + 80;
  g.save();
  g.translate(64, 86);
  g.rotate(-0.04);
  g.fillStyle = th.ribbon;
  g.beginPath();
  g.moveTo(0, -46); g.lineTo(rw, -46); g.lineTo(rw - 26, 0); g.lineTo(rw, 46); g.lineTo(0, 46); g.closePath();
  g.fill();
  g.fillStyle = th.ribbonInk;
  g.fillText(ribbon, 34, 4);
  g.restore();
  if (data.chip) {
    g.font = `900 40px ${BODY}`;
    const cw = g.measureText(data.chip).width + 56;
    const cx = CW - 64 - cw;
    g.save();
    g.translate(cx + cw / 2, 86);
    g.rotate(0.06);
    g.fillStyle = '#111';
    g.beginPath(); g.roundRect(-cw / 2 + 6, -34 + 7, cw, 68, 34); g.fill();
    g.fillStyle = th.chip;
    g.strokeStyle = '#111';
    g.lineWidth = 5;
    g.beginPath(); g.roundRect(-cw / 2, -34, cw, 68, 34); g.fill(); g.stroke();
    g.fillStyle = '#111';
    g.textAlign = 'center';
    g.fillText(data.chip, 0, 3);
    g.restore();
    g.textAlign = 'left';
  }

  // 가운데: 짤 스티커 (그림자 → 흰 테두리 → 검은 선 → 짤)
  const S = 820, mx = (CW - S) / 2, my = 168;
  g.save();
  g.translate(CW / 2, my + S / 2);
  g.rotate(data.rarity === 'jackpot' ? -0.035 : -0.022);
  g.translate(-CW / 2, -(my + S / 2));
  g.fillStyle = 'rgba(0,0,0,.28)';
  g.beginPath(); g.roundRect(mx - 22 + 16, my - 22 + 20, S + 44, S + 44, 34); g.fill();
  g.fillStyle = '#fff';
  g.beginPath(); g.roundRect(mx - 22, my - 22, S + 44, S + 44, 34); g.fill();
  g.strokeStyle = '#111';
  g.lineWidth = 6;
  g.stroke();
  g.save();
  g.beginPath(); g.roundRect(mx, my, S, S, 18); g.clip();
  await drawMeme(g, data.meme, mx, my, S);
  g.restore();
  g.lineWidth = 4;
  g.beginPath(); g.roundRect(mx, my, S, S, 18); g.stroke();
  g.restore();

  // 반짝이 별 (레전드 · 잭팟)
  const stars = th.stars || 0;
  const SPOTS = [[70, 300, 34], [1000, 230, 26], [40, 860, 22], [1030, 700, 38], [120, 1020, 18], [980, 1000, 26], [520, 150, 18], [40, 1180, 20], [1040, 1180, 22], [60, 560, 16], [1040, 470, 18], [700, 140, 14]];
  for (let i = 0; i < stars; i++) { const [x, y, r] = SPOTS[i]; star(g, x, y, r + 4, '#111'); star(g, x, y, r, '#FFFFFF'); }

  // 아래: 칭호 이름 (크게, 흰 테두리) · 조건 · 누가 언제 · 앱 도장
  const top = my + S + 34;
  const fitName = wrap2(g, data.name || '', DISPLAY, 104, CW - 140);
  const lines = fitName.lines, s = lines.length > 1 ? Math.min(fitName.s, 80) : fitName.s;   // 두 줄이면 조건 · 아래 줄과 안 겹치게 작게
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.lineJoin = 'round';
  lines.forEach((line, i) => {
    const y = top + s * 0.92 + i * s * 1.02;
    g.font = `${s}px ${DISPLAY}`;
    g.lineWidth = s * 0.2;
    g.strokeStyle = '#fff';
    g.strokeText(line, CW / 2, y);
    g.fillStyle = th.ink;
    g.fillText(line, CW / 2, y);
  });
  let y = top + s * 0.92 + (lines.length - 1) * s * 1.02 + 58;
  if (data.how) {
    g.font = `800 34px ${BODY}`;
    fitFont(g, data.how, BODY, 34, CW - 160, '800');
    g.fillStyle = th.ink;
    g.globalAlpha = 0.78;
    g.fillText(data.how, CW / 2, y);
    g.globalAlpha = 1;
    y += 50;
  }
  // 맨 아래 줄: 왼쪽 누가 · 언제, 오른쪽 앱 이름 도장
  const by = CH - 54;
  g.textBaseline = 'middle';
  g.textAlign = 'left';
  g.font = `700 30px ${BODY}`;
  g.fillStyle = th.ink;
  g.globalAlpha = 0.75;
  if (data.sub) g.fillText(data.sub, 60, by);
  g.globalAlpha = 1;
  g.font = `44px ${DISPLAY}`;
  const app = t('appName'), aw = g.measureText(app).width + 44;
  g.save();
  g.translate(CW - 60 - aw / 2, by);
  g.rotate(-0.08);
  g.fillStyle = '#111';
  g.beginPath(); g.roundRect(-aw / 2, -34, aw, 68, 14); g.fill();
  g.fillStyle = '#D7FF3D';
  g.textAlign = 'center';
  g.fillText(app, 0, 3);
  g.restore();
  g.textAlign = 'left';
  // 레이아웃이 짧은 칭호에서 비지 않게: 이름이 한 줄이고 조건이 있으면 여백이 남는 대로 둔다 (y 는 위에서 다 씀)
  return y;
}
