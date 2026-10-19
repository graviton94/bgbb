/**
 * 방구뿡 (Bang-gu Bboong) - 다마고치 아지트 & 크레용 엔진 (V3.5)
 * - 2.5D 깊이감 자율 이동 & 다마고치 생활 AI (햄찌, 오목눈이, 뚱냥이)
 * - 투명 스프라이트 & 미니홈피 아지트 (초원, 노을, 밤하늘, 미니룸, 도시)
 * - 캐릭터 클릭 시 개별 다마고치 모달 (소리 ON/OFF, 소리팩 선택, 간식, 쓰다듬기)
 * - 미니홈피 10종 소품 배치 & 업적 보상 시스템
 * - Web Audio API 절차적 코믹 사운드 합성
 * - 온디바이스 9:16 인스타 스토리 캔버스 렌더러
 */

// ==========================================
// 1. 상태 관리 (State)
// ==========================================
const state = {
  activeCharIndex: 0,
  characters: [
    {
      id: 'hamster',
      name: '방구 햄찌',
      desc: '소리: 뽀옹, 삐용, 뿡!',
      img: 'assets/hamster.png',
      soundType: 'fart',
      speech: '오늘도 주머니에서 몰래 뿡! 💨',
      badge: '절친 레벨 3 💖',
      feedIcon: '🌻',
      feedLabel: '해바라기씨 주기',
      soundEnabled: true,
      selectedSound: 'main',
      soundOptions: [
        { id: 'main', label: '기본 뿡 💨' },
        { id: 'soft', label: '소심 삐용 🫧' },
        { id: 'loud', label: '우렁찬 뿡 💥' }
      ],
      count: 2
    },
    {
      id: 'tit',
      name: '솜뭉치 오목눈이',
      desc: '소리: 짹!, 뾰로롱, 파닥',
      img: 'assets/tit.png',
      soundType: 'bird',
      speech: '짹짹! 솜뭉치처럼 가볍게 날아요 🐤',
      badge: '친밀 레벨 2 ✨',
      feedIcon: '🌾',
      feedLabel: '좁쌀 먹이기',
      soundEnabled: true,
      selectedSound: 'main',
      soundOptions: [
        { id: 'main', label: '포로롱 짹 🐤' },
        { id: 'soft', label: '깃털 파닥 🪶' },
        { id: 'loud', label: '비명 짹! 🔊' }
      ],
      count: 1
    },
    {
      id: 'cat',
      name: '시크 뚱냥이',
      desc: '소리: 냐옹, 캬악, 갸릉',
      img: 'assets/cat.png',
      soundType: 'cat',
      speech: '만사 귀찮다옹... 불시에 야옹! 🐱',
      badge: '도도한 냥님 👑',
      feedIcon: '🐟',
      feedLabel: '츄르 먹이기',
      soundEnabled: true,
      selectedSound: 'main',
      soundOptions: [
        { id: 'main', label: '시크 냐옹 🐱' },
        { id: 'soft', label: '골골송 💤' },
        { id: 'loud', label: '하악질 💢' }
      ],
      count: 3
    }
  ],
  currentTheme: 'meadow', // 'meadow' | 'sunset' | 'night' | 'room' | 'city'
  operationOn: true,
  emergencyEscape: false,
  mannerMode: 'sound', // 'sound' | 'vibrate' | 'silent'
  frequency: 'normal',
  timeWindow: '09:00 ~ 18:00',
  acorns: 185,
  unlockedAchievements: 6,
  counts: {
    loud: 2,
    soft: 3,
    hold: 4
  },
  cachedImages: {}
};

// ==========================================
// 2. Web Audio API 사운드 합성 엔진
// ==========================================
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// 햄찌 방구 사운드 (스타일: main, soft, loud)
function synthFart(style = 'main', volume = 0.6) {
  if (volume <= 0) return;
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  if (style === 'soft') {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.25);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume * 0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
    return;
  }

  const duration = (style === 'loud') ? 0.65 : 0.45;
  const startFreq = (style === 'loud') ? 110 : 140;
  const endFreq = (style === 'loud') ? 35 : 45;

  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(startFreq, now);
  osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

  const lfo = ctx.createOscillator();
  lfo.frequency.setValueAtTime((style === 'loud') ? 28 : 35, now);
  lfo.frequency.linearRampToValueAtTime(14, now + duration);
  
  const lfoGain = ctx.createGain();
  lfoGain.gain.setValueAtTime((style === 'loud') ? 70 : 50, now);
  lfoGain.gain.linearRampToValueAtTime(15, now + duration);
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime((style === 'loud') ? 1100 : 800, now);
  filter.frequency.exponentialRampToValueAtTime(160, now + duration);

  const masterGain = ctx.createGain();
  const finalVol = (style === 'loud') ? volume * 1.2 : volume;
  masterGain.gain.setValueAtTime(finalVol, now);
  masterGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

  osc.connect(filter);
  filter.connect(masterGain);
  masterGain.connect(ctx.destination);

  lfo.start(now);
  osc.start(now);
  lfo.stop(now + duration);
  osc.stop(now + duration);
}

// 오목눈이 사운드 (스타일: main, soft, loud)
function synthBird(style = 'main', volume = 0.6) {
  if (volume <= 0) return;
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  if (style === 'soft') {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.12);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume * 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
    return;
  }

  const duration = (style === 'loud') ? 0.28 : 0.18;
  const osc = ctx.createOscillator();
  osc.type = (style === 'loud') ? 'triangle' : 'sine';
  osc.frequency.setValueAtTime(2200, now);
  osc.frequency.exponentialRampToValueAtTime((style === 'loud') ? 4200 : 3600, now + 0.08);
  osc.frequency.exponentialRampToValueAtTime(1900, now + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume * 0.7, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration);
}

