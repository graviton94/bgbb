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
export const face = (charId, expr = 'blank') => `assets/faces/${charId}_${expr}.webp`;

// 터지는 순간 표정: 냄 = 터짐, 진동 = 모른 척 휘파람, 참음 = 뻔뻔 (+ 선글라스), 잭팟 = 엄지척 (+ 선글라스), 연습 = 엥?
export const BURST_FACE = { loud: 'burst', soft: 'whistle', hold: 'shameless', jackpot: 'thumbs_up', practice: 'eng' };

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
export const HOME_LINES = {
  ko: ['언제 터지는지는 나도 모름.\n그게 포인트임.', '주머니 조심.', '지금은 조용함.\n지금은.', '회의 있으면 멈춤 눌러.', '낼지 참을지는\n폰 모드가 정함.'],
  en: ['When? No idea.\nThat’s the point.', 'Mind your pocket.', 'Quiet for now.\nFor now.', 'Meeting? Hit pause.', 'Your ringer decides\nloud or held.']
};

export const FREQUENCIES = {
  quiet: { name: { ko: '가끔', en: 'Rarely' }, range: [1, 2] },
  normal: { name: { ko: '보통', en: 'Normal' }, range: [3, 5] },
  thrill: { name: { ko: '자주', en: 'Often' }, range: [6, 9] }
};

// Google Play 응원하기 상품 (Play Console 에 같은 ID 로 '일회성 제품' 을 만든다)
export const TIPS = [
  { id: 'tip_seeds', name: { ko: '해바라기씨 한 줌', en: 'A handful of seeds' } },
  { id: 'tip_churu', name: { ko: '츄르 한 봉지', en: 'A bag of cat treats' } },
  { id: 'tip_feast', name: { ko: '세 친구 잔칫상', en: 'A feast for all three' } }
];

export const PRIVACY_URL = 'https://graviton94.github.io/bgbb/privacy/';
export const CREDITS_URL = 'https://graviton94.github.io/bgbb/#credits';
