// 9:16 속보 자랑 카드 (1080×1920). 인스타 스토리에 바로 올릴 수 있는 크기.
import { charById, MODES } from './data.js';
import { t, L } from './i18n.js';
import { pixelCanvas, FACE } from './pixels.js';

const W = 1080, H = 1920;
const DISPLAY = '"Black Han Sans", sans-serif';
const BODY = 'system-ui, "Noto Sans KR", sans-serif';
const imageCache = new Map();

function loadImage(src) {
  if (!imageCache.has(src)) {
    imageCache.set(src, new Promise(resolve => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => resolve(null);
      im.src = src;
    }));
  }
  return imageCache.get(src);
}

/** maxWidth 안에 들어갈 때까지 글자를 줄인다 */
function fitFont(g, text, family, size, maxWidth, weight = '') {
  let s = size;
  do { g.font = `${weight} ${s}px ${family}`; } while (g.measureText(text).width > maxWidth && (s -= 2) > 20);
  return s;
}

function outlined(g, text, x, y, size, stroke = 14) {
  g.font = `${size}px ${DISPLAY}`;
  g.lineJoin = 'round';
  g.lineWidth = stroke;
  g.strokeStyle = '#111';
  g.strokeText(text, x, y);
  g.fillStyle = '#fff';
  g.fillText(text, x, y);
}

const two = n => String(n).padStart(2, '0');

/**
 * data: { ev: { t, char, mode }, title, rarity, jackpot, owned, all, nth, streak, headline, caption }
 */
export async function drawCard(canvas, data) {
  const c = charById(data.ev.char) || charById('hamster');
  const mode = MODES[data.ev.mode] || MODES.hold;
  const cool = data.ev.mode === 'hold' || data.jackpot;
  const img = await loadImage(cool ? c.portrait : c.sprites.react);
  await document.fonts?.load?.(`80px "Black Han Sans"`);
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');
  const d = new Date(data.ev.t);

  // 바탕: 위는 결과 색, 아래는 검정 뉴스 띠
  g.fillStyle = '#111';
  g.fillRect(0, 0, W, H);
  g.fillStyle = mode.color;
  g.fillRect(0, 0, W, 1300);

  // 도트 효과 (터지는 화면과 같은 규칙): 냄 = "=3", 진동 = 거품, 참음·잭팟 = 선글라스, 잭팟 = 머니건 + 지폐
  g.imageSmoothingEnabled = false;
  const dot = (name, x, y, scale, rot = 0, flip = false) => {
    const im = pixelCanvas(name, scale);
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    if (flip) g.scale(-1, 1);
    g.drawImage(im, -im.width / 2, -im.height / 2);
    g.restore();
  };
  if (data.jackpot) {
    [[180, 300, 0.4], [820, 240, -0.3], [930, 520, 0.6], [140, 640, -0.5], [760, 900, 0.2], [300, 180, -0.1], [600, 160, 0.5]]
      .forEach(([x, y, r], i) => dot(i % 2 ? 'bill' : 'bill2', x, y, 14, r));
  }
  if (img) {
    const h = 760, w = h * img.naturalWidth / img.naturalHeight;
    g.save();
    g.translate(W / 2, 260 + h / 2);
    g.rotate(-0.05);
    g.drawImage(img, -w / 2, -h / 2, w, h);
    if (cool) {
      const f = FACE[c.id];
      const sh = pixelCanvas('shades', 1);
      const sw = f.w * w, shh = sw * sh.height / sh.width;
      g.imageSmoothingEnabled = false;
      g.drawImage(sh, -w / 2 + (f.x - f.w / 2) * w, -h / 2 + f.y * h - shh / 2, sw, shh);
    }
    g.restore();
  }
  if (data.ev.mode === 'loud' && !data.jackpot) {
    dot('toot', 860, 860, 16, -0.1);
    dot('toot', 960, 740, 11, -0.2);
    dot('toot', 170, 760, 12, 0.1, true);
  }
  if (data.ev.mode === 'soft') [[180, 420, 14], [870, 360, 10], [930, 620, 16], [140, 820, 9], [820, 180, 8]].forEach(([x, y, s]) => dot('bubble', x, y, s));
  if (data.jackpot) dot('moneygun', 200, 880, 14, -0.3);

  // 화면 위: LIVE · 채널 · 날짜
  g.textBaseline = 'middle';
  g.fillStyle = '#E8261C';
  g.fillRect(44, 50, 128, 58);
  g.fillStyle = '#fff';
  g.font = `900 34px ${BODY}`;
  g.textAlign = 'center';
  g.fillText(t('card.live'), 108, 80);
  g.textAlign = 'left';
  g.fillStyle = '#111';
  g.font = `900 38px ${BODY}`;
  g.fillText(t('card.channel'), 192, 80);
  g.textAlign = 'right';
  g.font = `700 36px ${BODY}`;
  g.fillText(`${d.getFullYear()}.${two(d.getMonth() + 1)}.${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}`, W - 44, 80);

  // 자막 스티커
  g.save();
  g.translate(64, 1060);
  g.rotate(-0.07);
  g.textAlign = 'left';
  outlined(g, data.caption, 0, 0, 92);
  g.restore();

  // 속보 띠
  const tag = t(data.ev.mode === 'loud' ? 'burst.exclusive' : 'burst.breaking');
  const y = 1190, bandH = 132;
  g.font = `900 56px ${BODY}`;
  const tagW = g.measureText(tag).width + 70;
  g.fillStyle = '#E8261C';
  g.fillRect(0, y, tagW, bandH);
  g.fillStyle = '#fff';
  g.fillRect(tagW, y, W - tagW, bandH);
  g.textAlign = 'center';
  g.fillText(tag, tagW / 2, y + bandH / 2);
  g.textAlign = 'left';
  g.fillStyle = '#111';
  fitFont(g, data.headline, BODY, 54, W - tagW - 70, '900');
  g.fillText(data.headline, tagW + 34, y + bandH / 2);
  g.fillStyle = '#222';
  g.fillRect(0, y + bandH, W, 86);
  g.fillStyle = '#ddd';
  g.font = `500 36px ${BODY}`;
  g.fillText(t('card.sub', { nth: data.nth, streak: data.streak, mode: L(mode.name) }), 40, y + bandH + 43, W - 80);

  // 오늘의 칭호
  g.textBaseline = 'alphabetic';
  g.fillStyle = '#aaa';
  g.font = `500 40px ${BODY}`;
  g.fillText(`${t('card.titleLabel')} · ${data.rarity}`, 56, 1530);
  g.fillStyle = mode.color;
  fitFont(g, data.title, DISPLAY, 132, W - 112);
  g.fillText(data.title, 56, 1690);

  g.fillStyle = '#888';
  g.font = `500 34px ${BODY}`;
  g.fillText(t('card.footer'), 56, H - 60);
  g.textAlign = 'right';
  g.fillText(t('home.dexCount', { n: data.owned, all: data.all }), W - 56, H - 60);
}
