// node --test tests/*.test.mjs   (Node 18+). 시간대는 Asia/Seoul 로 고정해서 돌린다 (package.json 참고).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { windowLength, windowStart, inWindow, planDay, advancePlan } from '../src/plan.js';

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

test('하루 일정은 시간대 안에서 칸마다 하나, 지난 시각은 빼고', () => {
  const s = { start: 9, end: 18 };
  const times = planDay(at('2026-10-20T09:00'), 0, s, 3, fixed);
  assert.deepEqual(times, [at('2026-10-20T10:30'), at('2026-10-20T13:30'), at('2026-10-20T16:30')]);
  const later = planDay(at('2026-10-20T09:00'), at('2026-10-20T12:00'), s, 3, fixed);
  assert.equal(later.length, 2);
  for (let i = 0; i < 200; i++) {
    for (const t of planDay(at('2026-10-20T09:00'), 0, s, 9)) {
      assert.ok(t > at('2026-10-20T09:00') && t < at('2026-10-20T18:00'));
    }
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
  const afterAll = advancePlan(p1, at('2026-10-21T17:00'), s, () => 3, fixed);
  assert.equal(afterAll.day, at('2026-10-22T09:00'));
});
