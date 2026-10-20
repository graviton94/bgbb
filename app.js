/**
 * 방구뿡 (Bang-gu Bboong) V5 - 주머니 속 다마고치 아지트
 *
 * 핵심 루프: 정해둔 작전 시간대 안에서 하루 N회, 주머니 속 친구 하나가 불시에 소리를 낸다.
 * 그 순간 폰이 소리 모드면 "대담", 진동이면 "소심", 무음이면 "꾹참"으로 기록되고 도토리를 준다.
 * 도토리로 아지트 소품을 사고, 진짜 기록으로 보물을 모으고, 하루를 그림일기로 남긴다.
 *
 * 안드로이드 앱에서는 window.BgbbNative(AlarmManager)가 앱이 꺼져 있어도 작전을 실행하고,
 * JS 는 앱을 열 때 그동안의 기록만 받아온다. 브라우저에서는 열려 있는 동안 JS 가 직접 흉내 낸다.
 */
'use strict';

const STORAGE_KEY = 'BGBB_STATE_V5';
const LEGACY_STORAGE_KEY = 'BGBB_STATE_V4';
const native = window.BgbbNative || null;

// ==========================================
// 1. 고정 데이터
// ==========================================
const CHARACTERS = [
  {
    id: 'hamster',
    name: '방구 햄찌',
    desc: '소리: 뽀옹, 삐용, 부르르릉!',
    soundFile: 'fart',
    speech: '오늘도 주머니에서 몰래 뿡! 💨',
    feedIcon: '🌻',
    feedLabel: '해바라기씨 주기',
    tapLine: '뿌우웅! 💨💖',
    sounds: {
      main: { chip: '기본 뿡 💨', icon: '💨', title: '시원한 오리지널 뿡!', sub: '기본음 (저음 진동+버블)' },
      soft: { chip: '소심 삐용 🫧', icon: '🫧', title: '소심한 삐용 피식~', sub: '소심음 (바람 새는 소리)' },
      loud: { chip: '대폭발 뿡 💥', icon: '💥', title: '우렁찬 대폭발 부르르릉!', sub: '우렁찬음 (2단 중저음)' }
    },
    sprites: {
      base: 'assets/hamster.webp',
      walk: 'assets/sprites/hamster_walk.webp',
      react: 'assets/sprites/hamster_jump.webp',
      sleep: 'assets/sprites/hamster_sleep.webp'
    }
  },
  {
    id: 'tit',
    name: '솜뭉치 오목눈이',
    desc: '소리: 포로롱, 파닥, 째애액!',
    soundFile: 'tit',
    speech: '짹짹! 솜뭉치처럼 가볍게 날아요 🐤',
    feedIcon: '🌾',
    feedLabel: '좁쌀 먹이기',
    tapLine: '짹짹! 🎵💖',
    sounds: {
      main: { chip: '포로롱 짹 🐤', icon: '🐤', title: '포로롱 짹짹! (2연타)', sub: '기본음 (맑은 지저귐)' },
      soft: { chip: '깃털 파닥 🪶', icon: '🪶', title: '파닥파닥 깃털 날개짓', sub: '소심음 (부드러운 공기음)' },
      loud: { chip: '비명 짹! 🔊', icon: '🔊', title: '비명 째애액! (호출음)', sub: '우렁찬음 (고음 트릴)' }
    },
    sprites: {
      base: 'assets/tit.webp',
      walk: 'assets/sprites/tit_hop.webp',
      fly: 'assets/sprites/tit_fly.webp',
      react: 'assets/sprites/tit_sing.webp',
      sleep: 'assets/tit.webp'
    }
  },
  {
    id: 'cat',
    name: '시크 뚱냥이',
    desc: '소리: 냐아옹, 골골송, 캬아악!',
    soundFile: 'cat',
    speech: '만사 귀찮다옹... 불시에 야옹! 🐱',
    feedIcon: '🐟',
    feedLabel: '츄르 먹이기',
    tapLine: '냐아앙~ 🐾💖',
    sounds: {
      main: { chip: '시크 냐옹 🐱', icon: '🐱', title: '시크한 냐아옹~', sub: '기본음 (억양 울음)' },
      soft: { chip: '골골송 💤', icon: '💤', title: '그르릉 골골송', sub: '소심음 (저음 진동)' },
      loud: { chip: '하악질 💢', icon: '💢', title: '캬아악! 매운 하악질', sub: '우렁찬음 (하악)' }
    },
    sprites: {
      base: 'assets/cat.webp',
      walk: 'assets/sprites/cat_walk.webp',
      react: 'assets/sprites/cat_play.webp',
      sleep: 'assets/sprites/cat_sit.webp'
    }
  }
];
const charById = id => CHARACTERS.find(c => c.id === id);

// 아지트 소품: 배치 버튼, 캐릭터가 놀러 가는 위치, 가격(0 = 기본 제공)
const PROPS = {
  propCarrot:    { label: '당근 밭',  img: 'carrot',    pet: 'hamster', xRatio: 0.08, y: 78,  style: 'main', msg: '영차! 당근 뽑다가 뿡! 🥕💨' },
  propSunflower: { label: '해바라기', img: 'sunflower', pet: 'tit',     xRatio: 0.24, y: 120, style: 'main', msg: '해바라기씨 콕콕 맛있다짹! 🌻🐤' },
  propBox:       { label: '냥이상자', img: 'box',       pet: 'cat',     xRatio: 0.76, y: 95,  style: 'soft', msg: '역시 좁은 택배 상자가 최고다옹 📦🐱' },
  propTent:      { label: '꼬마텐트', img: 'tent',      pet: 'hamster', xRatio: 0.12, y: 138, style: 'soft', msg: '인디언 텐트 속에서 비밀 작전 회의! ⛺' },
  propBalloon:   { label: '방구풍선', img: 'balloon',   pet: 'hamster', xRatio: 0.74, y: 150, style: 'soft', msg: '방구 풍선이 부풀어 오른다 뽀옹~! 🎈💨' },
  propBench:     { label: '통나무',   img: 'bench',     pet: 'tit',     xRatio: 0.46, y: 112, style: 'main', msg: '통나무 벤치에서 포로롱 휴식! 🪵🎵' },
  propCampfire:  { label: '모닥불',   img: 'campfire',  pet: 'hamster', xRatio: 0.46, y: 78,  style: 'loud', msg: '군고구마 구워 먹으니 배가 꾸르륵🔥🍠' },
  propChuru:     { label: '황금츄르', img: 'churu',     pet: 'cat',     xRatio: 0.65, y: 76,  style: 'main', msg: '황금 츄르 핥짝핥짝! 갸르릉~ 🐟💖' },
  propMat:       { label: '돗자리',   img: 'mat',       pet: 'cat',     xRatio: 0.22, y: 76,  style: 'soft', msg: '피크닉 돗자리 위에서 데구르르~ 🌸💤', price: 30 },
  propTree:      { label: '큰나무',   img: 'tree',      pet: 'tit',     xRatio: 0.78, y: 140, style: 'loud', msg: '크레용 큰나무 꼭대기에서 노래해요! 🌳🐤', price: 60 }
};

const THEME_NAMES = {
  meadow: '☀️ 낮 · 산들바람 초원',
  sunset: '🌇 저녁 · 노을빛 언덕',
  night: '🌙 밤 · 별빛 밤하늘',
  room: '🏠 실내 · 아늑한 미니룸',
  city: '🏙️ 심야 · 네온빛 밤거리'
};
const CITY_UNLOCK_HOLDS = 15;

// 작전 결과별 표시 & 보상
const MODES = {
  loud: { label: '대담', emoji: '💥', reward: 3, line: '대담하게 발사! 💥' },
  soft: { label: '소심', emoji: '🫧', reward: 3, line: '소심하게 피식... 🫧' },
  hold: { label: '꾹참', emoji: '🤫', reward: 5, line: '윽! 꾹 참았다 🤫' }
};
// 쓰다듬기·간식·소품 터치로 얻는 도토리는 하루 상한이 있다 (주 수입원은 주머니 속 작전)
const DAILY_TAP_ACORNS = 15;

