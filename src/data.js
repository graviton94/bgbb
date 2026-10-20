// 고정 게임 데이터. 글은 { ko, en } 로 두고 i18n.L() 로 고른다.

export const CHARACTERS = [
  {
    id: 'hamster',
    name: { ko: '방구 햄찌', en: 'Toot Hamster' },
    intro: { ko: '주머니 속 가스 담당. 해바라기씨만 먹으면 배가 꾸르륵.', en: 'In charge of pocket gas. Sunflower seeds make its tummy rumble.' },
    food: { icon: '🌻', name: { ko: '해바라기씨', en: 'Seeds' } },
    styles: {
      main: { ko: '뿡!', en: 'Toot!' },
      soft: { ko: '삐용~ 피식', en: 'Pfft~' },
      loud: { ko: '부르르르릉!', en: 'BRRRAAP!' }
    },
    tapLines: {
      ko: ['뿌우웅! 💨', '헤헤, 들켰나?', '배에서 꾸르륵...', '뽀옹~ 💨'],
      en: ['Pfffft! 💨', 'Hehe, caught me?', 'Tummy rumbling...', 'Toot~ 💨']
    },
    sprites: {
      base: 'assets/hamster.webp',
      walk: 'assets/sprites/hamster_walk.webp',
      react: 'assets/sprites/hamster_jump.webp',
      sleep: 'assets/sprites/hamster_sleep.webp'
    },
    height: 0.2,          // 월드 높이 대비 키
    lane: [0.04, 0.5],    // 주로 노는 가로 구역
    special: 'toot'       // 가만히 있다가 혼자 뽀옹
  },
  {
    id: 'tit',
    name: { ko: '솜뭉치 오목눈이', en: 'Cotton Chickadee' },
    intro: { ko: '솜뭉치처럼 가벼운 수다쟁이. 갑자기 째액! 하고 운다.', en: 'A chatterbox as light as cotton. Suddenly goes SKREEE!' },
    food: { icon: '🌾', name: { ko: '좁쌀', en: 'Millet' } },
    styles: {
      main: { ko: '쮸리릿 짹!', en: 'Tsee-tsirrup!' },
      soft: { ko: '파닥파닥', en: 'Flap flap' },
      loud: { ko: '째애액!', en: 'SKREEE!' }
    },
    tapLines: {
      ko: ['짹짹! 🎵', '쮸리릿?', '포로롱~', '파닥파닥 🪶'],
      en: ['Tweet! 🎵', 'Tsirrup?', 'Flutter~', 'Flap flap 🪶']
    },
    sprites: {
      base: 'assets/tit.webp',
      walk: 'assets/sprites/tit_hop.webp',
      react: 'assets/sprites/tit_sing.webp',
      fly: 'assets/sprites/tit_fly.webp',
      sleep: 'assets/tit.webp'
    },
    height: 0.15,
    lane: [0.2, 0.8],
    special: 'fly'
  },
  {
    id: 'cat',
    name: { ko: '시크 뚱냥이', en: 'Chubby Cat' },
    intro: { ko: '만사 귀찮은 냥님. 츄르 앞에서만 골골송을 부른다.', en: 'Can\'t be bothered. Only purrs for a cat treat.' },
    food: { icon: '🐟', name: { ko: '츄르', en: 'Treat' } },
    styles: {
      main: { ko: '냐아옹~', en: 'Mrrreow~' },
      soft: { ko: '그르릉 골골', en: 'Purrrr' },
      loud: { ko: '캬아악!', en: 'HISSS!' }
    },
    tapLines: {
      ko: ['...냥.', '귀찮다옹 🐾', '츄르 가져왔냥?', '냐아앙~'],
      en: ['...meow.', 'Not now 🐾', 'Got treats?', 'Mrrrow~']
    },
    sprites: {
      base: 'assets/cat.webp',
      walk: 'assets/sprites/cat_walk.webp',
      react: 'assets/sprites/cat_play.webp',
      sleep: 'assets/sprites/cat_sit.webp'
    },
    height: 0.24,
    lane: [0.5, 0.96],
    special: 'sleep'
  }
];

export const charById = id => CHARACTERS.find(c => c.id === id);

export const STYLE_NAMES = {
  main: { ko: '기본', en: 'Normal' },
  soft: { ko: '소심', en: 'Shy' },
  loud: { ko: '우렁찬', en: 'Loud' },
  diy: { ko: '내 목소리', en: 'My voice' }
};

// 주머니 속 작전 결과. 폰이 소리/진동/무음일 때.
export const MODES = {
  loud: { name: { ko: '대담', en: 'Bold' }, icon: '💥', reward: 3, color: '#E8590C', line: { ko: '대담하게 발사! 💥', en: 'Fired boldly! 💥' } },
  soft: { name: { ko: '소심', en: 'Shy' }, icon: '🫧', reward: 3, color: '#4C6EF5', line: { ko: '소심하게 피식... 🫧', en: 'A shy little leak... 🫧' } },
  hold: { name: { ko: '꾹참', en: 'Held' }, icon: '🤫', reward: 5, color: '#0CA678', line: { ko: '윽! 꾹 참았다 🤫', en: 'Ngh! Held it in 🤫' } }
};

