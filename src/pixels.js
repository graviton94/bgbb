// 도트 그림 (선글라스 · 머니건 · 지폐 · 방구 구름 · 거품). 글자 지도를 캔버스에 칸 단위로 찍는다.
// 파일 없이 코드로 그려서 어떤 크기로 키워도 도트가 또렷하다 (image-rendering: pixelated).

const PALETTE = {
  k: '#000000', w: '#FFFFFF', l: '#C8C8C8', d: '#6B6B6B',
  g: '#6CD86B', G: '#2E8B3A', y: '#FFD400', Y: '#C99A00',
  c: '#B8F2A0', C: '#5FB54A', b: '#9BE7FF', B: '#2F8FD8',
  // 머니건 (빨간 박스 총 + 반짝이 글씨 띠)
  R: '#9E1219', r: '#E0262B', p: '#FF7F7F', a: '#8FF3FF', m: '#E59CFF', s: '#FFFFFF',
  // 지폐 (만원 초록 · 오만원 노랑)
  n: '#B7D6A3', N: '#56854A', o: '#8DAE7B', u: '#EBD488', U: '#9C8233', q: '#CDB463'
};

const lens = ['kkkwwkkkkkk', '.kkkkwwkkkk', '..kkkkkkkk.', '...kkkkkk..'];

export const PIXELS = {
  // "Deal with it" 선글라스 26×5
  shades: ['k'.repeat(26), ...lens.map(r => `${r}....${r}`)],

  // 머니건 24×12: 빨간 박스 몸통, 옆면 반짝이 글씨 띠, 오른쪽 위 지폐 나오는 입구
  moneygun: [
    '....RRRRRRRRRRRRRRRRRRRR',
    '...RpppppppppppppppppkkR',
    '..RrrrrrrrrrrrrrrrrrrkkR',
    '.RrraammssaammssaammrrrR',
    'RrrraammssaammssaammrrrR',
    'RrrrrrrrrrrrrrrrrrrrrrrR',
    'RRRRRRRRRRrrrrrRRRRRRRR.',
    '........RrrrrrR.........',
    '.......RrrrrrR..........',
    '......RrrrrrR...........',
    '.....RrrrrrR............',
    '.....RRRRRR.............'
  ],

  // 지폐 18×7: 만원 (초록), 오만원 (노랑)
  bill: [
    'NNNNNNNNNNNNNNNNNN',
    'NnnnnnnnnnnnnnnnnN',
    'NnoooonnnnnnnNnNnN',
    'NnoNNonnnnnnnnnnnN',
    'NnoooonnnnnnnNNNnN',
    'NnnnnnnnnnnnnnnnnN',
    'NNNNNNNNNNNNNNNNNN'
  ],
  bill2: [
    'UUUUUUUUUUUUUUUUUU',
    'UuuuuuuuuuuuuuuuuU',
    'UuqqqquuuuuuuUuUuU',
    'UuqUUquuuuuuuuuuuU',
    'UuqqqquuuuuuuUUUuU',
    'UuuuuuuuuuuuuuuuuU',
    'UUUUUUUUUUUUUUUUUU'
  ],

  // 방구 "=3" 11×7
  toot: [
    '......kkkk.',
    '.........kk',
    'kkkkk....kk',
    '......kkkk.',
    'kkkkk....kk',
    '.........kk',
    '......kkkk.'
  ],

  // 거품 7×7
  bubble: [
    '..BBB..',
    '.BwbbB.',
    'BwbbbbB',
    'BbbbbbB',
    'BbbbbbB',
    '.BbbbB.',
    '..BBB..'
  ]
};

const cache = new Map();

/** 도트 그림 하나를 scale 배로 그린 캔버스 */
export function pixelCanvas(name, scale = 8) {
  const key = `${name}@${scale}`;
  if (cache.has(key)) return cache.get(key);
  const rows = PIXELS[name];
  const c = document.createElement('canvas');
  c.width = rows[0].length * scale;
  c.height = rows.length * scale;
  const g = c.getContext('2d');
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (!PALETTE[ch]) return;
    g.fillStyle = PALETTE[ch];
    g.fillRect(x * scale, y * scale, scale, scale);
  }));
  cache.set(key, c);
  return c;
}

export const pixelUrl = (name, scale) => pixelCanvas(name, scale).toDataURL('image/png');

// 선글라스를 씌울 자리: 정면 그림(portrait) 기준 눈 가운데와 안경 너비 (그림 너비 대비)
export const FACE = {
  hamster: { x: 0.485, y: 0.27, w: 0.62 },
  tit: { x: 0.33, y: 0.31, w: 0.52 },
  cat: { x: 0.40, y: 0.33, w: 0.52 }
};