// 보물: 실제 기록으로만 열린다
const COLLECTIBLES = [
  { id: 'acorn', title: '황금 도토리', rarity: '🌟 전설의 보물', cond: '친구에게 처음 간식 주기',
    lore: '햄찌가 주머니 깊숙한 곳에서 발견한 황금빛 도토리! 지니고 있으면 행운의 방구 쉴드가 생겨요.',
    check: s => s.flags.fed },
  { id: 'sweet_potato', title: '노릇 군고구마', rarity: '🍠 천연 가스 유발제', cond: '불시 작전 누적 5회',
    lore: '방구 생성율 300% 증가! 햄찌와 뚱냥이가 나눠 먹으면 주머니가 들썩거려요.',
    check: s => s.totals.all >= 5 },
  { id: 'whoopee', title: '방구 방석', rarity: '💨 전설의 장난감', cond: '소리 모드에서 대담하게 5회',
    lore: '앉는 순간 "뽀오오옹~!" 회의실 분위기를 단번에 깨는 고전 명작 장난감!',
    check: s => s.totals.loud >= 5 },
  { id: 'spray', title: '피치 탈취제', rarity: '🍑 에티켓 필수품', cond: '진동 모드에서 소심하게 5회',
    lore: '몰래 뿡! 직후 슉슉 뿌려 위장하는 비밀 요원 전용 복숭아 향수.',
    check: s => s.totals.soft >= 5 },
  { id: 'trophy', title: '참음왕 트로피', rarity: '👑 챔피언 트로피', cond: '무음 모드에서 누적 10회 꾹 참기',
    lore: '조용한 회의실에서 배가 꼬르륵거릴 때 끝까지 참아낸 자에게 주어지는 영예!',
    check: s => s.totals.hold >= 10 },
  { id: 'stamp', title: '참 잘했어요', rarity: '💮 최고 칭찬 인증', cond: '하루에 5회 꾹 참기',
    lore: '하루 종일 소리를 우아하게 참아낸 평정심의 마스터에게 찍어주는 빨간 도장!',
    check: s => s.bestHoldDay >= 5 },
  { id: 'key', title: '비밀 열쇠', rarity: '🗝️ 마스터 키', cond: '그림일기 3번 저장/공유',
    lore: '친구들의 흑역사와 은밀한 방구 기록이 적힌 다이어리의 하트 열쇠.',
    check: s => s.diarySaves >= 3 },
  { id: 'mat', title: '벚꽃 돗자리', rarity: '🌸 아지트 가구', cond: '아지트 돗자리 구매 (🌰30)',
    lore: '봄바람 부는 언덕에 깔아두면 친구들이 옹기종기 모여 낮잠을 자요.',
    check: s => s.owned.propMat },
  { id: 'tree', title: '크레용 수호목', rarity: '🌳 아지트 랜드마크', cond: '아지트 큰나무 구매 (🌰60)',
    lore: '오목눈이가 높은 가지에 둥지를 틀고 비밀 소리를 노래하는 든든한 큰나무!',
    check: s => s.owned.propTree }
];

// ==========================================
// 2. 상태 & 저장
// ==========================================
function freshState() {
  const chars = {};
  CHARACTERS.forEach(c => { chars[c.id] = { enabled: true, sound: 'main', bond: 0 }; });
  const props = {};
  Object.keys(PROPS).forEach(id => { props[id] = !PROPS[id].price; });
  return {
    chars,
    activeChar: 0,
    theme: 'auto',
    props,
    owned: { propMat: false, propTree: false },
    schedule: { on: true, start: 9, end: 18, freq: 'normal' },
    frozen: false,
    testMode: 'loud',            // 웹 미리보기에서 흉내 낼 폰 상태
    acorns: 0,
    days: {},                    // 'YYYY-MM-DD' → { loud, soft, hold, tap }
    flags: { fed: false },
    diary: { weather: '💨 뿡뿡', note: '', saves: 0 },
    collected: [],               // 이미 획득 알림을 띄운 보물
    diy: null,                   // 3초 녹음 data URL (재생용)
    webPlan: null,               // 웹 미리보기용 오늘 작전 일정 { day, times }
    scheduleKey: ''              // 마지막으로 적용한 작전 설정 (같으면 일정을 다시 뽑지 않음)
  };
}

const state = freshState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      for (const key of Object.keys(state)) {
        if (!(key in saved)) continue;
        const def = state[key];
        state[key] = def && typeof def === 'object' && !Array.isArray(def) && saved[key]
          ? mergeObject(def, saved[key])
          : saved[key];
      }
      return;
    }
    migrateLegacy();
  } catch (e) {
    console.warn('불러오기 실패:', e);
  }
}

function mergeObject(def, saved) {
  const out = { ...def, ...saved };
  if (def === state.chars) {
    CHARACTERS.forEach(c => { out[c.id] = { ...def[c.id], ...(saved[c.id] || {}) }; });
  }
  return out;
}

// V4 저장본에서 설정만 옮긴다 (V4의 숫자 기록은 대부분 하드코딩된 시작값이라 버린다)
function migrateLegacy() {
  const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) return;
  const old = JSON.parse(raw);
  if (old.currentTheme) state.theme = old.currentTheme;
  if (old.activeProps) {
    Object.keys(state.props).forEach(id => {
      if (!PROPS[id].price && id in old.activeProps) state.props[id] = !!old.activeProps[id];
    });
  }
  if (typeof old.operationOn === 'boolean') state.schedule.on = old.operationOn;
  if (old.frequency) state.schedule.freq = old.frequency;
  if (typeof old.timeWindow === 'string') {
    const m = old.timeWindow.match(/(\d+):\d+\s*~\s*(\d+):\d+/);
    if (m) { state.schedule.start = +m[1]; state.schedule.end = +m[2]; }
    else { state.schedule.start = 0; state.schedule.end = 0; }
  }
  if (old.diaryWeather) state.diary.weather = old.diaryWeather;
  if (typeof old.diaryNote === 'string') state.diary.note = old.diaryNote;
  if (old.customAudioDataUrl) state.diy = old.customAudioDataUrl;
  (old.characters || []).forEach(oc => {
    const c = state.chars[oc.id];
    if (!c) return;
    if (typeof oc.soundEnabled === 'boolean') c.enabled = oc.soundEnabled;
    if (oc.selectedSound) c.sound = oc.selectedSound;
  });
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  saveNow();
}

let saveTimer = null;
function saveState() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 300);
}
function saveNow() {
  clearTimeout(saveTimer);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('저장 실패:', e);
  }
}
window.addEventListener('pagehide', saveNow);

function dayKey(t = Date.now()) {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function dayStats(key = dayKey()) {
  if (!state.days[key]) state.days[key] = { loud: 0, soft: 0, hold: 0, tap: 0 };
  return state.days[key];
}

function computeStats() {
  const totals = { loud: 0, soft: 0, hold: 0, all: 0 };
  let bestHoldDay = 0;
  Object.values(state.days).forEach(d => {
    totals.loud += d.loud; totals.soft += d.soft; totals.hold += d.hold;
    bestHoldDay = Math.max(bestHoldDay, d.hold);
  });
  totals.all = totals.loud + totals.soft + totals.hold;
  return { totals, bestHoldDay, flags: state.flags, owned: state.owned, diarySaves: state.diary.saves };
}

// ==========================================
// 3. 오디오 (효과음은 한 번만 디코딩해서 재사용)
// ==========================================
let audioCtx = null;
const bufferCache = new Map();

function getAudioContext() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
// 브라우저 자동재생 정책: 첫 터치 때 오디오를 깨워둔다
document.addEventListener('pointerdown', () => getAudioContext(), { once: true });

function loadBuffer(url) {
  if (!bufferCache.has(url)) {
    const ctx = getAudioContext();
    const p = fetch(url)
      .then(r => r.arrayBuffer())
      .then(buf => ctx.decodeAudioData(buf));
    p.catch(() => bufferCache.delete(url));
    bufferCache.set(url, p);
  }
  return bufferCache.get(url);
}

function playUrl(url, volume = 0.75) {
  const ctx = getAudioContext();
  const fallback = () => {
    const a = new Audio(url);
    a.volume = Math.min(1, Math.max(0.05, volume));
    a.play().catch(() => {});
  };
  if (!ctx) return fallback();
  loadBuffer(url).then(buffer => {
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buffer;
    gain.gain.value = volume;
    src.connect(gain).connect(ctx.destination);
    src.start();
  }).catch(fallback);
}

function soundUrl(char, style) {
  return `assets/sounds/${char.soundFile}_${style}.m4a`;
}

function playCharacterSound(charId, volume = 0.75, style = null) {
  const char = charById(charId);
  const chosen = style || state.chars[charId].sound;
  if (chosen === 'diy') {
    if (state.diy) playUrl(state.diy, volume);
    return;
  }
  playUrl(soundUrl(char, chosen), volume);
}

// UI 터치용 짧은 "뽁" (파일 없이 합성)
function synthPop(volume = 0.3) {
  const ctx = getAudioContext();
  if (!ctx || volume <= 0) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(280, now);
  osc.frequency.exponentialRampToValueAtTime(960, now + 0.08);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.08);
}

