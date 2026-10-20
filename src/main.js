// 화면 연결: 상태가 바뀌면 render() 한 번으로 모든 화면을 맞춘다.
import {
  CHARACTERS, MODES, PROPS, THEMES, TREASURES, FREQUENCIES, WEATHERS, STYLE_NAMES, LEVEL_STEP,
  charById, propById, timeTheme
} from './data.js';
import {
  state, commit, flush, subscribe, resetAll, dayKey, day, recordOperation, grantTapAcorns,
  bond, levelOf, stats, streak, takeNewTreasures, getDiy, setDiy
} from './store.js';
import { native, syncSchedule, armWebTimer, remainingToday, isActive, anyFriendOn, windowLabel, inWindow } from './schedule.js';
import { play, playFriend, forget } from './audio.js';
import { World } from './world.js';
import { drawDiary } from './diary.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
let screen = 'home';
let friendId = null;

// ---------------------------------------------------------- 토스트 (순서대로 하나씩)
const toasts = [];
let toastBusy = false;
function toast(text, ms = 2400) {
  toasts.push([text, ms]);
  if (toasts.length > 3) toasts.splice(0, toasts.length - 3);   // 밀리면 최신 3개만
  if (!toastBusy) nextToast();
}
function nextToast() {
  const t = $('toast');
  const item = toasts.shift();
  if (!item) { toastBusy = false; return; }
  toastBusy = true;
  t.textContent = item[0];
  if (t.showPopover) { try { t.hidePopover(); } catch (e) { /* 이미 닫힘 */ } t.showPopover(); }
  t.classList.add('show');
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(nextToast, 220);
  }, toasts.length ? Math.min(item[1], 1500) : item[1]);
}

