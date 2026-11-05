// 앱 상태 하나 + 저장 + 변경 알림. 화면은 subscribe 해서 다시 그린다.
import { CHARACTERS, MODES } from './data.js';
import { TITLES, pickTitle, contextOf, titleById } from './titles.js';
import { COINS, TITLE_BONUS, DEFAULT_EQUIP } from './items.js';

const KEY = 'bgbb.v2';
const DIY_KEY = 'bgbb.v1.diy';   // 녹음은 커서 따로 둔다 (상태 저장 때마다 다시 쓰지 않게)
const RECENT = 30;

function initial() {
  return {
    onboarded: false,
    seenVersion: '',      // 패치노트를 마지막으로 본 버전
    rulesSeen: false,
    guideV: 0,            // 본 안내 버전 (main.js GUIDE_V)
    reviewAsked: false,   // Play 인앱 리뷰를 한 번 띄웠는지
    daily: { day: '', counts: {}, claimed: [] },
    reportSeen: '',       // 주간 결산: 마지막으로 본 주 (월요일 날짜)
    shares: 0,            // 짤 자랑 누적 (숨김 업적)
    snooze: { day: '', n: 0 },   // 그날 [5분만 더] 횟수 (숨김 업적)   // 오늘의 미션: 그날 센 횟수 (캐릭터 누르기 · 짤 뽑기 · 공유 · 함정) · 받은 미션     // 소리 규칙 (중요!) 을 한 번 봤는지. 이미 쓰던 사람은 업데이트 후 한 번 띄움
    friends: Object.fromEntries(CHARACTERS.map(c => [c.id, { on: true, diy: false }])),   // diy = 내 목소리 섞기
    hero: 'hamster',      // 홈에 서 있는 친구
    // rest = 쫄? 매일 쉬는 시간 (분, 소리·진동 없음) · wake = 기상 알람 (분). 켜면 그 시각부터 24시까지가 방구 시간
    schedule: { on: true, start: 6, end: 0, freq: 'normal', rest: { on: false, from: 12 * 60, to: 13 * 60 }, wake: { on: false, at: 7 * 60, days: [true, true, true, true, true, true, true], once: 0 } },
    frozen: false,
    previewMode: 'loud',  // 웹 미리보기에서 흉내 낼 폰 상태
    notify: true,         // 터진 뒤 알림 문구 (앱)
    days: {},             // 'YYYY-MM-DD' → { loud, soft, hold, chars: [], last }
    titles: {},           // 칭호 id → { n, first, ev: 처음 받은 순간 { t, char, mode } (칭호 짤이 이걸로 고정), last }
    recent: [],           // 최근 터진 기록 [{ t, char, mode, title }]
    cushion: 0,           // 방석 모드에 걸린 횟수
    gacha: { day: '', n: 0, ads: 0 },   // 오늘 '짤 뽑기' 쓴 횟수 (하루 무료 1번 + 광고 한 번에 1번, 광고는 3번까지)
    coinTokens: [],       // 이미 코인을 넣은 충전 결제 토큰 (같은 결제를 두 번 넣지 않게, 최근 것만)
    coins: 0,             // 뿡코인 (꾸미기 상점)
    bought: {},           // 산 꾸미기 아이템 id → true
    equip: { ...DEFAULT_EQUIP },   // 장착 중 { bg, prop, bubble, look }
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
      // 작전 시간은 06~24시 (기상 알람을 켜면 그 시각~24시), 끄는 건 비상탈출로만
      if (k === 'equip') base.equip = { ...DEFAULT_EQUIP, ...saved.equip };
      if (k === 'schedule') Object.assign(base.schedule, { on: true, start: 6, end: 0, rest: { ...initial().schedule.rest, ...saved.schedule?.rest }, wake: { ...initial().schedule.wake, ...saved.schedule?.wake } });
    }
    for (const c of CHARACTERS) {
      const f = base.friends[c.id] || {};
      base.friends[c.id] = { on: f.on !== false, diy: f.diy ?? f.style === 'diy' };   // 예전 '소리 고르기' 는 버린다
    }
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
  localStorage.removeItem('bgbb.v1');
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

const emptyDay = () => ({ loud: 0, soft: 0, hold: 0, chars: [], last: null });
export const day = (key = dayKey()) => state.days[key] || emptyDay();
/** 숨김 업적 주기 (이스터에그): 이미 있으면 null. 방구 기록은 안 남김 */
export function grantHidden(id) {
  const x = titleById(id);
  if (!x?.hidden || state.titles[id]) return null;
  const t = Date.now(), ev = { t, char: state.hero, mode: 'loud' };
  state.titles[id] = { n: 1, first: t, ev, last: ev };
  const coins = TITLE_BONUS[x.rarity];
  state.coins += coins;
  commit();
  return { id, coins, ev };
}
/** 오늘의 미션 기록 (날이 바뀌면 새로) */
export const dailyToday = () => (state.daily?.day === dayKey() ? state.daily : (state.daily = { day: dayKey(), counts: {}, claimed: [] }));
/** 오늘의 미션 횟수 하나 올리기: tap · gacha · share · trap */
export function bump(key) {
  const c = dailyToday().counts;
  c[key] = (c[key] || 0) + 1;
  commit();
}
const count = d => d.loud + d.soft + d.hold;

export function streak(from = Date.now()) {
  let n = 0;
  const d = new Date(from);
  const has = k => state.days[k] && count(state.days[k]) > 0;
  if (!has(dayKey(d))) d.setDate(d.getDate() - 1);   // 오늘 아직 없으면 어제부터 센다
  while (has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

export function totals() {
  const s = { loud: 0, soft: 0, hold: 0, all: 0 };
  for (const d of Object.values(state.days)) { s.loud += d.loud; s.soft += d.soft; s.hold += d.hold; }
  s.all = s.loud + s.soft + s.hold;
  return s;
}

export const ownedCount = () => TITLES.filter(x => state.titles[x.id]).length;

/**
 * 터진 것 1회 기록 + 칭호. 네이티브 알람이 보낸 것이든 웹 미리보기든 모두 여기로.
 * 돌려주는 것: { t, char, mode, title(id), isNew, coins(이번에 번 뿡코인) }
 */
export function recordOperation({ t, char, mode, why, ear }) {
  const m = MODES[mode] ? mode : 'hold';
  const who = CHARACTERS.some(c => c.id === char) ? char : 'hamster';
  const d = (state.days[dayKey(t)] ||= emptyDay());
  d.chars ||= [];
  const prev = d.last || null;
  d[m]++;
  if (!d.chars.includes(who)) d.chars.push(who);
  (d.hours ||= []).push(new Date(t).getHours());   // 오늘의 미션 (점심 · 아침 · 밤)
  (d.by ||= {})[who] = (d.by[who] || 0) + 1;   // 주간 결산: 친구별 횟수
  if (m === 'loud') (d.loudH ||= []).push(new Date(t).getHours());   // 주간 결산: 최악의 타이밍
  d.last = m;
  // why = 참음 이유 (dnd · saver · silent · late7 · nosound · novibe) · ear = 이어폰으로 냄 (냄으로 치고 표시만)
  const ev = { t, char: who, mode: m, ...(m === 'hold' && why ? { why } : {}), ...(m === 'loud' && ear ? { ear: true } : {}) };
  const c = contextOf(ev, {
    today: { loud: d.loud, soft: d.soft, hold: d.hold }, prev, charsToday: d.chars.length,
    streak: streak(t), total: totals().all, nth: count(d)
  });
  const title = pickTitle(c, state.titles);
  const isNew = !state.titles[title.id];
  if (isNew) d.fresh = (d.fresh || 0) + 1;
  const own = (state.titles[title.id] ||= { n: 0, first: t, ev });
  own.n++;
  own.last = ev;
  state.recent.unshift({ ...ev, title: title.id });
  state.recent.length = Math.min(state.recent.length, RECENT);
  const coins = COINS[m] + (isNew ? TITLE_BONUS[title.rarity] : 0);
  state.coins += coins;
  return { ...ev, title: title.id, isNew, coins };
}
