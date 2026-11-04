// 칭호 (잭팟 5 + 상황 · 기념 칭호 + 시즌 칭호 17 + 숨김 업적 10). 터질 때마다 그 순간의 상황(시간·요일·폰 상태·누가·오늘 몇 번째…)에 맞는 후보 중
// 하나를 고른다. 순수 함수만 두어 tests/titles.test.mjs 에서 검사한다.
//
// c = { mode: 'loud'|'soft'|'hold', char, hour, wd(0=일요일), nth(오늘 몇 번째), today{loud,soft,hold},
//       prev(오늘 바로 전 결과 또는 null), charsToday(오늘 나온 친구 수), streak, total,
//       month(1~12), day(1~31), ymd('2026-11-19'), min(0~59), ear(이어폰으로 냄), why(참음 이유) }

export const RARITY = {
  jackpot: { name: { ko: '잭팟', en: 'Jackpot' }, weight: 0, color: '#FFD400' },
  // weight: 같은 상황에 후보가 여럿이면 이 비율로 뽑는다 (희귀할수록 덜 나옴)
  legend: { name: { ko: '레전드', en: 'Legend' }, weight: 1, color: '#D7FF3D' },
  rare: { name: { ko: '레어', en: 'Rare' }, weight: 3, color: '#FFB3D9' },
  normal: { name: { ko: '노멀', en: 'Normal' }, weight: 12, color: '#FFFFFF' }
};

const weekday = c => c.wd >= 1 && c.wd <= 5;
const meeting = c => weekday(c) && (c.hour === 10 || c.hour === 14 || c.hour === 15);
const T = (id, rarity, ko, en, hint, how, test) => ({ id, rarity, name: { ko, en }, hint, how, test });
const on = (m, d) => c => c.month === m && c.day === d;

// 음력 · 시험 날짜는 해마다 다르다: 해마다 확인해서 더한다 (없는 해는 그 칭호가 안 나옴)
export const LUNAR = {
  seollal: ['2027-02-06', '2027-02-07', '2027-02-08', '2028-01-25', '2028-01-26', '2028-01-27'],
  chuseok: ['2026-09-24', '2026-09-25', '2026-09-26', '2027-09-14', '2027-09-15', '2027-09-16', '2028-10-02', '2028-10-03', '2028-10-04'],
  // 수능: 보통 11월 셋째 목요일 (교육부 발표로 고치기)
  suneung: ['2026-11-19', '2027-11-18', '2028-11-16']
};
/** 시즌 칭호: 1년에 그날만. 그날 첫 방에 아직 없으면 무조건 준다 (기념 칭호처럼), 가진 뒤엔 꽝 */
/** 숨김 업적: 방구가 아니라 앱 안 행동으로 받음 (pickTitle 후보에 안 들어감, 도감엔 '숨김') */
const H = (id, rarity, ko, en, hint, how) => ({ ...T(id, rarity, ko, en, hint, how, () => false), hidden: true });
const S = (id, ko, en, when, test) => ({ ...T(id, 'legend', ko, en, { ko: when.ko, en: when.en }, { ko: `${when.ko} 하루만`, en: `Only on ${when.en}` }, test), season: when });

