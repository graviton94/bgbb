// 효과음: WAV 를 처음 한 번만 디코딩해 두고 버퍼를 재사용한다.
import { CHARACTERS } from './data.js';

let ctx = null;
const buffers = new Map();

function context() {
  if (!ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// 자동재생 정책: 첫 터치 때 오디오를 깨우고 효과음을 미리 받아 둔다
addEventListener('pointerdown', () => {
  if (!context()) return;
  const names = ['ui_pop', 'ui_coin', 'ui_freeze'];
  CHARACTERS.forEach(c => ['main', 'soft', 'loud'].forEach(s => names.push(`${c.id}_${s}`)));
  names.forEach(n => load(fileUrl(n)));
}, { once: true, capture: true });

const fileUrl = name => `assets/sounds/${name}.wav`;

function load(url) {
  if (!buffers.has(url)) {
    const p = fetch(url).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b));
    p.catch(() => buffers.delete(url));
    buffers.set(url, p);
  }
  return buffers.get(url);
}

export function playUrl(url, volume = 0.8) {
  const c = context();
  if (!c) return;
  load(url).then(buf => {
    const src = c.createBufferSource();
    const gain = c.createGain();
    src.buffer = buf;
    gain.gain.value = volume;
    src.connect(gain).connect(c.destination);
    src.start();
  }).catch(() => {
    const a = new Audio(url);
    a.volume = volume;
    a.play().catch(() => {});
  });
}

export const play = (name, volume) => playUrl(fileUrl(name), volume);

/** 캐릭터 소리. style 이 'diy' 면 녹음한 내 목소리 */
export function playFriend(charId, style, diyUrl, volume = 0.85) {
  if (style === 'diy') {
    if (diyUrl) playUrl(diyUrl, volume);
    return;
  }
  play(`${charId}_${style}`, volume);
}

/** 녹음이 바뀌면 이전 디코딩 결과를 버린다 */
export function forget(url) {
  if (url) buffers.delete(url);
}
