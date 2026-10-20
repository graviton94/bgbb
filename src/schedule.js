// 불시 작전 일정.
//  - 안드로이드 앱: window.BgbbNative 가 AlarmManager 로 앱이 꺼져 있어도 실행한다. 여기선 설정만 넘긴다.
//  - 브라우저: 같은 규칙으로 탭이 열려 있는 동안만 setTimeout 으로 흉내 낸다.
// 일정 규칙(PrankScheduler.java 와 동일): 작전 시간대를 N칸으로 나누고 칸마다 한 번, 칸 양끝 10%는 비운다.
import { CHARACTERS, FREQUENCIES } from './data.js';
import { state, commit, flush } from './store.js';

export const native = window.BgbbNative || null;
const HOUR = 3600e3;

export function windowLength({ start, end } = state.schedule) {
  const h = ((end - start) % 24 + 24) % 24;
  return (h === 0 ? 24 : h) * HOUR;
}

/** now 가 속한 작전일의 시작 시각 (자정을 넘는 22~02시 같은 시간대 포함). */
export function windowStart(now = Date.now(), schedule = state.schedule) {
  const d = new Date(now);
  d.setHours(schedule.start, 0, 0, 0);
  const start = d.getTime();
  if (start > now) {
    d.setDate(d.getDate() - 1);
    if (now < d.getTime() + windowLength(schedule)) return d.getTime();
  }
  return start;
}

export function planDay(start, now, schedule = state.schedule) {
  const [lo, hi] = FREQUENCIES[schedule.freq].range;
  const count = lo + Math.floor(Math.random() * (hi - lo + 1));
  const slot = windowLength(schedule) / count;
  const times = [];
  for (let i = 0; i < count; i++) {
    const t = Math.round(start + i * slot + slot * (0.1 + 0.8 * Math.random()));
    if (t > now + 60e3) times.push(t);
  }
  return times;
}

const nextDay = t => { const d = new Date(t); d.setDate(d.getDate() + 1); return d.getTime(); };

export function windowLabel({ start, end } = state.schedule) {
  if (start === end) return '24시간';
  const f = h => `${String(h).padStart(2, '0')}시`;
  return `${f(start)}~${f(end)}`;
}

export const anyFriendOn = () => CHARACTERS.some(c => state.friends[c.id].on);
export const isActive = () => state.schedule.on && !state.frozen && anyFriendOn();

/** 지금 작전 시간대 안인가 */
export function inWindow(now = Date.now()) {
  return now >= windowStart(now) && now < windowStart(now) + windowLength();
}

export function remainingToday() {
  if (!isActive()) return 0;
  if (native) return native.remainingToday();
  const end = windowStart() + windowLength();
  return (state.plan?.times || []).filter(t => t > Date.now() && t < end).length;
}

function configJson() {
  return JSON.stringify({
    on: state.schedule.on,
    frozen: state.frozen,
    start: state.schedule.start,
    end: state.schedule.end,
    freq: state.schedule.freq,
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
  const today = windowStart(now);
  let plan = state.plan;
  if (plan) plan.times = plan.times.filter(t => t > now);
  if (!plan || !plan.times.length) {
    let d = !plan || plan.day < today ? today : nextDay(plan.day);
    for (let i = 0; i < 3; i++, d = nextDay(d)) {
      plan = { day: d, times: planDay(d, now) };
      if (plan.times.length) break;
    }
    state.plan = plan;
    commit();
  }
  if (!plan.times.length) return;

  const due = plan.times[0];
  timer = setTimeout(() => {
    if (Date.now() >= due) {
      state.plan.times.shift();
      onFire?.();
    }
    armWebTimer();
  }, Math.min(due - now, 6 * HOUR));
}