// 고양이 사운드 (스타일: main, soft, loud)
function synthCat(style = 'main', volume = 0.6) {
  if (volume <= 0) return;
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  if (style === 'soft') {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(65, now);
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(24, now);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(20, now);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume * 0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);
    lfo.start(now);
    osc.start(now);
    lfo.stop(now + 0.5);
    osc.stop(now + 0.5);
    return;
  }

  const duration = (style === 'loud') ? 0.48 : 0.38;
  const osc = ctx.createOscillator();
  osc.type = (style === 'loud') ? 'sawtooth' : 'triangle';
  osc.frequency.setValueAtTime(380, now);
  osc.frequency.linearRampToValueAtTime((style === 'loud') ? 780 : 620, now + 0.15);
  osc.frequency.exponentialRampToValueAtTime(280, now + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume * 0.75, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration);
}

function synthPop(volume = 0.4) {
  if (volume <= 0) return;
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const duration = 0.08;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(250, now);
  osc.frequency.exponentialRampToValueAtTime(950, now + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration);
}

// ==========================================
// 3. UI 및 다마고치 자율 이동 엔진 (Tamagotchi Engine)
// ==========================================
let dom = {};

document.addEventListener('DOMContentLoaded', () => {
  initDOM();
  initTabs();
  initTamagotchiWorld();
  initMascotModal();
  initDecorModal();
  initSettingsModal();
  initEmergencyDock();
  initDIYRecorder();
  initCollectiblesModal();
  preloadImages();
  renderStoryCanvas();
});

function initDOM() {
  dom = {
    tamagotchiWorld: document.getElementById('tamagotchiWorld'),
    petHamster: document.getElementById('petHamster'),
    petTit: document.getElementById('petTit'),
    petCat: document.getElementById('petCat'),
    bubbleHamster: document.getElementById('bubbleHamster'),
    bubbleTit: document.getElementById('bubbleTit'),
    bubbleCat: document.getElementById('bubbleCat'),
    worldThemeBadge: document.getElementById('worldThemeBadge'),
    skySun: document.getElementById('skySun'),
    btnOpenDecor: document.getElementById('btnOpenDecor'),
    btnOpenSettings: document.getElementById('btnOpenSettings'),
    mascotModalOverlay: document.getElementById('mascotModalOverlay'),
    btnCloseMascotModal: document.getElementById('btnCloseMascotModal'),
    modalAvatarFrame: document.getElementById('modalAvatarFrame'),
    modalCharBadge: document.getElementById('modalCharBadge'),
    modalMascotImg: document.getElementById('modalMascotImg'),
    modalMascotName: document.getElementById('modalMascotName'),
    modalMascotDesc: document.getElementById('modalMascotDesc'),
    modalSoundToggle: document.getElementById('modalSoundToggle'),
    soundVariationChips: document.getElementById('soundVariationChips'),
    btnFeedMascot: document.getElementById('btnFeedMascot'),
    modalFeedIcon: document.getElementById('modalFeedIcon'),
    modalFeedLabel: document.getElementById('modalFeedLabel'),
    btnPetMascot: document.getElementById('btnPetMascot'),
    btnTestSoundMascot: document.getElementById('btnTestSoundMascot'),
    modalStatCount: document.getElementById('modalStatCount'),
    modalHompySpeech: document.getElementById('modalHompySpeech'),
    decorSheetOverlay: document.getElementById('decorSheetOverlay'),
    btnCloseDecorSheet: document.getElementById('btnCloseDecorSheet'),
    userAcorns: document.getElementById('userAcorns'),
    userAchievements: document.getElementById('userAchievements'),
    settingsSheetOverlay: document.getElementById('settingsSheetOverlay'),
    btnCloseSettingsSheet: document.getElementById('btnCloseSettingsSheet'),
    operationToggle: document.getElementById('operationToggle'),
    statusDot: document.getElementById('statusDot'),
    stealthText: document.getElementById('stealthText'),
    btnEmergency: document.getElementById('btnEmergency'),
    emergencyText: document.getElementById('emergencyText'),
    btnSimulateTrigger: document.getElementById('btnSimulateTrigger'),
    countLoud: document.getElementById('countLoud'),
    countSoft: document.getElementById('countSoft'),
    countHold: document.getElementById('countHold'),
    storyCanvas: document.getElementById('storyCanvas'),
    btnShareStory: document.getElementById('btnShareStory'),
    btnRedrawCanvas: document.getElementById('btnRedrawCanvas'),
    btnRecord: document.getElementById('btnRecord'),
    recText: document.getElementById('recText'),
    recordedPreview: document.getElementById('recordedPreview'),
    btnPlayRecorded: document.getElementById('btnPlayRecorded'),
    collectibleModalOverlay: document.getElementById('collectibleModalOverlay'),
    collectibleDetailCard: document.getElementById('collectibleDetailCard'),
    btnCloseCollectibleModal: document.getElementById('btnCloseCollectibleModal'),
    collectibleModalImg: document.getElementById('collectibleModalImg'),
    collectibleModalRarity: document.getElementById('collectibleModalRarity'),
    collectibleModalTitle: document.getElementById('collectibleModalTitle'),
    collectibleModalLore: document.getElementById('collectibleModalLore'),
    collectibleModalCond: document.getElementById('collectibleModalCond'),
    btnConfirmCollectible: document.getElementById('btnConfirmCollectible'),
    subTabs: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content')
  };
}

// 탭 네비게이션
function initTabs() {
  dom.subTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      dom.subTabs.forEach(b => b.classList.remove('active'));
      dom.tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const targetContent = document.getElementById(targetId);
      if (targetContent) targetContent.classList.add('active');
      if (targetId === 'tab-diary') renderStoryCanvas();
      synthPop(0.2);
    });
  });
}

