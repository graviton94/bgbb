// 화면 연결: 상태가 바뀌면 render() 한 번으로 모든 화면을 맞춘다.
import { CHARACTERS, MODES, FREQUENCIES, TIPS, COIN_PACKS, coinify, AD_BONUS, AD_PER_DAY, CHATTER, BURST_FACE, GOOFS, shortGoofs, charById, face, vibeFor, pickStyle } from './data.js';
import { TITLES, RARITY, titleById } from './titles.js';
import { t, L, LANG, applyI18n } from './i18n.js';
import {
  state, commit, flush, subscribe, resetAll, dayKey, day, recordOperation, streak, totals, ownedCount, getDiy, setDiy, dailyToday, bump, grantHidden
} from './store.js';
import { pickMissions, missionProgress } from './missions.js';
import { reportWeek, weekReport } from './report.js';
import { startAlarmFx, stopAlarmFx, hitFx, comboFx, finishFx } from './alarmfx.js';
import { native, syncSchedule, armWebTimer, remainingToday, isActive, anyFriendOn, windowLabel, startLabel, hm, inWindow, resting, restLabel } from './schedule.js';
import { play, playFriend, forget, effectsOk } from './audio.js';
import { dateKey } from './plan.js';
import { drawCard } from './card.js';
import { startFx, stopFx } from './fx.js';
import { openCushion } from './cushion.js';
import { celebrateTitle, celebrateItem } from './cele.js';
import { CHANGELOG, APP_VERSION, older } from './changelog.js';
import { LEGAL, UPDATED } from './legal.js';
import { composeMeme, newsMeme, titleMeme, renderMeme, decorFont, setDecorFonts, setOwnedSkins } from './memes.js';
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
// 손끝 진동은 폰이 '진동' 상태일 때만 (소리가 나는 중이거나 무음 · 방해금지면 안 떨림, 방구 소리와 같은 규칙)
const haptic = ms => { if (native?.deviceMode?.() === 'soft') navigator.vibrate?.(ms); };

let sessionWear = null, sessionLook = null;   // 이번에 열었을 때 뽑힌 착용 · 모습 (shuffleStage)
let tipPrices = null;   // { productId: '₩1,500' } — Play 가 알려준 가격 (응원하기 · 뿡코인 충전)

