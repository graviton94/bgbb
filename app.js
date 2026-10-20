/**
 * 방구뿡 (Bang-gu Bboong) - 다마고치 아지트 & 크레용 엔진 (V4.0)
 * - Ко어 1단계: localStorage 영구 저장, 백그라운드 불시 타이머 스케줄러, 실시간 해금 & 리더보드 연동, 9종 다층 사운드 합성 + DIY 녹음 장착
 * - 코어 2단계: 아지트 10종 소품 터치 & 캐릭터 자율 방문 상호작용, 친밀도 레벨업 진화
 * - 커스텀 그림일기(날씨/한줄 일기/3총사 합동 렌더링/Web Share API 공유)
 */

const STORAGE_KEY = 'BGBB_STATE_V4';

// ==========================================
// 1. 상태 관리 (State) 및 소품 상호작용 메타데이터
// ==========================================
const defaultState = {
  activeCharIndex: 0,
  characters: [
    {
      id: 'hamster',
      name: '방구 햄찌',
      desc: '소리: 뽀옹, 삐용, 부르르릉!',
      img: 'assets/hamster.png',
      soundType: 'fart',
      speech: '오늘도 주머니에서 몰래 뿡! 💨',
      level: 3,
      badge: '절친 레벨 3 💖',
      feedIcon: '🌻',
      feedLabel: '해바라기씨 주기',
      soundEnabled: true,
      selectedSound: 'main',
      soundOptions: [
        { id: 'main', label: '기본 뿡 💨' },
        { id: 'soft', label: '소심 삐용 🫧' },
        { id: 'loud', label: '대폭발 뿡 💥' }
      ],
      count: 2
    },
    {
      id: 'tit',
      name: '솜뭉치 오목눈이',
      desc: '소리: 포로롱, 파닥, 째애액!',
      img: 'assets/tit.png',
      soundType: 'bird',
      speech: '짹짹! 솜뭉치처럼 가볍게 날아요 🐤',
      level: 2,
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
      desc: '소리: 냐아옹, 골골송, 캬아악!',
      img: 'assets/cat.png',
      soundType: 'cat',
      speech: '만사 귀찮다옹... 불시에 야옹! 🐱',
      level: 3,
      badge: '도도한 냥님 Lv.3 👑',
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
  currentTheme: 'auto', // 'auto' | 'meadow' | 'sunset' | 'night' | 'room' | 'city'
  activeProps: {
    propCarrot: true,
    propSunflower: true,
    propBox: true,
    propTent: true,
    propBalloon: true,
    propBench: true,
    propCampfire: true,
    propChuru: true,
    propMat: false,
    propTree: false
  },
  operationOn: true,
  emergencyEscape: false,
  mannerMode: 'sound', // 'sound' | 'vibrate' | 'silent'
  frequency: 'normal', // 'normal' | 'thrill' | 'quiet'
  timeWindow: '09:00 ~ 18:00',
  acorns: 185,
  unlockedAchievements: 6,
  counts: {
    loud: 2,
    soft: 3,
    hold: 4
  },
  diaryWeather: '💨 뿡뿡',
  diaryNote: '주머니 속에서 완벽하게 위장 성공! 아무도 몰랐다 헤헤',
  customAudioDataUrl: null,
  cachedImages: {}
};

const state = JSON.parse(JSON.stringify(defaultState));

// 아지트 10종 소품별 캐릭터 상호작용 정의 (코어 2단계)
const propInteractions = {
  propCarrot: {
    petId: 'hamster',
    xRatio: 0.08,
    y: 78,
    msg: '영차! 당근 뽑다가 뿡! 🥕💨 (+2🌰)',
    soundStyle: 'main'
  },
  propSunflower: {
    petId: 'tit',
    xRatio: 0.24,
    y: 120,
    msg: '해바라기씨 콕콕 맛있다짹! 🌻🐤 (+2🌰)',
    soundStyle: 'main'
  },
  propTent: {
    petId: 'hamster',
    xRatio: 0.12,
    y: 138,
    msg: '인디언 텐트 속에서 비밀 작전 회의! ⛺ (+2🌰)',
    soundStyle: 'soft'
  },
  propMat: {
    petId: 'cat',
    xRatio: 0.22,
    y: 76,
    msg: '피크닉 돗자리 위에서 데구르르~ 🌸💤 (+2🌰)',
    soundStyle: 'soft'
  },
  propBench: {
    petId: 'tit',
    xRatio: 0.46,
    y: 112,
    msg: '통나무 벤치에서 포로롱 휴식! 🪵🎵 (+2🌰)',
    soundStyle: 'main'
  },
  propCampfire: {
    petId: 'hamster',
    xRatio: 0.46,
    y: 78,
    msg: '모닥불에 군고구마 구워 먹으니 배가 꾸르륵🔥🍠 (+2🌰)',
    soundStyle: 'loud'
  },
  propTree: {
    petId: 'tit',
    xRatio: 0.78,
    y: 140,
    msg: '크레용 큰나무 꼭대기에서 노래해요! 🌳🐤 (+2🌰)',
    soundStyle: 'loud'
  },
  propBalloon: {
    petId: 'hamster',
    xRatio: 0.74,
    y: 150,
    msg: '방구 풍선이 부풀어 오른다 뽀옹~! 🎈💨 (+2🌰)',
    soundStyle: 'soft'
  },
  propBox: {
    petId: 'cat',
    xRatio: 0.76,
    y: 95,
    msg: '역시 좁은 택배 상자가 최고다옹 📦🐱 (+2🌰)',
    soundStyle: 'soft'
  },
  propChuru: {
    petId: 'cat',
    xRatio: 0.65,
    y: 76,
    msg: '황금 츄르 핥짝핥짝! 갸르릉~ 🐟💖 (+2🌰)',
    soundStyle: 'main'
  }
};

// ==========================================
// 1.1 LocalStorage 영구 저장 및 복원
// ==========================================
function saveState() {
  try {
    const payload = {
      activeCharIndex: state.activeCharIndex,
      characters: state.characters.map(c => ({
        id: c.id,
        level: c.level,
        badge: c.badge,
        speech: c.speech,
        soundEnabled: c.soundEnabled,
        selectedSound: c.selectedSound,
        count: c.count
      })),
      currentTheme: state.currentTheme,
      activeProps: state.activeProps,
      operationOn: state.operationOn,
      mannerMode: state.mannerMode,
      frequency: state.frequency,
      timeWindow: state.timeWindow,
      acorns: state.acorns,
      counts: state.counts,
      diaryWeather: state.diaryWeather,
      diaryNote: state.diaryNote,
      customAudioDataUrl: state.customAudioDataUrl
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    syncNativeForegroundService();
  } catch (e) {
    console.warn('저장 실패:', e);
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);

    if (typeof saved.activeCharIndex === 'number') state.activeCharIndex = saved.activeCharIndex;
    if (saved.currentTheme) state.currentTheme = saved.currentTheme;
    if (saved.activeProps) state.activeProps = { ...state.activeProps, ...saved.activeProps };
    if (typeof saved.operationOn === 'boolean') state.operationOn = saved.operationOn;
    if (saved.mannerMode) state.mannerMode = saved.mannerMode;
    if (saved.frequency) state.frequency = saved.frequency;
    if (saved.timeWindow) state.timeWindow = saved.timeWindow;
    if (typeof saved.acorns === 'number') state.acorns = saved.acorns;
    if (saved.counts) state.counts = { ...state.counts, ...saved.counts };
    if (saved.diaryWeather) state.diaryWeather = saved.diaryWeather;
    if (typeof saved.diaryNote === 'string') state.diaryNote = saved.diaryNote;
    if (saved.customAudioDataUrl) {
      state.customAudioDataUrl = saved.customAudioDataUrl;
      ensureDiySoundOption();
    }

    if (Array.isArray(saved.characters)) {
      saved.characters.forEach(sc => {
        const target = state.characters.find(c => c.id === sc.id);
        if (target) {
          if (typeof sc.level === 'number') target.level = sc.level;
          if (sc.badge) target.badge = sc.badge;
          if (sc.speech) target.speech = sc.speech;
          if (typeof sc.soundEnabled === 'boolean') target.soundEnabled = sc.soundEnabled;
          if (sc.selectedSound) target.selectedSound = sc.selectedSound;
          if (typeof sc.count === 'number') target.count = sc.count;
        }
      });
    }
  } catch (e) {
    console.warn('불러오기 실패:', e);
  }
}

function ensureDiySoundOption() {
  state.characters.forEach(c => {
    if (!c.soundOptions.some(o => o.id === 'diy')) {
      c.soundOptions.push({ id: 'diy', label: '내 녹음 🎙️' });
    }
  });
}

// ==========================================
// 2. 리얼 물리 음향 WAV 오디오 엔진 (9종 WAV 에셋 + Web Audio 폴백) & 안드로이드 포그라운드 브릿지
// ==========================================
let audioCtx = null;
let noiseBuffer = null;

const soundWaveAssets = {
  fart: {
    main: 'assets/sounds/fart_main.wav',
    soft: 'assets/sounds/fart_soft.wav',
    loud: 'assets/sounds/fart_loud.wav'
  },
  bird: {
    main: 'assets/sounds/tit_main.wav',
    soft: 'assets/sounds/tit_soft.wav',
    loud: 'assets/sounds/tit_loud.wav'
  },
  cat: {
    main: 'assets/sounds/cat_main.wav',
    soft: 'assets/sounds/cat_soft.wav',
    loud: 'assets/sounds/cat_loud.wav'
  }
};

const preloadedAudioMap = {};
Object.values(soundWaveAssets).forEach(group => {
  Object.values(group).forEach(src => {
    const a = new Audio(src);
    a.preload = 'auto';
    preloadedAudioMap[src] = a;
  });
});

function playRealWavAsset(category, style = 'main', volume = 0.75) {
  const group = soundWaveAssets[category];
  if (!group) return false;
  const src = group[style] || group.main;
  if (!src) return false;
  try {
    const audio = new Audio(src);
    audio.volume = Math.min(1.0, Math.max(0.05, volume));
    audio.play().catch(() => {});
    return true;
  } catch (e) {
    return false;
  }
}

// 안드로이드 네이티브 포그라운드 서비스 브릿지 동기화
function syncNativeForegroundService() {
  try {
    if (window.AndroidPocketBridge) {
      const configJson = JSON.stringify({
        operationOn: state.operationOn && !state.emergencyEscape,
        emergencyEscape: state.emergencyEscape,
        frequency: state.frequency,
        timeWindow: state.timeWindow,
        mannerMode: state.mannerMode,
        activeSounds: state.characters
          .filter(c => c.soundEnabled)
          .map(c => `${c.id === 'hamster' ? 'fart' : c.id}_${c.selectedSound === 'diy' ? 'main' : c.selectedSound}`)
      });
      if (state.operationOn && !state.emergencyEscape) {
        window.AndroidPocketBridge.startForegroundOperation(configJson);
      } else {
        window.AndroidPocketBridge.stopForegroundOperation();
      }
    }
  } catch (e) {
    console.warn('Android bridge sync skipped:', e);
  }
}

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

// 화이트/핑크 노이즈 버퍼 생성 (리얼한 공기 마찰음, 방구 파열음, 고양이 하악질용)
function getNoiseBuffer(ctx) {
  if (noiseBuffer) return noiseBuffer;
  const bufferSize = ctx.sampleRate * 1.5;
  noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + white * 0.0990460;
    b1 = 0.96300 * b1 + white * 0.2965164;
    b2 = 0.57000 * b2 + white * 1.0526913;
    output[i] = (b0 + b1 + b2 + white * 0.1848) * 0.18;
  }
  return noiseBuffer;
}

// 1) 햄찌 방구 사운드 3종 (main: 오리지널 뿡, soft: 삐용 바람새는 방구, loud: 우렁찬 2단 대폭발)
function synthFart(style = 'main', volume = 0.65) {
  if (typeof style === 'number') {
    volume = style;
    style = 'main';
  }
  if (volume <= 0) return;
  if (playRealWavAsset('fart', style, volume)) return;
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  if (style === 'soft') {
    // 소심한 삐용~ 피식 (고주파 스퀴크 + 공기 새는 노이즈)
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.34);

    const vib = ctx.createOscillator();
    vib.frequency.setValueAtTime(42, now);
    const vibGain = ctx.createGain();
    vibGain.gain.setValueAtTime(25, now);
    vib.connect(vibGain);
    vibGain.connect(osc.frequency);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(volume * 0.55, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.008, now + 0.35);

    // 바람 새는 쉬익 소리
    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx);
    const nFilter = ctx.createBiquadFilter();
    nFilter.type = 'bandpass';
    nFilter.frequency.setValueAtTime(1600, now);
    nFilter.Q.value = 3.0;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(volume * 0.25, now + 0.05);
    nGain.gain.exponentialRampToValueAtTime(0.005, now + 0.36);

    osc.connect(gain);
    gain.connect(ctx.destination);
    noise.connect(nFilter);
    nFilter.connect(nGain);
    nGain.connect(ctx.destination);

    vib.start(now);
    osc.start(now);
    noise.start(now);
    vib.stop(now + 0.36);
    osc.stop(now + 0.36);
    noise.stop(now + 0.36);
    return;
  }

  if (style === 'loud') {
    // 우렁찬 대폭발 부르르릉! (2단 리플 저음 + 버블 필터 + 파열 노이즈)
    const duration = 0.82;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(135, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.32);
    osc.frequency.setValueAtTime(98, now + 0.34); // 2차 추진!
    osc.frequency.exponentialRampToValueAtTime(34, now + duration);

    const subOsc = ctx.createOscillator();
    subOsc.type = 'square';
    subOsc.frequency.setValueAtTime(68, now);
    subOsc.frequency.exponentialRampToValueAtTime(24, now + duration);

    // 펄럭이는 괄약근 진동 LFO
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(32, now);
    lfo.frequency.linearRampToValueAtTime(16, now + duration);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(65, now);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1250, now);
    filter.frequency.exponentialRampToValueAtTime(220, now + duration);
    filter.Q.value = 4.5;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(Math.min(1.0, volume * 1.15), now);
    masterGain.gain.setValueAtTime(Math.min(1.0, volume * 1.25), now + 0.35);
    masterGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.connect(filter);
    subOsc.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(ctx.destination);

    lfo.start(now);
    osc.start(now);
    subOsc.start(now);
    lfo.stop(now + duration);
    osc.stop(now + duration);
    subOsc.stop(now + duration);
    return;
  }

  // 기본 시원한 오리지널 뿡! (main)
  const duration = 0.48;
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(48, now + duration);

  const lfo = ctx.createOscillator();
  lfo.frequency.setValueAtTime(36, now);
  lfo.frequency.linearRampToValueAtTime(18, now + duration);
  const lfoGain = ctx.createGain();
  lfoGain.gain.setValueAtTime(52, now);
  lfoGain.gain.linearRampToValueAtTime(15, now + duration);
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(920, now);
  filter.frequency.exponentialRampToValueAtTime(180, now + duration);
  filter.Q.value = 3.2;

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(volume * 0.85, now);
  masterGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

  osc.connect(filter);
  filter.connect(masterGain);
  masterGain.connect(ctx.destination);

  lfo.start(now);
  osc.start(now);
  lfo.stop(now + duration);
  osc.stop(now + duration);
}

