// 고정 게임 데이터. 글은 { ko, en } 로 두고 i18n.L() 로 고른다.

export const CHARACTERS = [
  {
    id: 'hamster',
    name: { ko: '방구 햄찌', en: 'Toot Hamster' },
    nick: { ko: '햄찌', en: 'Hammy' },
    styles: {
      main: { ko: '뿡', en: 'Toot' },
      soft: { ko: '삐용', en: 'Pfft' },
      loud: { ko: '부르르릉', en: 'BRRAAP' }
    },
    bubbles: {
      ko: ['ㅇㅇ 참는 중', '근데 곧 나옴', '배에서 소리 남', '지금 아님. 아마도.'],
      en: ['holding it. yes.', 'but it’s coming', 'tummy noises', 'not now. probably.']
    },
  },
  {
    id: 'tit',
    name: { ko: '솜뭉치 오목눈이', en: 'Cotton Chickadee' },
    nick: { ko: '오목이', en: 'Birdie' },
    styles: {
      main: { ko: '짹', en: 'Tweet' },
      soft: { ko: '파닥', en: 'Flap' },
      loud: { ko: '째애액', en: 'SKREE' }
    },
    bubbles: {
      ko: ['짹. 아님 뿡.', '날아갈 준비 됨', '곧 노래함 (뿡)', '아무 일 없음'],
      en: ['tweet. or toot.', 'ready to fly', 'about to sing (toot)', 'nothing to see']
    },
  },
  {
    id: 'cat',
    name: { ko: '시크 뚱냥이', en: 'Chubby Cat' },
    nick: { ko: '냥이', en: 'Kitty' },
    styles: {
      main: { ko: '냐옹', en: 'Meow' },
      soft: { ko: '골골', en: 'Purr' },
      loud: { ko: '캬악', en: 'HISS' }
    },
    bubbles: {
      ko: ['건들지 마', '참는 중. 말 걸지 마.', '귀찮음', '…'],
      en: ['don’t.', 'holding it. go away.', 'can’t be bothered', '…']
    },
  }
];

export const charById = id => CHARACTERS.find(c => c.id === id);

// 원화 표정 7종 (tools/prepare_faces.py). 셋 다 같은 눈 자리라 선글라스를 그대로 겹친다.
export const EXPRESSIONS = ['blank', 'eng', 'shameless', 'hold', 'burst', 'whistle', 'thumbs_up'];
// real = 실사 사진 (레어 이상 칭호 특전 짤 전용, 눈 좌표는 원화와 같다)
export const face = (charId, expr = 'blank', real = false) => `assets/${real ? 'faces_real' : 'faces'}/${charId}_${expr}.webp`;

// 터지는 순간 표정: 냄 = 터짐, 진동 = 모른 척 휘파람, 참음 = 뻔뻔 (+ 선글라스), 잭팟 = 엄지척 (+ 선글라스), 연습 = 엥?
export const BURST_FACE = { loud: 'burst', soft: 'whistle', hold: 'shameless', jackpot: 'thumbs_up', practice: 'eng' };

// 소리 종류는 유저가 고르지 않는다: 터질 때마다 랜덤 (기본 55% · 소심 30% · 우렁찬 15%, 햄찌 레어 방구는 따로 2%).
// 내 목소리를 섞어 둔 친구는 25% 확률로 내 목소리. PrankPlayer.java 와 같은 값.
export const STYLE_WEIGHTS = { main: 0.55, soft: 0.3, loud: 0.15 };
export const DIY_CHANCE = 0.25;
export function pickStyle(diy = false, random = Math.random) {
  if (diy && random() < DIY_CHANCE) return 'diy';
  let r = random();
  for (const [s, w] of Object.entries(STYLE_WEIGHTS)) { if ((r -= w) < 0) return s; }
  return 'main';
}

