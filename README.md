# 방구뿡 · Pocket Toot

Google Play 패키지 `io.github.graviton94.bgbb` · 소개 https://graviton94.github.io/bgbb/ · 개인정보처리방침 https://graviton94.github.io/bgbb/privacy/

**단순하게, 한 방에.** 06~24시 아무 때나 하루 몇 번 (서로 1시간 이상 떨어져서), 방구 햄찌·솜뭉치 오목눈이·시크 뚱냥이 중
하나가 **아무 때나** 터진다. 그 순간 폰 상태가 결과를 정한다.

| 폰 상태 | 결과 |
|---|---|
| 소리 모드 | **냄** – 진짜로 소리가 남 |
| 진동 모드 | **진동** – 부르르만 |
| 무음 / 방해금지 | **참음** – 아무 일 없었던 척 |

터질 때마다 그 순간의 상황(시간·요일·폰 모드·오늘 몇 번째·연속 기록)으로 **칭호** 40개 중 하나를 받는다. 1% 는 상황과 상관없이 **잭팟** 5종 (머니건 + 지폐 비)
(`src/titles.js`). 앱을 열면 형광 화면 + 릴스 자막 + 속보 띠로 크게 보여 주고, 9:16 **속보 카드**로 바로 퍼뜨린다.
앱에서는 터진 뒤 소리 없는 알림 한 줄("[속보] 햄찌, 끝내 참지 못해")도 띄운다 (설정에서 끔).
**함정설치!**: 폰을 쿠션 밑에 두고 설치하면, 누가 들거나 흔들거나 만지는 순간 뿡 (`src/cushion.js`, 흔들림 감지 · 화면 꺼진 척).
평소 화면은 무표정 — 회색 바탕에 "3번 남음." 한 줄. 급하면 "비상탈출" (다시 시작! 누를 때까지 조용), 매일 같은 시간이면 설정 → "쫄 시간".

## 구조

```
index.html  styles.css     화면 틀과 스타일 (빌드 도구 없음)
src/
  i18n.js                  한국어 / English (폰 언어를 따라감)
  data.js                  캐릭터·결과별 문구 등 고정 데이터
  titles.js                칭호 40개 + 고르는 규칙 (순수 함수, tests/ 에서 검사)
  plan.js                  작전 일정 계산 (순수 함수, tests/ 에서 검사)
  store.js                 상태 하나 + 저장 + 변경 알림, 기록·칭호 집계
  schedule.js              불시 작전 일정 (네이티브 연동 / 브라우저 미리보기)
  audio.js                 효과음 (WAV 1회 디코딩 후 재사용)
  memes.js                 짤 조립 (상황 문구 · 배치 · 소품 랜덤, 캐릭터에 붙는 안경·뿡 효과음 글자·머니건) + 유니크 짤, 화면·카드 공용
  card.js                  1080×1920 속보 카드 (화면에 나온 짤 + 속보 띠 + 칭호)
  pixels.js · fx.js        도트 그림(선글라스 · 머니건 · 지폐 · =3 · 거품)과 터지는 화면 효과
  main.js                  화면 연결
assets/                    그림(WebP) · 효과음(WAV) · 글꼴(woff2, OFL)
tools/fetch_sounds.py      실제 녹음 후보 받기 (Freesound CC0 · Wikimedia Commons, GitHub Actions 에서)
tools/build_sounds.py      고른 녹음을 잘라 효과음 만들기 → assets/sounds/ (출처: tools/sound_credits.json)
tools/prepare_faces.py     원화 표정 7종 × 3친구 (1024 PNG) → assets/faces/*.webp, 선글라스 (같은 눈 좌표라 그대로 겹침)
                           REAL=<실사 폴더> 를 주면 실사 사진 팩도 → assets/faces_real (레어 이상 칭호 특전 짤)
tools/make_icons.py        앱 아이콘 (멍한 햄찌 + 방구 구름)
tools/subset_fonts.py      글꼴(Black Han Sans)을 자주 쓰는 한글 2,350자로 줄이기
tools/store_images.mjs     Play 스토어 스크린샷 · 대표 그림 만들기
docs/store/                스토어 등록 글 · 데이터 보안 답 · 이미지
docs/RELEASE.md            서명 · Play Console · 실기기 확인 순서
android/                   WebView 껍데기 + 불시 작전 엔진
```

### 불시 작전 엔진 (Android)

- `PrankScheduler` – 하루치 작전 시각을 시간대 안에서 미리 뽑고(시간대를 N칸으로 나눠 칸마다 1회),
  가장 가까운 하나만 `AlarmManager.setAndAllowWhileIdle` 로 건다. **상주 서비스·WakeLock·상시 알림 없음.**
- `PrankReceiver` – 알람이 울리면 깨어나 1회 실행 후 다음 알람을 건다. 재부팅·시간 변경 시 복구.
- `PrankPlayer` – 실제 벨소리 모드와 방해금지를 읽어 소리/진동/무반응을 정하고 기록한다.
- `PrankNotifier` – 터진 직후 소리 없는 채널로 알림 한 줄 (Android 13+ 는 알림 권한이 있을 때만).
- `MainActivity` – 웹 앱을 `https://appassets.androidplatform.net/` 로 서빙하고 `window.BgbbNative` 를 노출.
  앱을 열면 JS 가 그동안 쌓인 기록을 가져가 집계한다.

브라우저로 열면 같은 규칙으로, 탭이 열려 있는 동안만 작전을 흉내 낸다 (폰 상태는 설정에서 고른다).

> 앱을 오래 안 열면 Android 가 앱을 "드물게 사용" 버킷으로 내려 알람 횟수를 줄일 수 있다.

- `Support` – 응원하기: Google Play 일회성 상품(`tip_seeds` · `tip_churu` · `tip_feast`). 잠긴 기능은 없다.

앱은 인터넷에서 아무것도 불러오지 않는다 (글꼴·그림·소리 모두 APK 안). 계정·광고·분석 도구 없음.

## 실행 · 테스트

```bash
npm start                               # 브라우저 미리보기 (ES 모듈이라 file:// 로는 안 열림)
npm test                                # 일정 규칙 · 칭호 테스트
cd android && ./gradlew testDebugUnitTest assembleDebug
python3 tools/build_sounds.py           # 고른 녹음으로 효과음 다시 만들기 (후보는 tools/sound_candidates/)
```

`main` 에 푸시하거나 PR 을 열면 GitHub Actions 가 테스트 → 디버그 APK → 출시용 AAB 를 만든다.
출시는 [docs/RELEASE.md](docs/RELEASE.md).
