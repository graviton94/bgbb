// node --test tests/*.test.mjs   (Node 18+). 시간대는 Asia/Seoul 로 고정해서 돌린다 (package.json 참고).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { windowLength, windowStart, inWindow, inRest, planDay, advancePlan, GAP } from '../src/plan.js';

const at = s => new Date(s).getTime();
const H = 3600e3;
const fixed = () => 0.5;

test('시간대 길이: 보통, 자정 넘김, 24시간', () => {
  assert.equal(windowLength({ start: 9, end: 18 }), 9 * H);
  assert.equal(windowLength({ start: 22, end: 2 }), 4 * H);
  assert.equal(windowLength({ start: 0, end: 0 }), 24 * H);
});

test('작전일 시작: 아침 전이면 그날 9시, 자정 넘는 시간대는 전날 밤', () => {
  const day = { start: 9, end: 18 };
  assert.equal(windowStart(at('2026-10-20T08:00'), day), at('2026-10-20T09:00'));
  assert.equal(windowStart(at('2026-10-20T23:00'), day), at('2026-10-20T09:00'));
  const night = { start: 22, end: 2 };
  assert.equal(windowStart(at('2026-10-21T01:00'), night), at('2026-10-20T22:00'));
  assert.equal(windowStart(at('2026-10-21T03:00'), night), at('2026-10-21T22:00'));
  assert.ok(inWindow(at('2026-10-21T01:00'), night));
  assert.ok(!inWindow(at('2026-10-21T03:00'), night));
});

test('하루 일정: 시간대 안, 서로 1시간 이상, 지난 시각은 빼고', () => {
  const s = { start: 7, end: 22 };
  const day = at('2026-10-20T07:00'), end = at('2026-10-20T22:00');
  for (let i = 0; i < 300; i++) {
    const times = planDay(day, 0, s, 10);
    assert.equal(times.length, 10);
    times.forEach((t, k) => {
      assert.ok(t >= day && t < end);
      if (k) assert.ok(t - times[k - 1] >= GAP);
    });
  }
  const later = planDay(day, at('2026-10-20T15:00'), s, 5, fixed);   // 지난 시간은 안 쓰고 남은 시간에 다 뿌림
  assert.ok(later.length === 5 && later.every(t => t > at('2026-10-20T15:00')));
});

test('시간대가 짧으면 1시간 간격을 지킬 수 있는 만큼만', () => {
  const times = planDay(at('2026-10-20T09:00'), 0, { start: 9, end: 12 }, 10);
  assert.equal(times.length, 4);   // 3시간 → 최대 4번 (0 · 1 · 2 · 3시간 뒤)
});

test('쫄 시간: 그 안엔 절대 안 잡히고, 자정 넘김도', () => {
  const rest = { on: true, from: 12 * 60 + 30, to: 14 * 60 };
  const s = { start: 7, end: 22, rest };
  for (let i = 0; i < 300; i++) {
    for (const t of planDay(at('2026-10-20T07:00'), 0, s, 10)) assert.ok(!inRest(t, rest));
  }
  assert.ok(inRest(at('2026-10-20T12:30'), rest));
  assert.ok(inRest(at('2026-10-20T13:59'), rest));
  assert.ok(!inRest(at('2026-10-20T14:00'), rest));
  assert.ok(!inRest(at('2026-10-20T13:00'), { ...rest, on: false }));
  const night = { on: true, from: 21 * 60, to: 8 * 60 };
  assert.ok(inRest(at('2026-10-20T23:00'), night) && inRest(at('2026-10-21T07:59'), night) && !inRest(at('2026-10-21T08:00'), night));
  for (const t of planDay(at('2026-10-20T07:00'), 0, { start: 7, end: 22, rest: night }, 10)) {
    assert.ok(t >= at('2026-10-20T08:00') && t < at('2026-10-20T21:00'));
  }
});

test('일정 이어가기: 오늘 다 쓰면 내일, 재실행해도 같은 일정 유지', () => {
  const s = { start: 9, end: 18 };
  const now = at('2026-10-20T19:00');
  const p1 = advancePlan(null, now, s, () => 3, fixed);
  assert.equal(p1.day, at('2026-10-21T09:00'));
  assert.equal(p1.times.length, 3);
  const p2 = advancePlan(p1, now, s, () => 3, Math.random);
  assert.deepEqual(p2, p1);
  const afterAll = advancePlan(p1, at('2026-10-21T17:59'), s, () => 3, fixed);
  assert.equal(afterAll.day, at('2026-10-22T09:00'));
});

test('설정을 바꿔 새로 뽑아도 마지막으로 터진 뒤 1시간은 쉰다', () => {
  const s = { start: 9, end: 18 };
  const last = at('2026-10-20T10:00');
  for (let i = 0; i < 100; i++) {
    const p = advancePlan(null, at('2026-10-20T10:05'), s, () => 9, Math.random, last);
    assert.ok(p.times.every(t => t >= last + GAP));
  }
});

test('비상탈출에서 돌아오면: 그날 횟수 그대로, 아직 안 터진 만큼 남은 시간에 다시', () => {
  const s = { start: 6, end: 0 };
  const plan = { day: at('2026-10-20T06:00'), times: [at('2026-10-20T09:00')], count: 7, reset: true };
  const now = at('2026-10-20T15:00');
  for (let i = 0; i < 50; i++) {
    const p = advancePlan(plan, now, s, () => 3, Math.random, 0, 2);
    assert.equal(p.day, plan.day);
    assert.equal(p.count, 7);
    assert.equal(p.times.length, 5);   // 7 - 이미 2번
    assert.ok(p.times.every(t => t > now && t < at('2026-10-21T00:00')));
  }
});
