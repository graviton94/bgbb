// 짤: 터질 때마다 그 상황으로 조립하는 정사각형 한 칸.
//  - 조립형: 배경 · 캐릭터 자리와 크기 · 문구(상황 + 한 방) · 문구 자리 · 소품을 매번 랜덤으로
//  - 캐릭터에 붙는 것(선글라스 = 얼굴, 방구 구름 = 엉덩이 옆, 머니건 = 손)은 캐릭터 상자 기준 좌표
//  - 레어 이상 칭호는 유니크 짤을 실사 사진으로 (assets/faces_real, 아래가 잘린 사진이라 바닥에 세운다)
//  - 레전드 짤: 상장 · CCTV · AI 분석 리포트 · 괄약근 주식 차트 + 구린 PPT · 썸네일 감성 (그라데이션 · 워드아트 · 누끼)
//  - 유니크 짤에는 단톡 캡처 · 뿡 예보 · 영수증 · 음악 앱 재생 화면도
//  - 유니크 짤 (엥? · 스티커+안경 · 참은 나 vs 뀐 나 · 들어갈 때 vs 나올 때 · 범인은 이 안에 · 현자 타임 · 상자 · 잭팟 돈)은 미리 만든 틀
// 결과는 spec (칸 대비 % 좌표 목록) 이라 화면(DOM)과 자랑 카드(canvas)가 같은 짤을 그린다.
import { face, charById } from './data.js';
import { L } from './i18n.js';
import { SHADES_BOX, SHADES_URL } from './pixels.js';

