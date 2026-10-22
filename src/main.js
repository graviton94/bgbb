// 화면 연결: 상태가 바뀌면 render() 한 번으로 모든 화면을 맞춘다.
import { CHARACTERS, MODES, FREQUENCIES, TIPS, BURST_FACE, charById, face, vibeFor, pickStyle } from './data.js';
import { TITLES, RARITY, titleById } from './titles.js';
import { t, L, LANG, applyI18n } from './i18n.js';
import {
  state, commit, flush, subscribe, resetAll, dayKey, day, recordOperation, streak, totals, ownedCount, getDiy, setDiy
} from './store.js';
import { native, syncSchedule, armWebTimer, remainingToday, isActive, anyFriendOn, windowLabel, inWindow, resting, restLabel } from './schedule.js';
import { play, playFriend, forget } from './audio.js';
import { drawCard } from './card.js';
import { startFx, stopFx } from './fx.js';
import { openCushion } from './cushion.js';
import { composeMeme, newsMeme, titleMeme, renderMeme } from './memes.js';
import { ITEMS, SLOTS, SLOT_NAMES, itemById, isOwned, inSeason, DEFAULT_EQUIP } from './items.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const pick = list => list[Math.floor(Math.random() * list.length)];
const two = n => String(n).padStart(2, '0');
const nl2br = s => esc(s).replace(/\n/g, '<br>');
let screen = 'home';
let dexFilter = 'all';

// 오류는 '의견 · 오류 보내기' 메일에 붙일 수 있게 최근 몇 개만 기억한다 (어디로도 자동 전송하지 않음)
const errors = [];
const keepError = msg => { errors.push(`${new Date().toISOString()} ${msg}`); if (errors.length > 5) errors.shift(); };
addEventListener('error', e => keepError(`${e.message} @${e.filename?.split('/').pop()}:${e.lineno}`));
addEventListener('unhandledrejection', e => keepError(`promise: ${e.reason?.message || e.reason}`));

// 짧은 손맛 진동 (앱에서만; 브라우저 미리보기는 조용히 무시)
const haptic = ms => { if (native) navigator.vibrate?.(ms); };

// ---------------------------------------------------------- 토스트 (최신 3개까지 순서대로)
const toasts = [];
let toastBusy = false;
function toast(text, ms = 2400) {
  toasts.push([text, ms]);
  if (toasts.length > 3) toasts.splice(0, toasts.length - 3);
  if (!toastBusy) nextToast();
}
function nextToast() {
  const el = $('toast');
  const item = toasts.shift();
  if (!item) { toastBusy = false; return; }
  toastBusy = true;
  el.textContent = item[0];
  if (el.showPopover) { try { el.hidePopover(); } catch (e) { /* 이미 닫힘 */ } el.showPopover(); }
  el.classList.add('show');
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(nextToast, 220);
  }, toasts.length ? Math.min(item[1], 1500) : item[1]);
}

// ---------------------------------------------------------- 속보 문구 · 카드
const headlineFor = ev => pick(L(MODES[ev.mode].headlines)).replaceAll('{nick}', L(charById(ev.char).nick));

/** 칭호 짤: 칭호마다 정해진 짤 (처음 받은 순간으로 고정이라 몇 번을 다시 그려도 똑같다) */
function memeForTitle(titleId) {
  const x = titleById(titleId), own = state.titles[titleId];
  const ev = own?.ev || own?.last || { t: own?.first || Date.now(), char: heroId(), mode: 'loud' };
  return titleMeme(titleId, { id: ev.char, mode: ev.mode, t: ev.t, title: L(x.name), rarity: x.rarity, headline: headlineFor(ev) });
}

/** 공유 이미지 정보: 짤 + 아래 띠 (칩 · 이름) */
function shareData(ev, meme, titleId = null, label = '') {
  const x = titleId && titleById(titleId);
  return x ? { ev, meme, chip: L(RARITY[x.rarity].name), chipColor: RARITY[x.rarity].color, name: L(x.name) }
    : { ev, meme, chip: '', chipColor: '#FFFFFF', name: label };
}

async function shareCard(data) {
  const canvas = $('card');
  await drawCard(canvas, { ...data, frame: frameImage() });
  const name = `bgbb_${dayKey(data.ev.t)}_${Date.now() % 100000}.png`;
  if (native) {   // WebView 는 파일 공유를 못 하므로 네이티브가 갤러리 저장 + 공유창
    toast(t(native.saveAndShareImage(canvas.toDataURL('image/png').split(',')[1], name) ? 'card.saved' : 'card.cantSave'));
    return;
  }
  canvas.toBlob(async blob => {
    const file = new File([blob], name, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: t('appName') });
        toast(t('card.shared'));
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(t('card.savedWeb'));
  }, 'image/png');
}

// ---------------------------------------------------------- 터지는 순간
let burstCard = null;

/** 여러 번 쌓였으면 새 칭호 > 높은 등급 > 마지막 순으로 하나를 크게 보여준다 */
function headliner(results) {
  const rank = r => ({ jackpot: 1000, legend: 30, rare: 20, normal: 10 })[titleById(r.title).rarity];
  const score = r => (r.isNew ? 100 : 0) + rank(r) + r.t / 1e13;
  return results.reduce((a, b) => (score(b) > score(a) ? b : a));
}

