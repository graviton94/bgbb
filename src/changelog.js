// 패치노트: 위가 최신. 앱을 업데이트하고 처음 열면 '지난번에 본 버전' 이후 것만 한 번 띄운다 (설정 → 패치노트 에서 다시 보기).
// v 는 android/app/build.gradle 의 versionName 과 같게. Play Console 출시 노트도 여기서 옮겨 쓴다.
export const CHANGELOG = [
  {
    v: '2.3.0', date: '2026-10-27',
    ko: [
      '기상 알람: 정한 시각에 친구들이 방구로 깨워 줌. 그 시각부터 24시까지가 방구 시간',
      '방구가 화면 켤 때까지 밀리던 문제 수정 (정확한 시각 알람)',
      '홈 정리: 최근 칭호 · 볼륨은 위로, 기상 알람 · 쫄 시간은 홈에서 바로',
      '연습 한 방 없앰. 짤 뽑기를 다 쓰면 광고 보고 +3, 그다음은 내일',
      '비상탈출 버튼이 진짜 비상 버튼처럼'
    ],
    en: [
      'Wake-up alarm: your pals toot you awake. Toot hours run from then until midnight',
      'Fixed toots piling up until you turned the screen on (exact alarms)',
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