const deco = name => `assets/deco/${name}.webp`;
// 랜덤은 한 군데서: 칭호 짤은 칭호마다 같은 시드로 뽑아 언제 다시 그려도 똑같은 짤이 나온다
let R = Math.random;
function seeded(seed) {   // mulberry32
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = s => [...String(s)].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0;
function withSeed(seed, fn) {
  const prev = R;
  R = seed == null ? Math.random : seeded(seed);
  try { return fn(); } finally { R = prev; }
}
const rnd = (a, b) => a + R() * (b - a);
const pick = list => list[Math.floor(R() * list.length)];
const chance = p => R() < p;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ---------------------------------------------------------------- 문구
const W = {
  // 그 순간의 상황 (앞말)
  when: {
    dawn: { ko: '새벽 3시에', en: 'AT 3AM' }, morning: { ko: '출근길에', en: 'ON THE COMMUTE' }, lunch: { ko: '점심 먹고', en: 'AFTER LUNCH' },
    meeting: { ko: '회의 중에', en: 'MID-MEETING' }, afternoon: { ko: '오후 3시에', en: 'AT 3PM' }, evening: { ko: '퇴근길에', en: 'GOING HOME' },
    night: { ko: '야식 먹고', en: 'AFTER SNACKS' }, monday: { ko: '월요일부터', en: 'ON A MONDAY' }, friday: { ko: '불금이라', en: "IT'S FRIDAY" },
    weekend: { ko: '주말 낮잠 중', en: 'WEEKEND NAP' }
  },
  // 결과별 한 방 (뒷말)
  punch: {
    loud: { ko: ['뿌앙', '터짐', '다 들었음', '숨을 곳 없음', '부르릉'], en: ['BRAAP', 'IT BLEW', 'THEY HEARD', 'NO HIDING', 'PFFT'] },
    soft: { ko: ['부르르', '아무도 모름', '살짝만', '나만 앎'], en: ['BZZT', 'NOBODY KNOWS', 'JUST A BIT', 'ONLY ME'] },
    hold: { ko: ['참았음', '꾹', '아무 일 없었음', '괄약근 승리'], en: ['HELD IT', 'NOPE', 'NOTHING HAPPENED', 'CLENCH WIN'] }
  },
  generic: { ko: ['방금 그거', '나 아님', '증거 없음', '평화로움', '오늘도'], en: ['THAT WAS', 'NOT ME', 'NO EVIDENCE', 'PEACEFUL', 'ANOTHER DAY'] },
  label: { ko: ['해냈다', '실화냐', '멋지다', '터졌다', '잘했다'], en: ['Did it', 'For real?', 'Nice', 'It blew', 'Good job'] },
  labelRare: { legend: { ko: '레전드', en: 'Legend' }, jackpot: { ko: '잭팟', en: 'Jackpot' } },
  // 말풍선: 일부러 이상한 데서 줄을 바꾼다 (awkward)
  say: {
    any: { ko: ['참을 수 없는 육체', '말을 듣지 않는 엉덩이', '이건 내 의지가 아니었다', '조용한 데서만 나옴', '나도 놀람'],
      en: ["a body that won't listen", 'not my choice', 'only in quiet rooms', 'even I was surprised'] },
    loud: { ko: ['다 들었겠지', '숨을 곳이 없다'], en: ['they all heard', 'nowhere to hide'] },
    soft: { ko: ['아무도 몰랐겠지', '진동이라 다행'], en: ['nobody noticed', 'thank god for vibrate'] },
    hold: { ko: ['참는 게 제일 힘듦', '다음엔 안 참음'], en: ['holding is the hardest', 'not holding next time'] }
  },
  think: { ko: ['들켰나…?', '방금 그거\n나였나?', '아무도\n못 들었겠지'], en: ['did they\nhear?', 'was that…\nme?', 'nobody heard.\nright?'] },
  eng: { ko: ['엥?', '뭐임?'], en: ['huh?', 'wait what'] },
  deal: { ko: ['냄새?\n난 모르는 일', '아무 일도\n없었음', '증거 없음', '나 아님.\n진짜로'], en: ['Smell?\nNot my problem', 'Nothing\nhappened', 'No evidence', "Wasn't me.\nReally"] },
  money: { ko: ['돈 뿌리는\n엉덩이', '잭팟 터짐'], en: ['MAKE IT\nRAIN', 'JACKPOT'] },
  versus: { ko: [['참은 나', '뀐 나'], ['계획', '현실'], ['5분 전', '방금']], en: [['Me holding', 'Me not'], ['The plan', 'Reality'], ['5 min ago', 'Just now']] },
  expect: {
    ko: [['회의 들어갈 때', '회의 나올 때'], ['엘리베이터 탈 때', '엘리베이터 내릴 때'], ['도서관 입장', '도서관 퇴장']],
    en: [['Walking into\nthe meeting', 'Walking out'], ['Getting in\nthe elevator', 'Getting out'], ['Entering\nthe library', 'Leaving']]
  },
  lineup: { ko: ['범인은 이 안에 있다', '누가 뀌었나', '용의자 3명'], en: ['ONE OF THEM DID IT', 'WHO DID IT', '3 SUSPECTS'] },
  halo: { ko: ['현자 타임', '해탈', '평온'], en: ['POST-TOOT CLARITY', 'ENLIGHTENED', 'AT PEACE'] },
  sfx: { ko: ['뿡!', '뿌웅', '부르륵', '뽀옹', '뿡'], en: ['TOOT!', 'PFFT', 'BRRT', 'POOT'] },
  box: { ko: ['숨어서 뿡', '아무도 없음', '상자는 무죄', '들킨 적 없음'], en: ['Toot in hiding', 'Nobody here', 'The box is innocent', 'Never caught'] }
};

function whenKey(t) {
  const d = new Date(t), h = d.getHours(), wd = d.getDay();
  const options = [h < 6 ? 'dawn' : h < 10 ? 'morning' : h < 14 ? 'lunch' : h < 18 ? 'afternoon' : h < 20 ? 'evening' : 'night'];
  if (wd >= 1 && wd <= 5 && (h === 10 || h === 14 || h === 15)) options.push('meeting', 'meeting');
  if (wd === 1 && h < 12) options.push('monday');
  if (wd === 5 && h >= 17) options.push('friday');
  if ((wd === 0 || wd === 6) && h >= 12 && h < 18) options.push('weekend');
  return pick(options);
}

/** 일부러 어색한 데서 줄바꿈 ("말을 듣지 않\n는 엉덩이") */
function awkward(s) {
  // 영어는 단어 중간에서 끊으면 오타처럼 보여서 마지막 단어만 혼자 다음 줄로
  if (!/[\u3131-\uD79D]/.test(s)) { const i = s.lastIndexOf(' '); return i > 0 ? `${s.slice(0, i)}\n${s.slice(i + 1)}` : s; }
  const chars = [...s];
  let i = Math.round(chars.length * rnd(0.5, 0.65));
  if (chars[i] === ' ') i++;
  return `${chars.slice(0, i).join('').trimEnd()}\n${chars.slice(i).join('').trimStart()}`;
}

// 글자 폭 어림 (한글 1em, 영문 0.62em) → 칸에 들어가는 글자 크기 (칸 너비 대비 %)
const BASE = { sfx: 14, impact: 11.5, display: 8.6, thin: 18, small: 5, bubble: 4.4, label: 7.2 };
function fit(text, w, base) {
  const em = Math.max(...text.split('\n').map(line => [...line].reduce((n, c) => n + (/[ㄱ-힝]/.test(c) ? 1 : c === ' ' ? 0.3 : /[A-Z]/.test(c) ? 0.8 : 0.62), 0)));
  return Math.min(base, (w * 0.94) / Math.max(1, em));
}
const textItem = (s, x, y, w, style, extra = {}) => ({ k: 'text', s, x, y, w, style, size: fit(s, w, BASE[style]), ...extra });

const isNight = t => { const h = new Date(t).getHours(); return h >= 19 || h < 6; };
// 소품: 하늘에 뜨는 것 (위쪽 자리) · 땅에 놓는 것 (아래쪽 자리)
const SKY = { day: ['sun', 'cloud', 'balloon'], night: ['moon', 'stars', 'balloon'] };
const GROUND = { day: ['sunflower', 'tree', 'carrot', 'box'], night: ['campfire', 'box'] };
const DAY_BG = ['#FFFFFF', '#FFF3B0', '#CFEFFF', '#DCE9F5', '#E8FFD9', '#FFE1EC', '#B49E89', '#F2F2F2'];
const NIGHT_BG = ['#1F2747', '#2B2140', '#FFFFFF', '#B49E89'];
const DARK_BG = ['#1F2747', '#2B2140'];

// ---------------------------------------------------------------- 캐릭터와 붙는 것
const rect = (x, y, w, h, color) => ({ k: 'rect', x, y, w, h, color });
// 실사 사진에서 몸이 끝나는 높이 (1024 기준). 햄스터만 아래 여백이 있고 나머지는 사진 끝까지 몸
const REAL_BOTTOM = { hamster: { blank: 951, eng: 1024, shameless: 940, hold: 958, burst: 968, whistle: 973, thumbs_up: 952 } };
const bottomOf = (id, expr) => (REAL_BOTTOM[id]?.[expr] ?? 1024) / 1024;
/** 실사 사진은 아래가 잘린 사진이라 바닥(floor)에 몸 끝을 딱 붙여 세운다. 원화는 원래 자리 y 그대로 */
const charItem = (id, expr, x, y, w, { shades = false, sticker = false, r = 0, real = false, floor = null, clip = null } = {}) =>
  ({ k: 'char', id, expr, x, y: real && floor != null ? floor - w * bottomOf(id, expr) : y, w, r, shades, sticker, real, clip });   // clip = { x, y, w, h, rad, bg } 이 상자 밖은 잘라냄
/** 방구 소리 글자 (만화 효과음): 노랑 + 굵은 검정 테두리, 비스듬히 */
const sfx = (x, y, w, r, s = pick(L(W.sfx))) => ({ k: 'text', s, x, y, w, r, style: 'sfx', size: fit(s, w, BASE.sfx) });
/** 엉덩이 옆에서 터지는 효과음 (side = 1 오른쪽, -1 왼쪽) */
function fartFor(c, side) {
  const w = Math.min(36, c.w * 0.5);
  return sfx(side > 0 ? Math.min(100 - w, c.x + c.w * 0.82) : Math.max(0, c.x + c.w * 0.18 - w), c.y + c.w * 0.5, w, side > 0 ? rnd(-16, -6) : rnd(6, 16));
}
/** 손에 든 머니건 */
const gunFor = c => ({ k: 'img', src: deco('money_gun'), x: c.x - c.w * 0.2, y: c.y + c.w * 0.48, w: c.w * 0.62, r: -12, cls: 'm-gun' });

// ---------------------------------------------------------------- 유니크 짤 (미리 만든 틀)
export const UNIQUE = {
  eng: ({ id, real }) => ({
    bg: '#FFFFFF',
    items: [charItem(id, 'eng', -12, -4, 124, { real }), textItem(pick(L(W.eng)), 26, 4, 68, 'thin', { align: 'right' })],
    fx: { x: 0.5, y: 0.6 }
  }),
  deal: ({ id, real }) => ({
    bg: '#F2F2F2',
    items: [charItem(id, 'shameless', real ? 14 : 18, 27, real ? 72 : 70, { floor: 100, shades: true, sticker: !real, r: real ? 0 : -4, real }),
      textItem(pick(L(W.deal)), 5, 4, 80, 'display')],
    fx: { x: 0.5, y: 0.6 }
  }),
  // 참은 나 vs 뀐 나: 반반
  versus: ({ id, real }) => {
    const [a, b] = pick(L(W.versus));
    return {
      bg: '#FFFFFF',
      items: [rect(50, 0, 50, 100, '#FFE1EC'), rect(49.6, 0, 0.8, 100, '#111111'),
        textItem(a, 2, 6, 46, 'display', { align: 'center' }), textItem(b, 52, 6, 46, 'display', { align: 'center' }),
        charItem(id, 'hold', 2, 34, 46, { floor: 100, real }), charItem(id, 'burst', 52, 34, 46, { floor: 100, real })],
      fx: { x: 0.75, y: 0.6 }
    };
  },
  // 들어갈 때 vs 나올 때: 위아래
  expect: ({ id, real }) => {
    const [a, b] = pick(L(W.expect));
    return {
      bg: '#DCE9F5',
      items: [rect(0, 50, 100, 50, '#FFF3B0'), rect(0, 49.6, 100, 0.8, '#111111'),
        textItem(a, 5, 16, 52, 'display'), textItem(b, 5, 66, 52, 'display'),
        charItem(id, 'blank', 58, 4, 42, { floor: 49.6, real }), charItem(id, 'shameless', 58, 54, 42, { floor: 100, shades: true, real })],
      fx: { x: 0.8, y: 0.8 }
    };
  },
  // 범인은 이 안에 있다: 셋이 키 재는 벽 앞에. 진짜 범인만 휘파람
  lineup: ({ id, real }) => ({
    bg: '#E9E9E6',
    items: [rect(0, 34, 100, 0.5, '#9A9A95'), rect(0, 50, 100, 0.5, '#9A9A95'), rect(0, 66, 100, 0.5, '#9A9A95'), rect(0, 82, 100, 0.5, '#9A9A95'),
      textItem(pick(L(W.lineup)), 3, 5, 94, 'display', { align: 'center' }),
      ...['hamster', 'tit', 'cat'].map((c, i) => charItem(c, c === id ? 'whistle' : 'blank', i * 33 - 2, 36, 37, { floor: 100, real })),
      ...['1', '2', '3'].map((n, i) => textItem(n, i * 33 + 13, real ? 54 : 92, 8, 'small', { color: '#555555' }))],
    fx: { x: 0.5, y: 0.7 }
  }),
  // 현자 타임: 머리 뒤에 해
  halo: ({ id, real }) => ({
    bg: '#FFF3B0',
    items: [{ k: 'img', src: deco('sun'), x: 14, y: 2, w: 72 }, charItem(id, 'blank', 19, 30, 62, { floor: 100, real }), textItem(pick(L(W.halo)), 1, 84, 98, 'impact')],
    fx: { x: 0.5, y: 0.7 }
  }),
  // 숨어서 뿡: 상자 뒤에 숨어 눈만 내놓고, 방구는 상자 틈으로 샌다.
  box: ({ id, real }) => {
    const c = charItem(id, pick(['shameless', 'blank', 'whistle']), 28, 25.5, 44, { real });
    return {
      bg: '#E9E2D6',
      items: [rect(0, 86, 100, 14, '#CDBFA8'), c,
        { k: 'img', src: deco('box'), x: 8, y: 26, w: 84 },
        sfx(74, 62, 26, -12), sfx(1, 72, 18, 10, L(W.sfx)[0]),
        textItem(pick(L(W.box)), 4, 4, 92, 'display', { align: 'center' })],
      fx: { x: 0.85, y: 0.75 }
    };
  },
  money: ({ id, real }) => {
    const c = charItem(id, 'thumbs_up', 20, 26, 66, { floor: 100, shades: true, real });
    return {
      bg: '#E8FFD9',
      items: [{ k: 'img', src: deco('money_rain'), x: 0, y: 6, w: 100 }, c, gunFor(c), textItem(pick(L(W.money)), 0, 3, 100, 'impact')],
      fx: { x: 0.25, y: 0.62 }
    };
  }
};

// ---------------------------------------------------------------- 조립형
const LAYOUTS = ['captions', 'bubble', 'thought', 'label', 'corner'];

function assemble({ id, mode, t, title, rarity, practice, real }) {
  const night = isNight(t);
  const bg = pick(night ? NIGHT_BG : DAY_BG);
  const color = DARK_BG.includes(bg) ? '#FFFFFF' : '#111111';
  const expr = { loud: 'burst', soft: 'whistle', hold: pick(['shameless', 'hold']) }[mode];
  const when = L(W.when[whenKey(t)]);
  const punch = pick(L(W.punch[mode]));
  const top = title && chance(0.3) ? title : chance(0.6) ? when : pick(L(W.generic));
  const items = [];
  let c, free;   // free: 캐릭터 반대쪽 (-1 왼쪽 · 1 오른쪽)

  const layout = pick(LAYOUTS);
  switch (layout) {
    case 'captions': {   // 위아래 흰 자막
      const w = rnd(60, 68);
      c = charItem(id, expr, (100 - w) / 2 + rnd(-4, 4), rnd(14, 18), w, { real, floor: 100 });
      items.push(c, textItem(top, 1, 3, 98, 'impact'), textItem(punch, 1, 81, 98, 'impact'));
      free = pick([-1, 1]);
      break;
    }
    case 'bubble':
    case 'thought': {    // 한쪽에 캐릭터, 반대쪽 위에 말풍선 · 생각 풍선 (꼬리가 캐릭터 쪽)
      const thought = layout === 'thought';
      const left = chance(0.5), w = rnd(62, 70);
      c = charItem(id, thought ? pick(['blank', 'hold', expr]) : expr, left ? rnd(-3, 3) : 100 - w + rnd(-3, 3), 100 - w - rnd(0, 3), w, { real, floor: 100 });
      const bw = rnd(50, 56), bx = left ? 100 - bw - rnd(0, 3) : rnd(0, 3);
      const say = thought ? pick(L(W.think)) : awkward(pick([...L(W.say.any), ...L(W.say[mode])]));
      items.push(c, { k: 'img', src: deco(thought ? 'thought_bubble' : 'speech_bubble'), x: bx, y: rnd(-3, 1), w: bw, flip: !left });
      // 글자는 풍선 몸통 가운데에 (몸통 가운데 ≈ 풍선 그림 높이의 38%)
      const by = items[items.length - 1].y, txt = textItem(say, bx + bw * 0.2, 0, bw * 0.6, 'bubble', { color: '#111111' });
      txt.y = by + bw * 0.38 - (say.split('\n').length * txt.size * 1.3) / 2;
      items.push(txt);
      free = left ? 1 : -1;
      break;
    }
    case 'label': {      // 빨간 타원 라벨 + 오른쪽 위 한 마디
      const w = rnd(64, 70);
      c = charItem(id, mode === 'loud' && chance(0.4) ? 'thumbs_up' : expr, rnd(14, 26), 100 - w - rnd(0, 3), w, { real, floor: 100 });
      const word = rarity === 'jackpot' || rarity === 'legend' ? L(W.labelRare[rarity]) : pick(L(W.label));
      items.push(c, { k: 'label', s: word, x: rnd(3, 7), y: rnd(4, 8), w: rnd(36, 42), r: rnd(-6, 2), size: fit(word, 32, BASE.label) });
      if (chance(0.6)) items.push(textItem(punch, 50, rnd(7, 12), 46, 'display', { color, align: 'right' }));
      free = c.x > 20 ? -1 : 1;
      break;
    }
    default: {           // 왼쪽 위 두 줄 (상황 + 한 방)
      const w = rnd(62, 70);
      c = charItem(id, expr, rnd(20, 34), 100 - w - rnd(0, 3), w, { real, floor: 100 });
      items.push(c, textItem(`${top}\n${punch}`, 5, 5, 64, 'display', { color }));
      free = -1;
    }
  }

  // 결과에 붙는 것: 냄 = 방구 구름 (빈 쪽으로), 참음 = 가끔 선글라스
  const time = night ? 'night' : 'day';
  const spots = [
    { x: free > 0 ? rnd(72, 78) : rnd(2, 8), y: rnd(66, 74), w: rnd(20, 26), pool: GROUND[time] },
    { x: free > 0 ? rnd(78, 82) : rnd(0, 4), y: rnd(32, 40), w: rnd(16, 20), pool: SKY[time] }
  ];
  let decoCount = Math.floor(rnd(0, 2.6));
  if (mode === 'loud' && !practice) { items.push(fartFor(c, free)); spots.shift(); decoCount = Math.min(decoCount, 1); }
  if (mode === 'hold' && chance(0.55)) c.shades = true;
  // 소품 0~2개: 캐릭터 반대쪽 빈 구석에, 캐릭터 뒤에 깐다
  for (const s of spots.slice(0, decoCount)) items.unshift({ k: 'img', src: deco(pick(s.pool)), x: s.x, y: s.y, w: s.w, r: rnd(-12, 12) });
  return { bg, items, fx: { x: (c.x + c.w / 2) / 100, y: (c.y + c.w * 0.6) / 100 } };
}

// ---------------------------------------------------------------- 레전드 짤: 일부러 구린 디자인 (2010년대 PPT · 썸네일 · 포스터)
const RAINBOW = ['#FF00C8', '#FF2E2E', '#FFE600', '#2EFF6A', '#22C8FF', '#8A2BFF'];
const grad = (angle, stops) => ({ grad: { angle, stops }, bg: `linear-gradient(${angle}deg, ${stops.join(', ')})` });
/** 워드아트 글자. o = { font, weight, fill (색 또는 [위, 가운데, 아래] 그라데이션), stroke, sw, shadow [dx, dy, 색], colors (줄마다), chars (글자마다), underline, circled, reflect, align, lh, r } */
const art = (s, x, y, w, size, o = {}) => ({ k: 'art', s, x, y, w, size: o.circled ? size : Math.min(size, fit(s, w, size)), ...o });   // 칸보다 길면 줄인다
const GOLD = ['#FFF6B0', '#E3B320', '#7A5600'];
const hm = t => { const d = new Date(t); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const WL = {
  thumbTop: { ko: ['가지고있는 칭호명', '오늘의 방구'], en: ['YOUR TITLE HERE', "TODAY'S TOOT"] },
  thumbBig: { ko: ['제목', '뿡', '방구'], en: ['TITLE', 'TOOT'] },
  thumbSub: { ko: ['소제목*^^*', '실화냐*^^*', '방구 맞음*^^*'], en: ['Subtitle*^^*', 'For real*^^*'] },
  thumbFoot: { ko: ['구독과 좋아요해줄거지?', '자랑하기 눌러줄거지?'], en: ['Like and subscribe ok?', 'You will share this right?'] },
  pptTitle: { ko: ['성공하는 방\n구란?', '좋은 방구\n란?'], en: ['What Makes\na Great Toot?'] },
  pptBody: {
    ko: ['좋은 방구란 소리와 냄', '새, 타이밍 등이 명확한 레', '이아웃 컨셉을 지니고 적', '절하게 배치가 잘 된 방구', '를 말합니다.'],
    en: ['A good toot has a clear', 'layout concept of sound,', 'smell and timing, with', 'proper place-', 'ment.']
  },
};

export const LEGEND = {
  // 유튜브 썸네일: 무지개 배경, 노랑+빨강 비스듬 윗글, 파랑 큰 제목, 흰 소제목*^^*, 빨간 작은 구독 부탁
  thumb: ({ id, title }) => ({
    ...grad(115, RAINBOW),
    items: [charItem(id, pick(['blank', 'eng', 'shameless']), -10, 0, 64, { real: true, floor: 100 }),
      art(title && chance(0.5) ? title : pick(L(WL.thumbTop)), 10, 6, 84, 8.2, { fill: '#FFE600', stroke: '#E0262B', sw: 1.4, r: -5, align: 'center' }),
      art(pick(L(WL.thumbBig)), 40, 20, 60, 27, { fill: '#2238FF', stroke: '#FF1E1E', sw: 2, shadow: [1.2, 1.2, '#FFFFFF'], align: 'center' }),
      art(pick(L(WL.thumbSub)), 30, 58, 70, 11, { font: 'body', weight: 900, fill: '#FFFFFF', shadow: [0.8, 0.8, '#333333'], align: 'center' }),
      art(pick(L(WL.thumbFoot)), 50, 90, 48, 3.6, { font: 'body', weight: 500, fill: '#D10000', align: 'center' })],
    fx: { x: 0.25, y: 0.7 }
  }),
  // 금색 워드아트 PPT: 회색 그라데이션, 반사 그림자 제목, 줄마다 색 다른 말풍선, 엄지척 누끼 (흰 테두리 지글지글)
  ppt: ({ id }) => ({
    ...grad(180, ['#3A3A3A', '#9A9A9A', '#2E2E2E']),
    items: [{ k: 'img', src: deco('stars'), x: 2, y: 3, w: 13 }, { k: 'img', src: deco('stars'), x: 85, y: 3, w: 13, flip: true },
      art(pick(L(WL.pptTitle)), 4, 4, 92, 12.5, { fill: GOLD, stroke: '#4A3600', sw: 0.5, reflect: true, align: 'center', lh: 1.05 }),
      { k: 'rect', x: 3, y: 50, w: 64, h: 40, color: '#FFFFFF', line: '#8A2BE2', lw: 0.7, rad: 5 },
      art(L(WL.pptBody).join('\n'), 6, 54, 58, 4.3, { font: 'body', weight: 700, colors: ['#F7A600', '#2E9E2E', '#1E7BD8', '#8A2BE2', '#E0262B'], lh: 1.45 }),
      charItem(id, 'thumbs_up', 56, 0, 48, { real: true, floor: 100, sticker: true })],
    fx: { x: 0.8, y: 0.75 }
  })
};

// ---------------------------------------------------------------- 오리지널 짤: 폰 화면 · 생활 서류 · 뉴스 UI 를 방구로 비틀기
const T = (ko, en) => L({ ko, en });
const nickOf = id => L(charById(id).nick);
const ymd = t => { const d = new Date(t); return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`; };
const hms = t => { const d = new Date(t); return `${hm(t)}:${String(d.getSeconds()).padStart(2, '0')}`; };
const ampm = t => { const d = new Date(t), h = d.getHours(); return T(`${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`, `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`); };
const em = s => Math.max(...s.split('\n').map(line => [...line].reduce((n, c) => n + (/[ㄱ-힝]/.test(c) ? 1 : c === ' ' ? 0.3 : 0.6), 0)));
const MONO = { font: 'mono', weight: 700 };

const CHAT = {
  ko: {
    loud: [['c', '방금 소리 들었어?'], ['m', 'ㅇㅇ 다 들었는데'], ['c', '새 소리임'], ['c', '짹짹']],
    soft: [['c', '부르르'], ['m', '진동 왔어?'], ['c', '아니 나임'], ['m', '...']],
    hold: [['c', '참는 중'], ['c', '진짜 참는 중'], ['m', '왜 자꾸 보고함'], ['c', '혼자 참기 무서워서']],
    any: [['m', '회의 중이야 조용히 해'], ['c', '뿡'], ['m', '?'], ['c', '미안 자동완성']]
  },
  en: {
    loud: [['c', 'did u hear that?'], ['m', 'everyone heard'], ['c', 'it was a bird'], ['c', 'tweet tweet']],
    soft: [['c', 'bzzz'], ['m', 'phone buzzing?'], ['c', 'no that was me'], ['m', '...']],
    hold: [['c', 'holding it'], ['c', 'really holding it'], ['m', 'why r u reporting'], ['c', 'scared to hold it alone']],
    any: [["m", "i'm in a meeting"], ['c', 'toot'], ['m', '?'], ['c', 'sorry autocorrect']]
  }
};

const ORIGINAL_UNIQUE = {
  // 단톡 캡처: 친구가 자기 방구를 실시간 보고한다
  chat: ({ id, mode, t, real }) => {
    const lines = L(CHAT)[chance(0.3) ? 'any' : mode];
    const items = [{ k: 'rect', x: 0, y: 0, w: 100, h: 11, color: '#A3B8CA' },
      art(`${nickOf(id)}${T('님과의 대화', '')}`, 4, 3.4, 70, 4.6, { font: 'body', weight: 800, fill: '#1B1B1B' }),
      art('≡', 86, 2.6, 10, 6, { font: 'body', weight: 700, fill: '#1B1B1B', align: 'right' })];
    let y = 15, prev = '';
    for (const [who, text] of lines) {
      const size = 4.3, bw = Math.min(62, em(text) * size + 7), bh = 9.5;
      if (who === 'c') {
        if (prev !== 'c') {
          items.push(charItem(id, mode === 'hold' ? 'hold' : 'blank', 3, y, 11, { real, clip: { x: 3, y, w: 11, h: 11, rad: 4.2, bg: '#FFFFFF' } }),
            art(nickOf(id), 16.5, y, 40, 3, { font: 'body', weight: 500, fill: '#3F4A55' }));
          y += 4.4;
        }
        items.push({ k: 'rect', x: 16.5, y, w: bw, h: bh, color: '#FFFFFF', rad: 3 },
          art(text, 20, y + 2.5, bw - 6, size, { font: 'body', weight: 500, fill: '#111111' }),
          art(ampm(t), 17.5 + bw, y + 6, 20, 2.4, { font: 'body', weight: 400, fill: '#4D5A66' }));
      } else {
        const x = 96 - bw;
        items.push({ k: 'rect', x, y, w: bw, h: bh, color: '#FEE500', rad: 3 },
          art(text, x + 3.5, y + 2.5, bw - 6, size, { font: 'body', weight: 500, fill: '#111111' }),
          art('1', x - 4, y + 3, 3, 2.6, { font: 'body', weight: 800, fill: '#C9A800', align: 'right' }),
          art(ampm(t), x - 20, y + 6, 19, 2.4, { font: 'body', weight: 400, fill: '#4D5A66', align: 'right' }));
      }
      y += bh + 3;
      prev = who;
    }
    items.push({ k: 'rect', x: 0, y: 90, w: 100, h: 10, color: '#FFFFFF' },
      art(T('메시지 입력', 'Message'), 5, 93, 60, 3.6, { font: 'body', weight: 400, fill: '#9AA3AB' }),
      { k: 'rect', x: 84, y: 91.8, w: 12, h: 6.4, color: '#FEE500', rad: 1.4 }, art(T('전송', 'Send'), 84, 93.4, 12, 3.2, { font: 'body', weight: 700, fill: '#3B3B3B', align: 'center' }));
    return { bg: '#B2C7D9', items, fx: { x: 0.2, y: 0.4 } };
  },

  // 오늘의 뿡 예보: 기상 캐스터 + 시간대별 예보표 + 뿡 확률
  forecast: ({ id, mode, t, real }) => {
    const H = h => { const d = new Date(t); d.setHours(d.getHours() + h); return `${String(d.getHours()).padStart(2, '0')}:00`; };
    const now = { loud: T('뿡!! 강풍', 'TOOT!! gale'), soft: T('부르르 약풍', 'buzz, light'), hold: T('먹구름 (참는 중)', 'clouds (held)') }[mode];
    const rows = [[H(-2), T('맑음', 'clear')], [H(0), now], [H(2), T('예측 불가', 'unknown')]];
    const prob = mode === 'hold' ? 99 : Math.round(rnd(mode === 'loud' ? 86 : 58, mode === 'loud' ? 99 : 79));
    return {
      ...grad(180, ['#7EC8FF', '#DDF3FF']),
      items: [{ k: 'rect', x: 0, y: 0, w: 100, h: 13, color: '#1E3A8A' },
        art(T('오늘의 뿡 예보', "TODAY'S TOOT FORECAST"), 4, 3.4, 70, 6.4, { fill: '#FFFFFF' }),
        { k: 'rect', x: 84, y: 4, w: 12, h: 5.2, color: '#E0262B', rad: 1 }, art('LIVE', 84, 5, 12, 3.2, { font: 'body', weight: 900, fill: '#FFFFFF', align: 'center' }),
        ...rows.flatMap(([time, what], i) => [
          { k: 'rect', x: 4, y: 18 + i * 13, w: 54, h: 11, color: i === 1 ? '#FFE600' : 'rgba(255,255,255,0.85)', rad: 2, line: i === 1 ? '#111111' : null, lw: 0.4 },
          art(time, 7, 21.4 + i * 13, 16, 4.2, { font: 'body', weight: 800, fill: '#1E3A8A' }),
          art(what, 23, 21.4 + i * 13, 34, 4.2, { font: 'body', weight: i === 1 ? 900 : 600, fill: i === 1 ? '#E0262B' : '#333333' })]),
        art(`${T('뿡 확률', 'Toot chance')}\n${prob}%`, 4, 60, 56, 10, { fill: '#E0262B', stroke: '#FFFFFF', sw: 1.2, lh: 1.05 }),
        charItem(id, mode === 'loud' ? 'burst' : pick(['blank', 'shameless']), 56, 47, 46, { real, floor: 93 }),
        { k: 'rect', x: 0, y: 93, w: 100, h: 7, color: '#111111' },
        art(T('※ 외출 시 무음 모드를 권장합니다', '※ Silent mode advised when going out'), 3, 94.6, 94, 3.2, { font: 'body', weight: 600, fill: '#FFE600' })],
      fx: { x: 0.78, y: 0.7 }
    };
  },

  // 영수증: 뿡 한 개 결제, 체면 차감, 환불 불가
  receipt: ({ id, mode, t, real }) => {
    const size = { loud: T('대', 'L'), soft: T('소', 'S'), hold: T('보류', 'held') }[mode];
    const rows = [[`${T('뿡', 'Toot')}(${size}) x1`, '₩0'], [T('체면', 'Dignity'), mode === 'hold' ? '0' : '-100'], [T('평판', 'Reputation'), mode === 'loud' ? '-50' : '0'],
      [T('괄약근 포인트', 'Clench pts'), mode === 'hold' ? '+10' : '+1']];
    const bars = [];
    for (let x = 26, i = 0; x < 74; i++) { const w = pick([0.4, 0.4, 0.8, 1.2]); bars.push({ k: 'rect', x, y: 80, w, h: 6, color: '#111111' }); x += w + pick([0.5, 0.8, 1.1]); }
    return {
      bg: pick(['#FFE1EC', '#DCE9F5', '#E8FFD9', '#FFF3B0']),
      items: [{ k: 'rect', x: 17, y: 3, w: 66, h: 92, color: '#FFFFFF' },
        art(T('★ 방구뿡 편의점 ★', '★ TOOT MART ★'), 17, 7, 66, 4.6, { ...MONO, fill: '#111111', align: 'center' }),
        art(`${ymd(t)} ${hms(t)}\n${T('캐셔', 'Cashier')}: ${nickOf(id)}`, 21, 14, 58, 3.3, { ...MONO, weight: 400, fill: '#333333', lh: 1.4 }),
        art('- - - - - - - - - - - - - -', 17, 24, 66, 3.3, { ...MONO, weight: 400, fill: '#777777', align: 'center' }),
        ...rows.flatMap(([a, b], i) => [art(a, 21, 29 + i * 6.4, 40, 3.6, { ...MONO, fill: '#111111' }), art(b, 59, 29 + i * 6.4, 20, 3.6, { ...MONO, fill: '#111111', align: 'right' })]),
        art('- - - - - - - - - - - - - -', 17, 55, 66, 3.3, { ...MONO, weight: 400, fill: '#777777', align: 'center' }),
        art(T('합계', 'TOTAL'), 21, 60, 30, 5, { ...MONO, weight: 800, fill: '#111111' }), art('₩0', 55, 60, 24, 5, { ...MONO, weight: 800, fill: '#111111', align: 'right' }),
        art(T('교환·환불 불가 (이미 나감)', 'No refunds (already out)'), 17, 70, 66, 3, { ...MONO, weight: 400, fill: '#333333', align: 'center' }),
        ...bars,
        charItem(id, pick(['whistle', 'shameless']), 66, 0, 38, { real, floor: 100 })],
      fx: { x: 0.85, y: 0.8 }
    };
  },

  // 음악 앱 재생 화면: 지금 재생 중 = 뿡 (Feat. 괄약근)
  nowplaying: ({ id, mode, real }) => {
    const pct = rnd(0.25, 0.7), box = { x: 16, y: 6, w: 68, h: 64, rad: 3, bg: pick(['#FFB3D9', '#CFEFFF', '#FFE600', '#D7FF3D']) };
    return {
      ...grad(165, ['#4A2470', '#160D22']),
      items: [charItem(id, mode === 'loud' ? 'burst' : mode === 'soft' ? 'whistle' : 'hold', 18, 0, 64, { real, floor: 70, clip: box }),
        art(T('뿡 (Feat. 괄약근)', 'Toot (feat. Clench)'), 8, 74, 74, 5.4, { font: 'body', weight: 800, fill: '#FFFFFF' }),
        art(`${nickOf(id)} · ${T({ loud: '정규 1집', soft: 'Acoustic', hold: 'Unplugged (무음)' }[mode], { loud: 'Debut Album', soft: 'Acoustic', hold: 'Unplugged (silent)' }[mode])}`, 8, 80.6, 74, 3.6, { font: 'body', weight: 500, fill: '#B9A9CC' }),
        art('♥', 84, 74, 10, 5.4, { font: 'body', weight: 700, fill: '#FF6FB5', align: 'right' }),
        { k: 'rect', x: 8, y: 87, w: 84, h: 0.9, color: '#5B4A6E', rad: 0.45 }, { k: 'rect', x: 8, y: 87, w: 84 * pct, h: 0.9, color: '#FFFFFF', rad: 0.45 },
        { k: 'rect', x: 8 + 84 * pct - 1.3, y: 86.15, w: 2.6, h: 2.6, color: '#FFFFFF', rad: 1.3 },
        art('0:01', 8, 89.2, 20, 2.8, { font: 'body', weight: 500, fill: '#B9A9CC' }), art('-0:02', 72, 89.2, 20, 2.8, { font: 'body', weight: 500, fill: '#B9A9CC', align: 'right' }),
        art('◀◀    ❚❚    ▶▶', 20, 92, 60, 4.4, { font: 'body', weight: 700, fill: '#FFFFFF', align: 'center' })],
      fx: { x: 0.5, y: 0.45 }
    };
  }
};

const ORIGINAL_LEGEND = {
  // 상장: 괄약근 부문
  award: ({ id, mode, t, real }) => {
    const body = {
      loud: T('모두가 숨죽인 순간에\n과감한 결단력으로 주위를\n놀라게 하였기에', 'boldly broke the silence\nwhen everyone held their breath,\nstunning all around,'),
      soft: T('아무도 모르게 진동으로\n처리하는 노련함을\n보였기에', 'handled it quietly on vibrate\nwith veteran discretion\nthat no one noticed,'),
      hold: T('끝내 참아내는\n놀라운 인내심으로\n귀감이 되었기에', 'held it in to the very end,\nan inspiring example\nof patience,')
    }[mode];
    const d = new Date(t);
    return {
      bg: '#FFFBEA',
      items: [{ k: 'rect', x: 3, y: 3, w: 94, h: 94, color: 'transparent', line: '#C9A227', lw: 1.2 }, { k: 'rect', x: 5.5, y: 5.5, w: 89, h: 89, color: 'transparent', line: '#C9A227', lw: 0.35 },
        art(`${T('제', 'No.')} ${d.getFullYear()}-${String(Math.floor(rnd(1, 999))).padStart(3, '0')}${T('호', '')}`, 9, 9, 50, 2.8, { font: 'serif', weight: 400, fill: '#333333' }),
        art(T('상    장', 'CERTIFICATE'), 0, 13, 100, 12, { font: 'serif', weight: 900, fill: '#111111', align: 'center' }),
        art(T('괄약근 부문', 'Clench Division'), 10, 30, 40, 3.8, { font: 'serif', weight: 700, fill: '#111111' }),
        art(`${T('성명', 'Name')}  ${nickOf(id)}`, 50, 30, 40, 3.8, { font: 'serif', weight: 700, fill: '#111111', align: 'right' }),
        art(`${T(`위 사람은 ${ymd(t)} ${hm(t)}경`, `On ${ymd(t)} at ${hm(t)}, the above`)}\n${body}\n${T('이 상장을 수여합니다.', 'is hereby awarded.')}`, 10, 36, 80, 4.2, { font: 'serif', weight: 400, fill: '#111111', lh: 1.62 }),
        art(T(`${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`, ymd(t)), 0, 77, 100, 3.6, { font: 'serif', weight: 400, fill: '#111111', align: 'center' }),
        art(T('방구뿡 위원회 위원장', 'Chair, Toot Committee'), 34, 85, 44, 4, { font: 'serif', weight: 700, fill: '#111111', align: 'right' }),
        { k: 'rect', x: 79, y: 81.5, w: 11, h: 11, color: 'transparent', line: '#D62B1F', lw: 0.8, rad: 5.5 },
        art(T('뿡', 'TOOT'), 79, 84, 11, 5.6, { fill: '#D62B1F', align: 'center', r: -12 }),
        charItem(id, 'thumbs_up', 7, 74, 20, { real, floor: 94, sticker: true })],
      fx: { x: 0.2, y: 0.8 }
    };
  },

  // CCTV: 엘리베이터 카메라에 찍힌 용의자
  cctv: ({ id, mode, t }) => {
    const c = charItem(id, { loud: 'burst', soft: 'whistle', hold: 'hold' }[mode], 6, 0, 88, { real: true, floor: 100 });
    const box = { x: c.x + c.w * 0.18, y: c.y + c.w * 0.22, w: c.w * 0.64, h: c.w * 0.42 };
    const tag = { loud: T('범인 확정 · 99.8%', 'CULPRIT · 99.8%'), soft: T('진동 감지 · 87.1%', 'BUZZ DETECTED · 87.1%'), hold: T('수상함 · 증거 없음', 'SUSPICIOUS · NO EVIDENCE') }[mode];
    return {
      bg: '#0A100B',
      items: [c, { k: 'rect', x: 0, y: 0, w: 100, h: 100, color: 'rgba(70,255,140,0.18)' },
        ...Array.from({ length: 25 }, (_, i) => ({ k: 'rect', x: 0, y: i * 4, w: 100, h: 0.7, color: 'rgba(0,0,0,0.28)' })),
        { k: 'rect', ...box, color: 'transparent', line: '#FF2E2E', lw: 0.6 },
        { k: 'rect', x: box.x, y: box.y - 6, w: Math.max(30, em(tag) * 3.2 + 4), h: 5.6, color: '#FF2E2E' },
        art(tag, box.x + 1.6, box.y - 4.8, 60, 3.2, { font: 'body', weight: 800, fill: '#FFFFFF' }),
        art('● REC', 4, 4, 30, 4.4, { font: 'body', weight: 900, fill: '#FF2E2E' }),
        art(T('CAM 03 · 엘리베이터', 'CAM 03 · ELEVATOR'), 40, 4.6, 56, 3.4, { ...MONO, fill: '#FFFFFF', align: 'right' }),
        art(`${ymd(t)} ${hms(t)}`, 4, 93, 60, 3.6, { ...MONO, fill: '#FFFFFF' }),
        art(T('동작: 뿡 감지', 'MOTION: TOOT'), 4, 88, 60, 3.6, { ...MONO, fill: '#FFE600' })],
      fx: { x: 0.5, y: 0.6 }
    };
  },

  // AI 분석 리포트: 근거 없는 정밀 분석
  report: ({ id, mode, t, real }) => {
    const db = { loud: Math.round(rnd(78, 96)), soft: Math.round(rnd(30, 45)), hold: 0 }[mode];
    const others = ['hamster', 'tit', 'cat'].filter(c => c !== id);
    const mine = mode === 'hold' ? rnd(40, 60) : rnd(95, 99.4), a = rnd(0.2, 0.8) * (100 - mine);
    const odds = [[id, mine], [others[0], a], [others[1], 100 - mine - a]];
    const timing = { loud: T('최악 (하필 지금)', 'Worst (why now)'), soft: T('애매함', 'Questionable'), hold: T('완벽 (아무 일 없음)', 'Perfect (nothing happened)') }[mode];
    return {
      bg: '#E9EDF3',
      items: [{ k: 'rect', x: 5, y: 5, w: 90, h: 90, color: '#FFFFFF', rad: 4 },
        art(T('AI 방구 분석 리포트', 'AI TOOT ANALYSIS'), 10, 10, 64, 5, { font: 'body', weight: 900, fill: '#111111' }),
        { k: 'rect', x: 77, y: 10.2, w: 13, h: 5, color: '#111111', rad: 2.5 }, art('BETA', 77, 11.3, 13, 2.8, { font: 'body', weight: 800, fill: '#FFFFFF', align: 'center' }),
        charItem(id, 'shameless', 10, 19, 13, { real, clip: { x: 10, y: 19, w: 13, h: 13, rad: 6.5, bg: '#FFE600' } }),
        art(`${T('분석 대상', 'Subject')}: ${nickOf(id)}`, 26, 20, 60, 3.8, { font: 'body', weight: 700, fill: '#111111' }),
        art(`${ymd(t)} ${hm(t)}`, 26, 25.6, 60, 3, { font: 'body', weight: 400, fill: '#6B7280' }),
        art(T('소리', 'Sound'), 10, 37, 18, 3.6, { font: 'body', weight: 600, fill: '#6B7280' }),
        { k: 'rect', x: 30, y: 38, w: 44, h: 2.4, color: '#E5E7EB', rad: 1.2 }, { k: 'rect', x: 30, y: 38, w: Math.max(1, 44 * db / 100), h: 2.4, color: '#FF4D4D', rad: 1.2 },
        art(`${db} dB`, 76, 37, 14, 3.4, { font: 'body', weight: 800, fill: '#111111', align: 'right' }),
        art(T('냄새', 'Smell'), 10, 45, 18, 3.6, { font: 'body', weight: 600, fill: '#6B7280' }),
        art(mode === 'hold' ? '☆☆☆☆☆' : pick(['★★★★☆', '★★★★★', '★★★☆☆']), 30, 44.4, 40, 4.4, { font: 'body', weight: 700, fill: '#FFB300' }),
        art(T('타이밍', 'Timing'), 10, 53, 18, 3.6, { font: 'body', weight: 600, fill: '#6B7280' }),
        art(timing, 30, 53, 60, 3.6, { font: 'body', weight: 800, fill: mode === 'hold' ? '#16A34A' : '#E0262B' }),
        { k: 'rect', x: 10, y: 61, w: 80, h: 0.3, color: '#E5E7EB' },
        art(T('범인 확률', 'Culprit odds'), 10, 64, 40, 3.8, { font: 'body', weight: 800, fill: '#111111' }),
        ...odds.flatMap(([c, p], i) => [
          art(nickOf(c), 10, 70.4 + i * 6, 16, 3.2, { font: 'body', weight: 600, fill: '#374151' }),
          { k: 'rect', x: 27, y: 71.2 + i * 6, w: 50, h: 2.4, color: '#EEF0F3', rad: 1.2 },
          { k: 'rect', x: 27, y: 71.2 + i * 6, w: Math.max(1, 50 * p / 100), h: 2.4, color: i === 0 ? '#111111' : '#9CA3AF', rad: 1.2 },
          art(`${p.toFixed(1)}%`, 78, 70.4 + i * 6, 12, 3.2, { font: 'body', weight: 800, fill: '#111111', align: 'right' })]),
        art(T('* 본 분석은 아무 근거 없음', '* This analysis is based on nothing'), 10, 89.5, 80, 2.6, { font: 'body', weight: 400, fill: '#9CA3AF' })],
      fx: { x: 0.17, y: 0.25 }
    };
  },

  // 주식 차트: 괄약근전자 폭락 (참으면 상한가)
  stock: ({ id, mode, t, real }) => {
    const up = mode === 'hold';
    const n = 26, pts = [];
    let v = 50;
    for (let i = 0; i < n; i++) {
      if (i < n - 5) v += rnd(-2.2, 2.2);
      else v += up ? -rnd(3, 5) : mode === 'loud' ? rnd(5, 7) : rnd(1, 2.4);
      pts.push([8 + (i / (n - 1)) * 84, Math.min(80, Math.max(38, v))]);
    }
    const last = pts[n - 1];
    const pct = up ? `+${rnd(24, 30).toFixed(1)}%` : mode === 'loud' ? `-${rnd(80, 92).toFixed(1)}%` : `-${rnd(9, 15).toFixed(1)}%`;
    const color = up ? '#FF3B3B' : '#3D8BFF';
    return {
      bg: '#0F1115',
      items: [art(T('괄약근전자', 'Clench Electronics'), 6, 6, 70, 5.2, { font: 'body', weight: 800, fill: '#FFFFFF' }),
        art(T('BBNG · 뿡스닥', 'BBNG · TOOTDAQ'), 6, 12.6, 60, 3, { font: 'body', weight: 500, fill: '#8B93A1' }),
        art(pct, 6, 18, 60, 11, { font: 'body', weight: 900, fill: color }),
        up ? { k: 'rect', x: 66, y: 21, w: 24, h: 6.6, color: '#FF3B3B', rad: 1.2 } : { k: 'rect', x: 66, y: 21, w: 24, h: 6.6, color: '#3D8BFF', rad: 1.2 },
        art(up ? T('상한가', 'LIMIT UP') : mode === 'loud' ? T('하한가', 'LIMIT DOWN') : T('약세', 'DOWN'), 66, 22.4, 24, 3.6, { font: 'body', weight: 900, fill: '#FFFFFF', align: 'center' }),
        ...[40, 53, 66, 79].map(y => ({ k: 'rect', x: 8, y, w: 84, h: 0.25, color: '#262B34' })),
        { k: 'poly', pts, color, lw: 0.8 },
        { k: 'rect', x: last[0] - 1.4, y: last[1] - 1.4, w: 2.8, h: 2.8, color, rad: 1.4 },
        art(`${T('방금', 'just now')} ${hm(t)} →`, 8, last[1] + (up ? 3 : -7), last[0] - 10, 3.4, { font: 'body', weight: 800, fill: '#FFFFFF', align: 'right' }),
        art('06:00', 30, 82, 20, 2.8, { font: 'body', weight: 500, fill: '#8B93A1' }), art(hm(t), 72, 82, 20, 2.8, { font: 'body', weight: 500, fill: '#8B93A1', align: 'right' }),
        charItem(id, up ? 'shameless' : 'eng', -2, 68, 32, { real, floor: 100, sticker: true })],
      fx: { x: 0.82, y: 0.85 }
    };
  }
};
Object.assign(UNIQUE, ORIGINAL_UNIQUE);
Object.assign(LEGEND, ORIGINAL_LEGEND);

// ---------------------------------------------------------------- 속보 짤: 뉴스 화면 (예전 자랑 카드의 속보 띠를 짤 유형 하나로)
const NEWS = {
  channel: { ko: '뿡뉴스', en: 'TOOT NEWS' },
  tag: { loud: { ko: '단독', en: 'EXCLUSIVE' }, soft: { ko: '속보', en: 'BREAKING' }, hold: { ko: '속보', en: 'BREAKING' } },
  ticker: { ko: ['시민들 "냄새는 못 맡았다"', '전문가 "괄약근 컨디션 변수"', '오늘 밤 추가 발생 가능성', '현장 연결합니다'],
    en: ['Witnesses: "no smell yet"', 'Experts cite clench fatigue', 'More expected tonight', 'Live from the scene'] }
};
UNIQUE.news = ({ id, mode, t, real, headline }) => {
  const studio = pick([['#0B2A6F', '#1F5FD1'], ['#3A0B0B', '#B3261E'], ['#101820', '#2E4A62']]);
  const tag = L(NEWS.tag[mode] || NEWS.tag.soft);
  return {
    ...grad(160, studio),
    items: [...Array.from({ length: 6 }, (_, i) => ({ k: 'rect', x: 8 + i * 16, y: 0, w: 0.4, h: 66, color: 'rgba(255,255,255,0.08)' })),
      charItem(id, { loud: 'burst', soft: 'whistle', hold: 'hold' }[mode] || 'blank', 22, 8, 58, { real, floor: 70 }),
      { k: 'rect', x: 3, y: 4, w: 13, h: 5.6, color: '#E8261C' }, art('LIVE', 3, 5.1, 13, 3.4, { font: 'body', weight: 900, fill: '#FFFFFF', align: 'center' }),
      art(L(NEWS.channel), 18, 4.9, 40, 3.8, { font: 'body', weight: 900, fill: '#FFFFFF' }),
      art(hm(t), 70, 4.9, 26, 3.8, { font: 'body', weight: 800, fill: '#FFFFFF', align: 'right' }),
      { k: 'rect', x: 0, y: 66, w: Math.min(40, em(tag) * 5 + 8), h: 8, color: '#E8261C' },
      art(tag, 2.5, 67.6, 36, 5, { font: 'body', weight: 900, fill: '#FFFFFF' }),
      { k: 'rect', x: 0, y: 74, w: 100, h: 15, color: '#FFFFFF' }, { k: 'rect', x: 0, y: 74, w: 1.8, h: 15, color: '#FFD400' },
      art(headline || L(NEWS.channel), 4.5, 77.4, 92, 6.4, { font: 'body', weight: 900, fill: '#111111' }),
      { k: 'rect', x: 0, y: 89, w: 100, h: 11, color: '#FFD400' },
      art(`● ${pick(L(NEWS.ticker))}`, 3, 92, 94, 3.8, { font: 'body', weight: 800, fill: '#111111' })],
    fx: { x: 0.5, y: 0.45 }
  };
};

// ---------------------------------------------------------------- 칭호 짤: 칭호마다 정해진 짤 하나 (처음 받은 순간의 시각 · 모드 · 친구로, 시드 고정)
const TITLE_MEMES = {
  jp_heritage: 'award', jp_lotto: 'money', jp_heir: 'money', jp_the: 'thumb', jp_rain: 'money',
  meeting_loud: 'cctv', last_call: 'nowplaying', hold5: 'award', trinity: 'report', streak30: 'award', total100: 'stock', first_bell: 'forecast',
  meeting_soft: 'chat', meeting_hold: 'report', night_quiet: 'cctv', monday: 'forecast', friday: 'nowplaying', weekend_nap: 'box',
  double_loud: 'versus', broke: 'expect', soft3: 'chat', loud5: 'stock', hold3: 'halo', streak7: 'award', total50: 'receipt',
  lunch_loud: 'receipt', commute: 'expect', cat_hold: 'deal', ensemble: 'lineup', overeat: 'receipt',
  loud_basic: 'assembled', soft_basic: 'assembled', hold_basic: 'deal', morning: 'forecast', lunch: 'receipt', afternoon: 'chat',
  evening: 'expect', night: 'nowplaying', first_today: 'news', streak3: 'halo', hamster: 'eng', tit: 'eng', cat: 'eng',
  hamster_loud: 'versus', tit_soft: 'box'
};
/** ctx = { id, mode, t (처음 받은 순간), title(이름), rarity, headline } */
export function titleMeme(titleId, ctx) {
  return withSeed(hash(titleId), () => {
    const name = TITLE_MEMES[titleId] || 'assembled';
    const real = ctx.rarity === 'jackpot' || ctx.rarity === 'legend' || (ctx.rarity === 'rare' && chance(0.5));
    const now = { ...ctx, real };
    const make = LEGEND[name] || UNIQUE[name];
    return { name, real, title: titleId, ...(make ? make(now) : assemble(now)) };
  });
}

/**
 * 랜덤 짤 (홈의 '짤 뽑기', 하루 3번). ctx = { id, mode, t }
 * 레전드 짤 6% · 유니크 짤 (나머지 중) 40% · 조립형, 실사 사진 20%. 잭팟 돈 짤은 잭팟 칭호 전용이라 안 나온다.
 */
export const ODDS = { legend: 0.06, unique: 0.4, real: 0.2 };
export function composeMeme(ctx) {
  return withSeed(null, () => {
    if (chance(ODDS.legend)) {
      const name = pick(Object.keys(LEGEND));
      return { name, real: true, legend: true, ...LEGEND[name]({ ...ctx, real: true }) };
    }
    const now = { ...ctx, real: chance(ODDS.real) };
    if (chance(ODDS.unique)) {
      const name = pick(Object.keys(UNIQUE).filter(k => k !== 'money' && k !== 'news'));
      return { name, real: now.real, ...UNIQUE[name](now) };
    }
    return { name: 'assembled', real: now.real, ...assemble(now) };
  });
}

/** 속보 짤 (칭호 꽝 · 연습). headline = 속보 문구 */
export const newsMeme = ctx => withSeed(null, () => { const real = chance(0.3); return { name: 'news', real, ...UNIQUE.news({ ...ctx, real }) }; });

// ---------------------------------------------------------------- 화면에 그리기 (DOM, 글자는 cqw)
const pos = it => `left:${it.x}%;top:${it.y}%;width:${it.w}%;`;
const turn = it => (it.flip || it.r ? `transform:${it.flip ? 'scaleX(-1) ' : ''}${it.r ? `rotate(${it.flip ? -it.r : it.r}deg)` : ''};` : '');
const CLASS = { sfx: 'm-sfx', impact: 'm-impact', display: 'm-display', thin: 'm-thin', small: 'm-small', bubble: 'm-bubble' };

const FAMILY = { display: 'var(--display)', body: 'var(--body)', serif: "'Batang', 'Nanum Myeongjo', 'Noto Serif KR', serif", mono: "'Courier New', ui-monospace, monospace" };
const cssFill = f => (Array.isArray(f) ? `background:linear-gradient(180deg, ${f.join(', ')});-webkit-background-clip:text;background-clip:text;color:transparent;` : f ? `color:${f};` : '');
function artHtml(it) {
  const lines = it.s.split('\n');
  const deco = [
    it.underline ? `text-decoration:underline ${it.underline};text-decoration-thickness:0.4cqw;text-underline-offset:0.8cqw;` : '',
    it.shadow ? `text-shadow:${it.shadow[0]}cqw ${it.shadow[1]}cqw 0 ${it.shadow[2]};` : ''
  ].join('');
  const body = lines.map((line, i) => {
    const color = it.colors ? it.colors[i % it.colors.length] : it.fill;
    if (it.chars) return [...line].map((ch, j) => `<span style="color:${it.chars[j % it.chars.length]}">${esc(ch)}</span>`).join('');
    if (it.circled) return [...line].map(ch => `<span class="m-circ" style="border-color:${it.circled}">${esc(ch)}</span>`).join('');
    return `<span style="${cssFill(color)}${deco}">${esc(line)}</span>`;
  }).join('\n');
  const stroke = it.stroke ? `-webkit-text-stroke:${it.sw}cqw ${it.stroke};paint-order:stroke fill;` : '';
  return `<div class="m-el m-art${it.reflect ? ' m-reflect' : ''}" style="${pos(it)}${turn(it)}font-size:${it.size}cqw;line-height:${it.lh || 1.1};font-family:${FAMILY[it.font || 'display']};font-weight:${it.weight || 400};text-align:${it.align || 'left'};${stroke}${it.chars ? deco : ''}">${body}</div>`;
}

export function renderMeme(el, spec) {
  el.style.setProperty('--meme-bg', spec.bg);
  el.innerHTML = spec.items.map(it => {
    if (it.k === 'char') {
      const shades = it.shades
        ? `<img class="m-shades" src="${SHADES_URL}" style="left:${SHADES_BOX.x * 100}%;top:${SHADES_BOX.y * 100}%;width:${SHADES_BOX.w * 100}%" alt="">` : '';
      const char = `<div class="m-el m-char ${it.sticker ? 'sticker' : ''}" style="${pos(it)}${turn(it)}${it.alpha ? `opacity:${it.alpha};` : ''}"><img src="${face(it.id, it.expr, it.real)}" alt="">${shades}</div>`;
      if (!it.clip) return char;
      // 상자 안에서의 자리로 옮겨 그 상자로 잘라낸다
      const c = it.clip, inner = { ...it, x: ((it.x - c.x) / c.w) * 100, y: ((it.y - c.y) / c.h) * 100, w: (it.w / c.w) * 100 };
      return `<div class="m-el" style="${pos(c)}height:${c.h}%;overflow:hidden;border-radius:${c.rad || 0}cqw;background:${c.bg || 'transparent'};container-type:inline-size">${char.replace(pos(it), pos(inner))}</div>`;
    }
    if (it.k === 'art') return artHtml(it);
    if (it.k === 'poly') return `<svg class="m-el" style="left:0;top:0;width:100%;height:100%;overflow:visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="${it.pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${it.color}" stroke-width="${it.lw}" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
    if (it.k === 'rect') return `<div class="m-el" style="${pos(it)}height:${it.h}%;background:${it.color};${it.line ? `border:${it.lw}cqw solid ${it.line};box-sizing:border-box;` : ''}${it.rad ? `border-radius:${it.rad}cqw;` : ''}"></div>`;
    if (it.k === 'img') return `<img class="m-el ${it.cls || ''}" src="${it.src}" style="${pos(it)}${turn(it)}" alt="">`;
    if (it.k === 'label') return `<div class="m-el m-label" style="${pos(it)}${turn(it)}font-size:${it.size}cqw">${esc(it.s)}</div>`;
    return `<div class="m-el m-text ${CLASS[it.style]}" style="${pos(it)}${turn(it)}font-size:${it.size}cqw;${it.color ? `color:${it.color};` : ''}${it.align ? `text-align:${it.align};` : ''}">${esc(it.s)}</div>`;
  }).join('');
  el.setAttribute('aria-label', spec.items.filter(it => it.s).map(it => it.s.replace(/\n/g, ' ')).join(' · '));
}

// ---------------------------------------------------------------- 자랑 카드에 그리기 (canvas)
const images = new Map();
function loadImage(src) {
  if (!images.has(src)) {
    images.set(src, new Promise(resolve => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => resolve(null);
      im.src = src;
    }));
  }
  return images.get(src);
}

/** 흰 실루엣 (스티커 테두리용), 그림마다 한 번 */
const silhouettes = new Map();
function silhouette(im) {
  if (!silhouettes.has(im)) {
    const c = document.createElement('canvas');
    c.width = im.naturalWidth;
    c.height = im.naturalHeight;
    const g = c.getContext('2d');
    g.drawImage(im, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#fff';
    g.fillRect(0, 0, c.width, c.height);
    silhouettes.set(im, c);
  }
  return silhouettes.get(im);
}

const CANVAS_FAMILY = { display: '"Black Han Sans", sans-serif', body: 'system-ui, sans-serif', serif: '"Batang", "Nanum Myeongjo", "Noto Serif KR", serif', mono: '"Courier New", ui-monospace, monospace' };
/** 워드아트 글자를 (0, 0) 기준 글자 칸 안에 그린다 (돌리기 · 반사는 바깥에서) */
function drawArt(g, it, px, w) {
  const size = px(it.size), lh = size * (it.lh || 1.1);
  g.font = `${it.weight || 400} ${size}px ${CANVAS_FAMILY[it.font || 'display']}`;
  g.textBaseline = 'top';
  g.textAlign = 'left';
  g.lineJoin = 'round';
  const lines = it.s.split('\n');
  lines.forEach((line, i) => {
    const chars = [...line];
    const cw = it.circled ? chars.map(() => size * 1.4) : chars.map(ch => g.measureText(ch).width);
    const total = it.circled || it.chars ? cw.reduce((a, b) => a + b, 0) : g.measureText(line).width;
    let x0 = it.align === 'center' ? (w - total) / 2 : it.align === 'right' ? w - total : 0;
    const y0 = i * lh;
    const paint = (text, x, color) => {
      if (it.shadow) { g.fillStyle = it.shadow[2]; g.fillText(text, x + px(it.shadow[0]), y0 + px(it.shadow[1])); }
      if (it.stroke) { g.strokeStyle = it.stroke; g.lineWidth = px(it.sw); g.strokeText(text, x, y0); }
      if (Array.isArray(color)) {
        const gr = g.createLinearGradient(0, y0, 0, y0 + size);
        color.forEach((c, k) => gr.addColorStop(k / (color.length - 1), c));
        g.fillStyle = gr;
      } else g.fillStyle = color || '#111';
      g.fillText(text, x, y0);
    };
    if (it.circled) {
      chars.forEach(ch => {
        g.strokeStyle = it.circled;
        g.lineWidth = px(0.35);
        g.beginPath();
        g.arc(x0 + size * 0.7, y0 + size * 0.55, size * 0.62, 0, Math.PI * 2);
        g.stroke();
        g.fillStyle = it.circled;
        g.fillText(ch, x0 + (size * 1.4 - g.measureText(ch).width) / 2, y0 + size * 0.05);
        x0 += size * 1.4;
      });
    } else if (it.chars) {
      chars.forEach((ch, j) => { paint(ch, x0, it.chars[j % it.chars.length]); x0 += cw[j]; });
    } else {
      paint(line, x0, it.colors ? it.colors[i % it.colors.length] : it.fill);
      if (it.underline) { g.fillStyle = it.underline; g.fillRect(x0, y0 + size * 1.08, total, px(0.4)); }
    }
  });
  return lines.length * lh;
}

const FONT = {
  sfx: s => `${s}px "Black Han Sans", sans-serif`,
  impact: s => `${s}px "Black Han Sans", sans-serif`,
  display: s => `${s}px "Black Han Sans", sans-serif`,
  thin: s => `400 ${s}px system-ui, sans-serif`,
  small: s => `700 ${s}px system-ui, sans-serif`,
  bubble: s => `700 ${s}px system-ui, sans-serif`
};

/** spec 을 (x, y) 에서 한 변 S 픽셀 정사각형으로 그린다 (화면과 같은 짤) */
export async function drawMeme(g, spec, x, y, S) {
  const px = v => (v / 100) * S;
  const srcs = spec.items.flatMap(it => (it.k === 'char' ? [face(it.id, it.expr, it.real), ...(it.shades ? [SHADES_URL] : [])] : it.k === 'img' ? [it.src] : []));
  const loaded = new Map(await Promise.all(srcs.map(async s => [s, await loadImage(s)])));
  await document.fonts?.load?.('40px "Black Han Sans"');
  g.save();
  g.beginPath();
  g.rect(x, y, S, S);
  g.clip();
  if (spec.grad) {   // CSS linear-gradient(angle) 와 같은 방향
    const a = ((spec.grad.angle - 90) * Math.PI) / 180, cx = x + S / 2, cy = y + S / 2;
    const r = (Math.abs(Math.cos(a)) + Math.abs(Math.sin(a))) * S / 2;
    const gr = g.createLinearGradient(cx - Math.cos(a) * r, cy - Math.sin(a) * r, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    spec.grad.stops.forEach((c, k) => gr.addColorStop(k / (spec.grad.stops.length - 1), c));
    g.fillStyle = gr;
  } else g.fillStyle = spec.bg;
  g.fillRect(x, y, S, S);
  for (const it of spec.items) {
    g.save();
    const w = px(it.w);
    if (it.k === 'rect') {
      g.fillStyle = it.color;
      g.beginPath();
      g.roundRect(x + px(it.x), y + px(it.y), w, px(it.h), it.rad ? px(it.rad) : 0);
      g.fill();
      if (it.line) {
        g.strokeStyle = it.line;
        g.lineWidth = px(it.lw);
        g.beginPath();
        g.roundRect(x + px(it.x) + px(it.lw) / 2, y + px(it.y) + px(it.lw) / 2, w - px(it.lw), px(it.h) - px(it.lw), it.rad ? px(it.rad) : 0);
        g.stroke();
      }
    } else if (it.k === 'poly') {
      g.strokeStyle = it.color;
      g.lineWidth = px(it.lw);
      g.lineJoin = 'round';
      g.lineCap = 'round';
      g.beginPath();
      it.pts.forEach(([a, b], i) => (i ? g.lineTo : g.moveTo).call(g, x + px(a), y + px(b)));
      g.stroke();
    } else if (it.k === 'art') {
      g.translate(x + px(it.x), y + px(it.y));
      const lh = px(it.size) * (it.lh || 1.1), hgt = it.s.split('\n').length * lh;
      if (it.r) { g.translate(w / 2, hgt / 2); g.rotate((it.r * Math.PI) / 180); g.translate(-w / 2, -hgt / 2); }
      drawArt(g, it, px, w);
      if (it.reflect) {   // 워드아트 반사: 아래로 뒤집어 흐리게
        g.save();
        g.globalAlpha = 0.22;
        g.translate(0, hgt * 2 - px(1));
        g.scale(1, -1);
        drawArt(g, it, px, w);
        g.restore();
      }
    } else if (it.k === 'char' || it.k === 'img') {
      const im = loaded.get(it.k === 'char' ? face(it.id, it.expr, it.real) : it.src);
      if (im && it.clip) {   // 상자로 잘라내기 (배경색 먼저)
        const c = it.clip;
        g.beginPath();
        g.roundRect(x + px(c.x), y + px(c.y), px(c.w), px(c.h), px(c.rad || 0));
        g.clip();
        if (c.bg) { g.fillStyle = c.bg; g.fill(); }
      }
      if (im) {
        const h = w * im.naturalHeight / im.naturalWidth;
        g.translate(x + px(it.x) + w / 2, y + px(it.y) + h / 2);
        if (it.flip) g.scale(-1, 1);
        if (it.r) g.rotate(((it.flip ? -it.r : it.r) * Math.PI) / 180);
        if (it.alpha) g.globalAlpha = it.alpha;
        if (it.sticker) {   // 흰 테두리 (화면의 drop-shadow 네 방향과 같게) + 그림자
          const sil = silhouette(im), o = px(1.2);
          for (const [dx, dy] of [[o, 0], [-o, 0], [0, o], [0, -o], [o * 0.7, o * 0.7], [-o * 0.7, o * 0.7], [o * 0.7, -o * 0.7], [-o * 0.7, -o * 0.7]]) g.drawImage(sil, -w / 2 + dx, -h / 2 + dy, w, h);
          g.shadowColor = 'rgba(0,0,0,.2)'; g.shadowBlur = px(2); g.shadowOffsetY = px(1.5);
        }
        g.drawImage(im, -w / 2, -h / 2, w, h);
        g.shadowColor = 'transparent';
        const sh = it.shades && loaded.get(SHADES_URL);
        if (sh) {
          g.imageSmoothingEnabled = false;
          g.drawImage(sh, -w / 2 + SHADES_BOX.x * w, -h / 2 + SHADES_BOX.y * h, SHADES_BOX.w * w, SHADES_BOX.h * h);
        }
      }
    } else if (it.k === 'label') {
      const h = w / 1.75;
      g.translate(x + px(it.x) + w / 2, y + px(it.y) + h / 2);
      g.rotate((it.r * Math.PI) / 180);
      g.fillStyle = '#D62B1F';
      g.beginPath();
      g.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fff';
      g.font = `700 ${px(it.size)}px system-ui, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(it.s, 0, 0);
    } else {
      const size = px(it.size), lh = size * (it.style === 'bubble' ? 1.3 : it.style === 'thin' || it.style === 'sfx' ? 1 : 1.1);
      g.font = FONT[it.style](size);
      g.textBaseline = 'top';
      const align = it.align || (['sfx', 'impact', 'bubble', 'small'].includes(it.style) ? 'center' : 'left');
      g.textAlign = align;
      let ax = x + px(it.x) + (align === 'center' ? w / 2 : align === 'right' ? w : 0), oy = y + px(it.y);
      if (it.r) {   // 글자 칸 가운데를 축으로 돌린다 (화면 transform 과 같게)
        const lines = it.s.split('\n').length, cy = oy + (lines * lh) / 2;
        g.translate(x + px(it.x) + w / 2, cy);
        g.rotate((it.r * Math.PI) / 180);
        ax -= x + px(it.x) + w / 2;
        oy -= cy;
      }
      it.s.split('\n').forEach((line, i) => {
        const ly = oy + i * lh;
        if (it.style === 'sfx') {
          g.lineJoin = 'round';
          g.lineWidth = px(2);
          g.strokeStyle = '#111';
          g.strokeText(line, ax, ly);
          g.fillStyle = '#FFD400';
        } else if (it.style === 'impact') {
          g.lineJoin = 'round';
          g.lineWidth = px(1.4);
          g.strokeStyle = '#111';
          g.strokeText(line, ax, ly);
          g.fillStyle = '#fff';
        } else g.fillStyle = it.color || '#111';
        g.fillText(line, ax, ly);
      });
    }
    g.restore();
  }
  g.restore();
}
