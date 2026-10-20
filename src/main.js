// 화면 연결: 상태가 바뀌면 render() 한 번으로 모든 화면을 맞춘다.
import {
  CHARACTERS, MODES, PROPS, THEMES, TREASURES, FREQUENCIES, WEATHERS, STYLE_NAMES, LEVEL_STEP, TIPS,
  charById, propById, timeTheme
} from './data.js';
import { t, L, LANG, applyI18n } from './i18n.js';
import {
  state, commit, flush, subscribe, resetAll, dayKey, day, recordOperation, grantTapAcorns,
  bond, levelOf, stats, streak, takeNewTreasures, getDiy, setDiy
} from './store.js';
import { native, syncSchedule, armWebTimer, remainingToday, isActive, anyFriendOn, windowLabel, inWindow } from './schedule.js';
import { play, playFriend, forget, setAmbient } from './audio.js';
import { World } from './world.js';
import { drawDiary } from './diary.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const pickLine = c => { const lines = L(c.tapLines); return lines[Math.floor(Math.random() * lines.length)]; };
let screen = 'home';
let friendId = null;

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

// ---------------------------------------------------------- 월드
const world = new World($('world'), {
  onPetTap(id) {
    if (state.frozen) return;
    world.react(id, pickLine(charById(id)));
    world.burst(id, { hamster: 'toot', tit: 'notes', cat: 'hearts' }[id]);
    playFriend(id, state.friends[id].style, getDiy(), 0.7);
    haptic(12);
    openFriend(id);
  },
  onPropTap(id) {
    if (state.frozen) return;
    play('ui_pop', 0.6);
    world.visit(id, true);
  },
  onArrive(charId, propId, rewarded) {
    const line = L(propById(propId).line);
    if (!rewarded) { world.say(charId, line); return; }
    const got = grantTapAcorns(2);
    world.say(charId, line);
    world.burst(charId, 'sparkle');
    if (got) world.burst(charId, 'coin', `+${got}🌰`);
    playFriend(charId, propById(propId).style, null, 0.6);
    if (got) play('ui_coin', 0.5);
    commit();
  }
});

// ---------------------------------------------------------- 작전 결과 반영
function celebrate(events) {
  if (!events.length) return;
  const sum = { loud: 0, soft: 0, hold: 0 };
  events.forEach(e => sum[recordOperation(e)]++);
  const last = events[events.length - 1];
  const mode = MODES[last.mode] ? last.mode : 'hold';
  const who = charById(last.char) ? last.char : 'hamster';
  world.burst(who, { loud: 'bigToot', soft: 'bubbles', hold: 'sweat' }[mode]);
  if (events.length === 1) {
    world.react(who, L(MODES[mode].line));
    world.burst(who, 'coin', `+${MODES[mode].reward}🌰`);
    toast(`${L(charById(who).name)}: ${L(MODES[mode].line)}`);
  } else {
    const gain = Object.keys(sum).reduce((n, m) => n + sum[m] * MODES[m].reward, 0);
    world.react(who, t('op.manyBubble', { n: events.length }));
    toast(t('op.many', { n: events.length, ...sum, gain }), 4000);
  }
  play('ui_coin', 0.5);
  commit();
}

/** 브라우저 미리보기용 작전 1회 (앱에서는 네이티브가 진짜 폰 상태로 한다) */
function previewOperation() {
  const on = CHARACTERS.filter(c => state.friends[c.id].on);
  if (!on.length || state.frozen) return;
  const c = on[Math.floor(Math.random() * on.length)];
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
  commit();
}

// ---------------------------------------------------------- 렌더
const resolvedTheme = () => (state.theme === 'auto' ? timeTheme() : state.theme);
const shown = {};   // 화면에 보이던 오늘 숫자 (바뀌면 톡 튀게)

