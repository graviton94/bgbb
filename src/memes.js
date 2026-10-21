// 짤: 터질 때마다 그 상황으로 조립하는 정사각형 한 칸.
//  - 조립형: 배경 · 캐릭터 자리와 크기 · 문구(상황 + 한 방) · 문구 자리 · 소품을 매번 랜덤으로
//  - 캐릭터에 붙는 것(선글라스 = 얼굴, 방구 구름 = 엉덩이 옆, 머니건 = 손)은 캐릭터 상자 기준 좌표
//  - 유니크 짤 (엥? · 스티커+안경 · 참은 나 vs 뀐 나 · 들어갈 때 vs 나올 때 · 범인은 이 안에 · 현자 타임 · 상자 · 잭팟 돈)은 미리 만든 틀
// 결과는 spec (칸 대비 % 좌표 목록) 이라 화면(DOM)과 자랑 카드(canvas)가 같은 짤을 그린다.
import { face } from './data.js';
import { L } from './i18n.js';
import { SHADES_BOX, SHADES_URL } from './pixels.js';

const deco = name => `assets/deco/${name}.webp`;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = list => list[Math.floor(Math.random() * list.length)];
const chance = p => Math.random() < p;
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
  box: { ko: ['숨어서 뿡', '여기 아무도 없음', '상자는 무죄'], en: ['Tooting\nin hiding', 'Nobody\nin here', 'The box\nis innocent'] }
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
const BASE = { impact: 11.5, display: 8.6, thin: 18, small: 5, bubble: 4.4, label: 7.2 };
function fit(text, w, base) {
  const em = Math.max(...text.split('\n').map(line => [...line].reduce((n, c) => n + (/[ㄱ-힝]/.test(c) ? 1 : c === ' ' ? 0.3 : 0.62), 0)));
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
const charItem = (id, expr, x, y, w, { shades = false, sticker = false, r = 0 } = {}) => ({ k: 'char', id, expr, x, y, w, r, shades, sticker });
/** 엉덩이 옆에서 나오는 방구 구름 (side = 1 오른쪽, -1 왼쪽) */
function fartFor(c, side) {
  const w = c.w * 0.62;
  return { k: 'img', src: deco('fart_bubble'), x: side > 0 ? c.x + c.w * 0.8 : c.x + c.w * 0.2 - w, y: c.y + c.w * 0.45, w, flip: side < 0 };
}
/** 손에 든 머니건 */
const gunFor = c => ({ k: 'img', src: deco('money_gun'), x: c.x - c.w * 0.2, y: c.y + c.w * 0.48, w: c.w * 0.62, r: -12, cls: 'm-gun' });

// ---------------------------------------------------------------- 유니크 짤 (미리 만든 틀)
export const UNIQUE = {
  eng: ({ id }) => ({
    bg: '#FFFFFF',
    items: [charItem(id, 'eng', -12, -4, 124), textItem(pick(L(W.eng)), 26, 4, 68, 'thin', { align: 'right' })],
    fx: { x: 0.5, y: 0.6 }
  }),
  deal: ({ id }) => ({
    bg: '#F2F2F2',
    items: [charItem(id, 'shameless', 18, 27, 70, { shades: true, sticker: true, r: -4 }), textItem(pick(L(W.deal)), 5, 4, 80, 'display')],
    fx: { x: 0.5, y: 0.6 }
  }),
  // 참은 나 vs 뀐 나: 반반
  versus: ({ id }) => {
    const [a, b] = pick(L(W.versus));
    return {
      bg: '#FFFFFF',
      items: [rect(50, 0, 50, 100, '#FFE1EC'), rect(49.6, 0, 0.8, 100, '#111111'),
        textItem(a, 2, 6, 46, 'display', { align: 'center' }), textItem(b, 52, 6, 46, 'display', { align: 'center' }),
        charItem(id, 'hold', 2, 34, 46), charItem(id, 'burst', 52, 34, 46)],
      fx: { x: 0.75, y: 0.6 }
    };
  },
  // 들어갈 때 vs 나올 때: 위아래
  expect: ({ id }) => {
    const [a, b] = pick(L(W.expect));
    return {
      bg: '#DCE9F5',
      items: [rect(0, 50, 100, 50, '#FFF3B0'), rect(0, 49.6, 100, 0.8, '#111111'),
        textItem(a, 5, 16, 52, 'display'), textItem(b, 5, 66, 52, 'display'),
        charItem(id, 'blank', 58, 4, 42), charItem(id, 'shameless', 58, 54, 42, { shades: true })],
      fx: { x: 0.8, y: 0.8 }
    };
  },
  // 범인은 이 안에 있다: 셋이 키 재는 벽 앞에. 진짜 범인만 휘파람
  lineup: ({ id }) => ({
    bg: '#E9E9E6',
    items: [rect(0, 34, 100, 0.5, '#9A9A95'), rect(0, 50, 100, 0.5, '#9A9A95'), rect(0, 66, 100, 0.5, '#9A9A95'), rect(0, 82, 100, 0.5, '#9A9A95'),
      textItem(pick(L(W.lineup)), 3, 5, 94, 'display', { align: 'center' }),
      ...['hamster', 'tit', 'cat'].map((c, i) => charItem(c, c === id ? 'whistle' : 'blank', i * 33 - 2, 36, 37)),
      ...['1', '2', '3'].map((n, i) => textItem(n, i * 33 + 13, 92, 8, 'small', { color: '#555555' }))],
    fx: { x: 0.5, y: 0.7 }
  }),
  // 현자 타임: 머리 뒤에 해
  halo: ({ id }) => ({
    bg: '#FFF3B0',
    items: [{ k: 'img', src: deco('sun'), x: 14, y: 2, w: 72 }, charItem(id, 'blank', 19, 30, 62), textItem(pick(L(W.halo)), 1, 84, 98, 'impact')],
    fx: { x: 0.5, y: 0.7 }
  }),
  // 상자 속에서 뿡
  box: ({ id }) => ({
    bg: '#CFEFFF',
    items: [charItem(id, 'whistle', 24, 22, 54), { k: 'img', src: deco('box'), x: 8, y: 46, w: 84 },
      { k: 'img', src: deco('fart_bubble'), x: 66, y: 44, w: 34 }, textItem(pick(L(W.box)), 5, 5, 60, 'display')],
    fx: { x: 0.8, y: 0.55 }
  }),
  money: ({ id }) => {
    const c = charItem(id, 'thumbs_up', 20, 26, 66, { shades: true });
    return {
      bg: '#E8FFD9',
      items: [{ k: 'img', src: deco('money_rain'), x: 0, y: 6, w: 100 }, c, gunFor(c), textItem(pick(L(W.money)), 0, 3, 100, 'impact')],
      fx: { x: 0.25, y: 0.62 }
    };
  }
};

// ---------------------------------------------------------------- 조립형
const LAYOUTS = ['captions', 'bubble', 'thought', 'label', 'corner'];

function assemble({ id, mode, t, title, rarity, practice }) {
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
      c = charItem(id, expr, (100 - w) / 2 + rnd(-4, 4), rnd(14, 18), w);
      items.push(c, textItem(top, 1, 3, 98, 'impact'), textItem(punch, 1, 81, 98, 'impact'));
      free = pick([-1, 1]);
      break;
    }
    case 'bubble':
    case 'thought': {    // 한쪽에 캐릭터, 반대쪽 위에 말풍선 · 생각 풍선 (꼬리가 캐릭터 쪽)
      const thought = layout === 'thought';
      const left = chance(0.5), w = rnd(62, 70);
      c = charItem(id, thought ? pick(['blank', 'hold', expr]) : expr, left ? rnd(-3, 3) : 100 - w + rnd(-3, 3), 100 - w - rnd(0, 3), w);
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
      c = charItem(id, mode === 'loud' && chance(0.4) ? 'thumbs_up' : expr, rnd(14, 26), 100 - w - rnd(0, 3), w);
      const word = rarity === 'jackpot' || rarity === 'legend' ? L(W.labelRare[rarity]) : pick(L(W.label));
      items.push(c, { k: 'label', s: word, x: rnd(3, 7), y: rnd(4, 8), w: rnd(36, 42), r: rnd(-6, 2), size: fit(word, 32, BASE.label) });
      if (chance(0.6)) items.push(textItem(punch, 50, rnd(7, 12), 46, 'display', { color, align: 'right' }));
      free = c.x > 20 ? -1 : 1;
      break;
    }
    default: {           // 왼쪽 위 두 줄 (상황 + 한 방)
      const w = rnd(62, 70);
      c = charItem(id, expr, rnd(20, 34), 100 - w - rnd(0, 3), w);
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

/**
 * 짤 하나. ctx = { id, mode, t, title(칭호 이름), rarity, practice }
 * 잭팟 = 돈 짤, 그 밖엔 35% 유니크 짤 · 65% 조립형.
 */
export function composeMeme(ctx) {
  if (ctx.rarity === 'jackpot') return { name: 'money', ...UNIQUE.money(ctx) };
  if (chance(0.35)) {
    const name = pick(Object.keys(UNIQUE).filter(k => k !== 'money'));
    return { name, ...UNIQUE[name](ctx) };
  }
  return { name: 'assembled', ...assemble(ctx) };
}

// ---------------------------------------------------------------- 화면에 그리기 (DOM, 글자는 cqw)
const pos = it => `left:${it.x}%;top:${it.y}%;width:${it.w}%;`;
const turn = it => (it.flip || it.r ? `transform:${it.flip ? 'scaleX(-1) ' : ''}${it.r ? `rotate(${it.flip ? -it.r : it.r}deg)` : ''};` : '');
const CLASS = { impact: 'm-impact', display: 'm-display', thin: 'm-thin', small: 'm-small', bubble: 'm-bubble' };

export function renderMeme(el, spec) {
  el.style.setProperty('--meme-bg', spec.bg);
  el.innerHTML = spec.items.map(it => {
    if (it.k === 'char') {
      const shades = it.shades
        ? `<img class="m-shades" src="${SHADES_URL}" style="left:${SHADES_BOX.x * 100}%;top:${SHADES_BOX.y * 100}%;width:${SHADES_BOX.w * 100}%" alt="">` : '';
      return `<div class="m-el m-char ${it.sticker ? 'sticker' : ''}" style="${pos(it)}${turn(it)}"><img src="${face(it.id, it.expr)}" alt="">${shades}</div>`;
    }
    if (it.k === 'rect') return `<div class="m-el" style="${pos(it)}height:${it.h}%;background:${it.color}"></div>`;
    if (it.k === 'img') return `<img class="m-el ${it.cls || ''}" src="${it.src}" style="${pos(it)}${turn(it)}" alt="">`;
    if (it.k === 'label') return `<div class="m-el m-label" style="${pos(it)}${turn(it)}font-size:${it.size}cqw">${esc(it.s)}</div>`;
    return `<div class="m-el m-text ${CLASS[it.style]}" style="${pos(it)}font-size:${it.size}cqw;${it.color ? `color:${it.color};` : ''}${it.align ? `text-align:${it.align};` : ''}">${esc(it.s)}</div>`;
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

const FONT = {
  impact: s => `${s}px "Black Han Sans", sans-serif`,
  display: s => `${s}px "Black Han Sans", sans-serif`,
  thin: s => `400 ${s}px system-ui, sans-serif`,
  small: s => `700 ${s}px system-ui, sans-serif`,
  bubble: s => `700 ${s}px system-ui, sans-serif`
};

/** spec 을 (x, y) 에서 한 변 S 픽셀 정사각형으로 그린다 (화면과 같은 짤) */
export async function drawMeme(g, spec, x, y, S) {
  const px = v => (v / 100) * S;
  const srcs = spec.items.flatMap(it => (it.k === 'char' ? [face(it.id, it.expr), ...(it.shades ? [SHADES_URL] : [])] : it.k === 'img' ? [it.src] : []));
  const loaded = new Map(await Promise.all(srcs.map(async s => [s, await loadImage(s)])));
  await document.fonts?.load?.('40px "Black Han Sans"');
  g.save();
  g.beginPath();
  g.rect(x, y, S, S);
  g.clip();
  g.fillStyle = spec.bg;
  g.fillRect(x, y, S, S);
  for (const it of spec.items) {
    g.save();
    const w = px(it.w);
    if (it.k === 'rect') {
      g.fillStyle = it.color;
      g.fillRect(x + px(it.x), y + px(it.y), w, px(it.h));
    } else if (it.k === 'char' || it.k === 'img') {
      const im = loaded.get(it.k === 'char' ? face(it.id, it.expr) : it.src);
      if (im) {
        const h = w * im.naturalHeight / im.naturalWidth;
        g.translate(x + px(it.x) + w / 2, y + px(it.y) + h / 2);
        if (it.flip) g.scale(-1, 1);
        if (it.r) g.rotate(((it.flip ? -it.r : it.r) * Math.PI) / 180);
        if (it.sticker) { g.shadowColor = 'rgba(0,0,0,.2)'; g.shadowBlur = px(2); g.shadowOffsetY = px(1.5); }
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
      const size = px(it.size), lh = size * (it.style === 'bubble' ? 1.3 : it.style === 'thin' ? 1 : 1.1);
      g.font = FONT[it.style](size);
      g.textBaseline = 'top';
      const align = it.align || (['impact', 'bubble', 'small'].includes(it.style) ? 'center' : 'left');
      g.textAlign = align;
      const ax = x + px(it.x) + (align === 'center' ? w / 2 : align === 'right' ? w : 0);
      it.s.split('\n').forEach((line, i) => {
        const ly = y + px(it.y) + i * lh;
        if (it.style === 'impact') {
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
