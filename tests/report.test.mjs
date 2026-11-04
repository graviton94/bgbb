import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reportWeek, weekReport } from '../src/report.js';

const at = s => new Date(s).getTime();

test('결산 주: 일요일 21시부터 이번 주, 그 전엔 지난주 (월요일 날짜)', () => {
  assert.equal(reportWeek(at('2026-11-08T21:05')), '2026-11-02');   // 일요일 밤
  assert.equal(reportWeek(at('2026-11-08T20:59')), '2026-10-26');
  assert.equal(reportWeek(at('2026-11-04T12:00')), '2026-10-26');   // 수요일 → 지난주
  assert.equal(reportWeek(at('2026-11-09T09:00')), '2026-11-02');   // 월요일 아침 → 막 끝난 주
});

test('결산 내용: 합계 · 제일 많이 뀐 친구 · 회의 시간 냄 · 새 칭호', () => {
  const days = {
    '2026-11-02': { loud: 2, soft: 1, hold: 0, chars: ['cat', 'tit'], by: { cat: 2, tit: 1 }, loudH: [10, 20] },
    '2026-11-04': { loud: 0, soft: 0, hold: 3, chars: ['cat'], by: { cat: 3 } },
    '2026-11-08': { loud: 1, soft: 0, hold: 0, chars: ['hamster'], by: { hamster: 1 }, loudH: [23] },
    '2026-11-09': { loud: 9, soft: 0, hold: 0, chars: ['hamster'], by: { hamster: 9 } }   // 다음 주라 안 셈
  };
  const titles = { a: { first: at('2026-11-03T12:00') }, b: { first: at('2026-11-10T12:00') } };
  const r = weekReport(days, '2026-11-02', titles);
  assert.equal(r.total, 7);
  assert.deepEqual([r.loud, r.soft, r.hold], [3, 1, 3]);
  assert.equal(r.top, 'cat');
  assert.equal(r.topN, 5);
  assert.equal(r.meetingLoud, 1);
  assert.equal(r.lateLoud, 1);
  assert.equal(r.fresh, 1);
  assert.equal(r.verdict, 'meeting');
  assert.equal(weekReport(days, '2026-10-26'), null);
});