// 2) 오목눈이 사운드 3종 (main: 포로롱 2연타 짹짹, soft: 파닥파닥 날개짓, loud: 흥분 트릴 째애액!)
function synthBird(style = 'main', volume = 0.65) {
  if (typeof style === 'number') {
    volume = style;
    style = 'main';
  }
  if (volume <= 0) return;
  if (playRealWavAsset('bird', style, volume)) return;
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  if (style === 'soft') {
    // 부드러운 깃털 파닥파닥 3연타 공기음 + 짧은 삐약
    for (let i = 0; i < 3; i++) {
      const t = now + i * 0.085;
      const noise = ctx.createBufferSource();
      noise.buffer = getNoiseBuffer(ctx);
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(900 + i * 220, t);
      filter.Q.value = 2.0;

      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(volume * 0.45, t);
      nGain.gain.exponentialRampToValueAtTime(0.01, t + 0.065);

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(ctx.destination);
      noise.start(t);
      noise.stop(t + 0.07);
    }
    return;
  }

  if (style === 'loud') {
    // 비명 째애액! (고음 FM 트릴)
    const duration = 0.36;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(2800, now);
    osc.frequency.linearRampToValueAtTime(4600, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(2400, now + duration);

    const trill = ctx.createOscillator();
    trill.frequency.setValueAtTime(55, now);
    const trillGain = ctx.createGain();
    trillGain.gain.setValueAtTime(380, now);
    trill.connect(trillGain);
    trillGain.connect(osc.frequency);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume * 0.85, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    trill.start(now);
    osc.start(now);
    trill.stop(now + duration);
    osc.stop(now + duration);
    return;
  }

  // 기본 포로롱 짹짹! (맑은 2연타 지저귐)
  const notes = [
    { start: 0, dur: 0.13, f1: 2400, f2: 3700, f3: 2900 },
    { start: 0.15, dur: 0.16, f1: 2700, f2: 4100, f3: 2200 }
  ];
  notes.forEach(n => {
    const t = now + n.start;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(n.f1, t);
    osc.frequency.exponentialRampToValueAtTime(n.f2, t + n.dur * 0.55);
    osc.frequency.exponentialRampToValueAtTime(n.f3, t + n.dur);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(volume * 0.7, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, t + n.dur);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + n.dur);
  });
}

