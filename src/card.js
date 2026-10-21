// 9:16 속보 자랑 카드 (1080×1920). 인스타 스토리에 바로 올릴 수 있는 크기.
import { MODES } from './data.js';
import { drawMeme } from './memes.js';
import { t, L, LANG } from './i18n.js';

const W = 1080, H = 1920;
const DISPLAY = '"Black Han Sans", sans-serif';
const BODY = 'system-ui, "Noto Sans KR", sans-serif';

/** maxWidth 안에 들어갈 때까지 글자를 줄인다 */
function fitFont(g, text, family, size, maxWidth, weight = '') {
  let s = size;
  do { g.font = `${weight} ${s}px ${family}`; } while (g.measureText(text).width > maxWidth && (s -= 2) > 20);
  return s;
}

const two = n => String(n).padStart(2, '0');

/**
 * data: { ev: { t, char, mode }, meme (memes.js spec), title, rarity, rarityColor, isNew, owned, all, nth, streak, headline }
 */
export async function drawCard(canvas, data) {
  const mode = MODES[data.ev.mode] || MODES.hold;
  await document.fonts?.load?.(`80px "Black Han Sans"`);
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');
  const d = new Date(data.ev.t);

  // 검정 바탕 위: 맨 위 LIVE 줄 → 화면에서 본 그 짤 (정사각형) → 속보 띠 → 칭호
  g.fillStyle = '#111';
  g.fillRect(0, 0, W, H);
  g.textBaseline = 'middle';
  g.fillStyle = '#E8261C';
  g.fillRect(44, 26, 128, 58);
  g.fillStyle = '#fff';
  g.font = `900 34px ${BODY}`;
  g.textAlign = 'center';
  g.fillText(t('card.live'), 108, 56);
  g.textAlign = 'left';
  g.font = `900 38px ${BODY}`;
  g.fillText(t('card.channel'), 192, 56);
  g.textAlign = 'right';
  g.font = `700 36px ${BODY}`;
  g.fillText(`${d.getFullYear()}.${two(d.getMonth() + 1)}.${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}`, W - 44, 56);
  await drawMeme(g, data.meme, 0, 110, W);

  // 속보 띠: TV 하단 자막처럼 빨간 탭 + 흰 헤드라인 + 노란 정보 줄
  const tag = t(data.ev.mode === 'loud' ? 'burst.exclusive' : 'burst.breaking');
  const time = `${two(d.getHours())}:${two(d.getMinutes())}`;
  let y = 1190;
  g.textBaseline = 'middle';
  g.font = `900 40px ${BODY}`;
  const tagW = g.measureText(tag).width + 64;
  slant(g, 0, y + 18, tagW, 64, '#E8261C');          // 빨간 탭 (오른쪽이 비스듬)
  g.fillStyle = '#fff';
  g.textAlign = 'left';
  g.fillText(tag, 28, y + 51);
  g.fillStyle = '#FFD400';
  g.font = `800 36px ${BODY}`;
  g.fillText(`● ${time}`, tagW + 22, y + 51);
  y += 82;
  g.fillStyle = '#fff';
  g.fillRect(0, y, W, 128);
  g.fillStyle = '#FFD400';
  g.fillRect(0, y, 18, 128);
  g.fillStyle = '#111';
  fitFont(g, data.headline, BODY, 58, W - 96, '900');
  g.fillText(data.headline, 48, y + 66);
  y += 128;
  g.fillStyle = '#FFD400';
  g.fillRect(0, y, W, 64);
  g.fillStyle = '#111';
  g.font = `800 32px ${BODY}`;
  g.fillText(`${t('card.channel')}  ·  ${t('card.sub', { nth: data.nth, streak: data.streak, mode: L(mode.name) })}`, 48, y + 33, W - 96);

  // 칭호: 등급 칩 + 큰 이름(등급 색) + 도감 진행 막대
  y = 1500;
  if (data.rarity) {   // 꽝(이미 가진 칭호)이면 칩 없이 자막만
    g.font = `900 34px ${BODY}`;
    const chipW = g.measureText(data.rarity).width + 48;
    pill(g, 56, y, chipW, 58, data.rarityColor || '#fff');
    g.fillStyle = '#111';
    g.fillText(data.rarity, 80, y + 30);
    g.fillStyle = '#9A9A95';
    g.font = `600 34px ${BODY}`;
    g.fillText(data.isNew ? t('burst.new') : t('card.titleLabel'), 56 + chipW + 20, y + 30);
  }
  g.fillStyle = data.rarityColor || '#fff';
  fitFont(g, data.title, DISPLAY, 128, W - 112);
  g.textBaseline = 'alphabetic';
  g.fillText(data.title, 56, y + 200);

  const barY = 1735, barW = W - 112;
  pill(g, 56, barY, barW, 18, '#2C2C2A');
  pill(g, 56, barY, Math.max(18, barW * data.owned / data.all), 18, data.rarityColor || '#fff');
  g.textBaseline = 'middle';
  g.fillStyle = '#9A9A95';
  g.font = `600 30px ${BODY}`;
  g.fillText(t('home.dexCount', { n: data.owned, all: data.all }), 56, barY + 56);

  g.fillStyle = '#fff';
  g.font = `40px ${DISPLAY}`;
  g.fillText(t('appName'), 56, H - 52);
  const appW = g.measureText(t('appName')).width;
  g.fillStyle = '#777';
  g.font = `500 30px ${BODY}`;
  g.fillText(t('card.footer'), 56 + appW + (LANG === 'ko' ? 6 : 16), H - 50);
}

function slant(g, x, y, w, h, color) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x + w, y);
  g.lineTo(x + w - h * 0.35, y + h);
  g.lineTo(x, y + h);
  g.closePath();
  g.fill();
}

function pill(g, x, y, w, h, color) {
  g.fillStyle = color;
  g.beginPath();
  g.roundRect(x, y, w, h, h / 2);
  g.fill();
}