// ---------------------------------------------------------- 토스트 (최신 3개까지 순서대로)
const toasts = [];
let toastBusy = false;
function toast(text, ms = 2400) {
  if (Math.random() < 0.25) text += ` ${pick(shortGoofs(L(GOOFS)))}`;   // 가끔 틀린 칭찬 한 마디 (데단해 · GRAET …)
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

const cardWhen = ts => { const d = new Date(ts); return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
/** 공유 이미지 정보: 짤 + 등급 테마 · 칭호 이름 · 조건 · 누가 언제 */
function shareData(ev, meme, titleId = null, label = '') {
  const x = titleId && titleById(titleId);
  const sub = ev ? `${L(charById(ev.char).nick)} · ${cardWhen(ev.t)}` : '';
  return x ? { ev, meme, rarity: x.rarity, chip: L(RARITY[x.rarity].name), chipColor: RARITY[x.rarity].color, name: L(x.name), how: L(x.how), sub }
    : { ev, meme, rarity: null, chip: '', chipColor: '#FFFFFF', name: label, sub };
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
/** 참음 이유 '(방해금지)' · '(7분 늦게 옴)' */
function whyLabel(ev) {
  if (ev.ear) return ` (${t('why.ear')})`;
  if (!ev.why) return '';
  const late = /^late(\d+)$/.exec(ev.why);
  return ` (${late ? t('why.late', { n: late[1] }) : t(`why.${ev.why}`)})`;
}
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
  const info = [when, L(MODES[ev.mode].name) + whyLabel(ev), L(c.nick), more ? t('burst.more', { n: more }) : ''].filter(Boolean).join(' · ');
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
    // 공유 이미지: 레전드 짤은 레전드 바탕, 실사는 분홍 홀로, 이름 자리엔 한 줄 드립
    burstCard = { ...shareData(ev, meme, null, pick(t('gacha.lines'))), theme: meme.legend ? 'legend' : meme.real ? 'rare' : 'meme',
      chip: meme.legend || meme.real ? t(meme.legend ? 'gacha.legend' : 'gacha.real') : '' };
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
  if (result) haptic([18, 40, 30]);   // 짤 뽑기는 방금 낸 방구 진동을 덮지 않게
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

// ---------------------------------------------------------- 짤 뽑기 (하루 무료 1번): 랜덤 짤. 다 쓰면 광고 보고 +1 (하루 3번까지)
const GACHA = 1;   // 하루 무료 짤 뽑기
/** 오늘 짤 뽑기 기록 (날이 바뀌면 새로) */
const gachaToday = () => (state.gacha.day === dayKey() ? state.gacha : (state.gacha = { day: dayKey(), n: 0, ads: 0 }));
const gachaLeft = () => { const g = gachaToday(); return Math.max(0, GACHA + (g.ads || 0) * AD_BONUS - g.n); };
// 보상형 광고: 네이티브가 볼 광고를 받아 두면 true (브라우저 미리보기는 늘 false)
let adReady = !!native?.adReady?.();   // 앱을 다시 켰을 때 이미 받아 둔 광고가 있으면 바로
// 광고로 더 받을 수 있는 횟수 (앱 · 광고 SDK 가 있을 때만)
const adsLeft = () => (native?.showRewardedAd ? Math.max(0, AD_PER_DAY - (gachaToday().ads || 0)) : 0);
const canWatchAd = () => adReady && adsLeft() > 0;
// 광고 자리는 셋: 짤 뽑기 +1 (하루 3번) · 미션 보상 한 번 더 (미션마다 1번) · 상점 뿡코인 +20 (하루 3번). 각자 따로 센다
const AD_COINS = 20, AD_COINS_PER_DAY = 3;
const hasAds = () => !!native?.showRewardedAd;
const coinAdsLeft = () => (hasAds() ? Math.max(0, AD_COINS_PER_DAY - (dailyToday().adCoins || 0)) : 0);
let adFor = { kind: 'gacha' };   // 지금 보여 주는 광고를 끝까지 보면 받을 것
function watchAd(purpose) {
  if (!adReady) { toast(t('gacha.adWait')); return; }
  adFor = purpose;
  native.showRewardedAd();
}
window.bgbbOnAdReady = v => {
  adReady = v === 'true' || v === true;
  renderHome();
  if (screen === 'shop') renderAdCoins();
  if ($('missionSheet').open) renderMissions();
};
window.bgbbOnAdReward = () => {
  const p = adFor;
  adFor = { kind: 'gacha' };
  if (p.kind === 'mission') {
    const m = todayMissions().find(x => x.id === p.id), d = dailyToday();
    if (!m || (d.doubled || []).includes(m.id)) return;
    d.doubled = [...(d.doubled || []), m.id];
    state.coins += m.coins;
    commit();
    toast(t('ad.missionGot', { n: m.coins }));
    if ($('missionSheet').open) renderMissions();
  } else if (p.kind === 'coins') {
    const d = dailyToday();
    if ((d.adCoins || 0) >= AD_COINS_PER_DAY) return;
    d.adCoins = (d.adCoins || 0) + 1;
    state.coins += AD_COINS;
    commit();
    toast(t('ad.coinsGot', { n: AD_COINS }));
  } else {
    const g = gachaToday();
    g.ads = (g.ads || 0) + 1;
    commit();
    toast(t('gacha.adGot'));
  }
  play('ui_levelup', 0.5);
  render();
  const pop = $('topCoins');
  pop.classList.remove('bump'); void pop.offsetWidth; pop.classList.add('bump');
};
$('burst').addEventListener('close', () => stopFx($('fx')));

$('shareCard').addEventListener('click', () => { if (!burstCard) return; countShare(); shareCard(burstCard); });

function celebrate(events) {
  if (!events.length) return;
  const results = events.map(recordOperation);
  const top = headliner(results);
  state.hero = top.char;
  commit();
  const title = titleById(top.title);
  if (!top.isNew) { showBurst(top, { result: top, more: results.length - 1 }); return; }
  // 새 칭호: 획득 팝업 → 짤 → (같이 열린 꾸미기가 있으면) 상자깡
  const unlocked = ITEMS.filter(x => x.title === top.title && !state.bought[x.id]);
  const d = new Date(top.t);
  play(title.rarity === 'legend' || title.rarity === 'jackpot' ? 'ui_treasure' : 'ui_levelup', 0.6);
  haptic(title.rarity === 'jackpot' ? [60, 40, 60, 40, 200] : [30, 50, 80]);
  celebrateTitle({
    tier: title.rarity, title: L(title.name), char: top.char, expr: BURST_FACE[top.mode] || 'burst',
    when: `${two(d.getHours())}:${two(d.getMinutes())}`, mode: L(MODES[top.mode].name),
    coins: top.coins, dex: ownedCount(), all: TITLES.length, unlocked: unlocked.map(x => L(x.name))
  }, () => {
    showBurst(top, { result: top, more: results.length - 1 });
    if (unlocked.length) afterBurst = () => showItem(unlocked[0], unlocked.length > 1
      ? t('cele.more', { slot: L(SLOT_NAMES[unlocked[0].slot]), n: unlocked.length - 1 }) : L(SLOT_NAMES[unlocked[0].slot]),
    t('cele.from', { name: L(title.name) }));
    // 처음 레전드 · 잭팟을 받고 짤까지 본 직후 딱 한 번 Play 리뷰 창 (기분 제일 좋을 때)
    else if (ownedCount() >= TITLES.length / 2 && !state.titles.hid_dex_half) afterBurst = () => celebrateHidden('hid_dex_half');
    else if ((title.rarity === 'legend' || title.rarity === 'jackpot') && !state.reviewAsked && native?.requestReview) {
      afterBurst = () => { state.reviewAsked = true; commit(); native.requestReview(); };
    }
  });
}

// 짤 화면 닫힌 다음 할 일 (칭호로 열린 아이템 상자깡)
let afterBurst = null;
$('burst').addEventListener('close', () => { const f = afterBurst; afterBurst = null; f && setTimeout(f, 150); });

/** 아이템 상자깡. ㅇㅋ/바로 장착 = 장착 */
/** 상자깡 팝업이 닫힌 뒤 한 번 할 일 (숨김 업적 등) */
let afterCele = null;
function showItem(x, slotLabel, from) {
  play('ui_treasure', 0.5);
  celebrateItem({ name: L(x.name), slot: slotLabel, preview: itemPreview(x), from, equipped: state.equip[x.slot] === x.id }, equip => {
    const next = afterCele;
    afterCele = null;
    if (next) setTimeout(next, 300);
    if (!equip || state.equip[x.slot] === x.id) return;
    equipItem(x);
    toast(t('shop.bought', { name: L(x.name) }));
  });
}
function equipItem(x) {
  state.equip[x.slot] = x.id;
  if (x.slot === 'bg') sessionBg = x;   // 방금 고른 건 바로 보이게
  if (x.slot === 'wear') sessionWear = x;
  if (x.slot === 'look') sessionLook = x;
  if (x.slot === 'bubble') renderBubbles();
  $('heroImg').dataset.mood = '';   // 모습이 바뀌었으면 홈 캐릭터 다시
  commit();
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

// 홈 무대: 앱 열 때마다 캐릭터 자리 · 높이 · 크기 (30~300%) · 기울기 (360도까지), 말풍선 · 소품 자리가 바뀐다.
// 평범한 값일수록 자주, 파격적일수록 드물게.
const roll = table => { let x = Math.random(); for (const [p, a, b] of table) { if ((x -= p) < 0) return a + Math.random() * (b - a); } return table[0][1]; };
const SIZES = [[0.55, 0.85, 1.1], [0.14, 0.55, 0.85], [0.06, 0.3, 0.55], [0.15, 1.1, 1.6], [0.07, 1.6, 2.2], [0.03, 2.2, 3]];   // [확률, 최소, 최대]
const TILTS = [[0.6, -12, 12], [0.22, -40, 40], [0.1, 120, 240], [0.08, -180, 180]];   // 가끔 거꾸로 · 아무 각도
const LIFTS = [[0.6, -0.05, 0.08], [0.25, 0.08, 0.6], [0.1, 0.6, 1], [0.05, -0.45, -0.05]];   // 바닥 기준 높이 (0 = 바닥, 1 = 천장, 음수 = 아래로 잘림)
function shuffleStage() {
  const r = (a, b) => a + Math.random() * (b - a);
  const size = roll(SIZES), tilt = roll(TILTS), lift = roll(LIFTS);
  const cx = size > 1.6 ? r(30, 70) : r(18, 82);   // 캐릭터 가운데 x (%)
  const H = `(min(100%, 250px) * ${size.toFixed(2)})`, hero = $('hero').style;
  hero.height = `calc${H}`;
  hero.maxHeight = 'none';
  hero.maxWidth = 'none';
  hero.left = `${cx.toFixed(1)}%`;
  hero.right = 'auto';
  hero.bottom = `calc((100% - ${H}) * ${lift.toFixed(2)} - 4px)`;
  hero.setProperty('--tx', '-50%');
  hero.setProperty('--rot', `${tilt.toFixed(0)}deg`);
  // 말풍선 난장판: 앞 2개는 캐릭터 머리 옆 (넓은 쪽), 나머지는 아무 데나 · 크기 · 각도 랜덤
  const right = cx < 55;
  const talk = Math.round(roll([[0.4, 2, 2], [0.35, 3, 3], [0.25, 4, 4]]));   // 많아도 4개
  sessionBg = pickOwned('bg');
  sessionWear = pickOwned('wear');
  sessionLook = pickOwned('look');
  bubbleLayout = Array.from({ length: talk }, (_, i) => {
    const near = i < 2, k = (0.28 + i * 0.06).toFixed(2);
    const side = near ? right : Math.random() < 0.5;
    return {
      left: near ? (right ? `min(calc(${cx.toFixed(1)}% + ${H} * ${k}), 52%)` : 'auto') : side ? `${r(0, 60).toFixed(0)}%` : 'auto',
      right: near ? (right ? 'auto' : `min(calc(${(100 - cx).toFixed(1)}% + ${H} * ${k}), 52%)`) : side ? 'auto' : `${r(0, 60).toFixed(0)}%`,
      bottom: near ? `clamp(0px, calc((100% - ${H}) * ${Math.max(0, lift).toFixed(2)} + ${H} * ${(0.72 - i * 0.2).toFixed(2)}), calc(100% - 40px))` : `${r(0, 88).toFixed(0)}%`,
      flip: near ? !right : !side,
      rot: near ? roll([[0.8, -4, 4], [0.2, -15, 15]]) : roll([[0.55, -6, 6], [0.3, -25, 25], [0.15, -90, 90]]),
      scale: near ? 1 : roll([[0.6, 0.85, 1.1], [0.25, 0.6, 0.85], [0.15, 1.2, 2]]),
      accent: i === 1 || (!near && Math.random() < 0.35)
    };
  });
  renderBubbles();
  // 소품 난장판: 몇 개 · 어디 · 얼마나 크게 · 몇 도로 다 랜덤 (자리만 뽑아 두고 그림은 renderProps 가)
  const count = Math.round(roll([[0.45, 1, 1], [0.25, 2, 2], [0.15, 3, 4], [0.1, 5, 7], [0.05, 9, 14]]));
  propLayout = Array.from({ length: count }, (_, i) => ({
    x: i === 0 ? (right ? r(62, 92) : r(8, 38)) : r(-5, 100),   // 첫 개는 캐릭터 반대쪽, 나머지는 아무 데나
    lift: i === 0 ? r(-0.02, 0.04) : roll([[0.55, -0.05, 0.08], [0.3, 0.08, 0.7], [0.15, 0.7, 1]]),
    w: roll([[0.6, 18, 32], [0.2, 8, 18], [0.15, 32, 55], [0.05, 55, 95]]),
    rot: roll([[0.65, -15, 15], [0.25, -70, 70], [0.1, -180, 180]]),
    front: Math.random() < 0.25,   // 가끔 캐릭터 앞을 가림
    flip: Math.random() < 0.3,
    other: Math.random()            // 다른 가진 소품을 섞을지 (renderProps)
  }));
  renderProps(true);
}

let propLayout = [], propKey = '';
/** 장착 소품 (+ 가끔 가진 다른 소품) 을 propLayout 자리에 깐다 */
function renderProps(force = false) {
  const main = itemById(state.equip.prop);
  const key = `${state.equip.prop}|${propLayout.length}`;
  if (!force && key === propKey) return;
  propKey = key;
  // 난장판은 종류도 섞는다: 장착한 것 + 가진 다른 소품들
  const others = ownedOf('prop').filter(x => x.src && x.id !== main?.id);
  $('homeProps').innerHTML = main?.src ? propLayout.map((p, i) => {
    const src = i > 0 && others.length && p.other < 0.75 ? others[Math.floor(p.other / 0.75 * others.length)].src : main.src;
    return `<img src="${src}" alt="" style="left:${p.x.toFixed(1)}%;width:${p.w.toFixed(0)}%;bottom:${(p.lift * 75).toFixed(0)}%;transform:translateX(-50%) rotate(${p.rot.toFixed(0)}deg)${p.flip ? ' scaleX(-1)' : ''};z-index:${p.front ? 4 : 0}">`;
  }).join('') : '';
}

let bubbleLayout = [];
/** 말풍선들을 bubbleLayout 자리에 (말은 친구 말버릇 먼저, 모자라면 아무 말) */
function renderBubbles() {
  const mine = [...L(charById(heroId()).bubbles)].sort(() => Math.random() - 0.5);
  const more = [...L(CHATTER)].sort(() => Math.random() - 0.5);
  const lines = [...mine.slice(0, 2), ...more, ...mine.slice(2)];
  $('bubbles').innerHTML = bubbleLayout.map((b, i) => { const skin = pickOwned('bubble'), font = (f => (f ? `f-${f}` : ''))(decorFont(0.35)); return `<span class="bubble ${font} ${b.accent ? 'accent' : ''} ${b.flip ? 'flip' : ''} ${skin?.src ? 'img' : ''}" data-skin="${skin?.id}"
    style="left:${b.left};right:${b.right};bottom:${b.bottom};transform:rotate(${b.rot.toFixed(0)}deg) scale(${b.scale.toFixed(2)});transform-origin:${b.flip ? 'right' : 'left'} bottom;--bubble-img:${skin?.src ? `url(${skin.src})` : 'none'}">${esc(lines[i % lines.length])}</span>`; }).join('');
}
const newBubbles = () => renderBubbles();

let lastWidget = '';
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
  // 홈 화면 위젯: 최근 칭호 · 홈 친구 (바뀌었을 때만)
  const widget = JSON.stringify({ title: latest ? L(titleById(latest.title).name) : '', char: heroId() });
  if (widget !== lastWidget) { lastWidget = widget; native?.setWidgetInfo?.(widget); }
  $('dexCount').textContent = t('home.dexCount', { n: ownedCount(), all: TITLES.length });
  // 기상 알람 · 쫄 시간 타일 + '알람 및 리마인더' 꺼져 있으면 경고 (방구가 화면 켤 때까지 밀림)
  const { wake, rest } = state.schedule;
  $('wakeOn').checked = wake.on;
  // 시각은 크게, 요일은 그 아래 작게 (작은 폰에서 한 줄에 다 안 들어감)
  $('wakeInfo').innerHTML = wake.on ? `${hm(wake.at)}<em class="t-sub">${esc(daysLabel(Array.isArray(wake.days) ? wake.days : [true, true, true, true, true, true, true]))}</em>` : esc(t('home.off'));
  $('restOn').checked = rest.on;
  $('restInfo').innerHTML = rest.on ? `${hm(rest.from)}<em class="t-sub">~ ${hm(rest.to)}</em>` : esc(t('home.off'));
  $('exactWarn').hidden = !(native?.exactAllowed && !native.exactAllowed());
  $('freeze').textContent = t(state.frozen ? 'home.unfreeze' : 'home.freeze');
  const left = gachaLeft();
  $('practice').textContent = left ? t('home.gacha', { n: left }) : canWatchAd() ? t('gacha.ad') : adsLeft() ? t('gacha.adLoading') : t('gacha.none');
  $('practice').classList.toggle('spent', !left && !canWatchAd());
  $('freeze').classList.toggle('on', state.frozen);
}

let heroBusy = 0;
let pokes = [];
$('hero').addEventListener('click', () => {
  bump('tap');
  // 숨김 업적: 20초 안에 50번
  const now = Date.now();
  pokes = [...pokes.filter(p => now - p < 20000), now];
  if (pokes.length >= 50) { pokes = []; celebrateHidden('hid_poke50'); }
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
});

// 짤 뽑기: 남았으면 뽑기 · 다 썼으면 광고 보고 +1 (하루 3번) · 그것도 다 썼으면 내일. 연습 한 방은 없음
$('practice').addEventListener('click', () => {
  if (!gachaLeft()) {
    if (canWatchAd()) watchAd({ kind: 'gacha' });   // 끝까지 보면 bgbbOnAdReward → +1
    else toast(t(adsLeft() ? 'gacha.adWait' : 'gacha.done'));
    return;
  }
  const id = heroId();
  playFriend(id, styleOf(id), getDiy());
  gachaToday().n++;
  bump('gacha');
  commit();
  showBurst({ t: Date.now(), char: id, mode: 'loud' }, { kind: 'gacha' });
});

$('cushionBtn').addEventListener('click', openCushion);

// ---------------------------------------------------------- 이번 주 방구 결산 (일요일 밤 9시부터 한 번 · 알림도)
let report = null;
const WD = () => t('wake.days');   // 일 월 화 …
function reportRange(r) {
  const s = new Date(`${r.monday}T00:00`), e = new Date(s); e.setDate(e.getDate() + 6);
  return `${s.getMonth() + 1}.${s.getDate()} ~ ${e.getMonth() + 1}.${e.getDate()}`;
}
function renderReport(r) {
  const max = Math.max(1, ...r.perDay), wd = WD();
  const bars = r.perDay.map((n, i) => `<span class="rp-day ${i === r.bestDay && n ? 'best' : ''}"><i style="height:${(n / max) * 100}%"></i><small>${wd[(i + 1) % 7]}</small></span>`).join('');
  const c = charById(r.top);
  return `<div class="rp-total"><b>${r.total}</b><span>${t('report.total')}</span></div>
    <div class="rp-bars" aria-hidden="true">${bars}</div>
    <div class="rp-modes"><span><b>${r.loud}</b>${esc(L(MODES.loud.name))}</span><span><b>${r.soft}</b>${esc(L(MODES.soft.name))}</span><span><b>${r.hold}</b>${esc(L(MODES.hold.name))}</span></div>
    <div class="rp-top"><img src="${face(r.top, 'thumbs_up')}" alt=""><span><small>${t('report.mvp')}</small><b>${esc(L(c.name))}</b><em>${t('report.mvpN', { n: r.topN })}</em></span></div>
    <p class="rp-verdict">${esc(t(`report.v.${r.verdict}`, { n: r.meetingLoud }))}</p>
    ${r.fresh ? `<p class="rp-fresh">${t('report.fresh', { n: r.fresh })}</p>` : ''}`;
}
function openReport(r) {
  report = r;
  $('reportRange').textContent = reportRange(r);
  $('reportBody').innerHTML = renderReport(r);
  if (!$('reportSheet').open) $('reportSheet').showModal();
  play('ui_levelup', 0.5);
}
/** 볼 결산이 있으면 띄운다 (이미 본 주면 안 띄움) */
function maybeReport() {
  const wk = reportWeek();
  if (state.reportSeen === wk) return false;
  const r = weekReport(state.days, wk, state.titles);
  state.reportSeen = wk;
  commit();
  if (!r) return false;
  openReport(r);
  return true;
}
/** 공유용 결산 카드 (1080×1350) */
async function drawReport(r) {
  const cv = $('card');
  cv.width = 1080; cv.height = 1350;
  const g = cv.getContext('2d');
  await document.fonts.load('80px "Black Han Sans"').catch(() => {});
  const F = (px, w = 400) => `${w} ${px}px "Black Han Sans", system-ui, sans-serif`;
  g.fillStyle = '#FFD400'; g.fillRect(0, 0, 1080, 1350);
  g.fillStyle = '#111';
  for (let i = -1350; i < 1080; i += 90) { g.save(); g.globalAlpha = 0.06; g.fillRect(i, 0, 40, 1350); g.restore(); }
  g.font = F(40); g.fillText(`${t('appName')} · ${reportRange(r)}`, 70, 110);
  g.font = F(110); g.fillText(t('report.title'), 70, 240);
  g.font = F(300); g.fillText(String(r.total), 70, 560);
  g.font = F(300); const w0 = g.measureText(String(r.total)).width; g.font = F(60); g.fillText(t('report.total'), 90 + w0, 560);
  const modes = [['loud', r.loud], ['soft', r.soft], ['hold', r.hold]];
  modes.forEach(([m, n], i) => {
    const x = 70 + i * 320;
    g.fillStyle = '#111'; g.beginPath(); g.roundRect(x, 620, 290, 150, 26); g.fill();
    g.fillStyle = i === 0 ? '#D7FF3D' : '#fff'; g.font = F(80); g.fillText(String(n), x + 30, 715);
    const nw = g.measureText(String(n)).width;
    g.font = F(40); g.fillText(L(MODES[m].name), x + 50 + nw, 715);
  });
  const img = new Image(); img.src = face(r.top, 'thumbs_up');
  await img.decode().catch(() => {});
  if (img.naturalWidth) g.drawImage(img, 70, 820, 330, 330);
  g.fillStyle = '#111'; g.font = F(44); g.fillText(t('report.mvp'), 430, 900);
  g.font = F(96); g.fillText(L(charById(r.top).name), 430, 1010);
  g.font = F(48); g.fillText(t('report.mvpN', { n: r.topN }), 430, 1080);
  g.fillStyle = '#111'; g.fillRect(0, 1190, 1080, 160);
  g.fillStyle = '#D7FF3D'; g.font = F(52);
  g.fillText(t(`report.v.${r.verdict}`, { n: r.meetingLoud }), 70, 1290, 940);
  return cv;
}
$('reportShare').addEventListener('click', async () => {
  if (!report) return;
  countShare();
  const cv = await drawReport(report);
  const name = `bgbb_week_${report.monday}.png`;
  if (native) { toast(t(native.saveAndShareImage(cv.toDataURL('image/png').split(',')[1], name) ? 'card.saved' : 'card.cantSave')); return; }
  const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = name; a.click();
  toast(t('card.savedWeb'));
});

// ---------------------------------------------------------- 숨김 업적 (이스터에그): 방구가 아니라 행동으로 받는 칭호
function celebrateHidden(id) {
  const r = grantHidden(id);
  if (!r) return;
  const x = titleById(id), d = new Date(r.ev.t);
  play(x.rarity === 'legend' ? 'ui_treasure' : 'ui_levelup', 0.6);
  haptic([30, 50, 80]);
  celebrateTitle({
    tier: x.rarity, title: L(x.name), char: r.ev.char, expr: 'thumbs_up',
    when: `${two(d.getHours())}:${two(d.getMinutes())}`, mode: t('hidden.tag'),
    coins: r.coins, dex: ownedCount(), all: TITLES.length, unlocked: []
  }, () => openTitle(id));
  checkDexHalf();
}
window.bgbbHidden = celebrateHidden;   // cushion.js (함정 10번)
const checkDexHalf = () => { if (ownedCount() >= TITLES.length / 2) setTimeout(() => celebrateHidden('hid_dex_half'), 1500); };
function countShare() {
  bump('share');
  state.shares = (state.shares || 0) + 1;
  commit();
  if (state.shares >= 10) setTimeout(() => celebrateHidden('hid_share10'), 1500);
}
// 로고 7연타
let logoTaps = [];
document.querySelector('.logo').addEventListener('click', () => {
  const now = Date.now();
  logoTaps = [...logoTaps.filter(x => now - x < 3000), now];
  const logo = document.querySelector('.logo');
  logo.classList.remove('poke'); void logo.offsetWidth; logo.classList.add('poke');
  if (logoTaps.length >= 7) { logoTaps = []; playFriend('hamster', 'loud'); celebrateHidden('hid_logo'); }
});
/** 새벽 3시대에 앱을 열면 */
const checkNightOwl = () => { if (new Date().getHours() === 3) celebrateHidden('hid_night_owl'); };

// ---------------------------------------------------------- 오늘의 미션 (날마다 세 개, 깨면 뿡코인)
const todayMissions = () => missionProgress(pickMissions(dayKey()), day(), dailyToday().counts, dailyToday().claimed);
function renderMissionBadge() {
  const list = todayMissions();
  const ready = list.some(m => m.done && !m.claimed);
  $('missionN').textContent = `${list.filter(m => m.claimed).length}/${list.length}`;
  $('topMission').classList.toggle('ready', ready);
}
/** 미션 버튼: 받기 (🪙 n) → 받은 뒤엔 광고 보고 한 번 더 (📺 +n, 미션마다 1번) → 받음 */
function missionButton(m) {
  if (!m.claimed) return `<button class="m-claim" data-id="${m.id}" type="button" ${m.done ? '' : 'disabled'}>${coinify(esc(`🪙 ${m.coins}`))}</button>`;
  const doubled = (dailyToday().doubled || []).includes(m.id);
  if (hasAds() && !doubled) return `<button class="m-claim m-ad" data-ad="${m.id}" type="button" ${adReady ? '' : 'disabled'} aria-label="${esc(t('ad.missionAria', { n: m.coins }))}">${adReady ? esc(`📺 +${m.coins}`) : esc(t('ad.loadingShort'))}</button>`;
  return `<button class="m-claim" type="button" disabled>${esc(t('mission.claimed'))}</button>`;
}
function renderMissions() {
  $('missionList').innerHTML = todayMissions().map(m => `<li class="mission ${m.done ? 'done' : ''} ${m.claimed ? 'claimed' : ''}">
    <div class="m-text"><b>${esc(L(m.name))}</b><span class="m-bar"><i style="width:${(m.n / m.goal) * 100}%"></i></span><small>${m.n}/${m.goal}</small></div>
    ${missionButton(m)}
  </li>`).join('');
}
$('topMission').addEventListener('click', () => { renderMissions(); $('missionSheet').showModal(); });
$('missionList').addEventListener('click', e => {
  const b = e.target.closest('.m-claim');
  if (!b || b.disabled) return;
  if (b.dataset.ad) { watchAd({ kind: 'mission', id: b.dataset.ad }); return; }
  const m = todayMissions().find(x => x.id === b.dataset.id);
  if (!m || !m.done || m.claimed) return;
  dailyToday().claimed.push(m.id);
  if (dailyToday().claimed.length >= 3) setTimeout(() => celebrateHidden('hid_mission3'), 900);
  state.coins += m.coins;
  commit();
  play('ui_treasure', 0.6);
  haptic([20, 40, 60]);
  toast(t('mission.got', { n: m.coins }));
  renderMissions();
  const pop = $('topCoins');
  pop.classList.remove('bump'); void pop.offsetWidth; pop.classList.add('bump');
});

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

let dexSeen = null;
function renderDex() {
  const s = totals();
  $('dexBig').innerHTML = `${ownedCount()}<span>/${TITLES.length}</span>`;
  $('dexStats').textContent = t('dex.stats', s);
  $('filters').innerHTML = FILTERS.map(f =>
    `<button class="chip ${dexFilter === f ? 'on' : ''}" data-f="${f}" type="button">${f === 'all' ? t('dex.all') : f === 'locked' ? t('dex.locked') : L(RARITY[f].name)}</button>`).join('');
  const order = { jackpot: -1, legend: 0, rare: 1, normal: 2 };
  const list = TITLES.filter(x => dexFilter === 'all' || (dexFilter === 'locked' ? !state.titles[x.id] : x.rarity === dexFilter))
    .sort((a, b) => !!state.titles[b.id] - !!state.titles[a.id] || order[a.rarity] - order[b.rarity]);
  $('dexList').innerHTML = list.map((x, i) => {
    const own = state.titles[x.id];
    // 메달 얼굴: 마지막으로 터진 친구 · 그때 표정 (잭팟은 엄지척). 안 딴 칭호는 실루엣
    const who = own?.last?.char || ['hamster', 'tit', 'cat'][i % 3];
    const expr = !own ? 'blank' : x.rarity === 'jackpot' ? 'thumbs_up' : BURST_FACE[own.last?.mode] || 'burst';
    return `<li><button class="dex-card r-${x.rarity} ${own ? '' : 'locked'}" data-id="${x.id}" type="button">
      <span class="dc-top"><span class="tag ${x.rarity}">${L(RARITY[x.rarity].name)}</span>${own ? `<span class="dc-n">x${own.n}</span>` : '<span class="dc-n dc-q">🔒</span>'}</span>
      <span class="dc-medal"><img src="${face(who, expr)}" alt="" loading="lazy"></span>
      <b class="dc-name">${own ? esc(L(x.name)) : '???'}</b>
      <small class="dc-how">${own ? esc(L(x.how)) : esc(t('dex.hint', { hint: L(x.hint) }))}</small></button></li>`;
  }).join('');
  // 움직이는 건 딴 칭호 중 화면에 보이는 카드만 (89장이 한꺼번에 돌면 싼 폰에서 버벅임)
  dexSeen?.disconnect();
  dexSeen = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('vis', e.isIntersecting)), { rootMargin: '80px' }) : null;
  $('dexList').querySelectorAll('.dex-card:not(.locked):not(.r-normal)').forEach(el => (dexSeen ? dexSeen.observe(el) : el.classList.add('vis')));
}

$('filters').addEventListener('click', e => {
  const b = e.target.closest('.chip');
  if (!b) return;
  dexFilter = b.dataset.f;
  play('ui_pop', 0.4);
  renderDex();
});

$('dexList').addEventListener('click', e => {
  const b = e.target.closest('.dex-card');
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
      : `${esc(t('status.window', { from: startLabel() }))}${rest.on && rest.from !== rest.to ? `<small>${esc(t('status.except', { window: restLabel().replace('~', ' ~ ') }))}</small>` : ''}`;
  $('mute').hidden = false;
  $('mute').classList.toggle('off', !s.web && (s.saver || (!s.dnd && !s.vol)));
  $('mute').textContent = s.web ? t(`status.web.${s.mode}`) : s.dnd ? t('status.dnd') : s.saver ? t('status.saver') : s.vol ? t('status.vol', { vol: s.vol, max: s.max }) : s.mode === 'hold' ? t('status.silent') : t('status.muted');   // 볼륨 0 이어도 무음 모드면 진동 없이 참음
}
/** 소리 규칙 표 (온보딩 2쪽). now = 지금 폰 상태 줄을 형광으로 */
function soundRules(now) {
  const row = (m, icon) => `<li class="${m === now ? 'now' : ''}"><span>${icon}</span><b>${t(`rules.${m}`)}</b><em>${t(`rules.${m}R`)}</em>${m === now ? `<i>${t('rules.now')}</i>` : ''}</li>`;
  return `<p class="rules-important">${t('rules.important')}</p><ol class="rules">${row('off', '🫥')}${row('loud', '🔊')}${row('soft', '📳')}${row('hold', '🔕')}</ol><p class="rules-note">${t('rules.note')}</p>`;
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
// 꾸미기는 전부 '가진 것 중 랜덤'이 재미: 앱 열 때마다 배경 · 소품 · 착용 · 말풍선 · 모습(원화/실사)을,
// 터질 때마다 뿡 효과를, 공유할 때마다 프레임을 가진 것 중에서 뽑는다 (장착한 건 40% 로 자주)
const realLook = () => (sessionLook || itemById(state.equip.look))?.id === 'look_real';
const ownedOf = slot => ITEMS.filter(x => x.slot === slot && isOwned(x, state.titles, state.bought));
/** 가진 것 중 하나: 장착한 것 40%, 나머지 고르게 */
function pickOwned(slot) {
  const pool = ownedOf(slot), main = itemById(state.equip[slot]);
  if (main && (Math.random() < 0.4 || pool.length < 2)) return main;
  return pool[Math.floor(Math.random() * pool.length)] || main;
}
let sessionBg = null;   // 이번에 열었을 때 뽑힌 배경 (shuffleStage)
function applySkin() {
  // 모은 구린 글씨 (장착한 건 두 번 넣어 더 자주)
  const fonts = ownedOf('font').filter(x => x.deco);
  setDecorFonts(fonts.flatMap(x => (state.equip.font === x.id ? [x.deco, x.deco] : [x.deco])));
  const owned = ownedOf('bg');
  const bg = (sessionBg && owned.includes(sessionBg) && sessionBg) || itemById(state.equip.bg) || itemById(DEFAULT_EQUIP.bg);
  const app = document.querySelector('.app');
  app.style.background = bg.css;
  app.classList.toggle('dark', !!bg.dark);
  app.classList.toggle('vivid', !!bg.vivid);
  app.classList.toggle('photo', bg.css.includes('url(assets/skin/'));
  app.style.boxShadow = bg.frame ? `inset 0 0 0 6px ${bg.frame}, inset 0 0 0 10px #FFFBEA, inset 0 0 0 12px ${bg.frame}` : '';
  setOwnedSkins({ prop: ownedOf('prop').map(x => x.src).filter(Boolean), wear: ownedOf('wear').map(x => x.src).filter(Boolean) });
  renderProps();
  const wear = sessionWear && ownedOf('wear').includes(sessionWear) ? sessionWear : itemById(state.equip.wear);
  $('heroWear').hidden = !wear?.src;
  if (wear?.src) $('heroWear').src = wear.src;
}
/** 터질 때 날아갈 그림 (없으면 '뿡!' 글자) */
const fxImage = () => pickOwned('fx')?.src || null;
/** 공유 프레임 그림 (없으면 기본 검은 띠) */
const frameImage = () => pickOwned('frame')?.src || null;

let shopSlot = 'bg';
function itemPreview(x) {
  if (x.slot === 'bg') return `<span class="sw" style="background:${x.css}${x.frame ? `;box-shadow:inset 0 0 0 4px ${x.frame}` : ''}"></span>`;
  if (x.slot === 'prop' || x.slot === 'fx' || x.slot === 'frame' || x.slot === 'sound') return x.src ? `<img src="${x.src}" alt="">` : x.slot === 'fx' ? '<span class="sfx-pv">뿡!</span>' : '<span class="none">—</span>';
  if (x.slot === 'bubble') return `<span class="bubble ${x.src ? 'img' : ''}" data-skin="${x.id}" style="--bubble-img:${x.src ? `url(${x.src})` : 'none'}">${t('shop.sample')}</span>`;
  if (x.slot === 'font') return `<span class="font-pv ${x.deco ? `f-${x.deco}` : ''}">${t('shop.fontSample')}</span>`;
  if (x.slot === 'wear') return `<span class="wear-pv"><img src="${face(heroId(), 'blank', realLook())}" alt="">${x.src ? `<img src="${x.src}" alt="">` : ''}</span>`;
  return `<img src="${face(heroId(), 'blank', x.id === 'look_real')}" alt="">`;
}
/** 상점 맨 위: 광고 보고 뿡코인 +20 (하루 3번, 광고가 있는 앱에서만) */
function renderAdCoins() {
  const left = coinAdsLeft(), el = $('adCoins');
  el.hidden = !left;
  if (!left) return;
  el.disabled = !adReady;
  el.innerHTML = adReady ? coinify(esc(t('ad.coins', { n: AD_COINS, left }))) : esc(t('gacha.adLoading'));
}
$('adCoins').addEventListener('click', () => watchAd({ kind: 'coins' }));
function renderShop() {
  renderAdCoins();
  $('coins').innerHTML = coinify(esc(t('shop.coins', { n: state.coins })));
  const packs = COIN_PACKS.filter(p => tipPrices?.[p.id]);
  $('coinPacks').hidden = !packs.length;
  $('coinPacks').innerHTML = packs.length ? `<b>${esc(t('shop.charge'))}</b>${packs.map(p => `<button class="pack" data-id="${p.id}" type="button"><img src="${p.img}" alt=""><span>${coinify('🪙')} ${p.coins}</span><small>${esc(tipPrices[p.id])}</small></button>`).join('')}` : '';
  $('slots').innerHTML = SLOTS.filter(s => ITEMS.filter(x => x.slot === s).length > 1).map(s => `<button class="chip ${shopSlot === s ? 'on' : ''}" data-s="${s}" type="button">${L(SLOT_NAMES[s])}</button>`).join('');
  $('shopList').innerHTML = ITEMS.filter(x => x.slot === shopSlot).map(x => {
    const owned = isOwned(x, state.titles, state.bought), on = state.equip[x.slot] === x.id;
    const hint = x.title && (state.titles[x.title] ? L(titleById(x.title).name) : L(titleById(x.title).hint));
    const season = x.season ? t('shop.season', { m: x.season.join('·') }) : '';
    const how = on ? t('shop.equipped') : owned ? t('shop.equip')
      : x.gift ? t('shop.gift', { when: L(titleById(x.gift).hint), n: x.price })
      : x.title && x.price ? t('shop.title_or', { hint, n: x.price }) : x.title ? t('shop.title_only', { hint }) : `${season ? `${season} · ` : ''}${t('shop.buy', { n: x.price })}`;
    return `<li><button class="item ${owned ? '' : 'locked'} ${on ? 'on' : ''}" data-id="${x.id}" type="button">
      <span class="pv">${itemPreview(x)}</span><b>${esc(L(x.name))}</b><small>${coinify(esc(how))}</small></button></li>`;
  }).join('');
}
$('topCoins').addEventListener('click', () => document.querySelector('.tab[data-screen="shop"]')?.click());
$('coinPacks').addEventListener('click', e => {
  const b = e.target.closest('.pack');
  if (b) native?.buyTip(b.dataset.id);   // 결제는 응원하기와 같은 길 (Play 일회성 상품, 소모성)
});
// 충전 결제 확인: 코인을 넣고 나서 네이티브에 소모하라고 알린다. 같은 결제(토큰)는 두 번 넣지 않음
window.bgbbOnCoinPack = json => {
  let p;
  try { p = JSON.parse(json); } catch (e) { return; }
  const pack = COIN_PACKS.find(x => x.id === p.id);
  if (pack && p.token && !state.coinTokens.includes(p.token)) {
    state.coins += pack.coins;
    state.coinTokens = [p.token, ...state.coinTokens].slice(0, 50);
    commit();
    play('ui_treasure', 0.7);
    toast(t('shop.charged', { n: pack.coins }), 3000);
  }
  if (p.token) native?.coinsCredited?.(p.token);
};
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
    if (x.slot === 'sound') previewSound(x);   // 사기 전에 들어 보기
    if (!x.price) { toast(t('shop.title_only', { hint: L(titleById(x.title).hint) })); return; }
    if (!inSeason(x)) { toast(t('shop.offSeason', { m: x.season.join('·') })); return; }
    if (state.coins < x.price) { toast(t('shop.poor')); return; }
    if (!confirm(t('shop.confirm', { name: L(x.name), n: x.price }))) return;
    state.coins -= x.price;
    state.bought[x.id] = true;
    commit();
    if (Object.keys(state.bought).length >= 10) afterCele = () => celebrateHidden('hid_shopaholic');
    if (x.slot === 'sound') syncSchedule(previewOperation);   // 알람 방구도 이 팩을 씀
    showItem(x, L(SLOT_NAMES[x.slot]), t('cele.paid', { n: x.price }));
    return;
  }
  play('ui_pop', 0.4);
  equipItem(x);
  if (x.slot === 'sound') { previewSound(x); syncSchedule(previewOperation); }
});
/** 방구 소리 팩 미리 듣기: 햄찌 방구 + 팩 (앱은 소리 규칙대로 네이티브가) */
function previewSound(x) {
  if (native?.previewPack) { native.previewPack(x.pack || ''); return; }
  playFriend('hamster', 'main');
  if (x.pack) new Audio(`assets/sounds/pack_${x.pack}.ogg`).play().catch(() => {});
}
/** 시즌 소리 팩: 그날 앱을 열면 공짜 (칭호의 날짜 조건을 그대로 씀) */
function giveGifts() {
  const d = new Date();
  const ctx = { month: d.getMonth() + 1, day: d.getDate(), ymd: dayKey(), hour: d.getHours(), wd: d.getDay(), today: { loud: 0, soft: 0, hold: 0 } };
  const gift = ITEMS.find(x => x.gift && !isOwned(x, state.titles, state.bought) && titleById(x.gift)?.test(ctx));
  if (!gift) return false;
  state.bought[gift.id] = true;
  commit();
  syncSchedule(previewOperation);
  showItem(gift, L(SLOT_NAMES[gift.slot]), t('shop.giftGot', { when: L(titleById(gift.gift).hint) }));
  return true;
}

