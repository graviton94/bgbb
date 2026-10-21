// 화면 연결: 상태가 바뀌면 render() 한 번으로 모든 화면을 맞춘다.
import { CHARACTERS, MODES, FREQUENCIES, STYLE_NAMES, HOME_LINES, TIPS, BURST_FACE, charById, face } from './data.js';
import { TITLES, RARITY, titleById } from './titles.js';
import { t, L, LANG, applyI18n } from './i18n.js';
import {
  state, commit, flush, subscribe, resetAll, dayKey, day, recordOperation, streak, totals, ownedCount, getDiy, setDiy
} from './store.js';
import { native, syncSchedule, armWebTimer, remainingToday, isActive, anyFriendOn, windowLabel, inWindow } from './schedule.js';
import { play, playFriend, forget } from './audio.js';
import { drawCard } from './card.js';
import { startFx, stopFx } from './fx.js';
import { openCushion } from './cushion.js';
import { composeMeme, renderMeme } from './memes.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const pick = list => list[Math.floor(Math.random() * list.length)];
const two = n => String(n).padStart(2, '0');
const nl2br = s => esc(s).replace(/\n/g, '<br>');
let screen = 'home';
let dexFilter = 'all';
let homeLine = pick(L(HOME_LINES));

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

function cardData(ev, titleId, headline = headlineFor(ev), caption = pick(L(MODES[ev.mode].captions))) {
  const title = titleById(titleId);
  const d = day(dayKey(ev.t));
  return {
    ev, headline, caption,
    title: L(title.name), rarity: L(RARITY[title.rarity].name), jackpot: title.rarity === 'jackpot',
    owned: ownedCount(), all: TITLES.length,
    nth: Math.max(1, d.loud + d.soft + d.hold), streak: Math.max(1, streak(ev.t))
  };
}

async function shareCard(data) {
  const canvas = $('card');
  await drawCard(canvas, data);
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
  const rank = r => { const x = titleById(r.title).rarity; return x === 'jackpot' ? 1000 : RARITY[x].weight * 10; };
  const score = r => (r.isNew ? 100 : 0) + rank(r) + r.t / 1e13;
  return results.reduce((a, b) => (score(b) > score(a) ? b : a));
}

function showBurst(ev, { result = null, more = 0 } = {}) {
  const c = charById(ev.char);
  const dlg = $('burst');
  const headline = headlineFor(ev);
  const caption = pick(L(MODES[ev.mode].captions));
  // 짤: 그 상황으로 조립 (잭팟 = 돈 짤, 가끔 유니크 짤). 자랑 카드도 같은 짤을 그린다.
  const title = result && titleById(result.title);
  const jackpot = title?.rarity === 'jackpot';
  const meme = composeMeme({ id: c.id, mode: ev.mode, t: ev.t, title: title && L(title.name), rarity: title?.rarity, practice: !result });
  const box = $('meme');
  box.dataset.meme = meme.name;
  renderMeme(box, meme);
  const d = new Date(ev.t);
  const when = `${two(d.getHours())}:${two(d.getMinutes())}`;
  $('burstWhen').textContent = [when, L(MODES[ev.mode].name), L(c.nick), more ? t('burst.more', { n: more }) : ''].filter(Boolean).join(' · ');
  if (result) {
    const own = state.titles[result.title];
    $('burstTitle').textContent = L(title.name);
    $('burstMeta').textContent = `${result.isNew ? t('burst.new') : t('burst.again', { n: own.n })} · ${t('burst.meta', { n: ownedCount(), all: TITLES.length, rarity: L(RARITY[title.rarity].name) })}`;
    burstCard = { ...cardData(ev, result.title, headline, caption), meme };
  } else {
    $('burstWhen').textContent = t('burst.practice');
    $('burstTitle').textContent = t('burst.practiceTitle');
    $('burstMeta').textContent = t('burst.practiceMeta');
    burstCard = null;
  }
  $('shareCard').hidden = !burstCard;
  dlg.classList.remove('play');
  void dlg.offsetWidth;   // 애니메이션 다시 시작
  dlg.classList.add('play');
  if (!dlg.open) dlg.showModal();
  dlg.focus();
  haptic([18, 40, 30]);
  // 효과는 짤 칸 안의 자리에서: 냄 = 방구 구름, 진동 = 거품, 잭팟 = 머니건에서 지폐
  const kinds = jackpot ? ['rain'] : [];
  if (result && !jackpot) kinds.push({ loud: 'puff', soft: 'bubble', hold: null }[ev.mode]);
  requestAnimationFrame(() => {
    const r = box.getBoundingClientRect(), W = innerWidth, H = innerHeight;
    const at = p => ({ x: (r.left + p.x * r.width) / W, y: (r.top + p.y * r.height) / H });
    startFx($('fx'), kinds.filter(Boolean), { from: at(meme.fx), gun: at(meme.fx) });
  });
}
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
  if (mode === 'loud') playFriend(c.id, state.friends[c.id].style, getDiy());
  if (mode === 'soft') navigator.vibrate?.([90, 50, 140]);
  celebrate([{ t: Date.now(), char: c.id, mode }]);
}

