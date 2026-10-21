// 짤 틀: 터지는 순간 정사각형 한 칸에 랜덤으로 하나. 위치는 칸 크기 대비 % (글자는 cqw) 라서 화면 크기와 상관없이 같은 모양.
// 원화 소품은 assets/deco (tools/prepare_faces.py), 표정은 assets/faces.
import { face } from './data.js';
import { L } from './i18n.js';
import { SHADES_BOX, SHADES_URL } from './pixels.js';

const deco = name => `assets/deco/${name}.webp`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const pick = list => list[Math.floor(Math.random() * list.length)];

const box = ({ l = 0, t = 0, w = 100, r = 0 }) => `left:${l}%;top:${t}%;width:${w}%;${r ? `transform:rotate(${r}deg);` : ''}`;
const img = (src, pos, cls = '') => `<img class="m-el ${cls}" src="${src}" style="${box(pos)}" alt="">`;
const text = (s, pos, cls) => `<div class="m-el m-text ${cls}" style="${box(pos)}">${esc(s)}</div>`;
// 캐릭터: 모든 틀에서 같은 크기(칸 너비 70%)가 기본. shades 면 원화 선글라스가 위에서 떨어져 씌워진다.
const char = (id, expr, { l = 15, t = 27, w = 70, r = 0, sticker = false, shades = false } = {}) =>
  `<div class="m-el m-char ${sticker ? 'sticker' : ''}" style="${box({ l, t, w, r })}"><img src="${face(id, expr)}" alt="">${shades
    ? `<img class="m-shades" src="${SHADES_URL}" style="left:${SHADES_BOX.x * 100}%;top:${SHADES_BOX.y * 100}%;width:${SHADES_BOX.w * 100}%" alt="">` : ''}</div>`;

const T = {
  eng: { ko: ['엥?', '엥?', '뭐임?'], en: ['huh?', 'wait what', 'huh?'] },
  label: { ko: ['해냈다', '터졌다', '실화냐'], en: ['Did it', 'It blew', 'For real?'] },
  bubble: {
    ko: ['참을 수 없\n는 육체', '말을 듣지 않\n는 엉덩이', '이건 내 의지\n가 아니었다', '조용한 데서\n만 나옴'],
    en: ["a body that won't\nlisten", 'it was not my\nchoice', 'only in quiet\nrooms', 'the butt has\nspoken']
  },
  vibe: {
    ko: [['아무도 모름', '나만 앎'], ['방금 그거', '나 아님'], ['참는 거 없음', '그냥 뿡함'], ['오늘도', '평화로움']],
    en: [['NOBODY KNOWS', 'ONLY ME'], ['THAT WAS', 'NOT ME'], ['NO STRESS', 'JUST TOOT'], ['NEW DAY', 'NEW TOOT']]
  },
  deal: {
    ko: ['냄새?\n난 모르는 일', '아무 일도\n없었음', '증거 없음', '나 아님.\n진짜로'],
    en: ['Smell?\nNot my problem', 'Nothing\nhappened', 'No evidence', "Wasn't me.\nReally"]
  },
  thought: { ko: ['방금 그거…\n나였나?', '들켰나…?', '아무도\n못 들었겠지'], en: ['was that…\nme?', 'did they\nhear?', 'nobody\nheard. right?'] },
  thumbs: { ko: ['멋지다', '잘했다', '훌륭함'], en: ['Nice', 'Well done', 'Excellent'] },
  fart: { ko: ['뿌앙', '뿌직', '부르릉'], en: ['PFFT', 'BRAAP', 'TOOT'] },
  night: { ko: [['평화로운 밤', '(방금 뿡)'], ['불멍 중', '(가스멍)']], en: [['A quiet night', '(just tooted)'], ['Fire gazing', '(gas gazing)']] },
  balloon: { ko: ['가스 충전\n완료', '날아갈 뻔'], en: ['Gas tank\nfull', 'Almost\nfloated away'] },
  money: { ko: ['돈 뿌리는\n엉덩이', '잭팟 터짐'], en: ['Make it\nrain', 'JACKPOT'] }
};

/**
 * 틀 목록. 각 틀은 ({ id, expr }) => { bg, html, fx } 를 돌려준다.
 * expr = 결과에 맞는 표정 (냄 = 터짐, 진동 = 휘파람, 참음 = 뻔뻔), fx = 칸 안에서 효과가 나오는 곳 (칸 대비 비율).
 */