/**
 * 터지는 화면 · 짤 뽑기 화면 (같은 화면).
 * kind: title = 새 칭호 (칭호 짤) · miss = 꽝 (이미 가진 칭호, 속보 짤) · gacha = 짤 뽑기 (랜덤 짤) · practice = 연습 (속보 짤)
 */
function showBurst(ev, { result = null, more = 0, kind = result ? (result.isNew ? 'title' : 'miss') : 'practice' } = {}) {
  const c = charById(ev.char);
  const dlg = $('burst');
  const headline = headlineFor(ev);
  const caption = pick(L(MODES[ev.mode].captions));
  const title = kind === 'title' ? titleById(result.title) : null;
  const jackpot = title?.rarity === 'jackpot';
  const meme = title ? memeForTitle(result.title)
    : kind === 'gacha' ? composeMeme({ id: c.id, mode: ev.mode, t: ev.t })
      : newsMeme({ id: c.id, mode: ev.mode, t: ev.t, headline: kind === 'practice' ? t('burst.practiceMeta') : headline });
  const box = $('meme');
  box.dataset.meme = meme.name;
  renderMeme(box, meme);
  const d = new Date(ev.t);
  const when = `${two(d.getHours())}:${two(d.getMinutes())}`;
  const info = [when, L(MODES[ev.mode].name), L(c.nick), more ? t('burst.more', { n: more }) : ''].filter(Boolean).join(' · ');
  const box2 = dlg.querySelector('.unlock');
  $('burstBar').parentElement.hidden = !title;
  if (title) {
    const rar = RARITY[title.rarity];
    box2.style.setProperty('--chip', rar.color);
    $('burstChip').hidden = false;
    $('burstChip').textContent = L(rar.name);
    $('burstWhen').textContent = `${t('burst.new')} · ${info}`;
    $('burstTitle').textContent = L(title.name);
    $('burstBar').style.width = '0%';
    requestAnimationFrame(() => { $('burstBar').style.width = `${(ownedCount() / TITLES.length) * 100}%`; });
    $('burstMeta').textContent = `${t('home.dexCount', { n: ownedCount(), all: TITLES.length })} · ${t('burst.coins', { n: result.coins })}`;
    burstCard = shareData(ev, meme, result.title);
  } else if (kind === 'gacha') {
    $('burstChip').hidden = !meme.legend && !meme.real;
    box2.style.setProperty('--chip', meme.legend ? RARITY.legend.color : RARITY.rare.color);
    $('burstChip').textContent = t(meme.legend ? 'gacha.legend' : 'gacha.real');
    $('burstWhen').textContent = t('gacha.left', { n: gachaLeft() });
    $('burstTitle').textContent = t('gacha.title');
    $('burstMeta').textContent = '';
    burstCard = shareData(ev, meme, null, t('gacha.title'));
  } else {
    $('burstChip').hidden = true;
    $('burstWhen').textContent = kind === 'miss' ? info : t('burst.practice');
    $('burstTitle').textContent = kind === 'miss' ? caption : t('burst.practiceTitle');
    $('burstMeta').textContent = kind === 'miss' ? t('burst.coins', { n: result.coins }) : '';
    burstCard = shareData(ev, meme, null, kind === 'miss' ? caption : t('burst.practiceTitle'));
  }
  dlg.classList.remove('play');
  void dlg.offsetWidth;   // 애니메이션 다시 시작
  dlg.classList.add('play');
  if (!dlg.open) dlg.showModal();
  dlg.focus();
  haptic([18, 40, 30]);
  // 효과는 짤 칸 안의 자리에서: 냄 = 뿡 글자, 진동 = 거품, 잭팟 = 머니건에서 지폐
  fxKinds = (jackpot ? ['rain'] : result ? [{ loud: 'puff', soft: 'bubble', hold: null }[ev.mode]] : kind === 'gacha' ? ['puff'] : []).filter(Boolean);
  runFx(meme);
}

let fxKinds = [];
function runFx(meme) {
  requestAnimationFrame(() => {
    const r = $('meme').getBoundingClientRect(), W = innerWidth, H = innerHeight;
    const at = p => ({ x: (r.left + p.x * r.width) / W, y: (r.top + p.y * r.height) / H });
    startFx($('fx'), fxKinds, { from: at(meme.fx), gun: at(meme.fx), img: fxImage() });
  });
}

// ---------------------------------------------------------- 짤 뽑기 (하루 3번): 랜덤 짤. 다 쓰면 '연습 한 방' (속보 짤)
const GACHA = 3;
const gachaLeft = () => (state.gacha.day === dayKey() ? Math.max(0, GACHA - state.gacha.n) : GACHA);
$('burst').addEventListener('close', () => stopFx($('fx')));

$('shareCard').addEventListener('click', () => burstCard && shareCard(burstCard));

function celebrate(events) {
  if (!events.length) return;
  const results = events.map(recordOperation);
  const top = headliner(results);
  state.hero = top.char;
  commit();
  showBurst(top, { result: top, more: results.length - 1 });
  const title = titleById(top.title);
  if (top.isNew) play(title.rarity === 'legend' || title.rarity === 'jackpot' ? 'ui_treasure' : 'ui_levelup', 0.6);
}