function drainNative() {
  if (!native) return;
  let events = [];
  try { events = JSON.parse(native.drainEvents() || '[]'); } catch (e) { events = []; }
  celebrate(events);
}

// ---------------------------------------------------------- 홈
function heroId() {
  const on = CHARACTERS.filter(c => state.friends[c.id].on);
  return on.some(c => c.id === state.hero) ? state.hero : (on[0] || CHARACTERS[0]).id;
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
  else if (!state.schedule.on) { big = t('home.offBig'); line = t('home.offLine'); }
  else if (!anyFriendOn()) { big = t('home.nobodyBig'); line = t('home.nobodyLine'); }
  else if (!n) { big = t('home.done'); line = t('home.doneLine'); }
  else if (!inWindow()) { big = t('home.waitBig', { n }); line = t('home.waitLine', { window: windowLabel() }); }
  else { big = t('home.left', { n }); line = homeLine; }
  if (!native && isActive()) line += `\n${t('home.web')}`;
  $('bigLabel').textContent = t('home.today');
  $('big').innerHTML = nl2br(big);
  $('homeLine').innerHTML = nl2br(line);

  const c = charById(heroId());
  if ($('heroImg').dataset.id !== c.id) {
    $('heroImg').dataset.id = c.id;
    newBubbles();
  }
  // 작전 중엔 웃참, 멈춤이면 모른 척, 그 밖엔 멍
  const mood = state.frozen ? 'whistle' : isActive() && inWindow() ? 'hold' : 'blank';
  if (!heroBusy && $('heroImg').dataset.mood !== `${c.id}:${mood}`) {
    $('heroImg').dataset.mood = `${c.id}:${mood}`;
    $('heroImg').src = face(c.id, mood);
  }
  $('hero').setAttribute('aria-label', t('home.heroLabel', { name: L(c.name) }));
  const latest = state.recent[0];
  $('latestName').textContent = latest ? L(titleById(latest.title).name) : t('home.noTitle');
  $('dexCount').textContent = t('home.dexCount', { n: ownedCount(), all: TITLES.length });
  $('freeze').textContent = t(state.frozen ? 'home.unfreeze' : 'home.freeze');
  $('freeze').classList.toggle('on', state.frozen);
}

let heroBusy = 0;
$('hero').addEventListener('click', () => {
  const id = heroId();
  playFriend(id, state.friends[id].style, getDiy(), 0.7);
  // 누르면 잠깐 터지는 얼굴
  clearTimeout(heroBusy);
  $('heroImg').src = face(id, 'burst');
  heroBusy = setTimeout(() => { heroBusy = 0; $('heroImg').dataset.mood = ''; renderHome(); }, 900);
  $('hero').classList.remove('wiggle');
  void $('hero').offsetWidth;
  $('hero').classList.add('wiggle');
  newBubbles();
  haptic(12);
});

$('practice').addEventListener('click', () => {
  const id = heroId();
  playFriend(id, state.friends[id].style, getDiy());
  showBurst({ t: Date.now(), char: id, mode: 'loud' });
});

$('cushionBtn').addEventListener('click', openCushion);

