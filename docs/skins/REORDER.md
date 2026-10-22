# 꾸미기 에셋 재발주서 (2026-10-22)

받은 에셋을 앱 얼굴(원화 21 + 실사 21)과 홈 화면에 직접 얹어서 검수했다.
불량은 앱에서 빼 두었다 (`src/items.js` 의 `PENDING`). 다시 오면 변환해서 바로 넣는다.

## 공통 납품 조건 (다시 확인)

- 투명 PNG, 배경 잔여물 0. 흰 배경 · 그림자 · 바닥 반사 · 얼룩 남기지 말 것.
- 물건 하나만. 아래 · 옆에 떨어진 줄, 점, 글자 조각 금지.
- 착용(wear)은 1024×1024 캔버스, **왼눈 (372, 430) · 오른눈 (652, 430)** 기준. 캐릭터 얼굴을 다 가리면 안 됨 (눈 · 코 중 하나는 보여야 함).
- 소품(prop)은 1024×1024, 물건이 캔버스 아래쪽 중앙에 서 있게.

---

## A. 불량 → 다시 만들어 주세요 (8)

| 파일 | 문제 | 고칠 것 |
|---|---|---|
| `wear_mask.png` | 누끼가 안 됨. 마스크 뒤 **흰 사각형 배경이 통째로** 남음 → 얼굴에 흰 네모가 붙음 | 배경 완전 투명. 마스크는 코 아래 ~ 턱 (y 470~640 부근), 귀걸이 끈은 양옆 바깥으로 |
| `wear_heart.png` | 선글라스 아래로 **흰 그림자/뿌연 반사**가 넓게 남음 → 볼에 흰 얼룩 | 그림자 · 반사 삭제, 안경테만 |
| `wear_eyepatch.png` | 안대가 **두 눈 사이(미간)** 에 있고 끈이 일자로 가로지름 → 해적이 아니라 이상한 띠 | 안대 패치를 **왼눈 (372, 430)** 에 정확히. 끈은 패치 위아래에서 **사선**으로 머리 뒤로 (오른눈은 가리지 말 것) |
| `wear_gasmask.png` | 그냥 **검은 공**. 얼굴 전체를 덮어서 캐릭터가 안 보임, 방독면으로 안 읽힘 | 방독면 모양 (렌즈 2개 + 입 앞 필터 통 1~2개 + 고무 끈). 크기는 얼굴의 70% 이하, 귀 · 머리는 보이게. 3D 초보 렌더 스타일은 유지 OK |
| `prop_gasmask.png` | 위와 같은 검은 공 | 위 방독면을 바닥에 놓인 소품 컷으로 |
| `prop_extinguisher.png` | 오른쪽 · 뒤로 **흰/보라 얼룩 배경**이 남음 | 소화기만 깨끗하게 누끼 |
| `prop_spray.png` | 오른쪽 아래 **바닥 그림자/얼룩** 잔여물 | 스프레이 캔만, 바닥 그림자 삭제 |
| `bubble_katalk.png` | 말풍선이 아니라 **노란 타원 덩어리 + 공**. 글자 들어갈 평평한 칸이 없음 | 둥근 사각 말풍선 (가운데 넓고 평평, 꼬리는 왼쪽 아래 작게). 512×256 꽉 차게, 가장자리 64px 안쪽에 글자 칸 |

## B. 아직 임시 그림 (제작 예정이라 하신 것) — 앱에서 빼 둠 (42)

지금 들어 있는 파일은 단색 벡터 자리표시라 넣지 않았다. 아래 규격 그대로 오면 된다.

- 착용 7: `wear_party` (턱끈이 입을 가로지르지 않게 — 턱 아래로), `wear_crown`, `wear_headset`, `wear_ribbon`, `wear_nerd`, `wear_bandana` ("필승" 글자 꼭 보이게, 이마 높이 y≈330), `wear_santa`
- 소품 12: `prop_candle` `prop_fan` `prop_mic` `prop_sweetpotato` `prop_beans` `prop_milk` `prop_warning` `prop_cctv` `prop_chair` `prop_pumpkin` `prop_bok` `prop_yeot`
- 배경 11: `bg_subway` `bg_elevator` `bg_library` `bg_toilet` `bg_wedding` `bg_chicken` `bg_minihompy` `bg_error` `bg_snow` `bg_hanbok` `bg_upsidedown`
- 뿡 효과 3: `fx_beans_1` `fx_pixel_1` `fx_petals_1`
- 공유 프레임 6: `frame_polaroid` `frame_newspaper` `frame_vhs` `frame_gold` `frame_wanted` `frame_museum` — **가운데 1080×1080 칸은 완전히 투명**, 프레임은 그 바깥 (1080×1240 중 남는 160px + 테두리)

## C. 합격 → 앱에 넣음 (21)

- 배경: `bg_office` `bg_meeting` `bg_vapor` `bg_space`
- 소품: `prop_whoopee` `prop_megaphone` `prop_trophy` `prop_medal` (megaphone · trophy 아래 떨어진 찌꺼기 줄은 변환할 때 자동으로 지움 — 다음부턴 없이 부탁)
- 착용: `wear_3d` `wear_groucho`
- 뿡 효과: `fx_hearts_1` `fx_sparkle_1` `fx_skull_1` `fx_rainbow_1` `fx_poop_1`
- 말풍선: `bubble_shout` `bubble_thought` `bubble_torn`

## 정리 (repo)

`assets/skin/` 에 옛 이름 파일이 같이 남아 있음 — 지워도 됨:
`fx_bean` `fx_heart` `fx_petal` `fx_pixel` `fx_poop` `fx_rainbow` `fx_skull` `fx_star` · `bubble_kakao` `bubble_paper` · `frame_award` `frame_news` · `prop_luckybag` · `season/` 폴더의 중복본 (bg 폴더와 같은 것)