/** 브라우저 미리보기용 작전 1회 (앱에서는 네이티브가 진짜 폰 상태로 한다) */
function previewOperation() {
  const on = CHARACTERS.filter(c => state.friends[c.id].on);
  if (!on.length || state.frozen) return;
  const c = pick(on);
  const mode = state.previewMode;
  const style = styleOf(c.id);
  if (mode === 'loud') playFriend(c.id, style, getDiy());
  if (mode === 'soft') navigator.vibrate?.(vibeFor(c.id, style).t);
  celebrate([{ t: Date.now(), char: c.id, mode }]);
}

/** 이번에 낼 소리 종류 (매번 랜덤, 내 목소리 섞은 친구는 가끔 내 목소리) */
const styleOf = id => pickStyle(!!state.friends[id].diy && !!getDiy());

function drainNative() {
  if (!native) return;
  if (native.takeResumed?.() && state.frozen) {   // 알림의 "다시 시작!" 으로 풀림
    state.frozen = false;
    syncSchedule(previewOperation);
  }
  let events = [];
  try { events = JSON.parse(native.drainEvents() || '[]'); } catch (e) { events = []; }
  celebrate(events);
}

// ---------------------------------------------------------- 홈
function heroId() {
  const on = CHARACTERS.filter(c => state.friends[c.id].on);
  return on.some(c => c.id === state.hero) ? state.hero : (on[0] || CHARACTERS[0]).id;
}

// 홈 무대: 앱 열 때마다 캐릭터 자리(왼 · 오른 · 가운데) · 크기 · 기울기, 말풍선 자리, 소품 쪽이 바뀐다
function shuffleStage() {
  const r = (a, b) => a + Math.random() * (b - a);
  const side = pick(['l', 'l', 'r', 'c']), size = r(0.78, 1), hero = $('hero').style;
  hero.maxHeight = `${Math.round(250 * size)}px`;
  hero.maxWidth = `${Math.round(58 * size)}%`;
  hero.setProperty('--rot', `${r(-9, 7).toFixed(1)}deg`);
  hero.left = side === 'l' ? `${r(-4, 6).toFixed(1)}%` : side === 'c' ? '50%' : 'auto';
  hero.right = side === 'r' ? `${r(-4, 6).toFixed(1)}%` : 'auto';
  hero.setProperty('--tx', side === 'c' ? '-50%' : '0px');
  // 말풍선: 캐릭터 머리 옆 (가운데면 머리 위 양쪽으로 갈라짐)
  const head = `min(100%, ${Math.round(250 * size)}px)`, up = r(0.62, 0.85).toFixed(2);
  const spots = side === 'l' ? [{ left: `${r(40, 50)}%` }, { left: `${r(46, 56)}%` }]
    : side === 'r' ? [{ right: `${r(40, 50)}%` }, { right: `${r(46, 56)}%` }]
      : [{ left: `${r(0, 8)}%` }, { right: `${r(0, 8)}%` }];
  ['bubble1', 'bubble2'].forEach((id, i) => {
    const b = $(id).style, s = spots[i];
    b.left = s.left || 'auto';
    b.right = s.right || 'auto';
    b.bottom = side === 'c' ? `calc(${head} * ${(0.86 - i * 0.18).toFixed(2)})` : `calc(${head} * ${up} - ${i * 54}px)`;
    $(id).classList.toggle('flip', side === 'r' || (side === 'c' && i === 0));
  });
  // 소품은 빈 쪽 바닥
  const prop = $('homeProp').style, propLeft = side === 'r' || (side === 'c' && Math.random() < 0.5);
  prop.left = propLeft ? `${r(0, 5)}%` : 'auto';
  prop.right = propLeft ? 'auto' : `${r(0, 5)}%`;
  prop.width = `${Math.round(r(26, 36))}%`;
}

function newBubbles() {
  const lines = [...L(charById(heroId()).bubbles)].sort(() => Math.random() - 0.5);
  $('bubble1').textContent = lines[0];
  $('bubble2').textContent = lines[1];
}