export const STYLE_NAMES = {
  main: { ko: '기본', en: 'Normal' },
  soft: { ko: '소심', en: 'Shy' },
  loud: { ko: '우렁찬', en: 'Loud' },
  diy: { ko: '내 목소리', en: 'My voice' }
};

// 그 순간 폰 상태가 정하는 결과. 터지는 화면·속보 카드의 바탕색과 말.
export const MODES = {
  loud: {
    name: { ko: '냄', en: 'Out loud' }, color: '#D7FF3D',
    word: { ko: '뿡', en: 'TOOT' },
    captions: { ko: ['ㄹㅇ 크게 남', '방금 그거 뭐임', '다 들었음', '숨을 곳 없음'], en: ['that was LOUD', 'what was that', 'everyone heard', 'nowhere to hide'] },
    headlines: {
      ko: ['{nick}, 끝내 참지 못해', '{nick}, 공공장소서 기습 발사', '{nick}발 굉음… 현장 술렁'],
      en: ['{nick} finally lets one go', '{nick} fires in public', 'Loud blast from {nick}, crowd stunned']
    }
  },
  soft: {
    name: { ko: '진동', en: 'Buzz' }, color: '#5BE3FF',
    word: { ko: '부르르', en: 'bzzt' },
    captions: { ko: ['아무도 모름', '살짝만', '주머니만 앎', '증거 없음'], en: ['nobody knows', 'just a little', 'only the pocket knows', 'no evidence'] },
    headlines: {
      ko: ['{nick}, 진동으로 몰래… 아무도 몰라', '{nick}의 소심한 한 방, 목격자 없어'],
      en: ['{nick} buzzes quietly, nobody noticed', '{nick}’s shy one leaves no witnesses']
    }
  },
  hold: {
    name: { ko: '참음', en: 'Held' }, color: '#FFB3D9',
    word: { ko: '꾹', en: 'held' },
    captions: { ko: ['무음이라 살았다', '참는 중', '곧 터짐', '얼굴 빨개짐'], en: ['saved by silent mode', 'holding it', 'about to blow', 'face going red'] },
    headlines: {
      ko: ['{nick}, 무음 모드에 막혀 끝내 참아', '{nick}, 오늘도 참았다… 한계 임박'],
      en: ['{nick} blocked by silent mode, holds it in', '{nick} holds it again, limit near']
    }
  }
};

// 홈 화면 한 줄 (무표정)
// 홈 말풍선 난장판에 섞이는 아무 말 (친구 말버릇과 같이)
export const CHATTER = {
  ko: ['ㅋ', '뿡?', '방금 그거 나 아님', '냄새 확인 중', '쉿', '누구야', 'ㄹㅇ', '...', '!!', '배고픔', '괄약근 출근함', '곧 터짐 ㄱㄷ',
    '여기 아무도 없음', '진동 아님', '회의 언제 끝남', '참는 중 (3시간째)', '뿌직', '아무 일도 없었다', '증거 불충분', 'ㅇㅇ', '?', '방구 장전 완료', '데단해', '채고야', 'GRAET', '멋저요'],
  en: ['lol', 'toot?', "wasn't me", 'smell check', 'shh', 'who did it', 'fr', '...', '!!', 'hungry', 'clench mode on', 'any minute now',
    'nobody here', 'not a buzz', 'when does this meeting end', 'holding (3h)', 'oops', 'nothing happened', 'no evidence', 'k', '?', 'toot loaded', 'AWASOME', 'GRAET', 'EXCELENT']
};

// 일부러 틀린 칭찬 (구린 PPT · 썸네일 감성). 짤 · 획득 팝업 · 홈 말풍선에서 섞어 쓴다. \n = 이상한 데서 줄바꿈
export const GOOFS = {
  ko: ['데단해', '채고야', 'AWASOME', '정말굉\n장한걸?', '당신을 천제입니까?', 'GRAET',
    '멋저요', '훌룡해', '굉장햇', '레전드 갱신하셧습니다', 'EXCELENT', 'CONGRATURATION', '당신은 방구의\n신 입니까?', '최고의 방\n구군요', 'WONDREFUL'],
  en: ['AWASOME', 'GRAET', 'EXCELENT', 'CONGRATURATION', 'WONDREFUL', 'so amazeing', 'Are you\ngenious?', 'U R the\nbest toot', 'Very good\nof you', 'SUPERB!!1']
};
/** 한 줄로 짧은 것만 (말풍선 · 도장용) */
export const shortGoofs = list => list.filter(s => !s.includes('\n') && [...s].length <= 8);

