// 9:16 속보 자랑 카드 (1080×1920). 인스타 스토리에 바로 올릴 수 있는 크기.
import { charById, MODES } from './data.js';
import { t, L } from './i18n.js';

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
 * data: { ev: { t, char, mode }, title, rarity, owned, all, nth, streak, headline, caption }
 */
export async function drawCard(canvas, data) {
  const c = charById(data.ev.char) || charById('hamster');
  const mode = MODES[data.ev.mode] || MODES.hold;
  const img = await loadImage(c.sprites.react);
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

  if (img) {
    const h = 760, w = h * img.naturalWidth / img.naturalHeight;
    g.save();
    g.translate(W / 2, 260 + h / 2);
    g.rotate(-0.05);
    g.drawImage(img, -w / 2, -h / 2, w, h);
    g.restore();
  }

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
