import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MISSIONS, pickMissions, missionProgress } from '../src/missions.js';

test('오늘의 미션: 날마다 서로 다른 세 개, 같은 날은 늘 같음', () => {
  const seen = new Set();
  for (let i = 1; i <= 60; i++) {
    const key = `2026-11-${String((i % 30) + 1).padStart(2, '0')}`;
    const ids = pickMissions(key);
    assert.equal(ids.length, 3);
    assert.equal(new Set(ids).size, 3);
    assert.deepEqual(ids, pickMissions(key));
    ids.forEach(id => seen.add(id));
  }
  assert.ok(seen.size >= MISSIONS.length - 2, `한 달 동안 ${seen.size}종 나옴`);
});

test('진행도: 그날 기록과 횟수로 계산, 목표를 넘지 않음', () => {
  const d = { loud: 2, soft: 0, hold: 1, chars: ['cat', 'tit'], hours: [8, 12, 22], fresh: 1 };
  const p = missionProgress(['loud1', 'soft1', 'all3', 'lunch', 'tap30', 'trinity'], d, { tap: 45 }, ['loud1']);
  const by = Object.fromEntries(p.map(x => [x.id, x]));
  assert.ok(by.loud1.done && by.loud1.claimed);
  assert.ok(!by.soft1.done);
  assert.equal(by.all3.n, 2);
  assert.ok(by.lunch.done);
  assert.equal(by.tap30.n, 30);
  assert.equal(by.trinity.n, 2);
});
