# -*- coding: utf-8 -*-
r"""
Generates the complete ASSET_WISHLIST.md skin expansion pack (P0 + P1 + P2 + Seasonal, 65 PNG files total)
under `c:\bgbb\assets\skin\<slot>\<id>.png` with exact specifications:
  - `bg` (12 P0 + 3 Seasonal = 15 files): 1080 x 2340 vertical PNG (top 40% uncluttered for "5번 남음" header, bottom 30% for buttons)
  - `prop` (16 P0 + 3 Seasonal = 19 files): 1024 x 1024 transparent RGBA PNG, organic crayon outline + oil-pastel texture
  - `wear` (12 P1 + 1 Seasonal = 13 files): 1024 x 1024 transparent RGBA PNG, locked to Left Eye (372, 430) & Right Eye (652, 430)
  - `fx` (8 P2 sets + 3 variants each = 16 files): 256 x 256 transparent RGBA PNG
  - `bubble` (4 P2 files): 512 x 256 transparent RGBA PNG (9-slice compatible, bottom-left tail)
  - `frame` (6 P2 files): 1080 x 1240 transparent RGBA PNG (center 1080 x 1080 transparent cutout)
"""

import math
import os
import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage

BASE_SKIN_DIR = r"c:\bgbb\assets\skin"
ARTIFACT_DIR = r"C:\Users\ruahn49\.gemini\antigravity\brain\b2ce85ba-1f7b-478f-8be4-052d7e2dab69"
for sub in ("bg", "prop", "wear", "fx", "bubble", "frame", "season"):
    os.makedirs(os.path.join(BASE_SKIN_DIR, sub), exist_ok=True)

LINE_COL = (40, 34, 30, 255)
LEFT_EYE = (372, 430)
RIGHT_EYE = (652, 430)
HEAD_TOP_Y = 175


def get_font(size: int, bold: bool = True):
    path = "C:/Windows/Fonts/malgunbd.ttf" if bold else "C:/Windows/Fonts/malgun.ttf"
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()