// ---------------------------------------------------------- 월드
const world = new World($('world'), {
  onPetTap(id) {
    if (state.frozen) return;
    const c = charById(id);
    world.react(id, c.tapLines[Math.floor(Math.random() * c.tapLines.length)]);
    playFriend(id, state.friends[id].style, getDiy(), 0.7);
    openFriend(id);
  },
  onPropTap(id) {
    if (state.frozen) return;
    play('ui_pop', 0.6);
    world.visit(id, true);
  },
  onArrive(charId, propId, rewarded) {
    const prop = propById(propId);
    if (!rewarded) { world.say(charId, prop.line); return; }
    const got = grantTapAcorns(2);
    world.say(charId, got ? `${prop.line} +${got}🌰` : prop.line);
    playFriend(charId, prop.style, null, 0.6);
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
  if (events.length === 1) {
    world.react(last.char, `${MODES[mode].line} +${MODES[mode].reward}🌰`);
    toast(`${charById(last.char)?.name || '친구'}: ${MODES[mode].line}`);
  } else {
    const gained = Object.keys(sum).reduce((n, m) => n + sum[m] * MODES[m].reward, 0);
    world.react(last.char, `주머니 속에서 ${events.length}번! 🕵️`);
    toast(`자리 비운 동안 작전 ${events.length}회! 💥${sum.loud} 🫧${sum.soft} 🤫${sum.hold} (+${gained}🌰)`, 4000);
  }
  play('ui_coin', 0.5);
  commit();
}

/** 브라우저 미리보기용 작전 1회 (앱에서는 네이티브가 진짜로 한다) */
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
window.bgbbOnNativeResume = drainNative;

// ---------------------------------------------------------- 렌더
function resolvedTheme() {
  return state.theme === 'auto' ? timeTheme() : state.theme;
}

function render() {
  for (const t of takeNewTreasures()) {
    toast(`🎁 비밀 보물 [${t.name}] 획득!`, 3000);
    play('ui_coin', 0.6);
  }
  const today = day();
  $('acorns').textContent = `🌰 ${state.acorns}`;

  // 상단 상태
  const dot = $('statusDot');
  dot.className = 'dot' + (state.frozen ? ' frozen' : isActive() ? ' on' : '');
  let status;
  if (state.frozen) status = '🥶 긴급탈출 중 · 모든 작전 정지';
  else if (!state.schedule.on) status = '⏸️ 불시 작전 꺼짐';
  else if (!anyFriendOn()) status = '🤫 작전에 나갈 친구가 없어요';
  else {
    const left = remainingToday();
    status = inWindow()
      ? `🕵️ 작전 중 · 오늘 ${left}번 더 남았어요`
      : `💤 ${windowLabel()} 작전 대기 · 오늘 ${left}번`;
  }
  $('statusText').textContent = status;

  // 아지트
  const theme = resolvedTheme();
  world.setScene(theme, state.placed);
  $('themeChip').textContent = state.theme === 'auto'
    ? `⏰ ${THEMES[theme].icon} ${THEMES[theme].name}`
    : `${THEMES[theme].icon} ${THEMES[theme].name}`;
  $('today').innerHTML = Object.entries(MODES).map(([m, v]) =>
    `<div class="${m}">${v.icon} 오늘 ${v.name}<strong>${today[m]}</strong></div>`).join('');
  const freeze = $('freeze');
  freeze.classList.toggle('on', state.frozen);
  freeze.textContent = state.frozen ? '🧊 긴급탈출 해제' : '🚨 긴급탈출';
  $('homeHint').textContent = state.frozen
    ? '다시 누를 때까지 소리·진동 모두 꽁꽁 얼어 있어요'
    : native ? '친구나 소품을 눌러보세요 · 앱을 닫아도 작전은 계속돼요'
      : '친구나 소품을 눌러보세요 · 브라우저는 이 탭이 열려 있을 때만 작전해요';

  if (screen === 'records') renderRecords();
  if (screen === 'diary') renderDiary();
  if ($('friendSheet').open) renderFriend();
  if ($('decorSheet').open) renderDecor();
  if ($('settingsSheet').open) renderSettings();
}

// ---------------------------------------------------------- 기록 화면
function renderRecords() {
  const s = stats();
  const today = day();
  $('summary').innerHTML = `
    <p class="big">오늘 💥 <b>${today.loud}</b> · 🫧 <b>${today.soft}</b> · 🤫 <b>${today.hold}</b></p>
    <p>누적 작전 ${s.total.all}회 · 누적 꾹참 ${s.total.hold}회 · 🔥 ${streak()}일 연속</p>`;

  $('legend').innerHTML = Object.values(MODES).map(m => `<span><i style="background:${m.color}"></i>${m.name}</span>`).join('');
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({ label: i === 0 ? '오늘' : `${d.getMonth() + 1}/${d.getDate()}`, v: day(dayKey(d.getTime())) });
  }
  const max = Math.max(3, ...days.map(x => x.v.loud + x.v.soft + x.v.hold));
  $('week').setAttribute('aria-label', days.map(x => `${x.label} 대담${x.v.loud} 소심${x.v.soft} 꾹참${x.v.hold}`).join(', '));
  $('week').innerHTML = days.map(({ label, v }) => {
    const n = v.loud + v.soft + v.hold;
    const segs = ['hold', 'soft', 'loud'].filter(m => v[m])
      .map(m => `<i style="height:${(v[m] / max) * 100}%;background:${MODES[m].color}"></i>`).join('');
    return `<div class="col" title="${label}: 대담 ${v.loud} · 소심 ${v.soft} · 꾹참 ${v.hold}">
      <span class="n">${n || ''}</span><div class="stack">${segs}</div><span class="d">${label}</span></div>`;
  }).join('');

  const open = TREASURES.filter(t => t.test(s));
  $('treasureCount').textContent = `${open.length}/${TREASURES.length}`;
  $('shelf').innerHTML = TREASURES.map(t => `
    <button class="treasure ${t.test(s) ? '' : 'locked'}" data-id="${t.id}" type="button">
      <img src="assets/collectibles/${t.id}.webp" alt="">${t.test(s) ? t.name : '???'}
    </button>`).join('');

  const best = Object.entries(state.days).filter(([, v]) => v.hold > 0)
    .sort((a, b) => b[1].hold - a[1].hold || b[0].localeCompare(a[0])).slice(0, 5);
  $('best').innerHTML = best.length
    ? best.map(([k, v], i) => `<li><span class="rank">${['🥇', '🥈', '🥉'][i] || i + 1}</span>
        <span class="when">${k.replace(/-/g, '.')}${k === dayKey() ? ' (오늘)' : ''}</span>
        <span class="n">꾹참 ${v.hold}</span></li>`).join('')
    : '<li class="muted">아직 꾹 참은 날이 없어요. 무음으로 두고 주머니에 넣어보세요 🤫</li>';
}

$('shelf').addEventListener('click', e => {
  const b = e.target.closest('.treasure');
  if (!b) return;
  const t = TREASURES.find(x => x.id === b.dataset.id);
  const open = t.test(stats());
  $('treasureImg').src = `assets/collectibles/${t.id}.webp`;
  $('treasureImg').classList.toggle('locked', !open);
  $('treasureName').textContent = open ? t.name : '아직 비밀이에요';
  $('treasureLore').textContent = open ? t.lore : '조건을 채우면 정체가 드러나요 🔒';
  $('treasureCond').textContent = `${open ? '✅' : '🔒'} ${t.cond}`;
  $('treasureSheet').showModal();
});

// ---------------------------------------------------------- 일기 화면
let diaryTimer = 0;
function renderDiary() {
  $('weather').innerHTML = WEATHERS.map(w =>
    `<button class="chip ${w === state.diary.weather ? 'on' : ''}" data-w="${w}" type="button">${w}</button>`).join('');
  if (document.activeElement !== $('note')) $('note').value = state.diary.note;
  clearTimeout(diaryTimer);
  diaryTimer = setTimeout(() => drawDiary($('diary'), {
    day: day(), weather: state.diary.weather, note: state.diary.note, acorns: state.acorns, hero: friendId || 'hamster'
  }), 150);
}

$('weather').addEventListener('click', e => {
  const b = e.target.closest('.chip');
  if (!b) return;
  state.diary.weather = b.dataset.w;
  play('ui_pop', 0.5);
  commit();
});
$('note').addEventListener('input', e => { state.diary.note = e.target.value; commit(); });

$('shareDiary').addEventListener('click', async () => {
  const canvas = $('diary');
  await drawDiary(canvas, { day: day(), weather: state.diary.weather, note: state.diary.note, acorns: state.acorns, hero: friendId || 'hamster' });
  const name = `bangguBboong_${dayKey()}.png`;
  const saved = msg => { state.diary.saves++; toast(msg); commit(); };

  if (native) {   // WebView 는 파일 공유를 못 하므로 네이티브가 갤러리 저장 + 공유창
    const ok = native.saveAndShareImage(canvas.toDataURL('image/png').split(',')[1], name);
    if (ok) saved('📸 갤러리(Pictures/방구뿡)에 저장했어요!');
    else toast('😢 이 기기에서는 저장할 수 없어요 (Android 10 이상)');
    return;
  }
  canvas.toBlob(async blob => {
    const file = new File([blob], name, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: '방구뿡 그림일기' });
        saved('📸 공유 완료!');
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
    saved('📸 그림일기를 저장했어요!');
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
  $('friendImg').src = c.sprites.react;
  $('friendName').textContent = c.name;
  $('friendIntro').textContent = c.intro;
  $('friendLevel').textContent = lv >= 10 ? '친밀도 MAX 👑' : `친밀도 Lv.${lv}`;
  $('friendBar').style.width = `${lv >= 10 ? 100 : (f.bond % LEVEL_STEP) / LEVEL_STEP * 100}%`;
  $('feed').textContent = `${c.food.icon} ${c.food.name}`;
  $('friendOn').checked = f.on;
  const styles = ['main', 'soft', 'loud'].concat(getDiy() ? ['diy'] : []);
  $('styles').innerHTML = styles.map(s =>
    `<button class="chip ${f.style === s ? 'on' : ''}" data-s="${s}" type="button">${STYLE_NAMES[s]} · ${s === 'diy' ? '🎙️' : c.styles[s]}</button>`).join('');
  $('recordState').textContent = getDiy() ? '녹음 있음 · 다시 누르면 새로 녹음' : '';
}

function interact(kind) {
  const c = charById(friendId);
  let got;
  if (kind === 'feed') {
    state.fed = true;
    got = grantTapAcorns(3);
    world.react(c.id, `냠냠! ${c.food.icon}${got ? ` +${got}🌰` : ''}`);
  } else {
    got = grantTapAcorns(1);
    world.react(c.id, `행복해 💖${got ? ` +${got}🌰` : ''}`);
    if (c.id === 'cat') play('cat_soft', 0.7);
  }
  play(got ? 'ui_coin' : 'ui_pop', 0.5);
  const up = bond(c.id);
  if (up) toast(`🎉 ${c.name} 친밀도 Lv.${up}! (+10🌰)`);
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
  world.say(friendId, e.target.checked ? '작전 참여! 🔊' : '난 쉴래 🤫');
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
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    toast('이 기기에서는 녹음이 안 돼요 😢');
    return;
  }
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    toast('🎙️ 마이크 권한이 필요해요');
    return;
  }
  const rec = new MediaRecorder(stream);
  const chunks = [];
  rec.ondataavailable = ev => ev.data.size && chunks.push(ev.data);
  rec.onstop = () => {
    stream.getTracks().forEach(t => t.stop());
    btn.classList.remove('recording');
    btn.textContent = '🎙️ 내 목소리 3초 녹음';
    const reader = new FileReader();
    reader.onloadend = () => {
      forget(getDiy());
      setDiy(reader.result);
      // 앱에서는 파일로도 저장해 앱이 꺼져 있어도 알람이 이 소리를 낸다
      native?.saveCustomSound(reader.result.split(',')[1]);
      state.friends[friendId].style = 'diy';
      playFriend(friendId, 'diy', getDiy());
      toast(`🎙️ ${charById(friendId).name}에게 내 목소리 장착!`);
      syncSchedule(previewOperation);
    };
    reader.readAsDataURL(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
  };
  rec.start();
  btn.classList.add('recording');
  btn.textContent = '🔴 녹음 중… (3초)';
  setTimeout(() => rec.state === 'recording' && rec.stop(), 3000);
});

// ---------------------------------------------------------- 꾸미기 시트
function renderDecor() {
  const holds = stats().total.hold;
  $('themes').innerHTML = [['auto', '⏰ 시간 따라']].concat(Object.entries(THEMES).map(([k, t]) => [k, `${t.icon} ${t.name}`]))
    .map(([k, label]) => {
      const locked = THEMES[k]?.unlockHolds && holds < THEMES[k].unlockHolds;
      return `<button class="chip ${state.theme === k ? 'on' : ''} ${locked ? 'locked' : ''}" data-t="${k}" type="button">${label}${locked ? ' 🔒' : ''}</button>`;
    }).join('');
  $('props').innerHTML = PROPS.map(p => {
    const sale = p.price && !state.owned.includes(p.id);
    const on = state.placed.includes(p.id);
    return `<button class="prop ${sale ? 'sale' : on ? 'on' : ''}" data-p="${p.id}" type="button">
      <img src="assets/props/${p.id}.webp" alt="">${sale ? `🌰${p.price}` : esc(p.name)}</button>`;
  }).join('');
}

$('themes').addEventListener('click', e => {
  const b = e.target.closest('.chip');
  if (!b) return;
  const need = THEMES[b.dataset.t]?.unlockHolds;
  if (need && stats().total.hold < need) {
    toast(`🔒 누적 꾹참 ${need}회면 열려요 (지금 ${stats().total.hold}회)`);
    return;
  }
  state.theme = b.dataset.t;
  play('ui_pop', 0.5);
  commit();
});

$('props').addEventListener('click', e => {
  const b = e.target.closest('.prop');
  if (!b) return;
  const p = propById(b.dataset.p);
  if (p.price && !state.owned.includes(p.id)) {
    if (state.acorns < p.price) { toast(`🌰 도토리가 ${p.price - state.acorns}개 모자라요`); return; }
    state.acorns -= p.price;
    state.owned.push(p.id);
    state.placed.push(p.id);
    play('ui_coin', 0.6);
    toast(`🛍️ ${p.name} 구매! 아지트에 놓았어요`);
  } else {
    state.placed = state.placed.includes(p.id) ? state.placed.filter(x => x !== p.id) : [...state.placed, p.id];
    play('ui_pop', 0.5);
  }
  commit();
});

// ---------------------------------------------------------- 설정 시트
function renderSettings() {
  $('opOn').checked = state.schedule.on;
  $('winStart').value = state.schedule.start;
  $('winEnd').value = state.schedule.end;
  $('freqs').innerHTML = Object.entries(FREQUENCIES).map(([k, f]) =>
    `<button class="chip ${state.schedule.freq === k ? 'on' : ''}" data-f="${k}" type="button">${f.name} · 하루 ${f.range[0]}~${f.range[1]}번</button>`).join('');
  $('previewBox').hidden = !!native;
  $('previewModes').innerHTML = [['loud', '🔊 소리'], ['soft', '📳 진동'], ['hold', '🤫 무음']].map(([m, label]) =>
    `<button class="chip ${state.previewMode === m ? 'on' : ''}" data-m="${m}" type="button">${label}</button>`).join('');
  $('scheduleInfo').textContent = isActive()
    ? `오늘 남은 작전 ${remainingToday()}번 · 언제일지는 비밀 🤫`
    : '지금은 작전이 멈춰 있어요';
}

for (const id of ['winStart', 'winEnd']) {
  for (let h = 0; h < 24; h++) $(id).add(new Option(`${String(h).padStart(2, '0')}:00`, h));
  $(id).addEventListener('change', e => {
    state.schedule[id === 'winStart' ? 'start' : 'end'] = Number(e.target.value);
    syncSchedule(previewOperation);
  });
}
$('opOn').addEventListener('change', e => {
  state.schedule.on = e.target.checked;
  toast(e.target.checked ? '🚀 불시 작전 가동!' : '⏸️ 불시 작전 쉬는 중');
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
  if (state.frozen) { toast('🥶 긴급탈출 중엔 작전이 멈춰 있어요'); return; }
  if (!anyFriendOn()) { toast('🤫 작전에 나갈 친구가 없어요'); return; }
  $('settingsSheet').close();
  if (native) native.fireNow();       // 진짜 폰 상태로 실행 → bgbbOnNativeResume 으로 결과가 온다
  else previewOperation();
});
$('reset').addEventListener('click', () => {
  if (!confirm('도토리·기록·꾸미기를 모두 지울까요? 되돌릴 수 없어요.')) return;
  resetAll();
  native?.resetAll();
  location.reload();
});

// ---------------------------------------------------------- 공통
$('openSettings').addEventListener('click', () => { renderSettings(); $('settingsSheet').showModal(); });
$('status').addEventListener('click', () => { renderSettings(); $('settingsSheet').showModal(); });
$('openDecor').addEventListener('click', () => { renderDecor(); $('decorSheet').showModal(); });
$('themeChip').addEventListener('click', () => { renderDecor(); $('decorSheet').showModal(); });

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

document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
  screen = tab.dataset.screen;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === `screen-${screen}`));
  world.setActive(screen === 'home');
  play('ui_pop', 0.4);
  render();
}));

document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  drainNative();
  armWebTimer();
  render();   // 시간이 지나 '시간 따라' 테마나 날짜가 바뀌었을 수 있다
});

// ---------------------------------------------------------- 시작
subscribe(render);
world.setFrozen(state.frozen, false);
world.setActive(true);
syncSchedule(previewOperation);
drainNative();
render();
if (!state.onboarded) $('welcome').showModal();
addEventListener('pagehide', flush);