// 다마고치 3총사 객체 정의 (프레임 애니메이션 및 반응형 인터랙션)
const petActors = [
  {
    id: 'hamster',
    dom: null,
    bubble: null,
    spriteImg: null,
    x: 50,
    y: 110,
    vx: 0.65,
    targetX: 90,
    targetY: 120,
    facingRight: true,
    state: 'walk', // 'walk' | 'idle' | 'react' | 'sleep'
    animFrame: 'base',
    idleTimer: 60,
    reactTimer: 0,
    walkStep: 0,
    waddleOffset: 0,
    sprites: {
      base: 'assets/hamster.png',
      walk: 'assets/sprites/hamster_walk.png',
      react: 'assets/sprites/hamster_jump.png',
      sleep: 'assets/sprites/hamster_sleep.png'
    }
  },
  {
    id: 'tit',
    dom: null,
    bubble: null,
    spriteImg: null,
    x: 165,
    y: 185,
    vx: 0.85,
    targetX: 180,
    targetY: 180,
    facingRight: true,
    state: 'hop',
    animFrame: 'base',
    idleTimer: 80,
    reactTimer: 0,
    walkStep: 0,
    waddleOffset: 0,
    sprites: {
      base: 'assets/tit.png',
      walk: 'assets/sprites/tit_hop.png',
      fly: 'assets/sprites/tit_fly.png',
      react: 'assets/sprites/tit_sing.png',
      sleep: 'assets/tit.png'
    }
  },
  {
    id: 'cat',
    dom: null,
    bubble: null,
    spriteImg: null,
    x: 265,
    y: 80,
    vx: 0.4,
    targetX: 250,
    targetY: 85,
    facingRight: false,
    state: 'idle',
    animFrame: 'base',
    idleTimer: 100,
    reactTimer: 0,
    walkStep: 0,
    waddleOffset: 0,
    sprites: {
      base: 'assets/cat.png',
      walk: 'assets/sprites/cat_walk.png',
      react: 'assets/sprites/cat_play.png',
      sleep: 'assets/sprites/cat_sit.png'
    }
  }
];

function initTamagotchiWorld() {
  petActors[0].dom = dom.petHamster;
  petActors[0].bubble = dom.bubbleHamster;
  petActors[0].spriteImg = dom.petHamster.querySelector('.pet-sprite');

  petActors[1].dom = dom.petTit;
  petActors[1].bubble = dom.bubbleTit;
  petActors[1].spriteImg = dom.petTit.querySelector('.pet-sprite');

  petActors[2].dom = dom.petCat;
  petActors[2].bubble = dom.bubbleCat;
  petActors[2].spriteImg = dom.petCat.querySelector('.pet-sprite');

  // 각 캐릭터 클릭 시 반응형 터치 인터랙션 & 다마고치 모달 오픈
  petActors.forEach((pet, index) => {
    pet.dom.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerPetReaction(pet);
      openMascotModal(index);
    });
  });

  // 다마고치 2.5D 자율 이동 & 프레임 애니메이션 루프 시작
  startTamagotchiLoop();
}

function triggerPetReaction(pet, customText = null) {
  pet.state = 'react';
  pet.reactTimer = 110; // 약 1.8초간 반응 모션 유지
  if (pet.spriteImg) pet.spriteImg.src = pet.sprites.react;

  triggerPetJump(pet);

  if (pet.id === 'hamster') {
    showPetBubble(pet, customText || '뿌우웅! 💨💖', 2200);
  } else if (pet.id === 'tit') {
    showPetBubble(pet, customText || '짹짹! 🎵💖', 2200);
  } else if (pet.id === 'cat') {
    showPetBubble(pet, customText || '냐아앙~ 🐾💖', 2200);
  }
}

