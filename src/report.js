// 이번 주 방구 결산 (월~일). 일요일 밤 9시부터 그 주 것을 한 번 보여 준다. 순수 함수 (tests/report.test.mjs).
//   days = state.days ('YYYY-MM-DD' → { loud, soft, hold, chars, by: {친구: 횟수}, loudH: [냄 시각들], fresh })

const key = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** now 기준으로 보여 줄 주의 월요일 'YYYY-MM-DD': 일요일 21시부터는 이번 주, 그 전엔 지난주 */
export function reportWeek(now = Date.now()) {
  const d = new Date(now);
  const wd = d.getDay();   // 0 = 일
  const back = wd === 0 ? (d.getHours() >= 21 ? 6 : 13) : wd - 1 + 7;
  d.setDate(d.getDate() - back);
  return key(d);
}

/** 그 주 결산. 하나도 안 터졌으면 null */
export function weekReport(days, monday, titles = {}) {
  const start = new Date(`${monday}T00:00`);
  const keys = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return key(d); });
  const sum = { loud: 0, soft: 0, hold: 0 }, by = {}, perDay = [];
  let meetingLoud = 0, lateLoud = 0;
  keys.forEach((k, i) => {
    const d = days[k];
    const n = d ? d.loud + d.soft + d.hold : 0;
    perDay.push(n);
    if (!d) return;
    sum.loud += d.loud; sum.soft += d.soft; sum.hold += d.hold;
    for (const [c, v] of Object.entries(d.by || {})) by[c] = (by[c] || 0) + v;
    if (!d.by) for (const c of d.chars || []) by[c] = (by[c] || 0) + 1;   // 예전 기록은 나온 친구만 앎
    const weekday = i < 5;
    for (const h of d.loudH || []) {
      if (weekday && (h === 10 || h === 14 || h === 15)) meetingLoud++;
      if (h >= 23) lateLoud++;
    }
  });
  const total = sum.loud + sum.soft + sum.hold;
  if (!total) return null;
  const top = Object.entries(by).sort((a, b) => b[1] - a[1])[0] || ['hamster', 0];
  const end = new Date(start); end.setDate(end.getDate() + 7);
  const fresh = Object.values(titles).filter(x => x.first >= start.getTime() && x.first < end.getTime()).length;
  const best = perDay.indexOf(Math.max(...perDay));
  // 이번 주 한 줄 평: 제일 눈에 띄는 것 하나
  const verdict = meetingLoud ? 'meeting' : sum.hold > sum.loud + sum.soft ? 'patient' : sum.loud >= total * 0.6 ? 'loud' : lateLoud ? 'night' : sum.soft >= total * 0.5 ? 'shy' : 'balanced';
  return { monday, total, ...sum, top: top[0], topN: top[1], fresh, perDay, bestDay: best, meetingLoud, lateLoud, verdict };
}
