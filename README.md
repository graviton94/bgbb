# 방구뿡 (Bang-gu Bboong)

주머니 속 다마고치. 정해둔 **작전 시간대** 안에서 하루 몇 번, 방구 햄찌·오목눈이·뚱냥이 중 하나가
**불시에** 소리를 낸다. 그 순간 폰 상태에 따라 기록이 갈린다.

| 폰 상태 | 결과 | 보상 |
|---|---|---|
| 🔊 소리 모드 | 💥 **대담** — 진짜로 소리가 남 | 🌰 3 |
| 📳 진동 모드 | 🫧 **소심** — 진동만 | 🌰 3 |
| 🤫 무음 / 방해금지 | 🤫 **꾹참** — 아무 일도 없었던 척 | 🌰 5 |

도토리로 아지트 소품(돗자리·큰나무)을 사고, 실제 기록으로 보물 9종을 모으고, 하루를 9:16 그림일기로 남긴다.
회의·시험 때는 🚨 긴급탈출 한 번이면 다시 누를 때까지 전부 멈춘다.

## 구조

```
index.html / index.css / app.js   웹 앱 (빌드 도구 없음, 그대로 서빙)
assets/                           WebP 그림, m4a 효과음 9종
android/                          WebView 껍데기 + 불시 작전 엔진
tools/generate_sounds.py          효과음 합성기 (numpy + ffmpeg)
```

### 안드로이드 불시 작전 엔진

- `PrankScheduler` — 하루치 작전 시각을 시간대 안에서 미리 뽑고(시간대를 N칸으로 나눠 칸마다 1회),
  가장 가까운 것 하나만 `AlarmManager.setAndAllowWhileIdle` 로 건다. **상주 서비스·WakeLock·상시 알림 없음.**
- `PrankReceiver` — 알람이 울리면 깨어나 `PrankPlayer` 로 1회 실행하고 다음 알람을 건다. 재부팅·시간 변경 시 복구.
- `PrankPlayer` — 실제 벨소리 모드/방해금지를 읽어 소리·진동·무반응을 정하고 기록을 남긴다.
  소리는 알림 볼륨을 따른다.
- `MainActivity` — 웹 앱을 `https://appassets.androidplatform.net/` 로 서빙하고 `window.BgbbNative` 다리를 노출.
  앱을 열면 JS 가 그동안 쌓인 기록을 가져가 집계한다.

브라우저에서 열면 같은 규칙으로 탭이 열려 있는 동안만 작전을 흉내 내고, 설정에서 폰 상태를 고를 수 있다.

## 실행

```bash
npx serve .                         # 웹 미리보기
cd android && gradle assembleDebug  # APK (웹 파일·효과음은 gradle 이 자동으로 복사)
```

`main` 에 푸시하거나 PR 을 열면 GitHub Actions 가 디버그 APK 를 빌드한다.