// ==========================================
// 4. 불시 작전 스케줄 (네이티브: AlarmManager / 웹: 열려 있는 동안만 setTimeout)
//    일정 규칙은 PrankScheduler.java 와 같다.
// ==========================================
function dailyCount(freq) {
  if (freq === 'quiet') return 1 + Math.floor(Math.random() * 2);
  if (freq === 'thrill') return 6 + Math.floor(Math.random() * 4);
  return 3 + Math.floor(Math.random() * 3);
}

function windowLengthMs() {
  const { start, end } = state.schedule;
  const hours = ((end - start) % 24 + 24) % 24;
  return (hours === 0 ? 24 : hours) * 3600e3;
}

// now 가 속한 작전일의 시작 시각 (자정 넘는 시간대 포함)
function windowStart(now = Date.now()) {
  const d = new Date(now);
  d.setHours(state.schedule.start, 0, 0, 0);
  let start = d.getTime();
  if (start > now) {
    const prev = new Date(start);
    prev.setDate(prev.getDate() - 1);
    if (now < prev.getTime() + windowLengthMs()) start = prev.getTime();
  }
  return start;
}

function planDay(start, now) {
  const count = dailyCount(state.schedule.freq);
  const slot = windowLengthMs() / count;
  const times = [];
  for (let i = 0; i < count; i++) {
    const t = start + i * slot + slot * (0.1 + 0.8 * Math.random());
    if (t > now + 60e3) times.push(Math.round(t));
  }
  return times;
}

function windowLabel() {
  const { start, end } = state.schedule;
  if (start === end) return '24시간 상시';
  return `${String(start).padStart(2, '0')}:00 ~ ${String(end).padStart(2, '0')}:00`;
}

function scheduleActive() {
  return state.schedule.on && !state.frozen && CHARACTERS.some(c => state.chars[c.id].enabled);
}

// 작전 설정이 실제로 바뀌었을 때만 일정을 다시 뽑는다 (앱을 열 때마다 다시 뽑으면 하루 횟수가 늘어남)
function syncSchedule() {
  const config = JSON.stringify({
    on: state.schedule.on,
    frozen: state.frozen,
    start: state.schedule.start,
    end: state.schedule.end,
    freq: state.schedule.freq,
    sounds: CHARACTERS.filter(c => state.chars[c.id].enabled)
      .map(c => ({ char: c.id, sound: state.chars[c.id].sound }))
  });
  if (config !== state.scheduleKey) {
    state.scheduleKey = config;
    if (native) native.configure(config);
    else state.webPlan = null;
    saveNow();
  }
  armWebTimer();
  updateSchedulerStatus();
}

let webTimer = null;
function armWebTimer() {
  clearTimeout(webTimer);
  if (native || !scheduleActive()) return;
  const now = Date.now();
  const today = windowStart(now);
  let plan = state.webPlan;
  if (plan) plan.times = plan.times.filter(t => t > now);
  if (!plan || plan.times.length === 0) {
    let day = !plan || plan.day < today ? today : nextDay(plan.day);
    for (let i = 0; i < 3; i++) {
      plan = { day, times: planDay(day, now) };
      if (plan.times.length) break;
      day = nextDay(day);
    }
  }
  state.webPlan = plan;
  saveState();
  if (!plan.times.length) return;
  // setTimeout 최대치(약 24.8일)보다 길면 하루 뒤 다시 계산
  const delay = Math.min(plan.times[0] - now, 864e5);
  webTimer = setTimeout(() => {
    if (Date.now() >= plan.times[0]) runPocketOperation(state.testMode);
    armWebTimer();
    updateSchedulerStatus();
  }, delay);
}

function nextDay(t) {
  const d = new Date(t);
  d.setDate(d.getDate() + 1);
  return d.getTime();
}

function remainingToday() {
  if (!scheduleActive()) return 0;
  if (native) return native.remainingToday();
  const end = windowStart() + windowLengthMs();
  return (state.webPlan ? state.webPlan.times : []).filter(t => t > Date.now() && t < end).length;
}

// ==========================================
// 5. 작전 기록 (네이티브에서 온 것이든 웹에서 흉내 낸 것이든 여기로 모인다)
// ==========================================
function recordEvent(event) {
  const mode = MODES[event.mode] ? event.mode : 'hold';
  dayStats(dayKey(event.t))[mode]++;
  state.acorns += MODES[mode].reward;
}

// 웹 미리보기(또는 네이티브 없는 환경)에서 작전 1회 실행
function runPocketOperation(mode) {
  if (state.frozen) return;
  const enabled = CHARACTERS.filter(c => state.chars[c.id].enabled);
  if (!enabled.length) {
    showToast('🤫 모든 친구의 소리가 꺼져 있어요!');
    return;
  }
  const char = enabled[Math.floor(Math.random() * enabled.length)];
  if (mode === 'loud') playCharacterSound(char.id, 0.75);
  else if (mode === 'soft' && navigator.vibrate) navigator.vibrate([90, 50, 140]);
  else synthPop(0.2);
  recordEvent({ t: Date.now(), char: char.id, mode });
  celebrate([{ char: char.id, mode }]);
}

// 네이티브 알람이 그동안 실행한 작전을 가져와 반영
function drainNativeEvents() {
  if (!native) return;
  let events = [];
  try { events = JSON.parse(native.drainEvents() || '[]'); } catch (e) { events = []; }
  if (!events.length) { updateSchedulerStatus(); return; }
  events.forEach(recordEvent);
  celebrate(events);
}
window.bgbbOnNativeResume = drainNativeEvents;

function celebrate(events) {
  const sum = { loud: 0, soft: 0, hold: 0 };
  events.forEach(e => { sum[MODES[e.mode] ? e.mode : 'hold']++; });
  const last = events[events.length - 1];
  const pet = petActors.find(p => p.id === last.char);
  if (events.length === 1) {
    const m = MODES[last.mode] || MODES.hold;
    if (pet) triggerPetReaction(pet, `${m.line} (+${m.reward}🌰)`);
    showToast(`${charById(last.char).name}: ${m.line}`);
  } else {
    const gained = sum.loud * MODES.loud.reward + sum.soft * MODES.soft.reward + sum.hold * MODES.hold.reward;
    if (pet) triggerPetReaction(pet, `주머니 속에서 ${events.length}번 작전! 🕵️`);
    showToast(`주머니 속 작전 ${events.length}회! 💥${sum.loud} 🫧${sum.soft} 🤫${sum.hold} (+${gained}🌰)`, 4000);
  }
  refreshProgress();
  saveState();
}

// 쓰다듬기/간식/소품 터치 보상 (하루 상한)
function grantTapAcorns(n) {
  const today = dayStats();
  const give = Math.max(0, Math.min(n, DAILY_TAP_ACORNS - today.tap));
  today.tap += give;
  state.acorns += give;
  return give;
}

// ==========================================
// 6. DOM & 공통 UI
// ==========================================
const $ = id => document.getElementById(id);
let dom = {};

document.addEventListener('DOMContentLoaded', () => {
  loadState();
  dom = {
    world: $('tamagotchiWorld'),
    themeBadge: $('worldThemeBadge'),
    acornBadge: $('worldAcornBadge'),
    userAcorns: $('userAcorns'),
    userAchievements: $('userAchievements'),
    collectCount: $('collectCount'),
    countLoud: $('countLoud'),
    countSoft: $('countSoft'),
    countHold: $('countHold'),
    statusDot: $('statusDot'),
    stealthText: $('stealthText'),
    nextTriggerStatus: $('nextTriggerStatus'),
    toast: $('crayonToast'),
    storyCanvas: $('storyCanvas'),
    homeTab: $('tab-home'),
    diaryTab: $('tab-diary')
  };

  initTabs();
  initWorld();
  initMascotModal();
  initDecorSheet();
  initSettingsSheet();
  initEmergency();
  initSoundLab();
  initCollectiblesModal();
  initDiary();

  applyTheme(state.theme);
  renderEmergency();
  refreshProgress();
  syncSchedule();
  drainNativeEvents();
  document.fonts.ready.then(renderStoryCanvas);
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  drainNativeEvents();
  armWebTimer();
  applyTheme(state.theme); // 실시간 자동 테마 갱신
});

