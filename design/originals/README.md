# 에셋 원본 올리는 곳

새 그림 원본 (PNG) 은 여기에 올린다: `design/originals/<slot>/<id>.png` (예: `design/originals/wear/wear_crown.png`).
이 폴더는 앱에 안 들어간다 (앱에는 `assets/` 만 들어감). 원본을 올리면 Claude 가 크기 · 누끼를 맞춰 webp 로 바꿔
`assets/skin/<slot>/` 에 넣는다 (`tools/prepare_skins.py`).

`assets/` 에 원본을 바로 올리면 APK 에 그대로 들어가 용량이 커진다 (원본은 개당 수 MB).

예전에 main 에 올렸던 원본 (v1 시절, 약 107MB) 은 git 기록에 그대로 있다: 커밋 `013935f`
(예: `git show 013935f:assets/skin/wear/wear_crown.png > crown.png`).
