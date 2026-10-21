// 효과음: WAV 를 처음 한 번만 디코딩해 두고 버퍼를 재사용한다.
import { CHARACTERS } from './data.js';

// 캐릭터 소리마다 서로 다른 녹음 수 (tools/build_sounds.py). 햄찌는 방구 종류가 많다.
const TAKES = { hamster: 6, tit: 3, cat: 3 };
let ctx = null;
let master = null;
const buffers = new Map();

function context() {
  if (!ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
    master = ctx.createGain();
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

const fileUrl = name => `assets/sounds/${name}.wav`;
const takeName = (base, n) => (n === 1 ? base : `${base}_${n}`);

// 자동재생 정책: 첫 터치 때 오디오를 깨우고 효과음을 미리 받아 둔다
addEventListener('pointerdown', () => {
  if (!context()) return;
  const names = ['ui_pop', 'ui_freeze', 'ui_levelup', 'ui_treasure'];
  CHARACTERS.forEach(c => ['main', 'soft', 'loud'].forEach(s => {
    for (let n = 1; n <= TAKES[c.id]; n++) names.push(takeName(`${c.id}_${s}`, n));
  }));
  names.forEach(n => load(fileUrl(n)));
}, { once: true, capture: true });

function load(url) {
  if (!buffers.has(url)) {
    const p = fetch(url).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b));
    p.catch(() => buffers.delete(url));
    buffers.set(url, p);
  }
  return buffers.get(url);
}

export function playUrl(url, volume = 0.8, rate = 1) {
  const c = context();
  if (!c) return;
  load(url).then(buf => {
    const src = c.createBufferSource();
    const gain = c.createGain();
    src.buffer = buf;
    src.playbackRate.value = rate;
    gain.gain.value = volume;
    src.connect(gain).connect(master);
    src.start();
  }).catch(() => {
    const a = new Audio(url);
    a.volume = Math.min(1, volume);
    a.play().catch(() => {});
  });
}

export const play = (name, volume) => playUrl(fileUrl(name), volume);

/** 캐릭터 소리: 여러 녹음 중 하나 + 아주 살짝 다른 빠르기로, 같은 소리도 매번 새롭게. 'diy' 는 내 목소리 */
export function playFriend(charId, style, diyUrl, volume = 0.85) {
  if (style === 'diy') {
    if (diyUrl) playUrl(diyUrl, volume);
    return;
  }
  const n = 1 + Math.floor(Math.random() * (TAKES[charId] || 1));
  playUrl(fileUrl(takeName(`${charId}_${style}`, n)), volume, 0.96 + Math.random() * 0.08);
}

/** 녹음이 바뀌면 이전 디코딩 결과를 버린다 */
export function forget(url) {
  if (url) buffers.delete(url);
}
