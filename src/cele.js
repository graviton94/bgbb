// 획득 팝업 (터지는 화면 앞에 2~3초): 노멀·레어 = 빵빠레 + 지폐 펑 · 레전드 = B급 PPT · 잭팟 = 돈폭탄 · 아이템 = 상자깡.
// 그림은 전부 이미 있는 에셋 (assets/deco · assets/skin · 실사 얼굴). 없는 에셋은 그냥 빠진다.
import { face, GOOFS, shortGoofs } from './data.js';
import { SHADES_URL, SHADES_BOX } from './pixels.js';
import { itemById } from './items.js';
import { DECOR_FONTS } from './memes.js';
import { t, L } from './i18n.js';

const deco = name => `assets/deco/${name}.webp`;
const src = id => itemById(id)?.src || null;   // PENDING 이면 null
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const rnd = (a, b) => a + Math.random() * (b - a);
const many = (n, fn) => Array.from({ length: n }, (_, i) => fn(i)).join('');
const img = (s, cls, style = '') => (s ? `<img class="${cls}" src="${s}" style="${style}" alt="">` : '');

const pick = list => list[Math.floor(Math.random() * list.length)];
const goof = () => pick(L(GOOFS));
const shortGoof = () => pick(shortGoofs(L(GOOFS)));
/** 틀린 칭찬 스티커 (줄바꿈 그대로) */
const decor = (p = 0.6) => (Math.random() < p ? `f-${pick(DECOR_FONTS)}` : '');
const goofTag = (cls, s = goof()) => `<span class="c-goof ${cls} ${decor(0.7)}">${esc(s)}</span>`;

const COLORS = ['#D7FF3D', '#FFD400', '#FF6FB5', '#7EC8FF', '#FFFFFF', '#FF2E2E'];
const confetti = n => many(n, i => `<i class="c-conf" style="left:${rnd(0, 100).toFixed(1)}%;background:${COLORS[i % COLORS.length]};animation-delay:${rnd(0.15, 1.2).toFixed(2)}s;animation-duration:${rnd(2, 3.4).toFixed(2)}s;--r:${Math.round(rnd(-900, 900))}deg;${i % 3 ? '' : 'border-radius:50%;width:3vw;height:3vw;'}"></i>`);
/** 가운데서 사방으로 펑 (지폐 · 반짝이) */
const burst = (n, s, cls, { dist = 60, delay = 0.6, size = 22 } = {}) => many(n, i => {
  const a = (i / n) * Math.PI * 2 + rnd(-0.3, 0.3);
  return img(s, cls, `width:${size}vw;--dx:${Math.round(Math.cos(a) * dist)}vw;--dy:${Math.round(Math.sin(a) * dist * 1.25)}vw;--r:${Math.round(rnd(-540, 540))}deg;animation-delay:${(delay + rnd(0, 0.25)).toFixed(2)}s`);
});
const twinkle = (n, s) => many(n, () => img(s, 'c-twinkle', `left:${rnd(2, 86).toFixed(0)}%;top:${rnd(6, 66).toFixed(0)}%;width:${rnd(9, 16).toFixed(0)}vw;animation-delay:${rnd(0.3, 2).toFixed(2)}s`));
const rain = (n, s) => many(n, i => img(s, 'c-rain', `left:${rnd(-6, 88).toFixed(0)}%;width:${rnd(16, 24).toFixed(0)}vw;--r:${Math.round(rnd(-720, 720))}deg;animation-delay:${(i * 0.22 + rnd(0, 0.2)).toFixed(2)}s;animation-duration:${rnd(2.2, 3.2).toFixed(2)}s`));
const shades = `<img class="c-shades" src="${SHADES_URL}" style="left:${SHADES_BOX.x * 100}%;top:${SHADES_BOX.y * 100}%;width:${SHADES_BOX.w * 100}%" alt="">`;
/** 캐릭터 한 명: 원화 + 착용 / 실사 + 선글라스 */
const who = (id, expr, { real = false, wear = null, glasses = false, cls = '' } = {}) =>
  `<div class="c-who ${cls}"><img src="${face(id, expr, real)}" alt="">${glasses ? shades : ''}${wear ? `<img class="c-wear" src="${wear}" alt="">` : ''}</div>`;