// 토스트는 순서대로 하나씩 (보물 여러 개가 동시에 열려도 다 보이게)
const toastQueue = [];
let toastBusy = false;
function showToast(message, duration = 2600) {
  toastQueue.push([message, duration]);
  if (!toastBusy) nextToast();
}
function nextToast() {
  const item = toastQueue.shift();
  if (!item) { toastBusy = false; return; }
  toastBusy = true;
  dom.toast.textContent = item[0];
  dom.toast.classList.add('show');
  setTimeout(() => {
    dom.toast.classList.remove('show');
    setTimeout(nextToast, 250);
  }, toastQueue.length ? Math.min(item[1], 1600) : item[1]);
}

function bindOverlay(overlay, closeBtn) {
  const close = () => { overlay.classList.remove('open'); synthPop(0.2); };
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
}

// 숫자·해금 상태가 바뀔 때마다 한 곳에서 갱신
function refreshProgress() {
  const today = dayStats();
  dom.countLoud.textContent = `${today.loud}회`;
  dom.countSoft.textContent = `${today.soft}회`;
  dom.countHold.textContent = `${today.hold}회`;
  dom.acornBadge.textContent = `🌰 ${state.acorns}`;
  dom.userAcorns.textContent = state.acorns;

  const stats = computeStats();
  const unlocked = COLLECTIBLES.filter(c => c.check(stats));
  unlocked.forEach(c => {
    if (state.collected.includes(c.id)) return;
    state.collected.push(c.id);
    showToast(`🎁 비밀 보물 [${c.title}] 획득!`, 3200);
  });
  dom.userAchievements.textContent = `${unlocked.length}/${COLLECTIBLES.length}`;
  dom.collectCount.textContent = unlocked.length;
  renderCollectibles(stats);

  const cityChip = document.querySelector('.theme-chip[data-theme="city"]');
  const cityOpen = stats.totals.hold >= CITY_UNLOCK_HOLDS;
  cityChip.classList.toggle('locked', !cityOpen);
  cityChip.textContent = cityOpen ? '🏙️ 네온빛 도시' : '🏙️ 네온빛 도시 🔒';

  renderPropButtons();
  renderRecords(stats);
  updateSchedulerStatus();
  scheduleDiaryRender();
}

function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.tab;
      tabs.forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === targetId));
      if (targetId === 'tab-diary') renderStoryCanvas();
      synthPop(0.2);
    });
  });
}

// ==========================================
// 7. 다마고치 월드 (홈 탭이 보일 때만 애니메이션)
// ==========================================
const petActors = CHARACTERS.map((c, i) => ({
  id: c.id,
  index: i,
  sprites: c.sprites,
  dom: null, bubble: null, img: null, currentSprite: null,
  x: [50, 165, 265][i], y: [110, 185, 80][i],
  vx: [0.72, 0.9, 0.5][i],
  targetX: 0, targetY: 0,
  facingRight: i !== 2,
  mode: 'idle',
  idleTimer: 60 + i * 20,
  reactTimer: 0,
  walkStep: 0,
  bob: 0,
  jump: 0,
  pendingProp: null,
  bubbleTimer: null
}));

function setSprite(pet, key) {
  const src = pet.sprites[key] || pet.sprites.base;
  if (pet.currentSprite === src) return;
  pet.currentSprite = src;
  pet.img.src = src;
}

function showPetBubble(pet, text, duration = 2000) {
  pet.bubble.textContent = text;
  pet.bubble.classList.add('show');
  clearTimeout(pet.bubbleTimer);
  pet.bubbleTimer = setTimeout(() => pet.bubble.classList.remove('show'), duration);
}

function triggerPetReaction(pet, text = null) {
  pet.mode = 'react';
  pet.reactTimer = 110;
  pet.jump = 22;
  setSprite(pet, 'react');
  showPetBubble(pet, text || charById(pet.id).tapLine, 2200);
}

function initWorld() {
  const ids = { hamster: 'Hamster', tit: 'Tit', cat: 'Cat' };
  petActors.forEach(pet => {
    pet.dom = $(`pet${ids[pet.id]}`);
    pet.bubble = $(`bubble${ids[pet.id]}`);
    pet.img = pet.dom.querySelector('.pet-sprite');
    pet.dom.addEventListener('click', e => {
      e.stopPropagation();
      openMascotModal(pet.index);
    });
  });

  Object.keys(PROPS).forEach(propId => {
    const el = $(propId);
    el.addEventListener('click', e => {
      e.stopPropagation();
      if (state.frozen) return;
      el.classList.remove('prop-active-bounce');
      void el.offsetWidth;
      el.classList.add('prop-active-bounce');
      sendPetToProp(propId, true);
      showPetBubble(petActors.find(p => p.id === PROPS[propId].pet), '우와! 달려간다~ 🐾', 1400);
      synthPop(0.3);
    });
  });

  dom.themeBadge.addEventListener('click', () => {
    const order = ['auto', 'meadow', 'sunset', 'night', 'room'];
    applyTheme(order[(order.indexOf(state.theme) + 1) % order.length]);
    saveState();
    synthPop(0.25);
  });

  requestAnimationFrame(worldTick);
}

function sendPetToProp(propId, rewarded) {
  const meta = PROPS[propId];
  const pet = petActors.find(p => p.id === meta.pet);
  const w = dom.world.clientWidth || 360;
  pet.mode = 'walk';
  pet.reactTimer = 0;
  pet.targetX = Math.max(20, Math.min(w - 90, w * meta.xRatio));
  pet.targetY = meta.y;
  pet.facingRight = pet.targetX > pet.x;
  pet.pendingProp = { propId, rewarded };
}

function arriveAtProp(pet) {
  const { propId, rewarded } = pet.pendingProp;
  pet.pendingProp = null;
  const meta = PROPS[propId];
  if (!rewarded) {
    triggerPetReaction(pet, meta.msg);
    return;
  }
  const got = grantTapAcorns(2);
  triggerPetReaction(pet, got ? `${meta.msg} (+${got}🌰)` : meta.msg);
  playCharacterSound(pet.id, 0.55, meta.style);
  refreshProgress();
  saveState();
}

function decideNextMove(pet, w, minX, maxX, minY, maxY) {
  pet.idleTimer = 95 + Math.floor(Math.random() * 140);
  const r = Math.random();
  const myProps = Object.keys(PROPS).filter(id => PROPS[id].pet === pet.id && state.props[id]);
  if (r < 0.25 && myProps.length) {
    sendPetToProp(myProps[Math.floor(Math.random() * myProps.length)], false);
  } else if (r < 0.65) {
    pet.mode = 'walk';
    const ranges = { hamster: [minX, w * 0.48], tit: [w * 0.22, w * 0.74], cat: [w * 0.45, maxX] };
    const [lo, hi] = ranges[pet.id];
    pet.targetX = lo + Math.random() * (hi - lo);
    pet.targetY = minY + Math.random() * (maxY - minY);
    pet.facingRight = pet.targetX > pet.x;
  } else if (r < 0.84) {
    pet.mode = 'idle';
  } else if (pet.id === 'hamster') {
    pet.mode = 'react';
    pet.reactTimer = 90;
    showPetBubble(pet, '뽀옹! 💨', 2000);
  } else if (pet.id === 'tit') {
    pet.mode = 'fly';
    showPetBubble(pet, '파닥파닥 🐤', 2200);
  } else {
    pet.mode = 'sleep';
    showPetBubble(pet, '식빵 굽는 중... 💤', 2500);
  }
}

