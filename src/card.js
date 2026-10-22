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

/** data: { ev, meme (memes.js spec), chip (등급 이름, 없으면 칩 없음), chipColor, name (칭호 이름 또는 한 줄), frame (꾸미기 공유 프레임 그림, 없으면 검은 띠) } */
export async function drawCard(canvas, data) {
  await document.fonts?.load?.(`80px "Black Han Sans"`);
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');
  const frame = data.frame && await loadImage(data.frame);
  if (frame) {   // 프레임: 뚫린 칸에 짤을 맞춰 넣고 그 위에 프레임을 덮는다
    const hole = holeOf(frame), S = Math.min(hole.w, hole.h);
    g.fillStyle = '#111';
    g.fillRect(0, 0, W, H);
    await drawMeme(g, data.meme, hole.x + (hole.w - S) / 2, hole.y + (hole.h - S) / 2, S);
    g.drawImage(frame, 0, 0, W, H);
    return;
  }
  await drawMeme(g, data.meme, 0, 0, W);

  g.fillStyle = '#111';
  g.fillRect(0, W, W, STRIP);
  g.textBaseline = 'middle';
  const cy = W + STRIP / 2;
  let x = 44;
  if (data.chip) {
    g.font = `900 34px ${BODY}`;
    const cw = g.measureText(data.chip).width + 44;
    pill(g, x, cy - 28, cw, 56, data.chipColor);
    g.fillStyle = '#111';
    g.fillText(data.chip, x + 22, cy + 1);
    x += cw + 22;
  }
  g.font = `40px ${DISPLAY}`;
  const appW = g.measureText(t('appName')).width;
  g.fillStyle = '#777';
  g.textAlign = 'right';
  g.fillText(t('appName'), W - 44, cy + 2);
  g.textAlign = 'left';
  g.fillStyle = data.chip ? data.chipColor : '#fff';
  fitFont(g, data.name || '', DISPLAY, 64, W - x - appW - 88);
  g.fillText(data.name || '', x, cy + 4);
}

function pill(g, x, y, w, h, color) {
  g.fillStyle = color;
  g.beginPath();
  g.roundRect(x, y, w, h, h / 2);
  g.fill();
}