function startTamagotchiLoop() {
  function update() {
    if (!state.emergencyEscape) {
      const worldW = dom.tamagotchiWorld ? dom.tamagotchiWorld.clientWidth : 360;
      const minX = 20;
      const maxX = Math.max(minX + 80, worldW - 90);
      const minY = 76;  // 하단 HUD 위로 쾌적하게 안전 거리 확보
      const maxY = 180; // 지평선 잔디밭 안쪽 깊이까지 산책

      petActors.forEach((pet, idx) => {
        // 1. 터치 반응 상태 카운트다운
        if (pet.reactTimer > 0) {
          pet.reactTimer--;
          if (pet.spriteImg && !pet.spriteImg.src.includes(pet.sprites.react)) {
            pet.spriteImg.src = pet.sprites.react;
          }
          pet.waddleOffset = Math.sin(Date.now() / 90) * 6;

          if (pet.reactTimer === 0) {
            pet.state = 'idle';
            if (pet.spriteImg) pet.spriteImg.src = pet.sprites.base;
          }
        } else {
          // 2. 평상시 자율 AI 결정
          pet.idleTimer--;

          if (pet.idleTimer <= 0) {
            pet.idleTimer = 90 + Math.floor(Math.random() * 140);
            const rand = Math.random();

            if (rand < 0.62) {
              pet.state = 'walk';
              if (pet.id === 'hamster') {
                pet.targetX = minX + Math.random() * (worldW * 0.48 - minX);
              } else if (pet.id === 'tit') {
                pet.targetX = worldW * 0.22 + Math.random() * (worldW * 0.52);
              } else {
                pet.targetX = worldW * 0.45 + Math.random() * (maxX - worldW * 0.45);
              }
              pet.targetY = minY + Math.random() * (maxY - minY);
              pet.facingRight = pet.targetX > pet.x;
            } else if (rand < 0.82) {
              pet.state = 'idle';
              if (pet.spriteImg) pet.spriteImg.src = pet.sprites.base;
            } else {
              // 특수 행동 (수면 / 비행 / 방구)
              if (pet.id === 'hamster') {
                pet.state = 'react';
                pet.reactTimer = 90;
                showPetBubble(pet, '뽀옹! 💨', 2000);
                synthFart('soft', 0.3);
              } else if (pet.id === 'tit') {
                pet.state = 'fly';
                showPetBubble(pet, '파닥파닥 🐤', 2200);
              } else if (pet.id === 'cat') {
                pet.state = 'sleep';
                if (pet.spriteImg) pet.spriteImg.src = pet.sprites.sleep;
                showPetBubble(pet, 'zzz... 💤', 2500);
              }
            }
          }

          // 이동 및 프레임 스위칭
          if (pet.state === 'walk') {
            const dx = pet.targetX - pet.x;
            const dy = pet.targetY - pet.y;
            const dist = Math.hypot(dx, dy);

            if (dist > 3) {
              pet.x += (dx / dist) * pet.vx;
              pet.y += (dy / dist) * (pet.vx * 0.55);
              pet.walkStep = (pet.walkStep + 1) % 36;
              const stepFrame = pet.walkStep < 18 ? pet.sprites.walk : pet.sprites.base;
              if (pet.spriteImg && !pet.spriteImg.src.includes(stepFrame)) {
                pet.spriteImg.src = stepFrame;
              }
              pet.waddleOffset = Math.abs(Math.sin(Date.now() / 130)) * 6;
            } else {
              pet.state = 'idle';
              pet.waddleOffset = 0;
              if (pet.spriteImg) pet.spriteImg.src = pet.sprites.base;
            }
          } else if (pet.state === 'fly' && pet.id === 'tit') {
            pet.waddleOffset = 45 + Math.sin(Date.now() / 180) * 16;
            pet.x += (pet.facingRight ? 1 : -1) * 0.8;
            if (pet.spriteImg && !pet.spriteImg.src.includes(pet.sprites.fly)) {
              pet.spriteImg.src = pet.sprites.fly;
            }
            if (pet.x > maxX) pet.facingRight = false;
            if (pet.x < minX) pet.facingRight = true;
          } else if (pet.state === 'sleep') {
            pet.waddleOffset = 0;
            if (pet.spriteImg && !pet.spriteImg.src.includes(pet.sprites.sleep)) {
              pet.spriteImg.src = pet.sprites.sleep;
            }
          } else {
            pet.waddleOffset = 0;
            if (pet.spriteImg && !pet.spriteImg.src.includes(pet.sprites.base)) {
              pet.spriteImg.src = pet.sprites.base;
            }
          }
        }

        // 다른 캐릭터와의 부드러운 거리 유지
        petActors.forEach((other, oIdx) => {
          if (idx !== oIdx) {
            const dist = Math.hypot(other.x - pet.x, other.y - pet.y);
            if (dist < 65) {
              pet.x += (pet.x > other.x ? 0.35 : -0.35);
            }
          }
        });

        // 경계 제한
        pet.x = Math.max(minX, Math.min(maxX, pet.x));
        pet.y = Math.max(minY, Math.min(maxY, pet.y));

        // 2.5D 깊이감 계산 (뒤로 갈수록 0.78배, 앞으로 올수록 1.10배)
        const depthNorm = Math.min(1, Math.max(0, 1 - (pet.y - minY) / (maxY - minY)));
        const depthScale = 0.78 + depthNorm * 0.32;
        const finalY = pet.y + (pet.waddleOffset || 0);

        // 뒤뚱뒤뚱 회전 각도 (waddle tilt)
        let tiltDeg = 0;
        if (pet.state === 'walk') {
          tiltDeg = Math.sin(Date.now() / 140) * 7;
        } else if (pet.state === 'react') {
          tiltDeg = Math.sin(Date.now() / 80) * 10;
        }

        // 렌더링 반영
        const scaleX = (pet.facingRight ? 1 : -1) * depthScale;
        const scaleY = depthScale;

        pet.dom.style.left = `${Math.round(pet.x)}px`;
        pet.dom.style.bottom = `${Math.round(finalY)}px`;
        // 2.5D 깊이감 z-index (카메라에 가까울수록 최대 135, 멀수록 72 / 전경 소품 140~145 아래, 배경 소품 4~8 위)
        pet.dom.style.zIndex = Math.floor(180 - pet.y * 0.6);
        if (pet.spriteImg) {
          pet.spriteImg.style.transform = `scale(${scaleX}, ${scaleY}) rotate(${tiltDeg}deg)`;
        }
      });
    }

    requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

function showPetBubble(pet, text, duration = 2000) {
  pet.bubble.textContent = text;
  pet.bubble.classList.add('show');
  setTimeout(() => {
    pet.bubble.classList.remove('show');
  }, duration);
}

// ==========================================
// 4. 개별 캐릭터 다마고치 모달 (Mascot Modal)
// ==========================================
function openMascotModal(index) {
  state.activeCharIndex = index;
  const char = state.characters[index];
  const pet = petActors[index];

  // 캐릭터 점프 리액션 & 사운드
  triggerPetReaction(pet);
  playCharacterSound(char);

  // 모달 데이터 채우기
  dom.modalMascotImg.src = pet.sprites.react;
  dom.modalMascotName.textContent = char.name;
  dom.modalMascotDesc.textContent = char.desc;
  dom.modalCharBadge.textContent = char.badge;
  dom.modalSoundToggle.checked = char.soundEnabled;
  dom.modalFeedIcon.textContent = char.feedIcon;
  dom.modalFeedLabel.textContent = char.feedLabel;
  dom.modalStatCount.textContent = `${char.count}회 참여 중 ✨`;
  dom.modalHompySpeech.textContent = `"${char.speech}"`;

  // 소리 스타일 칩 렌더링
  renderSoundVariationChips(char);

  dom.mascotModalOverlay.classList.add('open');
  synthPop(0.3);
}

function renderSoundVariationChips(char) {
  dom.soundVariationChips.innerHTML = '';
  char.soundOptions.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = `sound-chip ${char.selectedSound === opt.id ? 'active' : ''}`;
    btn.textContent = opt.label;
    btn.addEventListener('click', () => {
      char.selectedSound = opt.id;
      dom.soundVariationChips.querySelectorAll('.sound-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      playCharacterSound(char);
      const pet = petActors[state.activeCharIndex];
      triggerPetReaction(pet);
    });
    dom.soundVariationChips.appendChild(btn);
  });
}

function playCharacterSound(char, volume = 0.7) {
  if (!char.soundEnabled && volume !== 0.7) return;
  const style = char.selectedSound || 'main';

  if (char.soundType === 'fart') synthFart(style, volume);
  else if (char.soundType === 'bird') synthBird(style, volume);
  else if (char.soundType === 'cat') synthCat(style, volume);
}

function triggerPetJump(pet) {
  pet.y += 24;
  pet.dom.style.bottom = `${pet.y}px`;
  setTimeout(() => {
    pet.y -= 24;
    pet.dom.style.bottom = `${pet.y}px`;
  }, 180);
}

function initMascotModal() {
  dom.btnCloseMascotModal.addEventListener('click', () => {
    dom.mascotModalOverlay.classList.remove('open');
    synthPop(0.2);
  });

  dom.mascotModalOverlay.addEventListener('click', (e) => {
    if (e.target === dom.mascotModalOverlay) {
      dom.mascotModalOverlay.classList.remove('open');
      synthPop(0.2);
    }
  });

  // 개별 사운드 ON/OFF 스위치 토글
  dom.modalSoundToggle.addEventListener('change', (e) => {
    const char = state.characters[state.activeCharIndex];
    char.soundEnabled = e.target.checked;
    synthPop(0.3);
    const pet = petActors[state.activeCharIndex];
    if (char.soundEnabled) {
      showPetBubble(pet, '소리 켜짐! 🔊', 2000);
      playCharacterSound(char);
      triggerPetReaction(pet);
    } else {
      showPetBubble(pet, '조용 모드 🤫', 2000);
      if (pet.spriteImg) pet.spriteImg.src = pet.sprites.base;
    }
  });

  // 간식 먹이기 버튼 (+도토리 & 먹방 리액션)
  dom.btnFeedMascot.addEventListener('click', () => {
    const char = state.characters[state.activeCharIndex];
    const pet = petActors[state.activeCharIndex];
    char.count++;
    state.acorns += 2;
    if (dom.userAcorns) dom.userAcorns.textContent = state.acorns;
    dom.modalStatCount.textContent = `${char.count}회 참여 중 ✨`;

    triggerPetReaction(pet, `맛있다 냠냠! ${char.feedIcon} (+2 도토리)`);
    dom.modalMascotImg.src = pet.sprites.react;
    synthPop(0.6);
  });

  // 쓰다듬기 버튼
  dom.btnPetMascot.addEventListener('click', () => {
    const pet = petActors[state.activeCharIndex];
    const char = state.characters[state.activeCharIndex];
    triggerPetReaction(pet, '행복해 💖💖');
    dom.modalMascotImg.src = pet.sprites.react;
    if (char.soundType === 'cat') synthCat('soft', 0.8);
    else synthPop(0.5);
  });

  // 사운드 테스트
  dom.btnTestSoundMascot.addEventListener('click', () => {
    const char = state.characters[state.activeCharIndex];
    const pet = petActors[state.activeCharIndex];
    playCharacterSound(char, 0.75);
    triggerPetReaction(pet);
  });
}

// ==========================================
// 5. 미니홈피 꾸미기 & 설정 바텀시트
// ==========================================
function initDecorModal() {
  dom.btnOpenDecor.addEventListener('click', () => {
    dom.decorSheetOverlay.classList.add('open');
    synthPop(0.25);
  });

  dom.btnCloseDecorSheet.addEventListener('click', () => {
    dom.decorSheetOverlay.classList.remove('open');
    synthPop(0.2);
  });

  dom.decorSheetOverlay.addEventListener('click', (e) => {
    if (e.target === dom.decorSheetOverlay) {
      dom.decorSheetOverlay.classList.remove('open');
      synthPop(0.2);
    }
  });

  // 배경 테마 확장 변경 (5종)
  document.querySelectorAll('.theme-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const theme = chip.getAttribute('data-theme');

      if (chip.classList.contains('locked')) {
        alert(`🔒 꾹 참음 15회 달성 시 네온빛 도시가 해금돼요! (현재: ${state.counts.hold}회)`);
        synthPop(0.15);
        return;
      }

      document.querySelectorAll('.theme-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.currentTheme = theme;
      dom.tamagotchiWorld.className = `tamagotchi-world ${theme}`;

      if (theme === 'meadow') {
        dom.worldThemeBadge.textContent = '🌿 산들바람 초원';
        dom.skySun.textContent = '☀️';
      } else if (theme === 'sunset') {
        dom.worldThemeBadge.textContent = '🌇 포근한 노을 언덕';
        dom.skySun.textContent = '🌅';
      } else if (theme === 'night') {
        dom.worldThemeBadge.textContent = '🌌 별빛 반짝 밤하늘';
        dom.skySun.textContent = '🌙';
      } else if (theme === 'room') {
        dom.worldThemeBadge.textContent = '🏠 아늑한 미니룸';
        dom.skySun.textContent = '🖼️';
      } else if (theme === 'city') {
        dom.worldThemeBadge.textContent = '🏙️ 네온빛 밤거리';
        dom.skySun.textContent = '✨';
      }
      synthPop(0.3);
    });
  });

  // 10종 소품 토글
  document.querySelectorAll('.prop-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      const propId = btn.getAttribute('data-prop');
      const propDom = document.getElementById(propId);
      if (propDom) {
        propDom.classList.toggle('hidden', !btn.classList.contains('active'));
      }
      synthPop(0.3);
    });
  });
}