function renderHome() {
  const n = remainingToday();
  let big, line;
  if (state.frozen) { big = t('home.frozenBig'); line = t('home.frozenLine'); }
  else if (!anyFriendOn()) { big = t('home.nobodyBig'); line = t('home.nobodyLine'); }
  // 큰 글자 밑 설명은 없앤다 (장전 시간 · 쫄 시간은 맨 위 줄에 늘 보임)
  else if (state.schedule.rest.on && resting()) { big = t('home.restBig'); line = ''; }
  else if (!n) { big = t('home.done'); line = ''; }
  else if (!inWindow()) { big = t('home.waitBig', { n }); line = ''; }
  else { big = t('home.left', { n }); line = ''; }
  $('bigLabel').textContent = t('home.today');
  $('big').innerHTML = nl2br(big);
  $('homeLine').innerHTML = nl2br(line);
  const td = day();
  $('todayStats').textContent = td.loud + td.soft + td.hold ? t('home.todayStats', td) : '';

  const c = charById(heroId());
  if ($('heroImg').dataset.id !== c.id) {
    $('heroImg').dataset.id = c.id;
    newBubbles();
  }
  // 작전 중엔 웃참, 멈춤이면 모른 척, 그 밖엔 멍
  const mood = state.frozen ? 'whistle' : isActive() && inWindow() ? 'hold' : 'blank';
  if (!heroBusy && $('heroImg').dataset.mood !== `${c.id}:${mood}`) {
    $('heroImg').dataset.mood = `${c.id}:${mood}`;
    $('heroImg').src = face(c.id, mood, realLook());
  }
  $('hero').setAttribute('aria-label', t('home.heroLabel', { name: L(c.name) }));
  const latest = state.recent[0];
  $('latestName').textContent = latest ? L(titleById(latest.title).name) : t('home.noTitle');
  $('dexCount').textContent = t('home.dexCount', { n: ownedCount(), all: TITLES.length });
  $('freeze').textContent = t(state.frozen ? 'home.unfreeze' : 'home.freeze');
  const left = gachaLeft();
  $('practice').textContent = left ? t('home.gacha', { n: left }) : t('home.practice');
  $('freeze').classList.toggle('on', state.frozen);
}

let heroBusy = 0;
$('hero').addEventListener('click', () => {
  const id = heroId();
  playFriend(id, styleOf(id), getDiy(), 0.7);
  // 누르면 잠깐 터지는 얼굴
  clearTimeout(heroBusy);
  $('heroImg').src = face(id, 'burst', realLook());
  heroBusy = setTimeout(() => { heroBusy = 0; $('heroImg').dataset.mood = ''; renderHome(); }, 900);
  $('hero').classList.remove('wiggle');
  void $('hero').offsetWidth;
  $('hero').classList.add('wiggle');
  newBubbles();
  haptic(12);
});

$('practice').addEventListener('click', () => {
  const id = heroId();
  playFriend(id, styleOf(id), getDiy());
  const ev = { t: Date.now(), char: id, mode: 'loud' };
  if (gachaLeft() > 0) {
    state.gacha = { day: dayKey(), n: GACHA - gachaLeft() + 1 };
    commit();
    showBurst(ev, { kind: 'gacha' });
  } else showBurst(ev);
});

$('cushionBtn').addEventListener('click', openCushion);

$('freeze').addEventListener('click', () => {
  state.frozen = !state.frozen;
  // 비상탈출은 회의 중에 누르니까 소리 없이 (짧은 손맛만). 다시 시작은 작게 뿅
  if (state.frozen) haptic(15); else play('ui_pop', 0.3);
  toast(t(state.frozen ? 'op.frozen' : 'op.thawed'));
  syncSchedule(previewOperation);
});

$('latest').addEventListener('click', () => {
  const latest = state.recent[0];
  if (latest) openTitle(latest.title);
  else showScreen('dex');
});

// ---------------------------------------------------------- 칭호 도감
const FILTERS = ['all', 'jackpot', 'legend', 'rare', 'normal', 'locked'];

function renderDex() {
  const s = totals();
  $('dexBig').innerHTML = `${ownedCount()}<span>/${TITLES.length}</span>`;
  $('dexStats').textContent = t('dex.stats', s);
  $('filters').innerHTML = FILTERS.map(f =>
    `<button class="chip ${dexFilter === f ? 'on' : ''}" data-f="${f}" type="button">${f === 'all' ? t('dex.all') : f === 'locked' ? t('dex.locked') : L(RARITY[f].name)}</button>`).join('');
  const order = { jackpot: -1, legend: 0, rare: 1, normal: 2 };
  const list = TITLES.filter(x => dexFilter === 'all' || (dexFilter === 'locked' ? !state.titles[x.id] : x.rarity === dexFilter))
    .sort((a, b) => !!state.titles[b.id] - !!state.titles[a.id] || order[a.rarity] - order[b.rarity]);
  $('dexList').innerHTML = list.map(x => {
    const own = state.titles[x.id];
    return `<li><button class="dex-row ${own ? '' : 'locked'}" data-id="${x.id}" type="button">
      <span class="tag ${x.rarity}">${L(RARITY[x.rarity].name)}</span>
      <span class="dex-text"><b>${own ? esc(L(x.name)) : '???'}</b><small>${own ? esc(L(x.how)) : esc(t('dex.hint', { hint: L(x.hint) }))}</small></span>
      <span class="n">${own ? t('dex.count', { n: own.n }) : ''}</span></button></li>`;
  }).join('');
}

$('filters').addEventListener('click', e => {
  const b = e.target.closest('.chip');
  if (!b) return;
  dexFilter = b.dataset.f;
  play('ui_pop', 0.4);
  renderDex();
});

$('dexList').addEventListener('click', e => {
  const b = e.target.closest('.dex-row');
  if (!b) return;
  const x = titleById(b.dataset.id);
  if (!state.titles[x.id]) { toast(t('dex.lockedToast', { hint: L(x.hint) })); return; }
  openTitle(x.id);
});