function render() {
  for (const tr of takeNewTreasures()) {
    toast(t('treasure.found', { name: L(tr.name) }), 3000);
    play('ui_treasure', 0.6);
    CHARACTERS.forEach(c => world.burst(c.id, 'sparkle'));
  }
  const today = day();
  const acorns = $('acorns');
  acorns.textContent = `${state.tips.length ? '💛 ' : ''}🌰 ${state.acorns}`;
  acorns.classList.toggle('supporter', state.tips.length > 0);

  // 상단 상태
  $('statusDot').className = 'dot' + (state.frozen ? ' frozen' : isActive() ? ' on' : '');
  let status;
  if (state.frozen) status = t('status.frozen');
  else if (!state.schedule.on) status = t('status.off');
  else if (!anyFriendOn()) status = t('status.nobody');
  else {
    const n = remainingToday();
    status = inWindow() ? t('status.active', { n }) : t('status.waiting', { window: windowLabel(), n });
  }
  $('statusText').textContent = status;

  // 아지트
  const theme = resolvedTheme();
  world.setScene(theme, state.placed);
  // 배경 소리: 켜 두었고, 아지트가 보이고, 긴급탈출 중이 아닐 때만
  const amb = { meadow: 'amb_day', sunset: 'amb_day', night: 'amb_night', city: 'amb_night', room: 'amb_room' }[theme];
  setAmbient(state.ambient && screen === 'home' && !state.frozen && !document.hidden ? amb : null);
  $('themeChip').textContent = `${state.theme === 'auto' ? '⏰ ' : ''}${THEMES[theme].icon} ${L(THEMES[theme].name)}`;
  $('today').innerHTML = Object.entries(MODES).map(([m, v]) =>
    `<div class="${m}">${v.icon} ${t('home.today', { mode: L(v.name) })}<strong class="${shown[m] !== undefined && shown[m] !== today[m] ? 'bump' : ''}">${today[m]}</strong></div>`).join('');
  Object.assign(shown, { loud: today.loud, soft: today.soft, hold: today.hold });
  const freeze = $('freeze');
  freeze.classList.toggle('on', state.frozen);
  freeze.textContent = t(state.frozen ? 'home.unfreeze' : 'home.freeze');
  $('homeHint').textContent = t(state.frozen ? 'home.hint.frozen' : native ? 'home.hint.app' : 'home.hint.web');

  if (screen === 'records') renderRecords();
  if (screen === 'diary') renderDiary();
  if ($('friendSheet').open) renderFriend();
  if ($('decorSheet').open) renderDecor();
  if ($('settingsSheet').open) renderSettings();
  if ($('supportSheet').open) renderTips();
}

// ---------------------------------------------------------- 기록 화면
function renderRecords() {
  const s = stats();
  const today = day();
  $('summary').innerHTML = `
    <p class="big">${t('records.today')} 💥 <b>${today.loud}</b> · 🫧 <b>${today.soft}</b> · 🤫 <b>${today.hold}</b></p>
    <p>${t('records.totals', { all: s.total.all, hold: s.total.hold, streak: streak() })}</p>`;

  $('legend').innerHTML = Object.values(MODES).map(m => `<span><i style="background:${m.color}"></i>${L(m.name)}</span>`).join('');
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({ label: i === 0 ? t('records.todayShort') : `${d.getMonth() + 1}/${d.getDate()}`, v: day(dayKey(d.getTime())) });
  }
  const max = Math.max(3, ...days.map(x => x.v.loud + x.v.soft + x.v.hold));
  const titleOf = ({ label, v }) => t('records.dayTitle', { label, loud: v.loud, soft: v.soft, hold: v.hold });
  $('week').setAttribute('aria-label', days.map(titleOf).join(', '));
  $('week').innerHTML = days.map(x => {
    const v = x.v;
    const n = v.loud + v.soft + v.hold;
    const segs = ['hold', 'soft', 'loud'].filter(m => v[m])
      .map(m => `<i style="height:${(v[m] / max) * 100}%;background:${MODES[m].color}"></i>`).join('');
    return `<div class="col" title="${titleOf(x)}"><span class="n">${n || ''}</span><div class="stack">${segs}</div><span class="d">${x.label}</span></div>`;
  }).join('');

  const open = TREASURES.filter(tr => tr.test(s));
  $('treasureCount').textContent = `${open.length}/${TREASURES.length}`;
  $('shelf').innerHTML = TREASURES.map(tr => `
    <button class="treasure ${tr.test(s) ? '' : 'locked'}" data-id="${tr.id}" type="button">
      <img src="assets/collectibles/${tr.id}.webp" alt="">${tr.test(s) ? L(tr.name) : '???'}
    </button>`).join('');

  const best = Object.entries(state.days).filter(([, v]) => v.hold > 0)
    .sort((a, b) => b[1].hold - a[1].hold || b[0].localeCompare(a[0])).slice(0, 5);
  $('best').innerHTML = best.length
    ? best.map(([k, v], i) => `<li><span class="rank">${['🥇', '🥈', '🥉'][i] || i + 1}</span>
        <span class="when">${k.replace(/-/g, '.')}${k === dayKey() ? ` (${t('records.todayShort')})` : ''}</span>
        <span class="n">${t('records.held', { n: v.hold })}</span></li>`).join('')
    : `<li class="muted">${t('records.bestEmpty')}</li>`;
}