function worldTick() {
  requestAnimationFrame(worldTick);
  // 다른 탭/백그라운드/긴급탈출 중에는 계산하지 않는다
  if (state.frozen || document.hidden || !dom.homeTab.classList.contains('active')) return;

  const now = performance.now();
  const w = dom.world.clientWidth || 360;
  const minX = 20, maxX = Math.max(minX + 80, w - 90), minY = 76, maxY = 180;

  petActors.forEach(pet => {
    let tilt = 0;
    if (pet.reactTimer > 0) {
      pet.reactTimer--;
      pet.bob = Math.sin(now / 90) * 6;
      tilt = Math.sin(now / 80) * 10;
      if (pet.reactTimer === 0) pet.mode = 'idle';
    } else {
      if (--pet.idleTimer <= 0 && !pet.pendingProp) decideNextMove(pet, w, minX, maxX, minY, maxY);

      if (pet.mode === 'walk') {
        const dx = pet.targetX - pet.x, dy = pet.targetY - pet.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 4) {
          const speed = pet.vx * (pet.pendingProp ? 1.65 : 1);
          pet.x += (dx / dist) * speed;
          pet.y += (dy / dist) * speed * 0.65;
          pet.walkStep = (pet.walkStep + 1) % 32;
          setSprite(pet, pet.walkStep < 16 ? 'walk' : 'base');
          pet.bob = Math.abs(Math.sin(now / 120)) * 6;
          tilt = Math.sin(now / 140) * 7;
        } else if (pet.pendingProp) {
          arriveAtProp(pet);
        } else {
          pet.mode = 'idle';
        }
      } else if (pet.mode === 'fly') {
        pet.bob = 45 + Math.sin(now / 180) * 16;
        pet.x += (pet.facingRight ? 1 : -1) * 0.8;
        if (pet.x > maxX) pet.facingRight = false;
        if (pet.x < minX) pet.facingRight = true;
        setSprite(pet, 'fly');
      } else if (pet.mode === 'sleep') {
        pet.bob = 0;
        setSprite(pet, 'sleep');
      } else if (pet.mode === 'idle') {
        pet.bob = 0;
        setSprite(pet, 'base');
      }
    }

    // 서로 겹치지 않게 살짝 밀어내기
    if (!pet.pendingProp) {
      petActors.forEach(o => {
        if (o !== pet && Math.hypot(o.x - pet.x, o.y - pet.y) < 62) pet.x += pet.x > o.x ? 0.35 : -0.35;
      });
    }
    pet.x = Math.max(minX, Math.min(maxX, pet.x));
    pet.y = Math.max(minY, Math.min(maxY, pet.y));
    if (pet.jump > 0) pet.jump = Math.max(0, pet.jump - 2);

    const depth = 0.78 + Math.min(1, Math.max(0, 1 - (pet.y - minY) / (maxY - minY))) * 0.32;
    pet.dom.style.left = `${Math.round(pet.x)}px`;
    pet.dom.style.bottom = `${Math.round(pet.y + pet.bob + pet.jump)}px`;
    pet.dom.style.zIndex = Math.floor(180 - pet.y * 0.6);
    pet.img.style.transform = `scale(${(pet.facingRight ? 1 : -1) * depth}, ${depth}) rotate(${tilt}deg)`;
  });
}

function timeBasedTheme() {
  const h = new Date().getHours();
  if (h >= 6 && h < 17) return 'meadow';
  if (h >= 17 && h < 20) return 'sunset';
  return 'night';
}

function applyTheme(theme) {
  state.theme = theme;
  const resolved = theme === 'auto' ? timeBasedTheme() : theme;
  dom.world.className = `tamagotchi-world ${resolved}`;
  document.querySelectorAll('.theme-chip').forEach(c => c.classList.toggle('active', c.dataset.theme === theme));
  dom.themeBadge.textContent = theme === 'auto'
    ? `⏰ 실시간 (${THEME_NAMES[resolved].split(' · ')[1]})`
    : THEME_NAMES[resolved];
}

// ==========================================
// 8. 캐릭터 모달 (친밀도)
// ==========================================
function levelOf(bond) {
  return Math.min(10, 1 + Math.floor(bond / 5));
}
function badgeOf(level) {
  return level >= 5 ? `소울메이트 Lv.${level} 👑` : `절친 Lv.${level} 💖`;
}

function openMascotModal(index) {
  state.activeChar = index;
  const char = CHARACTERS[index];
  const pet = petActors[index];
  triggerPetReaction(pet);
  playCharacterSound(char.id, 0.7);

  $('modalMascotImg').src = char.sprites.react;
  $('modalMascotName').textContent = char.name;
  $('modalMascotDesc').textContent = char.desc;
  $('modalSoundToggle').checked = state.chars[char.id].enabled;
  $('modalFeedIcon').textContent = char.feedIcon;
  $('modalFeedLabel').textContent = char.feedLabel;
  $('modalHompySpeech').textContent = `"${char.speech}"`;
  renderBond();
  renderSoundChips();
  $('mascotModalOverlay').classList.add('open');
}

function renderBond() {
  const char = CHARACTERS[state.activeChar];
  const bond = state.chars[char.id].bond;
  $('modalCharBadge').textContent = badgeOf(levelOf(bond));
  $('modalStatCount').textContent = `교감 ${bond}회 · Lv.${levelOf(bond)} ✨`;
}

function renderSoundChips() {
  const char = CHARACTERS[state.activeChar];
  const c = state.chars[char.id];
  const options = Object.entries(char.sounds).map(([id, s]) => [id, s.chip]);
  if (state.diy) options.push(['diy', '내 녹음 🎙️']);
  const box = $('soundVariationChips');
  box.innerHTML = '';
  options.forEach(([id, label]) => {
    const btn = document.createElement('button');
    btn.className = `sound-chip ${c.sound === id ? 'active' : ''}`;
    btn.textContent = label;
    btn.addEventListener('click', () => equipSound(char.id, id));
    box.appendChild(btn);
  });
}

function equipSound(charId, sound) {
  state.chars[charId].sound = sound;
  playCharacterSound(charId, 0.75);
  triggerPetReaction(petActors.find(p => p.id === charId));
  renderSoundChips();
  renderSoundPack();
  syncSchedule();
}

function interact(kind) {
  const char = CHARACTERS[state.activeChar];
  const pet = petActors[state.activeChar];
  const c = state.chars[char.id];
  const before = levelOf(c.bond);
  c.bond++;
  let got;
  if (kind === 'feed') {
    state.flags.fed = true;
    got = grantTapAcorns(3);
    triggerPetReaction(pet, `맛있다 냠냠! ${char.feedIcon}${got ? ` (+${got}🌰)` : ''}`);
    synthPop(0.55);
  } else {
    got = grantTapAcorns(1);
    triggerPetReaction(pet, `쓰담쓰담 행복해 💖${got ? ` (+${got}🌰)` : ''}`);
    if (char.id === 'cat') playCharacterSound('cat', 0.8, 'soft');
    else synthPop(0.5);
  }
  $('modalMascotImg').src = char.sprites.react;
  if (levelOf(c.bond) > before) {
    state.acorns += 10;
    showToast(`🎉 ${char.name}와(과) 친밀도 Lv.${levelOf(c.bond)} 달성! (+10 🌰)`);
  }
  renderBond();
  refreshProgress();
  saveState();
}

function initMascotModal() {
  bindOverlay($('mascotModalOverlay'), $('btnCloseMascotModal'));

  $('modalSoundToggle').addEventListener('change', e => {
    const char = CHARACTERS[state.activeChar];
    const pet = petActors[state.activeChar];
    state.chars[char.id].enabled = e.target.checked;
    if (e.target.checked) {
      showPetBubble(pet, '소리 켜짐! 🔊', 2000);
      playCharacterSound(char.id, 0.75);
    } else {
      showPetBubble(pet, '조용 모드 🤫', 2000);
    }
    syncSchedule();
  });

  $('btnFeedMascot').addEventListener('click', () => interact('feed'));
  $('btnPetMascot').addEventListener('click', () => interact('pet'));
  $('btnTestSoundMascot').addEventListener('click', () => {
    const char = CHARACTERS[state.activeChar];
    playCharacterSound(char.id, 0.75);
    triggerPetReaction(petActors[state.activeChar]);
  });
}

// ==========================================
// 9. 꾸미기 시트 (테마, 소품 상점, 보물)
// ==========================================
function initDecorSheet() {
  $('btnOpenDecor').addEventListener('click', () => {
    $('decorSheetOverlay').classList.add('open');
    synthPop(0.25);
  });
  bindOverlay($('decorSheetOverlay'), $('btnCloseDecorSheet'));

  document.querySelectorAll('.theme-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (chip.classList.contains('locked')) {
        showToast(`🔒 누적 꾹참 ${CITY_UNLOCK_HOLDS}회 달성 시 해금! (현재 ${computeStats().totals.hold}회)`);
        return;
      }
      applyTheme(chip.dataset.theme);
      saveState();
      synthPop(0.3);
    });
  });

  $('decorPropsGrid').addEventListener('click', e => {
    const btn = e.target.closest('.prop-toggle-btn');
    if (btn) toggleProp(btn.dataset.prop);
  });
}

