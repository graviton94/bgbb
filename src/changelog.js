// 패치노트: 위가 최신. 앱을 업데이트하고 처음 열면 '지난번에 본 버전' 이후 것만 한 번 띄운다 (설정 → 패치노트 에서 다시 보기).
// v 는 android/app/build.gradle 의 versionName 과 같게. Play Console 출시 노트도 여기서 옮겨 쓴다.
export const CHANGELOG = [
  {
    v: '2.4.2', date: '2026-11-05',
    ko: [
      '칭호 도감을 수집 카드로: 친구 메달 · 등급마다 홀로그램 (잭팟은 금박 + 무지개), 안 딴 칭호는 실루엣',
      '자랑 이미지 새로: 등급마다 다른 바탕, 큰 칭호 이름 · 조건 · 날짜. 칭호 65개에 전용 짤',
      '짤 뽑기: 하루 1번 무료, 광고 보면 한 번씩 더 (하루 최대 4번)',
      '도감이 더 가볍게: 딴 칭호 중 화면에 보이는 카드만 움직임',
      '첫 사용 안내에 늦게 터진 방구 규칙 한 줄 추가'
    ],
    en: [
      'Titles are now collectible cards: pal medals and holo foil by rarity (gold and rainbow for jackpots), silhouettes for ones you have not earned',
      'New share images: a background per rarity, the title big with its condition and date, and 65 more titles get their own meme',
      'Meme draw: one free a day, one more per ad (up to 4 a day)',
      'Lighter titles screen: only earned cards on screen animate',
      'The first-run guide now explains late toots'
    ]
  },
  {
    v: '2.4.1', date: '2026-11-05',
    ko: [
      '업데이트 받는 동안 화면 위에 진행률 표시 · \'지금 받기\' 창이 다시 뜨던 것 수정',
      '첫 사용 안내 다시 정리: 함정설치 · 절대 조용(쫄 시간 · 비상탈출) · 기상 알람을 따로 설명하고 움직이는 그림으로',
      '안내를 마치면 필요한 권한 두 개를 바로 물어봄',
      '설정은 오른쪽 위 버튼 하나로 · 홈의 ⓘ 는 사용설명으로 합침',
      '칭호 도감: 레어 · 레전드 · 잭팟 줄이 반짝임',
      '꾸미기: 잠긴 물건은 흐리게 + 자물쇠'
    ],
    en: [
      'Update download progress now shows at the top, and the "Get it now" prompt no longer pops up again',
      'First-run guide reworked: traps, total silence (chicken hours and bail-out) and the wake-up alarm each get their own animated page',
      'Finishing the guide asks for the two permissions right away',
      'Settings live in the top-right button only; the ⓘ on home is now part of the guide',
      'Titles: rare, legend and jackpot rows sparkle',
      'Style: locked items are faded with a lock on top'
    ]
  },
  {
    v: '2.4.0', date: '2026-11-04',
    ko: [
      '소리 규칙 정리: 미디어 볼륨이 제일 먼저. 방해금지 · 절전 · 비상탈출 · 쫄 시간엔 앱 안 효과음과 광고 소리도 꺼짐',
      '기상 알람: 요일 고르기 (폰 알람처럼) · 끄려면 20번 연타 (휘황찬란 FX) · \'알람 및 리마인더\' 허용해야 켤 수 있음',
      '첫 사용 안내 새로: 소리 규칙 · 홈 버튼 · 쫄 시간 · 알람 · 미션 · 꾸미기까지 8쪽',
      '오늘의 미션 3개 · 이번 주 방구 결산 (일요일 밤)',
      '방구 소리 팩 6종: 바둠츠 · 징글 · 유령 · 꽹과리 · 보름달 피리 · 띠용. 시즌 팩은 그날 앱 열면 공짜',
      '홈 화면 위젯: 친구 얼굴 누르면 뿡',
      '칭호 119개로 (63개 추가, 숨김 업적 10개 포함)',
      '이어폰으로 낸 방구 표시 · 블루투스 이어폰 앞부분 잘림 수정'
    ],
    en: [
      'Sound rules cleaned up: media volume comes first. In-app effects and ad audio are off during DND, battery saver, bail-out and chicken hours',
      'Wake-up alarm: pick days like a phone alarm, tap 20 times to stop it (with fireworks), needs "Alarms & reminders"',
      'New first-run guide: sound rules, home buttons, chicken hours, alarm, missions and style in 8 pages',
      'Three daily missions and a weekly toot report (Sunday night)',
      'Six toot sound packs: ba-dum-tss, jingle, ghost, gong, full-moon flute, boing. Seasonal ones are free on their day',
      'Home-screen widget: tap your pal to toot',
      '119 titles now (63 new, including 10 hidden achievements)',
      'Toots through earbuds are marked, and Bluetooth no longer clips the start'
    ]
  },
  {
    v: '2.3.2', date: '2026-10-29',
    ko: [
      '노래 듣는 중에 터지면 노래 소리를 잠깐 줄이고 뿡 (이어폰 속 노래에 묻히지 않게)',
      '참음이면 왜 참았는지 표시 (방해금지 · 무음 · 절전 · 폰이 잠들어 늦게 옴)',
      '냄은 소리가 실제로 나기 시작했을 때만 기록 (재생 실패면 참음)'
    ],
    en: [
      'Music gets turned down for a moment when a toot goes off, so it isn’t lost in your earbuds',
      'Held-in toots now say why (DND, silent, battery saver, phone asleep and late)',
      'A toot only counts as out loud once the sound actually starts playing'
    ]
  },
  {
    v: '2.3.1', date: '2026-10-27',
    ko: ['기상 알람을 켜거나 시각을 바꾸면 그날 방구가 "오늘은 끝" 으로 사라지던 문제 수정'],
    en: ['Fixed today’s toots vanishing ("Done for today") after turning on or changing the wake-up alarm']
  },
  {
    v: '2.3.0', date: '2026-10-27',
    ko: [
      '기상 알람: 방구 · 새 · 고양이 소리로 만든 30초 알람 음악이 [확인] 누를 때까지 울림. 그 시각부터 24시까지가 방구 시간',
      '방구가 화면 켤 때까지 밀리던 문제 수정 (정확한 시각 알람). 절전 모드거나 5분 넘게 늦게 깨면 참음 처리 (칭호는 공정하게)',
      '홈 정리: 최근 칭호 · 볼륨은 위로, 기상 알람 · 쫄 시간은 홈에서 바로',
      '연습 한 방 없앰. 짤 뽑기를 다 쓰면 광고 보고 +3, 그다음은 내일',
      '비상탈출 버튼이 진짜 비상 버튼처럼'
    ],
    en: [
      'Wake-up alarm: a 30-second anthem made of toots, birds and cats loops until you hit OK. Toot hours run from then until midnight',
      'Fixed toots piling up until you turned the screen on (exact alarms). Battery saver or over 5 minutes late counts as held in (fair titles only)',
      'Cleaner home: latest title and volume up top, wake-up and chicken hours right on home',
      'Practice toot removed. Out of draws? Watch an ad for +3, then wait for tomorrow',
      'The bail-out button now looks like a real emergency button'
    ]
  },
  {
    v: '2.2.0', date: '2026-10-24',
    ko: [
      '시즌 칭호 11개: 설날 · 수능 · 크리스마스… 1년에 그날만 나옴',
      '짤 뽑기 다 썼으면 광고 보고 +3 (하루 2번, 원할 때만)',
      '꾸미기에 뿡코인 충전 생김',
      '사용설명 · 패치노트 · 새 버전 알림 생김',
      '앱 안 볼륨 키는 미디어 볼륨 조절. 앱 안 방구도 미디어 볼륨 0 이면 진동, 무음이면 조용',
      '홈 볼륨 버튼 옆 ⓘ: 소리 규칙 한눈에 보기'
    ],
    en: [
      '11 seasonal titles: Lunar New Year, Christmas, Halloween… one day a year only',
      'Out of meme draws? Watch an ad for +3 (twice a day, only if you want)',
      'Toot coins can now be topped up in Style',
      'New: how-to guide, patch notes, update alerts',
      'Volume keys in the app now set media volume. In-app toots buzz at media volume 0 and stay quiet on silent',
      'ⓘ next to the volume button: sound rules at a glance'
    ]
  },
  {
    v: '2.1.0', date: '2026-10-23',
    ko: [
      '획득 팝업 4종: 빵빠레 · 구린 PPT · 돈폭탄 · 상자깡',
      '구린 글씨 5종 모으기 (궁서체 · 와당체 …)',
      '배경 13종 · 소품 · 효과 · 공유 프레임 6종 새로 그림',
      '곳곳에 문법 파괴 칭찬 기믹'
    ],
    en: [
      '4 celebration popups: fanfare, cringe PPT, money bomb, box opening',
      'Collect 5 cringe fonts',
      '13 backgrounds, new props, toot effects and 6 share frames',
      'Broken-grammar praise all over the app'
    ]
  },
  {
    v: '2.0.0', date: '2026-10-21',
    ko: ['방구뿡 첫 버전. 주머니 속 셋이 아무 때나 뿡'],
    en: ['First version. Three pocket pals toot whenever']
  }
];
export const APP_VERSION = CHANGELOG[0].v;

/** a < b ? (2.1.0 < 2.2.0) */
export const older = (a, b) => {
  const x = String(a || '0').split('.').map(Number), y = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) < (y[i] || 0);
  return false;
};
