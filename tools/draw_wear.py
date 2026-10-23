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
    # 끈은 머리 테두리 바로 안쪽에서 끝난다 (머리 뒤로 넘어가는 느낌). 이마 높이 머리 폭 x 187~835, 눈 높이 x 144~878
    curve = [(450 + 340 * t, 372 - 150 * t + 60 * t * (1 - t)) for t in [i / 12 for i in range(13)]]
    strap = ImageChops.lighter(line_mask(curve, 22), line_mask([(272, 446), (168, 458)], 22))
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
    # 귀걸이 끈: 마스크 위 · 아래 모서리에서 양옆 머리 테두리 (귀 자리) 한 점으로 모이는 V
    loops = canvas()
    for side in (1, -1):
        cx = 512 + side * 212
        ear = (512 + side * 350, 440)
        loops = ImageChops.lighter(loops, line_mask([(cx, 488), ear], 10))
        loops = ImageChops.lighter(loops, line_mask([(cx, 632), ear], 10))
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


def warning():
    """가스 주의 표지판: 노랑 삼각형 + 느낌표 + '가스 주의', 기둥 · 받침"""
    pole = shape(lambda d, s: d.rectangle([496 * s, 640 * s, 528 * s, 960 * s], fill=255))
    base = shape(lambda d, s: d.rounded_rectangle([400 * s, 930 * s, 624 * s, 990 * s], 20 * s, fill=255))
    tri = shape(lambda d, s: d.polygon([(512 * s, 170 * s), (830 * s, 700 * s), (194 * s, 700 * s)], fill=255))
    tri = tri.filter(ImageFilter.MaxFilter(31)).filter(ImageFilter.MinFilter(31))
    img = crayon([(pole, (150, 150, 150)), (base, (90, 90, 90)), (tri, (255, 214, 0))])
    text_layer(img, "!", BRUSH, 300, (512, 450), (20, 20, 20))
    text_layer(img, "가스 주의", GUNGSEO, 64, (512, 640), (20, 20, 20))
    return img


def cctv():
    """CCTV 카메라: 벽 받침 + 팔 + 흰 몸통 (렌즈 · 빨간 불), 바닥 삼각대"""
    legs = ImageChops.lighter(line_mask([(512, 700), (380, 980)], 22), line_mask([(512, 700), (644, 980)], 22))
    legs = ImageChops.lighter(legs, line_mask([(512, 700), (512, 990)], 22))
    arm = line_mask([(512, 720), (512, 520)], 30)
    body = shape(lambda d, s: d.polygon([(250 * s, 380 * s), (720 * s, 300 * s), (760 * s, 470 * s), (290 * s, 560 * s)], fill=255))
    lens = shape(lambda d, s: d.ellipse([200 * s, 400 * s, 330 * s, 560 * s], fill=255))
    img = crayon([(legs, (60, 60, 60)), (arm, (120, 120, 124)), (body, (240, 240, 236)), (lens, (40, 44, 50))])
    d = ImageDraw.Draw(img)
    d.ellipse([235, 445, 290, 505], fill=(90, 120, 160))
    d.ellipse([660, 340, 696, 376], fill=(230, 30, 30))
    text_layer(img, "REC", GUNGSEO, 40, (560, 440), (200, 30, 30), angle=9)
    return img


def chair():
    """사무실 의자: 등받이 · 방석 · 기둥 · 다섯 갈래 다리 · 바퀴"""
    legs = ImageChops.lighter(ImageChops.lighter(line_mask([(512, 880), (260, 950)], 24), line_mask([(512, 880), (764, 950)], 24)),
                              ImageChops.lighter(line_mask([(512, 880), (380, 980)], 24), line_mask([(512, 880), (644, 980)], 24)))
    wheels = shape(lambda d, s: [d.ellipse([(x - 26) * s, (y - 26) * s, (x + 26) * s, (y + 26) * s], fill=255) for x, y in [(260, 960), (764, 960), (380, 990), (644, 990)]])
    post = shape(lambda d, s: d.rectangle([494 * s, 640 * s, 530 * s, 890 * s], fill=255))
    seat = shape(lambda d, s: d.rounded_rectangle([280 * s, 560 * s, 744 * s, 680 * s], 50 * s, fill=255))
    back = shape(lambda d, s: d.rounded_rectangle([330 * s, 180 * s, 694 * s, 560 * s], 70 * s, fill=255))
    img = crayon([(legs, (60, 60, 64)), (wheels, (30, 30, 30)), (post, (150, 150, 156)), (back, (52, 56, 70)), (seat, (64, 68, 84))])
    text_layer(img, "부장님 자리", GUNGSEO, 46, (512, 360), (230, 230, 230))
    return img