// ---------------------------------------------------------- 시즌 공지: 시즌 꾸미기는 미리 다 들어 있고, 그 달 처음 열 때 한 번 소개한다 (해마다)
const SEASON_NOTICES = [
  { id: 'xmas', month: 12, slot: 'prop' }   // 12월 한정 9종 (items.js season: [12])
];
function maybeSeasonNotice() {
  const d = new Date(), n = SEASON_NOTICES.find(x => x.month === d.getMonth() + 1);
  if (!n || !state.onboarded) return false;
  const key = `${n.id}-${d.getFullYear()}`;
  if (state.notices[key]) return false;
  state.notices[key] = true;
  commit();
  const list = ITEMS.filter(x => x.season?.includes(n.month));
  $('seasonTitle').textContent = t(`season.${n.id}.title`);
  $('seasonBody').textContent = t(`season.${n.id}.body`, { n: list.length });
  $('seasonItems').innerHTML = list.slice(0, 9).map(x => `<span class="pv ${x.slot === 'sound' ? 'pv-sound' : ''}" title="${esc(L(x.name))}">${itemPreview(x)}</span>`).join('');
  $('seasonGo').onclick = () => { $('seasonSheet').close(); shopSlot = n.slot; showScreen('shop'); };
  play('ui_treasure', 0.5);
  $('seasonSheet').showModal();
  return true;
}

