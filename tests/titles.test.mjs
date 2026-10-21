import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TITLES, RARITY, pickTitle, contextOf, titleById } from '../src/titles.js';

const base = { mode: 'loud', char: 'hamster', hour: 16, wd: 3, nth: 2, today: { loud: 1, soft: 0, hold: 0 }, prev: null, charsToday: 1, streak: 1, total: 2 };
const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; };

test('칭호는 40개, id 는 겹치지 않고 글은 두 언어 다 있다', () => {
  assert.equal(TITLES.length, 40);
  assert.equal(new Set(TITLES.map(x => x.id)).size, 40);
  for (const x of TITLES) {
    assert.ok(RARITY[x.rarity], x.id);
    for (const k of ['name', 'hint', 'how']) assert.ok(x[k].ko && x[k].en, `${x.id}.${k}`);
  }
});

test('모든 칭호는 어떤 상황에서든 나올 수 있다', () => {
  const contexts = [];
  for (const mode of ['loud', 'soft', 'hold'])
    for (const char of ['hamster', 'tit', 'cat'])
      for (let hour = 0; hour < 24; hour++)
        for (let wd = 0; wd < 7; wd++)
          contexts.push({ ...base, mode, char, hour, wd });
  contexts.push({ ...base, nth: 1 }, { ...base, nth: 5 }, { ...base, streak: 30 }, { ...base, total: 100 },
    { ...base, charsToday: 3 }, { ...base, prev: 'loud' }, { ...base, prev: 'hold' },
    { ...base, mode: 'hold', today: { loud: 0, soft: 0, hold: 5 } }, { ...base, mode: 'soft', today: { loud: 0, soft: 3, hold: 0 } },
    { ...base, today: { loud: 5, soft: 1, hold: 1 } });
  for (const x of TITLES) assert.ok(contexts.some(c => x.test(c)), `${x.id} 는 나올 수 없음`);
});

test('어떤 상황이든 결과 모드에 맞는 기본 칭호는 항상 후보다', () => {
  for (const mode of ['loud', 'soft', 'hold']) {
    const got = pickTitle({ ...base, mode, hour: 16 }, {}, seq(0.99, 0));
    assert.ok(got.test({ ...base, mode, hour: 16 }));
  }
});

test('아직 없는 칭호를 먼저 고르고, 다 가졌으면 전체에서 고른다', () => {
  const c = { ...base, mode: 'loud', char: 'hamster', hour: 16, wd: 3 };
  const cands = TITLES.filter(x => x.test(c)).map(x => x.id);
  const ownedAllButOne = Object.fromEntries(cands.slice(1).map(id => [id, { n: 1 }]));
  assert.equal(pickTitle(c, ownedAllButOne, seq(0.1, 0.5)).id, cands[0]);
  const ownedAll = Object.fromEntries(cands.map(id => [id, { n: 1 }]));
  assert.ok(cands.includes(pickTitle(c, ownedAll, seq(0.1, 0.5)).id));
});

test('회의 시간 소리 모드는 회의실 테러범이 후보에 든다', () => {
  const c = { ...base, mode: 'loud', hour: 14, wd: 2 };
  assert.ok(titleById('meeting_loud').test(c));
  assert.ok(!titleById('meeting_loud').test({ ...c, wd: 0 }));
});

test('contextOf 는 시각에서 시·요일을 뽑는다', () => {
  const t = new Date(2026, 9, 19, 14, 7).getTime();   // 2026-10-19 월요일 14:07
  const c = contextOf({ t, char: 'cat', mode: 'hold' }, { today: { loud: 0, soft: 0, hold: 1 }, prev: null, charsToday: 1, streak: 1, total: 1, nth: 1 });
  assert.equal(c.hour, 14);
  assert.equal(c.wd, 1);
  assert.equal(c.char, 'cat');
});
