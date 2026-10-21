// 작전 일정 계산 (순수 함수, 테스트 대상). PrankScheduler.java 와 같은 규칙:
//  - 작전 시간대(06~24시 고정)에서 쉬는 시간(rest)을 뺀 '열린 시간'에만 터진다.
//  - 하루 횟수만큼 열린 시간 아무 데나 뽑되, 서로 최소 1시간(GAP)은 떨어지게 한다 (의외성 · 시끄러운 앱 방지).
//    방법: 열린 시간에서 (n-1)×GAP 만큼 접은 구간에 n개를 고르게 뿌리고 정렬한 뒤, i번째에 i×GAP 을 더해 편다.
//  - 열린 시간이 짧으면 GAP 을 지킬 수 있는 만큼만.
const HOUR = 3600e3;
export const GAP = HOUR;

export function windowLength({ start, end }) {
  const h = ((end - start) % 24 + 24) % 24;
  return (h === 0 ? 24 : h) * HOUR;
}

/** now 가 속한 작전일의 시작 시각 (22~02시처럼 자정을 넘는 시간대 포함) */
export function windowStart(now, schedule) {
  const d = new Date(now);
  d.setHours(schedule.start, 0, 0, 0);
  const start = d.getTime();
  if (start > now) {
    d.setDate(d.getDate() - 1);
    if (now < d.getTime() + windowLength(schedule)) return d.getTime();
  }
  return start;
}

export function inWindow(now, schedule) {
  const s = windowStart(now, schedule);
  return now >= s && now < s + windowLength(schedule);
}

// 쉬는 시간 (쫄?): rest = { on, from, to } — 하루 중 분 (0~1439). 매일 같은 시각, 자정 넘김 포함
const DAY_MIN = 1440;
const restOn = rest => !!rest?.on && rest.from !== rest.to;
const restMinutes = rest => (((rest.to - rest.from) % DAY_MIN) + DAY_MIN) % DAY_MIN;

/** now 가 쉬는 시간 안인지 */
export function inRest(now, rest) {
  if (!restOn(rest)) return false;
  const d = new Date(now);
  const m = d.getHours() * 60 + d.getMinutes();
  return (((m - rest.from) % DAY_MIN) + DAY_MIN) % DAY_MIN < restMinutes(rest);
}

/** 작전일 [start, start+길이) 에서 쉬는 시간을 뺀 열린 구간들 [[a, b], …] */
export function openSegments(start, schedule) {
  const end = start + windowLength(schedule);
  let segs = [[start, end]];
  if (!restOn(schedule.rest)) return segs;
  const len = restMinutes(schedule.rest) * 60e3;
  for (let k = -1; k <= 1; k++) {
    const d = new Date(start);
    d.setDate(d.getDate() + k);
    d.setHours(0, schedule.rest.from, 0, 0);
    const rs = d.getTime(), re = rs + len;
    segs = segs.flatMap(([a, b]) => (re <= a || rs >= b ? [[a, b]] : [[a, Math.min(b, rs)], [Math.max(a, re), b]].filter(([x, y]) => y > x)));
  }
  return segs;
}

/** start 에서 시작하는 작전일의 시각들 중 notBefore 이후만. count 는 하루 횟수. */
export function planDay(start, notBefore, schedule, count, random = Math.random) {
  const segs = openSegments(start, schedule);
  const open = segs.reduce((n, [a, b]) => n + (b - a), 0);
  const n = Math.min(count, Math.floor(open / GAP) + 1);
  if (open <= 0 || n <= 0) return [];
  const slack = open - (n - 1) * GAP;
  const offsets = Array.from({ length: n }, () => random() * slack).sort((a, b) => a - b).map((u, i) => u + i * GAP);
  // 열린 시간 안의 위치 → 실제 시각
  const times = offsets.map(o => {
    for (const [a, b] of segs) {
      if (o < b - a) return Math.round(a + o);
      o -= b - a;
    }
    return segs[segs.length - 1][1] - 1;
  });
  return times.filter(t => t > notBefore);
}

export function nextDay(t) {
  const d = new Date(t);
  d.setDate(d.getDate() + 1);
  return d.getTime();
}

/**
 * 남은 일정을 이어서 다음 계획을 만든다.
 * plan = { day, times } | null. 오늘 것을 다 쓰면 다음 날, 설정 직후(null)면 오늘 남은 시간부터.
 * last = 마지막으로 터진 시각: 설정을 바꿔 새로 뽑아도 그때부터 GAP 은 지킨다.
 */
export function advancePlan(plan, now, schedule, pickCount, random = Math.random, last = 0) {
  const today = windowStart(now, schedule);
  const times = plan ? plan.times.filter(t => t > now) : [];
  if (plan && times.length) return { day: plan.day, times };
  const notBefore = Math.max(now + 60e3, last + GAP);
  let day = !plan || plan.day < today ? today : nextDay(plan.day);
  for (let i = 0; i < 3; i++, day = nextDay(day)) {
    const next = planDay(day, notBefore, schedule, pickCount(), random);
    if (next.length) return { day, times: next };
  }
  return { day, times: [] };
}