// 3) 시크 뚱냥이 사운드 3종 (main: 냐아옹~, soft: 그르릉 골골송, loud: 캬아악! 하악질)
function synthCat(style = 'main', volume = 0.65) {
  if (typeof style === 'number') {
    volume = style;
    style = 'main';
  }
  if (volume <= 0) return;
  if (playRealWavAsset('cat', style, volume)) return;
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  if (style === 'soft') {
    // 그르릉~ 골골송 (26Hz 저음 모터 진동)
    const duration = 0.65;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(58, now);

    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(25, now);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(22, now);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(volume * 0.65, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    lfo.start(now);
    osc.start(now);
    lfo.stop(now + duration);
    osc.stop(now + duration);
    return;
  }

  if (style === 'loud') {
    // 캬아악! 매운 하악질 (고주파 파열 화이트노이즈 + 날카로운 성대음)
    const duration = 0.45;
    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx);

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(2800, now);
    bandpass.frequency.exponentialRampToValueAtTime(1800, now + duration);
    bandpass.Q.value = 1.4;

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(volume * 0.9, now);
    nGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(720, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + duration);
    const oGain = ctx.createGain();
    oGain.gain.setValueAtTime(volume * 0.35, now);
    oGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    noise.connect(bandpass);
    bandpass.connect(nGain);
    nGain.connect(ctx.destination);

    osc.connect(oGain);
    oGain.connect(ctx.destination);

    noise.start(now);
    osc.start(now);
    noise.stop(now + duration);
    osc.stop(now + duration);
    return;
  }

  // 기본 시크한 냐아옹~ (포먼트 필터 스윕으로 "야-옹" 모음 구현)
  const duration = 0.52;
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(420, now);
  osc.frequency.linearRampToValueAtTime(690, now + 0.16);
  osc.frequency.exponentialRampToValueAtTime(340, now + duration);

  const formant = ctx.createBiquadFilter();
  formant.type = 'bandpass';
  formant.frequency.setValueAtTime(850, now);
  formant.frequency.linearRampToValueAtTime(1450, now + 0.18);
  formant.frequency.exponentialRampToValueAtTime(620, now + duration);
  formant.Q.value = 2.2;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.01, now);
  gain.gain.linearRampToValueAtTime(volume * 0.9, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

  osc.connect(formant);
  formant.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration);
}

function synthPop(volume = 0.35) {
  if (volume <= 0) return;
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const duration = 0.08;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(280, now);
  osc.frequency.exponentialRampToValueAtTime(960, now + duration);

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
  loadState();
  initDOM();
  syncUIFromState();
  initTabs();
  initTamagotchiWorld();
  initPropsInteraction();
  initMascotModal();
  initDecorModal();
  initSettingsModal();
  initEmergencyDock();
  initDIYRecorder();
  initCollectiblesModal();
  initDiaryControls();
  preloadImages();
  updateProgressionAndLeaderboard(false);
  startBackgroundScheduler();
  syncNativeForegroundService();
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
    worldAcornBadge: document.getElementById('worldAcornBadge'),
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
    timeRangeBadge: document.getElementById('timeRangeBadge'),
    btnChangeTime: document.getElementById('btnChangeTime'),
    nextTriggerStatus: document.getElementById('nextTriggerStatus'),
    btnResetData: document.getElementById('btnResetData'),
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
    diaryCustomNote: document.getElementById('diaryCustomNote'),
    btnRecord: document.getElementById('btnRecord'),
    recText: document.getElementById('recText'),
    recordedPreview: document.getElementById('recordedPreview'),
    recordedLabel: document.getElementById('recordedLabel'),
    btnPlayRecorded: document.getElementById('btnPlayRecorded'),
    btnEquipRecorded: document.getElementById('btnEquipRecorded'),
    collectibleModalOverlay: document.getElementById('collectibleModalOverlay'),
    collectibleDetailCard: document.getElementById('collectibleDetailCard'),
    btnCloseCollectibleModal: document.getElementById('btnCloseCollectibleModal'),
    collectibleModalImg: document.getElementById('collectibleModalImg'),
    collectibleModalRarity: document.getElementById('collectibleModalRarity'),
    collectibleModalTitle: document.getElementById('collectibleModalTitle'),
    collectibleModalLore: document.getElementById('collectibleModalLore'),
    collectibleModalCond: document.getElementById('collectibleModalCond'),
    btnConfirmCollectible: document.getElementById('btnConfirmCollectible'),
    myRankBanner: document.getElementById('myRankBanner'),
    rankList: document.getElementById('rankList'),
    crayonToast: document.getElementById('crayonToast'),
    subTabs: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content')
  };
}

let toastTimeout = null;
function showToast(message, duration = 2600) {
  if (!dom.crayonToast) return;
  dom.crayonToast.textContent = message;
  dom.crayonToast.classList.add('show');
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    dom.crayonToast.classList.remove('show');
  }, duration);
}

function updateAcornDisplay() {
  if (dom.userAcorns) dom.userAcorns.textContent = state.acorns;
  if (dom.worldAcornBadge) dom.worldAcornBadge.textContent = `🌰 ${state.acorns}`;
}

function getTimeBasedTheme() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 17) return 'meadow';
  if (hour >= 17 && hour < 20) return 'sunset';
  return 'night';
}

function applyThemeToDOM(theme) {
  state.currentTheme = theme;
  const resolvedTheme = theme === 'auto' ? getTimeBasedTheme() : theme;

  if (dom.tamagotchiWorld) {
    dom.tamagotchiWorld.className = `tamagotchi-world ${resolvedTheme}`;
  }
  document.querySelectorAll('.theme-chip').forEach(c => {
    c.classList.toggle('active', c.getAttribute('data-theme') === theme);
  });

  const themeNames = {
    meadow: '☀️ 낮 · 산들바람 초원',
    sunset: '🌇 저녁 · 노을빛 언덕',
    night: '🌙 밤 · 별빛 밤하늘',
    room: '🏠 실내 · 아늑한 미니룸',
    city: '🏙️ 심야 · 네온빛 밤거리'
  };

  if (dom.worldThemeBadge) {
    if (theme === 'auto') {
      const autoLabel = resolvedTheme === 'meadow' ? '낮·초원' : resolvedTheme === 'sunset' ? '저녁·노을' : '밤·별빛';
      dom.worldThemeBadge.textContent = `⏰ 실시간 (${autoLabel})`;
    } else {
      dom.worldThemeBadge.textContent = themeNames[resolvedTheme] || '☀️ 낮 · 산들바람 초원';
    }
  }
}