function toggleProp(propId) {
  const meta = PROPS[propId];
  if (meta.price && !state.owned[propId]) {
    if (state.acorns < meta.price) {
      showToast(`🌰 도토리가 부족해요! (${state.acorns}/${meta.price})`);
      return;
    }
    if (!confirm(`도토리 ${meta.price}개로 [${meta.label}]을(를) 살까요?`)) return;
    state.acorns -= meta.price;
    state.owned[propId] = true;
    state.props[propId] = true;
    showToast(`🛍️ [${meta.label}] 구매 완료! 아지트에 배치했어요`);
  } else {
    state.props[propId] = !state.props[propId];
  }
  synthPop(0.3);
  refreshProgress();
  saveState();
}

function renderPropButtons() {
  const html = Object.entries(PROPS).map(([id, p]) => {
    const forSale = p.price && !state.owned[id];
    $(id).classList.toggle('hidden', !state.props[id]);
    return `<button class="prop-toggle-btn ${state.props[id] ? 'active' : ''} ${forSale ? 'for-sale' : ''}" data-prop="${id}">
        <img src="assets/props/${p.img}.webp" alt="${p.label}" class="prop-btn-icon">
        <span class="prop-txt">${forSale ? `🌰${p.price}` : p.label}</span>
      </button>`;
  }).join('');
  $('decorPropsGrid').innerHTML = html;
}

function renderCollectibles(stats) {
  $('collectiblesGrid').innerHTML = COLLECTIBLES.map(c => {
    const open = c.check(stats);
    return `<div class="collectible-slot ${open ? 'unlocked' : 'locked'}" data-item="${c.id}" title="${c.title}: ${c.cond}">
        <div class="slot-icon-box">
          <img src="assets/collectibles/${c.id}.webp" alt="${c.title}" class="collect-img ${open ? '' : 'locked-filter'}">
        </div>
        <span class="collect-name">${c.title}</span>
        <span class="collect-status ${open ? '' : 'lock-text'}">${open ? '획득 완료 ✨' : '도전 중 🔒'}</span>
      </div>`;
  }).join('');
}

function initCollectiblesModal() {
  const overlay = $('collectibleModalOverlay');
  $('collectiblesGrid').addEventListener('click', e => {
    const slot = e.target.closest('.collectible-slot');
    if (!slot) return;
    const item = COLLECTIBLES.find(c => c.id === slot.dataset.item);
    const open = item.check(computeStats());
    $('collectibleModalImg').src = `assets/collectibles/${item.id}.webp`;
    $('collectibleModalImg').classList.toggle('locked-filter', !open);
    $('collectibleModalRarity').textContent = item.rarity;
    $('collectibleModalTitle').textContent = item.title;
    $('collectibleModalLore').textContent = open ? item.lore : '아직 베일에 싸인 보물이에요... 🔒';
    $('collectibleModalCond').textContent = `${item.cond} ${open ? '✅' : ''}`;
    overlay.classList.add('open');
    synthPop(0.35);
  });
  bindOverlay(overlay, $('btnCloseCollectibleModal'));
  $('btnConfirmCollectible').addEventListener('click', () => overlay.classList.remove('open'));
}

// ==========================================
// 10. 작전 설정 시트 & 긴급탈출
// ==========================================
function initSettingsSheet() {
  $('btnOpenSettings').addEventListener('click', () => {
    updateSchedulerStatus();
    $('settingsSheetOverlay').classList.add('open');
    synthPop(0.25);
  });
  bindOverlay($('settingsSheetOverlay'), $('btnCloseSettingsSheet'));

  const toggle = $('operationToggle');
  toggle.checked = state.schedule.on;
  toggle.addEventListener('change', () => {
    state.schedule.on = toggle.checked;
    showToast(state.schedule.on ? '🚀 불시 작전 가동!' : '⏸️ 불시 작전 일시중지');
    syncSchedule();
  });

  ['windowStart', 'windowEnd'].forEach(id => {
    const sel = $(id);
    for (let h = 0; h < 24; h++) sel.add(new Option(`${String(h).padStart(2, '0')}:00`, h));
    sel.value = id === 'windowStart' ? state.schedule.start : state.schedule.end;
    sel.addEventListener('change', () => {
      state.schedule[id === 'windowStart' ? 'start' : 'end'] = +sel.value;
      syncSchedule();
    });
  });

  document.querySelectorAll('.frequency-chips .chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.freq === state.schedule.freq);
    chip.addEventListener('click', () => {
      document.querySelectorAll('.frequency-chips .chip').forEach(c => c.classList.toggle('active', c === chip));
      state.schedule.freq = chip.dataset.freq;
      syncSchedule();
      synthPop(0.2);
    });
  });

  // 앱에서는 진짜 폰 상태(소리/진동/무음)를 쓰므로 흉내 버튼은 웹에서만 보인다
  const mannerRow = document.querySelector('.manner-row');
  if (native) {
    mannerRow.style.display = 'none';
  } else {
    const modeOf = { sound: 'loud', vibrate: 'soft', silent: 'hold' };
    document.querySelectorAll('.manner-btn').forEach(btn => {
      btn.classList.toggle('active', modeOf[btn.dataset.mode] === state.testMode);
      btn.addEventListener('click', () => {
        document.querySelectorAll('.manner-btn').forEach(b => b.classList.toggle('active', b === btn));
        state.testMode = modeOf[btn.dataset.mode];
        saveState();
        synthPop(0.2);
      });
    });
  }

  $('btnSimulateTrigger').addEventListener('click', () => {
    if (state.frozen) { showToast('🥶 긴급탈출 중엔 작전이 멈춰 있어요'); return; }
    if (native) native.fireNow(); // 결과는 bgbbOnNativeResume 으로 돌아온다
    else runPocketOperation(state.testMode);
  });

  $('btnResetData').addEventListener('click', () => {
    if (!confirm('도토리, 작전 기록, 꾸미기 데이터를 모두 지울까요?')) return;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });
}

function updateSchedulerStatus() {
  let text;
  if (state.frozen) text = '🥶 긴급탈출 발동 중 (작전 정지)';
  else if (!state.schedule.on) text = '⏸️ 불시 작전이 꺼져 있어요';
  else if (!CHARACTERS.some(c => state.chars[c.id].enabled)) text = '🤫 소리 켜진 친구가 없어요';
  else {
    const left = remainingToday();
    text = `⏱️ ${windowLabel()} · 오늘 남은 작전 ${left}회 (언제일지는 비밀 🤫)`;
    if (!native) text += ' · 웹 미리보기는 이 탭이 열려 있을 때만 울려요';
  }
  dom.nextTriggerStatus.textContent = text;
  dom.stealthText.textContent = state.frozen
    ? '쉿! 모든 소리가 꽁꽁 얼어붙음 🥶'
    : state.schedule.on ? '햄찌와 친구들이 주머니 속 낮잠 중 💤' : '친구들이 아지트에서 쉬는 중 🏡';
}

function initEmergency() {
  $('btnEmergency').addEventListener('click', () => {
    state.frozen = !state.frozen;
    renderEmergency();
    petActors.forEach(p => showPetBubble(p, state.frozen ? '흡! 숨 참기 🤐' : '휴~ 살았다! 💨', 3000));
    syncSchedule();
    synthPop(0.4);
  });
}

function renderEmergency() {
  $('btnEmergency').classList.toggle('active', state.frozen);
  $('emergencyText').textContent = state.frozen ? '🚨 긴급탈출 중! (터치하여 해제)' : '🚨 긴급탈출! (원터치 소리 동결)';
  dom.statusDot.classList.toggle('pulsing', !state.frozen);
  dom.statusDot.classList.toggle('emergency', state.frozen);
}

// ==========================================
// 11. 소리 보관함 & 3초 DIY 녹음
// ==========================================
function renderSoundPack() {
  $('soundPackList').innerHTML = CHARACTERS.flatMap(char =>
    Object.entries(char.sounds).map(([style, s]) => {
      const equipped = state.chars[char.id].sound === style;
      return `<div class="sound-card" data-char-id="${char.id}" data-style="${style}">
          <span class="sound-icon">${s.icon}</span>
          <div class="sound-info">
            <span class="sound-title">${s.title}</span>
            <span class="sound-char">${char.name} · ${s.sub}</span>
          </div>
          <div class="sound-card-btns">
            <button class="btn-play-sound">▶ 재생</button>
            <button class="btn-equip-sound ${equipped ? 'equipped' : ''}">${equipped ? '✓ 장착중' : '장착'}</button>
          </div>
        </div>`;
    })
  ).join('');
}