const coinPill = (n, cls = '') => `<span class="c-coins ${cls}" data-to="${n}">🪙 +<b>0</b></span>`;

/** 4줄 무지개 글씨 (구린 PPT 본문) */
function rainbowLines(text) {
  const per = Math.ceil(text.length / 4);
  return ['#F7A600', '#2E9E2E', '#1E7BD8', '#E0262B'].map((c, i) => `<span style="color:${c}">${esc(text.slice(i * per, (i + 1) * per))}</span>`).join('<br>');
}

function titleStage({ tier, title, char, expr, when, mode, coins, dex, all, unlocked }) {
  const name = esc(title);
  const extra = unlocked.length ? `<span class="c-unlock">${esc(t('cele.unlocked', { list: unlocked.join(', ') }))}</span>` : '';
  if (tier === 'jackpot') return `
    <div class="c-flash"></div>${rain(12, deco('money_bill'))}
    <span class="c-jackpot">JACKPOT</span>
    <span class="c-odds">${esc(t('cele.odds'))}</span>
    ${goofTag('jp')}
    ${who(char, 'thumbs_up', { real: true, glasses: true, cls: 'c-jp-who' })}
    ${img(deco('money_gun'), 'c-gun')}
    ${many(9, i => img(deco('money_bill'), 'c-shot', `--dx:${Math.round(rnd(40, 70))}vw;--dy:${Math.round(rnd(-95, -40))}vw;--r:${Math.round(rnd(180, 600))}deg;animation-delay:${(0.5 + i * 0.13).toFixed(2)}s`))}
    ${twinkle(5, src('fx_sparkle'))}
    <div class="c-info c-jp-info">
      <span class="c-meta">${esc(t('cele.jackpotName'))} · ${esc(when)}</span>
      <strong>${name}</strong>
      ${coinPill(coins, 'dark')}${extra}
    </div>`;
  if (tier === 'legend') return `
    ${img(deco('stars'), 'c-star l')}${img(deco('stars'), 'c-star r')}
    ${(w => `<div class="c-wordart" style="--fs:${Math.min(16, 92 / [...w].length).toFixed(1)}vw"><span>${esc(w)}</span><span class="c-mirror" aria-hidden="true">${esc(w)}</span></div>`)(Math.random() < 0.5 ? t('cele.legend') : `${shortGoof()}!!`)}
    <div class="c-marquee"><div>${many(2, () => `<span>${esc(t('cele.marquee', { name: title }))}&nbsp;</span>`)}</div></div>
    <div class="c-ppt-box ${Math.random() < 0.6 ? pick(['f-gungseo', 'f-gungseo', 'f-wadang']) : ''}">${rainbowLines(t('cele.pptBody', { mode, name: title }))}</div>
    ${img(src('fx_rainbow'), 'c-ppt-rainbow')}
    ${who(char, 'shameless', { real: true, glasses: true, cls: 'c-ppt-who' })}
    ${img(src('prop_trophy'), 'c-ppt-trophy')}
    <span class="c-new">NEW!!</span>
    ${goofTag('ppt')}
    ${twinkle(6, src('fx_sparkle'))}
    <div class="c-ppt-coins">${coinPill(coins)}</div>
    <span class="c-beg">${esc(t('cele.beg'))}</span>
    ${extra ? `<div class="c-ppt-unlock">${extra}</div>` : ''}`;
  // 노멀 · 레어: 빵빠레 + 지폐 펑. 레어는 왕관 · 트로피 · 선글라스까지
  const rare = tier === 'rare';
  return `
    <div class="c-rays"></div>${confetti(36)}
    <div class="c-chip-wrap"><span class="c-chip">${esc(t(rare ? 'cele.rare' : 'cele.normal'))}</span></div>
    ${img(src('prop_megaphone'), 'c-mega')}
    <span class="c-bam ${decor(0.3)}">${esc(Math.random() < 0.4 ? t('cele.bam') : shortGoof())}</span>
    <span class="c-toot ${decor(0.3)}">${esc(Math.random() < 0.4 ? t('cele.toot') : shortGoof())}</span>
    ${who(char, expr, { wear: src(rare ? 'wear_crown' : 'wear_party'), glasses: rare, cls: 'c-a-who' })}
    ${img(src(rare ? 'prop_trophy' : 'prop_medal'), 'c-award')}
    ${burst(10, deco('money_bill'), 'c-bill', { delay: 0.75 })}
    ${burst(8, src('fx_sparkle'), 'c-bill', { delay: 0.9, size: 10, dist: 45 })}
    <div class="c-info">
      <span class="c-meta">${esc(t('burst.new'))} · ${esc(when)} · ${esc(mode)}</span>
      <strong>${name}</strong>
      <div class="c-bar"><i style="--to:${((dex / all) * 100).toFixed(1)}%"></i></div>
      <span class="c-meta">${esc(t('home.dexCount', { n: dex, all }))}</span>
      ${coinPill(coins)}${extra}
    </div>`;
}

