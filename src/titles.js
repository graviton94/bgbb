// 칭호 45개 (잭팟 5 + 상황 칭호 40). 터질 때마다 그 순간의 상황(시간·요일·폰 상태·누가·오늘 몇 번째…)에 맞는 후보 중
// 하나를 고른다. 순수 함수만 두어 tests/titles.test.mjs 에서 검사한다.
//
// c = { mode: 'loud'|'soft'|'hold', char, hour, wd(0=일요일), nth(오늘 몇 번째), today{loud,soft,hold},
//       prev(오늘 바로 전 결과 또는 null), charsToday(오늘 나온 친구 수), streak, total }

export const RARITY = {
  jackpot: { name: { ko: '잭팟', en: 'Jackpot' }, weight: 0, color: '#FFD400' },
  legend: { name: { ko: '레전드', en: 'Legend' }, weight: 6, color: '#D7FF3D' },
  rare: { name: { ko: '레어', en: 'Rare' }, weight: 3, color: '#FFB3D9' },
  normal: { name: { ko: '노멀', en: 'Normal' }, weight: 1, color: '#FFFFFF' }
};

const weekday = c => c.wd >= 1 && c.wd <= 5;
const meeting = c => weekday(c) && (c.hour === 10 || c.hour === 14 || c.hour === 15);
const T = (id, rarity, ko, en, hint, how, test) => ({ id, rarity, name: { ko, en }, hint, how, test });