let sheetTitle = null;
function openTitle(id) {
  const x = titleById(id);
  const own = state.titles[id];
  sheetTitle = id;
  $('tsRarity').textContent = L(RARITY[x.rarity].name);
  $('tsRarity').className = `rarity tag ${x.rarity}`;
  $('tsName').textContent = L(x.name);
  $('tsHow').textContent = L(x.how);
  const first = new Date(own.first);
  $('tsMeta').textContent = t('dex.meta', { n: own.n, date: `${first.getFullYear()}.${first.getMonth() + 1}.${first.getDate()}` });
  renderMeme($('tsMeme'), memeForTitle(id));
  $('titleSheet').showModal();
}
$('tsShare').addEventListener('click', () => {
  const own = state.titles[sheetTitle];
  if (!own) return;
  shareCard(shareData(own.ev || own.last, memeForTitle(sheetTitle), sheetTitle));   // 칭호 짤은 늘 같은 짤
});

// ---------------------------------------------------------- 홈 상태 줄: 지금 터지면 어떻게 되는지
// 우선순위: 비상탈출 · 쫄 시간 · 자는 시간 (무조건 조용) > 방해금지 (참음) > 미디어 볼륨 > 0 (소리) > 무음 모드 (참음) > 진동
function soundStatus() {
  if (!native?.soundStatus) return { mode: state.previewMode, web: true };
  try { return JSON.parse(native.soundStatus()); } catch (e) { return { mode: 'hold' }; }
}
function renderStatus() {
  const s = soundStatus();
  // 왼쪽: 언제 장전되는지 (쫄 시간 포함). 오른쪽 버튼: 지금 폰 소리 상태 (누르면 음소거 ↔ 아까 크기)
  const rest = state.schedule.rest;
  const quiet = state.frozen || !anyFriendOn() || resting() || !inWindow();
  $('statusDot').className = `dot ${state.frozen ? 'frozen' : quiet ? '' : s.mode === 'loud' ? 'on' : s.mode}`;
  $('statusText').innerHTML = state.frozen ? esc(t('status.frozen'))
    : !anyFriendOn() ? esc(t('status.nobody'))
      : `${esc(t('status.window'))}${rest.on && rest.from !== rest.to ? `<small>${esc(t('status.except', { window: restLabel().replace('~', ' ~ ') }))}</small>` : ''}`;
  $('mute').hidden = false;
  $('mute').classList.toggle('off', !s.web && !s.dnd && !s.vol);
  $('mute').textContent = s.web ? t(`status.web.${s.mode}`) : s.dnd ? t('status.dnd') : s.vol ? t('status.vol', { vol: s.vol, max: s.max }) : t('status.muted');
}
$('mute').addEventListener('click', () => {
  const s = soundStatus();
  if (s.web) { openSettings(); return; }   // 브라우저는 폰 볼륨을 못 바꾼다: 미리보기 상태 고르는 설정으로
  if (s.dnd) { toast(t('status.dndToast')); return; }
  native?.setMediaMuted?.(!!s.vol);
  haptic(12);
  renderStatus();
});
window.bgbbOnSound = () => renderStatus();

// ---------------------------------------------------------- 꾸미기: 홈에 입히기 + 상점
const realLook = () => state.equip.look === 'look_real';
// '오늘의 배경: 랜덤' 이면 앱 열 때마다 가진 배경 중 하나
const ownedOf = slot => ITEMS.filter(x => x.slot === slot && isOwned(x, state.titles, state.bought));
let randomBg = null;
function applySkin() {
  let bg = itemById(state.equip.bg) || itemById(DEFAULT_EQUIP.bg);
  if (bg.random) {
    const pool = ownedOf('bg').filter(x => !x.random);
    if (!randomBg || !pool.includes(randomBg)) randomBg = pool[Math.floor(Math.random() * pool.length)];
    bg = randomBg;
  }
  const app = document.querySelector('.app');
  app.style.background = bg.css;
  app.classList.toggle('dark', !!bg.dark);
  app.classList.toggle('vivid', !!bg.vivid);
  app.classList.toggle('photo', bg.css.includes('url(assets/skin/'));
  app.style.boxShadow = bg.frame ? `inset 0 0 0 6px ${bg.frame}, inset 0 0 0 10px #FFFBEA, inset 0 0 0 12px ${bg.frame}` : '';
  const prop = itemById(state.equip.prop);
  $('homeProp').hidden = !prop?.src;
  if (prop?.src) $('homeProp').src = prop.src;
  const bubble = itemById(state.equip.bubble);
  for (const b of ['bubble1', 'bubble2']) {
    $(b).dataset.skin = state.equip.bubble;
    $(b).classList.toggle('img', !!bubble?.src);
    $(b).style.setProperty('--bubble-img', bubble?.src ? `url(${bubble.src})` : 'none');
  }
  const wear = itemById(state.equip.wear);
  $('heroWear').hidden = !wear?.src;
  if (wear?.src) $('heroWear').src = wear.src;
}
/** 터질 때 날아갈 그림 (없으면 '뿡!' 글자) */
const fxImage = () => itemById(state.equip.fx)?.src || null;
/** 공유 프레임 그림 (없으면 기본 검은 띠) */
const frameImage = () => itemById(state.equip.frame)?.src || null;