function itemStage({ name, slot, preview, from }) {
  return `
    <span class="c-ask">${esc(t('cele.box'))}</span>
    <div class="c-rays gold late"></div>
    <img class="c-box" src="${deco('box')}" alt="">
    <div class="c-item"><div class="c-card">${preview}</div><span class="c-stamp">NEW!</span></div>
    ${goofTag('onbox')}
    ${burst(12, src('fx_sparkle'), 'c-spark', { delay: 1.5, size: 9, dist: 42 })}
    ${twinkle(4, src('fx_sparkle'))}
    <div class="c-info c-item-info">
      <span class="c-meta">${esc(slot)}</span>
      <strong>${esc(name)}</strong>
      <span class="c-meta">${esc(from)}</span>
    </div>`;
}

let timers = [];
function countCoins(root) {
  for (const el of root.querySelectorAll('.c-coins')) {
    const to = +el.dataset.to, b = el.querySelector('b');
    const start = performance.now() + 1300, dur = 700;
    const step = now => {
      const k = Math.min(1, Math.max(0, (now - start) / dur));
      b.textContent = Math.round(to * k);
      if (k < 1 && root.isConnected) timers.push(requestAnimationFrame(step));
    };
    timers.push(requestAnimationFrame(step));
  }
}

/**
 * 띄운다. primary = 첫 버튼 (짤 보기 / 바로 장착), secondary = 다시 보기 또는 닫기.
 * 닫히면 (버튼 · 뒤로가기) onClose(primary 눌렀는지)
 */
function open(cls, html, { primary, secondary = t('cele.replay'), replay = true, onClose }) {
  const dlg = document.getElementById('cele');
  const stage = dlg.querySelector('.cele-stage');
  dlg.className = `cele ${cls}`;
  const draw = () => {
    timers.forEach(cancelAnimationFrame);
    timers = [];
    stage.innerHTML = typeof html === 'function' ? html() : html;
    countCoins(stage);
  };
  draw();
  const [a, b] = dlg.querySelectorAll('.cele-actions button');
  a.textContent = primary;
  b.textContent = secondary;
  let chose = false;
  a.onclick = () => { chose = true; dlg.close(); };
  b.onclick = () => (replay ? draw() : dlg.close());
  // close 이벤트는 늦게 온다: 그 사이 새 팝업이 떴으면 (다시 열려 있으면) 무시
  dlg.onclose = () => { if (dlg.open) return; stage.innerHTML = ''; onClose?.(chose); };
  if (!dlg.open) dlg.showModal();
}

/** tier: normal | rare | legend | jackpot */
export function celebrateTitle(info, onClose) {
  const legend = info.tier === 'legend';
  open(`t-${info.tier}`, () => titleStage(info), {
    primary: t(legend ? 'cele.memePpt' : 'cele.meme'), secondary: t(legend ? 'cele.replayPpt' : 'cele.replay'), onClose
  });
}

/** 아이템 상자깡. equipped = 이미 장착 중이면 버튼 하나 */
export function celebrateItem(info, onClose) {
  open('t-item', () => itemStage(info), {
    primary: t(info.equipped ? 'cele.ok' : 'cele.equip'), secondary: t('cele.later'), replay: false, onClose
  });
}
