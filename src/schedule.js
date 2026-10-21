// 불시 작전 일정 연결.
//  - 안드로이드 앱: window.BgbbNative 가 AlarmManager 로 앱이 꺼져 있어도 실행한다. 여기선 설정만 넘긴다.
//  - 브라우저: 같은 규칙(plan.js)으로 탭이 열려 있는 동안만 setTimeout 으로 흉내 낸다.
import { CHARACTERS, FREQUENCIES } from './data.js';
import { state, commit, flush } from './store.js';
import { windowLength, windowStart, inWindow as inWin, inRest, advancePlan } from './plan.js';

export const native = window.BgbbNative || null;
const HOUR = 3600e3;

export function windowLabel({ start, end } = state.schedule) {
  if (start === end) return '24h';
  const f = h => `${String(h).padStart(2, '0')}:00`;
  return `${f(start)}~${f(end)}`;
}

export const anyFriendOn = () => CHARACTERS.some(c => state.friends[c.id].on);
export const isActive = () => state.schedule.on && !state.frozen && anyFriendOn();
export const inWindow = (now = Date.now()) => inWin(now, state.schedule);
export const resting = (now = Date.now()) => inRest(now, state.schedule.rest);
const hm = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
export const restLabel = (rest = state.schedule.rest) => `${hm(rest.from)}~${hm(rest.to)}`;

export function remainingToday() {
  if (!isActive()) return 0;
  if (native) return native.remainingToday();
  const end = windowStart(Date.now(), state.schedule) + windowLength(state.schedule);
  return (state.plan?.times || []).filter(t => t > Date.now() && t < end).length;
}

function dailyCount() {
  const [lo, hi] = FREQUENCIES[state.schedule.freq].range;
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

function configJson() {
  return JSON.stringify({
    on: state.schedule.on,
    frozen: state.frozen,
    start: state.schedule.start,
    end: state.schedule.end,
    freq: state.schedule.freq,
    rest: state.schedule.rest,
    sounds: CHARACTERS.filter(c => state.friends[c.id].on).map(c => ({ char: c.id, sound: state.friends[c.id].style }))
  });
}

/**
 * 작전 설정이 실제로 바뀌었을 때만 일정을 새로 뽑는다.
 * (앱을 열 때마다 다시 뽑으면 하루 횟수가 늘어나 버린다)
 */
export function syncSchedule(onFire) {
  const cfg = configJson();
  if (cfg !== state.sentConfig) {
    state.sentConfig = cfg;
    state.plan = null;
    if (native) native.configure(cfg);
    flush();
  }
  if (!native) armWebTimer(onFire);
  commit();
}

let timer = 0;
let lastOnFire = null;

export function armWebTimer(onFire = lastOnFire) {
  lastOnFire = onFire;
  clearTimeout(timer);
  if (native || !isActive()) return;
  const now = Date.now();
  const before = JSON.stringify(state.plan);
  state.plan = advancePlan(state.plan, now, state.schedule, dailyCount, Math.random, state.recent[0]?.t || 0);
  if (JSON.stringify(state.plan) !== before) commit();
  const due = state.plan.times[0];
  if (!due) return;
  timer = setTimeout(() => {
    if (Date.now() >= due && !resting()) onFire?.();
    armWebTimer();
  }, Math.min(due - now, 6 * HOUR));
}