// ==========================================
// 5.1 비밀 수집품 상세 모달 및 도감 시스템
// ==========================================
const collectiblesData = {
  acorn: {
    title: '황금 도토리',
    rarity: '🌟 전설의 보물',
    img: 'assets/collectibles/acorn.png',
    lore: '햄찌가 주머니 깊숙한 곳에서 방구 참기 성공 후 발견한 황금빛 도토리! 지니고 있으면 행운의 방구 쉴드가 생성돼요.',
    cond: '첫 간식 먹이기 완료 ✨',
    unlocked: true
  },
  trophy: {
    title: '참음왕 황금 트로피',
    rarity: '👑 챔피언 트로피',
    img: 'assets/collectibles/trophy.png',
    lore: '침묵의 회의실이나 시험장에서 배가 꼬르륵거릴 때 끝까지 소리를 참아낸 자에게 주어지는 최고의 영예!',
    cond: '소리 10회 참음 달성 👑',
    unlocked: true
  },
  sweet_potato: {
    title: '노릇 군고구마',
    rarity: '🍠 천연 가스 유발제',
    img: 'assets/collectibles/sweet_potato.png',
    lore: '방구 생성율 300% 증가! 햄찌와 뚱냥이가 나눠 먹으면 주머니가 들썩거리며 은밀한 삐용 소리가 울려 퍼져요.',
    cond: '불시 작전 5회 성공 🍠',
    unlocked: true
  },
  spray: {
    title: '피치향 탈취제',
    rarity: '🍑 에티켓 필수품',
    img: 'assets/collectibles/spray.png',
    lore: '아무도 모르게 뿡! 뀐 직후 슉슉 뿌려 위장하는 비밀 요원 전용 복숭아 향수. 향긋해서 아무도 의심하지 않아요.',
    cond: '위장 모드 3일 연속 사용 🍑',
    unlocked: true
  },
  key: {
    title: '비밀 일기 열쇠',
    rarity: '🗝️ 마스터 키',
    img: 'assets/collectibles/key.png',
    lore: '주머니 속 친구들의 흑역사와 은밀한 방구 기록이 적힌 다이어리의 하트 열쇠. 잃어버리면 일기장이 잠겨요!',
    cond: '일기장 3회 저장 완료 🗝️',
    unlocked: true
  },
  whoopee: {
    title: '방구 방석',
    rarity: '💨 전설의 장난감',
    img: 'assets/collectibles/whoopee.png',
    lore: '친구가 의자에 앉는 순간 "뽀오오옹~!" 우렁찬 소리를 내며 회의실 분위기를 단번에 브레이킹하는 고전 명작 장난감!',
    cond: '대담한 방구 5회 발사 💨',
    unlocked: true
  },
  mat: {
    title: '벚꽃 돗자리',
    rarity: '🌸 아지트 배치 가구',
    img: 'assets/collectibles/mat.png',
    lore: '봄바람 솔솔 부는 언덕에 깔아두면 햄찌와 오목눈이가 옹기종기 모여 낮잠을 자는 피크닉 매트예요.',
    cond: '아지트 데코 해금 🌸',
    unlocked: true
  },
  tree: {
    title: '크레용 수호목',
    rarity: '🌳 아지트 랜드마크',
    img: 'assets/collectibles/tree.png',
    lore: '세 친구가 뛰어노는 초원의 든든한 큰나무! 오목눈이가 높은 가지에 둥지를 틀고 비밀 소리를 노래해요.',
    cond: '미니홈피 방문자 1,000명 달성 🌳',
    unlocked: true
  },
  stamp: {
    title: '참 잘했어요 도장',
    rarity: '💮 최고 칭찬 인증 (도전 중)',
    img: 'assets/collectibles/stamp.png',
    lore: '주머니 속에서 소리를 가장 우아하고 결연하게 참아낸 평정심의 마스터에게 선생님이 찍어주는 빨간 참 잘했어요 도장!',
    cond: '전국 참음왕 TOP 10 달성 시 해금 (현재 14등 🔒)',
    unlocked: false
  }
};