let shopSlot = 'bg';
function itemPreview(x) {
  if (x.slot === 'bg') return `<span class="sw" style="background:${x.css}${x.frame ? `;box-shadow:inset 0 0 0 4px ${x.frame}` : ''}"></span>`;
  if (x.slot === 'prop' || x.slot === 'fx' || x.slot === 'frame') return x.src ? `<img src="${x.src}" alt="">` : x.slot === 'fx' ? '<span class="sfx-pv">뿡!</span>' : '<span class="none">—</span>';
  if (x.slot === 'bubble') return `<span class="bubble ${x.src ? 'img' : ''}" data-skin="${x.id}" style="--bubble-img:${x.src ? `url(${x.src})` : 'none'}">${t('shop.sample')}</span>`;
  if (x.slot === 'wear') return `<span class="wear-pv"><img src="${face(heroId(), 'blank', realLook())}" alt="">${x.src ? `<img src="${x.src}" alt="">` : ''}</span>`;
  return `<img src="${face(heroId(), 'blank', x.id === 'look_real')}" alt="">`;
}
function renderShop() {
  $('coins').textContent = t('shop.coins', { n: state.coins });
  $('slots').innerHTML = SLOTS.filter(s => ITEMS.filter(x => x.slot === s).length > 1).map(s => `<button class="chip ${shopSlot === s ? 'on' : ''}" data-s="${s}" type="button">${L(SLOT_NAMES[s])}</button>`).join('');
  $('shopList').innerHTML = ITEMS.filter(x => x.slot === shopSlot).map(x => {
    const owned = isOwned(x, state.titles, state.bought), on = state.equip[x.slot] === x.id;
    const hint = x.title && (state.titles[x.title] ? L(titleById(x.title).name) : L(titleById(x.title).hint));
    const season = x.season ? t('shop.season', { m: x.season.join('·') }) : '';
    const how = on ? t('shop.equipped') : owned ? t('shop.equip')
      : x.title && x.price ? t('shop.title_or', { hint, n: x.price }) : x.title ? t('shop.title_only', { hint }) : `${season ? `${season} · ` : ''}${t('shop.buy', { n: x.price })}`;
    return `<li><button class="item ${owned ? '' : 'locked'} ${on ? 'on' : ''}" data-id="${x.id}" type="button">
      <span class="pv">${itemPreview(x)}</span><b>${esc(L(x.name))}</b><small>${esc(how)}</small></button></li>`;
  }).join('');
}
$('slots').addEventListener('click', e => {
  const b = e.target.closest('.chip');
  if (!b) return;
  shopSlot = b.dataset.s;
  play('ui_pop', 0.4);
  renderShop();
});
$('shopList').addEventListener('click', e => {
  const b = e.target.closest('.item');
  if (!b) return;
  const x = itemById(b.dataset.id);
  if (!isOwned(x, state.titles, state.bought)) {
    if (!x.price) { toast(t('shop.title_only', { hint: L(titleById(x.title).hint) })); return; }
    if (!inSeason(x)) { toast(t('shop.offSeason', { m: x.season.join('·') })); return; }
    if (state.coins < x.price) { toast(t('shop.poor')); return; }
    if (!confirm(t('shop.confirm', { name: L(x.name), n: x.price }))) return;
    state.coins -= x.price;
    state.bought[x.id] = true;
    play('ui_levelup', 0.5);
    toast(t('shop.bought', { name: L(x.name) }));
  } else play('ui_pop', 0.4);
  state.equip[x.slot] = x.id;
  if (x.random) randomBg = null;
  $('heroImg').dataset.mood = '';   // 모습이 바뀌었으면 홈 캐릭터 다시
  commit();
});

// ---------------------------------------------------------- 렌더
function render() {
  const n = streak();
  $('streak').textContent = n ? t('top.streak', { n }) : '';
  renderStatus();
  renderHome();
  applySkin();
  if (screen === 'dex') renderDex();
  if (screen === 'shop') renderShop();
  if ($('settingsSheet').open) renderSettings();
  if ($('supportSheet').open) renderTips();
}

// ---------------------------------------------------------- 설정
function renderSettings() {
  $('freqs').innerHTML = Object.entries(FREQUENCIES).map(([k, f]) =>
    `<button class="chip ${state.schedule.freq === k ? 'on' : ''}" data-f="${k}" type="button">${t('settings.freqChip', { name: L(f.name), lo: f.range[0], hi: f.range[1] })}</button>`).join('');
  $('notifyRow').hidden = !native;
  $('notifyOn').checked = state.notify;
  $('previewBox').hidden = !!native;
  $('previewModes').innerHTML = ['loud', 'soft', 'hold'].map(m =>
    `<button class="chip ${state.previewMode === m ? 'on' : ''}" data-m="${m}" type="button">${t(`settings.mode.${m}`)}</button>`).join('');
  $('restOn').checked = state.schedule.rest.on;
  $('restInfo').textContent = state.schedule.rest.on ? t('settings.restOn', { window: restLabel() }) : t('settings.restOff');
  $('scheduleInfo').textContent = isActive() ? t('settings.left', { n: remainingToday() }) : t('settings.paused');
  $('friends').innerHTML = CHARACTERS.map(c => {
    const f = state.friends[c.id];
    return `<div class="friend ${f.on ? '' : 'off'}">
      <label class="row"><span class="friend-name"><img src="${face(c.id)}" alt="">${esc(L(c.name))}</span>
        <input type="checkbox" class="switch" data-on="${c.id}" ${f.on ? 'checked' : ''}></label>
      ${getDiy() ? `<div class="chips"><button class="chip ${f.diy ? 'on' : ''}" data-c="${c.id}" type="button">${t('friend.mixDiy')}</button></div>` : ''}
    </div>`;
  }).join('');
  $('recordState').textContent = getDiy() ? t('friend.hasRecording') : '';
  $('version').textContent = t('settings.version', { v: native?.appVersion?.() || 'web' });
}

