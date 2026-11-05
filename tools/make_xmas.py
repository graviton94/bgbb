"""크리스마스 시즌 꾸미기 (12월 한정) 그림 만들기.

    npm pack @lobehub/fluent-emoji-3d@1.1.0 && tar xzf lobehub-fluent-emoji-3d-1.1.0.tgz
    python3 tools/make_xmas.py package/assets

소품 3종 (트리 · 눈사람 · 선물상자) · 뿡 효과 (눈송이) 는 Microsoft Fluent Emoji 3D (MIT, assets/shop/LICENSE-fluent-emoji.txt),
착용 (루돌프 뿔 + 코) 은 여기서 직접 그린다 (표정 그림과 같은 640 캔버스 · 같은 눈 좌표, 코는 (320, 300) 근처),
공유 프레임은 사탕 지팡이 줄무늬 테두리 + 아래 띠 (1080×1240, 가운데 칸이 뚫려 짤이 들어감).
"""
import io
import os
import sys

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

A = sys.argv[1]
ROOT = os.path.join(os.path.dirname(__file__), "..")
SKIN = os.path.join(ROOT, "assets", "skin")


def emoji(code, size):
    return Image.open(f"{A}/{code}.webp").convert("RGBA").resize((size, size), Image.LANCZOS)


def save(im, slot, name):
    im.save(os.path.join(SKIN, slot, f"{name}.webp"), quality=90, method=6)
    print(slot, name, im.size)


# 소품: 512 캔버스 가운데, 다른 소품 (트로피 등) 과 비슷한 크기
for code, name in [("1f384", "prop_xmas_tree"), ("26c4", "prop_snowman"), ("1f381", "prop_gift")]:
    c = Image.new("RGBA", (512, 512))
    e = emoji(code, 420)
    c.alpha_composite(e, ((512 - 420) // 2, 512 - 420 - 30))
    save(c, "prop", name)

# 뿡 효과: 눈송이 (256)
c = Image.new("RGBA", (256, 256))
c.alpha_composite(emoji("2744-fe0f", 232), (12, 12))
save(c, "fx", "fx_snow")

# 착용: 루돌프 뿔 + 빨간 코 (640, 원화 굵은 검은 선 느낌)
S = 4   # 크게 그려서 줄이면 선이 부드럽다
w = Image.new("RGBA", (640 * S, 640 * S))
d = ImageDraw.Draw(w)
INK, BROWN, LIGHT = (17, 17, 17, 255), (150, 92, 48, 255), (196, 132, 78, 255)


def antler(side):
    # 머리 위 (y≈95) 에서 바깥 위로 뻗는 줄기 + 가지 둘
    bx = 320 + side * 92
    main = [(bx, 110), (bx + side * 18, 60), (bx + side * 52, 18)]
    branches = [[(bx + side * 12, 74), (bx - side * 22, 30)], [(bx + side * 34, 40), (bx + side * 82, 30)]]
    for width, color in [(34, INK), (20, BROWN)]:
        for line in [main, *branches]:
            pts = [(x * S, y * S) for x, y in line]
            d.line(pts, fill=color, width=width * S // 2, joint="curve")
            for x, y in pts:
                r = width * S // 4
                d.ellipse([x - r, y - r, x + r, y + r], fill=color)
    hx, hy = (bx + side * 40) * S, 34 * S   # 하이라이트 한 점
    d.ellipse([hx - 5 * S, hy - 5 * S, hx + 5 * S, hy + 5 * S], fill=LIGHT)


antler(-1)
antler(1)
# 빨간 코: 검은 테 → 빨강 → 반짝
cx, cy, r = 320 * S, 300 * S, 30 * S
d.ellipse([cx - r - 7 * S, cy - r - 7 * S, cx + r + 7 * S, cy + r + 7 * S], fill=INK)
d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(232, 38, 28, 255))
d.ellipse([cx - 16 * S, cy - 20 * S, cx - 2 * S, cy - 8 * S], fill=(255, 190, 180, 255))
save(w.resize((640, 640), Image.LANCZOS), "wear", "wear_rudolph")

# 공유 프레임: 사탕 지팡이 테두리 + 가운데 뚫린 칸 + 아래 띠 (글씨 · 트리 · 선물 · 눈송이)
W, H = 1080, 1240
f = Image.new("RGBA", (W, H), (200, 24, 32, 255))
fd = ImageDraw.Draw(f)
for k in range(-H, W + H, 56):   # 빨강 바탕에 흰 사선 줄무늬
    fd.polygon([(k, 0), (k + 28, 0), (k + 28 - H, H), (k - H, H)], fill=(255, 255, 255, 255))
fd.rounded_rectangle([34, 34, W - 34, H - 34], radius=40, fill=(22, 110, 60, 255))
hole = (90, 80, 990, 980)   # 900×900 정사각형 칸
fd.rounded_rectangle([hole[0] - 12, hole[1] - 12, hole[2] + 12, hole[3] + 12], radius=26, fill=(255, 255, 255, 255))
fd.rounded_rectangle(hole, radius=16, fill=(0, 0, 0, 0))
# 글씨: Black Han Sans (앱 글꼴 woff2 → 메모리에서 ttf 로)
font_ttf = io.BytesIO()
tt = TTFont(os.path.join(ROOT, "assets", "fonts", "blackhansans.woff2"))
tt.flavor = None
tt.save(font_ttf)
font_ttf.seek(0)
big = ImageFont.truetype(font_ttf, 70)
text = "MERRY TOOT-MAS"
tw = fd.textlength(text, font=big)
for dx, dy in [(-5, 0), (5, 0), (0, -5), (0, 5), (-4, -4), (4, 4), (-4, 4), (4, -4)]:
    fd.text(((W - tw) / 2 + dx, 1068 + dy), text, font=big, fill=(17, 17, 17, 255))
fd.text(((W - tw) / 2, 1068), text, font=big, fill=(255, 214, 0, 255))
f.alpha_composite(emoji("1f384", 150), (58, 1030))
f.alpha_composite(emoji("1f381", 130), (W - 190, 1048))
for code, size, x, y in [("2744-fe0f", 90, 40, 40), ("2744-fe0f", 70, W - 120, 46), ("1f514", 96, W - 130, 880), ("2b50", 70, 50, 900)]:
    f.alpha_composite(emoji(code, size), (x, y))
save(f, "frame", "frame_xmas")