function initCollectiblesModal() {
  document.querySelectorAll('.collectible-slot').forEach(slot => {
    slot.addEventListener('click', () => {
      const itemKey = slot.getAttribute('data-item');
      const item = collectiblesData[itemKey];
      if (!item) return;

      dom.collectibleModalImg.src = item.img;
      dom.collectibleModalImg.alt = item.title;
      dom.collectibleModalRarity.textContent = item.rarity;
      dom.collectibleModalTitle.textContent = item.title;
      dom.collectibleModalLore.textContent = item.lore;
      dom.collectibleModalCond.textContent = item.cond;

      dom.collectibleModalOverlay.classList.add('open');
      synthPop(0.35);
    });
  });

  dom.btnCloseCollectibleModal.addEventListener('click', () => {
    dom.collectibleModalOverlay.classList.remove('open');
    synthPop(0.2);
  });

  dom.btnConfirmCollectible.addEventListener('click', () => {
    dom.collectibleModalOverlay.classList.remove('open');
    synthPop(0.25);
  });

  dom.collectibleModalOverlay.addEventListener('click', (e) => {
    if (e.target === dom.collectibleModalOverlay) {
      dom.collectibleModalOverlay.classList.remove('open');
      synthPop(0.2);
    }
  });
}

function initSettingsModal() {
  dom.btnOpenSettings.addEventListener('click', () => {
    dom.settingsSheetOverlay.classList.add('open');
    synthPop(0.25);
  });

  dom.btnCloseSettingsSheet.addEventListener('click', () => {
    dom.settingsSheetOverlay.classList.remove('open');
    synthPop(0.2);
  });

  dom.settingsSheetOverlay.addEventListener('click', (e) => {
    if (e.target === dom.settingsSheetOverlay) {
      dom.settingsSheetOverlay.classList.remove('open');
      synthPop(0.2);
    }
  });

  // 매너 모드 설정
  const mannerBtns = document.querySelectorAll('.manner-btn');
  mannerBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      mannerBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.mannerMode = btn.getAttribute('data-mode');
      synthPop(0.2);
    });
  });

  // 빈도 칩
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.frequency = chip.getAttribute('data-freq');
      synthPop(0.2);
    });
  });

  // 불시 타이머 강제 발사
  dom.btnSimulateTrigger.addEventListener('click', () => {
    triggerRandomPetSound();
  });
}

// 비상 멈춤 [긴급탈출!]
function initEmergencyDock() {
  dom.btnEmergency.addEventListener('click', () => {
    state.emergencyEscape = !state.emergencyEscape;
    if (state.emergencyEscape) {
      dom.btnEmergency.classList.add('active');
      dom.emergencyText.textContent = '🚨 긴급탈출 중! (터치하여 해제)';
      dom.statusDot.classList.remove('pulsing');
      dom.statusDot.classList.add('emergency');
      dom.stealthText.textContent = '쉿! 모든 소리가 꽁꽁 얼어붙음 🥶';
      petActors.forEach(p => showPetBubble(p, '흡! 숨 참기 🤐', 4000));
    } else {
      dom.btnEmergency.classList.remove('active');
      dom.emergencyText.textContent = '🚨 긴급탈출! (원터치 소리 동결)';
      dom.statusDot.classList.add('pulsing');
      dom.statusDot.classList.remove('emergency');
      dom.stealthText.textContent = '햄찌와 친구들이 주머니 속 낮잠 중 💤';
      petActors.forEach(p => showPetBubble(p, '휴~ 살았다! 💨', 2500));
    }
    synthPop(0.4);
  });
}

