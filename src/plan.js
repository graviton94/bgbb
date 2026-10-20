// 작전 일정 계산 (순수 함수, 테스트 대상). PrankScheduler.java 와 같은 규칙:
// 작전 시간대를 N칸으로 나누고 칸마다 한 번, 칸 양끝 10%는 비워 연달아 울리지 않게 한다.
const HOUR = 3600e3;

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

/** start 에서 시작하는 작전일의 시각들 중 now+1분 이후만. count 는 하루 횟수. */
export function planDay(start, now, schedule, count, random = Math.random) {
  const slot = windowLength(schedule) / count;
  const times = [];
  for (let i = 0; i < count; i++) {
    const t = Math.round(start + i * slot + slot * (0.1 + 0.8 * random()));
    if (t > now + 60e3) times.push(t);
  }
  return times;
}

export function nextDay(t) {
  const d = new Date(t);
  d.setDate(d.getDate() + 1);
  return d.getTime();
}

/**
 * 남은 일정을 이어서 다음 계획을 만든다.
 * plan = { day, times } | null. 오늘 것을 다 쓰면 다음 날, 설정 직후(null)면 오늘 남은 시간부터.
 */
export function advancePlan(plan, now, schedule, pickCount, random = Math.random) {
  const today = windowStart(now, schedule);
  const times = plan ? plan.times.filter(t => t > now) : [];
  if (plan && times.length) return { day: plan.day, times };
  let day = !plan || plan.day < today ? today : nextDay(plan.day);
  for (let i = 0; i < 3; i++, day = nextDay(day)) {
    const next = planDay(day, now, schedule, pickCount(), random);
    if (next.length) return { day, times: next };
  }
  return { day, times: [] };
}
