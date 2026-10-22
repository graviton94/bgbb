// 꾸미기 아이템 카탈로그. 홈 배경 · 캐릭터 옆 소품 · 말풍선 · 캐릭터 모습 (원화 / 실사).
// 얻는 법: free (처음부터) · title (그 칭호를 따면 무료) · price (뿡코인으로 사기). title 과 price 를 같이 두면 둘 중 아무거나.
// 새 그림이 오면 assets/skin/<slot>/<id>.webp 로 넣고 여기 한 줄 추가하면 끝 (짤 뽑기 · 칭호 보상 · 상점이 모두 이 목록을 쓴다).
const sky = (a, b) => `linear-gradient(180deg, ${a}, ${b})`;

export const SLOTS = ['bg', 'prop', 'bubble', 'look'];
export const SLOT_NAMES = {
  bg: { ko: '배경', en: 'Background' },
  prop: { ko: '소품', en: 'Prop' },
  bubble: { ko: '말풍선', en: 'Bubble' },
  look: { ko: '모습', en: 'Look' }
};

// bg: css = 홈 전체 배경 (CSS background 값), dark = 글자를 흰색으로, vivid = 알록달록해서 흐린 글자도 진하게, frame = 상장 테두리 색
const BG = [
  { id: 'bg_plain', name: { ko: '무표정 회색', en: 'Poker-face grey' }, free: true, css: '#F2F2F0' },
  { id: 'bg_kakao', name: { ko: '단톡방', en: 'Group chat' }, title: 'soft3', price: 40, css: '#B2C7D9' },
  { id: 'bg_rainbow', name: { ko: '무지개 썸네일', en: 'Rainbow thumbnail' }, title: 'ensemble', price: 90, vivid: true,
    css: 'linear-gradient(115deg, #FF00C8, #FF2E2E, #FFE600, #2EFF6A, #22C8FF, #8A2BFF)' },
  { id: 'bg_ppt', name: { ko: '회색 PPT', en: 'Grey slide deck' }, price: 60, dark: true, css: sky('#3A3A3A', '#9A9A9A') },
  { id: 'bg_cctv', name: { ko: 'CCTV', en: 'CCTV' }, title: 'meeting_loud', dark: true,
    css: 'repeating-linear-gradient(180deg, rgba(0,0,0,.28) 0 2px, transparent 2px 8px), linear-gradient(180deg, #0E2A16, #071009)' },
  { id: 'bg_news', name: { ko: '뉴스 스튜디오', en: 'News studio' }, title: 'first_today', price: 50, dark: true,
    css: 'repeating-linear-gradient(90deg, rgba(255,255,255,.06) 0 2px, transparent 2px 60px), linear-gradient(160deg, #0B2A6F, #1F5FD1)' },
  { id: 'bg_award', name: { ko: '상장 테두리', en: 'Certificate' }, title: 'streak7', css: '#FFFBEA', frame: '#C9A227' },
  { id: 'bg_stock', name: { ko: '주식 창', en: 'Stock chart' }, title: 'loud5', price: 70, dark: true,
    css: 'repeating-linear-gradient(180deg, transparent 0 59px, #262B34 59px 60px), #0F1115' },
  { id: 'bg_night', name: { ko: '야식 타임', en: 'Midnight snack' }, title: 'night_quiet', price: 60, dark: true,
    css: `url(assets/deco/stars.webp) right 12% top 22% / 34% no-repeat, ${sky('#1F2747', '#2B2140')}` },
  { id: 'bg_money', name: { ko: '돈 비', en: 'Money rain' }, title: 'jp_rain',
    css: 'url(assets/deco/money_rain.webp) center 30% / 90% no-repeat, #E8FFD9' },
  { id: 'bg_random', name: { ko: '오늘의 배경: 랜덤', en: 'Random every day' }, price: 120, random: true,
    css: 'conic-gradient(from 90deg, #FFE600, #FF7AB6, #7EC8FF, #D7FF3D, #FFE600)' }
];