// 불시 소리 발생 트리거 (모드별 대담/소심/참음 로직)
function triggerRandomPetSound() {
  if (state.emergencyEscape) return;

  // 활성화된 캐릭터 중 하나 무작위 선택
  const activeChars = state.characters.filter(c => c.soundEnabled);
  if (activeChars.length === 0) return;

  const chosenChar = activeChars[Math.floor(Math.random() * activeChars.length)];
  const pet = petActors.find(p => p.id === chosenChar.id);

  if (state.mannerMode === 'sound') {
    playCharacterSound(chosenChar, 0.7);
    state.counts.loud++;
    dom.countLoud.textContent = `${state.counts.loud}회`;
    if (pet) showPetBubble(pet, '대담하게 발사! 💥', 2500);

  } else if (state.mannerMode === 'vibrate') {
    playCharacterSound(chosenChar, 0.18);
    if (navigator.vibrate) navigator.vibrate([80, 40, 120]);
    state.counts.soft++;
    dom.countSoft.textContent = `${state.counts.soft}회`;
    if (pet) showPetBubble(pet, '소심하게 피식... 🫧', 2500);

  } else if (state.mannerMode === 'silent') {
    state.counts.hold++;
    dom.countHold.textContent = `${state.counts.hold}회`;
    if (pet) showPetBubble(pet, '윽! 꾹 참았다 🤫', 2500);
  }
}

let recordedAudioBlob = null;

function initDIYRecorder() {
  dom.btnRecord.addEventListener('click', async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('이 브라우저에서는 마이크 녹음이 지원되지 않습니다.');
      return;
    }
    if (dom.btnRecord.classList.contains('recording')) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        recordedAudioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        dom.recordedPreview.style.display = 'flex';
        dom.btnRecord.classList.remove('recording');
        dom.recText.textContent = '꾹 눌러 3초 녹음';
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      dom.btnRecord.classList.add('recording');
      dom.recText.textContent = '녹음 중... (3초)';

      setTimeout(() => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 3000);

    } catch (err) {
      alert('마이크 접근 권한이 필요합니다.');
    }
  });

  dom.btnPlayRecorded.addEventListener('click', () => {
    if (recordedAudioBlob) {
      const audioUrl = URL.createObjectURL(recordedAudioBlob);
      const audio = new Audio(audioUrl);
      audio.play();
    }
  });

  // 사운드팩 재생
  document.querySelectorAll('.sound-card').forEach(card => {
    const btn = card.querySelector('.btn-play-sound');
    const soundKey = card.getAttribute('data-sound');
    btn.addEventListener('click', () => {
      if (soundKey === 'fart1') synthFart(0.7);
      else if (soundKey === 'fart2') synthFart(0.35);
      else if (soundKey === 'bird') synthBird(0.7);
      else if (soundKey === 'cat') synthCat(0.7);
    });
  });
}

// ==========================================
// 6. 온디바이스 절차적 크레용 캔버스 렌더러 (9:16)
// ==========================================
function preloadImages() {
  const allImages = [
    'assets/hamster.png',
    'assets/tit.png',
    'assets/cat.png',
    'assets/sprites/hamster_walk.png',
    'assets/sprites/hamster_jump.png',
    'assets/sprites/hamster_sleep.png',
    'assets/sprites/tit_hop.png',
    'assets/sprites/tit_fly.png',
    'assets/sprites/tit_sing.png',
    'assets/sprites/cat_walk.png',
    'assets/sprites/cat_play.png',
    'assets/sprites/cat_sit.png',
    'assets/props/moon.png',
    'assets/props/sun.png',
    'assets/props/cloud.png',
    'assets/props/stars.png',
    'assets/props/tent.png',
    'assets/props/box.png',
    'assets/props/sunflower.png',
    'assets/props/carrot.png',
    'assets/props/balloon.png',
    'assets/props/campfire.png',
    'assets/props/bench.png',
    'assets/props/churu.png',
    'assets/props/mat.png',
    'assets/props/tree.png',
    'assets/collectibles/acorn.png',
    'assets/collectibles/trophy.png',
    'assets/collectibles/sweet_potato.png',
    'assets/collectibles/spray.png',
    'assets/collectibles/key.png',
    'assets/collectibles/whoopee.png',
    'assets/collectibles/mat.png',
    'assets/collectibles/tree.png',
    'assets/collectibles/stamp.png'
  ];

  allImages.forEach(src => {
    const img = new Image();
    img.src = src;
    state.cachedImages[src] = img;
  });
}

function drawCrayonLine(ctx, x1, y1, x2, y2, color, baseWidth = 4) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.hypot(dx, dy);
  const steps = Math.max(8, Math.floor(distance / 12));

  ctx.beginPath();
  ctx.moveTo(x1, y1);

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const px = x1 + dx * t + (Math.random() - 0.5) * 3.5;
    const py = y1 + dy * t + (Math.random() - 0.5) * 3.5;
    ctx.lineWidth = baseWidth + (Math.random() - 0.5) * 2;
    ctx.lineTo(px, py);
  }

  ctx.stroke();
  ctx.restore();
}

function drawCrayonSquiggle(ctx, x, y, width, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';

  ctx.beginPath();
  let cx = x;
  let wave = 1;
  while (cx < x + width) {
    const nextX = cx + 14 + Math.random() * 4;
    const nextY = y + wave * (5 + Math.random() * 3);
    ctx.lineTo(nextX, nextY);
    cx = nextX;
    wave *= -1;
  }
  ctx.stroke();
  ctx.restore();
}