$('shelf').addEventListener('click', e => {
  const b = e.target.closest('.treasure');
  if (!b) return;
  const tr = TREASURES.find(x => x.id === b.dataset.id);
  const open = tr.test(stats());
  $('treasureImg').src = `assets/collectibles/${tr.id}.webp`;
  $('treasureImg').classList.toggle('locked', !open);
  $('treasureName').textContent = open ? L(tr.name) : t('treasure.locked');
  $('treasureLore').textContent = open ? L(tr.lore) : t('treasure.lockedLore');
  $('treasureCond').textContent = `${open ? '✅' : '🔒'} ${L(tr.cond)}`;
  $('treasureSheet').showModal();
});

// ---------------------------------------------------------- 일기 화면
const diaryData = () => ({
  day: day(), weather: L(WEATHERS[state.diary.weather] || WEATHERS[0]), note: state.diary.note,
  acorns: state.acorns, hero: friendId || 'hamster'
});
let diaryTimer = 0;
function renderDiary() {
  $('weather').innerHTML = WEATHERS.map((w, i) =>
    `<button class="chip ${i === state.diary.weather ? 'on' : ''}" data-w="${i}" type="button">${L(w)}</button>`).join('');
  if (document.activeElement !== $('note')) $('note').value = state.diary.note;
  clearTimeout(diaryTimer);
  diaryTimer = setTimeout(() => drawDiary($('diary'), diaryData()), 150);
}

$('weather').addEventListener('click', e => {
  const b = e.target.closest('.chip');
  if (!b) return;
  state.diary.weather = Number(b.dataset.w);
  play('ui_pop', 0.5);
  commit();
});
$('note').addEventListener('input', e => { state.diary.note = e.target.value; commit(); });

$('shareDiary').addEventListener('click', async () => {
  const canvas = $('diary');
  await drawDiary(canvas, diaryData());
  const name = `bgbb_${dayKey()}.png`;
  const saved = msg => { state.diary.saves++; toast(msg); commit(); };

  if (native) {   // WebView 는 파일 공유를 못 하므로 네이티브가 갤러리 저장 + 공유창
    if (native.saveAndShareImage(canvas.toDataURL('image/png').split(',')[1], name)) saved(t('diary.saved'));
    else toast(t('diary.cantSave'));
    return;
  }
  canvas.toBlob(async blob => {
    const file = new File([blob], name, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: t('appName') });
        saved(t('diary.shared'));
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
    saved(t('diary.savedWeb'));
  }, 'image/png');
});

// ---------------------------------------------------------- 친구 시트
function openFriend(id) {
  friendId = id;
  renderFriend();
  if (!$('friendSheet').open) $('friendSheet').showModal();
}

function renderFriend() {
  const c = charById(friendId);
  const f = state.friends[c.id];
  const lv = levelOf(f.bond);
  $('friendImg').src = c.portrait;
  $('friendName').textContent = L(c.name);
  $('friendIntro').textContent = L(c.intro);
  $('friendLevel').textContent = lv >= 10 ? t('friend.levelMax') : t('friend.level', { n: lv });
  $('friendBar').style.width = `${lv >= 10 ? 100 : (f.bond % LEVEL_STEP) / LEVEL_STEP * 100}%`;
  $('feed').textContent = `${c.food.icon} ${L(c.food.name)}`;
  $('friendOn').checked = f.on;
  const styles = ['main', 'soft', 'loud'].concat(getDiy() ? ['diy'] : []);
  $('styles').innerHTML = styles.map(s =>
    `<button class="chip ${f.style === s ? 'on' : ''}" data-s="${s}" type="button">${L(STYLE_NAMES[s])} · ${s === 'diy' ? '🎙️' : L(c.styles[s])}</button>`).join('');
  $('recordState').textContent = getDiy() ? t('friend.hasRecording') : '';
}

