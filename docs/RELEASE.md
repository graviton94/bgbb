# 출시 순서

## 1. 업로드 키 만들기 (한 번만, 잃어버리면 안 됨)

```bash
keytool -genkeypair -v -keystore bgbb-upload.jks -alias upload -keyalg RSA -keysize 4096 -validity 10000
```

- `bgbb-upload.jks` 와 비밀번호는 저장소 밖 안전한 곳에 보관한다 (`.gitignore` 가 `*.jks` 를 막는다).
- Play Console 에서 **Play 앱 서명** 을 쓴다 (기본값). 이 키는 업로드용이라 잃어버려도 Play 고객센터로 재설정할 수 있다.

## 2. 서명해서 빌드하기

**GitHub Actions (권장)** – 저장소 Settings → Secrets and variables → Actions 에 네 개를 넣는다.

| 이름 | 값 |
|---|---|
| `BGBB_KEYSTORE_BASE64` | `base64 -w0 bgbb-upload.jks` 결과 |
| `BGBB_KEYSTORE_PASSWORD` | 키 저장소 비밀번호 |
| `BGBB_KEY_ALIAS` | `upload` |
| `BGBB_KEY_PASSWORD` | 키 비밀번호 |

그러면 `Build` 워크플로의 결과물(`bgbb-build`)에 **서명된** `bgbb-release.aab` 가 들어간다.
(비밀 값이 없으면 서명 안 된 AAB 가 나온다 — 빌드 확인용으로만 쓴다.)

**내 컴퓨터** – `android/keystore.properties` (커밋하지 않음):

```properties
storeFile=/절대/경로/bgbb-upload.jks
storePassword=...
keyAlias=upload
keyPassword=...
```

```bash
cd android && ./gradlew bundleRelease   # → app/build/outputs/bundle/release/app-release.aab
```

## 3. Play Console

1. 앱 만들기: 이름 "방구뿡", 기본 언어 한국어, 앱 · 무료.
2. **스토어 등록 정보**: `docs/store/listing.md` 의 글과 `docs/store/` 이미지. 영어(en-US) 번역도 추가.
3. **앱 콘텐츠**: 개인정보처리방침 URL, 데이터 보안, 콘텐츠 등급, 대상 연령 — `listing.md` 아래쪽 답 그대로.
4. **수익 창출 → 일회성 제품**: `tip_seeds` · `tip_churu` · `tip_feast` 를 만들고 활성화.
5. **테스트 → 비공개 테스트**: AAB 업로드.
   - 개인 개발자 계정은 프로덕션 전에 **테스터 12명 이상이 14일 동안** 비공개 테스트를 해야 한다.
   - 응원하기는 Play 에서 설치한 앱에서만 동작한다. 라이선스 테스터(설정 → 라이선스 테스트)로 결제 흐름을 확인.
6. 14일이 지나면 **프로덕션** 액세스 신청 → 출시.

## 4. 실기기에서 꼭 볼 것 (출시 전)

- [ ] 처음 실행 안내 → 작전 시간대를 지금 시각이 들어가게 바꾸고 하루 횟수 '쫄깃' → 화면을 끄고 기다리면 울리는가
- [ ] 소리 / 진동 / 무음 / 방해금지 각각에서 결과(대담·소심·꾹참)가 맞게 기록되는가 (설정 → 지금 바로 1회)
- [ ] 앱을 완전히 닫았다가 다시 열면 "자리 비운 동안 작전 N회" 가 뜨는가
- [ ] 재부팅 후에도 작전이 이어지는가
- [ ] 긴급탈출 중엔 아무것도 울리지 않는가
- [ ] 내 목소리 녹음 → 마이크 권한 요청 → 앱을 닫아도 알람이 그 소리를 내는가
- [ ] 그림일기 저장 → 갤러리 Pictures/방구뿡 에 보이고 공유창이 뜨는가
- [ ] 뒤로 가기: 시트가 닫히고 → 아지트 탭 → 앱이 뒤로 간다
- [ ] 상태바·내비게이션바·키보드에 화면이 가리지 않는가 (Android 15/16)
- [ ] 폰 언어를 영어로 바꾸면 영어로 보이는가
- [ ] 비행기 모드에서도 글꼴·소리·그림이 그대로인가

## 버전 올리기

`android/app/build.gradle` 의 `versionCode` (+1) 와 `versionName` 을 올린다.
일정 규칙을 바꾸면 `src/plan.js` 와 `PrankScheduler.java` 를 같이 고치고 두 테스트를 돌린다:

```bash
npm test
cd android && ./gradlew testDebugUnitTest
```
