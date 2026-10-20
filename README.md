# 방구뿡 (Bang-gu Bboong)

**주머니 속 다마고치.** 작전 시간대 안에서 하루 몇 번, 방구 햄찌·솜뭉치 오목눈이·시크 뚱냥이 중
하나가 **불시에** 소리를 낸다. 그 순간 폰 상태가 결과를 정한다.

| 폰 상태 | 결과 | 도토리 |
|---|---|---|
| 🔊 소리 모드 | 💥 **대담** – 진짜로 소리가 남 | 3 |
| 📳 진동 모드 | 🫧 **소심** – 진동만 | 3 |
| 🤫 무음 / 방해금지 | 🤫 **꾹참** – 아무 일 없었던 척 | 5 |

도토리로 아지트 소품을 사고, 진짜 기록으로 비밀 보물 9종을 열고, 하루를 9:16 그림일기로 남긴다.
회의·시험 때는 🚨 긴급탈출 한 번이면 다시 누를 때까지 전부 멈춘다.

## 구조

```
index.html  styles.css     화면 틀과 스타일 (빌드 도구 없음)
src/
  data.js                  캐릭터·소품·보물·테마 등 고정 데이터
  store.js                 상태 하나 + 저장 + 변경 알림, 기록 집계
  schedule.js              불시 작전 일정 (네이티브 연동 / 브라우저 미리보기)
  audio.js                 효과음 (WAV 1회 디코딩 후 재사용)
  world.js                 아지트 캔버스 (보일 때만 30fps)
  diary.js                 1080×1920 그림일기 카드
  main.js                  화면 연결
assets/                    그림(WebP)과 효과음(WAV)
tools/bake_sounds.py       효과음 12종 합성기 (numpy)
android/                   WebView 껍데기 + 불시 작전 엔진
```

### 불시 작전 엔진 (Android)

- `PrankScheduler` – 하루치 작전 시각을 시간대 안에서 미리 뽑고(시간대를 N칸으로 나눠 칸마다 1회),
  가장 가까운 하나만 `AlarmManager.setAndAllowWhileIdle` 로 건다. **상주 서비스·WakeLock·상시 알림 없음.**
- `PrankReceiver` – 알람이 울리면 깨어나 1회 실행 후 다음 알람을 건다. 재부팅·시간 변경 시 복구.
- `PrankPlayer` – 실제 벨소리 모드와 방해금지를 읽어 소리/진동/무반응을 정하고 기록한다.
- `MainActivity` – 웹 앱을 `https://appassets.androidplatform.net/` 로 서빙하고 `window.BgbbNative` 를 노출.
  앱을 열면 JS 가 그동안 쌓인 기록을 가져가 집계한다.

브라우저로 열면 같은 규칙으로, 탭이 열려 있는 동안만 작전을 흉내 낸다 (폰 상태는 설정에서 고른다).

> 앱을 오래 안 열면 Android 가 앱을 "드물게 사용" 버킷으로 내려 알람 횟수를 줄일 수 있다.

## 실행

```bash
npx serve .                         # 브라우저 미리보기 (ES 모듈이라 file:// 로는 안 열림)
python3 tools/bake_sounds.py        # 효과음 다시 굽기
cd android && gradle assembleDebug  # APK
```

`main` 에 푸시하거나 PR 을 열면 GitHub Actions 가 디버그 APK 를 빌드한다.