export const TITLES = [
  // ---- 잭팟: 상황과 상관없이 0.5% 확률 (JACKPOT)
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
  T('last_call', 'legend', '마감 직전 확성기', 'Last Call Megaphone',
    { ko: '문 닫기 직전', en: 'Right before closing' },
    { ko: '23시대 소리 모드', en: 'Sound mode in the 11pm hour' },
    c => c.mode === 'loud' && c.hour === 23),
  T('hold5', 'legend', '인내의 화신', 'Avatar of Patience',
    { ko: '하루 종일 참기', en: 'Hold it all day' },
    { ko: '하루에 네 번 참기', en: 'Hold it in 4 times in a day' },
    c => c.mode === 'hold' && c.today.hold >= 4),
  T('trinity', 'legend', '삼위일체', 'Holy Trinity',
    { ko: '하루에 세 가지 다', en: 'All three in one day' },
    { ko: '하루에 소리·진동·참기 모두 한 번 이상', en: 'Loud, shy and held all in one day' },
    c => c.today.loud > 0 && c.today.soft > 0 && c.today.hold > 0),
  T('streak30', 'legend', '한 달 개근', 'Perfect Month',
    { ko: '꾸준함의 끝', en: 'The end of consistency' },
    { ko: '60일 연속', en: '60 days in a row' },
    c => c.streak >= 60),
  T('total100', 'legend', '뿡 100회 클럽', 'The 100 Club',
    { ko: '세 자리 수', en: 'Three digits' },
    { ko: '누적 300번', en: '300 in total' },
    c => c.total >= 300),
  T('first_bell', 'legend', '오늘의 첫 종소리', 'First Bell',
    { ko: '하루의 시작을 알림', en: 'Announcing the day' },
    { ko: '6시대 그날 첫 방이 소리 모드', en: 'The first one of the day, at 6am, on sound mode' },
    c => c.mode === 'loud' && c.hour === 6 && c.nth === 1),

  // ---- 레어
  T('meeting_soft', 'rare', '회의 중 진동 한 방', 'Buzz in the Meeting',
    { ko: '다들 모였는데 살짝', en: 'Everyone is there, just a little' },
    { ko: '평일 회의 시간대에 진동', en: 'Vibrate during weekday meeting hours' },
    c => c.mode === 'soft' && meeting(c)),
  T('meeting_hold', 'rare', '회의실의 침묵', 'Silence in the Meeting',
    { ko: '다들 모였는데 꾹', en: 'Everyone is there, held in' },
    { ko: '평일 회의 시간대에 참기', en: 'Held during weekday meeting hours' },
    c => c.mode === 'hold' && meeting(c)),
  T('night_quiet', 'rare', '밤의 암살자', 'Night Assassin',
    { ko: '밤, 소리 없이', en: 'At night, without a sound' },
    { ko: '22시 이후 진동이나 참기', en: 'Shy or held after 10pm' },
    c => c.mode !== 'loud' && c.hour >= 22),
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
    { ko: '하루에 소리 모드 네 번', en: 'Sound mode 4 times in a day' },
    c => c.mode === 'loud' && c.today.loud >= 4),
  T('hold3', 'rare', '3연속 참음', 'Held Three',
    { ko: '아직은 괜찮음', en: 'Still fine. For now.' },
    { ko: '하루에 세 번 참기', en: 'Hold it in 3 times in a day' },
    c => c.mode === 'hold' && c.today.hold >= 3),
  T('streak7', 'rare', '일주일 개근', 'Perfect Week',
    { ko: '일주일 내내', en: 'All week long' },
    { ko: '14일 연속', en: '14 days in a row' },
    c => c.streak >= 14),
  T('total50', 'rare', '뿡 50회 돌파', '50 and Counting',
    { ko: '반백', en: 'Half a hundred' },
    { ko: '누적 100번', en: '100 in total' },
    c => c.total >= 100),
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
    { ko: '하루에 네 번째', en: 'The fourth one today' },
    c => c.nth >= 4),

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
    { ko: '5일 연속', en: '5 days in a row' },
    c => c.streak >= 5),
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
    c => c.char === 'tit' && c.mode === 'soft'),

  // ---- 시즌 (레전드 등급, 1년에 그날만)
  S('ss_newyear', '새해 첫 뿡', 'First Toot of the Year', { ko: '1월 1일', en: 'Jan 1' }, on(1, 1)),
  S('ss_seollal', '떡국 먹고 한 살 더 뿡', 'One Year Older, One Toot Louder', { ko: '설날 연휴', en: 'Lunar New Year' }, c => LUNAR.seollal.includes(c.ymd)),
  S('ss_valentine', '초콜릿 녹이는 뿡', 'Chocolate-Melting Toot', { ko: '2월 14일', en: 'Feb 14' }, on(2, 14)),
  S('ss_aprilfool', '만우절 아님 진짜임', 'Not an April Fool', { ko: '4월 1일', en: 'Apr 1' }, on(4, 1)),
  S('ss_children', '어린이날 특별 공연', "Children's Day Special", { ko: '5월 5일', en: 'May 5' }, on(5, 5)),
  S('ss_chuseok', '송편 과다 섭취', 'Too Many Rice Cakes', { ko: '추석 연휴', en: 'Chuseok' }, c => LUNAR.chuseok.includes(c.ymd)),
  S('ss_halloween', '트릭 오어 뿡', 'Trick or Toot', { ko: '10월 31일', en: 'Oct 31' }, on(10, 31)),
  S('ss_pepero', '빼빼로 대신 뿡', 'Toot Instead of Pepero', { ko: '11월 11일', en: 'Nov 11' }, on(11, 11)),
  S('ss_suneung', '수능 대박 기원 뿡', 'Exam-Day Lucky Toot', { ko: '수능 날', en: 'Korean SAT day' }, c => LUNAR.suneung.includes(c.ymd)),
  S('ss_christmas', '산타도 놀란 뿡', 'Even Santa Flinched', { ko: '크리스마스 (24~25일)', en: 'Christmas (24–25)' }, c => c.month === 12 && (c.day === 24 || c.day === 25)),
  S('ss_yearend', '올해 마지막 뿡', 'Last Toot of the Year', { ko: '12월 31일', en: 'Dec 31' }, on(12, 31)),
  // ==================== v2.4 추가: 상황 칭호 ====================
  // ---- 레전드
  T('on_the_hour', 'legend', '정각 장인', 'On-the-Hour Artisan',
    { ko: '시계가 딱 맞을 때', en: 'When the clock lines up' }, { ko: '정각(00분)에 소리 모드', en: 'Sound mode exactly on the hour' },
    c => c.mode === 'loud' && c.min === 0),
  T('pi_time', 'legend', '원주율 방구', 'Pi O’Clock',
    { ko: '수학 시간', en: 'Math class' }, { ko: '3시 14분에 터짐', en: 'Goes off at 3:14' },
    c => (c.hour === 3 || c.hour === 15) && c.min === 14),
  T('lucky7', 'legend', '7시 7분 럭키 뿡', 'Lucky 7:07',
    { ko: '행운의 숫자', en: 'Lucky number' }, { ko: '7시 7분에 터짐', en: 'Goes off at 7:07' },
    c => (c.hour === 7 || c.hour === 19) && c.min === 7),
  T('midnight_last', 'legend', '막차 방구', 'Last Train Toot',
    { ko: '하루가 끝나기 직전', en: 'Right before the day ends' }, { ko: '23시 50분 넘어서 소리 모드', en: 'Sound mode after 11:50pm' },
    c => c.mode === 'loud' && c.hour === 23 && c.min >= 50),
  T('friday13', 'legend', '13일의 금요일 뿡', 'Friday the 13th',
    { ko: '불길한 날', en: 'An unlucky day' }, { ko: '13일의 금요일에 터짐', en: 'Goes off on Friday the 13th' },
    c => c.wd === 5 && c.day === 13),
  T('loud7', 'legend', '확성기 그 자체', 'Human Megaphone',
    { ko: '오늘 너무 시끄러움', en: 'Too loud today' }, { ko: '하루에 냄 6번', en: 'Loud 6 times in a day' },
    c => c.mode === 'loud' && c.today.loud >= 6),
  T('soft5', 'legend', '진동 마스터', 'Vibration Master',
    { ko: '아무도 모르게 여러 번', en: 'Many times, secretly' }, { ko: '하루에 진동 5번', en: 'Buzz 5 times in a day' },
    c => c.mode === 'soft' && c.today.soft >= 5),
  T('golden_ratio', 'legend', '황금 비율', 'Golden Ratio',
    { ko: '셋이 똑같이', en: 'All three, equally' }, { ko: '하루에 냄 · 진동 · 참음이 2번씩 이상 같음', en: 'Loud, buzz and held equal, 2+ each, in a day' },
    c => c.today.loud >= 2 && c.today.loud === c.today.soft && c.today.soft === c.today.hold),
  T('nth7', 'legend', '하루 일곱 번의 기적', 'Seven in a Day',
    { ko: '오늘 바쁨', en: 'Busy day' }, { ko: '그날 일곱 번째', en: 'The seventh of the day' },
    c => c.nth >= 7),
  T('ear_night', 'legend', '이어폰 속 심야 공연', 'Midnight Earbud Concert',
    { ko: '나만 듣는 밤', en: 'A night only you hear' }, { ko: '밤 10시 넘어 이어폰으로 냄', en: 'Loud through earbuds after 10pm' },
    c => c.mode === 'loud' && c.ear && c.hour >= 22),
  T('early_bird', 'legend', '새벽 다섯 시 기상 방구', '5AM Wake-Up Toot',
    { ko: '해 뜨기 전', en: 'Before sunrise' }, { ko: '6시 전에 터짐 (기상 알람을 일찍 맞춰야 함)', en: 'Goes off before 6am (needs an early wake-up alarm)' },
    c => c.hour < 6),

  // ---- 레어
  T('half_hour', 'rare', '30분 칼같이', 'Half-Past Precision',
    { ko: '시계 반쪽', en: 'Half the clock' }, { ko: '30분에 딱 터짐', en: 'Goes off at exactly :30' },
    c => c.min === 30),
  T('deadline', 'rare', '칼퇴 신호탄', 'Clock-Out Flare',
    { ko: '퇴근 한 시간 전', en: 'An hour before leaving' }, { ko: '평일 17시대 소리 모드', en: 'Sound mode, 5pm on a weekday' },
    c => c.mode === 'loud' && weekday(c) && c.hour === 17),
  T('sunday_blues', 'rare', '일요일 밤의 우울', 'Sunday Night Blues',
    { ko: '내일 월요일', en: 'Monday tomorrow' }, { ko: '일요일 18시 넘어서', en: 'Sunday after 6pm' },
    c => c.wd === 0 && c.hour >= 18),
  T('saturday_morning', 'rare', '토요일 아침의 배신', 'Saturday Morning Betrayal',
    { ko: '늦잠 자는 날', en: 'Sleep-in day' }, { ko: '토요일 6~10시', en: 'Saturday 6–10am' },
    c => c.wd === 6 && c.hour >= 6 && c.hour < 10),
  T('payday', 'rare', '월급날 축포', 'Payday Salute',
    { ko: '통장이 웃는 날', en: 'When the bank smiles' }, { ko: '25일에 소리 모드', en: 'Sound mode on the 25th' },
    c => c.mode === 'loud' && c.day === 25),
  T('late_fix', 'rare', '늦은 수습', 'Damage Control',
    { ko: '터진 다음엔', en: 'After it blew' }, { ko: '냄 바로 다음에 참음', en: 'Held right after a loud one' },
    c => c.mode === 'hold' && c.prev === 'loud'),
  T('first_loud', 'rare', '개시부터 축포', 'Opening Salute',
    { ko: '오늘 첫 방부터', en: 'From the very first' }, { ko: '그날 첫 방이 소리 모드', en: 'The first of the day is loud' },
    c => c.mode === 'loud' && c.nth === 1),
  T('first_hold', 'rare', '개시부터 참음', 'Held From the Start',
    { ko: '오늘 첫 방부터 꾹', en: 'Held from the first' }, { ko: '그날 첫 방이 참음', en: 'The first of the day is held' },
    c => c.mode === 'hold' && c.nth === 1),
  T('tit_loud', 'rare', '새소리 아님 확실', 'Definitely Not Birdsong',
    { ko: '작은 새의 큰 소리', en: 'A big sound from a small bird' }, { ko: '오목이가 소리 모드', en: 'Birdie on sound mode' },
    c => c.char === 'tit' && c.mode === 'loud'),
  T('cat_loud', 'rare', '냥냥펀치 대신 뿡', 'Toot Instead of a Paw Punch',
    { ko: '시크한 척하더니', en: 'So much for being cool' }, { ko: '냥이가 소리 모드', en: 'Kitty on sound mode' },
    c => c.char === 'cat' && c.mode === 'loud'),
  T('tit_hold', 'rare', '오목눈이 숨 참기', 'Birdie Holds Its Breath',
    { ko: '작은 몸으로 버팀', en: 'Holding on, tiny body' }, { ko: '오목이가 참음', en: 'Birdie held it in' },
    c => c.char === 'tit' && c.mode === 'hold'),
  T('hamster_hold', 'rare', '볼주머니에 가스 저장', 'Gas in the Cheek Pouch',
    { ko: '저장의 달인', en: 'Master of storage' }, { ko: '햄찌가 참음', en: 'Hammy held it in' },
    c => c.char === 'hamster' && c.mode === 'hold'),
  T('ear_loud', 'rare', '나만 아는 방구', 'For My Ears Only',
    { ko: '이어폰 너머', en: 'Behind the earbuds' }, { ko: '이어폰으로 냄', en: 'Loud through earbuds' },
    c => c.mode === 'loud' && c.ear),
  T('dnd_hold', 'rare', '방해금지의 수호자', 'Guardian of Do Not Disturb',
    { ko: '아무도 방해 못 함', en: 'No one disturbs' }, { ko: '방해금지라 참음', en: 'Held because of Do Not Disturb' },
    c => c.mode === 'hold' && c.why === 'dnd'),
  T('saver_hold', 'rare', '배터리 아끼려다 참음', 'Held to Save Battery',
    { ko: '1% 의 소중함', en: 'Every percent counts' }, { ko: '절전 모드라 참음', en: 'Held because of battery saver' },
    c => c.mode === 'hold' && c.why === 'saver'),
  T('late_hold', 'rare', '잠든 폰의 침묵', 'The Sleeping Phone’s Silence',
    { ko: '폰이 늦잠 잠', en: 'The phone overslept' }, { ko: '폰이 잠들어 늦게 와서 참음', en: 'Held because the phone slept and it came late' },
    c => c.mode === 'hold' && /^late/.test(c.why || '')),
  T('wknd_loud', 'rare', '주말 늦잠 깨우기', 'Weekend Alarm Clock',
    { ko: '주말 아침', en: 'Weekend morning' }, { ko: '주말 7~10시 소리 모드', en: 'Sound mode, weekend 7–10am' },
    c => c.mode === 'loud' && (c.wd === 0 || c.wd === 6) && c.hour >= 7 && c.hour < 10),

  // ---- 노멀
  T('teatime', 'normal', '간식 타임 신호탄', 'Snack-Time Flare', { ko: '오후 간식', en: 'Afternoon snack' }, { ko: '15시대', en: 'In the 3pm hour' }, c => c.hour === 15),
  T('dinner', 'normal', '저녁 밥상 축포', 'Dinner-Table Salute', { ko: '저녁 먹을 때', en: 'At dinner' }, { ko: '19시대', en: 'In the 7pm hour' }, c => c.hour === 19),
  T('brunch', 'normal', '주말 브런치 뿡', 'Weekend Brunch Toot', { ko: '주말 늦은 아침', en: 'Late weekend morning' }, { ko: '주말 10~11시대', en: 'Weekend 10–11am' }, c => (c.wd === 0 || c.wd === 6) && (c.hour === 10 || c.hour === 11)),
  T('tuesday', 'normal', '존재감 없는 화요일', 'Forgettable Tuesday', { ko: '그냥 평일', en: 'Just a weekday' }, { ko: '화요일', en: 'On a Tuesday' }, c => c.wd === 2),
  T('wednesday', 'normal', '수요일 반환점', 'Wednesday Halfway', { ko: '한 주의 가운데', en: 'Middle of the week' }, { ko: '수요일', en: 'On a Wednesday' }, c => c.wd === 3),
  T('thursday', 'normal', '거의 금요일', 'Almost Friday', { ko: '조금만 더', en: 'Almost there' }, { ko: '목요일', en: 'On a Thursday' }, c => c.wd === 4),
  T('soft_after_hold', 'normal', '참다 새어 나옴', 'Leaked After Holding', { ko: '참은 다음엔', en: 'After holding' }, { ko: '참음 바로 다음에 진동', en: 'Buzz right after a held one' }, c => c.mode === 'soft' && c.prev === 'hold'),
  T('loud_after_soft', 'normal', '예고편 끝 본편 시작', 'Trailer Over, Feature Begins', { ko: '진동 다음엔', en: 'After a buzz' }, { ko: '진동 바로 다음에 냄', en: 'Loud right after a buzz' }, c => c.mode === 'loud' && c.prev === 'soft'),
  T('hamster_soft', 'normal', '쳇바퀴 진동', 'Hamster-Wheel Buzz', { ko: '햄찌가 살짝', en: 'Hammy, a little' }, { ko: '햄찌가 진동', en: 'Hammy buzzes' }, c => c.char === 'hamster' && c.mode === 'soft'),
  T('cat_soft', 'normal', '꾹꾹이 진동', 'Kneading Buzz', { ko: '냥이가 살짝', en: 'Kitty, a little' }, { ko: '냥이가 진동', en: 'Kitty buzzes' }, c => c.char === 'cat' && c.mode === 'soft'),
  T('silent_hold', 'normal', '무음의 미학', 'The Art of Silence', { ko: '아무 소리도 없이', en: 'Without a sound' }, { ko: '무음 모드라 참음', en: 'Held because of silent mode' }, c => c.mode === 'hold' && c.why === 'silent'),
  T('second_today', 'normal', '두 번째는 덜 민망', 'Second Time’s Easier', { ko: '오늘 두 번째', en: 'Second of the day' }, { ko: '그날 두 번째', en: 'The second of the day' }, c => c.nth === 2),

  // ---- 기념 (넘긴 첫 방에 무조건)
  T('total10', 'normal', '열 번째 방구', 'Tenth Toot', { ko: '두 자리 수', en: 'Double digits' }, { ko: '누적 10번', en: '10 in total' }, c => c.total >= 10),
  T('total25', 'normal', '스물다섯 방', 'Twenty-Five', { ko: '쌓이는 중', en: 'Piling up' }, { ko: '누적 25번', en: '25 in total' }, c => c.total >= 25),
  T('total500', 'legend', '오백 방 장인', 'Five-Hundred Artisan', { ko: '경지에 오름', en: 'Mastery' }, { ko: '누적 500번', en: '500 in total' }, c => c.total >= 500),
  T('total1000', 'legend', '천방지축', 'One Thousand Toots', { ko: '네 자리 수', en: 'Four digits' }, { ko: '누적 1,000번', en: '1,000 in total' }, c => c.total >= 1000),
  T('streak2', 'normal', '이틀째 범행', 'Repeat Offender', { ko: '어제도 했음', en: 'Did it yesterday too' }, { ko: '2일 연속', en: '2 days in a row' }, c => c.streak >= 2),
  T('streak10', 'rare', '열흘 연속 출근', 'Ten-Day Shift', { ko: '꾸준함', en: 'Consistency' }, { ko: '10일 연속', en: '10 days in a row' }, c => c.streak >= 10),
  T('streak100', 'legend', '백일 방구 잔치', '100-Day Toot Party', { ko: '백일', en: '100 days' }, { ko: '100일 연속', en: '100 days in a row' }, c => c.streak >= 100),

  // ---- 시즌 추가
  S('ss_whiteday', '사탕 녹이는 뿡', 'Candy-Melting Toot', { ko: '3월 14일', en: 'Mar 14' }, on(3, 14)),
  S('ss_blackday', '짜장면 먹고 뿡', 'Black-Noodle Toot', { ko: '4월 14일', en: 'Apr 14' }, on(4, 14)),
  S('ss_parents', '카네이션 대신 뿡', 'Toot Instead of Carnations', { ko: '5월 8일', en: 'May 8' }, on(5, 8)),
  S('ss_teachers', '스승의 은혜 뿡', 'For My Teacher', { ko: '5월 15일', en: 'May 15' }, on(5, 15)),
  S('ss_hangul', '뿡은 한 글자', 'A One-Syllable Toot', { ko: '10월 9일 한글날', en: 'Oct 9, Hangul Day' }, on(10, 9)),
  S('ss_dongji', '팥죽 먹고 뿡', 'Red-Bean Porridge Toot', { ko: '12월 22일 동지', en: 'Dec 22, winter solstice' }, on(12, 22)),

  // ==================== 숨김 업적 (이스터에그): 방구가 아니라 행동으로 받는다 (main.js grantHidden) ====================
  H('hid_logo', 'legend', '개발자의 실수', 'The Developer’s Mistake', { ko: '로고를 괴롭히면', en: 'Bother the logo' }, { ko: '로고 7연타', en: 'Tap the logo 7 times' }),
  H('hid_poke50', 'rare', '진상 손님', 'Difficult Customer', { ko: '그만 좀 눌러', en: 'Stop poking' }, { ko: '캐릭터 20초 안에 50번 누르기', en: 'Poke your pal 50 times in 20 seconds' }),
  H('hid_mission3', 'rare', '미션 올클', 'All Missions Cleared', { ko: '오늘 할 일 끝', en: 'Done for the day' }, { ko: '오늘의 미션 세 개 다 받기', en: 'Claim all three daily missions' }),
  H('hid_alarm_fast', 'legend', '손가락 번개', 'Lightning Finger', { ko: '알람을 빛의 속도로', en: 'Alarm at light speed' }, { ko: '기상 알람 20연타를 4초 안에', en: 'Finish the 20-tap alarm within 4 seconds' }),
  H('hid_snooze3', 'rare', '5분의 기적', 'The Five-Minute Miracle', { ko: '조금만 더…', en: 'Just a bit more…' }, { ko: '하루에 [5분만 더] 3번', en: 'Hit "5 more min" 3 times in a morning' }),
  H('hid_trap10', 'legend', '함정 장인', 'Trap Master', { ko: '쿠션 밑의 고수', en: 'Master under the cushion' }, { ko: '함정에 10번 걸리게 하기', en: 'Catch someone with the trap 10 times' }),
  H('hid_share10', 'rare', '자랑쟁이', 'Show-Off', { ko: '보여 주고 싶어서', en: 'Had to show everyone' }, { ko: '짤 10번 자랑하기', en: 'Share 10 memes' }),
  H('hid_shopaholic', 'rare', '꾸미기 중독', 'Dress-Up Addict', { ko: '지갑이 얇아짐', en: 'Lighter wallet' }, { ko: '꾸미기 10개 사기', en: 'Buy 10 style items' }),
  H('hid_dex_half', 'legend', '도감 반쪽', 'Half the Dex', { ko: '절반의 성공', en: 'Halfway there' }, { ko: '칭호 절반 모으기', en: 'Collect half of all titles' }),
  H('hid_night_owl', 'rare', '새벽 3시의 방구 연구가', '3AM Toot Researcher', { ko: '잠은 언제 자', en: 'When do you sleep' }, { ko: '새벽 3시대에 앱 열기', en: 'Open the app in the 3am hour' })
];

