"""불합격 착용 · 소품을 직접 그린다: 캐릭터와 같은 크레용 느낌 (굵고 거친 검정 외곽선 + 종이 결).

    python3 tools/draw_wear.py <출력 폴더>

1024×1024 투명 PNG. 착용은 눈 기준 왼눈 (372, 430) · 오른눈 (652, 430) (docs/skins/REORDER.md 납품 조건),
소품은 캔버스 아래쪽 가운데에 서 있게. 그 뒤 tools/prepare_skins.py 로 webp 변환.
"""
import math
import os
import sys

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..")
N = 1024
SS = 2                      # 두 배로 그려서 줄인다 (가장자리 부드럽게)
INK = (30, 28, 26)
RNG = np.random.default_rng(7)
BRUSH = os.path.join(ROOT, "assets/fonts/eastseadokdo.woff2")
GUNGSEO = os.path.join(ROOT, "assets/fonts/songmyung.woff2")


def canvas():
    return Image.new("L", (N * SS, N * SS), 0)


def noise(scale=3):
    n = RNG.random((N * SS // scale, N * SS // scale))
    return Image.fromarray((n * 255).astype(np.uint8)).resize((N * SS, N * SS), Image.BILINEAR)


def crayon(layers, line=16):
    """layers = [(마스크 L, 색 RGB)], 아래부터. 전체 모양 둘레에 거친 검정 선 + 칸마다 종이 결."""
    out = Image.new("RGBA", (N * SS, N * SS), (0, 0, 0, 0))
    union = canvas()
    for mask, color in layers:
        grain = np.array(noise(2)).astype(float) / 255
        rgb = np.array(color, float)[None, None, :] * (0.94 + 0.06 * grain[..., None])
        fill = Image.fromarray(np.dstack([rgb.clip(0, 255), np.full(grain.shape, 255)]).astype(np.uint8), "RGBA")
        out.paste(fill, (0, 0), mask)
        union = ImageChops.lighter(union, mask)
        # 칸끼리 맞닿는 곳에도 선
        edge = ImageChops.subtract(mask.filter(ImageFilter.MaxFilter(line // 2 * 2 + 1)), mask)
        out.paste(Image.new("RGBA", out.size, INK + (255,)), (0, 0), rough(edge))
    ring = ImageChops.subtract(union.filter(ImageFilter.MaxFilter(line * SS // 2 * 2 + 1)), union.filter(ImageFilter.MinFilter(5)))
    out.paste(Image.new("RGBA", out.size, INK + (255,)), (0, 0), rough(ring))
    return out.resize((N, N), Image.LANCZOS)


def rough(mask):
    """크레용 결: 가장자리를 들쭉날쭉하게, 안쪽은 군데군데 비게"""
    m = np.array(mask.filter(ImageFilter.GaussianBlur(2))).astype(float) / 255
    n = np.array(noise(2)).astype(float) / 255
    a = ((m + (n - 0.5) * 0.7) > 0.5) & (n > 0.12)
    return Image.fromarray((a * 255).astype(np.uint8))


def shape(fn):
    m = canvas()
    fn(ImageDraw.Draw(m), SS)
    return m


def line_mask(points, width):
    return shape(lambda d, s: d.line([(x * s, y * s) for x, y in points], fill=255, width=width * s, joint="curve"))


def text_layer(img, text, font_path, size, center, color, angle=0):
    f = ImageFont.truetype(font_path, size)
    layer = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    ImageDraw.Draw(layer).text(center, text, font=f, fill=color, anchor="mm")
    if angle:
        layer = layer.rotate(angle, center=center, resample=Image.BICUBIC)
    img.alpha_composite(layer)
    return img


# ---------------------------------------------------------------- 착용
def eyepatch():
    """해적 안대: 왼눈을 덮는 검정 패치 + 이마를 사선으로 넘어가는 끈 (오른눈은 안 가림)"""
    strap = ImageChops.lighter(line_mask([(330, 360), (520, 250), (900, 150)], 26), line_mask([(300, 470), (110, 560)], 26))
    patch = shape(lambda d, s: d.ellipse([(372 - 105) * s, (430 - 88) * s, (372 + 105) * s, (430 + 92) * s], fill=255))
    img = crayon([(strap, (40, 36, 34)), (patch, (24, 22, 22))])
    # 해골 무늬 (흰색 작은 것)
    d = ImageDraw.Draw(img)
    d.ellipse([350, 395, 394, 435], fill=(245, 240, 230))
    d.rectangle([360, 428, 384, 446], fill=(245, 240, 230))
    d.ellipse([358, 408, 368, 418], fill=(24, 22, 22))
    d.ellipse([376, 408, 386, 418], fill=(24, 22, 22))
    return img


def bandana():
    """필승 머리띠: 이마 높이 (y≈330) 흰 띠 + 붓글씨 필승 + 오른쪽 매듭 꼬리"""
    band = shape(lambda d, s: d.rounded_rectangle([110 * s, 268 * s, 914 * s, 392 * s], 50 * s, fill=255))
    tails = shape(lambda d, s: (d.polygon([(890 * s, 320 * s), (1010 * s, 420 * s), (950 * s, 470 * s)], fill=255),
                                d.polygon([(890 * s, 330 * s), (980 * s, 520 * s), (910 * s, 540 * s)], fill=255)))
    img = crayon([(tails, (250, 250, 246)), (band, (252, 252, 248))])
    text_layer(img, "필승", BRUSH, 150, (500, 334), (20, 20, 20), angle=3)
    d = ImageDraw.Draw(img)
    d.ellipse([640, 300, 700, 360], outline=(214, 40, 40), width=6)
    text_layer(img, "勝", GUNGSEO, 40, (670, 330), (214, 40, 40))
    return img


def mask():
    """덴탈 마스크: 코 아래 ~ 턱 (y 470~650), 주름 3줄, 귀걸이 끈은 바깥으로, B급 'KF-뿡'"""
    loops = ImageChops.lighter(shape(lambda d, s: d.arc([150 * s, 400 * s, 360 * s, 640 * s], 90, 270, fill=255, width=14 * s)),
                               shape(lambda d, s: d.arc([664 * s, 400 * s, 874 * s, 640 * s], 270, 90, fill=255, width=14 * s)))
    body = shape(lambda d, s: d.rounded_rectangle([300 * s, 468 * s, 724 * s, 652 * s], 60 * s, fill=255))
    img = crayon([(loops, (235, 240, 245)), (body, (170, 214, 236))])
    d = ImageDraw.Draw(img)
    for y in (520, 565, 610):
        d.line([(330, y), (694, y)], fill=(120, 170, 200), width=5)
    text_layer(img, "KF-뿡", GUNGSEO, 34, (512, 592), (60, 100, 140))
    return img


def gasmask():
    """방독면: 렌즈 2개 + 입 앞 필터 통 + 고무 끈, 얼굴의 70% 이하 (귀 · 머리 보이게)"""
    straps = ImageChops.lighter(line_mask([(250, 420), (130, 360)], 24), line_mask([(774, 420), (894, 360)], 24))
    face = shape(lambda d, s: d.rounded_rectangle([238 * s, 320 * s, 786 * s, 660 * s], 150 * s, fill=255))
    lens = shape(lambda d, s: [d.ellipse([(x - 92) * s, (430 - 92) * s, (x + 92) * s, (430 + 92) * s], fill=255) for x in (372, 652)])
    can = shape(lambda d, s: d.rounded_rectangle([420 * s, 560 * s, 604 * s, 760 * s], 40 * s, fill=255))
    img = crayon([(straps, (60, 60, 58)), (face, (88, 98, 84)), (lens, (60, 140, 150)), (can, (70, 72, 70))])
    d = ImageDraw.Draw(img)
    for x in (372, 652):
        d.ellipse([x - 52, 380, x - 20, 412], fill=(220, 245, 245))   # 반사광
    for i in range(4):
        d.line([(440, 600 + i * 40), (584, 600 + i * 40)], fill=(40, 40, 40), width=8)
    return img


def ribbon():
    """머리 리본: 오른쪽 귀 앞 머리 위에 빨간 물방울 리본 (머리띠 없이)"""
    cx, cy = 690, 190
    wings = shape(lambda d, s: (d.polygon([((cx - 20) * s, cy * s), ((cx - 190) * s, (cy - 110) * s), ((cx - 200) * s, (cy + 100) * s)], fill=255),
                                d.polygon([((cx + 20) * s, cy * s), ((cx + 190) * s, (cy - 110) * s), ((cx + 200) * s, (cy + 100) * s)], fill=255)))
    wings = wings.filter(ImageFilter.MaxFilter(41)).filter(ImageFilter.MinFilter(41))   # 모서리 둥글게
    knot = shape(lambda d, s: d.ellipse([(cx - 50) * s, (cy - 55) * s, (cx + 50) * s, (cy + 55) * s], fill=255))
    img = crayon([(wings, (226, 36, 48)), (knot, (200, 24, 36))])
    d = ImageDraw.Draw(img)
    for dx, dy in [(-140, -40), (-100, 40), (-160, 50), (120, -50), (150, 30), (100, 60), (-60, -10), (70, -10)]:
        d.ellipse([cx + dx - 14, cy + dy - 14, cx + dx + 14, cy + dy + 14], fill=(255, 250, 245))
    return img


# ---------------------------------------------------------------- 소품
def mic():
    """노래방 마이크: 은색 머리 + 빨간 띠 + 검정 손잡이 + 꼬불 줄, 한 덩어리로 바닥에 세움"""
    cable = line_mask([(512, 950)] + [(512 + 90 * math.sin(t / 3), 950 + t * 2) for t in range(0, 30)], 18)
    handle = shape(lambda d, s: d.polygon([(456 * s, 520 * s), (568 * s, 520 * s), (544 * s, 960 * s), (480 * s, 960 * s)], fill=255))
    band = shape(lambda d, s: d.rounded_rectangle([440 * s, 486 * s, 584 * s, 540 * s], 16 * s, fill=255))
    head = shape(lambda d, s: d.ellipse([382 * s, 230 * s, 642 * s, 500 * s], fill=255))
    img = crayon([(cable, (40, 40, 40)), (handle, (34, 34, 36)), (band, (220, 36, 44)), (head, (196, 200, 206))])
    d = ImageDraw.Draw(img)
    for i in range(-4, 5):
        d.line([(512 + i * 26, 250), (512 + i * 26, 480)], fill=(150, 154, 160), width=3)
        d.line([(400, 365 + i * 26), (624, 365 + i * 26)], fill=(150, 154, 160), width=3)
    d.ellipse([430, 260, 480, 300], fill=(245, 248, 252))
    text_layer(img, "뿡", GUNGSEO, 40, (512, 620), (230, 200, 60))
    return img


DRAW = {"wear_eyepatch": eyepatch, "wear_bandana": bandana, "wear_mask": mask, "wear_gasmask": gasmask, "wear_ribbon": ribbon, "prop_mic": mic}

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    os.makedirs(out, exist_ok=True)
    for name, fn in DRAW.items():
        img = fn()
        img.save(os.path.join(out, f"{name}.png"))
        print(name, img.getbbox())
