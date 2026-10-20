// 앱 상태 하나 + 저장 + 변경 알림. 화면은 subscribe 해서 다시 그린다.
import { CHARACTERS, MODES, PROPS, TREASURES, DAILY_TAP_ACORNS, LEVEL_STEP, LEVEL_UP_BONUS } from './data.js';

const KEY = 'bgbb.v1';
const DIY_KEY = 'bgbb.v1.diy';   // 녹음은 커서 따로 둔다 (상태 저장 때마다 다시 쓰지 않게)

function initial() {
  return {
    onboarded: false,
    friends: Object.fromEntries(CHARACTERS.map(c => [c.id, { on: true, style: 'main', bond: 0 }])),
    theme: 'auto',
    placed: PROPS.filter(p => !p.price).map(p => p.id),
    owned: [],
    schedule: { on: true, start: 9, end: 18, freq: 'normal' },
    frozen: false,
    previewMode: 'loud',  // 웹 미리보기에서 흉내 낼 폰 상태
    acorns: 0,
    days: {},             // 'YYYY-MM-DD' → { loud, soft, hold, tap }
    fed: false,
    diary: { weather: 0, note: '', saves: 0 },   // weather 는 WEATHERS 의 번호
    seenTreasures: [],
    tips: [],             // 응원한 상품 ID (Google Play 가 확인해 준 것만)
    plan: null,           // 웹 미리보기용 작전 일정 { day, times }
    sentConfig: ''        // 마지막으로 적용한 작전 설정
  };
}

export const state = load();
let diy = null;
try { diy = localStorage.getItem(DIY_KEY); } catch (e) { /* 저장소 없음 */ }

function load() {
  const base = initial();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!saved) return base;
    for (const k of Object.keys(base)) {
      if (!(k in saved)) continue;
      const b = base[k];
      base[k] = b && typeof b === 'object' && !Array.isArray(b) ? { ...b, ...saved[k] } : saved[k];
    }
    for (const c of CHARACTERS) base.friends[c.id] = { on: true, style: 'main', bond: 0, ...base.friends[c.id] };
  } catch (e) {
    console.warn('저장된 상태를 읽지 못했어요', e);
  }
  return base;
}

// ---- 저장 & 알림 (여러 번 바뀌어도 한 번만) ----
const listeners = new Set();
let saveTimer = 0;
let notifyQueued = false;

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function commit() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 400);
  if (notifyQueued) return;
  notifyQueued = true;
  queueMicrotask(() => {
    notifyQueued = false;
    listeners.forEach(fn => fn(state));
  });
}

export function flush() {
  clearTimeout(saveTimer);
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn('저장 실패', e); }
}
addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => document.hidden && flush());

export function resetAll() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(DIY_KEY);
}

export const getDiy = () => diy;
export function setDiy(dataUrl) {
  diy = dataUrl;
  try { localStorage.setItem(DIY_KEY, dataUrl); } catch (e) { console.warn('녹음 저장 실패', e); }
}

// ---- 날짜별 기록 ----
export function dayKey(t = Date.now()) {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function day(key = dayKey()) {
  return state.days[key] || { loud: 0, soft: 0, hold: 0, tap: 0 };
}

function dayMut(key) {
  return (state.days[key] ||= { loud: 0, soft: 0, hold: 0, tap: 0 });
}

/** 작전 1회 기록. 네이티브 알람이 보낸 것이든 웹 미리보기든 모두 여기로. */
export function recordOperation({ t, mode }) {
  const m = MODES[mode] ? mode : 'hold';
  dayMut(dayKey(t))[m]++;
  state.acorns += MODES[m].reward;
  return m;
}

/** 쓰다듬기 등으로 얻는 도토리 (하루 상한). 실제로 준 개수를 돌려준다. */
export function grantTapAcorns(n) {
  const d = dayMut(dayKey());
  const give = Math.max(0, Math.min(n, DAILY_TAP_ACORNS - d.tap));
  d.tap += give;
  state.acorns += give;
  return give;
}

export const levelOf = bond => Math.min(10, 1 + Math.floor(bond / LEVEL_STEP));

/** 교감 1회. 레벨이 오르면 보너스 도토리. 새 레벨(올랐을 때만)을 돌려준다. */
export function bond(charId) {
  const f = state.friends[charId];
  const before = levelOf(f.bond);
  f.bond++;
  const after = levelOf(f.bond);
  if (after > before) {
    state.acorns += LEVEL_UP_BONUS;
    return after;
  }
  return 0;
}

export function streak() {
  let n = 0;
  const d = new Date();
  const has = k => { const s = state.days[k]; return s && s.loud + s.soft + s.hold > 0; };
  if (!has(dayKey(d))) d.setDate(d.getDate() - 1);   // 오늘 아직 없으면 어제부터 센다
  while (has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

export function stats() {
  const total = { loud: 0, soft: 0, hold: 0, all: 0 };
  let bestHoldDay = 0;
  for (const d of Object.values(state.days)) {
    total.loud += d.loud; total.soft += d.soft; total.hold += d.hold;
    bestHoldDay = Math.max(bestHoldDay, d.hold);
  }
  total.all = total.loud + total.soft + total.hold;
  return { total, bestHoldDay, fed: state.fed, owned: state.owned, diarySaves: state.diary.saves };
}

/** 새로 열린 보물 목록 (한 번만 알려준다) */
export function takeNewTreasures() {
  const s = stats();
  const fresh = TREASURES.filter(t => t.test(s) && !state.seenTreasures.includes(t.id));
  fresh.forEach(t => state.seenTreasures.push(t.id));
  return fresh;
}