// ---------------------------------------------------------- 렌더
function render() {
  const n = streak();
  $('streak').textContent = n ? t('top.streak', { n }) : '';
  $('topCoins').innerHTML = `${coinify('🪙')} ${state.coins}`;
  renderMissionBadge();
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

// ---------------------------------------------------------- 기상 알람 (04~12시, 5분 단위)
fillWheel($('wH'), [...Array(9).keys()].map(i => i + 4));
fillWheel($('wM'), minutes);
// 요일: 폰 알람처럼 일~토 일곱 개를 아무렇게나 켜고 끔. 하나도 안 켜면 '한 번만' (다음 그 시각 하루)
let wakeDays = [true, true, true, true, true, true, true];
/** '매일' · '평일' · '주말' · '월 수 금' · '한 번만' */
function daysLabel(days) {
  const n = days.filter(Boolean).length, names = t('wake.days');
  if (n === 7) return t('wake.everyday');
  if (!n) return t('wake.once');
  if (n === 5 && !days[0] && !days[6]) return t('wake.weekdays');
  if (n === 2 && days[0] && days[6]) return t('wake.weekend');
  return days.map((on, i) => (on ? names[i] : '')).filter(Boolean).join(' ');
}
function renderWakeDays() {
  $('wakeDays').innerHTML = t('wake.days').map((d, i) =>
    `<button class="wday ${wakeDays[i] ? 'on' : ''} ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}" data-i="${i}" type="button" aria-pressed="${wakeDays[i]}">${d}</button>`).join('');
  const n = wakeDays.filter(Boolean).length;
  $('wakeRepeat').textContent = n ? t('wake.repeat', { days: daysLabel(wakeDays) }) : t('wake.once');
}
$('wakeDays').addEventListener('click', e => {
  const b = e.target.closest('.wday');
  if (!b) return;
  wakeDays[+b.dataset.i] = !wakeDays[+b.dataset.i];
  haptic(8);
  renderWakeDays();
});
/** 정확한 알람 권한 ('알람 및 리마인더'): 없으면 기상 알람을 켤 수 없음 */
const exactOk = () => !(native?.exactAllowed && !native.exactAllowed());
function openWake() {
  if (!exactOk()) { toast(t('wake.needExact'), 3200); native.openExactSettings?.(); return; }
  const { at, days } = state.schedule.wake;
  wakeDays = Array.isArray(days) ? [...days] : [true, true, true, true, true, true, true];
  renderWakeDays();
  $('wakeSheet').showModal();
  wheelSet($('wH'), Math.floor(at / 60)); wheelSet($('wM'), at % 60 - (at % STEP));
}
$('wakeOpen').addEventListener('click', openWake);
$('wakeOn').addEventListener('change', e => {
  if (e.target.checked) { e.target.checked = state.schedule.wake.on; openWake(); return; }
  state.schedule.wake.on = false;
  toast(t('wake.off'));
  syncSchedule(previewOperation);
});
/** 다음에 at 분이 되는 날 (요일을 하나도 안 골랐을 때 그 하루) */
function nextOnce(at, now = Date.now()) {
  const d = new Date(now);
  d.setHours(0, at, 0, 0);
  if (d.getTime() <= now) d.setDate(d.getDate() + 1);
  return dateKey(d.getTime());
}
$('wakeSave').addEventListener('click', () => {
  if (!exactOk()) { toast(t('wake.needExact'), 3200); native.openExactSettings?.(); return; }
  const at = wheelGet($('wH')) * 60 + wheelGet($('wM'));
  const once = wakeDays.some(Boolean) ? 0 : nextOnce(at);
  state.schedule.wake = { on: true, at, days: [...wakeDays], once };
  $('wakeSheet').close();
  play('ui_pop', 0.5);
  toast(t('wake.saved', { at: `${hm(at)} · ${daysLabel(wakeDays)}` }));
  syncSchedule(previewOperation);
});
/** 앱을 열 때: 권한이 꺼졌으면 알람도 끔 · '한 번만' 알람이 이미 지났으면 끔 */
function checkWakeSettings() {
  const w = state.schedule.wake;
  if (!w.on) return;
  let off = false;
  if (!exactOk()) { off = true; toast(t('wake.lostExact'), 4000); }
  else if (Array.isArray(w.days) && !w.days.some(Boolean)) {
    const ring = new Date(Math.floor(w.once / 10000), Math.floor(w.once / 100) % 100 - 1, w.once % 100, 0, w.at).getTime();
    if (Date.now() > ring + 15 * 60e3 && !native?.wakeRinging?.()) off = true;
  }
  if (off) { w.on = false; syncSchedule(previewOperation); }
}
$('exactWarn').addEventListener('click', () => native?.openExactSettings?.());

// 알람 음악 미리 듣기 (미디어 볼륨, 웹뷰에서). 실제 알람은 네이티브가 알람 볼륨으로
let alarmAudio = null;
function stopAlarmAudio() {
  alarmAudio?.pause();
  alarmAudio = null;
  $('wakePreview').textContent = t('wake.preview');
}
$('wakePreview').addEventListener('click', () => {
  if (alarmAudio) { stopAlarmAudio(); return; }
  if (!effectsOk()) { toast(t('wake.previewQuiet')); return; }   // 소리 규칙 0 · 1 · 2 (비상탈출 · 쫄 시간 · 방해금지 · 절전)
  alarmAudio = new Audio('assets/sounds/alarm_wake.ogg');
  alarmAudio.play().catch(() => {});
  alarmAudio.onended = stopAlarmAudio;
  $('wakePreview').textContent = t('wake.previewStop');
});
$('wakeSheet').addEventListener('close', stopAlarmAudio);

// ---------------------------------------------------------- 기상 알람이 울릴 때 (실제 알람시계처럼 [확인] 을 눌러야 꺼짐)
function showWakeAlarm() {
  const d = new Date();
  $('waTime').textContent = `${two(d.getHours())}:${two(d.getMinutes())}`;
  $('waShout').textContent = pick(t('alarm.shout'));
  const font = decorFont(1);
  $('waShout').className = `wa-shout ${font ? `f-${font}` : ''}`;
  $('waFaces').innerHTML = CHARACTERS.map((c, i) => `<img src="${face(c.id, 'burst', realLook())}" style="animation-delay:${i * 0.15}s" alt="">`).join('');
  $('waLine').textContent = t('alarm.line', { from: startLabel() });
  if (!native) {   // 브라우저 미리보기: 음악도 여기서
    alarmAudio?.pause();
    alarmAudio = new Audio('assets/sounds/alarm_wake.ogg');
    alarmAudio.loop = true;
    alarmAudio.play().catch(() => {});
  }
  resetTaps();
  if (!$('wakeAlarm').open) $('wakeAlarm').showModal();
  startAlarmFx($('waCanvas'));
}
function closeWakeAlarm(snooze) {
  if (native) (snooze ? native.snoozeWake : native.stopWake)?.call(native);
  alarmAudio?.pause();
  alarmAudio = null;
  clearInterval(tapDecay);
  stopAlarmFx();
  $('wakeAlarm').close();
  if (snooze) toast(t('alarm.snoozed'));
}

// [확인] 20번 연타 미션: 누를 때마다 숫자가 펑 · 화면 흔들림 · 응원 글자 · 색 번쩍. 2초 손을 떼면 숫자가 다시 올라감
const TAPS = 20;
let firstTap = 0;
let taps = 0, lastTap = 0, tapDecay = 0;
// 발라트로식 점수: 빠르게 이어 누르면 MULT 가 오르고, 누를 때마다 CHIPS += 10 × MULT
let chips = 0, combo = 0;
function resetTaps() {
  taps = 0;
  chips = 0;
  combo = 0;
  $('waChips').textContent = '0';
  $('waMult').textContent = '1';
  $('waCount').textContent = TAPS;
  $('waOk').style.setProperty('--p', '0');
  $('wakeAlarm').classList.remove('done');
  clearInterval(tapDecay);
  tapDecay = setInterval(() => {   // 안 누르고 있으면 0.35초마다 하나씩 되돌아감
    if (taps > 0 && taps < TAPS && Date.now() - lastTap > 2000) { taps--; drawTaps(false); }
  }, 350);
}
function drawTaps(hit) {
  const left = TAPS - taps;
  $('waCount').textContent = left;
  $('waOk').style.setProperty('--p', String(taps / TAPS));
  if (!hit) return;
  const box = $('wakeAlarm');
  // 콤보: 0.45초 안에 이어 누르면 콤보, MULT = 1 + 콤보/4
  combo = Date.now() - lastTap < 450 || taps === 1 ? combo + 1 : 1;
  const mult = 1 + Math.floor(combo / 4);
  chips += 10 * mult;
  for (const [id, v] of [['waChips', chips], ['waMult', mult]]) {
    const el = $(id);
    el.textContent = v;
    el.parentElement.classList.remove('bump'); void el.offsetWidth; el.parentElement.classList.add('bump');
  }
  const r = $('waOk').getBoundingClientRect(), c = $('waCanvas').getBoundingClientRect();
  hitFx(r.left - c.left + r.width * (0.3 + Math.random() * 0.4), r.top - c.top + r.height / 2, taps, mult);
  if (taps % 5 === 0 && taps < TAPS) comboFx(taps / 5 + 1);
  // 숫자 펑 + 버튼 눌림 + 화면 흔들림 (뒤로 갈수록 세게)
  for (const [el, cls] of [[$('waCount'), 'pop'], [$('waOk'), 'hit'], [box, `shake${taps % 2}`]]) {
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
  }
  box.style.setProperty('--amp', `${2 + taps * 0.6}px`);
  box.style.setProperty('--hue', `${(taps * 47) % 360}deg`);
  // 응원 글자가 아무 데서나 튀어나왔다 사라짐
  const word = document.createElement('span');
  word.className = 'wa-word';
  word.textContent = left > 0 && left <= 5 ? t('alarm.tapLeft', { n: left }) : pick(t('alarm.cheer'));
  word.style.cssText = `left:${8 + Math.random() * 70}%;top:${12 + Math.random() * 60}%;--r:${Math.round(Math.random() * 40 - 20)}deg;--c:${['#D7FF3D', '#FFD400', '#FF6FB5', '#7EC8FF', '#FFFFFF'][taps % 5]}`;
  $('waFx').appendChild(word);
  setTimeout(() => word.remove(), 900);
}
$('waOk').addEventListener('click', () => {
  if (taps >= TAPS) return;
  taps++;
  if (taps === 1) firstTap = Date.now();
  haptic(10 + taps);
  drawTaps(true);   // 콤보는 직전에 누른 시각(lastTap)과 비교하므로 그다음에 갱신
  lastTap = Date.now();
  if (taps < TAPS) return;
  // 다 누름: 숫자 대신 기상 완료가 쿵, 잠깐 보여 주고 끔
  $('waCount').textContent = '✓';
  $('wakeAlarm').classList.add('done');
  finishFx();
  $('waShout').textContent = t('alarm.tapDone');
  play('ui_treasure', 0.7);
  const fast = Date.now() - firstTap < 4000;
  setTimeout(() => { closeWakeAlarm(false); if (fast) setTimeout(() => celebrateHidden('hid_alarm_fast'), 500); }, 1800);
});
$('waSnooze').addEventListener('click', () => {
  const s = state.snooze.day === dayKey() ? state.snooze : (state.snooze = { day: dayKey(), n: 0 });
  s.n++;
  commit();
  closeWakeAlarm(true);
  if (s.n >= 3) setTimeout(() => celebrateHidden('hid_snooze3'), 600);
});
$('wakeAlarm').addEventListener('cancel', e => e.preventDefault());   // 뒤로가기로는 안 꺼짐
window.bgbbOnWake = () => { if (native?.wakeRinging?.() ?? true) showWakeAlarm(); };
const checkWake = () => { if (native?.wakeRinging?.() && !$('wakeAlarm').open) showWakeAlarm(); };
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

function renderTips() {
  const box = $('tips');
  if (!native) { box.innerHTML = `<p class="muted">${t('support.unavailable')}</p>`; return; }
  if (!tipPrices) { box.innerHTML = `<p class="muted">${t('support.loading')}</p>`; return; }
  const available = TIPS.filter(tip => tipPrices[tip.id]);
  if (!available.length) { box.innerHTML = `<p class="muted">${t('support.unavailable')}</p>`; return; }
  box.innerHTML = available.map(tip => {
    const done = state.tips.includes(tip.id);
    return `<button class="tip" data-id="${tip.id}" type="button" ${done ? 'disabled' : ''}>
      <img src="${tip.img}" alt=""><span class="name">${L(tip.name)}</span><span class="price">${done ? t('support.done') : esc(tipPrices[tip.id])}</span></button>`;
  }).join('');
}

$('openSupport').addEventListener('click', () => {
  $('supportSheet').showModal();
  renderTips();
  native?.loadTips(JSON.stringify([...TIPS, ...COIN_PACKS].map(x => x.id)));
});
$('tips').addEventListener('click', e => {
  const b = e.target.closest('.tip');
  if (b && !b.disabled) native?.buyTip(b.dataset.id);
});

// 네이티브(BillingClient)가 부르는 함수들
window.bgbbOnTipPrices = json => {
  try { tipPrices = JSON.parse(json); } catch (e) { tipPrices = {}; }
  renderTips();
  if (screen === 'shop') renderShop();
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

// 시트: 바깥(배경) 누르거나 [data-close] 누르면 닫기
document.querySelectorAll('dialog').forEach(d => {
  d.addEventListener('click', e => {
    if (e.target === d || e.target.closest('[data-close]')) d.close();
  });
});
// ---------------------------------------------------------- 사용설명 (옆으로 넘기는 10장)
// 첫 사용자 안내 (앱 처음 켤 때 · 큰 업데이트 뒤 한 번 · 설정 → 사용설명 다시 보기 = 처음부터). 쪽마다 그림 또는 실제 화면을 줄인 모형.
// 보이는 쪽에 .on 이 붙으면 그 쪽 애니메이션이 처음부터 다시 돈다. must: 진짜 중요한 쪽 (반짝이는 '중요!' 상자)
const GUIDE = [
  { id: 'hello', face: ['hamster_shameless', 'tit_whistle', 'cat_blank'] },
  { id: 'rules', rules: true, must: true },
  { id: 'titles', mock: 'titles' },
  { id: 'home', mock: 'home' },
  { id: 'trap', mock: 'trap' },
  { id: 'quiet', mock: 'quiet', must: true },
  { id: 'alarm', mock: 'alarm' },
  { id: 'daily', mock: 'daily' },
  { id: 'style', mock: 'style' },
  { id: 'perm', face: ['hamster_eng', 'cat_eng'], perm: true }   // 마지막 쪽: 권한 두 개 (없으면 방구가 밀려서 참음만 나옴)
];
/** 진짜 중요한 안내 상자: 반짝 · 빛 줄기 · 빨간 도장 */
const mustBox = html => `<p class="rules-important must"><i class="sp s1">✦</i><i class="sp s2">✦</i><i class="sp s3">✦</i>${html}</p>`;
/** 안내 쪽 그림: 실제 화면 조각을 줄인 모형 (누를 수 없음) */
function guideMock(kind) {
  if (kind === 'titles') {
    const x = titleById('meeting_loud');
    return `<div class="gm gm-titles"><img src="${face('cat', 'burst', true)}" alt=""><div class="gm-card"><span class="gm-chip">${esc(L(RARITY.legend.name))}</span><b>${esc(L(x.name))}</b><small>${coinify('🪙')} +43 · ${esc(t('home.dexCount', { n: 1, all: TITLES.length }))}</small></div></div>`;
  }
  if (kind === 'home') {
    return `<div class="gm gm-home"><div class="gm-top"><span class="mute">🔊 9/15</span></div>
      <img class="gm-hero" src="${face('hamster', 'blank')}" alt="">
      <div class="row3"><span class="btn primary gm-b1">${esc(t('home.cushion'))}</span><span class="btn gm-b2">${esc(t('home.gacha', { n: 1 }))}</span><span class="btn gm-freeze gm-b3">${esc(t('home.freeze'))}</span></div></div>`;
  }
  if (kind === 'trap') {
    return `<div class="gm gm-trap"><div class="gt-stage">
      <img class="gt-cushion" src="assets/skin/prop/prop_whoopee.webp" alt="">
      <span class="gt-phone"><i>5</i></span><span class="gt-hand">🫳</span><span class="gt-boom">${esc(t('guide.trapBoom'))}</span></div>
      <ol class="gt-steps">${[1, 2, 3].map(n => `<li><b>${n}</b><span>${t(`guide.trap${n}`)}</span></li>`).join('')}</ol></div>`;
  }
  if (kind === 'quiet') {
    return `<div class="gm gm-quiet">${mustBox(t('guide.quietMust'))}
      <div class="gq-row"><div class="gm-feat gq-card"><div class="gm-feat-head"><span class="gm-ico">🫣</span><b>${esc(t('settings.rest'))}</b><span class="gm-switch on"></span></div>
        <span class="gm-clock">14:00 ~ 15:00</span><span class="gm-cap">${esc(t('guide.timeRest'))}</span></div>
      <div class="gm-feat gq-card"><span class="btn gm-freeze gq-btn">${esc(t('home.freeze'))}</span><span class="gm-cap">${t('guide.quietFreeze')}</span></div></div></div>`;
  }
  if (kind === 'alarm') {
    const days = t('wake.days').map((d, i) => `<span class="wday ${i > 0 && i < 6 ? 'on' : ''} ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}">${d}</span>`).join('');
    const fly = ['assets/shop/coin.webp', 'assets/skin/fx/fx_sparkle.webp', 'assets/skin/prop/prop_megaphone.webp', 'assets/skin/fx/fx_hearts.webp', 'assets/shop/coin.webp']
      .map((src, i) => `<img class="ga-fly f${i}" src="${src}" alt="">`).join('');
    return `<div class="gm gm-alarm"><div class="ga-card">${fly}<span class="ga-ring r1"></span><span class="ga-ring r2"></span>
      <span class="ga-clock">⏰ 07:30</span><div class="wake-days">${days}</div>
      <div class="gm-tap ga-tap"><span>${t('alarm.tap')}</span><b>20</b></div></div></div>`;
  }
  if (kind === 'daily') {
    const bars = [3, 1, 4, 2, 5, 1, 2].map((n, i) => `<span class="rp-day ${i === 4 ? 'best' : ''}"><i style="height:${n * 20}%;--d:${i * 0.07}s"></i></span>`).join('');
    return `<div class="gm gm-daily"><div class="mission done"><div class="m-text"><b>${esc(L(MISSION_SAMPLE))}</b><span class="m-bar"><i style="width:100%"></i></span><small>1/1</small></div><span class="m-claim">${coinify('🪙')} 30</span></div>
      <div class="gm-report"><b>${esc(t('report.title'))}</b><div class="rp-bars">${bars}</div></div></div>`;
  }
  if (kind === 'style') {
    const pv = ['sound_xmas', 'bg_space', 'prop_trophy', 'sound_drum', 'prop_megaphone', 'sound_halloween', 'prop_medal', 'bg_office'].map(id => itemById(id)).filter(Boolean).slice(0, 8)
      .map((x, i) => `<span class="gm-item" style="--d:${i * 0.06}s">${itemPreview(x)}</span>`).join('');
    return `<div class="gm gm-style"><div class="gm-items">${pv}</div></div>`;
  }
  return '';
}
const MISSION_SAMPLE = { ko: '점심시간(12~13시)에 터지기', en: 'Go off at lunch (12–1pm)' };
/** 온보딩 마지막 쪽: 알림 · 알람 및 리마인더 허용 버튼 (허용하면 ✓) */
function permButtons() {
  const notif = !native || native.notificationsAllowed?.();
  const exact = !native || exactOk();
  return `<div class="perm">
    <button class="perm-btn ${exact ? 'ok' : ''}" id="permExact" type="button"><b>${exact ? '✓' : '1'}</b><span>${t('perm.exact')}<small>${t('perm.exactWhy')}</small></span></button>
    <button class="perm-btn ${notif ? 'ok' : ''}" id="permNotif" type="button"><b>${notif ? '✓' : '2'}</b><span>${t('perm.notif')}<small>${t('perm.notifWhy')}</small></span></button>
  </div>`;
}
function refreshPerm() {
  const box = document.querySelector('.guide-page .perm');
  if (box) box.outerHTML = permButtons();
}
$('guidePages').addEventListener('click', e => {
  if (e.target.closest('#permExact')) native?.openExactSettings?.();
  if (e.target.closest('#permNotif') && native && !native.requestNotifications()) native.openAppSettings?.();
  setTimeout(refreshPerm, 600);
});
const permsMissing = () => !!native && (!native.notificationsAllowed?.() || !exactOk());
/** 안내를 마치거나 벗어날 때: 빠진 권한을 실제로 요청 (알림 창 먼저 → 돌아오면 알람 및 리마인더 설정) */
let permAfterResume = false;
function askPerms() {
  if (!permsMissing()) return;
  if (!native.notificationsAllowed?.() && native.requestNotifications?.()) { permAfterResume = !exactOk(); return; }
  if (!exactOk()) native.openExactSettings?.();
}
/** 안내 본문: 한 줄씩 끊어서 (줄줄이 이어 붙지 않게) */
const guideLines = text => (text ? `<div class="g-lines">${text.split('\n').map((l, i) => `<span style="--d:${0.25 + i * 0.09}s">${l}</span>`).join('')}</div>` : '');
function openGuide() {
  $('guidePages').innerHTML = GUIDE.map(g => `<section class="guide-page gp-${g.id} ${g.must ? 'gp-must' : ''}">
    ${g.face ? `<div class="guide-art">${g.face.map((f, i) => `<img src="assets/faces/${f}.webp" alt="" style="--d:${i * 0.12}s">`).join('')}</div>` : ''}
    ${g.mock ? `<div class="guide-mock" aria-hidden="true">${guideMock(g.mock)}</div>` : ''}
    <h3>${t(`guide.${g.id}t`)}</h3>${g.rules ? soundRules().replace('<p class="rules-important">', mustBox('').replace('</p>', '')) : ''}${g.perm ? permButtons() : ''}${guideLines(t(`guide.${g.id}b`))}</section>`).join('');
  $('guideDots').innerHTML = GUIDE.map(() => '<i></i>').join('');
  $('guidePages').scrollLeft = 0;
  guidePage = -1;
  guideAt(0);
  if (!$('guide').open) $('guide').showModal();
}
let guidePage = 0;
const GUIDE_V = 3;   // 안내 내용이 크게 바뀌면 올림 → 이미 쓰던 사람에게도 한 번 더
function guideAt(i) {
  if (i === guidePage) return;
  guidePage = i;
  [...$('guideDots').children].forEach((d, k) => d.classList.toggle('on', k === i));
  [...$('guidePages').children].forEach((p, k) => p.classList.toggle('on', k === i));
  const last = i === GUIDE.length - 1;
  $('guideNext').textContent = t(last ? 'guide.go' : 'guide.next');
  $('guideSkip').style.visibility = last ? 'hidden' : '';
  if (last) refreshPerm();
}
$('guidePages').addEventListener('scroll', () => {
  const w = $('guidePages').clientWidth;
  if (w) guideAt(Math.round($('guidePages').scrollLeft / w));
}, { passive: true });
const guideTo = i => $('guidePages').scrollTo({ left: i * $('guidePages').clientWidth, behavior: 'smooth' });
$('guideNext').addEventListener('click', () => {
  if (guidePage >= GUIDE.length - 1) { $('guide').close(); return; }
  guideTo(guidePage + 1);
});
// 건너뛰기: 권한이 빠져 있으면 마지막 쪽(권한)으로, 다 있으면 바로 닫기
$('guideSkip').addEventListener('click', () => (permsMissing() ? guideTo(GUIDE.length - 1) : $('guide').close()));
$('guide').addEventListener('close', () => {
  askPerms();   // ㄱㄱ · 뒤로가기 어느 쪽이든 빠진 권한은 실제 요청 화면으로
  if ((state.guideV || 0) < GUIDE_V) { state.guideV = GUIDE_V; state.rulesSeen = true; commit(); }
  if (state.onboarded) return;
  state.onboarded = true;
  state.rulesSeen = true;   // 2쪽에서 봤음
  state.seenVersion = APP_VERSION;   // 처음 깐 사람은 패치노트 안 띄움
  commit();
});
$('openGuide').addEventListener('click', () => { $('settingsSheet').close(); openGuide(); });

// ---------------------------------------------------------- 패치노트
function showNotes(since = null) {
  const list = CHANGELOG.filter(x => !since || older(since, x.v)).slice(0, since ? 3 : CHANGELOG.length);
  $('notesList').innerHTML = list.map(x => `<section><h4>v${esc(x.v)} <small>${esc(x.date)}</small></h4><ul>${L({ ko: x.ko, en: x.en }).map(l => `<li>${esc(l)}</li>`).join('')}</ul></section>`).join('');
  $('notesSheet').showModal();
}
// ---------------------------------------------------------- 개인정보처리방침 · 출처 (웹사이트 없이 앱 안에서)
function showLegal(kind) {
  $('legalTitle').textContent = t(kind === 'privacy' ? 'settings.privacy' : 'settings.licenses');
  $('legalBody').innerHTML = L(LEGAL[kind]) + (kind === 'privacy' ? `<p class="muted small">${esc(t('legal.updated', { d: UPDATED }))}</p>` : '');
  $('settingsSheet').close();
  $('legalSheet').showModal();
}
$('openPrivacy').addEventListener('click', () => showLegal('privacy'));
$('openCredits').addEventListener('click', () => showLegal('credits'));
$('openNotes').addEventListener('click', () => { $('settingsSheet').close(); showNotes(); });

// ---------------------------------------------------------- 새 버전 (Google Play 인앱 업데이트, Play 에서 깐 앱만)
let updateMode = 'get';
let updBusy = false;   // Play 확인 창이 떠 있거나 받는 중: '새 버전 있음' 을 다시 띄우지 않는다
function updateSheet(mode) {
  updateMode = mode;
  const ready = mode === 'ready';
  $('updTitle').textContent = t(ready ? 'update.readyTitle' : 'update.title');
  $('updBody').textContent = t(ready ? 'update.readyBody' : 'update.body');
  $('updGo').textContent = t(ready ? 'update.restart' : 'update.go');
  if (!$('updateSheet').open) $('updateSheet').showModal();
}
/** 받는 중 띠 (화면 위쪽, 받는 동안 계속). percent -1 = 아직 크기 모름 */
function updatePill(percent) {
  const el = $('updPill');
  if (percent == null) { el.classList.remove('show'); try { el.hidePopover(); } catch {} return; }
  const known = percent >= 0;
  $('updPillText').textContent = known ? t('update.progress', { p: percent }) : t('update.preparing');
  el.classList.toggle('busy', !known);
  $('updPillBar').style.width = known ? `${percent}%` : '';
  try { el.showPopover(); } catch {}
  el.classList.add('show');
}
window.bgbbOnUpdate = code => {
  if (updBusy) return;
  const snooze = state.updateSnooze || {};
  if (snooze.until && Date.now() < snooze.until) return;   // '나중에' 누른 뒤 하루는 조용히
  updateSheet('get');
};
window.bgbbOnUpdateProgress = p => {
  updBusy = true;
  if ($('updateSheet').open && updateMode === 'get') $('updateSheet').close();
  updatePill(Number(p));
};
window.bgbbOnUpdateIdle = () => { updBusy = false; updatePill(null); };
window.bgbbOnUpdateReady = () => { updBusy = false; updatePill(null); updateSheet('ready'); };
$('updGo').addEventListener('click', () => {
  $('updateSheet').close();
  if (updateMode === 'ready') native?.completeUpdate?.();
  else { updBusy = true; updatePill(-1); native?.startUpdate?.(); }
});
$('updLater').addEventListener('click', () => {
  $('updateSheet').close();
  if (updateMode === 'get') { state.updateSnooze = { code: 'any', until: Date.now() + 86400e3 }; commit(); }
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
  // 안내 끝에 알림 허용 창을 띄웠으면, 닫히고 돌아온 지금 이어서 '알람 및 리마인더' 설정으로
  if (permAfterResume) { permAfterResume = false; if (native && !exactOk()) setTimeout(() => native.openExactSettings?.(), 300); }
  drainNative();
  checkWakeSettings();
  render();
  checkWake();
  checkNightOwl();
  if (!document.querySelector('dialog[open]') && !giveGifts() && !maybeSeasonNotice()) maybeReport();   // 시즌 선물 · 시즌 공지 · 일요일 밤 결산 알림을 눌러 들어온 경우
};

document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  if ($('guide').open) refreshPerm();   // 폰 설정에서 허용하고 돌아왔을 때 ✓
  checkWakeSettings();
  checkWake();
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
native?.loadTips?.(JSON.stringify([...TIPS, ...COIN_PACKS].map(x => x.id)));   // 다른 기기에서 응원한 기록 복원
render();
if (!state.onboarded) openGuide();
else if ((state.guideV || 0) < GUIDE_V) openGuide();   // 이미 쓰던 사람: 큰 업데이트 뒤 안내를 한 번 (소리 규칙 중요! 포함)
else if (older(state.seenVersion, APP_VERSION)) {   // 업데이트하고 처음 연 날: 그 사이 바뀐 것만
  showNotes(state.seenVersion || CHANGELOG[1]?.v);
  state.seenVersion = APP_VERSION;
  commit();
} else if (!giveGifts() && !maybeSeasonNotice()) maybeReport();
native?.checkUpdate?.();
checkWakeSettings();
checkWake();   // 알람이 앱을 연 경우
checkNightOwl();
addEventListener('pagehide', flush);
