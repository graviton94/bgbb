// 고정 게임 데이터. 화면·로직은 전부 여기서 읽어 간다.

export const CHARACTERS = [
  {
    id: 'hamster',
    name: '방구 햄찌',
    intro: '주머니 속 가스 담당. 해바라기씨만 먹으면 배가 꾸르륵.',
    food: { icon: '🌻', name: '해바라기씨' },
    styles: { main: '뿡!', soft: '삐용~ 피식', loud: '부르르르릉!' },
    tapLines: ['뿌우웅! 💨', '헤헤, 들켰나?', '배에서 꾸르륵...', '뽀옹~ 💨'],
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
    name: '솜뭉치 오목눈이',
    intro: '솜뭉치처럼 가벼운 수다쟁이. 갑자기 째액! 하고 운다.',
    food: { icon: '🌾', name: '좁쌀' },
    styles: { main: '쮸리릿 짹!', soft: '파닥파닥', loud: '째애액!' },
    tapLines: ['짹짹! 🎵', '쮸리릿?', '포로롱~', '파닥파닥 🪶'],
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
    name: '시크 뚱냥이',
    intro: '만사 귀찮은 냥님. 츄르 앞에서만 골골송을 부른다.',
    food: { icon: '🐟', name: '츄르' },
    styles: { main: '냐아옹~', soft: '그르릉 골골', loud: '캬아악!' },
    tapLines: ['...냥.', '귀찮다옹 🐾', '츄르 가져왔냥?', '냐아앙~'],
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

export const STYLE_NAMES = { main: '기본', soft: '소심', loud: '우렁찬', diy: '내 목소리' };

// 주머니 속 작전 결과. 폰이 소리/진동/무음일 때.
export const MODES = {
  loud: { name: '대담', icon: '💥', reward: 3, color: '#E8590C', line: '대담하게 발사! 💥' },
  soft: { name: '소심', icon: '🫧', reward: 3, color: '#4C6EF5', line: '소심하게 피식... 🫧' },
  hold: { name: '꾹참', icon: '🤫', reward: 5, color: '#0CA678', line: '윽! 꾹 참았다 🤫' }
};

export const FREQUENCIES = {
  quiet: { name: '인내', range: [1, 2] },
  normal: { name: '은밀', range: [3, 5] },
  thrill: { name: '쫄깃', range: [6, 9] }
};

// 아지트 소품. x 는 가로 위치(0~1), depth 는 0=맨 앞 ~ 1=지평선.
export const PROPS = [
  { id: 'tent',      name: '꼬마텐트', x: 0.13, depth: 0.78, h: 0.2,  pet: 'hamster', style: 'soft', line: '텐트 속 비밀 작전 회의! ⛺' },
  { id: 'tree',      name: '큰나무',   x: 0.86, depth: 0.95, h: 0.36, pet: 'tit',     style: 'loud', line: '나무 꼭대기에서 노래해요 🌳', price: 60 },
  { id: 'sunflower', name: '해바라기', x: 0.32, depth: 0.7,  h: 0.2,  pet: 'tit',     style: 'main', line: '해바라기씨 콕콕! 🌻' },
  { id: 'balloon',   name: '방구풍선', x: 0.7,  depth: 0.82, h: 0.19, pet: 'hamster', style: 'soft', line: '풍선이 부풀어 오른다 뽀옹~ 🎈' },
  { id: 'bench',     name: '통나무',   x: 0.52, depth: 0.5,  h: 0.1,  pet: 'tit',     style: 'main', line: '통나무에서 포로롱 휴식 🪵' },
  { id: 'box',       name: '냥이상자', x: 0.82, depth: 0.42, h: 0.13, pet: 'cat',     style: 'soft', line: '역시 좁은 상자가 최고다옹 📦' },
  { id: 'mat',       name: '돗자리',   x: 0.3,  depth: 0.3,  h: 0.1,  pet: 'cat',     style: 'soft', line: '돗자리 위에서 데구르르~ 🌸', price: 30 },
  { id: 'campfire',  name: '모닥불',   x: 0.5,  depth: 0.12, h: 0.15, pet: 'hamster', style: 'loud', line: '군고구마 먹고 배가 꾸르륵 🔥' },
  { id: 'carrot',    name: '당근밭',   x: 0.08, depth: 0.18, h: 0.15, pet: 'hamster', style: 'main', line: '당근 뽑다가 뿡! 🥕' },
  { id: 'churu',     name: '황금츄르', x: 0.68, depth: 0.08, h: 0.1,  pet: 'cat',     style: 'main', line: '츄르 핥짝핥짝 갸르릉~ 🐟' }
];

export const propById = id => PROPS.find(p => p.id === id);

export const THEMES = {
  meadow: { name: '낮 · 초원',   icon: '☀️' },
  sunset: { name: '저녁 · 노을', icon: '🌇' },
  night:  { name: '밤 · 별빛',   icon: '🌙' },
  room:   { name: '미니룸',      icon: '🏠' },
  city:   { name: '네온 도시',   icon: '🏙️', unlockHolds: 15 }
};

export const timeTheme = (hour = new Date().getHours()) =>
  hour >= 6 && hour < 17 ? 'meadow' : hour >= 17 && hour < 20 ? 'sunset' : 'night';

// 비밀 보물: 진짜 기록으로만 열린다. s = store.stats()
export const TREASURES = [
  { id: 'acorn',        name: '황금 도토리',   cond: '친구에게 처음 간식 주기',
    lore: '햄찌가 주머니 깊숙한 곳에서 발견한 황금빛 도토리.', test: s => s.fed },
  { id: 'sweet_potato', name: '노릇 군고구마', cond: '불시 작전 누적 5회',
    lore: '방구 생성률 300%. 주머니가 들썩거린다.', test: s => s.total.all >= 5 },
  { id: 'whoopee',      name: '방구 방석',     cond: '소리 모드에서 대담 5회',
    lore: '앉는 순간 뽀오옹~ 회의실 분위기 브레이커.', test: s => s.total.loud >= 5 },
  { id: 'spray',        name: '피치 탈취제',   cond: '진동 모드에서 소심 5회',
    lore: '몰래 뿡! 직후 슉슉. 비밀 요원의 에티켓.', test: s => s.total.soft >= 5 },
  { id: 'trophy',       name: '참음왕 트로피', cond: '무음 모드에서 누적 꾹참 10회',
    lore: '조용한 회의실에서 끝까지 참아낸 자의 영예.', test: s => s.total.hold >= 10 },
  { id: 'stamp',        name: '참 잘했어요',   cond: '하루에 꾹참 5회',
    lore: '하루 종일 우아하게 참아낸 평정심 마스터의 도장.', test: s => s.bestHoldDay >= 5 },
  { id: 'key',          name: '비밀 열쇠',     cond: '그림일기 3번 저장',
    lore: '친구들의 흑역사가 적힌 다이어리의 하트 열쇠.', test: s => s.diarySaves >= 3 },
  { id: 'mat',          name: '벚꽃 돗자리',   cond: '아지트에 돗자리 들이기',
    lore: '깔아두면 친구들이 옹기종기 모여 낮잠을 잔다.', test: s => s.owned.includes('mat') },
  { id: 'tree',         name: '크레용 수호목', cond: '아지트에 큰나무 들이기',
    lore: '오목눈이가 꼭대기에 둥지를 튼 든든한 나무.', test: s => s.owned.includes('tree') }
];

export const WEATHERS = ['💨 뿡뿡', '☀️ 맑음', '🌩️ 꾸르륵', '🌈 평화'];

export const DAILY_TAP_ACORNS = 15;   // 쓰다듬기·간식·소품으로 하루에 얻는 도토리 상한
export const LEVEL_STEP = 5;          // 교감 5번마다 친밀도 +1
export const LEVEL_UP_BONUS = 10;