export const TITLES = [
  // ---- 잭팟: 상황과 상관없이 1% 확률 (JACKPOT)
  T('jp_heritage', 'jackpot', '국가 지정 무형문화재', 'National Intangible Heritage',
    { ko: '운', en: 'Luck' }, { ko: '아무 때나 1% 확률', en: '1% chance, any time' }, () => false),
  T('jp_lotto', 'jackpot', '로또보다 희귀한 뿡', 'Rarer Than the Lottery',
    { ko: '운', en: 'Luck' }, { ko: '아무 때나 1% 확률', en: '1% chance, any time' }, () => false),
  T('jp_heir', 'jackpot', '방구 재벌 3세', 'Toot Tycoon Heir',
    { ko: '운', en: 'Luck' }, { ko: '아무 때나 1% 확률', en: '1% chance, any time' }, () => false),
  T('jp_the', 'jackpot', '전설의 그 방구', 'THE Toot',
    { ko: '운', en: 'Luck' }, { ko: '아무 때나 1% 확률', en: '1% chance, any time' }, () => false),
  T('jp_rain', 'jackpot', '돈 뿌리는 엉덩이', 'Make It Rain',
    { ko: '운', en: 'Luck' }, { ko: '아무 때나 1% 확률', en: '1% chance, any time' }, () => false),

  // ---- 레전드
  T('meeting_loud', 'legend', '회의실 테러범', 'Meeting Room Menace',
    { ko: '다들 모였을 때', en: 'When everyone is gathered' },
    { ko: '평일 회의 시간대(10시·14~15시)에 소리 모드', en: 'Sound mode during weekday meeting hours (10am, 2–3pm)' },
    c => c.mode === 'loud' && meeting(c)),
  T('dawn_loud', 'legend', '새벽 3시의 확성기', '3AM Megaphone',
    { ko: '모두가 잠든 시간', en: 'While everyone sleeps' },
    { ko: '0~5시에 소리 모드', en: 'Sound mode between midnight and 5am' },
    c => c.mode === 'loud' && c.hour < 6),
  T('hold5', 'legend', '인내의 화신', 'Avatar of Patience',
    { ko: '하루 종일 참기', en: 'Hold it all day' },
    { ko: '하루에 다섯 번 참기', en: 'Hold it in 5 times in a day' },
    c => c.mode === 'hold' && c.today.hold >= 5),
  T('trinity', 'legend', '삼위일체', 'Holy Trinity',
    { ko: '하루에 세 가지 다', en: 'All three in one day' },
    { ko: '하루에 소리·진동·참기 모두 한 번 이상', en: 'Loud, shy and held all in one day' },
    c => c.today.loud > 0 && c.today.soft > 0 && c.today.hold > 0),
  T('streak30', 'legend', '한 달 개근', 'Perfect Month',
    { ko: '꾸준함의 끝', en: 'The end of consistency' },
    { ko: '30일 연속', en: '30 days in a row' },
    c => c.streak >= 30),
  T('total100', 'legend', '뿡 100회 클럽', 'The 100 Club',
    { ko: '세 자리 수', en: 'Three digits' },
    { ko: '누적 100번', en: '100 in total' },
    c => c.total >= 100),
  T('midnight', 'legend', '자정의 종소리', 'Midnight Bell',
    { ko: '날짜가 바뀌는 순간', en: 'As the date changes' },
    { ko: '자정(0시대)에 소리 모드', en: 'Sound mode in the midnight hour' },
    c => c.mode === 'loud' && c.hour === 0),

  // ---- 레어
  T('meeting_soft', 'rare', '회의 중 진동 한 방', 'Buzz in the Meeting',
    { ko: '다들 모였는데 살짝', en: 'Everyone is there, just a little' },
    { ko: '평일 회의 시간대에 진동', en: 'Vibrate during weekday meeting hours' },
    c => c.mode === 'soft' && meeting(c)),
  T('meeting_hold', 'rare', '회의실의 침묵', 'Silence in the Meeting',
    { ko: '다들 모였는데 꾹', en: 'Everyone is there, held in' },
    { ko: '평일 회의 시간대에 참기', en: 'Held during weekday meeting hours' },
    c => c.mode === 'hold' && meeting(c)),
  T('dawn_quiet', 'rare', '새벽의 암살자', 'Dawn Assassin',
    { ko: '새벽, 소리 없이', en: 'At dawn, without a sound' },
    { ko: '0~5시에 진동이나 참기', en: 'Shy or held between midnight and 5am' },
    c => c.mode !== 'loud' && c.hour < 6),
  T('monday', 'rare', '월요병 그 자체', 'Monday Blues Incarnate',
    { ko: '월요일 아침', en: 'Monday morning' },
    { ko: '월요일 6~11시', en: 'Monday 6–11am' },
    c => c.wd === 1 && c.hour >= 6 && c.hour < 12),
  T('friday', 'rare', '불금 축포', 'Friday Night Salute',
    { ko: '금요일 밤', en: 'Friday night' },
    { ko: '금요일 18시 이후 소리 모드', en: 'Sound mode on Friday after 6pm' },
    c => c.wd === 5 && c.hour >= 18 && c.mode === 'loud'),
  T('weekend_nap', 'rare', '주말 낮잠 방해꾼', 'Weekend Nap Wrecker',
    { ko: '주말 낮', en: 'A weekend afternoon' },
    { ko: '토·일 12~17시', en: 'Weekend, noon–5pm' },
    c => (c.wd === 0 || c.wd === 6) && c.hour >= 12 && c.hour < 18),
  T('double_loud', 'rare', '연발 사수', 'Double Tap',
    { ko: '한 번으로는 부족해', en: 'Once is not enough' },
    { ko: '소리 모드로 두 번 연속', en: 'Sound mode twice in a row' },
    c => c.mode === 'loud' && c.prev === 'loud'),
  T('broke', 'rare', '참다가 터짐', 'Held, Then Blew',
    { ko: '참는 것도 한계가 있다', en: 'Patience has limits' },
    { ko: '참은 바로 다음에 소리 모드', en: 'Sound mode right after holding it' },
    c => c.mode === 'loud' && c.prev === 'hold'),
  T('soft3', 'rare', '소심 3연타', 'Shy Triple',
    { ko: '살짝, 살짝, 살짝', en: 'A little, a little, a little' },
    { ko: '하루에 진동 세 번', en: 'Vibrate 3 times in a day' },
    c => c.mode === 'soft' && c.today.soft >= 3),
  T('loud5', 'rare', '확성기 장인', 'Megaphone Master',
    { ko: '오늘 좀 시끄러움', en: 'A loud day' },
    { ko: '하루에 소리 모드 다섯 번', en: 'Sound mode 5 times in a day' },
    c => c.mode === 'loud' && c.today.loud >= 5),
  T('hold3', 'rare', '3연속 참음', 'Held Three',
    { ko: '아직은 괜찮음', en: 'Still fine. For now.' },
    { ko: '하루에 세 번 참기', en: 'Hold it in 3 times in a day' },
    c => c.mode === 'hold' && c.today.hold >= 3),
  T('streak7', 'rare', '일주일 개근', 'Perfect Week',
    { ko: '일주일 내내', en: 'All week long' },
    { ko: '7일 연속', en: '7 days in a row' },
    c => c.streak >= 7),
  T('total50', 'rare', '뿡 50회 돌파', '50 and Counting',
    { ko: '반백', en: 'Half a hundred' },
    { ko: '누적 50번', en: '50 in total' },
    c => c.total >= 50),
  T('lunch_loud', 'rare', '식후 축포', 'After-Lunch Salute',
    { ko: '밥 먹고 나서', en: 'Right after lunch' },
    { ko: '12~13시에 소리 모드', en: 'Sound mode at 12–1pm' },
    c => c.mode === 'loud' && (c.hour === 12 || c.hour === 13)),
  T('commute', 'rare', '출근길 기습', 'Commute Ambush',
    { ko: '지하철, 버스, 엘리베이터', en: 'Subway, bus, elevator' },
    { ko: '평일 7~9시에 소리 모드', en: 'Sound mode on weekdays 7–9am' },
    c => c.mode === 'loud' && weekday(c) && c.hour >= 7 && c.hour < 10),
  T('cat_hold', 'rare', '냥이도 참았다', 'Even the Cat Held It',
    { ko: '귀찮아도 참는다', en: 'Too lazy, but held it' },
    { ko: '냥이 차례에 참기', en: 'The cat’s turn, held in' },
    c => c.char === 'cat' && c.mode === 'hold'),
  T('ensemble', 'rare', '단체 공연', 'Full Ensemble',
    { ko: '셋 다 한 번씩', en: 'All three, once each' },
    { ko: '하루에 세 친구 모두 등장', en: 'All three friends in one day' },
    c => c.charsToday >= 3),
  T('overeat', 'rare', '오늘 과식함', 'Overate Today',
    { ko: '오늘 많이 먹었나 봄', en: 'Must have eaten a lot' },
    { ko: '하루에 다섯 번째', en: 'The fifth one today' },
    c => c.nth >= 5),

  // ---- 노멀
  T('loud_basic', 'normal', '어 방금 누구야', 'Wait, Who Was That',
    { ko: '소리 모드', en: 'Sound mode' },
    { ko: '소리 모드에서 한 번', en: 'Once on sound mode' },
    c => c.mode === 'loud'),
  T('soft_basic', 'normal', '주머니만 앎', 'Only the Pocket Knows',
    { ko: '진동 모드', en: 'Vibrate mode' },
    { ko: '진동 모드에서 한 번', en: 'Once on vibrate' },
    c => c.mode === 'soft'),
  T('hold_basic', 'normal', '괄약근 1단', 'Clench Level 1',
    { ko: '무음 모드', en: 'Silent mode' },
    { ko: '무음·방해금지에서 한 번', en: 'Once on silent or Do Not Disturb' },
    c => c.mode === 'hold'),
  T('morning', 'normal', '모닝커피의 배신', 'Betrayed by Morning Coffee',
    { ko: '아침', en: 'Morning' },
    { ko: '6~9시', en: '6–9am' },
    c => c.hour >= 6 && c.hour < 10),
  T('lunch', 'normal', '제육의 역습', 'Revenge of the Pork',
    { ko: '점심', en: 'Lunchtime' },
    { ko: '11~13시', en: '11am–1pm' },
    c => c.hour >= 11 && c.hour < 14),
  T('afternoon', 'normal', '오후 3시의 정적 파괴', 'Broke the 3PM Silence',
    { ko: '오후', en: 'Afternoon' },
    { ko: '14~17시', en: '2–5pm' },
    c => c.hour >= 14 && c.hour < 18),
  T('evening', 'normal', '퇴근길 지하철 빌런', 'Rush Hour Villain',
    { ko: '퇴근 시간', en: 'Going home' },
    { ko: '18~19시', en: '6–7pm' },
    c => c.hour >= 18 && c.hour < 20),
  T('night', 'normal', '치킨이 문제였다', 'It Was the Fried Chicken',
    { ko: '밤', en: 'Night' },
    { ko: '20~23시', en: '8–11pm' },
    c => c.hour >= 20),
  T('first_today', 'normal', '오늘 개시', 'Open for Business',
    { ko: '오늘 처음', en: 'First today' },
    { ko: '그날 첫 번째', en: 'The first one of the day' },
    c => c.nth === 1),
  T('streak3', 'normal', '사흘 연속 범행', 'Three-Day Crime Spree',
    { ko: '사흘째', en: 'Third day' },
    { ko: '3일 연속', en: '3 days in a row' },
    c => c.streak >= 3),
  T('hamster', 'normal', '해바라기씨 과다 섭취', 'Too Many Sunflower Seeds',
    { ko: '햄찌 차례', en: 'Hamster’s turn' },
    { ko: '햄찌가 낸 소리', en: 'The hamster went' },
    c => c.char === 'hamster'),
  T('tit', 'normal', '새가 그랬다고 함', 'Blamed It on the Bird',
    { ko: '오목이 차례', en: 'Birdie’s turn' },
    { ko: '오목이가 낸 소리', en: 'The bird went' },
    c => c.char === 'tit'),
  T('cat', 'normal', '고양이 핑계 대기', 'Blamed It on the Cat',
    { ko: '냥이 차례', en: 'Cat’s turn' },
    { ko: '냥이가 낸 소리', en: 'The cat went' },
    c => c.char === 'cat'),
  T('hamster_loud', 'normal', '볼주머니 아님 엉덩이임', 'Not the Cheek Pouch',
    { ko: '햄찌가 크게', en: 'Hamster, loudly' },
    { ko: '햄찌 차례에 소리 모드', en: 'Hamster on sound mode' },
    c => c.char === 'hamster' && c.mode === 'loud'),
  T('tit_soft', 'normal', '날갯짓으로 위장', 'Disguised as a Flutter',
    { ko: '오목이가 살짝', en: 'Birdie, softly' },
    { ko: '오목이 차례에 진동', en: 'Birdie on vibrate' },
    c => c.char === 'tit' && c.mode === 'soft')
];

