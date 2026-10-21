"""원화 표정 그림(1024×1024 투명 PNG) → 앱용 WebP.

    python3 tools/prepare_faces.py <원화 폴더>     (Pillow)

원화 폴더: <친구>_<번호>_<표정>.png (hamster_1_blank.png …) + pixel_sunglasses.png.
모든 그림은 같은 눈 좌표를 쓴다 (1024 기준 왼눈 372,430 · 오른눈 652,430).
그래서 앱은 선글라스를 그림과 같은 비율 자리에 겹치기만 하면 된다.

결과: assets/faces/<친구>_<표정>.webp (640×640), assets/faces/sunglasses.png (도트 그대로, 잘라낸 것)
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
for char in ["hamster", "tit", "cat"]:
    for i, name in enumerate(EXPRESSIONS, 1):
        im = Image.open(os.path.join(SRC, f"{char}_{i}_{name}.png")).convert("RGBA")
        im = im.resize((SIZE, SIZE), Image.LANCZOS)
        path = os.path.join(OUT, f"{char}_{name}.webp")
        im.save(path, "WEBP", quality=86, method=6)
        print(f"{path}: {os.path.getsize(path) // 1024}KB")

sg = Image.open(os.path.join(SRC, "pixel_sunglasses.png")).convert("RGBA")
box = sg.getbbox()
sg.crop(box).save(os.path.join(OUT, "sunglasses.png"), optimize=True)
print("sunglasses box (1024 기준):", box)