function syncUIFromState() {
  updateAcornDisplay();
  if (dom.countLoud) dom.countLoud.textContent = `${state.counts.loud}회`;
  if (dom.countSoft) dom.countSoft.textContent = `${state.counts.soft}회`;
  if (dom.countHold) dom.countHold.textContent = `${state.counts.hold}회`;

  applyThemeToDOM(state.currentTheme);

  // 10종 소품 배치 상태 복원
  Object.keys(state.activeProps).forEach(propId => {
    const isOn = !!state.activeProps[propId];
    const propDom = document.getElementById(propId);
    if (propDom) propDom.classList.toggle('hidden', !isOn);
    const btn = document.querySelector(`.prop-toggle-btn[data-prop="${propId}"]`);
    if (btn) btn.classList.toggle('active', isOn);
  });

  // 설정 시트 복원
  if (dom.operationToggle) dom.operationToggle.checked = state.operationOn;
  if (dom.timeRangeBadge) dom.timeRangeBadge.textContent = state.timeWindow;

  document.querySelectorAll('.manner-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-mode') === state.mannerMode);
  });
  document.querySelectorAll('.frequency-chips .chip').forEach(chip => {
    chip.classList.toggle('active', chip.getAttribute('data-freq') === state.frequency);
  });

  // 그림일기 입력 및 날씨 복원
  if (dom.diaryCustomNote) dom.diaryCustomNote.value = state.diaryNote;
  document.querySelectorAll('.weather-chip').forEach(w => {
    w.classList.toggle('active', w.getAttribute('data-weather') === state.diaryWeather);
  });

  // 녹음된 DIY 오디오가 있으면 프리뷰 표시
  if (state.customAudioDataUrl && dom.recordedPreview) {
    dom.recordedPreview.style.display = 'flex';
  }

  updateSoundPackEquippedButtons();
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
      if (targetId === 'tab-rank') updateProgressionAndLeaderboard(false);
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
    vx: 0.72,
    targetX: 90,
    targetY: 120,
    facingRight: true,
    state: 'walk',
    animFrame: 'base',
    idleTimer: 60,
    reactTimer: 0,
    walkStep: 0,
    waddleOffset: 0,
    pendingPropAction: null,
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
    vx: 0.9,
    targetX: 180,
    targetY: 180,
    facingRight: true,
    state: 'hop',
    animFrame: 'base',
    idleTimer: 80,
    reactTimer: 0,
    walkStep: 0,
    waddleOffset: 0,
    pendingPropAction: null,
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
    vx: 0.5,
    targetX: 250,
    targetY: 85,
    facingRight: false,
    state: 'idle',
    animFrame: 'base',
    idleTimer: 100,
    reactTimer: 0,
    walkStep: 0,
    waddleOffset: 0,
    pendingPropAction: null,
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

  startTamagotchiLoop();
}

// ==========================================
// 3.1 아지트 소품 터치 & 캐릭터 자율 방문 상호작용 (코어 2단계)
// ==========================================
function initPropsInteraction() {
  Object.keys(propInteractions).forEach(propId => {
    const propEl = document.getElementById(propId);
    if (!propEl) return;

    propEl.addEventListener('click', (e) => {
      e.stopPropagation();
      if (state.emergencyEscape) return;

      // 소품 통통 튀는 애니메이션
      propEl.classList.remove('prop-active-bounce');
      void propEl.offsetWidth;
      propEl.classList.add('prop-active-bounce');
      setTimeout(() => propEl.classList.remove('prop-active-bounce'), 350);

      const meta = propInteractions[propId];
      const pet = petActors.find(p => p.id === meta.petId);
      if (!pet) return;

      const worldW = dom.tamagotchiWorld ? dom.tamagotchiWorld.clientWidth : 360;
      const destX = Math.max(20, Math.min(worldW - 90, worldW * meta.xRatio));

      pet.state = 'walk';
      pet.reactTimer = 0;
      pet.targetX = destX;
      pet.targetY = meta.y;
      pet.facingRight = destX > pet.x;
      pet.pendingPropAction = {
        msg: meta.msg,
        soundStyle: meta.soundStyle,
        rewardAcorns: 2
      };

      showPetBubble(pet, '우와! 달려간다~ 🐾', 1400);
      synthPop(0.3);
    });
  });
}

function triggerPetReaction(pet, customText = null) {
  pet.state = 'react';
  pet.reactTimer = 110;
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
      const minY = 76;
      const maxY = 180;

      petActors.forEach((pet, idx) => {
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
          pet.idleTimer--;

          if (pet.idleTimer <= 0 && !pet.pendingPropAction) {
            pet.idleTimer = 95 + Math.floor(Math.random() * 140);
            const rand = Math.random();

            // 25% 확률로 현재 배치된 내 전용 소품으로 놀러가기
            const myActiveProps = Object.entries(propInteractions).filter(
              ([pid, meta]) => meta.petId === pet.id && state.activeProps[pid]
            );

            if (rand < 0.25 && myActiveProps.length > 0) {
              const [, chosenMeta] = myActiveProps[Math.floor(Math.random() * myActiveProps.length)];
              pet.state = 'walk';
              pet.targetX = Math.max(minX, Math.min(maxX, worldW * chosenMeta.xRatio));
              pet.targetY = chosenMeta.y;
              pet.facingRight = pet.targetX > pet.x;
              pet.pendingPropAction = {
                msg: chosenMeta.msg.replace(' (+2🌰)', ''),
                soundStyle: chosenMeta.soundStyle,
                rewardAcorns: 0 // 자율 방문은 소리 없이 귀여운 모션 위주
              };
            } else if (rand < 0.65) {
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
            } else if (rand < 0.84) {
              pet.state = 'idle';
              if (pet.spriteImg) pet.spriteImg.src = pet.sprites.base;
            } else {
              if (pet.id === 'hamster') {
                pet.state = 'react';
                pet.reactTimer = 90;
                showPetBubble(pet, '뽀옹! 💨', 2000);
              } else if (pet.id === 'tit') {
                pet.state = 'fly';
                showPetBubble(pet, '파닥파닥 🐤', 2200);
              } else if (pet.id === 'cat') {
                pet.state = 'sleep';
                if (pet.spriteImg) pet.spriteImg.src = pet.sprites.sleep;
                showPetBubble(pet, '식빵 굽는 중... 💤', 2500);
              }
            }
          }

          // 이동 및 프레임 스위칭
          if (pet.state === 'walk') {
            const dx = pet.targetX - pet.x;
            const dy = pet.targetY - pet.y;
            const dist = Math.hypot(dx, dy);
            const speedMult = pet.pendingPropAction ? 1.65 : 1.0;

            if (dist > 4) {
              pet.x += (dx / dist) * pet.vx * speedMult;
              pet.y += (dy / dist) * (pet.vx * 0.65 * speedMult);
              pet.walkStep = (pet.walkStep + 1) % 32;
              const stepFrame = pet.walkStep < 16 ? pet.sprites.walk : pet.sprites.base;
              if (pet.spriteImg && !pet.spriteImg.src.includes(stepFrame)) {
                pet.spriteImg.src = stepFrame;
              }
              pet.waddleOffset = Math.abs(Math.sin(Date.now() / 120)) * 6;
            } else {
              // 목적지 도착! 소품 상호작용 대기 중이면 실행
              if (pet.pendingPropAction) {
                const action = pet.pendingPropAction;
                pet.pendingPropAction = null;
                triggerPetReaction(pet, action.msg);
                const charObj = state.characters.find(c => c.id === pet.id);
                if (action.rewardAcorns > 0) {
                  state.acorns += action.rewardAcorns;
                  updateAcornDisplay();
                  saveState();
                  if (charObj) playCharacterSound(charObj, 0.55, action.soundStyle);
                }
              } else {
                pet.state = 'idle';
                pet.waddleOffset = 0;
                if (pet.spriteImg) pet.spriteImg.src = pet.sprites.base;
              }
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
          if (idx !== oIdx && !pet.pendingPropAction) {
            const dist = Math.hypot(other.x - pet.x, other.y - pet.y);
            if (dist < 62) {
              pet.x += (pet.x > other.x ? 0.35 : -0.35);
            }
          }
        });

        pet.x = Math.max(minX, Math.min(maxX, pet.x));
        pet.y = Math.max(minY, Math.min(maxY, pet.y));

        const depthNorm = Math.min(1, Math.max(0, 1 - (pet.y - minY) / (maxY - minY)));
        const depthScale = 0.78 + depthNorm * 0.32;
        const finalY = pet.y + (pet.waddleOffset || 0);

        let tiltDeg = 0;
        if (pet.state === 'walk') {
          tiltDeg = Math.sin(Date.now() / 140) * 7;
        } else if (pet.state === 'react') {
          tiltDeg = Math.sin(Date.now() / 80) * 10;
        }

        const scaleX = (pet.facingRight ? 1 : -1) * depthScale;
        const scaleY = depthScale;

        pet.dom.style.left = `${Math.round(pet.x)}px`;
        pet.dom.style.bottom = `${Math.round(finalY)}px`;
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
  if (!pet || !pet.bubble) return;
  pet.bubble.textContent = text;
  pet.bubble.classList.add('show');
  setTimeout(() => {
    pet.bubble.classList.remove('show');
  }, duration);
}

// ==========================================
// 4. 개별 캐릭터 다마고치 모달 & 친밀도 레벨업
// ==========================================
function openMascotModal(index) {
  state.activeCharIndex = index;
  const char = state.characters[index];
  const pet = petActors[index];

  triggerPetReaction(pet);
  playCharacterSound(char, 0.7);

  dom.modalMascotImg.src = pet.sprites.react;
  dom.modalMascotName.textContent = char.name;
  dom.modalMascotDesc.textContent = char.desc;
  dom.modalCharBadge.textContent = char.badge;
  dom.modalSoundToggle.checked = char.soundEnabled;
  dom.modalFeedIcon.textContent = char.feedIcon;
  dom.modalFeedLabel.textContent = char.feedLabel;
  dom.modalStatCount.textContent = `교감 ${char.count}회 · Lv.${char.level} ✨`;
  dom.modalHompySpeech.textContent = `"${char.speech}"`;

  renderSoundVariationChips(char);

  dom.mascotModalOverlay.classList.add('open');
  saveState();
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
      playCharacterSound(char, 0.75);
      const pet = petActors[state.activeCharIndex];
      triggerPetReaction(pet);
      updateSoundPackEquippedButtons();
      saveState();
    });
    dom.soundVariationChips.appendChild(btn);
  });
}

