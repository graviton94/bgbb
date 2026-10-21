// 함정설치: 폰을 내려놓고 설치 → 누가 들거나 흔들거나 만지는 순간 뿡.
// 흔들림은 devicemotion (권한 필요 없음, 못 읽는 기기는 화면 터치만). 설치 중엔 화면을 검게 해 꺼진 척하고, 앱이면 화면이 안 꺼지게 붙잡는다.
import { charById, face } from './data.js';
import { t, L } from './i18n.js';
import { state, commit, getDiy } from './store.js';
import { native } from './schedule.js';
import { playFriend, warmFriend } from './audio.js';

const $ = id => document.getElementById(id);
const ARM_SECONDS = 5;
const SETTLE_MS = 1200;      // 장전 직후 흔들림이 가라앉을 때까지 기준값만 잡는다
const GRAVITY_JUMP = 1.6;    // m/s² : 기준 대비 이만큼 바뀌면 누가 든 것
const SPIN = 35;             // °/s : 이만큼 돌아도 누가 든 것

let stage = 'setup';
let timer = 0;
let base = null;
let armedAt = 0;
let hits = 0;
let wakeLock = null;
let heroId = 'hamster';

function show(name) {
  stage = name;
  for (const [id, s] of [['cSetup', 'setup'], ['cCountdown', 'countdown'], ['cArmed', 'armed'], ['cCaught', 'caught']]) $(id).hidden = s !== name;
  $('cushion').classList.toggle('dark', name === 'armed');
}

async function keepAwake(on) {
  native?.setKeepAwake?.(on);
  native?.setDim?.(on && stage === 'armed');
  try {
    if (on && !wakeLock && navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen');
    if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch (e) { wakeLock = null; }
}

function onMotion(e) {
  if (stage !== 'armed' && stage !== 'countdown') return;
  const g = e.accelerationIncludingGravity;
  if (!g || g.x == null) return;
  const now = performance.now();
  if (stage === 'countdown' || now - armedAt < SETTLE_MS || !base) {
    // 기준 중력 방향을 천천히 따라간다 (내려놓는 동안의 흔들림은 무시)
    base = base ? { x: base.x * 0.8 + g.x * 0.2, y: base.y * 0.8 + g.y * 0.2, z: base.z * 0.8 + g.z * 0.2 } : { x: g.x, y: g.y, z: g.z };
    return;
  }
  const jump = Math.hypot(g.x - base.x, g.y - base.y, g.z - base.z);
  const r = e.rotationRate || {};
  const spin = Math.hypot(r.alpha || 0, r.beta || 0, r.gamma || 0);
  hits = jump > GRAVITY_JUMP || spin > SPIN ? hits + 1 : 0;
  if (hits >= 2) caught();
}

function onTouch(e) {
  if (stage !== 'armed') return;
  e.preventDefault();
  caught();
}

function arm() {
  heroId = state.hero && state.friends[state.hero]?.on ? state.hero : 'hamster';
  warmFriend(heroId, 'loud');
  base = null;
  hits = 0;
  show('countdown');
  keepAwake(true);
  let left = ARM_SECONDS;
  $('cSec').textContent = left;
  clearInterval(timer);
  timer = setInterval(() => {
    left--;
    $('cSec').textContent = left;
    if (left > 0) return;
    clearInterval(timer);
    armedAt = performance.now();
    show('armed');
    native?.setDim?.(true);
  }, 1000);
}

function caught() {
  if (stage !== 'armed') return;
  native?.setDim?.(false);
  // 내 목소리를 골랐으면 그걸로, 아니면 우렁찬 방구 (2% 레어 포함)
  const style = state.friends[heroId].style === 'diy' ? 'diy' : 'loud';
  playFriend(heroId, style, getDiy(), 1);
  navigator.vibrate?.([60, 40, 120]);
  state.cushion++;
  commit();
  $('cCaughtFace').src = face(heroId, 'burst');
  $('cCaughtCount').textContent = t('cushion.count', { n: state.cushion });
  show('caught');
  keepAwake(false);
}

function stop() {
  clearInterval(timer);
  keepAwake(false);
  native?.setDim?.(false);
  stage = 'setup';
}

export function openCushion() {
  const c = charById(state.hero) || charById('hamster');
  $('cFace').src = face(c.id, 'shameless');
  $('cCount').textContent = state.cushion ? t('cushion.count', { n: state.cushion }) : '';
  show('setup');
  $('cushion').showModal();
  $('cushion').focus();
}

$('cArm').addEventListener('click', arm);
$('cAgain').addEventListener('click', arm);
$('cArmed').addEventListener('pointerdown', onTouch);
$('cushion').addEventListener('close', stop);
addEventListener('devicemotion', onMotion);
document.addEventListener('visibilitychange', () => { if (document.hidden && stage !== 'setup') $('cushion').close(); });