export const HOME_LINES = {
  ko: ['언제 터지는지는 나도 모름.\n그게 포인트임.', '주머니 조심.', '지금은 조용함.\n지금은.', '회의 있으면 멈춤 눌러.', '낼지 참을지는\n폰 모드가 정함.'],
  en: ['When? No idea.\nThat’s the point.', 'Mind your pocket.', 'Quiet for now.\nFor now.', 'Meeting? Hit pause.', 'Your ringer decides\nloud or held.']
};

// 진동 모드일 때 소리 대신 진동 (친구 · 소리 종류마다 세기와 길이가 다르다). t = 켜짐/꺼짐 ms 번갈아, a = 켜짐마다 세기 1~255.
// PrankPlayer.java 의 VIBES 와 같은 값.
export const VIBES = {
  hamster: {   // 퉁퉁한 한 방
    soft: { t: [60, 40, 80], a: [90, 120] },
    main: { t: [120, 60, 220], a: [160, 200] },
    loud: { t: [180, 40, 160, 40, 420], a: [200, 230, 255] },
    epic: { t: [100, 30, 100, 30, 100, 30, 700], a: [255, 255, 255, 255] }
  },
  tit: {       // 파닥파닥 잔진동
    soft: { t: [40, 40, 40, 40, 40], a: [80, 80, 80] },
    main: { t: [50, 40, 50, 40, 50, 40, 120], a: [140, 140, 140, 170] },
    loud: { t: [60, 30, 60, 30, 60, 30, 60, 30, 300], a: [220, 220, 220, 220, 255] }
  },
  cat: {       // 느긋하게 길게
    soft: { t: [300], a: [70] },
    main: { t: [200, 80, 400], a: [110, 150] },
    loud: { t: [250, 60, 700], a: [200, 255] }
  },
  diy: { t: [150, 60, 300], a: [150, 220] }
};
export const vibeFor = (charId, style) => (style === 'diy' ? VIBES.diy : VIBES[charId]?.[style] || VIBES[charId]?.main || VIBES.diy);

export const FREQUENCIES = {
  quiet: { name: { ko: '가끔', en: 'Rarely' }, range: [3, 4] },
  normal: { name: { ko: '보통', en: 'Normal' }, range: [5, 7] },
  thrill: { name: { ko: '자주', en: 'Often' }, range: [8, 10] }
};

// Google Play 응원하기 상품 (Play Console 에 같은 ID 로 '일회성 제품' 을 만든다)
export const TIPS = [
  { id: 'tip_seeds', name: { ko: '해바라기씨 한 줌', en: 'A handful of seeds' } },
  { id: 'tip_churu', name: { ko: '츄르 한 봉지', en: 'A bag of cat treats' } },
  { id: 'tip_feast', name: { ko: '세 친구 잔칫상', en: 'A feast for all three' } }
];

// 뿡코인 충전 (Play Console 에 같은 ID 로 '일회성 제품' 을 만든다, 소모성). 가격 · 이름은 Play 가 보여 준 그대로
export const COIN_PACKS = [
  { id: 'coins_s', coins: 150 },
  { id: 'coins_m', coins: 500 },
  { id: 'coins_l', coins: 1500 }
];
// 보상형 광고: '짤 뽑기' 3번을 다 쓴 뒤 광고를 끝까지 보면 +3, 하루 2번까지
export const AD_BONUS = 3, AD_PER_DAY = 2;

