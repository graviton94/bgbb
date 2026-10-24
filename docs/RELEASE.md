# 출시 순서

## 1. 업로드 키 (한 번만) — CARPEDIEM 과 같은 방식

키는 GitHub 안에서 만들고, **암호로 잠근 파일만** 저장소에 올라간다 (`android/keystore/upload.jks.gpg`).
잠그지 않은 키와 암호는 저장소 · 채팅 · 로그 어디에도 남지 않는다.

1. 저장소 Settings → Secrets and variables → Actions 에 `ANDROID_UPLOAD_PASSPHRASE` (16자 이상) 를 넣는다.
   `SIDELOAD_PASSPHRASE` 와는 다른 값이어야 한다.
2. Actions → **Build** → Run workflow → `make_upload_key` 를 켜고 실행. 키를 만들어 잠근 뒤 그 브랜치에 커밋한다
   (로그에 공개해도 되는 인증서 SHA-256 지문만 나온다). 이미 있으면 거부한다.
3. 암호는 비밀번호 관리 앱에 따로 적어 둔다. 잃어버려도 Play 앱 서명을 쓰므로 Play Console 에서 업로드 키 재설정을 요청할 수 있다.

## 2. 서명해서 빌드하기

`Build` 워크플로가 매번 잠긴 키를 `ANDROID_UPLOAD_PASSPHRASE` 로 풀어 AAB 에 서명한다 (키스토어 · 키 암호 = 같은 값, 별칭 `upload`).
결과물 `bgbb-build` 의 `bgbb-release.aab` 가 Play 에 올릴 파일. 실행 요약에 "AAB 서명됨" 이 보이면 된다.

- 테스트용 APK (`bgbb-debug.apk`) 는 저장소의 고정 debug 키로 서명된다 (덮어 설치용, Play 와 무관).
- 예전 방식 (`BGBB_KEYSTORE_BASE64` 등 4개 비밀 값) 도 아직 읽지만 쓰지 않는다.

**내 컴퓨터에서** – `android/keystore.properties` (커밋하지 않음) 에 풀어 둔 키 경로와 암호:

```properties
storeFile=/절대/경로/upload.jks
storePassword=...
keyAlias=upload
keyPassword=...
```

```bash
gpg -d -o upload.jks android/keystore/upload.jks.gpg   # 암호 = ANDROID_UPLOAD_PASSPHRASE
cd android && ./gradlew bundleRelease
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
- [ ] "잠깐 멈춤" 중엔 아무것도 울리지 않는가
- [ ] 내 목소리 녹음 → 마이크 권한 요청 → 앱을 닫아도 알람이 그 소리를 내는가
- [ ] 속보 카드 퍼뜨리기 → 갤러리 Pictures/방구뿡 에 보이고 공유창이 뜨는가
- [ ] 첫 실행 'ㄱㄱ' 뒤 알림 권한을 묻고, 터진 뒤 소리 없는 알림이 뜨는가 (설정에서 끄면 안 뜨는가)
- [ ] 앱을 닫아 둔 사이 터진 것이 앱을 열면 터지는 화면 + 칭호로 보이는가
- [ ] 뒤로 가기: 시트·터지는 화면이 닫히고 → 홈 → 앱이 뒤로 간다
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
