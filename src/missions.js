// 오늘의 미션: 날마다 세 개 (날짜로 정해져서 앱을 다시 열어도 같음). 깨면 뿡코인.
// 진행도는 그날 기록(day)과 그날 센 횟수(counts: 캐릭터 누르기 · 짤 뽑기 · 공유 · 함정)로만 계산하는 순수 함수 (tests/missions.test.mjs).
//   day = { loud, soft, hold, chars: [], hours: [], fresh }   (fresh = 그날 새로 받은 칭호 수)

const hoursIn = (d, from, to) => (d.hours || []).filter(h => h >= from && h < to).length;

export const MISSIONS = [
  { id: 'loud1', goal: 1, coins: 20, ko: '오늘 냄 1번', en: 'Toot out loud once', of: d => d.loud },
  { id: 'soft1', goal: 1, coins: 20, ko: '오늘 진동 1번', en: 'Get one buzz', of: d => d.soft },
  { id: 'hold1', goal: 1, coins: 15, ko: '오늘 참음 1번', en: 'Hold one in', of: d => d.hold },
  { id: 'total3', goal: 3, coins: 30, ko: '오늘 3번 터지기', en: 'Go off 3 times today', of: d => d.loud + d.soft + d.hold },
  { id: 'all3', goal: 3, coins: 40, ko: '셋 다 한 번씩 터지기', en: 'All three pals go off', of: d => (d.chars || []).length },
  { id: 'trinity', goal: 3, coins: 50, ko: '냄 · 진동 · 참음 다 하기', en: 'Loud, buzz and held in one day', of: d => (d.loud > 0) + (d.soft > 0) + (d.hold > 0) },
  { id: 'morning', goal: 1, coins: 25, ko: '오전 9시 전에 터지기', en: 'Go off before 9am', of: d => hoursIn(d, 0, 9) },
  { id: 'lunch', goal: 1, coins: 30, ko: '점심시간(12~13시)에 터지기', en: 'Go off at lunch (12–1pm)', of: d => hoursIn(d, 12, 13) },
  { id: 'night', goal: 1, coins: 25, ko: '밤 9시 넘어서 터지기', en: 'Go off after 9pm', of: d => hoursIn(d, 21, 24) },
  { id: 'fresh1', goal: 1, coins: 40, ko: '새 칭호 1개 받기', en: 'Earn a new title', of: d => d.fresh || 0 },
  { id: 'gacha3', goal: 3, coins: 15, ko: '짤 뽑기 3번', en: 'Draw 3 memes', of: (d, n) => n.gacha || 0 },
  { id: 'tap30', goal: 30, coins: 10, ko: '캐릭터 30번 누르기', en: 'Poke your pal 30 times', of: (d, n) => n.tap || 0 },
  { id: 'share1', goal: 1, coins: 20, ko: '짤 1번 자랑하기', en: 'Share a meme', of: (d, n) => n.share || 0 },
  { id: 'trap1', goal: 1, coins: 30, ko: '함정에 1명 걸리게 하기', en: 'Catch someone with the trap', of: (d, n) => n.trap || 0 }
];

/** 그날 미션 세 개: 날짜 문자열로 섞어서 겹치지 않게 (같은 날은 늘 같은 세 개) */
export function pickMissions(dayKey) {
  let h = 2166136261;
  for (const ch of dayKey) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const ids = MISSIONS.map(m => m.id);
  const out = [];
  while (out.length < 3) {
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    const id = ids[h % ids.length];
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

/** 진행도 [{ id, n, goal, done, claimed, coins, name }] */
export function missionProgress(ids, d, counts = {}, claimed = []) {
  return ids.map(id => {
    const m = MISSIONS.find(x => x.id === id);
    const n = Math.min(m.goal, m.of(d, counts));
    return { id, n, goal: m.goal, done: n >= m.goal, claimed: claimed.includes(id), coins: m.coins, name: { ko: m.ko, en: m.en } };
  });
}