// ---------------------------------------------------------- 쫄? (매일 쉬는 시간) — 위아래로 굴리는 시 · 분
const STEP = 5;   // 분 단위
function fillWheel(el, values) {
  el.innerHTML = values.map(v => `<div>${two(v)}</div>`).join('');
  el.dataset.values = values.join(',');
}
const wheelGet = el => {
  const values = el.dataset.values.split(',').map(Number);
  return values[Math.max(0, Math.min(values.length - 1, Math.round(el.scrollTop / el.firstElementChild.offsetHeight)))];
};
const wheelSet = (el, v) => {
  const values = el.dataset.values.split(',').map(Number);
  el.scrollTop = Math.max(0, values.indexOf(v)) * el.firstElementChild.offsetHeight;
};
const hours = [...Array(24).keys()], minutes = [...Array(60 / STEP).keys()].map(i => i * STEP);
for (const id of ['rFromH', 'rToH']) fillWheel($(id), hours);
for (const id of ['rFromM', 'rToM']) fillWheel($(id), minutes);
function openRest() {
  const { from, to } = state.schedule.rest;
  $('restSheet').showModal();
  wheelSet($('rFromH'), Math.floor(from / 60)); wheelSet($('rFromM'), from % 60 - (from % STEP));
  wheelSet($('rToH'), Math.floor(to / 60)); wheelSet($('rToM'), to % 60 - (to % STEP));
}
$('restOpen').addEventListener('click', openRest);
$('restOn').addEventListener('change', e => {
  if (e.target.checked) { e.target.checked = state.schedule.rest.on; openRest(); return; }
  state.schedule.rest.on = false;
  syncSchedule(previewOperation);
});
$('restSave').addEventListener('click', () => {
  const from = wheelGet($('rFromH')) * 60 + wheelGet($('rFromM'));
  const to = wheelGet($('rToH')) * 60 + wheelGet($('rToM'));
  state.schedule.rest = { on: from !== to, from, to };
  $('restSheet').close();
  play('ui_pop', 0.5);
  if (state.schedule.rest.on) toast(t('rest.saved', { window: restLabel() }));
  syncSchedule(previewOperation);
});

$('freqs').addEventListener('click', e => {
  const b = e.target.closest('.chip');
  if (!b) return;
  state.schedule.freq = b.dataset.f;
  play('ui_pop', 0.5);
  syncSchedule(previewOperation);
});
$('previewModes').addEventListener('click', e => {
  const b = e.target.closest('.chip');
  if (!b) return;
  state.previewMode = b.dataset.m;
  commit();
});
$('notifyOn').addEventListener('change', e => {
  state.notify = e.target.checked;
  native?.setNotify(state.notify);
  if (state.notify && native && !native.notificationsAllowed()) {
    if (!native.requestNotifications()) toast(t('settings.notifyDenied'), 3500);
  }
  commit();
});
$('friends').addEventListener('change', e => {
  const id = e.target.dataset.on;
  if (!id) return;
  state.friends[id].on = e.target.checked;
  syncSchedule(previewOperation);
});
$('friends').addEventListener('click', e => {
  const b = e.target.closest('.chip');
  if (!b) return;
  const f = state.friends[b.dataset.c];
  f.diy = !f.diy;
  if (f.diy) playFriend(b.dataset.c, 'diy', getDiy());
  syncSchedule(previewOperation);
});

$('record').addEventListener('click', async () => {
  const btn = $('record');
  if (btn.classList.contains('recording')) return;
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { toast(t('friend.noMic')); return; }
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    toast(t('friend.needMic'));
    return;
  }
  const rec = new MediaRecorder(stream);
  const chunks = [];
  rec.ondataavailable = ev => ev.data.size && chunks.push(ev.data);
  rec.onstop = () => {
    stream.getTracks().forEach(tr => tr.stop());
    btn.classList.remove('recording');
    btn.textContent = t('friend.record');
    const reader = new FileReader();
    reader.onloadend = () => {
      forget(getDiy());
      setDiy(reader.result);
      // 앱에서는 파일로도 저장해 앱이 꺼져 있어도 알람이 이 소리를 낸다
      native?.saveCustomSound(reader.result.split(',')[1]);
      const id = heroId();
      state.friends[id].diy = true;
      playFriend(id, 'diy', getDiy());
      toast(t('friend.equipped', { name: L(charById(id).name) }));
      syncSchedule(previewOperation);
    };
    reader.readAsDataURL(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
  };
  rec.start();
  btn.classList.add('recording');
  btn.textContent = t('friend.recording');
  setTimeout(() => rec.state === 'recording' && rec.stop(), 3000);
});