function interact(kind) {
  const c = charById(friendId);
  let got;
  if (kind === 'feed') {
    state.fed = true;
    got = grantTapAcorns(3);
    world.react(c.id, t('friend.yum', { food: c.food.icon }));
    world.burst(c.id, 'crumbs');
  } else {
    got = grantTapAcorns(1);
    world.react(c.id, t('friend.happy'));
    world.burst(c.id, 'hearts');
    if (c.id === 'cat') play('cat_soft', 0.7);
  }
  if (got) world.burst(c.id, 'coin', `+${got}🌰`);
  play(got ? 'ui_coin' : 'ui_pop', 0.5);
  haptic(8);
  const up = bond(c.id);
  if (up) {
    toast(t('friend.levelUp', { name: L(c.name), n: up }));
    play('ui_levelup', 0.7);
    world.burst(c.id, 'sparkle');
  }
  commit();
}

$('feed').addEventListener('click', () => interact('feed'));
$('pat').addEventListener('click', () => interact('pat'));
$('listen').addEventListener('click', () => {
  playFriend(friendId, state.friends[friendId].style, getDiy());
  world.react(friendId);
});
$('friendOn').addEventListener('change', e => {
  state.friends[friendId].on = e.target.checked;
  world.say(friendId, t(e.target.checked ? 'friend.joined' : 'friend.resting'));
  syncSchedule(previewOperation);
});
$('styles').addEventListener('click', e => {
  const b = e.target.closest('.chip');
  if (!b) return;
  state.friends[friendId].style = b.dataset.s;
  playFriend(friendId, b.dataset.s, getDiy());
  world.react(friendId);
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
      state.friends[friendId].style = 'diy';
      playFriend(friendId, 'diy', getDiy());
      toast(t('friend.equipped', { name: L(charById(friendId).name) }));
      syncSchedule(previewOperation);
    };
    reader.readAsDataURL(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
  };
  rec.start();
  btn.classList.add('recording');
  btn.textContent = t('friend.recording');
  setTimeout(() => rec.state === 'recording' && rec.stop(), 3000);
});

// ---------------------------------------------------------- 꾸미기 시트
function renderDecor() {
  const holds = stats().total.hold;
  const options = [['auto', t('theme.auto')]].concat(Object.entries(THEMES).map(([k, th]) => [k, `${th.icon} ${L(th.name)}`]));
  $('themes').innerHTML = options.map(([k, label]) => {
    const locked = THEMES[k]?.unlockHolds && holds < THEMES[k].unlockHolds;
    return `<button class="chip ${state.theme === k ? 'on' : ''} ${locked ? 'locked' : ''}" data-t="${k}" type="button">${label}${locked ? ' 🔒' : ''}</button>`;
  }).join('');
  $('props').innerHTML = PROPS.map(p => {
    const sale = p.price && !state.owned.includes(p.id);
    const on = state.placed.includes(p.id);
    return `<button class="prop ${sale ? 'sale' : on ? 'on' : ''}" data-p="${p.id}" type="button">
      <img src="assets/props/${p.id}.webp" alt="">${sale ? `🌰${p.price}` : esc(L(p.name))}</button>`;
  }).join('');
}

$('themes').addEventListener('click', e => {
  const b = e.target.closest('.chip');
  if (!b) return;
  const need = THEMES[b.dataset.t]?.unlockHolds;
  const now = stats().total.hold;
  if (need && now < need) { toast(t('decor.locked', { need, now })); return; }
  state.theme = b.dataset.t;
  play('ui_pop', 0.5);
  commit();
});

$('props').addEventListener('click', e => {
  const b = e.target.closest('.prop');
  if (!b) return;
  const p = propById(b.dataset.p);
  if (p.price && !state.owned.includes(p.id)) {
    if (state.acorns < p.price) { toast(t('decor.short', { n: p.price - state.acorns })); return; }
    state.acorns -= p.price;
    state.owned.push(p.id);
    state.placed.push(p.id);
    play('ui_buy', 0.7);
    toast(t('decor.bought', { name: L(p.name) }));
  } else {
    state.placed = state.placed.includes(p.id) ? state.placed.filter(x => x !== p.id) : [...state.placed, p.id];
    play('ui_pop', 0.5);
  }
  commit();
});