export const FREQUENCIES = {
  quiet: { name: { ko: '인내', en: 'Calm' }, range: [1, 2] },
  normal: { name: { ko: '은밀', en: 'Sneaky' }, range: [3, 5] },
  thrill: { name: { ko: '쫄깃', en: 'Thrilling' }, range: [6, 9] }
};

// 아지트 소품. x 는 가로 위치(0~1), depth 는 0=맨 앞 ~ 1=지평선.
export const PROPS = [
  { id: 'tent',      name: { ko: '꼬마텐트', en: 'Tent' },      x: 0.13, depth: 0.78, h: 0.2,  pet: 'hamster', style: 'soft', line: { ko: '텐트 속 비밀 작전 회의! ⛺', en: 'Secret meeting in the tent! ⛺' } },
  { id: 'tree',      name: { ko: '큰나무', en: 'Big tree' },    x: 0.86, depth: 0.95, h: 0.36, pet: 'tit',     style: 'loud', line: { ko: '나무 꼭대기에서 노래해요 🌳', en: 'Singing from the treetop 🌳' }, price: 60 },
  { id: 'sunflower', name: { ko: '해바라기', en: 'Sunflower' }, x: 0.32, depth: 0.7,  h: 0.2,  pet: 'tit',     style: 'main', line: { ko: '해바라기씨 콕콕! 🌻', en: 'Peck peck, seeds! 🌻' } },
  { id: 'balloon',   name: { ko: '방구풍선', en: 'Balloon' },   x: 0.7,  depth: 0.82, h: 0.19, pet: 'hamster', style: 'soft', line: { ko: '풍선이 부풀어 오른다 뽀옹~ 🎈', en: 'The balloon puffs up~ 🎈' } },
  { id: 'bench',     name: { ko: '통나무', en: 'Log bench' },   x: 0.52, depth: 0.5,  h: 0.1,  pet: 'tit',     style: 'main', line: { ko: '통나무에서 포로롱 휴식 🪵', en: 'A little rest on the log 🪵' } },
  { id: 'box',       name: { ko: '냥이상자', en: 'Box' },       x: 0.82, depth: 0.42, h: 0.13, pet: 'cat',     style: 'soft', line: { ko: '역시 좁은 상자가 최고다옹 📦', en: 'A small box is the best 📦' } },
  { id: 'mat',       name: { ko: '돗자리', en: 'Picnic mat' },  x: 0.3,  depth: 0.3,  h: 0.1,  pet: 'cat',     style: 'soft', line: { ko: '돗자리 위에서 데구르르~ 🌸', en: 'Rolling on the mat~ 🌸' }, price: 30 },
  { id: 'campfire',  name: { ko: '모닥불', en: 'Campfire' },    x: 0.5,  depth: 0.12, h: 0.15, pet: 'hamster', style: 'loud', line: { ko: '군고구마 먹고 배가 꾸르륵 🔥', en: 'Roast potato, rumbly tummy 🔥' } },
  { id: 'carrot',    name: { ko: '당근밭', en: 'Carrots' },     x: 0.08, depth: 0.18, h: 0.15, pet: 'hamster', style: 'main', line: { ko: '당근 뽑다가 뿡! 🥕', en: 'Pulled a carrot... toot! 🥕' } },
  { id: 'churu',     name: { ko: '황금츄르', en: 'Gold treat' }, x: 0.68, depth: 0.08, h: 0.1,  pet: 'cat',     style: 'main', line: { ko: '츄르 핥짝핥짝 갸르릉~ 🐟', en: 'Lick lick, purr~ 🐟' } }
];

export const propById = id => PROPS.find(p => p.id === id);

export const THEMES = {
  meadow: { name: { ko: '낮 · 초원', en: 'Meadow' },    icon: '☀️' },
  sunset: { name: { ko: '저녁 · 노을', en: 'Sunset' },  icon: '🌇' },
  night:  { name: { ko: '밤 · 별빛', en: 'Starry night' }, icon: '🌙' },
  room:   { name: { ko: '미니룸', en: 'Mini room' },    icon: '🏠' },
  city:   { name: { ko: '네온 도시', en: 'Neon city' }, icon: '🏙️', unlockHolds: 15 }
};

export const timeTheme = (hour = new Date().getHours()) =>
  hour >= 6 && hour < 17 ? 'meadow' : hour >= 17 && hour < 20 ? 'sunset' : 'night';