// prop: 캐릭터 반대쪽 아래에 서 있는 소품 (assets/deco)
const deco = n => `assets/deco/${n}.webp`;
const PROP = [
  { id: 'prop_none', name: { ko: '없음', en: 'None' }, free: true },
  { id: 'prop_sun', name: { ko: '해', en: 'Sun' }, title: 'morning', price: 20, src: deco('sun') },
  { id: 'prop_moon', name: { ko: '달', en: 'Moon' }, title: 'night', price: 20, src: deco('moon') },
  { id: 'prop_cloud', name: { ko: '구름', en: 'Cloud' }, price: 15, src: deco('cloud') },
  { id: 'prop_balloon', name: { ko: '풍선', en: 'Balloon' }, price: 25, src: deco('balloon') },
  { id: 'prop_sunflower', name: { ko: '해바라기', en: 'Sunflower' }, title: 'hamster', price: 25, src: deco('sunflower') },
  { id: 'prop_tree', name: { ko: '나무', en: 'Tree' }, title: 'afternoon', price: 25, src: deco('tree') },
  { id: 'prop_carrot', name: { ko: '당근', en: 'Carrot' }, title: 'lunch', price: 20, src: deco('carrot') },
  { id: 'prop_box', name: { ko: '숨을 상자', en: 'Hiding box' }, title: 'weekend_nap', price: 35, src: deco('box') },
  { id: 'prop_campfire', name: { ko: '모닥불', en: 'Campfire' }, title: 'evening', price: 35, src: deco('campfire') },
  { id: 'prop_gun', name: { ko: '머니건', en: 'Money gun' }, title: 'jp_heir', src: deco('money_gun') }
];

// bubble: 홈 말풍선 모양 (styles.css 의 .bubble.skin-<id>)
const BUBBLE = [
  { id: 'bubble_basic', name: { ko: '기본', en: 'Basic' }, free: true },
  { id: 'bubble_kakao', name: { ko: '노란 톡', en: 'Yellow chat' }, title: 'meeting_soft', price: 40 },
  { id: 'bubble_impact', name: { ko: '짤 자막', en: 'Meme caption' }, title: 'broke', price: 50 },
  { id: 'bubble_ppt', name: { ko: '무지개 PPT', en: 'Rainbow slide' }, price: 60 },
  { id: 'bubble_receipt', name: { ko: '영수증', en: 'Receipt' }, title: 'total50', price: 45 },
  { id: 'bubble_news', name: { ko: '속보 자막', en: 'Breaking ticker' }, title: 'commute', price: 45 }
];

// look: 홈 캐릭터 모습
const LOOK = [
  { id: 'look_art', name: { ko: '원화', en: 'Drawn' }, free: true },
  { id: 'look_real', name: { ko: '실사', en: 'Real photo' }, title: 'hold5', price: 200 }
];

export const ITEMS = [...BG.map(x => ({ ...x, slot: 'bg' })), ...PROP.map(x => ({ ...x, slot: 'prop' })),
  ...BUBBLE.map(x => ({ ...x, slot: 'bubble' })), ...LOOK.map(x => ({ ...x, slot: 'look' }))];
export const itemById = id => ITEMS.find(x => x.id === id);
export const DEFAULT_EQUIP = { bg: 'bg_plain', prop: 'prop_none', bubble: 'bubble_basic', look: 'look_art' };

/** 가졌나: 처음부터 · 그 칭호를 땄음 · 샀음 */
export const isOwned = (x, titles, bought) => !!(x.free || (x.title && titles[x.title]) || bought[x.id]);

// 뿡코인: 터질 때마다 (냄 3 · 진동 2 · 참음 1) + 새 칭호 보너스 (등급별)
export const COINS = { loud: 3, soft: 2, hold: 1 };
export const TITLE_BONUS = { normal: 5, rare: 15, legend: 40, jackpot: 100 };
