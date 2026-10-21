"""원화 표정 그림(1024×1024 투명 PNG) → 앱용 WebP.

    python3 tools/prepare_faces.py <원화 폴더>     (Pillow)

원화 폴더: <친구>_<번호>_<표정>.png (hamster_1_blank.png …) + pixel_sunglasses.png.
모든 그림은 같은 눈 좌표를 쓴다 (1024 기준 왼눈 372,430 · 오른눈 652,430).
그래서 앱은 선글라스를 그림과 같은 비율 자리에 겹치기만 하면 된다.

    REAL=<실사 폴더> python3 tools/prepare_faces.py <원화 폴더>   (실사 사진 팩도 같이: expressions_real_bgrade)

결과: assets/faces/<친구>_<표정>.webp (640×640), assets/faces/sunglasses.png (도트 그대로, 잘라낸 것),
      assets/deco/*.webp (짤 소품: 방구 구름 · 지폐 · 머니건 · 말풍선 · 해 · 달 · 별 …)
선글라스 자리는 src/pixels.js 의 SHADES_BOX 에 1024 기준 비율로 적어 둔다.
"""
import os
import sys

from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else "."
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "faces")
SIZE = 640
EXPRESSIONS = ["blank", "eng", "shameless", "hold", "burst", "whistle", "thumbs_up"]

os.makedirs(OUT, exist_ok=True)
for char in ([] if os.environ.get("DECO_ONLY") else ["hamster", "tit", "cat"]):
    for i, name in enumerate(EXPRESSIONS, 1):
        im = Image.open(os.path.join(SRC, f"{char}_{i}_{name}.png")).convert("RGBA")
        im = im.resize((SIZE, SIZE), Image.LANCZOS)
        path = os.path.join(OUT, f"{char}_{name}.webp")
        im.save(path, "WEBP", quality=86, method=6)
        print(f"{path}: {os.path.getsize(path) // 1024}KB")

# 실사 사진 팩 (레어 이상 칭호 특전 짤). 원화와 같은 이름 · 같은 눈 좌표 → assets/faces_real
REAL = os.environ.get("REAL")
if REAL:
    REAL_OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "faces_real")
    os.makedirs(REAL_OUT, exist_ok=True)
    for char in ["hamster", "tit", "cat"]:
        for i, name in enumerate(EXPRESSIONS, 1):
            im = Image.open(os.path.join(REAL, f"{char}_{i}_{name}.png")).convert("RGBA").resize((SIZE, SIZE), Image.LANCZOS)
            im.save(os.path.join(REAL_OUT, f"{char}_{name}.webp"), "WEBP", quality=84, method=6)
    print("real:", len(os.listdir(REAL_OUT)))

# 짤 소품 (같은 원화 폴더 + props 폴더): 방구 구름 · 지폐 · 머니건 · 돈 비 · 말풍선 · 생각 풍선 · 꾸미기 소품
DECO_OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "deco")
PROPS = os.environ.get("PROPS", os.path.join(SRC, "..", "props"))
os.makedirs(DECO_OUT, exist_ok=True)
for name in ["fart_bubble", "money_bill", "money_gun", "money_rain", "speech_bubble", "thought_bubble"]:
    im = Image.open(os.path.join(SRC, f"{name}.png")).convert("RGBA").resize((512, 512), Image.LANCZOS)
    im.save(os.path.join(DECO_OUT, f"{name}.webp"), "WEBP", quality=86, method=4)
for name in ["balloon", "campfire", "cloud", "moon", "stars", "sun", "sunflower", "tree", "box", "carrot"]:
    im = Image.open(os.path.join(PROPS, f"{name}.png")).convert("RGBA").resize((384, 384), Image.LANCZOS)
    im.save(os.path.join(DECO_OUT, f"{name}.webp"), "WEBP", quality=86, method=4)
print("deco:", len(os.listdir(DECO_OUT)))

sg = Image.open(os.path.join(SRC, "pixel_sunglasses.png")).convert("RGBA")
box = sg.getbbox()
sg.crop(box).save(os.path.join(OUT, "sunglasses.png"), optimize=True)
print("sunglasses box (1024 기준):", box)