$('reset').addEventListener('click', () => {
  if (!confirm(t('settings.resetConfirm'))) return;
  resetAll();
  native?.resetAll();
  location.reload();
});

// 의견 · 오류 보내기: 내 메일 앱을 연다. 기기 정보는 네이티브가 채운다.
$('feedback').addEventListener('click', () => {
  const log = errors.length ? `\n\n---\n${errors.join('\n')}` : '';
  if (native) { native.sendFeedback(log); return; }
  location.href = `mailto:ruahn49@gmail.com?subject=${encodeURIComponent(`[${t('appName')}] feedback`)}&body=${encodeURIComponent(`\n\n---\n${navigator.userAgent}${log}`)}`;
});

// 바깥 링크는 앱 안에서 열지 않고 브라우저로
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="http"]');
  if (!a || !native) return;
  e.preventDefault();
  native.openUrl(a.href);
});

// ---------------------------------------------------------- 응원하기 (Google Play 일회성 결제)
let tipPrices = null;   // { productId: '₩1,500' } — Play 가 알려준 가격

function renderTips() {
  const box = $('tips');
  if (!native) { box.innerHTML = `<p class="muted">${t('support.unavailable')}</p>`; return; }
  if (!tipPrices) { box.innerHTML = `<p class="muted">${t('support.loading')}</p>`; return; }
  const available = TIPS.filter(tip => tipPrices[tip.id]);
  if (!available.length) { box.innerHTML = `<p class="muted">${t('support.unavailable')}</p>`; return; }
  box.innerHTML = available.map(tip => {
    const done = state.tips.includes(tip.id);
    return `<button class="tip" data-id="${tip.id}" type="button" ${done ? 'disabled' : ''}>
      <span>${L(tip.name)}</span><span class="price">${done ? t('support.done') : esc(tipPrices[tip.id])}</span></button>`;
  }).join('');
}

$('openSupport').addEventListener('click', () => {
  $('supportSheet').showModal();
  renderTips();
  native?.loadTips(JSON.stringify(TIPS.map(tip => tip.id)));
});
$('tips').addEventListener('click', e => {
  const b = e.target.closest('.tip');
  if (b && !b.disabled) native?.buyTip(b.dataset.id);
});

// 네이티브(BillingClient)가 부르는 함수들
window.bgbbOnTipPrices = json => {
  try { tipPrices = JSON.parse(json); } catch (e) { tipPrices = {}; }
  renderTips();
};
window.bgbbOnTipsOwned = json => {
  let owned = [];
  try { owned = JSON.parse(json); } catch (e) { return; }
  const fresh = owned.filter(id => !state.tips.includes(id));
  state.tips = owned;
  if (fresh.length) {
    toast(t('support.thanks'), 3500);
    play('ui_treasure', 0.7);
  }
  commit();
};

// ---------------------------------------------------------- 공통
const openSettings = () => { renderSettings(); $('settingsSheet').showModal(); };
$('openSettings').addEventListener('click', openSettings);
$('status').addEventListener('click', openSettings);
$('tabSettings').addEventListener('click', openSettings);

// 시트: 바깥(배경) 누르거나 [data-close] 누르면 닫기
document.querySelectorAll('dialog').forEach(d => {
  d.addEventListener('click', e => {
    if (e.target === d || e.target.closest('[data-close]')) d.close();
  });
});
$('welcome').addEventListener('close', () => {
  state.onboarded = true;
  if (native && state.notify && !native.notificationsAllowed()) native.requestNotifications();
  commit();
});

function showScreen(name) {
  screen = name;
  document.querySelectorAll('.tab[data-screen]').forEach(tab => tab.classList.toggle('active', tab.dataset.screen === name));
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === `screen-${name}`));
  render();
}
document.querySelectorAll('.tab[data-screen]').forEach(tab => tab.addEventListener('click', () => {
  play('ui_pop', 0.4);
  showScreen(tab.dataset.screen);
}));

/** 안드로이드 뒤로 가기: 열린 시트 → 홈 탭 → (false 면 앱이 닫힌다) */
window.bgbbBack = () => {
  const open = [...document.querySelectorAll('dialog[open]')].pop();
  if (open) { open.close(); return true; }
  if (screen !== 'home') { showScreen('home'); return true; }
  return false;
};

window.bgbbOnNativeResume = () => {
  drainNative();
  render();
};

document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  shuffleStage();
  drainNative();
  armWebTimer();
  render();   // 시간이 지나 날짜가 바뀌었을 수 있다
});

// ---------------------------------------------------------- 시작
applyI18n();
shuffleStage();
if (LANG !== 'ko') document.querySelector('meta[name="description"]').content = 'Three friends hide in your pocket. A few times a day, whenever: toot. Every one earns a title.';
subscribe(render);
native?.setNotify?.(state.notify);
syncSchedule(previewOperation);
drainNative();
native?.loadTips?.(JSON.stringify(TIPS.map(tip => tip.id)));   // 다른 기기에서 응원한 기록 복원
render();
if (!state.onboarded) $('welcome').showModal();
addEventListener('pagehide', flush);