function playCharacterSound(char, volume = 0.7, overrideStyle = null) {
  if (!char.soundEnabled && volume !== 0.75) return;
  const style = overrideStyle || char.selectedSound || 'main';

  if (style === 'diy' && state.customAudioDataUrl) {
    const audio = new Audio(state.customAudioDataUrl);
    audio.volume = Math.min(1, Math.max(0.1, volume));
    audio.play().catch(() => {});
    return;
  }

  if (char.soundType === 'fart') synthFart(style, volume);
  else if (char.soundType === 'bird') synthBird(style, volume);
  else if (char.soundType === 'cat') synthCat(style, volume);
}

function triggerPetJump(pet) {
  pet.y += 22;
  pet.dom.style.bottom = `${pet.y}px`;
  setTimeout(() => {
    pet.y -= 22;
    pet.dom.style.bottom = `${pet.y}px`;
  }, 180);
}

function checkCharacterLevelUp(char) {
  const newLevel = Math.min(10, 1 + Math.floor(char.count / 3));
  if (newLevel > char.level) {
    char.level = newLevel;
    char.badge = newLevel >= 5 ? `소울메이트 Lv.${newLevel} 👑` : `절친 레벨 ${newLevel} 💖`;
    if (dom.modalCharBadge) dom.modalCharBadge.textContent = char.badge;
    showToast(`🎉 ${char.name}와(과) 친밀도 Lv.${newLevel} 달성! (+10 🌰)`);
    state.acorns += 10;
    updateAcornDisplay();
  }
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

  dom.modalSoundToggle.addEventListener('change', (e) => {
    const char = state.characters[state.activeCharIndex];
    char.soundEnabled = e.target.checked;
    synthPop(0.3);
    const pet = petActors[state.activeCharIndex];
    if (char.soundEnabled) {
      showPetBubble(pet, '소리 켜짐! 🔊', 2000);
      playCharacterSound(char, 0.75);
      triggerPetReaction(pet);
    } else {
      showPetBubble(pet, '조용 모드 🤫', 2000);
      if (pet.spriteImg) pet.spriteImg.src = pet.sprites.base;
    }
    saveState();
  });

  // 간식 먹이기 버튼 (+도토리 & 친밀도 레벨업)
  dom.btnFeedMascot.addEventListener('click', () => {
    const char = state.characters[state.activeCharIndex];
    const pet = petActors[state.activeCharIndex];
    char.count++;
    state.acorns += 3;
    checkCharacterLevelUp(char);
    updateAcornDisplay();
    dom.modalStatCount.textContent = `교감 ${char.count}회 · Lv.${char.level} ✨`;

    triggerPetReaction(pet, `맛있다 냠냠! ${char.feedIcon} (+3 🌰)`);
    dom.modalMascotImg.src = pet.sprites.react;
    synthPop(0.55);
    saveState();
  });

  // 쓰다듬기 버튼
  dom.btnPetMascot.addEventListener('click', () => {
    const pet = petActors[state.activeCharIndex];
    const char = state.characters[state.activeCharIndex];
    char.count++;
    state.acorns += 1;
    checkCharacterLevelUp(char);
    updateAcornDisplay();
    dom.modalStatCount.textContent = `교감 ${char.count}회 · Lv.${char.level} ✨`;

    triggerPetReaction(pet, '쓰담쓰담 행복해 💖 (+1 🌰)');
    dom.modalMascotImg.src = pet.sprites.react;
    if (char.soundType === 'cat') synthCat('soft', 0.8);
    else synthPop(0.5);
    saveState();
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
// 5. 미니홈피 꾸미기, 실시간 업적 해금 & 리더보드 연동
// ==========================================
function initDecorModal() {
  dom.btnOpenDecor.addEventListener('click', () => {
    updateProgressionAndLeaderboard(false);
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

  document.querySelectorAll('.theme-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const theme = chip.getAttribute('data-theme');

      if (chip.classList.contains('locked')) {
        showToast(`🔒 꾹 참음 15회 달성 시 해금돼요! (현재 ${state.counts.hold}회)`);
        synthPop(0.15);
        return;
      }

      applyThemeToDOM(theme);
      saveState();
      synthPop(0.3);
    });
  });

  // 상단 테마/시간대 뱃지 클릭 시 시간대별 배경 즉시 순환 전환 (자동 -> 낮 -> 노을 -> 밤 -> 미니룸)
  if (dom.worldThemeBadge) {
    dom.worldThemeBadge.addEventListener('click', () => {
      const cycleOrder = ['auto', 'meadow', 'sunset', 'night', 'room'];
      const curIdx = cycleOrder.indexOf(state.currentTheme);
      const nextTheme = cycleOrder[(curIdx + 1) % cycleOrder.length];
      applyThemeToDOM(nextTheme);
      saveState();
      synthPop(0.25);
      showToast(`🕒 배경 전환: ${dom.worldThemeBadge.textContent}`);
    });
  }

  document.querySelectorAll('.prop-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      const propId = btn.getAttribute('data-prop');
      const isOn = btn.classList.contains('active');
      state.activeProps[propId] = isOn;
      const propDom = document.getElementById(propId);
      if (propDom) {
        propDom.classList.toggle('hidden', !isOn);
      }
      saveState();
      synthPop(0.3);
    });
  });
}