// ---------------------------------------------------------- 설정 시트
function renderSettings() {
  $('opOn').checked = state.schedule.on;
  $('ambientOn').checked = state.ambient;
  $('winStart').value = state.schedule.start;
  $('winEnd').value = state.schedule.end;
  $('freqs').innerHTML = Object.entries(FREQUENCIES).map(([k, f]) =>
    `<button class="chip ${state.schedule.freq === k ? 'on' : ''}" data-f="${k}" type="button">${t('settings.freqChip', { name: L(f.name), lo: f.range[0], hi: f.range[1] })}</button>`).join('');
  $('previewBox').hidden = !!native;
  $('previewModes').innerHTML = ['loud', 'soft', 'hold'].map(m =>
    `<button class="chip ${state.previewMode === m ? 'on' : ''}" data-m="${m}" type="button">${t(`settings.mode.${m}`)}</button>`).join('');
  $('scheduleInfo').textContent = isActive() ? t('settings.left', { n: remainingToday() }) : t('settings.paused');
  $('version').textContent = t('settings.version', { v: native?.appVersion?.() || 'web' });
}

for (const id of ['winStart', 'winEnd']) {
  for (let h = 0; h < 24; h++) $(id).add(new Option(`${String(h).padStart(2, '0')}:00`, h));
  $(id).addEventListener('change', e => {
    state.schedule[id === 'winStart' ? 'start' : 'end'] = Number(e.target.value);
    syncSchedule(previewOperation);
  });
}
$('ambientOn').addEventListener('change', e => {
  state.ambient = e.target.checked;
  commit();
});
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
$('fireNow').addEventListener('click', () => {
  if (state.frozen) { toast(t('op.frozenNow')); return; }
  if (!anyFriendOn()) { toast(t('op.nobody')); return; }
  $('settingsSheet').close();
  if (native) native.fireNow();       // 진짜 폰 상태로 실행 → bgbbOnNativeResume 으로 결과가 온다
  else previewOperation();
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
      <span>${tip.icon} ${L(tip.name)}</span><span class="price">${done ? t('support.done') : esc(tipPrices[tip.id])}</span></button>`;
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
    CHARACTERS.forEach(c => { world.react(c.id, '💛'); world.burst(c.id, 'hearts'); });
  }
  commit();
};

// ---------------------------------------------------------- 공통
const openSettings = () => { renderSettings(); $('settingsSheet').showModal(); };
$('openSettings').addEventListener('click', openSettings);
$('status').addEventListener('click', openSettings);
const openDecor = () => { renderDecor(); $('decorSheet').showModal(); };
$('openDecor').addEventListener('click', openDecor);
$('themeChip').addEventListener('click', openDecor);

$('freeze').addEventListener('click', () => {
  state.frozen = !state.frozen;
  world.setFrozen(state.frozen);
  play(state.frozen ? 'ui_freeze' : 'ui_pop', 0.7);
  syncSchedule(previewOperation);
});

// 시트: 바깥(배경) 누르거나 [data-close] 누르면 닫기
document.querySelectorAll('dialog').forEach(d => {
  d.addEventListener('click', e => {
    if (e.target === d || e.target.closest('[data-close]')) d.close();
  });
});
$('welcome').addEventListener('close', () => { state.onboarded = true; commit(); });

function showScreen(name) {
  screen = name;
  document.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('active', tab.dataset.screen === name));
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === `screen-${name}`));
  world.setActive(name === 'home');
  render();
}
document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
  play('ui_pop', 0.4);
  showScreen(tab.dataset.screen);
}));

/** 안드로이드 뒤로 가기: 열린 시트 → 아지트 탭 → (false 면 앱이 닫힌다) */
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
  if (document.hidden) { setAmbient(null); return; }
  drainNative();
  armWebTimer();
  render();   // 시간이 지나 '시간 따라' 테마나 날짜가 바뀌었을 수 있다
});

// ---------------------------------------------------------- 시작
applyI18n();
if (LANG !== 'ko') document.querySelector('meta[name="description"]').content = 'Pocket Toot: a hamster, a bird and a cat hiding in your pocket make surprise sounds a few times a day.';
subscribe(render);
world.setFrozen(state.frozen, false);
world.setActive(true);
syncSchedule(previewOperation);
drainNative();
native?.loadTips?.(JSON.stringify(TIPS.map(tip => tip.id)));   // 다른 기기에서 응원한 기록 복원
render();
if (!state.onboarded) $('welcome').showModal();
addEventListener('pagehide', flush);
