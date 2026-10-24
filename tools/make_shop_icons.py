"""상점 · 응원하기 버튼 그림 6종: Microsoft Fluent Emoji 3D (MIT) 를 겹쳐 256px webp 로.

    npm pack @lobehub/fluent-emoji-3d@1.1.0 && tar xzf lobehub-fluent-emoji-3d-1.1.0.tgz
    python3 tools/make_shop_icons.py package/assets assets/shop
"""
import sys
from PIL import Image
A, OUT = sys.argv[1], sys.argv[2]
def e(code, size): return Image.open(f"{A}/{code}.webp").convert("RGBA").resize((size, size), Image.LANCZOS)
# (코드, 크기, x, y) 아래부터
SETS = {
  "coins_s": [("1fa99", 150, 20, 90), ("1fa99", 150, 86, 40), ("1fa99", 150, 60, 100)],
  "coins_m": [("1f4b0", 210, 23, 10), ("1fa99", 100, 0, 150), ("1fa99", 100, 156, 150)],
  "coins_l": [("1f4b8", 140, 0, 0), ("1f48e", 110, 146, 0), ("1f4b0", 200, 28, 16), ("1fa99", 96, 0, 160), ("1fa99", 96, 80, 170), ("1fa99", 96, 160, 160)],
  "tip_seeds": [("1f33b", 200, 40, 0), ("1f95c", 120, 0, 136), ("1f95c", 100, 156, 156)],
  "tip_churu": [("1f41f", 200, 10, 50), ("1f63b", 120, 136, 0)],
  "tip_feast": [("1f389", 110, 0, 0), ("1f382", 170, 60, 10), ("1f357", 130, 0, 126), ("1f35a", 130, 126, 126)],
}
for name, layers in SETS.items():
    c = Image.new("RGBA", (256, 256))
    for code, s, x, y in layers: c.alpha_composite(e(code, s), (x, y))
    c.save(f"{OUT}/{name}.webp", quality=90, method=6)