$('freeze').addEventListener('click', () => {
  state.frozen = !state.frozen;
  play(state.frozen ? 'ui_freeze' : 'ui_pop', 0.7);
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
  $('titleSheet').showModal();
}
$('tsShare').addEventListener('click', () => {
  const own = state.titles[sheetTitle];
  if (!own?.last) return;
  const x = titleById(sheetTitle);
  shareCard({ ...cardData(own.last, sheetTitle), meme: composeMeme({ id: own.last.char, mode: own.last.mode, t: own.last.t, title: L(x.name), rarity: x.rarity }) });
});

// ---------------------------------------------------------- 렌더
function render() {
  const n = streak();
  $('streak').textContent = n ? t('top.streak', { n }) : '';
  $('statusDot').className = 'dot' + (state.frozen ? ' frozen' : isActive() ? ' on' : '');
  $('statusText').textContent = state.frozen ? t('status.frozen')
    : !state.schedule.on ? t('status.off')
      : !anyFriendOn() ? t('status.nobody')
        : t(inWindow() ? 'status.active' : 'status.waiting', { window: windowLabel() });
  renderHome();
  if (screen === 'dex') renderDex();
  if ($('settingsSheet').open) renderSettings();
  if ($('supportSheet').open) renderTips();
}

// ---------------------------------------------------------- 설정
function renderSettings() {
  $('opOn').checked = state.schedule.on;
  $('winStart').value = state.schedule.start;
  $('winEnd').value = state.schedule.end;
  $('freqs').innerHTML = Object.entries(FREQUENCIES).map(([k, f]) =>
    `<button class="chip ${state.schedule.freq === k ? 'on' : ''}" data-f="${k}" type="button">${t('settings.freqChip', { name: L(f.name), lo: f.range[0], hi: f.range[1] })}</button>`).join('');
  $('notifyRow').hidden = !native;
  $('notifyOn').checked = state.notify;
  $('previewBox').hidden = !!native;
  $('previewModes').innerHTML = ['loud', 'soft', 'hold'].map(m =>
    `<button class="chip ${state.previewMode === m ? 'on' : ''}" data-m="${m}" type="button">${t(`settings.mode.${m}`)}</button>`).join('');
  $('scheduleInfo').textContent = isActive() ? t('settings.left', { n: remainingToday() }) : t('settings.paused');
  const styles = ['main', 'soft', 'loud'].concat(getDiy() ? ['diy'] : []);
  $('friends').innerHTML = CHARACTERS.map(c => {
    const f = state.friends[c.id];
    return `<div class="friend ${f.on ? '' : 'off'}">
      <label class="row"><span class="friend-name"><img src="${face(c.id)}" alt="">${esc(L(c.name))}</span>
        <input type="checkbox" class="switch" data-on="${c.id}" ${f.on ? 'checked' : ''}></label>
      <div class="chips">${styles.map(s => `<button class="chip ${f.style === s ? 'on' : ''}" data-c="${c.id}" data-s="${s}" type="button">${L(STYLE_NAMES[s])}${s === 'diy' ? '' : ` · ${esc(L(c.styles[s]))}`}</button>`).join('')}</div>
    </div>`;
  }).join('');
  $('recordState').textContent = getDiy() ? t('friend.hasRecording') : '';
  $('version').textContent = t('settings.version', { v: native?.appVersion?.() || 'web' });
}

for (const id of ['winStart', 'winEnd']) {
  for (let h = 0; h < 24; h++) $(id).add(new Option(`${two(h)}:00`, h));
  $(id).addEventListener('change', e => {
    state.schedule[id === 'winStart' ? 'start' : 'end'] = Number(e.target.value);
    syncSchedule(previewOperation);
  });
}
$('opOn').addEventListener('change', e => {
  state.schedule.on = e.target.checked;
  toast(t(e.target.checked ? 'op.started' : 'op.paused'));
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
  state.friends[b.dataset.c].style = b.dataset.s;
  playFriend(b.dataset.c, b.dataset.s, getDiy());
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
      state.friends[id].style = 'diy';
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
  homeLine = pick(L(HOME_LINES));
  drainNative();
  armWebTimer();
  render();   // 시간이 지나 날짜가 바뀌었을 수 있다
});

// ---------------------------------------------------------- 시작
applyI18n();
if (LANG !== 'ko') document.querySelector('meta[name="description"]').content = 'Three friends hide in your pocket. A few times a day, whenever: toot. Every one earns a title.';
subscribe(render);
native?.setNotify?.(state.notify);
syncSchedule(previewOperation);
drainNative();
native?.loadTips?.(JSON.stringify(TIPS.map(tip => tip.id)));   // 다른 기기에서 응원한 기록 복원
render();
if (!state.onboarded) $('welcome').showModal();
addEventListener('pagehide', flush);