// ==========================================
// 5.1 비밀 수집품 상세 모달 및 실시간 해금/리더보드 엔진
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
    rarity: '💮 최고 칭찬 인증',
    img: 'assets/collectibles/stamp.png',
    lore: '주머니 속에서 소리를 가장 우아하고 결연하게 참아낸 평정심의 마스터에게 선생님이 찍어주는 빨간 참 잘했어요 도장!',
    cond: '전국 참음왕 TOP 10 (참음 10회) 달성 시 해금',
    unlocked: false
  }
};

function updateProgressionAndLeaderboard(notifyOnUnlock = true) {
  const holdCount = state.counts.hold;
  // 기본 누적 7회 + 오늘의 holdCount로 전국 순위 산정
  const totalHoldScore = 7 + holdCount;

  // 1) 네온빛 도시 테마 해금 체크 (꾹참 15회 또는 누적 22회 이상)
  const cityChip = document.querySelector('.theme-chip[data-theme="city"]');
  if (cityChip && holdCount >= 15) {
    if (cityChip.classList.contains('locked')) {
      cityChip.classList.remove('locked');
      cityChip.textContent = '🏙️ 네온빛 도시';
      if (notifyOnUnlock) showToast('🎉 [네온빛 도시] 배경 테마가 해금되었습니다!');
    }
  }

  // 2) 전국 순위 계산 (1위: 23회, 2위: 19회, 3위: 18회)
  const rivals = [
    { name: '불굴의 의지 햄찌', region: '서울 강남구', score: 23, avatar: '🐹', badge: '참음왕 👑' },
    { name: '무표정 식빵 뚱냥', region: '부산 해운대구', score: 19, avatar: '🐱', badge: '인내신 🥈' },
    { name: '솜뭉치 참기장인', region: '대전 유성구', score: 18, avatar: '🐤', badge: '평정심 🥉' },
    { name: '소심한 옥수수 햄찌 (나)', region: '내 주머니 속', score: totalHoldScore, avatar: '👑', badge: '도전자 ✨', isMe: true }
  ];

  rivals.sort((a, b) => b.score - a.score);
  const myIndex = rivals.findIndex(r => r.isMe);
  let myRank = 14;
  if (totalHoldScore >= 24) myRank = 1;
  else if (totalHoldScore >= 20) myRank = 2;
  else if (totalHoldScore >= 18) myRank = 3;
  else myRank = Math.max(4, 21 - totalHoldScore);

  const topPercent = myRank === 1 ? '0.1%' : myRank <= 3 ? '0.5%' : myRank <= 10 ? '1.5%' : '3%';

  if (dom.myRankBanner) {
    dom.myRankBanner.innerHTML = `
      <div class="my-rank-pos">내 순위: <strong>${myRank}등</strong> (상위 ${topPercent})</div>
      <div class="my-rank-detail">소심한 옥수수 햄찌 #402 · 누적 참음 ${totalHoldScore}회 (오늘 ${holdCount}회) 💮</div>
    `;
  }

  // 리더보드 리스트 동적 렌더링
  if (dom.rankList) {
    const medalClasses = ['gold', 'silver', 'bronze'];
    dom.rankList.innerHTML = rivals.slice(0, 4).map((r, i) => {
      const rankNum = r.isMe ? myRank : (i + 1);
      const cls = i < 3 ? medalClasses[i] : '';
      const meCls = r.isMe ? 'me-highlight' : '';
      const badgeTxt = i === 0 ? '참음왕 👑' : i === 1 ? '인내신 🥈' : i === 2 ? '평정심 🥉' : `전국 ${myRank}위 🔥`;
      return `
        <div class="rank-item ${cls} ${meCls}">
          <span class="rank-num">${rankNum}</span>
          <span class="rank-avatar">${r.avatar}</span>
          <div class="rank-user">
            <strong>${r.name}</strong>
            <small>${r.region} · 참음 ${r.score}회</small>
          </div>
          <span class="rank-badge">${badgeTxt}</span>
        </div>
      `;
    }).join('');
  }

  // 3) TOP 10 진입 시 '참 잘했어요 도장' 수집품 및 업적 해금
  const isTop10 = myRank <= 10 || holdCount >= 10;
  collectiblesData.stamp.unlocked = isTop10;
  collectiblesData.stamp.cond = isTop10
    ? `전국 참음왕 ${myRank}등 달성 해금 완료! 💮`
    : `전국 참음왕 TOP 10 달성 시 해금 (현재 ${myRank}등 🔒)`;

  const stampSlot = document.querySelector('.collectible-slot[data-item="stamp"]');
  if (stampSlot && isTop10) {
    const wasLocked = stampSlot.classList.contains('locked');
    stampSlot.classList.remove('locked');
    stampSlot.classList.add('unlocked');
    const img = stampSlot.querySelector('.collect-img');
    if (img) img.classList.remove('locked-filter');
    const status = stampSlot.querySelector('.collect-status');
    if (status) {
      status.classList.remove('lock-text');
      status.textContent = '도장 획득 💮';
    }
    const badgeCountStrong = document.querySelector('.collect-count-badge strong');
    if (badgeCountStrong) badgeCountStrong.textContent = '9';
    if (wasLocked && notifyOnUnlock) {
      showToast('💮 [참 잘했어요 도장] 비밀 보물이 해금되었습니다!');
    }
  }

  const lockedAchievePill = document.querySelector('.achievement-pills .achieve-pill.locked');
  if (lockedAchievePill && isTop10) {
    lockedAchievePill.classList.remove('locked');
    lockedAchievePill.classList.add('unlocked');
    lockedAchievePill.textContent = '💮 전국 참음왕 TOP 10 달성!';
    state.unlockedAchievements = 8;
  }
  if (dom.userAchievements) {
    dom.userAchievements.textContent = `${isTop10 ? 8 : 6}/10`;
  }
}

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

// ==========================================
// 5.2 작전 설정 & 백그라운드 불시 타이머 스케줄러 (코어 1단계)
// ==========================================
const timeWindowPresets = [
  '09:00 ~ 18:00',
  '13:00 ~ 22:00',
  '24시간 상시 작전'
];

let nextTriggerSeconds = 28;

function getRandomIntervalForFreq(freq) {
  if (freq === 'thrill') return 12 + Math.floor(Math.random() * 11); // 12~22초
  if (freq === 'quiet') return 45 + Math.floor(Math.random() * 25);  // 45~70초
  return 24 + Math.floor(Math.random() * 16);                        // 24~40초
}

function startBackgroundScheduler() {
  nextTriggerSeconds = getRandomIntervalForFreq(state.frequency);
  updateSchedulerStatusText();

  setInterval(() => {
    if (!state.operationOn || state.emergencyEscape) {
      updateSchedulerStatusText();
      return;
    }

    nextTriggerSeconds--;
    if (nextTriggerSeconds <= 0) {
      triggerRandomPetSound();
      nextTriggerSeconds = getRandomIntervalForFreq(state.frequency);
    }
    updateSchedulerStatusText();
  }, 1000);
}

function updateSchedulerStatusText() {
  if (!dom.nextTriggerStatus) return;
  if (state.emergencyEscape) {
    dom.nextTriggerStatus.textContent = '🥶 긴급탈출 발동 중 (타이머 일시정지)';
    return;
  }
  if (!state.operationOn) {
    dom.nextTriggerStatus.textContent = '⏸️ 불시 작전이 꺼져 있습니다.';
    return;
  }
  dom.nextTriggerStatus.textContent = `⏱️ 다음 불시 신호: ${nextTriggerSeconds}초 후 (${state.timeWindow})`;
}