function initSoundLab() {
  renderSoundPack();
  $('soundPackList').addEventListener('click', e => {
    const card = e.target.closest('.sound-card');
    if (!card) return;
    const { charId, style } = card.dataset;
    if (e.target.closest('.btn-play-sound')) {
      playUrl(soundUrl(charById(charId), style));
    } else if (e.target.closest('.btn-equip-sound')) {
      equipSound(charId, style);
      showToast(`🎵 [${charById(charId).name}] 소리가 변경되었어요!`);
    }
  });

  if (state.diy) $('recordedPreview').style.display = 'flex';

  const btn = $('btnRecord');
  btn.addEventListener('click', async () => {
    if (btn.classList.contains('recording')) return;
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      alert('이 기기에서는 마이크 녹음이 지원되지 않아요.');
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      alert('마이크 접근 권한을 허용해 주세요.');
      return;
    }
    const recorder = new MediaRecorder(stream);
    const chunks = [];
    recorder.ondataavailable = ev => { if (ev.data.size > 0) chunks.push(ev.data); };
    recorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      btn.classList.remove('recording');
      $('recText').textContent = '눌러서 3초 녹음';
      const reader = new FileReader();
      reader.onloadend = () => {
        state.diy = reader.result;
        bufferCache.clear();
        // 앱에서는 파일로도 저장해서 앱이 꺼져 있어도 알람이 이 소리를 낸다
        if (native) native.saveCustomSound(state.diy.split(',')[1]);
        $('recordedPreview').style.display = 'flex';
        const time = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        $('recordedLabel').textContent = `내 녹음 (${time} 저장됨)`;
        showToast('🎙️ 3초 비밀 녹음이 저장되었습니다!');
        saveState();
      };
      reader.readAsDataURL(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
    };
    recorder.start();
    btn.classList.add('recording');
    $('recText').textContent = '🔴 녹음 중... (3초)';
    setTimeout(() => recorder.state === 'recording' && recorder.stop(), 3000);
  });

  $('btnPlayRecorded').addEventListener('click', () => state.diy && playUrl(state.diy));
  $('btnEquipRecorded').addEventListener('click', () => {
    if (!state.diy) return;
    const char = CHARACTERS[state.activeChar];
    equipSound(char.id, 'diy');
    showToast(`🎙️ [${char.name}]에게 내 녹음을 장착했어요!`);
  });
}

// ==========================================
// 12. 기록 탭 (진짜 기록만)
// ==========================================
const CHART_COLORS = { loud: '#E8590C', soft: '#4C6EF5', hold: '#0CA678' };

function renderRecords(stats) {
  const today = dayStats();
  let streak = 0;
  for (let d = new Date(); ; d.setDate(d.getDate() - 1)) {
    const s = state.days[dayKey(d.getTime())];
    if (!s || s.loud + s.soft + s.hold === 0) {
      if (streak === 0 && dayKey(d.getTime()) === dayKey()) continue; // 오늘 아직 0회면 어제부터 센다
      break;
    }
    streak++;
  }
  $('myRankBanner').innerHTML = `
    <div class="my-rank-pos">오늘: 💥 대담 <strong>${today.loud}</strong> · 🫧 소심 <strong>${today.soft}</strong> · 🤫 꾹참 <strong>${today.hold}</strong></div>
    <div class="my-rank-detail">누적 작전 ${stats.totals.all}회 · 누적 꾹참 ${stats.totals.hold}회 · ${streak}일 연속 작전 🔥</div>`;

  // 최근 7일 누적 막대 (대담/소심/꾹참)
  const week = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const s = state.days[dayKey(d.getTime())] || { loud: 0, soft: 0, hold: 0 };
    week.push({ label: i === 0 ? '오늘' : `${d.getMonth() + 1}/${d.getDate()}`, s });
  }
  const max = Math.max(3, ...week.map(w => w.s.loud + w.s.soft + w.s.hold));
  $('weekChart').innerHTML = `
    <div class="week-legend">${Object.keys(CHART_COLORS).map(m =>
      `<span><i style="background:${CHART_COLORS[m]}"></i>${MODES[m].label}</span>`).join('')}</div>
    <div class="week-bars">${week.map(({ label, s }) => {
      const total = s.loud + s.soft + s.hold;
      const segs = ['hold', 'soft', 'loud'].filter(m => s[m] > 0).map(m =>
        `<span class="week-seg" style="height:${(s[m] / max) * 100}%;background:${CHART_COLORS[m]}"></span>`).join('');
      return `<div class="week-col" title="${label}: 대담 ${s.loud} · 소심 ${s.soft} · 꾹참 ${s.hold}">
          <span class="week-total">${total || ''}</span>
          <div class="week-stack">${segs}</div>
          <span class="week-label">${label}</span>
        </div>`;
    }).join('')}</div>`;

  // 꾹참 많았던 날 TOP 5
  const best = Object.entries(state.days)
    .filter(([, s]) => s.hold > 0)
    .sort((a, b) => b[1].hold - a[1].hold || b[0].localeCompare(a[0]))
    .slice(0, 5);
  const medals = ['gold', 'silver', 'bronze'];
  const badges = ['참음왕 👑', '인내신 🥈', '평정심 🥉'];
  $('rankList').innerHTML = best.length
    ? best.map(([key, s], i) => `
        <div class="rank-item ${medals[i] || ''} ${key === dayKey() ? 'me-highlight' : ''}">
          <span class="rank-num">${i + 1}</span>
          <span class="rank-avatar">${['🐹', '🐤', '🐱'][i % 3]}</span>
          <div class="rank-user">
            <strong>${key.replace(/-/g, '. ')}${key === dayKey() ? ' (오늘)' : ''}</strong>
            <small>꾹참 ${s.hold}회 · 대담 ${s.loud}회 · 소심 ${s.soft}회</small>
          </div>
          <span class="rank-badge">${badges[i] || '도전자 ✨'}</span>
        </div>`).join('')
    : '<p class="records-empty">아직 꾹 참은 날이 없어요. 폰을 무음으로 두고 주머니에 넣어보세요 🤫</p>';
}

// ==========================================
// 13. 9:16 크레용 그림일기 캔버스
// ==========================================
function initDiary() {
  const input = $('diaryCustomNote');
  input.value = state.diary.note;
  document.querySelectorAll('.weather-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.weather === state.diary.weather);
    chip.addEventListener('click', () => {
      document.querySelectorAll('.weather-chip').forEach(c => c.classList.toggle('active', c === chip));
      state.diary.weather = chip.dataset.weather;
      saveState();
      renderStoryCanvas();
      synthPop(0.2);
    });
  });
  input.addEventListener('input', () => {
    state.diary.note = input.value;
    saveState();
    scheduleDiaryRender();
  });

  $('btnShareStory').addEventListener('click', shareStory);
  $('btnRedrawCanvas').addEventListener('click', () => {
    renderStoryCanvas();
    synthPop(0.3);
    showToast('🎨 크레용 그림일기를 새로 그렸어요!');
  });
}

// 그림일기 탭이 보일 때만, 입력이 멈춘 뒤 한 번만 다시 그린다
let diaryRenderTimer = null;
function scheduleDiaryRender() {
  clearTimeout(diaryRenderTimer);
  diaryRenderTimer = setTimeout(() => {
    if (dom.diaryTab.classList.contains('active')) renderStoryCanvas();
  }, 250);
}

const imageCache = {};
function loadImage(src) {
  if (!imageCache[src]) {
    imageCache[src] = new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }
  return imageCache[src];
}

function drawCrayonLine(ctx, x1, y1, x2, y2, color, baseWidth = 4) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const dx = x2 - x1, dy = y2 - y1;
  const steps = Math.max(8, Math.floor(Math.hypot(dx, dy) / 12));
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    ctx.lineWidth = baseWidth + (Math.random() - 0.5) * 2;
    ctx.lineTo(x1 + dx * t + (Math.random() - 0.5) * 3.5, y1 + dy * t + (Math.random() - 0.5) * 3.5);
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
  let cx = x, wave = 1;
  while (cx < x + width) {
    cx += 14 + Math.random() * 4;
    ctx.lineTo(cx, y + wave * (5 + Math.random() * 3));
    wave *= -1;
  }
  ctx.stroke();
  ctx.restore();
}