def pumpkin():
    """할로윈 호박: 주황 몸 + 초록 꼭지 + 세모 눈 · 지그재그 입"""
    stem = shape(lambda d, s: d.rounded_rectangle([480 * s, 300 * s, 560 * s, 420 * s], 18 * s, fill=255))
    body = shape(lambda d, s: [d.ellipse([(x - 210) * s, 380 * s, (x + 210) * s, 960 * s], fill=255) for x in (400, 512, 624)])
    img = crayon([(stem, (60, 140, 50)), (body, (245, 130, 32))])
    d = ImageDraw.Draw(img)
    for x in (400, 624):
        d.line([(x, 420), (x, 940)], fill=(210, 100, 20), width=6)
    d.polygon([(380, 600), (440, 520), (480, 610)], fill=(40, 20, 0))
    d.polygon([(544, 610), (584, 520), (644, 600)], fill=(40, 20, 0))
    d.polygon([(330, 720), (380, 800), (430, 730), (480, 810), (544, 730), (594, 810), (644, 730), (694, 800), (700, 740), (512, 880), (320, 740)], fill=(40, 20, 0))
    return img


def yeot():
    """수능 엿: 나무 상자에 엿 두 덩이 + '수능 대박'"""
    box = shape(lambda d, s: d.rounded_rectangle([200 * s, 600 * s, 824 * s, 960 * s], 24 * s, fill=255))
    taffy = shape(lambda d, s: [d.ellipse([(x - 140) * s, 420 * s, (x + 140) * s, 680 * s], fill=255) for x in (380, 644)])
    img = crayon([(taffy, (226, 176, 110)), (box, (200, 150, 90))])
    d = ImageDraw.Draw(img)
    for x in (380, 644):
        for i in range(3):
            d.arc([x - 100, 450 + i * 40, x + 100, 560 + i * 40], 200, 340, fill=(250, 220, 170), width=6)
    text_layer(img, "수능 대박", GUNGSEO, 110, (512, 790), (200, 30, 30))
    text_layer(img, "철썩", BRUSH, 70, (800, 430), (20, 20, 20), angle=-15)
    return img


# ---------------------------------------------------------------- 뿡 효과 (날아가는 그림 하나)
def bean():
    """콩 튀김: 반질반질 콩 한 알"""
    body = shape(lambda d, s: d.ellipse([260 * s, 330 * s, 764 * s, 694 * s], fill=255))
    img = crayon([(body, (196, 140, 70))], line=26)
    d = ImageDraw.Draw(img)
    d.arc([380, 420, 640, 560], 200, 330, fill=(120, 80, 30), width=14)
    d.ellipse([340, 380, 420, 440], fill=(240, 210, 160))
    return img


def voxel():
    """복셀 구름: 네모 칸으로 쌓은 뭉게구름 (일부러 저해상도)"""
    cells = [(c, r) for r, row in enumerate(["..XXX...", ".XXXXX.X", "XXXXXXXX", "XXXXXXXX", ".XXXXXX."]) for c, ch in enumerate(row) if ch == "X"]
    m = shape(lambda d, s: [d.rectangle([(160 + c * 88) * s, (300 + r * 88) * s, (160 + c * 88 + 86) * s, (300 + r * 88 + 86) * s], fill=255) for c, r in cells])
    img = crayon([(m, (196, 236, 214))], line=20)
    d = ImageDraw.Draw(img)
    for c, r in cells:
        x, y = 160 + c * 88, 300 + r * 88
        d.rectangle([x + 6, y + 6, x + 30, y + 30], fill=(235, 252, 242))
    return img


def petal():
    """벚꽃잎: 끝이 갈라진 분홍 꽃잎 한 장"""
    leaf = shape(lambda d, s: d.ellipse([330 * s, 230 * s, 694 * s, 820 * s], fill=255))
    notch = shape(lambda d, s: d.polygon([(470 * s, 200 * s), (512 * s, 300 * s), (554 * s, 200 * s)], fill=255))
    leaf = ImageChops.subtract(leaf, notch).rotate(-25, resample=Image.BICUBIC, center=(N * SS / 2, N * SS / 2))
    img = crayon([(leaf, (255, 184, 206))], line=20)
    d = ImageDraw.Draw(img)
    d.line([(512, 760), (560, 520)], fill=(240, 130, 160), width=8)
    return img


DRAW = {"wear_eyepatch": eyepatch, "wear_bandana": bandana, "wear_mask": mask, "wear_gasmask": gasmask, "wear_ribbon": ribbon, "prop_mic": mic,
        "prop_warning": warning, "prop_cctv": cctv, "prop_chair": chair, "prop_pumpkin": pumpkin, "prop_yeot": yeot,
        "fx_beans_1": bean, "fx_pixel_1": voxel, "fx_petals_1": petal}

if __name__ == "__main__":
    if len(sys.argv) > 2:
        DRAW = {k: v for k, v in DRAW.items() if k in sys.argv[2:]}
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    os.makedirs(out, exist_ok=True)
    for name, fn in DRAW.items():
        img = fn()
        img.save(os.path.join(out, f"{name}.png"))
        print(name, img.getbbox())