function initSettingsModal() {
  dom.btnOpenSettings.addEventListener('click', () => {
    updateSchedulerStatusText();
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

  // 불시 작전 가동 토글
  if (dom.operationToggle) {
    dom.operationToggle.addEventListener('change', (e) => {
      state.operationOn = e.target.checked;
      updateSchedulerStatusText();
      saveState();
      showToast(state.operationOn ? '🚀 불시 작전 타이머 가동!' : '⏸️ 불시 작전 일시중지');
      synthPop(0.25);
    });
  }

  // 작전 시간대 변경 버튼 연결
  if (dom.btnChangeTime) {
    dom.btnChangeTime.addEventListener('click', () => {
      const idx = timeWindowPresets.indexOf(state.timeWindow);
      state.timeWindow = timeWindowPresets[(idx + 1) % timeWindowPresets.length];
      if (dom.timeRangeBadge) dom.timeRangeBadge.textContent = state.timeWindow;
      updateSchedulerStatusText();
      saveState();
      synthPop(0.25);
    });
  }

  // 매너 모드 설정
  const mannerBtns = document.querySelectorAll('.manner-btn');
  mannerBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      mannerBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.mannerMode = btn.getAttribute('data-mode');
      saveState();
      synthPop(0.2);
    });
  });

  // 빈도 칩
  document.querySelectorAll('.frequency-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.frequency-chips .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.frequency = chip.getAttribute('data-freq');
      nextTriggerSeconds = getRandomIntervalForFreq(state.frequency);
      updateSchedulerStatusText();
      saveState();
      synthPop(0.2);
    });
  });

  // 불시 타이머 강제 발사
  dom.btnSimulateTrigger.addEventListener('click', () => {
    triggerRandomPetSound();
    nextTriggerSeconds = getRandomIntervalForFreq(state.frequency);
    updateSchedulerStatusText();
  });

  // 데이터 초기화 버튼
  if (dom.btnResetData) {
    dom.btnResetData.addEventListener('click', () => {
      if (confirm('저장된 도토리, 방구/참음 기록, 꾸미기 데이터를 초기 상태로 되돌릴까요?')) {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
      }
    });
  }
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
    updateSchedulerStatusText();
    syncNativeForegroundService();
    synthPop(0.4);
  });
}

// 불시 소리 발생 트리거 (모드별 대담/소심/참음 로직 + 도토리 보상 & 리더보드 갱신)
function triggerRandomPetSound() {
  if (state.emergencyEscape) return;

  const activeChars = state.characters.filter(c => c.soundEnabled);
  if (activeChars.length === 0) {
    showToast('🤫 모든 캐릭터 소리가 OFF 상태예요!');
    return;
  }

  const chosenChar = activeChars[Math.floor(Math.random() * activeChars.length)];
  const pet = petActors.find(p => p.id === chosenChar.id);

  if (state.mannerMode === 'sound') {
    playCharacterSound(chosenChar, 0.75);
    state.counts.loud++;
    state.acorns += 3;
    dom.countLoud.textContent = `${state.counts.loud}회`;
    if (pet) triggerPetReaction(pet, '대담하게 발사! 💥 (+3🌰)');

  } else if (state.mannerMode === 'vibrate') {
    playCharacterSound(chosenChar, 0.22, 'soft');
    if (navigator.vibrate) navigator.vibrate([80, 40, 120]);
    state.counts.soft++;
    state.acorns += 3;
    dom.countSoft.textContent = `${state.counts.soft}회`;
    if (pet) triggerPetReaction(pet, '소심하게 피식... 🫧 (+3🌰)');

  } else if (state.mannerMode === 'silent') {
    state.counts.hold++;
    state.acorns += 5;
    dom.countHold.textContent = `${state.counts.hold}회`;
    if (pet) triggerPetReaction(pet, '윽! 꾹 참았다 🤫 (+5🌰)');
    synthPop(0.25);
  }

  updateAcornDisplay();
  updateProgressionAndLeaderboard(true);
  saveState();
}

// ==========================================
// 5.3 소리 연구소 9종 프리셋 & 3초 DIY 녹음기 장착
// ==========================================
let mediaRecorder = null;
let audioChunks = [];

function updateSoundPackEquippedButtons() {
  document.querySelectorAll('.sound-card').forEach(card => {
    const charId = card.getAttribute('data-char-id');
    const style = card.getAttribute('data-style');
    const equipBtn = card.querySelector('.btn-equip-sound');
    const charObj = state.characters.find(c => c.id === charId);
    if (equipBtn && charObj) {
      const isEquipped = charObj.selectedSound === style;
      equipBtn.classList.toggle('equipped', isEquipped);
      equipBtn.textContent = isEquipped ? '✓ 장착중' : '장착';
    }
  });
}

function initDIYRecorder() {
  // 9종 사운드 카드 재생 및 장착 이벤트
  document.querySelectorAll('.sound-card').forEach(card => {
    const charId = card.getAttribute('data-char-id');
    const style = card.getAttribute('data-style');
    const playBtn = card.querySelector('.btn-play-sound');
    const equipBtn = card.querySelector('.btn-equip-sound');

    if (playBtn) {
      playBtn.addEventListener('click', () => {
        if (charId === 'hamster') synthFart(style, 0.75);
        else if (charId === 'tit') synthBird(style, 0.75);
        else if (charId === 'cat') synthCat(style, 0.75);
      });
    }

    if (equipBtn) {
      equipBtn.addEventListener('click', () => {
        const charObj = state.characters.find(c => c.id === charId);
        if (!charObj) return;
        charObj.selectedSound = style;
        playCharacterSound(charObj, 0.75);
        updateSoundPackEquippedButtons();
        saveState();
        showToast(`🎵 [${charObj.name}] 소리가 변경되었어요!`);
      });
    }
  });

  // 3초 마이크 녹음 (Base64 변환 후 localStorage 영구 저장)
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
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          state.customAudioDataUrl = reader.result;
          ensureDiySoundOption();
          saveState();
          dom.recordedPreview.style.display = 'flex';
          if (dom.recordedLabel) {
            const timeStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
            dom.recordedLabel.textContent = `내 녹음 완료 (${timeStr} 저장됨)`;
          }
          showToast('🎙️ 3초 비밀 녹음이 저장되었습니다!');
        };
        reader.readAsDataURL(blob);

        dom.btnRecord.classList.remove('recording');
        dom.recText.textContent = '꾹 눌러 3초 녹음';
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      dom.btnRecord.classList.add('recording');
      dom.recText.textContent = '🔴 녹음 중... (3초)';

      setTimeout(() => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 3000);

    } catch (err) {
      alert('마이크 접근 권한을 허용해 주세요.');
    }
  });

  dom.btnPlayRecorded.addEventListener('click', () => {
    if (state.customAudioDataUrl) {
      const audio = new Audio(state.customAudioDataUrl);
      audio.play();
    }
  });

  if (dom.btnEquipRecorded) {
    dom.btnEquipRecorded.addEventListener('click', () => {
      if (!state.customAudioDataUrl) return;
      ensureDiySoundOption();
      const char = state.characters[state.activeCharIndex];
      char.selectedSound = 'diy';
      updateSoundPackEquippedButtons();
      saveState();
      showToast(`🎙️ [${char.name}]에게 내 3초 녹음 소리를 장착했어요!`);
      const audio = new Audio(state.customAudioDataUrl);
      audio.play();
    });
  }
}