function drawWobblyCircle(ctx, r, jitter) {
  ctx.beginPath();
  for (let a = 0; a <= Math.PI * 2; a += 0.1) {
    const rr = r + (Math.random() - 0.5) * jitter;
    if (a === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.stroke();
}

function drawCrayonRubberStamp(ctx, x, y, title, subtitle, color, angleDeg = -12) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((angleDeg * Math.PI) / 180);
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  drawWobblyCircle(ctx, 115, 4);
  ctx.lineWidth = 3;
  drawWobblyCircle(ctx, 98, 3);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 36px "Jua", sans-serif';
  ctx.fillText(title, 0, -10);
  ctx.font = 'bold 24px "Gaegu", cursive';
  ctx.fillText(subtitle, 0, 32);
  ctx.restore();
}

function drawCrayonCheckbox(ctx, x, y) {
  ctx.save();
  ctx.strokeStyle = '#242220';
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y - 30, 42, 42);
  ctx.strokeStyle = '#FF5A5F';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + 6, y - 8);
  ctx.lineTo(x + 18, y + 4);
  ctx.lineTo(x + 36, y - 24);
  ctx.stroke();
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

// 원본 비율을 유지해 바닥 중앙 기준으로 그린다
function drawImagePreservingAspect(ctx, img, centerX, bottomY, targetHeight) {
  if (!img) return { x: centerX, y: bottomY, w: 0, h: 0 };
  const drawW = targetHeight * (img.naturalWidth / img.naturalHeight);
  const x = centerX - drawW / 2, y = bottomY - targetHeight;
  ctx.drawImage(img, x, y, drawW, targetHeight);
  return { x, y, w: drawW, h: targetHeight };
}

function wrapCanvasText(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line += ch;
    }
  }
  if (line) lines.push(line);
  return lines;
}

let renderSeq = 0;
async function renderStoryCanvas() {
  const seq = ++renderSeq;
  const main = CHARACTERS[state.activeChar];
  const subs = CHARACTERS.filter(c => c !== main);
  const [mainImg, ...subImgs] = await Promise.all([main, ...subs].map(c => loadImage(c.sprites.base)));
  if (seq !== renderSeq) return; // 더 최신 렌더가 시작됨

  const canvas = dom.storyCanvas;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height; // 1080 x 1920
  const today = dayStats();

  ctx.fillStyle = '#FFFDF8';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#EFE9DE';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let x = 0; x < w; x += 45) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
  for (let y = 0; y < h; y += 45) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
  ctx.stroke();

  const d = new Date();
  ctx.fillStyle = '#242220';
  ctx.font = 'bold 44px "Gaegu", cursive';
  ctx.textAlign = 'left';
  ctx.fillText(`${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`, 90, 125);
  ctx.textAlign = 'right';
  ctx.fillText(`날씨: ${state.diary.weather}`, w - 90, 125);
  drawCrayonLine(ctx, 80, 155, w - 80, 155, '#242220', 4);

  ctx.textAlign = 'center';
  ctx.font = 'bold 78px "Jua", sans-serif';
  ctx.fillText('나의 비밀 방귀 일기장!', w / 2, 265);
  drawCrayonSquiggle(ctx, w / 2 - 340, 298, 680, '#FED36A');

  // 그림 칸: 주인공 + 양옆 친구들
  ctx.save();
  ctx.fillStyle = '#F7FBF8';
  ctx.strokeStyle = '#242220';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(110, 340, w - 220, 520, [28]);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.shadowColor = 'rgba(40, 37, 35, 0.22)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 8;
  drawImagePreservingAspect(ctx, subImgs[0], 275, 765, 225);
  drawImagePreservingAspect(ctx, subImgs[1], w - 275, 765, 225);
  const mainRect = drawImagePreservingAspect(ctx, mainImg, w / 2, 805, 360);
  ctx.restore();
  drawCrayonCloud(ctx, mainRect.x + mainRect.w - 30, mainRect.y + mainRect.h - 75, '#95D5B2');

  let titleBadge = '은밀한 가스 암살자 🕵️';
  let stamp = ['참 잘 참았어요!', '💮 인내의 화신', '#FF5A5F'];
  if (today.loud >= 4) {
    titleBadge = '확성기 방구 대장 📢';
    stamp = ['냄새주의!', '⚠️ 대담한 폭격기', '#D9480F'];
  } else if (today.hold >= 5) {
    titleBadge = '인내의 화신 (괄약근 장인) 🧘';
    stamp = ['완벽한 범죄', '💮 참음 마스터', '#10B981'];
  } else if (today.loud + today.soft + today.hold === 0) {
    titleBadge = '평화로운 하루 🌈';
    stamp = ['오늘은 쉬는 날', '😴 휴전 중', '#4C6EF5'];
  }

  const box = (y, height, fill, radius) => {
    ctx.fillStyle = fill;
    ctx.strokeStyle = '#242220';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(110, y, w - 220, height, [radius]);
    ctx.fill();
    ctx.stroke();
  };

  ctx.save();
  box(900, 82, '#FFF9DB', 20);
  ctx.fillStyle = '#242220';
  ctx.font = 'bold 40px "Jua", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`[ 오늘의 칭호: ${titleBadge} ]`, w / 2, 954, w - 260);
  ctx.restore();

  const scoreY = 1010;
  ctx.save();
  box(scoreY, 390, '#FFFFFF', 24);
  ctx.font = 'bold 44px "Gaegu", cursive';
  ctx.fillStyle = '#242220';
  ctx.textAlign = 'left';
  [
    `대담하게 발사 : ${today.loud}회 (뿡뿡! 💥)`,
    `소심하게 발사 : ${today.soft}회 (피식... 🫧)`,
    `눈치보며 참음 : ${today.hold}회 (윽! 참았다 🤫)`
  ].forEach((line, i) => {
    drawCrayonCheckbox(ctx, 155, scoreY + 66 + i * 114);
    ctx.fillText(line, 220, scoreY + 86 + i * 114, w - 380);
  });
  ctx.restore();

  const noteY = 1440;
  ctx.save();
  box(noteY, 260, '#FFFDF0', 20);
  ctx.beginPath();
  ctx.roundRect(118, noteY + 8, w - 236, 244, [16]);
  ctx.clip();
  ctx.fillStyle = '#888';
  ctx.font = 'bold 32px "Jua", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('✏️ 오늘의 비밀 일기:', 145, noteY + 52);
  ctx.fillStyle = '#242220';
  ctx.font = 'bold 40px "Gaegu", cursive';
  const note = `"${state.diary.note || '오늘도 주머니 속에서 평화를 지켰다!'}"`;
  wrapCanvasText(ctx, note, w - 290).slice(0, 2).forEach((line, i) => {
    const y = noteY + 122 + i * 72;
    ctx.fillText(line, 145, y, w - 290);
    drawCrayonLine(ctx, 145, y + 16, w - 145, y + 16, '#D5CEBE', 2.5);
  });
  ctx.restore();

  drawCrayonRubberStamp(ctx, w - 235, scoreY + 340, stamp[0], stamp[1], stamp[2], -12);

  ctx.font = 'bold 34px "Gaegu", cursive';
  ctx.fillStyle = '#888';
  ctx.textAlign = 'center';
  ctx.fillText(`@방구뿡   #도토리${state.acorns}개   #다마고치아지트`, w / 2, h - 85, w - 180);
}

async function shareStory() {
  await renderStoryCanvas();
  dom.storyCanvas.toBlob(async blob => {
    if (!blob) return;
    const fileName = `banggu_bboong_${dayKey()}.png`;
    const file = new File([blob], fileName, { type: 'image/png' });
    const saved = () => {
      state.diary.saves++;
      refreshProgress();
      saveState();
    };

    // 안드로이드 WebView 는 파일 공유/다운로드를 못 하므로 네이티브가 갤러리 저장 + 공유창을 띄운다
    if (native) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (native.saveAndShareImage(reader.result.split(',')[1], fileName)) {
          showToast('📸 갤러리(Pictures/방구뿡)에 저장했어요!');
          saved();
        } else {
          showToast('😢 이 기기에서는 저장할 수 없어요');
        }
      };
      reader.readAsDataURL(blob);
      return;
    }

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ title: '방구뿡 비밀 그림일기', text: state.diary.note, files: [file] });
        showToast('📸 스토리 공유 완료!');
        saved();
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    showToast('📸 9:16 그림일기 이미지가 저장되었습니다!');
    saved();
  });
}