export const titleById = id => TITLES.find(x => x.id === id);

const BASIC = { loud: 'loud_basic', soft: 'soft_basic', hold: 'hold_basic' };

/**
 * 상황 c 에 맞는 칭호 하나. owned = { id: … } (가진 칭호).
 * 1% 는 상황과 상관없이 잭팟 (아직 없는 것 먼저). 나머지는 맞는 후보 중 아직 없는 칭호를 75% 확률로 먼저 보고, 그 안에서 레전드 > 레어 > 노멀 가중치로 뽑는다.
 */
export const JACKPOT = 0.01;

export function pickTitle(c, owned = {}, random = Math.random) {
  if (random() < JACKPOT) {
    const jp = TITLES.filter(x => x.rarity === 'jackpot');
    const fresh = jp.filter(x => !owned[x.id]);
    const pool = fresh.length ? fresh : jp;
    return pool[Math.floor(random() * pool.length) % pool.length];
  }
  const cands = TITLES.filter(x => x.test(c));
  if (!cands.length) return titleById(BASIC[c.mode] || 'hold_basic');
  const fresh = cands.filter(x => !owned[x.id]);
  const pool = fresh.length && random() < 0.75 ? fresh : cands;
  const total = pool.reduce((n, x) => n + RARITY[x.rarity].weight, 0);
  let r = random() * total;
  for (const x of pool) {
    r -= RARITY[x.rarity].weight;
    if (r < 0) return x;
  }
  return pool[pool.length - 1];
}

/** 이벤트 시각과 그날까지의 기록으로 상황을 만든다 (오늘 기록 today 는 이번 것을 포함). */
export function contextOf({ t, char, mode }, { today, prev, charsToday, streak, total, nth }) {
  const d = new Date(t);
  return { mode, char, hour: d.getHours(), wd: d.getDay(), nth, today, prev, charsToday, streak, total };
}