export const titleById = id => TITLES.find(x => x.id === id);

const MILESTONES = ['streak3', 'streak7', 'streak30', 'total50', 'total100', 'total10', 'total25', 'total500', 'total1000', 'streak2', 'streak10', 'streak100'];
const BASIC = { loud: 'loud_basic', soft: 'soft_basic', hold: 'hold_basic' };

/**
 * 상황 c 에 맞는 칭호 하나. owned = { id: … } (가진 칭호).
 * 0.5% 는 상황과 상관없이 잭팟 5개 중 하나. 기념 칭호(연속 · 누적) · 시즌 칭호(그날)는 조건을 넘긴 첫 방에 무조건 주고, 그 뒤엔 다시 안 나온다.
 * 나머지는 맞는 후보 중 노멀 12 : 레어 3 : 레전드 1 로 뽑는다. 아직 없는 칭호를 먼저 보지 않는다:
 * 이미 가진 칭호가 나오면 꽝 (화면에 칭호를 안 알림) → 모을수록 새 칭호 나오기가 어려워진다.
 */
export const JACKPOT = 0.005;

export function pickTitle(c, owned = {}, random = Math.random) {
  if (random() < JACKPOT) {
    const jp = TITLES.filter(x => x.rarity === 'jackpot');
    return jp[Math.floor(random() * jp.length) % jp.length];
  }
  const milestone = TITLES.find(x => (MILESTONES.includes(x.id) || x.season) && !owned[x.id] && x.test(c));
  if (milestone) return milestone;
  const cands = TITLES.filter(x => !MILESTONES.includes(x.id) && !x.season && x.test(c));
  if (!cands.length) return titleById(BASIC[c.mode] || 'hold_basic');
  const pool = cands;
  const total = pool.reduce((n, x) => n + RARITY[x.rarity].weight, 0);
  let r = random() * total;
  for (const x of pool) {
    r -= RARITY[x.rarity].weight;
    if (r < 0) return x;
  }
  return pool[pool.length - 1];
}

/** 이벤트 시각과 그날까지의 기록으로 상황을 만든다 (오늘 기록 today 는 이번 것을 포함). */
export function contextOf({ t, char, mode, ear, why }, { today, prev, charsToday, streak, total, nth }) {
  const d = new Date(t);
  const month = d.getMonth() + 1, day = d.getDate();
  const ymd = `${d.getFullYear()}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { mode, char, hour: d.getHours(), min: d.getMinutes(), wd: d.getDay(), nth, today, prev, charsToday, streak, total, month, day, ymd, ear: !!ear, why: why || null };
}