// 비밀 보물: 진짜 기록으로만 열린다. s = store.stats()
export const TREASURES = [
  { id: 'acorn', name: { ko: '황금 도토리', en: 'Golden acorn' },
    cond: { ko: '친구에게 처음 간식 주기', en: 'Feed a friend for the first time' },
    lore: { ko: '햄찌가 주머니 깊숙한 곳에서 발견한 황금빛 도토리.', en: 'A golden acorn the hamster found deep in your pocket.' },
    test: s => s.fed },
  { id: 'sweet_potato', name: { ko: '노릇 군고구마', en: 'Roast sweet potato' },
    cond: { ko: '불시 작전 누적 5회', en: '5 surprise pranks in total' },
    lore: { ko: '방구 생성률 300%. 주머니가 들썩거린다.', en: 'Toot rate +300%. Your pocket starts to wobble.' },
    test: s => s.total.all >= 5 },
  { id: 'whoopee', name: { ko: '방구 방석', en: 'Whoopee cushion' },
    cond: { ko: '소리 모드에서 대담 5회', en: '5 bold pranks on sound mode' },
    lore: { ko: '앉는 순간 뽀오옹~ 회의실 분위기 브레이커.', en: 'Sit down and... PFFFT. Ends any meeting.' },
    test: s => s.total.loud >= 5 },
  { id: 'spray', name: { ko: '피치 탈취제', en: 'Peach spray' },
    cond: { ko: '진동 모드에서 소심 5회', en: '5 shy pranks on vibrate' },
    lore: { ko: '몰래 뿡! 직후 슉슉. 비밀 요원의 에티켓.', en: 'Psst-psst right after. A secret agent\'s manners.' },
    test: s => s.total.soft >= 5 },
  { id: 'trophy', name: { ko: '참음왕 트로피', en: 'Hold-it trophy' },
    cond: { ko: '무음 모드에서 누적 꾹참 10회', en: 'Hold it in 10 times on silent' },
    lore: { ko: '조용한 회의실에서 끝까지 참아낸 자의 영예.', en: 'For those who held it in through the quietest meeting.' },
    test: s => s.total.hold >= 10 },
  { id: 'stamp', name: { ko: '참 잘했어요', en: 'Well done stamp' },
    cond: { ko: '하루에 꾹참 5회', en: 'Hold it in 5 times in one day' },
    lore: { ko: '하루 종일 우아하게 참아낸 평정심 마스터의 도장.', en: 'A stamp for a whole day of graceful composure.' },
    test: s => s.bestHoldDay >= 5 },
  { id: 'key', name: { ko: '비밀 열쇠', en: 'Secret key' },
    cond: { ko: '그림일기 3번 저장', en: 'Save the picture diary 3 times' },
    lore: { ko: '친구들의 흑역사가 적힌 다이어리의 하트 열쇠.', en: 'The heart key to a diary of embarrassing moments.' },
    test: s => s.diarySaves >= 3 },
  { id: 'mat', name: { ko: '벚꽃 돗자리', en: 'Blossom mat' },
    cond: { ko: '아지트에 돗자리 들이기', en: 'Get the picnic mat for the hideout' },
    lore: { ko: '깔아두면 친구들이 옹기종기 모여 낮잠을 잔다.', en: 'Spread it out and everyone naps together.' },
    test: s => s.owned.includes('mat') },
  { id: 'tree', name: { ko: '크레용 수호목', en: 'Crayon guardian tree' },
    cond: { ko: '아지트에 큰나무 들이기', en: 'Get the big tree for the hideout' },
    lore: { ko: '오목눈이가 꼭대기에 둥지를 튼 든든한 나무.', en: 'A sturdy tree with the chickadee\'s nest on top.' },
    test: s => s.owned.includes('tree') }
];

export const WEATHERS = [
  { ko: '💨 뿡뿡', en: '💨 Tooty' },
  { ko: '☀️ 맑음', en: '☀️ Sunny' },
  { ko: '🌩️ 꾸르륵', en: '🌩️ Rumbly' },
  { ko: '🌈 평화', en: '🌈 Peaceful' }
];

// Google Play 응원하기 상품 (Play Console 에 같은 ID 로 '일회성 제품' 을 만든다)
export const TIPS = [
  { id: 'tip_seeds', icon: '🌻', name: { ko: '해바라기씨 한 줌', en: 'A handful of seeds' } },
  { id: 'tip_churu', icon: '🐟', name: { ko: '츄르 한 봉지', en: 'A bag of cat treats' } },
  { id: 'tip_feast', icon: '🎂', name: { ko: '세 친구 잔칫상', en: 'A feast for all three' } }
];

export const DAILY_TAP_ACORNS = 15;   // 쓰다듬기·간식·소품으로 하루에 얻는 도토리 상한
export const LEVEL_STEP = 5;          // 교감 5번마다 친밀도 +1
export const LEVEL_UP_BONUS = 10;

export const PRIVACY_URL = 'https://graviton94.github.io/bgbb/privacy/';
export const CREDITS_URL = 'https://graviton94.github.io/bgbb/#credits';
