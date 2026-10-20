// 9:16 크레용 그림일기 카드 (1080×1920). 인스타 스토리에 바로 올릴 수 있는 크기.
import { CHARACTERS, MODES } from './data.js';

const W = 1080, H = 1920;
const INK = '#282523';
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

// 손으로 그린 듯 살짝 떨리는 선
function crayonLine(g, x1, y1, x2, y2, color, width = 4) {
  g.save();
  g.strokeStyle = color;
  g.lineWidth = width;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x1, y1);
  const steps = Math.max(8, Math.hypot(x2 - x1, y2 - y1) / 14);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    g.lineTo(x1 + (x2 - x1) * t + (Math.random() - 0.5) * 3, y1 + (y2 - y1) * t + (Math.random() - 0.5) * 3);
  }
  g.stroke();
  g.restore();
}

function crayonBox(g, x, y, w, h, fill, r = 26) {
  g.save();
  g.fillStyle = fill;
  g.strokeStyle = INK;
  g.lineWidth = 5;
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fill();
  g.stroke();
  g.restore();
}

function stamp(g, x, y, title, sub, color) {
  g.save();
  g.translate(x, y);
  g.rotate(-0.2);
  g.strokeStyle = color;
  g.fillStyle = color;
  for (const [r, lw] of [[118, 7], [100, 3]]) {
    g.lineWidth = lw;
    g.beginPath();
    for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.12) {
      const rr = r + (Math.random() - 0.5) * 4;
      g[a === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * rr, Math.sin(a) * rr);
    }
    g.stroke();
  }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '40px Jua, sans-serif';
  g.fillText(title, 0, -12);
  g.font = '28px Gaegu, cursive';
  g.fillText(sub, 0, 34);
  g.restore();
}

function wrap(g, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const ch of text) {
    if (g.measureText(line + ch).width > maxWidth && line) { lines.push(line); line = ch; }
    else line += ch;
  }
  if (line) lines.push(line);
  return lines;
}

function verdict(d) {
  const all = d.loud + d.soft + d.hold;
  if (all === 0) return { title: '평화로운 하루 🌈', stamp: ['휴전 중', '오늘은 쉬는 날'], color: '#4C6EF5' };
  if (d.hold >= 5) return { title: '인내의 화신 🧘', stamp: ['완벽한 범죄', '참음 마스터'], color: MODES.hold.color };
  if (d.loud >= 4) return { title: '확성기 방구 대장 📢', stamp: ['냄새주의!', '대담한 폭격기'], color: MODES.loud.color };
  if (d.hold >= d.loud) return { title: '은밀한 가스 암살자 🕵️', stamp: ['참 잘 참았어요', '인내 수련 중'], color: '#E03131' };
  return { title: '들킬 듯 말 듯 💦', stamp: ['아슬아슬!', '심장 쫄깃'], color: '#E8590C' };
}

/** data: { day: {loud,soft,hold}, weather, note, hero (캐릭터 id), acorns } */
export async function drawDiary(canvas, data) {
  const hero = CHARACTERS.find(c => c.id === data.hero) || CHARACTERS[0];
  const others = CHARACTERS.filter(c => c !== hero);
  const [heroImg, ...otherImgs] = await Promise.all([hero, ...others].map(c => loadImage(c.sprites.base)));
  await document.fonts?.ready;

  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');
  const d = data.day;
  const v = verdict(d);

  // 모눈 도화지
  g.fillStyle = '#FFFDF6';
  g.fillRect(0, 0, W, H);
  g.strokeStyle = '#EFE8DA';
  g.lineWidth = 2;
  g.beginPath();
  for (let x = 0; x <= W; x += 54) { g.moveTo(x, 0); g.lineTo(x, H); }
  for (let y = 0; y <= H; y += 54) { g.moveTo(0, y); g.lineTo(W, y); }
  g.stroke();

  // 날짜 · 날씨
  const now = new Date();
  g.fillStyle = INK;
  g.font = '48px Gaegu, cursive';
  g.textBaseline = 'alphabetic';
  g.textAlign = 'left';
  g.fillText(`${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`, 90, 140);
  g.textAlign = 'right';
  g.fillText(`날씨: ${data.weather}`, W - 90, 140);
  crayonLine(g, 80, 172, W - 80, 172, INK, 5);

  g.textAlign = 'center';
  g.font = '84px Jua, sans-serif';
  g.fillText('나의 비밀 방구 일기', W / 2, 290);
  crayonLine(g, W / 2 - 330, 322, W / 2 + 330, 322, '#FED36A', 12);

  // 그림 칸
  crayonBox(g, 90, 370, W - 180, 560, '#F2FAF4', 34);
  g.save();
  g.shadowColor = 'rgba(40, 37, 35, 0.2)';
  g.shadowBlur = 16;
  g.shadowOffsetY = 10;
  const put = (im, cx, bottom, h) => {
    if (!im) return;
    const w = h * im.naturalWidth / im.naturalHeight;
    g.drawImage(im, cx - w / 2, bottom - h, w, h);
  };
  put(otherImgs[0], 270, 860, 230);
  put(otherImgs[1], W - 270, 860, 230);
  put(heroImg, W / 2, 900, 380);
  g.restore();

  // 칭호
  crayonBox(g, 90, 970, W - 180, 100, '#FFF4C2', 24);
  g.fillStyle = INK;
  g.font = '46px Jua, sans-serif';
  g.fillText(`오늘의 칭호: ${v.title}`, W / 2, 1036, W - 240);

  // 오늘 기록
  crayonBox(g, 90, 1110, W - 180, 360, '#FFFFFF', 26);
  g.textAlign = 'left';
  g.font = '50px Gaegu, cursive';
  [['loud', '대담하게 발사'], ['soft', '소심하게 피식'], ['hold', '눈치 보며 꾹']].forEach(([m, label], i) => {
    const y = 1210 + i * 105;
    g.fillStyle = MODES[m].color;
    g.beginPath();
    g.arc(160, y - 16, 22, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = INK;
    g.fillText(`${label} : ${d[m]}번 ${MODES[m].icon}`, 205, y, 560);
  });
  stamp(g, W - 245, 1290, v.stamp[0], v.stamp[1], v.color);

  // 한 줄 일기 (두 줄까지)
  crayonBox(g, 90, 1510, W - 180, 270, '#FFFCEB', 24);
  g.fillStyle = '#8A847C';
  g.font = '36px Jua, sans-serif';
  g.fillText('✏️ 오늘의 비밀 한 줄', 135, 1575);
  g.fillStyle = INK;
  g.font = '50px Gaegu, cursive';
  const note = data.note.trim() || '오늘도 주머니 속에서 평화를 지켰다!';
  wrap(g, `"${note}"`, W - 290).slice(0, 2).forEach((line, i) => {
    const y = 1660 + i * 76;
    g.fillText(line, 135, y);
    crayonLine(g, 135, y + 18, W - 135, y + 18, '#D9D1C0', 3);
  });

  g.textAlign = 'center';
  g.fillStyle = '#9A948C';
  g.font = '38px Gaegu, cursive';
  g.fillText(`#방구뿡  #도토리${data.acorns}개  #주머니속다마고치`, W / 2, H - 70);
}
