import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TITLES, RARITY, JACKPOT, pickTitle, contextOf, titleById } from '../src/titles.js';

const base = { mode: 'loud', char: 'hamster', hour: 16, wd: 3, nth: 2, today: { loud: 1, soft: 0, hold: 0 }, prev: null, charsToday: 1, streak: 1, total: 2 };
const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; };

test('칭호는 45개 (잭팟 5), id 는 겹치지 않고 글은 두 언어 다 있다', () => {
  assert.equal(TITLES.length, 45);
  assert.equal(TITLES.filter(x => x.rarity === 'jackpot').length, 5);
  assert.equal(new Set(TITLES.map(x => x.id)).size, 45);
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
  contexts.push({ ...base, nth: 1 }, { ...base, nth: 1, hour: 7 }, { ...base, nth: 5 }, { ...base, streak: 60 }, { ...base, total: 300 }, { ...base, nth: 1, hour: 6 }, { ...base, hour: 23 },
    { ...base, charsToday: 3 }, { ...base, prev: 'loud' }, { ...base, prev: 'hold' },
    { ...base, mode: 'hold', today: { loud: 0, soft: 0, hold: 5 } }, { ...base, mode: 'soft', today: { loud: 0, soft: 3, hold: 0 } },
    { ...base, today: { loud: 5, soft: 1, hold: 1 } });
  for (const x of TITLES.filter(x => x.rarity !== 'jackpot')) assert.ok(contexts.some(c => x.test(c)), `${x.id} 는 나올 수 없음`);
});

test('기념 칭호(연속 · 누적)는 넘긴 뒤 아직 없으면 무조건 주고, 있으면 다시 안 나온다', () => {
  const c = { ...base, mode: 'loud', hour: 16, wd: 3, total: 300 };
  assert.equal(pickTitle(c, {}, seq(0.5, 0.99, 0.99)).id, 'total100');
  assert.equal(pickTitle(c, { total100: { n: 1 } }, seq(0.5, 0.99, 0.99)).id, 'total50');
  for (let i = 0; i < 50; i++) assert.ok(!['total100', 'total50'].includes(pickTitle(c, { total100: { n: 1 }, total50: { n: 1 } }).id));
});

test('어떤 상황이든 결과 모드에 맞는 기본 칭호는 항상 후보다', () => {
  for (const mode of ['loud', 'soft', 'hold']) {
    const got = pickTitle({ ...base, mode, hour: 16 }, {}, seq(0.5, 0.99, 0));
    assert.ok(got.test({ ...base, mode, hour: 16 }));
  }
});

test('가진 칭호라고 피하지 않는다 (나오면 꽝) · 노멀이 레전드보다 훨씬 잘 나온다', () => {
  const c = { ...base, mode: 'loud', char: 'hamster', hour: 14, wd: 2 };   // 회의실 테러범(레전드) + 노멀 여럿
  const cands = TITLES.filter(x => x.test(c)).map(x => x.id);
  const ownedAllButLegend = Object.fromEntries(cands.filter(id => id !== 'meeting_loud').map(id => [id, { n: 1 }]));
  let legend = 0;
  for (let i = 0; i < 2000; i++) if (pickTitle(c, ownedAllButLegend).id === 'meeting_loud') legend++;
  assert.ok(legend > 0 && legend < 300, `레전드 ${legend}/2000`);
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

test('0.5% 는 잭팟: 5개 중 아무거나 (가진 것도)', () => {
  const jp = TITLES.filter(x => x.rarity === 'jackpot');
  assert.equal(pickTitle(base, {}, seq(JACKPOT / 2, 0)).rarity, 'jackpot');
  const owned = Object.fromEntries(jp.map(x => [x.id, { n: 1 }]));
  assert.equal(pickTitle(base, owned, seq(0, 0)).id, jp[0].id);
  assert.notEqual(pickTitle(base, {}, seq(JACKPOT, 0)).rarity, 'jackpot');
});