export const MEMES = {
  eng: ({ id }) => ({
    bg: '#FFFFFF',
    html: char(id, 'eng', { l: -12, t: -4, w: 124 }) + text(pick(L(T.eng)), { l: 30, t: 4, w: 67 }, 'm-thin'),
    fx: { x: 0.5, y: 0.6 }
  }),
  label: ({ id, expr }) => ({
    bg: '#FFFFFF',
    html: char(id, expr) + `<div class="m-el m-label" style="${box({ l: 4, t: 6, w: 40, r: -4 })}">${esc(pick(L(T.label)))}</div>`
      + img(deco('speech_bubble'), { l: 47, t: -2, w: 52 }) + text(pick(L(T.bubble)), { l: 55, t: 11.5, w: 36 }, 'm-bubble'),
    fx: { x: 0.5, y: 0.65 }
  }),
  vibe: ({ id, expr }) => {
    const [top, bottom] = pick(L(T.vibe));
    return {
      bg: '#B49E89',
      html: char(id, expr, { l: 17, t: 17, w: 66 }) + text(top, { l: 0, t: 3, w: 100 }, 'm-impact') + text(bottom, { l: 0, t: 80, w: 100 }, 'm-impact'),
      fx: { x: 0.5, y: 0.5 }
    };
  },
  deal: ({ id }) => ({
    bg: '#F2F2F2',
    html: char(id, 'shameless', { l: 18, t: 27, w: 70, r: -4, sticker: true, shades: true }) + text(pick(L(T.deal)), { l: 5, t: 4, w: 80 }, 'm-display'),
    fx: { x: 0.5, y: 0.6 }
  }),
  thought: ({ id }) => ({
    bg: '#DCE9F5',
    html: char(id, 'blank', { l: 3, t: 30 }) + img(deco('thought_bubble'), { l: 42, t: -2, w: 56 }) + text(pick(L(T.thought)), { l: 52, t: 11, w: 37 }, 'm-bubble'),
    fx: { x: 0.4, y: 0.7 }
  }),
  thumbs: ({ id }) => ({
    bg: '#FFFFFF',
    html: char(id, 'thumbs_up') + `<div class="m-el m-label" style="${box({ l: 5, t: 6, w: 38, r: -3 })}">${esc(pick(L(T.thumbs)))}</div>`,
    fx: { x: 0.5, y: 0.65 }
  }),
  fart: ({ id }) => ({
    bg: '#FFF3B0',
    html: char(id, 'burst', { l: 2, t: 27 }) + img(deco('fart_bubble'), { l: 55, t: 46, w: 46 }) + text(pick(L(T.fart)), { l: 0, t: 3, w: 100 }, 'm-impact'),
    fx: { x: 0.35, y: 0.62 }
  }),
  night: ({ id }) => {
    const [top, bottom] = pick(L(T.night));
    return {
      bg: '#1F2747',
      html: img(deco('moon'), { l: 74, t: 2, w: 24 }) + img(deco('stars'), { l: 50, t: 8, w: 28 }) + img(deco('campfire'), { l: 0, t: 64, w: 32 })
        + char(id, 'hold', { l: 30, t: 30, w: 66 }) + text(top, { l: 5, t: 5, w: 60 }, 'm-display m-white m-nowrap') + text(bottom, { l: 5, t: 15, w: 60 }, 'm-small m-white m-left'),
      fx: { x: 0.6, y: 0.6 }
    };
  },
  balloon: ({ id }) => ({
    bg: '#CFEFFF',
    html: img(deco('cloud'), { l: 58, t: 4, w: 36 }) + img(deco('cloud'), { l: -6, t: 52, w: 30 }) + img(deco('balloon'), { l: 66, t: 30, w: 30, r: 12 })
      + char(id, 'whistle', { l: 10, t: 28, w: 64 }) + text(pick(L(T.balloon)), { l: 5, t: 5, w: 60 }, 'm-display'),
    fx: { x: 0.45, y: 0.6 }
  }),
  // 잭팟 전용: 돈 비 + 머니건 + 엄지척 + 선글라스
  money: ({ id }) => ({
    bg: '#E8FFD9',
    html: img(deco('money_rain'), { l: 0, t: 6, w: 100 }) + char(id, 'thumbs_up', { l: 20, t: 26, w: 66, shades: true })
      + img(deco('money_gun'), { l: -8, t: 52, w: 46, r: -10 }, 'm-gun') + text(pick(L(T.money)), { l: 0, t: 3, w: 100 }, 'm-impact'),
    fx: { x: 0.15, y: 0.62 }
  })
};

export const RANDOM_MEMES = Object.keys(MEMES).filter(k => k !== 'money');

/** 결과 하나에 짤 하나: 잭팟이면 돈 틀, 아니면 랜덤 */
export function pickMeme(jackpot) {
  return jackpot ? 'money' : pick(RANDOM_MEMES);
}