// ==========================================
// 6. 온디바이스 절차적 크레용 캔버스 렌더러 (9:16 그림일기)
// ==========================================
function initDiaryControls() {
  document.querySelectorAll('.weather-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.weather-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.diaryWeather = chip.getAttribute('data-weather');
      saveState();
      renderStoryCanvas();
      synthPop(0.2);
    });
  });

  if (dom.diaryCustomNote) {
    dom.diaryCustomNote.addEventListener('input', (e) => {
      state.diaryNote = e.target.value;
      saveState();
      renderStoryCanvas();
    });
  }
}

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

  // 3. 헤더 날짜 & 커스텀 날씨
  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
  
  ctx.fillStyle = '#242220';
  ctx.font = 'bold 44px "Gaegu", cursive';
  ctx.textAlign = 'left';
  ctx.fillText(dateStr, 90, 125);

  ctx.textAlign = 'right';
  ctx.fillText(`날씨: ${state.diaryWeather || '💨 뿡뿡'}`, w - 90, 125);

  drawCrayonLine(ctx, 80, 155, w - 80, 155, '#242220', 4);

  // 4. 제목
  ctx.textAlign = 'center';
  ctx.font = 'bold 78px "Jua", sans-serif';
  ctx.fillStyle = '#242220';
  ctx.fillText('나의 비밀 방귀 일기장!', w / 2, 265);

  drawCrayonSquiggle(ctx, w / 2 - 340, 298, 680, '#FED36A');

  // 5. 그림 영역 프레임 (3총사 합동 등장)
  ctx.save();
  ctx.fillStyle = '#F7FBF8';
  ctx.strokeStyle = '#242220';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(110, 340, w - 220, 520, [28]);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  const currentChar = state.characters[state.activeCharIndex];
  const mascotImg = state.cachedImages[currentChar.img];
  const subImgs = state.characters
    .filter((_, idx) => idx !== state.activeCharIndex)
    .map(c => state.cachedImages[c.img]);

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

    // 칭호 박스 (칸 내부 폭에 맞춰 안전 렌더링)
    ctx.save();
    ctx.fillStyle = '#FFF9DB';
    ctx.strokeStyle = '#242220';
    ctx.lineWidth = 4;
    const badgeY = 900;
    ctx.beginPath();
    ctx.roundRect(110, badgeY, w - 220, 82, [20]);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#242220';
    ctx.font = 'bold 40px "Jua", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`[ 오늘의 칭호: ${titleBadge} ]`, w / 2, badgeY + 54, w - 260);
    ctx.restore();

    // 3단계 스코어카드 박스
    const scoreBoxY = 1010;
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#242220';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(110, scoreBoxY, w - 220, 390, [24]);
    ctx.fill();
    ctx.stroke();

    const maxScoreTextW = w - 380;
    drawCrayonCheckbox(ctx, 155, scoreBoxY + 66, true);
    ctx.font = 'bold 44px "Gaegu", cursive';
    ctx.fillStyle = '#242220';
    ctx.textAlign = 'left';
    ctx.fillText(`대담하게 발사 : ${state.counts.loud}회 (뿡뿡! 💥)`, 220, scoreBoxY + 86, maxScoreTextW);

    drawCrayonCheckbox(ctx, 155, scoreBoxY + 180, true);
    ctx.fillText(`소심하게 발사 : ${state.counts.soft}회 (피식... 🫧)`, 220, scoreBoxY + 200, maxScoreTextW);

    drawCrayonCheckbox(ctx, 155, scoreBoxY + 294, true);
    ctx.fillText(`눈치보며 참음 : ${state.counts.hold}회 (윽! 참았다 🤫)`, 220, scoreBoxY + 314, maxScoreTextW);
    ctx.restore();

    // 오늘의 한줄 원고지 노트 (자동 줄바꿈 & 칸 이탈 완전 방지)
    const noteY = 1440;
    const noteBoxH = 260;
    ctx.save();
    ctx.fillStyle = '#FFFDF0';
    ctx.strokeStyle = '#242220';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.roundRect(110, noteY, w - 220, noteBoxH, [20]);
    ctx.fill();
    ctx.stroke();

    // 클리핑 영역 설정 (절대로 박스 밖으로 글자가 삐져나가지 않도록 보장)
    ctx.beginPath();
    ctx.roundRect(118, noteY + 8, w - 236, noteBoxH - 16, [16]);
    ctx.clip();

    ctx.fillStyle = '#888';
    ctx.font = 'bold 32px "Jua", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('✏️ 오늘의 비밀 일기:', 145, noteY + 52);

    const rawNote = `"${state.diaryNote || '오늘도 주머니 속에서 평화를 지켰다!'}"`;
    ctx.fillStyle = '#242220';
    ctx.font = 'bold 40px "Gaegu", cursive';

    const maxNoteWidth = w - 290; // 790px
    const wrappedLines = wrapCanvasText(ctx, rawNote, maxNoteWidth);

    // 최대 2줄 원고지 밑줄 및 텍스트 출력
    wrappedLines.slice(0, 2).forEach((lineStr, idx) => {
      const lineY = noteY + 122 + idx * 72;
      ctx.fillText(lineStr, 145, lineY, maxNoteWidth);
      drawCrayonLine(ctx, 145, lineY + 16, w - 145, lineY + 16, '#D5CEBE', 2.5);
    });
    ctx.restore();

    // 도장 쾅
    drawCrayonRubberStamp(ctx, w - 235, scoreBoxY + 340, stampTitle, stampSubtitle, stampColor, -12);

    // 워터마크 태그
    ctx.font = 'bold 34px "Gaegu", cursive';
    ctx.fillStyle = '#888';
    ctx.textAlign = 'center';
    ctx.fillText(`@방구뿡   #도토리${state.acorns}개   #다마고치아지트`, w / 2, h - 85, w - 180);
  };

  if (mascotImg && mascotImg.complete) {
    drawMascotAndRest(ctx, mascotImg, subImgs, w, drawCardBody);
  } else {
    const tempImg = new Image();
    tempImg.src = currentChar.img;
    tempImg.onload = () => {
      state.cachedImages[currentChar.img] = tempImg;
      drawMascotAndRest(ctx, tempImg, subImgs, w, drawCardBody);
    };
  }
}

// 캔버스 텍스트 자동 줄바꿈 헬퍼 (칸 밖으로 넘침 방지)
function wrapCanvasText(ctx, text, maxWidth) {
  const lines = [];
  let currentLine = '';
  for (const ch of text) {
    const testLine = currentLine + ch;
    if (ctx.measureText(testLine).width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = ch;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

// 원본 이미지의 좌우 비율(naturalWidth / naturalHeight)을 100% 보존하여 그리는 헬퍼
function drawImagePreservingAspect(ctx, img, centerX, bottomY, targetHeight) {
  if (!img) return { x: centerX, y: bottomY, w: 0, h: 0 };
  const nw = img.naturalWidth || img.width || 100;
  const nh = img.naturalHeight || img.height || 100;
  const aspect = nw / nh;
  const drawH = targetHeight;
  const drawW = drawH * aspect;
  const drawX = centerX - drawW / 2;
  const drawY = bottomY - drawH;
  ctx.drawImage(img, drawX, drawY, drawW, drawH);
  return { x: drawX, y: drawY, w: drawW, h: drawH };
}

function drawMascotAndRest(ctx, mainImg, subImgs, w, callback) {
  ctx.save();
  ctx.shadowColor = 'rgba(40, 37, 35, 0.22)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 8;

  // 양옆 서브 친구들 그리기 (원본 좌우 비율 100% 유지)
  if (subImgs[0] && subImgs[0].complete) {
    drawImagePreservingAspect(ctx, subImgs[0], 275, 765, 225);
  }
  if (subImgs[1] && subImgs[1].complete) {
    drawImagePreservingAspect(ctx, subImgs[1], w - 275, 765, 225);
  }

  // 중앙 주인공 캐릭터 그리기 (원본 좌우 비율 100% 유지)
  const mainRect = drawImagePreservingAspect(ctx, mainImg, w / 2, 805, 360);
  ctx.restore();

  drawCrayonCloud(ctx, mainRect.x + mainRect.w - 30, mainRect.y + mainRect.h - 75, '#95D5B2');

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

// 9:16 인스타 스토리 저장 및 모바일 네이티브 공유(Web Share API) 지원
document.getElementById('btnShareStory').addEventListener('click', () => {
  renderStoryCanvas();
  dom.storyCanvas.toBlob(async blob => {
    if (!blob) return;
    const fileName = `banggu_bboong_story_${Date.now()}.png`;
    const file = new File([blob], fileName, { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: '방구뿡 비밀 그림일기',
          text: state.diaryNote,
          files: [file]
        });
        showToast('📸 스토리 공유 완료!');
        return;
      } catch (err) {
        // 사용자가 공유 창을 닫은 경우 다운로드로 폴백하지 않음
        if (err.name === 'AbortError') return;
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('📸 9:16 그림일기 이미지가 저장되었습니다!');
  });
});

document.getElementById('btnRedrawCanvas').addEventListener('click', () => {
  renderStoryCanvas();
  synthPop(0.3);
  showToast('🎨 크레용 그림일기를 새로 그렸어요!');
});