function drawCrayonRubberStamp(ctx, x, y, title, subtitle, color, angleDeg = -12) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((angleDeg * Math.PI) / 180);

  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.beginPath();
  for (let a = 0; a <= Math.PI * 2; a += 0.1) {
    const r = 115 + (Math.random() - 0.5) * 4;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (a === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let a = 0; a <= Math.PI * 2; a += 0.1) {
    const r = 98 + (Math.random() - 0.5) * 3;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (a === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  ctx.font = 'bold 36px "Jua", sans-serif';
  ctx.fillText(title, 0, -10);

  ctx.font = 'bold 24px "Gaegu", cursive';
  ctx.fillText(subtitle, 0, 32);

  ctx.restore();
}

function renderStoryCanvas() {
  const canvas = dom.storyCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;  // 1080
  const h = canvas.height; // 1920

  // 1. 도화지 배경
  ctx.fillStyle = '#FFFDF8';
  ctx.fillRect(0, 0, w, h);

  // 2. 모눈 격자
  ctx.strokeStyle = '#EFE9DE';
  ctx.lineWidth = 1.5;
  const gridSize = 45;
  for (let x = 0; x < w; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // 3. 헤더 날짜 & 날씨
  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일 (오늘)`;
  
  ctx.fillStyle = '#242220';
  ctx.font = 'bold 46px "Gaegu", cursive';
  ctx.textAlign = 'left';
  ctx.fillText(dateStr, 90, 130);

  ctx.textAlign = 'right';
  ctx.fillText('날씨: 💨 뿡뿡', w - 90, 130);

  drawCrayonLine(ctx, 80, 160, w - 80, 160, '#242220', 4);

  // 4. 제목
  ctx.textAlign = 'center';
  ctx.font = 'bold 82px "Jua", sans-serif';
  ctx.fillStyle = '#242220';
  ctx.fillText('나의 비밀 방귀 일기장!', w / 2, 280);

  drawCrayonSquiggle(ctx, w / 2 - 340, 315, 680, '#FED36A');

  // 5. 마스코트 3총사 투명 스프라이트 그리기
  const currentChar = state.characters[state.activeCharIndex];
  let mascotImg = state.cachedImages[currentChar.img];

  const drawCardBody = () => {
    let titleBadge = '은밀한 가스 암살자 🕵️';
    let stampTitle = '참 잘 참았어요!';
    let stampSubtitle = '💮 인내의 화신';
    let stampColor = '#FF5A5F';

    if (state.counts.loud >= 4) {
      titleBadge = '확성기 방구 대장 📢';
      stampTitle = '냄새주의!';
      stampSubtitle = '⚠️ 대담한 폭격기';
      stampColor = '#D9480F';
    } else if (state.counts.hold >= 5) {
      titleBadge = '인내의 화신 (괄약근 장인) 🧘';
      stampTitle = '완벽한 범죄';
      stampSubtitle = '💮 참음 마스터';
      stampColor = '#10B981';
    }

    // 칭호 박스
    ctx.save();
    ctx.fillStyle = '#FFF9DB';
    ctx.strokeStyle = '#242220';
    ctx.lineWidth = 4;
    const badgeY = 960;
    ctx.beginPath();
    ctx.roundRect(140, badgeY, w - 280, 80, [20]);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#242220';
    ctx.font = 'bold 44px "Jua", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`[ 오늘의 칭호: ${titleBadge} ]`, w / 2, badgeY + 54);
    ctx.restore();

    // 3단계 스코어카드 박스
    const scoreBoxY = 1090;
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#242220';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(110, scoreBoxY, w - 220, 460, [24]);
    ctx.fill();
    ctx.stroke();

    drawCrayonCheckbox(ctx, 160, scoreBoxY + 70, true);
    ctx.font = 'bold 50px "Gaegu", cursive';
    ctx.fillStyle = '#242220';
    ctx.textAlign = 'left';
    ctx.fillText(`대담하게 발사 : ${state.counts.loud}회 (뿡뿡! 💥)`, 230, scoreBoxY + 95);

    drawCrayonCheckbox(ctx, 160, scoreBoxY + 195, true);
    ctx.fillText(`소심하게 발사 : ${state.counts.soft}회 (피식... 🫧)`, 230, scoreBoxY + 220);

    drawCrayonCheckbox(ctx, 160, scoreBoxY + 320, true);
    ctx.fillText(`눈치보며 참음 : ${state.counts.hold}회 (윽! 참았다 🤫)`, 230, scoreBoxY + 345);
    ctx.restore();

    // 도장 쾅
    drawCrayonRubberStamp(ctx, w - 260, h - 450, stampTitle, stampSubtitle, stampColor, -12);

    // 워터마크 태그
    ctx.font = 'bold 36px "Gaegu", cursive';
    ctx.fillStyle = '#888';
    ctx.textAlign = 'center';
    ctx.fillText('@방구뿡   #오늘도무사히   #다마고치아지트', w / 2, h - 90);
  };

  if (!mascotImg) {
    mascotImg = new Image();
    mascotImg.src = currentChar.img;
    mascotImg.onload = () => {
      state.cachedImages[currentChar.img] = mascotImg;
      drawMascotAndRest(ctx, mascotImg, w, drawCardBody);
    };
  } else if (mascotImg.complete) {
    drawMascotAndRest(ctx, mascotImg, w, drawCardBody);
  } else {
    mascotImg.onload = () => {
      drawMascotAndRest(ctx, mascotImg, w, drawCardBody);
    };
  }
}

function drawMascotAndRest(ctx, img, w, callback) {
  const imgW = 480;
  const imgH = 480;
  const imgX = (w - imgW) / 2;
  const imgY = 380;

  ctx.save();
  ctx.shadowColor = 'rgba(40, 37, 35, 0.25)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 10;

  ctx.drawImage(img, imgX, imgY, imgW, imgH);
  ctx.restore();

  drawCrayonCloud(ctx, imgX + imgW - 60, imgY + imgH - 100, '#95D5B2');

  callback();
}

function drawCrayonCheckbox(ctx, x, y, checked) {
  ctx.save();
  ctx.strokeStyle = '#242220';
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y - 30, 42, 42);

  if (checked) {
    ctx.strokeStyle = '#FF5A5F';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + 6, y - 8);
    ctx.lineTo(x + 18, y + 4);
    ctx.lineTo(x + 36, y - 24);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCrayonCloud(ctx, cx, cy, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = '#242220';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, 32, 0, Math.PI * 2);
  ctx.arc(cx + 36, cy - 12, 26, 0, Math.PI * 2);
  ctx.arc(cx + 60, cy + 10, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#242220';
  ctx.font = 'bold 36px "Jua", sans-serif';
  ctx.fillText('뿌웅~!', cx + 18, cy - 38);
  ctx.restore();
}

document.getElementById('btnShareStory').addEventListener('click', () => {
  renderStoryCanvas();
  dom.storyCanvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `banggu_bboong_story_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert('📸 9:16 인스타 스토리 카드 이미지가 갤러리에 저장되었습니다!');
  });
});

document.getElementById('btnRedrawCanvas').addEventListener('click', () => {
  renderStoryCanvas();
  synthPop(0.3);
});