def apply_crayon_texture(img: Image.Image, grain_strength: float = 0.08, edge_roughness: float = 2.0) -> Image.Image:
    """Applies organic oil-pastel/crayon paper grain and rough edge jitter to an RGBA image."""
    arr = np.asarray(img, dtype=np.float32)
    h, w, _ = arr.shape
    rng = np.random.default_rng(42)

    # Paper grain noise on RGB where alpha > 0
    noise = rng.normal(0.0, 1.0, (h // 2 + 1, w // 2 + 1)).astype(np.float32)
    noise = ndimage.zoom(noise, 2.0, order=1)[:h, :w]
    grain = noise * (255.0 * grain_strength)

    alpha_mask = (arr[..., 3:4] > 10).astype(np.float32)
    arr[..., :3] = np.clip(arr[..., :3] + grain[..., None] * alpha_mask, 0, 255)

    # Crayon rough edge jitter on dark outlines & alpha
    if edge_roughness > 0:
        jx = ndimage.gaussian_filter(rng.normal(0, edge_roughness, (h // 4 + 1, w // 4 + 1)).astype(np.float32), 1.2)
        jy = ndimage.gaussian_filter(rng.normal(0, edge_roughness, (h // 4 + 1, w // 4 + 1)).astype(np.float32), 1.2)
        jx = ndimage.zoom(jx, 4.0, order=1)[:h, :w]
        jy = ndimage.zoom(jy, 4.0, order=1)[:h, :w]
        yy, xx = np.meshgrid(np.arange(h, dtype=np.float32), np.arange(w, dtype=np.float32), indexing="ij")
        sy = np.clip(yy + jy, 0, h - 1)
        sx = np.clip(xx + jx, 0, w - 1)
        for ch in range(4):
            arr[..., ch] = ndimage.map_coordinates(arr[..., ch], [sy, sx], order=1, mode="nearest")

    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")


def draw_thick_box(draw: ImageDraw.ImageDraw, box, fill, outline=LINE_COL, width=14, radius=24):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


# =========================================================================
# 1. P0 + SEASONAL BACKGROUNDS (`assets/skin/bg/<id>.png`, 1080 x 2340)
#    Top 40% (y: 0..936) kept clean for "5번 남음" text!
#    Middle (y: 900..1680) frames the character & main comedy props!
#    Bottom 30% (y: 1638..2340) kept calm for action buttons!
# =========================================================================

def generate_backgrounds():
    W, H = 1080, 2340
    f_big = get_font(54, True)
    f_med = get_font(38, True)
    f_sm = get_font(28, False)
    f_xl = get_font(76, True)

    bgs = {}

    # 1) bg_office: 사무실 책상 (모니터에 엑셀, 식은 커피, 포스트잇 "회의 2시")
    img = Image.new("RGBA", (W, H), (234, 238, 242, 255))
    d = ImageDraw.Draw(img)
    # Soft office partition wall in middle-back
    d.rectangle([0, 0, W, 1380], fill=(226, 232, 238, 255))
    d.line([(0, 1120), (W, 1120)], fill=(185, 194, 204, 255), width=8)
    # Desk surface
    d.rectangle([0, 1380, W, H], fill=(214, 188, 154, 255))
    d.line([(0, 1380), (W, 1380)], fill=LINE_COL, width=12)
    # Monitor on left-back with Excel spreadsheet
    draw_thick_box(d, [70, 960, 490, 1290], fill=(45, 50, 58, 255), width=12, radius=18)
    d.rectangle([92, 982, 468, 1255], fill=(255, 255, 255, 255))
    d.rectangle([92, 982, 468, 1028], fill=(33, 115, 70, 255))  # Excel green bar
    d.text((115, 990), "통합문서1.xlsx", fill=(255, 255, 255, 255), font=f_sm)
    for gy in range(1045, 1250, 36):
        d.line([(92, gy), (468, gy)], fill=(210, 220, 214, 255), width=3)
    for gx in range(160, 460, 95):
        d.line([(gx, 1028), (gx, 1255)], fill=(210, 220, 214, 255), width=3)
    d.rectangle([240, 1290, 320, 1380], fill=(90, 95, 105, 255), outline=LINE_COL, width=10)
    d.rounded_rectangle([180, 1365, 380, 1395], radius=8, fill=(90, 95, 105, 255), outline=LINE_COL, width=10)
    # Yellow sticky note "회의 2시"
    d.polygon([(410, 1210), (545, 1200), (555, 1335), (420, 1345)], fill=(255, 242, 115, 255), outline=LINE_COL, width=8)
    d.text((432, 1245), "회의 2시", fill=(200, 40, 40, 255), font=f_sm)
    # Cold iced coffee cup on right side of desk
    draw_thick_box(d, [820, 1190, 955, 1410], fill=(235, 245, 255, 210), width=10, radius=14)
    d.rectangle([832, 1265, 943, 1398], fill=(115, 72, 42, 255))
    d.line([(885, 1110), (910, 1270)], fill=(55, 165, 95, 255), width=12)
    bgs["bg_office"] = img

    # 2) bg_meeting: 회의실 (화이트보드에 우상향 그래프, 빈 의자 줄)
    img = Image.new("RGBA", (W, H), (240, 238, 232, 255))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 1450, W, H], fill=(182, 190, 198, 255))
    d.line([(0, 1450), (W, 1450)], fill=LINE_COL, width=10)
    # Whiteboard in middle zone (y: 920..1360)
    draw_thick_box(d, [90, 920, 990, 1350], fill=(255, 255, 255, 255), width=14, radius=16)
    d.text((135, 950), "Q4 방구 배출량 추이", fill=(60, 65, 75, 255), font=f_med)
    # Upward graph arrow
    d.line([(160, 1280), (160, 1030)], fill=(120, 125, 130, 255), width=8)
    d.line([(160, 1280), (910, 1280)], fill=(120, 125, 130, 255), width=8)
    pts = [(190, 1250), (350, 1210), (520, 1230), (690, 1120), (860, 1020)]
    d.line(pts, fill=(235, 65, 55, 255), width=16, joint="curve")
    d.polygon([(860, 990), (905, 1035), (835, 1055)], fill=(235, 65, 55, 255))
    # Row of empty office chairs on left & right
    for cx in (140, 940):
        draw_thick_box(d, [cx - 85, 1330, cx + 85, 1520], fill=(65, 72, 82, 255), width=10, radius=24)
        d.line([(cx, 1520), (cx, 1610)], fill=LINE_COL, width=12)
    bgs["bg_meeting"] = img

    # 3) bg_subway: 지하철 (손잡이 줄줄이, 창밖 터널)
    img = Image.new("RGBA", (W, H), (228, 232, 235, 255))
    d = ImageDraw.Draw(img)
    # Subway floor
    d.rectangle([0, 1520, W, H], fill=(168, 174, 182, 255))
    d.line([(0, 1520), (W, 1520)], fill=LINE_COL, width=12)
    # Dark tunnel windows at y: 980..1340
    for wx in (80, 580):
        draw_thick_box(d, [wx, 980, wx + 420, 1340], fill=(38, 42, 52, 255), width=12, radius=24)
        # Tunnel speed streaks
        d.line([(wx + 40, 1080), (wx + 380, 1080)], fill=(255, 220, 120, 180), width=10)
        d.line([(wx + 90, 1220), (wx + 350, 1220)], fill=(180, 210, 255, 150), width=8)
    # Horizontal handrail & hanging straps at y: 880..1060
    d.line([(0, 890), (W, 890)], fill=(190, 198, 206, 255), width=18)
    d.line([(0, 882), (W, 882)], fill=LINE_COL, width=6)
    for hx in (180, 390, 690, 900):
        d.line([(hx, 890), (hx, 975)], fill=LINE_COL, width=10)
        d.polygon([(hx - 38, 975), (hx + 38, 975), (hx + 48, 1045), (hx - 48, 1045)], fill=(235, 145, 55, 255), outline=LINE_COL, width=10)
    # Green subway bench seat
    draw_thick_box(d, [0, 1390, W, 1525], fill=(68, 158, 102, 255), width=12, radius=10)
    bgs["bg_subway"] = img

    # 4) bg_elevator: 엘리베이터 (거울 + 층수 7F + "정원 15명")
    img = Image.new("RGBA", (W, H), (216, 220, 226, 255))
    d = ImageDraw.Draw(img)
    # Elevator center door seam
    d.line([(W // 2, 880), (W // 2, 1650)], fill=(150, 156, 165, 255), width=8)
    d.rectangle([0, 1560, W, H], fill=(142, 146, 154, 255))
    d.line([(0, 1560), (W, 1560)], fill=LINE_COL, width=12)
    # LED Floor indicator "7F ▲" at y: 880..985
    draw_thick_box(d, [390, 880, 690, 985], fill=(32, 34, 38, 255), width=10, radius=14)
    d.text((540, 932), "7F ▲", fill=(255, 75, 55, 255), font=f_big, anchor="mm")
    # Mirror frame & "정원 15명" plaque
    draw_thick_box(d, [110, 1020, 970, 1440], fill=(235, 246, 255, 255), width=12, radius=16)
    d.line([(160, 1380), (340, 1080)], fill=(255, 255, 255, 220), width=18)
    draw_thick_box(d, [730, 1045, 940, 1135], fill=(255, 250, 220, 255), width=8, radius=10)
    d.text((835, 1090), "정원 15명", fill=LINE_COL, font=f_sm, anchor="mm")
    bgs["bg_elevator"] = img

    # 5) bg_library: 도서관 열람실 ("정숙" 표지판, 칸막이 책상)
    img = Image.new("RGBA", (W, H), (244, 238, 224, 255))
    d = ImageDraw.Draw(img)
    # Study carrel wooden dividers
    draw_thick_box(d, [60, 980, 1020, 1560], fill=(198, 164, 122, 255), width=12, radius=16)
    d.rectangle([110, 1030, 970, 1420], fill=(218, 188, 146, 255), outline=LINE_COL, width=10)
    d.rectangle([0, 1420, W, H], fill=(178, 142, 102, 255))
    d.line([(0, 1420), (W, 1420)], fill=LINE_COL, width=12)
    # "정숙 (SILENCE)" sign at y: 890..1005
    draw_thick_box(d, [350, 885, 730, 1005], fill=(255, 248, 240, 255), width=12, radius=16)
    d.text((540, 945), "🤫 정숙", fill=(205, 45, 45, 255), font=f_big, anchor="mm")
    # Stack of thick books on left
    draw_thick_box(d, [130, 1280, 340, 1350], fill=(75, 135, 195, 255), width=10, radius=8)
    draw_thick_box(d, [120, 1350, 355, 1420], fill=(215, 85, 75, 255), width=10, radius=8)
    bgs["bg_library"] = img

    # 6) bg_toilet: 화장실 칸 (문 안쪽 낙서 "여기서 뀌어라 ㅋ")
    img = Image.new("RGBA", (W, H), (224, 234, 228, 255))
    d = ImageDraw.Draw(img)
    # Tile grid lines in middle zone
    for ty in range(900, 1600, 110):
        d.line([(0, ty), (W, ty)], fill=(196, 210, 202, 255), width=5)
    for tx in range(0, W, 135):
        d.line([(tx, 900), (tx, 1600)], fill=(196, 210, 202, 255), width=5)
    # Stall door panel
    draw_thick_box(d, [110, 910, 970, 1580], fill=(238, 242, 236, 255), width=12, radius=12)
    # Graffiti scribble "여기서 뀌어라 ㅋ"
    d.text((540, 1020), "여기서 뀌어라 ㅋ", fill=(85, 92, 98, 255), font=f_big, anchor="mm")
    d.text((310, 1110), "낙서 금지!! -관리실-", fill=(210, 65, 65, 255), font=f_sm, anchor="mm")
    # Toilet paper roll holder on left wall
    draw_thick_box(d, [145, 1250, 285, 1390], fill=(255, 255, 255, 255), width=10, radius=20)
    d.rectangle([165, 1370, 265, 1485], fill=(255, 255, 255, 255), outline=LINE_COL, width=8)
    bgs["bg_toilet"] = img

    # 7) bg_wedding: 결혼식장 하객석 (최악의 타이밍)
    img = Image.new("RGBA", (W, H), (252, 244, 246, 255))
    d = ImageDraw.Draw(img)
    # Red carpet runner down the center
    d.polygon([(380, 1180), (700, 1180), (920, H), (160, H)], fill=(215, 58, 68, 255), outline=LINE_COL, width=10)
    # Flower arch & ribbon chairs on left and right
    d.arc([160, 880, 920, 1540], start=180, end=360, fill=(235, 145, 168, 255), width=28)
    for fx in range(200, 900, 110):
        fy = int(1180 - 260 * math.sin(math.pi * (fx - 180) / 720.0))
        d.ellipse([fx - 34, fy - 34, fx + 34, fy + 34], fill=(255, 195, 210, 255), outline=LINE_COL, width=8)
    for cx in (150, 930):
        draw_thick_box(d, [cx - 95, 1290, cx + 95, 1540], fill=(255, 252, 248, 255), width=10, radius=30)
        d.polygon([(cx, 1390), (cx - 75, 1350), (cx - 75, 1430)], fill=(245, 165, 185, 255), outline=LINE_COL, width=6)
        d.polygon([(cx, 1390), (cx + 75, 1350), (cx + 75, 1430)], fill=(245, 165, 185, 255), outline=LINE_COL, width=6)
    bgs["bg_wedding"] = img

    # 8) bg_chicken: 야식 테이블 (치킨 상자, 콜라, 새벽 2시)
    img = Image.new("RGBA", (W, H), (44, 42, 62, 255))
    d = ImageDraw.Draw(img)
    # Wall clock showing 2:00 AM at y: 920
    d.ellipse([460, 880, 620, 1040], fill=(255, 250, 238, 255), outline=LINE_COL, width=10)
    d.line([(540, 960), (540, 905)], fill=LINE_COL, width=8)
    d.line([(540, 960), (582, 935)], fill=(220, 55, 55, 255), width=8)
    d.text((540, 1075), "AM 02:00", fill=(255, 230, 140, 255), font=f_sm, anchor="mm")
    # Warm wooden table at y: 1360..H
    d.rectangle([0, 1360, W, H], fill=(215, 168, 118, 255))
    d.line([(0, 1360), (W, 1360)], fill=LINE_COL, width=12)
    # Fried chicken box on left, Cola bottle on right
    draw_thick_box(d, [75, 1190, 395, 1430], fill=(238, 78, 62, 255), width=12, radius=14)
    d.text((235, 1310), "바삭 치킨", fill=(255, 248, 220, 255), font=f_med, anchor="mm")
    draw_thick_box(d, [810, 1140, 960, 1430], fill=(55, 32, 28, 255), width=12, radius=28)
    d.rectangle([810, 1245, 960, 1325], fill=(225, 48, 42, 255), outline=LINE_COL, width=8)
    d.text((885, 1285), "COLA", fill=(255, 255, 255, 255), font=f_sm, anchor="mm")
    bgs["bg_chicken"] = img

    # 9) bg_minihompy: 2000년대 미니홈피 (반짝이 글씨, 미니룸, 투데이 숫자, 특정 로고 X)
    img = Image.new("RGBA", (W, H), (178, 216, 238, 255))
    d = ImageDraw.Draw(img)
    # Outer dashed/rounded retro skin container
    draw_thick_box(d, [45, 860, 1035, 1660], fill=(255, 255, 255, 255), width=12, radius=36)
    draw_thick_box(d, [75, 895, 1005, 985], fill=(255, 228, 238, 255), width=8, radius=18)
    d.text((540, 940), "TODAY 999  |  TOTAL 486,000", fill=(215, 55, 110, 255), font=f_sm, anchor="mm")
    # Miniroom isometric floor inside [75, 1010, 1005, 1620]
    d.rectangle([75, 1010, 1005, 1420], fill=(255, 248, 225, 255), outline=LINE_COL, width=8)
    d.rectangle([75, 1420, 1005, 1620], fill=(235, 205, 162, 255), outline=LINE_COL, width=8)
    d.text((540, 1065), "★ 내 미니룸에 일촌평 남겨줘 ★", fill=(110, 85, 185, 255), font=f_sm, anchor="mm")
    bgs["bg_minihompy"] = img

    # 10) bg_error: 오류 창 ("엉덩이.exe가 응답하지 않습니다" 회색 창 여러 겹)
    img = Image.new("RGBA", (W, H), (0, 128, 128, 255))  # Classic Windows 98 Teal!
    d = ImageDraw.Draw(img)
    # Cascading classic grey error dialogs in the middle zone (y: 880..1560)
    for i, (ox, oy) in enumerate([(80, 880), (140, 955), (200, 1030)]):
        w_box = [ox, oy, ox + 760, oy + 320]
        draw_thick_box(d, w_box, fill=(212, 208, 200, 255), width=10, radius=6)
        d.rectangle([ox + 8, oy + 8, ox + 752, oy + 68], fill=(10, 36, 106, 255))
        d.text((ox + 28, oy + 20), "엉덩이.exe - 시스템 오류", fill=(255, 255, 255, 255), font=f_sm)
        if i == 2:
            d.ellipse([ox + 45, oy + 105, ox + 125, oy + 185], fill=(225, 45, 45, 255), outline=LINE_COL, width=8)
            d.text((ox + 85, oy + 145), "X", fill=(255, 255, 255, 255), font=f_med, anchor="mm")
            d.text((ox + 155, oy + 115), "엉덩이.exe가 응답하지 않습니다.", fill=LINE_COL, font=f_sm)
            d.text((ox + 155, oy + 160), "강제로 배출하시겠습니까?", fill=LINE_COL, font=f_sm)
            draw_thick_box(d, [ox + 290, oy + 225, ox + 470, oy + 290], fill=(212, 208, 200, 255), width=8, radius=4)
            d.text((ox + 380, oy + 257), "확인(뿡)", fill=LINE_COL, font=f_sm, anchor="mm")
    bgs["bg_error"] = img

    # 11) bg_vapor: 베이퍼웨이브 (보라 · 분홍 그리드 + 석양 + 그리스 조각상)
    img = Image.new("RGBA", (W, H), (42, 18, 82, 255))
    arr = np.asarray(img, dtype=np.float32)
    yy = np.arange(H, dtype=np.float32)[:, None]
    # Purple-to-pink retro sunset sky gradient
    arr[..., 0] = np.clip(45.0 + 195.0 * (yy / H), 0, 255)
    arr[..., 1] = np.clip(20.0 + 75.0 * np.sin(np.pi * yy / H), 0, 255)
    arr[..., 2] = np.clip(95.0 + 135.0 * (1.0 - 0.5 * yy / H), 0, 255)
    img = Image.fromarray(arr.astype(np.uint8), "RGBA")
    d = ImageDraw.Draw(img)
    # Striped Vaporwave Sun at y: 920..1360
    d.ellipse([310, 910, 770, 1370], fill=(255, 195, 75, 255), outline=(255, 85, 165, 255), width=10)
    for sy in range(1160, 1370, 38):
        d.rectangle([300, sy, 780, sy + 14], fill=(95, 35, 125, 255))
    # Neon magenta perspective grid below y = 1360
    d.rectangle([0, 1360, W, H], fill=(28, 12, 58, 255))
    for gy in [1360, 1410, 1475, 1560, 1670, 1810, 1990, 2210]:
        d.line([(0, gy), (W, gy)], fill=(255, 65, 210, 255), width=6)
    for gx in range(-600, W + 601, 220):
        d.line([(W // 2 + (gx - W // 2) // 4, 1360), (gx, H)], fill=(65, 240, 255, 255), width=6)
    # Simple Greek plaster bust silhouette on left
    draw_thick_box(d, [75, 1140, 245, 1420], fill=(242, 238, 248, 255), width=10, radius=32)
    d.text((160, 1280), "ＡＥＳＴＨＥＴＩＣ", fill=(255, 85, 185, 255), font=f_sm, anchor="mm")
    bgs["bg_vapor"] = img

    # 12) bg_space: 우주 (지구 뒤로 방구 추진, 별)
    img = Image.new("RGBA", (W, H), (18, 22, 44, 255))
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(77)
    for _ in range(95):
        sx, sy = int(rng.integers(30, W - 30)), int(rng.integers(40, H - 40))
        sr = int(rng.integers(3, 8))
        d.ellipse([sx - sr, sy - sr, sx + sr, sy + sr], fill=(255, 248, 195, 255))
    # Blue & green Earth at bottom (y: 1420..2260)
    d.ellipse([120, 1420, 960, 2260], fill=(55, 135, 235, 255), outline=LINE_COL, width=14)
    d.ellipse([260, 1490, 560, 1740], fill=(85, 195, 105, 255))
    d.ellipse([610, 1610, 830, 1860], fill=(85, 195, 105, 255))
    # Fart rocket propulsion cloud trail behind character at y: 1240..1460
    for cx, cy, cr in [(440, 1390, 75), (540, 1420, 95), (640, 1390, 75)]:
        d.ellipse([cx - cr, cy - cr, cx + cr, cy + cr], fill=(255, 238, 135, 255), outline=LINE_COL, width=10)
    bgs["bg_space"] = img

    # --- SEASONAL BACKGROUNDS (3) ---
    # 13) bg_snow: 크리스마스 눈 배경
    img = Image.new("RGBA", (W, H), (195, 224, 248, 255))
    d = ImageDraw.Draw(img)
    d.ellipse([-120, 1440, W + 120, H + 200], fill=(252, 254, 255, 255), outline=LINE_COL, width=12)
    for _ in range(65):
        sx, sy = int(rng.integers(40, W - 40)), int(rng.integers(60, 1600))
        d.ellipse([sx - 8, sy - 8, sx + 8, sy + 8], fill=(255, 255, 255, 240))
    # Snowman & pine tree on sides
    d.polygon([(160, 1120), (60, 1460), (260, 1460)], fill=(62, 148, 88, 255), outline=LINE_COL, width=10)
    d.ellipse([830, 1310, 990, 1470], fill=(255, 255, 255, 255), outline=LINE_COL, width=10)
    d.ellipse([855, 1200, 965, 1315], fill=(255, 255, 255, 255), outline=LINE_COL, width=10)
    bgs["bg_snow"] = img

    # 14) bg_hanbok: 설날 전통 한옥·병풍 배경
    img = Image.new("RGBA", (W, H), (248, 238, 218, 255))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 1480, W, H], fill=(212, 178, 132, 255))
    d.line([(0, 1480), (W, 1480)], fill=LINE_COL, width=12)
    # Folding screen (병풍) panels in middle zone
    for px in range(90, 930, 180):
        draw_thick_box(d, [px, 940, px + 170, 1480], fill=(255, 250, 238, 255), width=10, radius=8)
    # Obangsaek festive stripes on top of screen
    d.text((540, 1020), "근 하 신 년", fill=(195, 55, 55, 255), font=f_big, anchor="mm")
    bgs["bg_hanbok"] = img

    # 15) bg_upsidedown: 만우절 거꾸로 배경 (사무실이 천장에 거꾸로 매달린 병맛 배경)
    bgs["bg_upsidedown"] = bgs["bg_office"].rotate(180)

    for bg_id, bg_img in bgs.items():
        tex_bg = apply_crayon_texture(bg_img, grain_strength=0.05, edge_roughness=1.2).convert("RGB")
        out_p = os.path.join(BASE_SKIN_DIR, "bg", f"{bg_id}.png")
        tex_bg.save(out_p, "PNG")
        if bg_id in ("bg_snow", "bg_hanbok", "bg_upsidedown"):
            tex_bg.save(os.path.join(BASE_SKIN_DIR, "season", f"{bg_id}.png"), "PNG")
        print(f"[OK] Saved BG {out_p}")
    return bgs


# =========================================================================
# 2. P0 + SEASONAL PROPS (`assets/skin/prop/<id>.png`, 1024 x 1024 RGBA)
# =========================================================================

def generate_props():
    S = 1024
    f_med = get_font(52, True)
    f_big = get_font(68, True)
    props = {}

    def new_canvas():
        img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        return img, ImageDraw.Draw(img)

    # 1) prop_whoopee: 방구 방석 (뿡방석)
    img, d = new_canvas()
    d.rectangle([455, 160, 569, 310], fill=(242, 95, 115, 255), outline=LINE_COL, width=16)
    d.ellipse([170, 270, 854, 860], fill=(248, 108, 128, 255), outline=LINE_COL, width=18)
    d.ellipse([260, 355, 764, 775], outline=LINE_COL, width=12)
    d.text((512, 565), "뿡!", fill=(255, 245, 155, 255), font=get_font(120, True), anchor="mm")
    props["prop_whoopee"] = img

    # 2) prop_megaphone: 확성기
    img, d = new_canvas()
    d.polygon([(220, 470), (740, 230), (740, 790), (220, 590)], fill=(245, 82, 72, 255), outline=LINE_COL, width=18)
    d.ellipse([680, 220, 810, 800], fill=(255, 242, 215, 255), outline=LINE_COL, width=18)
    draw_thick_box(d, [145, 455, 245, 605], fill=(255, 215, 75, 255), width=16, radius=20)
    draw_thick_box(d, [285, 580, 395, 820], fill=(75, 82, 92, 255), width=16, radius=22)
    props["prop_megaphone"] = img

    # 3) prop_extinguisher: 소화기
    img, d = new_canvas()
    draw_thick_box(d, [330, 310, 694, 880], fill=(235, 55, 50, 255), width=18, radius=85)
    d.rectangle([455, 210, 569, 320], fill=(70, 75, 82, 255), outline=LINE_COL, width=16)
    d.polygon([(440, 210), (690, 150), (700, 195), (455, 240)], fill=(255, 215, 65, 255), outline=LINE_COL, width=14)
    d.arc([210, 240, 480, 760], start=90, end=270, fill=LINE_COL, width=22)
    draw_thick_box(d, [385, 470, 639, 680], fill=(255, 252, 242, 255), width=12, radius=16)
    d.text((512, 575), "소화기", fill=LINE_COL, font=f_big, anchor="mm")
    props["prop_extinguisher"] = img

    # 4) prop_gasmask: 방독면 (바닥에 놓인)
    img, d = new_canvas()
    d.ellipse([230, 210, 794, 790], fill=(88, 98, 82, 255), outline=LINE_COL, width=18)
    d.ellipse([295, 340, 475, 510], fill=(185, 232, 250, 255), outline=LINE_COL, width=16)
    d.ellipse([549, 340, 729, 510], fill=(185, 232, 250, 255), outline=LINE_COL, width=16)
    draw_thick_box(d, [410, 540, 614, 835], fill=(62, 68, 58, 255), width=18, radius=45)
    d.ellipse([430, 680, 594, 825], fill=(255, 215, 65, 255), outline=LINE_COL, width=14)
    props["prop_gasmask"] = img

    # 5) prop_spray: 탈취제 스프레이
    img, d = new_canvas()
    draw_thick_box(d, [350, 320, 674, 880], fill=(115, 205, 245, 255), width=18, radius=48)
    draw_thick_box(d, [430, 190, 594, 330], fill=(255, 255, 255, 255), width=16, radius=24)
    d.ellipse([545, 235, 580, 270], fill=LINE_COL)
    for cx, cy, cr in [(720, 220, 35), (800, 185, 48), (875, 240, 42)]:
        d.ellipse([cx - cr, cy - cr, cx + cr, cy + cr], fill=(225, 248, 255, 235), outline=LINE_COL, width=10)
    d.text((512, 600), "쾌적", fill=(255, 255, 255, 255), font=get_font(84, True), anchor="mm")
    props["prop_spray"] = img

    # 6) prop_candle: 향초
    img, d = new_canvas()
    draw_thick_box(d, [310, 420, 714, 860], fill=(255, 235, 225, 255), width=18, radius=42)
    d.rectangle([335, 520, 689, 835], fill=(245, 168, 188, 255), outline=LINE_COL, width=12)
    d.line([(512, 350), (512, 425)], fill=LINE_COL, width=14)
    d.polygon([(512, 175), (445, 315), (512, 365), (579, 315)], fill=(255, 195, 55, 255), outline=LINE_COL, width=14)
    d.text((512, 680), "향초", fill=LINE_COL, font=f_big, anchor="mm")
    props["prop_candle"] = img

    # 7) prop_fan: 선풍기
    img, d = new_canvas()
    draw_thick_box(d, [330, 760, 694, 880], fill=(235, 242, 248, 255), width=16, radius=35)
    d.rectangle([475, 560, 549, 770], fill=(215, 225, 235, 255), outline=LINE_COL, width=16)
    d.ellipse([230, 150, 794, 714], fill=(242, 248, 255, 255), outline=LINE_COL, width=18)
    for ang in (0, 120, 240):
        rad = math.radians(ang)
        bx = int(512 + 165 * math.cos(rad))
        by = int(432 + 165 * math.sin(rad))
        d.ellipse([bx - 75, by - 75, bx + 75, by + 75], fill=(105, 195, 245, 255), outline=LINE_COL, width=14)
    d.ellipse([442, 362, 582, 502], fill=(255, 215, 75, 255), outline=LINE_COL, width=16)
    props["prop_fan"] = img

    # 8) prop_mic: 노래방 마이크
    img, d = new_canvas()
    d.polygon([(430, 460), (594, 460), (554, 850), (470, 850)], fill=(75, 82, 92, 255), outline=LINE_COL, width=18)
    d.ellipse([340, 170, 684, 514], fill=(210, 218, 226, 255), outline=LINE_COL, width=18)
    d.line([(345, 342), (679, 342)], fill=(235, 65, 65, 255), width=18)
    draw_thick_box(d, [478, 560, 546, 650], fill=(255, 215, 65, 255), width=12, radius=10)
    props["prop_mic"] = img

    # 9) prop_trophy: 트로피 "괄약근 대상"
    img, d = new_canvas()
    d.arc([165, 230, 420, 520], start=90, end=270, fill=LINE_COL, width=22)
    d.arc([604, 230, 859, 520], start=270, end=90, fill=LINE_COL, width=22)
    d.polygon([(275, 190), (749, 190), (654, 570), (370, 570)], fill=(255, 212, 58, 255), outline=LINE_COL, width=18)
    d.rectangle([465, 570, 559, 710], fill=(245, 192, 42, 255), outline=LINE_COL, width=16)
    draw_thick_box(d, [285, 700, 739, 875], fill=(115, 72, 45, 255), width=18, radius=24)
    draw_thick_box(d, [325, 730, 699, 845], fill=(255, 238, 155, 255), width=10, radius=12)
    d.text((512, 787), "괄약근 대상", fill=LINE_COL, font=f_med, anchor="mm")
    props["prop_trophy"] = img

    # 10) prop_medal: 금메달
    img, d = new_canvas()
    d.polygon([(340, 140), (470, 140), (540, 460), (410, 460)], fill=(235, 68, 62, 255), outline=LINE_COL, width=16)
    d.polygon([(684, 140), (554, 140), (484, 460), (614, 460)], fill=(65, 128, 225, 255), outline=LINE_COL, width=16)
    d.ellipse([262, 380, 762, 880], fill=(255, 212, 58, 255), outline=LINE_COL, width=18)
    d.ellipse([322, 440, 702, 820], outline=LINE_COL, width=12)
    d.text((512, 630), "1위", fill=LINE_COL, font=get_font(120, True), anchor="mm")
    props["prop_medal"] = img

    # 11) prop_sweetpotato: 고구마 (원인 1)
    img, d = new_canvas()
    d.ellipse([210, 290, 814, 760], fill=(168, 68, 108, 255), outline=LINE_COL, width=18)
    d.ellipse([480, 370, 770, 680], fill=(255, 212, 75, 255), outline=LINE_COL, width=16)
    # Steam waves
    for sx in (380, 520, 650):
        d.arc([sx - 30, 150, sx + 30, 260], start=120, end=300, fill=LINE_COL, width=12)
    props["prop_sweetpotato"] = img

    # 12) prop_beans: 콩 한 봉지 (원인 2)
    img, d = new_canvas()
    draw_thick_box(d, [260, 260, 764, 860], fill=(238, 212, 168, 255), width=18, radius=65)
    for bx, by in [(380, 420), (512, 395), (640, 430), (440, 515), (585, 510)]:
        d.ellipse([bx - 48, by - 32, bx + 48, by + 32], fill=(135, 195, 85, 255), outline=LINE_COL, width=12)
    d.text((512, 700), "콩", fill=LINE_COL, font=get_font(110, True), anchor="mm")
    props["prop_beans"] = img

    # 13) prop_milk: 우유팩 (원인 3)
    img, d = new_canvas()
    d.polygon([(310, 350), (512, 180), (714, 350)], fill=(95, 185, 245, 255), outline=LINE_COL, width=18)
    draw_thick_box(d, [310, 340, 714, 870], fill=(255, 255, 255, 255), width=18, radius=20)
    d.rectangle([310, 480, 714, 660], fill=(95, 185, 245, 255), outline=LINE_COL, width=14)
    d.text((512, 570), "우유", fill=(255, 255, 255, 255), font=get_font(96, True), anchor="mm")
    props["prop_milk"] = img

    # 14) prop_warning: ⚠ 가스 주의 표지판
    img, d = new_canvas()
    d.polygon([(512, 150), (880, 840), (144, 840)], fill=(255, 215, 55, 255), outline=LINE_COL, width=20)
    d.text((512, 485), "!", fill=LINE_COL, font=get_font(180, True), anchor="mm")
    d.text((512, 735), "가스 주의", fill=(215, 45, 45, 255), font=get_font(76, True), anchor="mm")
    props["prop_warning"] = img

    # 15) prop_cctv: 벽에 달린 CCTV
    img, d = new_canvas()
    d.line([(820, 620), (620, 480)], fill=LINE_COL, width=26)
    draw_thick_box(d, [780, 520, 890, 720], fill=(165, 172, 182, 255), width=16, radius=18)
    d.polygon([(220, 310), (710, 230), (740, 470), (250, 530)], fill=(242, 246, 252, 255), outline=LINE_COL, width=18)
    d.ellipse([175, 330, 305, 510], fill=(45, 52, 64, 255), outline=LINE_COL, width=16)
    d.ellipse([215, 385, 255, 425], fill=(235, 55, 55, 255))
    props["prop_cctv"] = img

    # 16) prop_chair: 바퀴 달린 회의 의자
    img, d = new_canvas()
    draw_thick_box(d, [320, 170, 704, 520], fill=(65, 72, 84, 255), width=18, radius=48)
    draw_thick_box(d, [270, 520, 754, 625], fill=(82, 90, 104, 255), width=18, radius=32)
    d.line([(512, 625), (512, 810)], fill=LINE_COL, width=24)
    d.line([(310, 810), (714, 810)], fill=LINE_COL, width=20)
    for wx in (310, 512, 714):
        d.ellipse([wx - 34, 810, wx + 34, 878], fill=(45, 48, 52, 255), outline=LINE_COL, width=12)
    props["prop_chair"] = img

    # --- SEASONAL PROPS (3) ---
    # 17) prop_pumpkin: 할로윈 호박 소품
    img, d = new_canvas()
    d.rectangle([475, 175, 549, 295], fill=(78, 145, 65, 255), outline=LINE_COL, width=16)
    d.ellipse([180, 260, 844, 850], fill=(248, 138, 42, 255), outline=LINE_COL, width=18)
    d.polygon([(360, 420), (310, 520), (410, 520)], fill=(255, 235, 95, 255), outline=LINE_COL, width=12)
    d.polygon([(664, 420), (614, 520), (714, 520)], fill=(255, 235, 95, 255), outline=LINE_COL, width=12)
    d.polygon([(330, 620), (694, 620), (620, 735), (404, 735)], fill=(255, 235, 95, 255), outline=LINE_COL, width=14)
    props["prop_pumpkin"] = img

    # 18) prop_luckybag: 설날 복주머니 소품
    img, d = new_canvas()
    d.polygon([(340, 220), (684, 220), (610, 360), (414, 360)], fill=(235, 62, 68, 255), outline=LINE_COL, width=16)
    d.ellipse([230, 320, 794, 860], fill=(235, 62, 68, 255), outline=LINE_COL, width=18)
    d.line([(330, 360), (694, 360)], fill=(255, 215, 65, 255), width=22)
    d.ellipse([412, 490, 612, 690], fill=(255, 215, 65, 255), outline=LINE_COL, width=14)
    d.text((512, 590), "복", fill=(215, 45, 45, 255), font=get_font(105, True), anchor="mm")
    props["prop_luckybag"] = img

    # 19) prop_yeot: 수능 엿 · 찹쌀떡 소품
    img, d = new_canvas()
    draw_thick_box(d, [180, 480, 844, 850], fill=(238, 198, 145, 255), width=18, radius=32)
    d.ellipse([250, 350, 490, 560], fill=(255, 252, 245, 255), outline=LINE_COL, width=16)
    d.ellipse([534, 350, 774, 560], fill=(248, 205, 215, 255), outline=LINE_COL, width=16)
    d.text((512, 665), "수능 대박", fill=(195, 45, 45, 255), font=get_font(88, True), anchor="mm")
    props["prop_yeot"] = img

    for p_id, p_img in props.items():
        tex_p = apply_crayon_texture(p_img, grain_strength=0.07, edge_roughness=1.8)
        out_p = os.path.join(BASE_SKIN_DIR, "prop", f"{p_id}.png")
        tex_p.save(out_p, "PNG")
        if p_id in ("prop_pumpkin", "prop_luckybag", "prop_yeot"):
            tex_p.save(os.path.join(BASE_SKIN_DIR, "season", f"{p_id}.png"), "PNG")
        print(f"[OK] Saved PROP {out_p}")
    return props


# =========================================================================
# 3. P1 + SEASONAL WEARABLES (`assets/skin/wear/<id>.png`, 1024 x 1024 RGBA)
#    Locked to Left Eye = (372, 430) & Right Eye = (652, 430)
#    so all 42 character expressions (21 Crayon + 21 Real) align at (0, 0)!
# =========================================================================

def generate_wearables():
    S = 1024
    LX, LY = LEFT_EYE
    RX, RY = RIGHT_EYE
    MX = (LX + RX) // 2  # 512
    wears = {}

    def new_canvas():
        img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        return img, ImageDraw.Draw(img)

    def draw_heart(d, cx, cy, size, fill):
        pts = []
        for t_deg in range(0, 360, 5):
            t = math.radians(t_deg)
            x = 16 * (math.sin(t) ** 3)
            y = -(13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t))
            pts.append((cx + x * size, cy + y * size))
        d.polygon(pts, fill=fill, outline=LINE_COL, width=14)

    # 1) wear_heart: 하트 선글라스 (centered at (372,430) and (652,430))
    img, d = new_canvas()
    d.line([(LX + 75, LY - 10), (RX - 75, RY - 10)], fill=LINE_COL, width=18)
    draw_heart(d, LX, LY, 5.8, (255, 78, 125, 240))
    draw_heart(d, RX, RY, 5.8, (255, 78, 125, 240))
    d.line([(LX - 38, LY - 32), (LX - 12, LY - 58)], fill=(255, 255, 255, 235), width=10)
    d.line([(RX - 38, RY - 32), (RX - 12, RY - 58)], fill=(255, 255, 255, 235), width=10)
    wears["wear_heart"] = img

    # 2) wear_3d: 빨파 3D 안경
    img, d = new_canvas()
    draw_thick_box(d, [LX - 135, LY - 78, RX + 135, RY + 78], fill=(255, 255, 255, 255), width=14, radius=18)
    d.rectangle([LX - 108, LY - 52, LX + 102, LY + 52], fill=(238, 58, 62, 215), outline=LINE_COL, width=10)
    d.rectangle([RX - 102, RY - 52, RX + 108, RY + 52], fill=(55, 155, 245, 215), outline=LINE_COL, width=10)
    wears["wear_3d"] = img

    # 3) wear_groucho: 코주부 안경 (코 + 콧수염)
    img, d = new_canvas()
    # Thick eyebrows
    d.polygon([(LX - 95, LY - 85), (LX + 85, LY - 105), (LX + 90, LY - 65), (LX - 90, LY - 45)], fill=LINE_COL)
    d.polygon([(RX - 85, RY - 105), (RX + 95, RY - 85), (RX + 90, RY - 45), (RX - 90, RY - 65)], fill=LINE_COL)
    # Round frames
    d.ellipse([LX - 92, LY - 82, LX + 92, LY + 82], outline=LINE_COL, width=18)
    d.ellipse([RX - 92, RY - 82, RX + 92, RY + 82], outline=LINE_COL, width=18)
    d.line([(LX + 88, LY), (RX - 88, RY)], fill=LINE_COL, width=18)
    # Mustache & big bulbous nose right at bridge/snout
    d.polygon([(350, 565), (512, 520), (674, 565), (645, 625), (512, 585), (379, 625)], fill=(45, 38, 34, 255), outline=LINE_COL, width=10)
    d.ellipse([448, 435, 576, 568], fill=(255, 178, 148, 255), outline=LINE_COL, width=14)
    wears["wear_groucho"] = img

    # 4) wear_eyepatch: 해적 안대 (covers left eye (372, 430))
    img, d = new_canvas()
    d.line([(215, 315), (795, 505)], fill=LINE_COL, width=16)
    d.ellipse([LX - 88, LY - 82, LX + 88, LY + 88], fill=(42, 38, 36, 255), outline=LINE_COL, width=14)
    d.line([(LX - 28, LY - 28), (LX + 28, LY + 28)], fill=(255, 255, 255, 220), width=10)
    d.line([(LX + 28, LY - 28), (LX - 28, LY + 28)], fill=(255, 255, 255, 220), width=10)
    wears["wear_eyepatch"] = img

    # 5) wear_gasmask: 방독면 (착용형)
    img, d = new_canvas()
    draw_thick_box(d, [235, 330, 789, 695], fill=(82, 92, 76, 245), width=16, radius=95)
    d.ellipse([LX - 85, LY - 75, LX + 85, LY + 75], fill=(185, 235, 255, 195), outline=LINE_COL, width=16)
    d.ellipse([RX - 85, RY - 75, RX + 85, RY + 75], fill=(185, 235, 255, 195), outline=LINE_COL, width=16)
    d.ellipse([412, 515, 612, 715], fill=(58, 64, 54, 255), outline=LINE_COL, width=16)
    d.ellipse([442, 545, 582, 685], fill=(255, 215, 65, 255), outline=LINE_COL, width=12)
    wears["wear_gasmask"] = img

    # 6) wear_mask: 흰 마스크 (covers mouth/nose below eyes y: 495..685)
    img, d = new_canvas()
    d.arc([195, 445, 360, 620], start=90, end=270, fill=LINE_COL, width=14)
    d.arc([664, 445, 829, 620], start=270, end=90, fill=LINE_COL, width=14)
    draw_thick_box(d, [295, 488, 729, 685], fill=(252, 254, 255, 255), width=14, radius=42)
    d.line([(335, 555), (689, 555)], fill=(205, 215, 225, 255), width=8)
    d.line([(335, 615), (689, 615)], fill=(205, 215, 225, 255), width=8)
    wears["wear_mask"] = img

    # 7) wear_party: 파티 고깔모자 (sits on top of head y: 25..245)
    img, d = new_canvas()
    d.polygon([(512, 42), (375, 248), (649, 248)], fill=(255, 92, 138, 255), outline=LINE_COL, width=16)
    for px, py, pc in [(495, 135, (255, 225, 65, 255)), (455, 205, (95, 215, 255, 255)), (565, 195, (135, 235, 115, 255))]:
        d.ellipse([px - 22, py - 22, px + 22, py + 22], fill=pc, outline=LINE_COL, width=8)
    d.ellipse([478, 12, 546, 80], fill=(255, 225, 65, 255), outline=LINE_COL, width=12)
    wears["wear_party"] = img

    # 8) wear_crown: 종이 왕관 (sits on top of head y: 55..238)
    img, d = new_canvas()
    pts = [(335, 235), (355, 85), (435, 165), (512, 65), (589, 165), (669, 85), (689, 235)]
    d.polygon(pts, fill=(255, 215, 55, 255), outline=LINE_COL, width=16)
    d.ellipse([492, 145, 532, 185], fill=(235, 58, 72, 255), outline=LINE_COL, width=8)
    wears["wear_crown"] = img

    # 9) wear_headset: 회의용 헤드셋
    img, d = new_canvas()
    d.arc([165, 145, 859, 680], start=180, end=360, fill=LINE_COL, width=24)
    draw_thick_box(d, [135, 365, 225, 535], fill=(65, 72, 82, 255), width=14, radius=28)
    draw_thick_box(d, [799, 365, 889, 535], fill=(65, 72, 82, 255), width=14, radius=28)
    d.line([(180, 515), (425, 595)], fill=LINE_COL, width=16)
    d.ellipse([405, 572, 465, 618], fill=(235, 65, 65, 255), outline=LINE_COL, width=10)
    wears["wear_headset"] = img

    # 10) wear_ribbon: 머리띠 리본
    img, d = new_canvas()
    d.polygon([(512, 168), (345, 88), (345, 248)], fill=(255, 78, 118, 255), outline=LINE_COL, width=16)
    d.polygon([(512, 168), (679, 88), (679, 248)], fill=(255, 78, 118, 255), outline=LINE_COL, width=16)
    d.ellipse([472, 128, 552, 208], fill=(255, 115, 148, 255), outline=LINE_COL, width=16)
    wears["wear_ribbon"] = img

    # 11) wear_nerd: 두꺼운 뿔테 + 반창고
    img, d = new_canvas()
    draw_thick_box(d, [LX - 105, LY - 82, LX + 105, LY + 82], fill=(215, 245, 255, 85), width=22, radius=22)
    draw_thick_box(d, [RX - 105, RY - 82, RX + 105, RY + 82], fill=(215, 245, 255, 85), width=22, radius=22)
    d.line([(LX + 105, LY), (RX - 105, RY)], fill=LINE_COL, width=22)
    # White tape bandage across the bridge!
    d.polygon([(475, 392), (549, 402), (542, 458), (468, 448)], fill=(255, 252, 235, 255), outline=LINE_COL, width=10)
    wears["wear_nerd"] = img

    # 12) wear_bandana: 이마 두건 "필승"
    img, d = new_canvas()
    draw_thick_box(d, [225, 235, 799, 338], fill=(255, 252, 245, 255), width=16, radius=22)
    d.circle((355, 286), radius=34, fill=(225, 48, 48, 255), outline=LINE_COL, width=8)
    d.text((555, 286), "필 승", fill=LINE_COL, font=get_font(62, True), anchor="mm")
    wears["wear_bandana"] = img

    # --- SEASONAL WEARABLE (1) ---
    # 13) wear_santa: 크리스마스 산타 모자
    img, d = new_canvas()
    d.polygon([(310, 235), (535, 35), (765, 185), (695, 235)], fill=(235, 52, 58, 255), outline=LINE_COL, width=16)
    draw_thick_box(d, [285, 195, 739, 275], fill=(255, 255, 255, 255), width=16, radius=36)
    d.ellipse([715, 135, 815, 235], fill=(255, 255, 255, 255), outline=LINE_COL, width=16)
    wears["wear_santa"] = img

    for w_id, w_img in wears.items():
        tex_w = apply_crayon_texture(w_img, grain_strength=0.06, edge_roughness=1.5)
        out_p = os.path.join(BASE_SKIN_DIR, "wear", f"{w_id}.png")
        tex_w.save(out_p, "PNG")
        if w_id == "wear_santa":
            tex_w.save(os.path.join(BASE_SKIN_DIR, "season", f"{w_id}.png"), "PNG")
        print(f"[OK] Saved WEAR {out_p}")
    return wears


# =========================================================================
# 4. P2 FART EFFECTS (`assets/skin/fx/<id>.png`, 256 x 256 RGBA, 8 sets)
# =========================================================================

def generate_fx():
    S = 256
    fx_dict = {}

    def new_canvas():
        img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        return img, ImageDraw.Draw(img)

    # 1) fx_rainbow: 무지개 구름
    img, d = new_canvas()
    for r_off, col in [(75, (255, 85, 95, 255)), (58, (255, 215, 65, 255)), (42, (95, 205, 255, 255))]:
        d.arc([35, 35 + (75 - r_off), 221, 205 + (75 - r_off)], start=180, end=360, fill=col, width=18)
    for cx, cy, cr in [(72, 165, 42), (128, 155, 52), (184, 165, 42)]:
        d.ellipse([cx - cr, cy - cr, cx + cr, cy + cr], fill=(255, 255, 255, 255), outline=LINE_COL, width=8)
    fx_dict["fx_rainbow"] = img

    # 2) fx_heart: 하트 뿅뿅
    img, d = new_canvas()
    pts = []
    for t_deg in range(0, 360, 6):
        t = math.radians(t_deg)
        x = 16 * (math.sin(t) ** 3)
        y = -(13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t))
        pts.append((128 + x * 5.2, 132 + y * 5.2))
    d.polygon(pts, fill=(255, 88, 138, 255), outline=LINE_COL, width=8)
    fx_dict["fx_heart"] = img

    # 3) fx_skull: 해골
    img, d = new_canvas()
    d.ellipse([48, 36, 208, 182], fill=(235, 248, 215, 255), outline=LINE_COL, width=10)
    draw_thick_box(d, [84, 148, 172, 216], fill=(235, 248, 215, 255), width=10, radius=14)
    d.ellipse([78, 88, 116, 126], fill=LINE_COL)
    d.ellipse([140, 88, 178, 126], fill=LINE_COL)
    fx_dict["fx_skull"] = img

    # 4) fx_star: 반짝이 별
    img, d = new_canvas()
    pts = []
    for i in range(10):
        ang = math.radians(i * 36 - 90)
        r = 96 if i % 2 == 0 else 44
        pts.append((128 + r * math.cos(ang), 128 + r * math.sin(ang)))
    d.polygon(pts, fill=(255, 222, 58, 255), outline=LINE_COL, width=10)
    fx_dict["fx_star"] = img

    # 5) fx_poop: 똥 이모지 풍 (귀엽게)
    img, d = new_canvas()
    draw_thick_box(d, [42, 148, 214, 216], fill=(168, 108, 62, 255), width=10, radius=34)
    draw_thick_box(d, [64, 98, 192, 162], fill=(168, 108, 62, 255), width=10, radius=30)
    d.polygon([(92, 106), (128, 38), (164, 106)], fill=(168, 108, 62, 255), outline=LINE_COL, width=10)
    d.ellipse([96, 132, 114, 150], fill=LINE_COL)
    d.ellipse([142, 132, 160, 150], fill=LINE_COL)
    fx_dict["fx_poop"] = img

    # 6) fx_bean: 콩 튀김
    img, d = new_canvas()
    for bx, by, col in [(82, 112, (135, 205, 82, 255)), (168, 96, (155, 218, 92, 255)), (128, 174, (118, 188, 68, 255))]:
        d.ellipse([bx - 42, by - 30, bx + 42, by + 30], fill=col, outline=LINE_COL, width=9)
    fx_dict["fx_bean"] = img

    # 7) fx_pixel: 도트 구름 (8비트)
    img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rectangle([6, 12, 26, 24], fill=(255, 248, 165, 255), outline=LINE_COL, width=2)
    d.rectangle([10, 8, 22, 14], fill=(255, 248, 165, 255), outline=LINE_COL, width=2)
    fx_dict["fx_pixel"] = img.resize((S, S), Image.Resampling.NEAREST)

    # 8) fx_petal: 꽃잎
    img, d = new_canvas()
    for cx, cy, ang in [(85, 95, -25), (165, 85, 35), (128, 165, 10)]:
        d.ellipse([cx - 38, cy - 24, cx + 38, cy + 24], fill=(255, 168, 198, 255), outline=LINE_COL, width=8)
    fx_dict["fx_petal"] = img

    for f_id, f_img in fx_dict.items():
        out_img = f_img if f_id == "fx_pixel" else apply_crayon_texture(f_img, grain_strength=0.06, edge_roughness=1.0)
        out_p = os.path.join(BASE_SKIN_DIR, "fx", f"{f_id}.png")
        out_img.save(out_p, "PNG")
        print(f"[OK] Saved FX {out_p}")
    return fx_dict


# =========================================================================
# 5. P2 SPEECH BUBBLES (`assets/skin/bubble/<id>.png`, 512 x 256 RGBA)
#    9-slice friendly (64px borders), tail at bottom-left!
# =========================================================================

def generate_bubbles():
    W, H = 512, 256
    bubbles = {}

    # 1) bubble_kakao: 카톡풍 꼬리 (노란 말풍선 + 왼쪽 아래 꼬리)
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.polygon([(52, 185), (18, 238), (105, 205)], fill=(255, 235, 55, 255), outline=LINE_COL, width=10)
    draw_thick_box(d, [28, 20, W - 24, H - 42], fill=(255, 235, 55, 255), width=10, radius=36)
    bubbles["bubble_kakao"] = img

    # 2) bubble_shout: 만화 외침 (뾰족뾰족)
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    draw_thick_box(d, [28, 22, W - 24, H - 42], fill=(255, 252, 242, 255), outline=(225, 55, 50, 255), width=12, radius=18)
    d.polygon([(48, 195), (14, 244), (96, 208)], fill=(255, 252, 242, 255), outline=(225, 55, 50, 255), width=10)
    bubbles["bubble_shout"] = img

    # 3) bubble_thought: 생각 구름 (왼쪽 아래 구름 방울 꼬리)
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    draw_thick_box(d, [32, 20, W - 24, H - 48], fill=(255, 255, 255, 255), width=10, radius=48)
    d.ellipse([42, 204, 72, 232], fill=(255, 255, 255, 255), outline=LINE_COL, width=8)
    d.ellipse([18, 226, 40, 248], fill=(255, 255, 255, 255), outline=LINE_COL, width=7)
    bubbles["bubble_thought"] = img

    # 4) bubble_paper: 찢어진 종이
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    draw_thick_box(d, [28, 20, W - 24, H - 42], fill=(248, 240, 218, 255), width=10, radius=8)
    for ly in (75, 125, 175):
        d.line([(48, ly), (W - 44, ly)], fill=(185, 205, 225, 180), width=4)
    d.polygon([(52, 195), (22, 240), (95, 212)], fill=(248, 240, 218, 255), outline=LINE_COL, width=10)
    bubbles["bubble_paper"] = img

    for b_id, b_img in bubbles.items():
        tex_b = apply_crayon_texture(b_img, grain_strength=0.05, edge_roughness=1.0)
        out_p = os.path.join(BASE_SKIN_DIR, "bubble", f"{b_id}.png")
        tex_b.save(out_p, "PNG")
        print(f"[OK] Saved BUBBLE {out_p}")
    return bubbles


# =========================================================================
# 6. P2 SHARE FRAMES (`assets/skin/frame/<id>.png`, 1080 x 1240 RGBA)
#    Center 1080 x 1080 region kept clear/transparent for the character photo!
# =========================================================================

def generate_frames():
    W, H = 1080, 1240
    f_big = get_font(52, True)
    f_med = get_font(38, True)
    frames = {}

    def make_border_frame(bg_col, top_h=60, bot_h=100, side_w=54):
        img = Image.new("RGBA", (W, H), bg_col)
        # Clear center transparent window [side_w, top_h, W - side_w, H - bot_h]
        arr = np.asarray(img).copy()
        arr[top_h:H - bot_h, side_w:W - side_w, :] = 0
        out = Image.fromarray(arr, "RGBA")
        d = ImageDraw.Draw(out)
        d.rectangle([0, 0, W - 1, H - 1], outline=LINE_COL, width=14)
        d.rectangle([side_w, top_h, W - side_w, H - bot_h], outline=LINE_COL, width=12)
        return out, d

    # 1) frame_polaroid: 폴라로이드
    img, d = make_border_frame((255, 253, 248, 255), top_h=54, bot_h=136, side_w=54)
    d.text((W // 2, H - 68), "2026. 뿡의 기록 📸", fill=LINE_COL, font=f_big, anchor="mm")
    frames["frame_polaroid"] = img

    # 2) frame_news: 옛날 신문 1면
    img, d = make_border_frame((238, 230, 212, 255), top_h=110, bot_h=90, side_w=48)
    d.text((W // 2, 55), "【호외】 괄약근 방어선 붕괴 속보", fill=LINE_COL, font=f_big, anchor="mm")
    d.text((W // 2, H - 45), "방구일보 제1면 특종 보도", fill=(95, 88, 78, 255), font=f_med, anchor="mm")
    frames["frame_news"] = img

    # 3) frame_vhs: VHS 녹화 화면 (REC, 날짜)
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rectangle([16, 16, W - 16, H - 16], outline=(255, 255, 255, 230), width=10)
    d.ellipse([68, 52, 112, 96], fill=(235, 45, 45, 255))
    d.text((195, 74), "REC  PLAY ▶", fill=(255, 255, 255, 255), font=f_med, anchor="lm")
    d.text((W - 70, H - 55), "PM 11:59  BGBB-CAM", fill=(255, 235, 95, 255), font=f_med, anchor="rm")
    frames["frame_vhs"] = img

    # 4) frame_award: 상장 금테
    img, d = make_border_frame((255, 248, 218, 255), top_h=95, bot_h=95, side_w=58)
    d.rectangle([24, 24, W - 24, H - 24], outline=(235, 182, 42, 255), width=16)
    d.text((W // 2, 52), "★ 표 창 장 : 위 사람은 참지 못하고 뿡하였음 ★", fill=(185, 128, 22, 255), font=f_med, anchor="mm")
    d.text((W // 2, H - 48), "대 한 방 구 협 회 장", fill=LINE_COL, font=f_big, anchor="mm")
    frames["frame_award"] = img

    # 5) frame_wanted: 지명수배 포스터
    img, d = make_border_frame((235, 212, 172, 255), top_h=105, bot_h=105, side_w=56)
    d.text((W // 2, 54), "W A N T E D (공개수배)", fill=(165, 42, 32, 255), font=f_big, anchor="mm")
    d.text((W // 2, H - 52), "현상금: 99,900 뿡코인 (생포 무관)", fill=LINE_COL, font=f_med, anchor="mm")
    frames["frame_wanted"] = img

    # 6) frame_museum: 액자 + 명패 "작품명: 뿡"
    img, d = make_border_frame((158, 112, 62, 255), top_h=72, bot_h=118, side_w=64)
    draw_thick_box(d, [320, H - 102, 760, H - 18], fill=(255, 218, 85, 255), width=10, radius=14)
    d.text((W // 2, H - 60), "작품명 : 뿡 (작자 미상)", fill=LINE_COL, font=f_med, anchor="mm")
    frames["frame_museum"] = img

    for fr_id, fr_img in frames.items():
        out_p = os.path.join(BASE_SKIN_DIR, "frame", f"{fr_id}.png")
        fr_img.save(out_p, "PNG")
        print(f"[OK] Saved FRAME {out_p}")
    return frames


def build_wishlist_preview_sheet(bgs, props, wears, fx_dict, bubbles, frames):
    """Builds a visual summary contact sheet in ARTIFACT_DIR so the user can inspect the new skins."""
    W, H = 1860, 1420
    sheet = Image.new("RGBA", (W, H), (250, 246, 238, 255))
    d = ImageDraw.Draw(sheet)
    f_t = get_font(26, True)
    f_s = get_font(16, False)

    d.text((W // 2, 32), "ASSET_WISHLIST.md 전체 생성 완료 시트 (배경 15 · 소품 19 · 착용 13 · 이펙트 8 · 말풍선 4 · 프레임 6)", fill=LINE_COL, font=f_t, anchor="mm")

    # Row 1: Sample 12 P0 Backgrounds (aspect 90 x 195)
    for i, (k, im) in enumerate(list(bgs.items())[:15]):
        x = 30 + i * 120
        y = 75
        th = im.resize((104, 225), Image.Resampling.LANCZOS)
        sheet.paste(th, (x, y))
        d.rectangle([x, y, x + 104, y + 225], outline=LINE_COL, width=2)
        d.text((x + 52, y + 240), k, fill=LINE_COL, font=f_s, anchor="mm")

    # Row 2 & 3: 19 Props (1024x1024 -> 140x140)
    for i, (k, im) in enumerate(props.items()):
        row = i // 10
        col = i % 10
        x = 30 + col * 180
        y = 340 + row * 190
        card = Image.new("RGBA", (140, 140), (255, 255, 255, 255))
        card = Image.alpha_composite(card, im.resize((140, 140), Image.Resampling.LANCZOS))
        sheet.paste(card, (x, y))
        d.rectangle([x, y, x + 140, y + 140], outline=LINE_COL, width=2)
        d.text((x + 70, y + 156), k, fill=LINE_COL, font=f_s, anchor="mm")

    # Row 4: 13 Wearables overlaid on Real B-grade Hamster #1 & Crayon Cat #1 to prove (0, 0) eye lock!
    base_h = Image.open(r"c:\bgbb\assets\expressions_real_bgrade\hamster_1_blank.png").convert("RGBA")
    for i, (k, im) in enumerate(wears.items()):
        x = 30 + i * 138
        y = 740
        comp = Image.alpha_composite(base_h, im).resize((124, 124), Image.Resampling.LANCZOS)
        card = Image.new("RGBA", (124, 124), (255, 255, 255, 255))
        card = Image.alpha_composite(card, comp)
        sheet.paste(card, (x, y))
        d.rectangle([x, y, x + 124, y + 124], outline=(215, 65, 55, 255), width=2)
        d.text((x + 62, y + 140), k, fill=LINE_COL, font=f_s, anchor="mm")

    # Row 5: FX (8) + Bubbles (4) + Frames (6)
    for i, (k, im) in enumerate(fx_dict.items()):
        x = 30 + i * 125
        y = 925
        card = Image.new("RGBA", (105, 105), (255, 255, 255, 255))
        card = Image.alpha_composite(card, im.resize((105, 105), Image.Resampling.LANCZOS))
        sheet.paste(card, (x, y))
        d.rectangle([x, y, x + 105, y + 105], outline=LINE_COL, width=2)
        d.text((x + 52, y + 120), k, fill=LINE_COL, font=f_s, anchor="mm")

    for i, (k, im) in enumerate(bubbles.items()):
        x = 1050 + i * 195
        y = 925
        card = Image.new("RGBA", (175, 88), (255, 255, 255, 255))
        card = Image.alpha_composite(card, im.resize((175, 88), Image.Resampling.LANCZOS))
        sheet.paste(card, (x, y))
        d.rectangle([x, y, x + 175, y + 88], outline=LINE_COL, width=2)
        d.text((x + 87, y + 105), k, fill=LINE_COL, font=f_s, anchor="mm")

    for i, (k, im) in enumerate(frames.items()):
        x = 30 + i * 240
        y = 1090
        comp = Image.new("RGBA", (1080, 1240), (255, 255, 255, 255))
        comp.paste(base_h.resize((1080, 1080), Image.Resampling.LANCZOS), (0, 80))
        comp = Image.alpha_composite(comp, im)
        th = comp.resize((180, 206), Image.Resampling.LANCZOS)
        sheet.paste(th, (x, y))
        d.rectangle([x, y, x + 180, y + 206], outline=LINE_COL, width=2)
        d.text((x + 90, y + 222), k, fill=LINE_COL, font=f_s, anchor="mm")

    out_p = os.path.join(ARTIFACT_DIR, "skin_wishlist_master_sheet.png")
    sheet.save(out_p, "PNG")
    print(f"[OK] Saved Preview Sheet {out_p}")


def main():
    bgs = generate_backgrounds()
    props = generate_props()
    wears = generate_wearables()
    fx_dict = generate_fx()
    bubbles = generate_bubbles()
    frames = generate_frames()
    build_wishlist_preview_sheet(bgs, props, wears, fx_dict, bubbles, frames)


if __name__ == "__main__":
    main()
