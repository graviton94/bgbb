# -*- coding: utf-8 -*-
r"""
Complete Artistic Overhaul of ASSET_WISHLIST.md Skin Expansion Pack
Generates all 65 PNG files under `c:\bgbb\assets\skin\<slot>\<id>.png` using the authentic
Hand-drawn Crayon / Oil-Pastel / B-Grade Meme Comic Engine (matching the character original art style):
  - `bg` (15 files): 1080 x 2340 vertical PNG (top 40% calm for header, bottom 30% for buttons, rich meme background art)
  - `prop` (19 files): 1024 x 1024 transparent RGBA PNG (chunky wobbly crayon contours + paper-grain wax fill)
  - `wear` (13 files): 1024 x 1024 transparent RGBA PNG (strictly anchored to Left Eye 372,430 & Right Eye 652,430)
  - `fx` (16 files): 256 x 256 transparent RGBA PNG (chunky crayon explosive comic FX)
  - `bubble` (4 files): 512 x 256 transparent RGBA PNG (9-slice compatible, bottom-left tail, wobbly comic speech bubbles)
  - `frame` (6 files): 1080 x 1240 transparent RGBA PNG (center 1080 x 1080 transparent cutout, meme frames)
"""

import math
import os
import shutil
import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage

BASE_SKIN_DIR = r"c:\bgbb\assets\skin"
ARTIFACT_DIR = r"C:\Users\ruahn49\.gemini\antigravity\brain\b2ce85ba-1f7b-478f-8be4-052d7e2dab69"
for sub in ("bg", "prop", "wear", "fx", "bubble", "frame", "season"):
    os.makedirs(os.path.join(BASE_SKIN_DIR, sub), exist_ok=True)

# Standard Eye Coordinates for Wear Alignment (1024x1024)
LEFT_EYE = (372, 430)
RIGHT_EYE = (652, 430)
HEAD_TOP_Y = 175

# Core Crayon Palette
COL_INK = (32, 28, 25, 255)
COL_INK_LIGHT = (55, 48, 44, 255)
COL_WHITE = (255, 255, 255, 255)
COL_CREAM = (254, 250, 240, 255)


class CrayonEngine:
    """Authentic organic wax-crayon and oil-pastel drawing engine for arbitrary canvas sizes."""

    def __init__(self, width: int, height: int, seed: int = 42):
        self.width = width
        self.height = height
        self.rng = np.random.default_rng(seed)
        self.img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        self.grain = self._make_paper_grain(width, height)

    def _make_paper_grain(self, w: int, h: int) -> np.ndarray:
        fine = self.rng.normal(0.0, 1.0, (h, w)).astype(np.float32)
        ch, cw = max(16, h // 4), max(16, w // 4)
        coarse_small = self.rng.normal(0.0, 1.0, (ch, cw)).astype(np.float32)
        coarse_img = Image.fromarray(((coarse_small + 3.0) / 6.0 * 255.0).clip(0, 255).astype(np.uint8))
        coarse_img = coarse_img.resize((w, h), Image.Resampling.BILINEAR)
        coarse = (np.asarray(coarse_img, dtype=np.float32) / 255.0) * 6.0 - 3.0
        return 0.55 * coarse + 0.45 * fine

    def _apply_crayon_fill(self, mask_img: Image.Image, color, roughness: float = 0.22):
        mask_np = np.asarray(mask_img, dtype=np.float32) / 255.0
        if mask_np.max() <= 0:
            return
        perturbed = mask_np + self.grain * (roughness * 1.5)
        alpha = np.clip((perturbed - 0.30) / 0.36, 0.0, 1.0) * mask_np
        r, g, b = color[:3]
        a_mult = (color[3] / 255.0) if len(color) > 3 else 1.0
        tooth = np.clip(1.0 + self.grain * 0.035, 0.92, 1.08)

        layer = np.zeros((self.height, self.width, 4), dtype=np.uint8)
        layer[..., 0] = np.clip(r * tooth, 0, 255).astype(np.uint8)
        layer[..., 1] = np.clip(g * tooth, 0, 255).astype(np.uint8)
        layer[..., 2] = np.clip(b * tooth, 0, 255).astype(np.uint8)
        layer[..., 3] = np.clip(alpha * 255.0 * a_mult, 0, 255).astype(np.uint8)
        self.img = Image.alpha_composite(self.img, Image.fromarray(layer, "RGBA"))

    def _apply_crayon_stroke_mask(self, stroke_mask: Image.Image, color=COL_INK, grain_strength: float = 0.55):
        mask_np = np.asarray(stroke_mask, dtype=np.float32) / 255.0
        if mask_np.max() <= 0:
            return
        wax = mask_np + self.grain * grain_strength * (1.0 - 0.55 * mask_np)
        alpha = np.clip((wax - 0.35) / 0.28, 0.0, 1.0)
        alpha = np.where(mask_np > 0.03, alpha, 0.0)

        r, g, b = color[:3]
        a_mult = (color[3] / 255.0) if len(color) > 3 else 1.0
        layer = np.zeros((self.height, self.width, 4), dtype=np.uint8)
        layer[..., 0] = r
        layer[..., 1] = g
        layer[..., 2] = b
        layer[..., 3] = np.clip(alpha * 255.0 * a_mult, 0, 255).astype(np.uint8)
        self.img = Image.alpha_composite(self.img, Image.fromarray(layer, "RGBA"))

    def draw_crayon_polyline(self, points, width: float = 20.0, color=COL_INK, closed: bool = False, jitter: float = 2.4):
        if len(points) < 2:
            return
        pts = list(points)
        if closed:
            pts.append(pts[0])

        mask = Image.new("L", (self.width, self.height), 0)
        draw = ImageDraw.Draw(mask)
        r_base = width / 2.0
        for i in range(len(pts) - 1):
            x0, y0 = pts[i]
            x1, y1 = pts[i + 1]
            dist = math.hypot(x1 - x0, y1 - y0)
            steps = max(2, int(dist / 2.0))
            for s in range(steps + 1):
                t = s / steps
                px = x0 + (x1 - x0) * t + self.rng.normal(0, jitter * 0.45)
                py = y0 + (y1 - y0) * t + self.rng.normal(0, jitter * 0.45)
                rad = r_base * (0.86 + 0.28 * self.rng.random())
                draw.ellipse([px - rad, py - rad, px + rad, py + rad], fill=235)
                for _ in range(2):
                    bx = px + self.rng.normal(0, r_base * 0.45)
                    by = py + self.rng.normal(0, r_base * 0.45)
                    brad = rad * 0.5
                    draw.ellipse([bx - brad, by - brad, bx + brad, by + brad], fill=165)

        mask = mask.filter(ImageFilter.GaussianBlur(radius=1.2))
        self._apply_crayon_stroke_mask(mask, color=color)

    def fill_polygon(self, points, fill_color, outline_color=COL_INK, outline_width: float = 20.0, jitter: float = 2.0):
        mask = Image.new("L", (self.width, self.height), 0)
        draw = ImageDraw.Draw(mask)
        draw.polygon(points, fill=255)
        mask = mask.filter(ImageFilter.GaussianBlur(radius=1.5))
        if fill_color is not None:
            self._apply_crayon_fill(mask, fill_color)
        if outline_width and outline_width > 0:
            self.draw_crayon_polyline(points, width=outline_width, color=outline_color, closed=True, jitter=jitter)

    def fill_wobbly_box(self, x0, y0, x1, y1, fill_color, outline_color=COL_INK, outline_width: float = 20.0, radius: float = 20.0, wobble: float = 5.0):
        """Draws a hand-drawn wobbly rounded box with organic crayon contour."""
        steps = 10
        pts = []
        # Top edge
        for i in range(steps):
            t = i / steps
            pts.append((x0 + radius + (x1 - x0 - 2 * radius) * t + self.rng.normal(0, wobble), y0 + self.rng.normal(0, wobble)))
        # Top-right corner
        for a in np.linspace(-math.pi / 2, 0, 6):
            pts.append((x1 - radius + radius * math.cos(a) + self.rng.normal(0, wobble), y0 + radius + radius * math.sin(a) + self.rng.normal(0, wobble)))
        # Right edge
        for i in range(steps):
            t = i / steps
            pts.append((x1 + self.rng.normal(0, wobble), y0 + radius + (y1 - y0 - 2 * radius) * t + self.rng.normal(0, wobble)))
        # Bottom-right corner
        for a in np.linspace(0, math.pi / 2, 6):
            pts.append((x1 - radius + radius * math.cos(a) + self.rng.normal(0, wobble), y1 - radius + radius * math.sin(a) + self.rng.normal(0, wobble)))
        # Bottom edge
        for i in range(steps):
            t = i / steps
            pts.append((x1 - radius - (x1 - x0 - 2 * radius) * t + self.rng.normal(0, wobble), y1 + self.rng.normal(0, wobble)))
        # Bottom-left corner
        for a in np.linspace(math.pi / 2, math.pi, 6):
            pts.append((x0 + radius + radius * math.cos(a) + self.rng.normal(0, wobble), y1 - radius + radius * math.sin(a) + self.rng.normal(0, wobble)))
        # Left edge
        for i in range(steps):
            t = i / steps
            pts.append((x0 + self.rng.normal(0, wobble), y1 - radius - (y1 - y0 - 2 * radius) * t + self.rng.normal(0, wobble)))
        # Top-left corner
        for a in np.linspace(math.pi, 3 * math.pi / 2, 6):
            pts.append((x0 + radius + radius * math.cos(a) + self.rng.normal(0, wobble), y0 + radius + radius * math.sin(a) + self.rng.normal(0, wobble)))

        self.fill_polygon(pts, fill_color, outline_color=outline_color, outline_width=outline_width)

    def fill_wobbly_ellipse(self, cx, cy, rx, ry, fill_color, outline_color=COL_INK, outline_width: float = 20.0, wobble: float = 4.0, angle_deg: float = 0.0, segments: int = 48):
        rad = math.radians(angle_deg)
        cos_a, sin_a = math.cos(rad), math.sin(rad)
        pts = []
        for i in range(segments):
            th = 2.0 * math.pi * i / segments
            r_rad_x = rx + self.rng.normal(0, wobble)
            r_rad_y = ry + self.rng.normal(0, wobble)
            px = r_rad_x * math.cos(th)
            py = r_rad_y * math.sin(th)
            pts.append((cx + px * cos_a - py * sin_a, cy + px * sin_a + py * cos_a))
        self.fill_polygon(pts, fill_color, outline_color=outline_color, outline_width=outline_width)

    def draw_hand_text(self, text: str, cx: float, cy: float, size: int = 48, color=COL_INK, bold: bool = True):
        """Draws text through the crayon engine with wax stroke and edge tooth."""
        font_path = "C:/Windows/Fonts/malgunbd.ttf" if bold else "C:/Windows/Fonts/malgun.ttf"
        try:
            f = ImageFont.truetype(font_path, size)
        except Exception:
            f = ImageFont.load_default()

        # Render onto a high-contrast temp canvas
        t_img = Image.new("L", (self.width, self.height), 0)
        td = ImageDraw.Draw(t_img)
        td.text((cx, cy), text, fill=255, font=f, anchor="mm")

        # Dilate slightly and blur to simulate thick waxy stroke
        t_arr = np.asarray(t_img, dtype=np.float32) / 255.0
        t_arr = ndimage.gaussian_filter(t_arr, 0.8)
        t_arr = np.clip(t_arr * 1.5, 0.0, 1.0)
        t_img = Image.fromarray((t_arr * 255.0).astype(np.uint8), "L")

        self._apply_crayon_stroke_mask(t_img, color=color, grain_strength=0.6)


def bezier_interp(p0, p1, p2, p3, steps=25):
    pts = []
    for i in range(steps + 1):
        t = i / steps
        u = 1.0 - t
        x = u**3 * p0[0] + 3 * u**2 * t * p1[0] + 3 * u * t**2 * p2[0] + t**3 * p3[0]
        y = u**3 * p0[1] + 3 * u**2 * t * p1[1] + 3 * u * t**2 * p2[1] + t**3 * p3[1]
        pts.append((x, y))
    return pts


# =========================================================================
# 1. P1 + SEASONAL WEAR ITEMS (1024x1024 Transparent RGBA PNG)
#    Strictly anchored to LEFT_EYE (372, 430) and RIGHT_EYE (652, 430)
# =========================================================================

def generate_wear_pack():
    wears = {}

    # 1) wear_heart: 하트 선글라스 (핑크/레드 굵은 크레용 테, 짙은 렌즈와 하이라이트)
    c = CrayonEngine(1024, 1024, seed=101)
    # Bridge between eyes
    c.draw_crayon_polyline(bezier_interp((435, 430), (475, 410), (549, 410), (589, 430)), width=18, color=COL_INK)
    c.draw_crayon_polyline(bezier_interp((435, 430), (475, 410), (549, 410), (589, 430)), width=12, color=(255, 85, 125, 255))
    # Temples going back
    c.draw_crayon_polyline([(250, 440), (160, 420)], width=16, color=COL_INK)
    c.draw_crayon_polyline([(774, 440), (864, 420)], width=16, color=COL_INK)

    for ex in (LEFT_EYE[0], RIGHT_EYE[0]):
        ey = LEFT_EYE[1]
        # Hand-drawn heart polygon
        r = 85.0
        heart_pts = []
        for t in np.linspace(0, 2 * math.pi, 50):
            hx = 16 * (math.sin(t) ** 3)
            hy = -(13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t))
            heart_pts.append((ex + hx * (r / 16.0), ey + 8 + hy * (r / 16.0)))
        # Dark tinted lens fill
        c.fill_polygon(heart_pts, fill_color=(45, 38, 48, 240), outline_color=(255, 65, 115, 255), outline_width=24)
        c.draw_crayon_polyline(heart_pts, width=16, color=COL_INK, closed=True)
        # Cute reflection white streak
        c.draw_crayon_polyline([(ex - 42, ey - 32), (ex - 15, ey - 58)], width=12, color=(255, 255, 255, 210))
        c.draw_crayon_polyline([(ex - 48, ey - 18), (ex - 36, ey - 32)], width=9, color=(255, 255, 255, 180))
    wears["wear_heart"] = c.img

    # 2) wear_3d: 빨파 3D 안경 (하얀 종이테에 왼쪽 빨강, 오른쪽 청록 셀로판)
    c = CrayonEngine(1024, 1024, seed=102)
    # White paper frame outer box
    c.fill_wobbly_box(240, 350, 784, 510, fill_color=(252, 250, 246, 255), outline_color=COL_INK, outline_width=20, radius=18)
    # Left eye red lens
    c.fill_wobbly_box(LEFT_EYE[0] - 78, LEFT_EYE[1] - 55, LEFT_EYE[0] + 78, LEFT_EYE[1] + 55, fill_color=(245, 45, 55, 230), outline_color=COL_INK, outline_width=14, radius=12)
    # Right eye cyan lens
    c.fill_wobbly_box(RIGHT_EYE[0] - 78, RIGHT_EYE[1] - 55, RIGHT_EYE[0] + 78, RIGHT_EYE[1] + 55, fill_color=(35, 175, 245, 230), outline_color=COL_INK, outline_width=14, radius=12)
    # Temples
    c.fill_wobbly_box(130, 390, 250, 440, fill_color=(252, 250, 246, 255), outline_color=COL_INK, outline_width=16, radius=10)
    c.fill_wobbly_box(774, 390, 894, 440, fill_color=(252, 250, 246, 255), outline_color=COL_INK, outline_width=16, radius=10)
    # Diagonal reflection streaks
    c.draw_crayon_polyline([(LEFT_EYE[0] - 40, LEFT_EYE[1] - 35), (LEFT_EYE[0] + 30, LEFT_EYE[1] + 35)], width=10, color=(255, 255, 255, 180))
    c.draw_crayon_polyline([(RIGHT_EYE[0] - 40, RIGHT_EYE[1] - 35), (RIGHT_EYE[0] + 30, RIGHT_EYE[1] + 35)], width=10, color=(255, 255, 255, 180))
    wears["wear_3d"] = c.img

    # 3) wear_groucho: 코주부 안경 (커다란 살구색 왕코 + 삐죽삐죽 숯검정 콧수염 + 동글 안경)
    c = CrayonEngine(1024, 1024, seed=103)
    # Eyeglass rims
    for ex in (LEFT_EYE[0], RIGHT_EYE[0]):
        c.fill_wobbly_ellipse(ex, LEFT_EYE[1], 75, 75, fill_color=(240, 248, 255, 120), outline_color=COL_INK, outline_width=22)
    # Bridge
    c.draw_crayon_polyline(bezier_interp((435, 430), (512, 395), (512, 395), (589, 430)), width=22, color=COL_INK)
    # Giant comical flesh nose centered between eyes and snout
    c.fill_wobbly_ellipse(512, 510, 68, 85, fill_color=(255, 188, 155, 255), outline_color=COL_INK, outline_width=22)
    # Rosy pink nose highlight
    c.fill_wobbly_ellipse(524, 490, 22, 28, fill_color=(255, 220, 205, 255), outline_color=None, outline_width=0)
    # Bushy caterpillar mustache under nose
    mustache_pts = [
        (512, 555), (460, 560), (390, 595), (370, 640), (410, 635), (465, 605),
        (512, 580),
        (559, 605), (614, 635), (654, 640), (634, 595), (564, 560)
    ]
    c.fill_polygon(mustache_pts, fill_color=(35, 30, 28, 255), outline_color=COL_INK, outline_width=18)
    # Bushy individual hair spikes
    for hx, hy in [(420, 635), (450, 620), (480, 595), (544, 595), (574, 620), (604, 635)]:
        c.draw_crayon_polyline([(hx, hy), (hx + c.rng.normal(0, 4), hy + 18)], width=8, color=COL_INK)
    wears["wear_groucho"] = c.img

    # 4) wear_eyepatch: 해적 안대 (왼쪽 눈에 까만 가죽 안대 + 해골 스케치, 끈이 머리를 감쌈)
    c = CrayonEngine(1024, 1024, seed=104)
    # Strap passing from top-left over forehead down to bottom-right
    c.draw_crayon_polyline(bezier_interp((200, 340), (372, 390), (652, 490), (820, 540)), width=16, color=COL_INK)
    # Dark eyepatch cup over LEFT_EYE
    patch_pts = [
        (LEFT_EYE[0] - 85, LEFT_EYE[1] - 65),
        (LEFT_EYE[0] + 85, LEFT_EYE[1] - 55),
        (LEFT_EYE[0] + 70, LEFT_EYE[1] + 75),
        (LEFT_EYE[0] - 70, LEFT_EYE[1] + 70),
    ]
    c.fill_polygon(patch_pts, fill_color=(38, 34, 32, 255), outline_color=COL_INK, outline_width=22)
    # White skull & crossbones doodle on eyepatch
    c.fill_wobbly_ellipse(LEFT_EYE[0], LEFT_EYE[1] - 10, 24, 20, fill_color=COL_WHITE, outline_color=COL_INK, outline_width=8)
    c.draw_crayon_polyline([(LEFT_EYE[0] - 7, LEFT_EYE[1] - 8), (LEFT_EYE[0] - 7, LEFT_EYE[1] - 2)], width=5, color=COL_INK)
    c.draw_crayon_polyline([(LEFT_EYE[0] + 7, LEFT_EYE[1] - 8), (LEFT_EYE[0] + 7, LEFT_EYE[1] - 2)], width=5, color=COL_INK)
    c.draw_crayon_polyline([(LEFT_EYE[0] - 22, LEFT_EYE[1] + 16), (LEFT_EYE[0] + 22, LEFT_EYE[1] + 16)], width=8, color=COL_WHITE)
    wears["wear_eyepatch"] = c.img

    # 5) wear_gasmask: 방독면 (동글뱅이 고글 렌즈 2개 + 아래 둥근 정화통과 주름 호스)
    c = CrayonEngine(1024, 1024, seed=105)
    # Rubber hood rim around snout/eyes
    hood_pts = [
        (260, 420), (340, 310), (512, 290), (684, 310), (764, 420),
        (740, 620), (620, 680), (512, 690), (404, 680), (284, 620)
    ]
    c.fill_polygon(hood_pts, fill_color=(72, 85, 78, 240), outline_color=COL_INK, outline_width=24)
    # Goggles over both eyes
    for ex in (LEFT_EYE[0], RIGHT_EYE[0]):
        c.fill_wobbly_ellipse(ex, LEFT_EYE[1], 72, 72, fill_color=(195, 235, 245, 240), outline_color=(45, 52, 48, 255), outline_width=22)
        c.draw_crayon_polyline(bezier_interp((ex - 35, LEFT_EYE[1] - 35), (ex - 15, LEFT_EYE[1] - 15), (ex + 10, LEFT_EYE[1] + 10), (ex + 30, LEFT_EYE[1] + 30)), width=10, color=(255, 255, 255, 190))
    # Snout respirator canister at bottom-center
    c.fill_wobbly_ellipse(512, 595, 75, 75, fill_color=(52, 60, 56, 255), outline_color=COL_INK, outline_width=22)
    c.fill_wobbly_ellipse(512, 595, 45, 45, fill_color=(38, 44, 40, 255), outline_color=COL_INK, outline_width=14)
    # Air grill slats
    for dy in (-16, 0, 16):
        c.draw_crayon_polyline([(485, 595 + dy), (539, 595 + dy)], width=8, color=(145, 160, 150, 255))
    wears["wear_gasmask"] = c.img

    # 6) wear_mask: 흰 마스크 (덴탈 마스크 주름과 귀걸이 고무줄, 가운데 '뿡' 도장 낙서)
    c = CrayonEngine(1024, 1024, seed=106)
    # Ear loops extending outwards
    c.draw_crayon_polyline(bezier_interp((280, 530), (190, 510), (190, 600), (290, 620)), width=14, color=COL_INK)
    c.draw_crayon_polyline(bezier_interp((744, 530), (834, 510), (834, 600), (734, 620)), width=14, color=COL_INK)
    # Mask pleated fabric body covering snout/mouth below eyes
    c.fill_wobbly_box(290, 485, 734, 675, fill_color=(252, 252, 254, 250), outline_color=COL_INK, outline_width=22, radius=32)
    # Pleat lines
    c.draw_crayon_polyline([(310, 545), (714, 545)], width=10, color=(195, 205, 215, 255))
    c.draw_crayon_polyline([(310, 610), (714, 610)], width=10, color=(195, 205, 215, 255))
    # Hilarious crayon stamp in center "뿡"
    c.draw_hand_text("뿡", 512, 578, size=64, color=(245, 75, 75, 230), bold=True)
    wears["wear_mask"] = c.img

    # 7) wear_party: 파티 고깔모자 (머리 위에 얹힌 알록달록 줄무늬 고깔 + 꼭대기 방울 + 턱 끈)
    c = CrayonEngine(1024, 1024, seed=107)
    # Chin elastic string
    c.draw_crayon_polyline(bezier_interp((360, 280), (330, 480), (694, 480), (664, 280)), width=12, color=COL_INK)
    # Cone body
    cone_pts = [(512, 45), (370, 285), (654, 285)]
    c.fill_polygon(cone_pts, fill_color=(255, 225, 75, 255), outline_color=COL_INK, outline_width=22)
    # Colorful diagonal crayon stripes
    for p0, p1, col in [
        ((475, 110), (430, 185), (255, 95, 125, 255)),
        ((549, 110), (490, 215), (85, 185, 255, 255)),
        ((400, 240), (560, 250), (145, 225, 85, 255)),
    ]:
        c.draw_crayon_polyline([p0, p1], width=28, color=col)
    c.draw_crayon_polyline(cone_pts, width=22, color=COL_INK, closed=True)
    # Fluffy pom-pom at top
    c.fill_wobbly_ellipse(512, 42, 38, 38, fill_color=(255, 95, 125, 255), outline_color=COL_INK, outline_width=18)
    wears["wear_party"] = c.img

    # 8) wear_crown: 종이 왕관 (버거킹 스타일 삐죽삐죽 3봉우리 황금 왕관 + 보석 낙서)
    c = CrayonEngine(1024, 1024, seed=108)
    crown_pts = [
        (330, 280), (330, 150), (420, 220), (512, 90), (604, 220), (694, 150), (694, 280)
    ]
    c.fill_polygon(crown_pts, fill_color=(255, 215, 60, 255), outline_color=COL_INK, outline_width=22)
    # Base band stripe
    c.draw_crayon_polyline([(330, 250), (694, 250)], width=14, color=(235, 175, 30, 255))
    # Jeweled studs (ruby, emerald, sapphire)
    c.fill_wobbly_ellipse(512, 180, 22, 22, fill_color=(245, 55, 75, 255), outline_color=COL_INK, outline_width=10)
    c.fill_wobbly_ellipse(420, 235, 16, 16, fill_color=(65, 185, 245, 255), outline_color=COL_INK, outline_width=10)
    c.fill_wobbly_ellipse(604, 235, 16, 16, fill_color=(95, 215, 75, 255), outline_color=COL_INK, outline_width=10)
    wears["wear_crown"] = c.img

    # 9) wear_headset: 회의용 헤드셋 (게이머/콜센터 헤드폰 + 입가로 구부러진 붐 마이크)
    c = CrayonEngine(1024, 1024, seed=109)
    # Arching padded band over head
    c.draw_crayon_polyline(bezier_interp((260, 420), (280, 130), (744, 130), (764, 420)), width=32, color=COL_INK)
    c.draw_crayon_polyline(bezier_interp((270, 410), (290, 145), (734, 145), (754, 410)), width=18, color=(75, 145, 235, 255))
    # Left and right chunky earcups
    for ex in (255, 769):
        c.fill_wobbly_ellipse(ex, 420, 52, 75, fill_color=(45, 50, 58, 255), outline_color=COL_INK, outline_width=22)
        c.fill_wobbly_ellipse(ex, 420, 28, 45, fill_color=(75, 145, 235, 255), outline_color=COL_INK, outline_width=12)
    # Flexible mic boom curling from left earcup toward mouth
    c.draw_crayon_polyline(bezier_interp((255, 450), (260, 580), (430, 590), (475, 560)), width=16, color=COL_INK)
    # Mic foam head
    c.fill_wobbly_ellipse(485, 555, 22, 18, fill_color=(35, 38, 42, 255), outline_color=COL_INK, outline_width=12)
    wears["wear_headset"] = c.img

    # 10) wear_ribbon: 머리띠 리본 (머리 위 커다란 빨간 땡땡이 리본)
    c = CrayonEngine(1024, 1024, seed=110)
    # Hairband arch
    c.draw_crayon_polyline(bezier_interp((310, 310), (410, 190), (614, 190), (714, 310)), width=16, color=COL_INK)
    # Left bow wing
    bow_l = [(512, 190), (330, 120), (310, 230), (512, 205)]
    c.fill_polygon(bow_l, fill_color=(255, 65, 85, 255), outline_color=COL_INK, outline_width=22)
    # Right bow wing
    bow_r = [(512, 190), (694, 120), (714, 230), (512, 205)]
    c.fill_polygon(bow_r, fill_color=(255, 65, 85, 255), outline_color=COL_INK, outline_width=22)
    # Center bow knot
    c.fill_wobbly_ellipse(512, 200, 32, 28, fill_color=(235, 45, 65, 255), outline_color=COL_INK, outline_width=18)
    # White polka dots on wings
    for px, py in [(375, 175), (435, 160), (410, 205), (649, 175), (589, 160), (614, 205)]:
        c.fill_wobbly_ellipse(px, py, 14, 14, fill_color=COL_WHITE, outline_color=None, outline_width=0)
    wears["wear_ribbon"] = c.img

    # 11) wear_nerd: 두꺼운 뿔테 + 가운데 반창고 (동그란 뿔테 안경에 뺑뺑이 도수선, 브릿지에 X자 반창고)
    c = CrayonEngine(1024, 1024, seed=111)
    # Thick black rims around eyes
    for ex in (LEFT_EYE[0], RIGHT_EYE[0]):
        c.fill_wobbly_ellipse(ex, LEFT_EYE[1], 80, 80, fill_color=(245, 250, 255, 100), outline_color=(32, 28, 25, 255), outline_width=28)
        # Swirly spiral daze marks inside glass
        spiral = []
        for a in np.linspace(0, 3.5 * math.pi, 25):
            r = a * 10.0
            spiral.append((ex + r * math.cos(a), LEFT_EYE[1] + r * math.sin(a)))
        c.draw_crayon_polyline(spiral, width=8, color=(145, 165, 185, 220))
    # Bridge between rims
    c.draw_crayon_polyline([(LEFT_EYE[0] + 65, LEFT_EYE[1]), (RIGHT_EYE[0] - 65, LEFT_EYE[1])], width=26, color=COL_INK)
    # Bandage wrapped around bridge
    c.fill_wobbly_box(475, LEFT_EYE[1] - 22, 549, LEFT_EYE[1] + 22, fill_color=(245, 220, 175, 255), outline_color=COL_INK, outline_width=12, radius=8)
    c.draw_crayon_polyline([(485, LEFT_EYE[1] - 14), (539, LEFT_EYE[1] + 14)], width=8, color=(215, 65, 65, 255))
    c.draw_crayon_polyline([(485, LEFT_EYE[1] + 14), (539, LEFT_EYE[1] - 14)], width=8, color=(215, 65, 65, 255))
    wears["wear_nerd"] = c.img

    # 12) wear_bandana: 이마 두건 "필승" (하얀 헤드밴드에 크레용 붓글씨 '필승' + 옆으로 펄럭이는 끈)
    c = CrayonEngine(1024, 1024, seed=112)
    # Tails fluttering on right side
    tail_pts1 = [(760, 310), (875, 275), (860, 335), (750, 345)]
    c.fill_polygon(tail_pts1, fill_color=(252, 252, 250, 255), outline_color=COL_INK, outline_width=18)
    tail_pts2 = [(750, 330), (895, 360), (870, 420), (740, 370)]
    c.fill_polygon(tail_pts2, fill_color=(252, 252, 250, 255), outline_color=COL_INK, outline_width=18)
    # Main headband across forehead (y: 280..365)
    band_pts = bezier_interp((240, 330), (370, 290), (654, 290), (770, 330))
    band_pts_bot = bezier_interp((770, 395), (654, 355), (370, 355), (240, 395))
    c.fill_polygon(band_pts + band_pts_bot, fill_color=(254, 254, 252, 255), outline_color=COL_INK, outline_width=22)
    # Korean brush text: "필 승"
    c.draw_hand_text("필  승", 512, 338, size=52, color=(225, 45, 45, 255), bold=True)
    wears["wear_bandana"] = c.img

    # 13) wear_santa (Seasonal): 산타 모자 (머리 위로 푹신하게 얹힌 빨간 털모자 + 하얀 털 트리밍)
    c = CrayonEngine(1024, 1024, seed=113)
    santa_pts = bezier_interp((310, 260), (360, 100), (620, 60), (740, 140)) + [(760, 190), (690, 240)] + bezier_interp((690, 240), (520, 200), (410, 220), (310, 260))
    c.fill_polygon(santa_pts, fill_color=(235, 45, 55, 255), outline_color=COL_INK, outline_width=22)
    # Fluffy white brim band
    c.fill_wobbly_box(280, 230, 744, 305, fill_color=COL_WHITE, outline_color=COL_INK, outline_width=20, radius=28)
    # Fluffy pom-pom dangling on right
    c.fill_wobbly_ellipse(760, 190, 42, 42, fill_color=COL_WHITE, outline_color=COL_INK, outline_width=18)
    wears["wear_santa"] = c.img

    return wears


# =========================================================================
# 2. P0 + SEASONAL PROPS (1024x1024 Transparent RGBA PNG)
#    Pure hand-drawn crayon linework + oil pastel grain fills
# =========================================================================

def generate_prop_pack():
    props = {}

    # 1) prop_whoopee: 방구 방석 (뿡방석) - 찌그러진 고무 방석과 주둥이 바람
    c = CrayonEngine(1024, 1024, seed=201)
    # Cushion round belly
    c.fill_wobbly_ellipse(512, 540, 290, 200, fill_color=(255, 145, 155, 255), outline_color=COL_INK, outline_width=24)
    # Flap nozzle pointing top-left
    nozzle = [(300, 430), (200, 350), (220, 310), (340, 400)]
    c.fill_polygon(nozzle, fill_color=(245, 125, 135, 255), outline_color=COL_INK, outline_width=22)
    # Hilarious rubber crease lines
    c.draw_crayon_polyline(bezier_interp((380, 520), (512, 580), (512, 580), (644, 520)), width=16, color=(225, 105, 115, 255))
    # Comic air puff lines escaping nozzle
    c.draw_crayon_polyline([(190, 310), (130, 270)], width=14, color=COL_INK)
    c.draw_crayon_polyline([(210, 290), (160, 240)], width=14, color=COL_INK)
    c.draw_crayon_polyline([(240, 290), (210, 220)], width=14, color=COL_INK)
    # Sound doodle: "쉭-"
    c.draw_hand_text("쉭-", 140, 210, size=52, color=(120, 110, 105, 240), bold=True)
    # Center text: "뿡"
    c.draw_hand_text("뿡", 512, 530, size=95, color=COL_INK, bold=True)
    props["prop_whoopee"] = c.img

    # 2) prop_megaphone: 확성기 (빨간 몸통 + 하얀 나팔 입구 + 손잡이와 소리파동)
    c = CrayonEngine(1024, 1024, seed=202)
    # Handle at bottom
    c.fill_polygon([(460, 580), (510, 580), (490, 780), (440, 780)], fill_color=(45, 48, 55, 255), outline_color=COL_INK, outline_width=20)
    # Megaphone cone body
    cone = [(360, 460), (700, 310), (700, 670), (360, 560)]
    c.fill_polygon(cone, fill_color=(255, 75, 75, 255), outline_color=COL_INK, outline_width=24)
    # White accent stripe
    c.fill_polygon([(480, 415), (550, 385), (550, 605), (480, 575)], fill_color=COL_WHITE, outline_color=COL_INK, outline_width=16)
    # Mouthpiece oval cap on left
    c.fill_wobbly_ellipse(360, 510, 35, 60, fill_color=(45, 48, 55, 255), outline_color=COL_INK, outline_width=20)
    # Front sound opening oval on right
    c.fill_wobbly_ellipse(700, 490, 40, 180, fill_color=(255, 220, 75, 255), outline_color=COL_INK, outline_width=22)
    # Sonic blast soundwaves
    c.draw_crayon_polyline(bezier_interp((770, 390), (810, 490), (810, 490), (770, 590)), width=16, color=COL_INK)
    c.draw_crayon_polyline(bezier_interp((830, 340), (890, 490), (890, 490), (830, 640)), width=18, color=(255, 95, 75, 255))
    props["prop_megaphone"] = c.img

    # 3) prop_extinguisher: 소화기 (빨간 탱크 + 검정 호스와 압력 게이지)
    c = CrayonEngine(1024, 1024, seed=203)
    # Cylinder tank
    c.fill_wobbly_box(380, 340, 644, 840, fill_color=(245, 55, 55, 255), outline_color=COL_INK, outline_width=24, radius=60)
    # Top valve head & squeeze handle
    c.fill_polygon([(480, 240), (544, 240), (530, 340), (494, 340)], fill_color=(75, 82, 90, 255), outline_color=COL_INK, outline_width=18)
    c.draw_crayon_polyline([(440, 220), (512, 240), (600, 205)], width=22, color=COL_INK)
    c.draw_crayon_polyline([(512, 240), (590, 245)], width=20, color=COL_INK)
    # Pressure gauge meter
    c.fill_wobbly_ellipse(460, 290, 22, 22, fill_color=(255, 245, 205, 255), outline_color=COL_INK, outline_width=12)
    # Black rubber hose looping out to right
    c.draw_crayon_polyline(bezier_interp((530, 290), (690, 310), (680, 620), (590, 580)), width=22, color=COL_INK)
    # Center white instruction label
    c.fill_wobbly_box(415, 470, 609, 680, fill_color=COL_WHITE, outline_color=COL_INK, outline_width=16, radius=18)
    c.draw_hand_text("소화기", 512, 530, size=48, color=COL_INK, bold=True)
    c.draw_hand_text("방구 진압용", 512, 610, size=28, color=(215, 45, 45, 255), bold=True)
    props["prop_extinguisher"] = c.img

    # 4) prop_gasmask: 바닥에 놓인 방독면
    c = CrayonEngine(1024, 1024, seed=204)
    # Military olive drab mask face
    c.fill_wobbly_ellipse(512, 510, 220, 250, fill_color=(95, 115, 85, 255), outline_color=COL_INK, outline_width=24)
    # Big round glass goggles
    for gx in (420, 604):
        c.fill_wobbly_ellipse(gx, 430, 65, 65, fill_color=(195, 235, 245, 240), outline_color=(45, 55, 42, 255), outline_width=20)
        c.draw_crayon_polyline([(gx - 25, 415), (gx + 20, 450)], width=10, color=(255, 255, 255, 200))
    # Snout filter canister
    c.fill_wobbly_ellipse(512, 640, 85, 70, fill_color=(52, 62, 48, 255), outline_color=COL_INK, outline_width=22)
    c.fill_wobbly_ellipse(512, 640, 50, 40, fill_color=(38, 46, 35, 255), outline_color=COL_INK, outline_width=14)
    props["prop_gasmask"] = c.img

    # 5) prop_spray: 탈취제 스프레이 (칙! 뿜어져 나오는 향기 입자)
    c = CrayonEngine(1024, 1024, seed=205)
    # Spray bottle body
    c.fill_wobbly_box(370, 330, 654, 840, fill_color=(95, 205, 235, 255), outline_color=COL_INK, outline_width=24, radius=55)
    # White nozzle top
    c.fill_wobbly_box(440, 200, 584, 335, fill_color=COL_WHITE, outline_color=COL_INK, outline_width=20, radius=22)
    c.fill_wobbly_ellipse(550, 255, 18, 18, fill_color=COL_INK, outline_width=0)
    # Spray cloud droplets shooting right
    for sx, sy, sr in [(650, 220, 24), (730, 180, 36), (820, 230, 48), (760, 280, 30), (880, 190, 40)]:
        c.fill_wobbly_ellipse(sx, sy, sr, sr, fill_color=(220, 245, 255, 210), outline_color=(110, 185, 235, 255), outline_width=12)
    # Hand text: "숲속 향기 (절실)"
    c.draw_hand_text("탈취제", 512, 520, size=68, color=COL_INK, bold=True)
    c.draw_hand_text("초강력 99.9%", 512, 620, size=34, color=(45, 115, 185, 255), bold=True)
    props["prop_spray"] = c.img

    # 6) prop_candle: 향초 (촛농 흘러내리는 유리병 향초 + 일렁이는 불꽃)
    c = CrayonEngine(1024, 1024, seed=206)
    # Glass jar base
    c.fill_wobbly_box(340, 420, 684, 840, fill_color=(255, 244, 235, 255), outline_color=COL_INK, outline_width=24, radius=45)
    # Melting wax surface inside
    c.fill_wobbly_box(365, 520, 659, 815, fill_color=(255, 175, 195, 255), outline_color=COL_INK, outline_width=16, radius=25)
    # Melting wax drips
    c.draw_crayon_polyline([(420, 520), (420, 575)], width=14, color=(255, 145, 170, 255))
    c.draw_crayon_polyline([(540, 520), (540, 610)], width=16, color=(255, 145, 170, 255))
    # Wick
    c.draw_crayon_polyline([(512, 350), (512, 430)], width=16, color=COL_INK)
    # Flame teardrop
    flame_pts = [(512, 170), (450, 310), (512, 360), (574, 310)]
    c.fill_polygon(flame_pts, fill_color=(255, 195, 50, 255), outline_color=COL_INK, outline_width=18)
    c.fill_polygon([(512, 230), (480, 310), (512, 345), (544, 310)], fill_color=(255, 95, 45, 255), outline_color=None, outline_width=0)
    c.draw_hand_text("향기 뿜뿜", 512, 700, size=46, color=COL_INK, bold=True)
    props["prop_candle"] = c.img

    # 7) prop_fan: 레트로 선풍기 (청록색 복고풍 선풍기 + 회전 바람)
    c = CrayonEngine(1024, 1024, seed=207)
    # Round base & stand neck
    c.fill_wobbly_box(340, 750, 684, 870, fill_color=(215, 235, 245, 255), outline_color=COL_INK, outline_width=22, radius=35)
    c.fill_polygon([(485, 550), (539, 550), (530, 760), (494, 760)], fill_color=(175, 205, 220, 255), outline_color=COL_INK, outline_width=18)
    # Outer wire fan cage
    c.fill_wobbly_ellipse(512, 420, 260, 260, fill_color=(245, 252, 255, 255), outline_color=COL_INK, outline_width=24)
    # 3 Blue spinning blades
    for ang in (0, 120, 240):
        rad = math.radians(ang)
        bx = int(512 + 130 * math.cos(rad))
        by = int(420 + 130 * math.sin(rad))
        c.fill_wobbly_ellipse(bx, by, 75, 55, fill_color=(65, 175, 235, 240), outline_color=COL_INK, outline_width=16, angle_deg=ang)
    # Center nose cap
    c.fill_wobbly_ellipse(512, 420, 48, 48, fill_color=(255, 215, 65, 255), outline_color=COL_INK, outline_width=18)
    # Wind swish lines
    c.draw_crayon_polyline(bezier_interp((220, 360), (140, 390), (150, 480), (220, 490)), width=14, color=(125, 205, 245, 255))
    props["prop_fan"] = c.img

    # 8) prop_mic: 노래방 마이크 (둥근 그릴망 + 검정 바디 + 꼬인 유선 케이블)
    c = CrayonEngine(1024, 1024, seed=208)
    # Curly black microphone wire at bottom
    c.draw_crayon_polyline(bezier_interp((512, 830), (440, 890), (580, 920), (512, 980)), width=16, color=COL_INK)
    # Tapered handle
    c.fill_polygon([(450, 440), (574, 440), (539, 840), (485, 840)], fill_color=(55, 60, 68, 255), outline_color=COL_INK, outline_width=22)
    # Power switch
    c.fill_wobbly_box(490, 560, 534, 640, fill_color=(255, 215, 65, 255), outline_color=COL_INK, outline_width=10, radius=8)
    # Round metal mesh mic head
    c.fill_wobbly_ellipse(512, 330, 155, 165, fill_color=(215, 225, 235, 255), outline_color=COL_INK, outline_width=24)
    # Mesh cross-hatching
    c.draw_crayon_polyline([(420, 330), (604, 330)], width=16, color=(235, 65, 65, 255))
    c.draw_crayon_polyline([(512, 200), (512, 450)], width=14, color=COL_INK)
    props["prop_mic"] = c.img

    # 9) prop_trophy: 트로피 "괄약근 대상" (황금 컵과 대리석 받침대, 삐뚤빼뚤한 훈장)
    c = CrayonEngine(1024, 1024, seed=209)
    # Left and right arched handles
    c.draw_crayon_polyline(bezier_interp((340, 240), (190, 240), (190, 510), (380, 510)), width=22, color=COL_INK)
    c.draw_crayon_polyline(bezier_interp((340, 240), (190, 240), (190, 510), (380, 510)), width=14, color=(255, 195, 45, 255))
    c.draw_crayon_polyline(bezier_interp((684, 240), (834, 240), (834, 510), (644, 510)), width=22, color=COL_INK)
    c.draw_crayon_polyline(bezier_interp((684, 240), (834, 240), (834, 510), (644, 510)), width=14, color=(255, 195, 45, 255))
    # Golden trophy goblet
    cup_pts = [(300, 200), (724, 200), (654, 540), (512, 610), (370, 540)]
    c.fill_polygon(cup_pts, fill_color=(255, 215, 55, 255), outline_color=COL_INK, outline_width=24)
    # Stem & base
    c.fill_polygon([(475, 610), (549, 610), (544, 710), (480, 710)], fill_color=(235, 185, 35, 255), outline_color=COL_INK, outline_width=18)
    c.fill_wobbly_box(300, 700, 724, 860, fill_color=(95, 65, 45, 255), outline_color=COL_INK, outline_width=22, radius=24)
    # Golden inscribed plaque
    c.fill_wobbly_box(340, 730, 684, 835, fill_color=(255, 242, 175, 255), outline_color=COL_INK, outline_width=12, radius=12)
    c.draw_hand_text("괄약근 대상", 512, 785, size=42, color=COL_INK, bold=True)
    # Sparkle stars around cup
    for sx, sy in [(250, 180), (770, 180), (512, 130)]:
        c.draw_hand_text("★", sx, sy, size=42, color=(255, 215, 55, 255), bold=True)
    props["prop_trophy"] = c.img

    # 10) prop_medal: 금메달 (빨/파 줄무늬 목걸이 리본 + 커다란 황금 메달 "1위")
    c = CrayonEngine(1024, 1024, seed=210)
    # Neck ribbon V-shape
    c.fill_polygon([(360, 140), (480, 140), (540, 450), (420, 450)], fill_color=(235, 65, 65, 255), outline_color=COL_INK, outline_width=18)
    c.fill_polygon([(664, 140), (544, 140), (484, 450), (604, 450)], fill_color=(55, 125, 235, 255), outline_color=COL_INK, outline_width=18)
    # Big gold medal circle
    c.fill_wobbly_ellipse(512, 620, 240, 240, fill_color=(255, 215, 55, 255), outline_color=COL_INK, outline_width=24)
    c.fill_wobbly_ellipse(512, 620, 195, 195, fill_color=(255, 230, 95, 255), outline_color=COL_INK, outline_width=14)
    # Inscribed text "1등"
    c.draw_hand_text("1등", 512, 615, size=130, color=COL_INK, bold=True)
    c.draw_hand_text("참기 챔피언", 512, 735, size=32, color=(185, 125, 25, 255), bold=True)
    props["prop_medal"] = c.img

    # 11) prop_sweetpotato: 김 모락모락 군고구마 (갈라진 보랏빛 껍질과 황금빛 속살)
    c = CrayonEngine(1024, 1024, seed=211)
    # Purple outer potato skin
    c.fill_wobbly_ellipse(512, 540, 290, 210, fill_color=(145, 55, 95, 255), outline_color=COL_INK, outline_width=24, angle_deg=-15)
    # Cracked open golden yellow piping-hot interior
    c.fill_wobbly_ellipse(540, 520, 190, 140, fill_color=(255, 215, 65, 255), outline_color=COL_INK, outline_width=18, angle_deg=-12)
    c.fill_wobbly_ellipse(555, 510, 130, 90, fill_color=(255, 240, 125, 255), outline_color=None, outline_width=0, angle_deg=-12)
    # Rising curly steam lines
    for sx in (390, 520, 650):
        c.draw_crayon_polyline(bezier_interp((sx, 330), (sx - 35, 240), (sx + 35, 170), (sx, 100)), width=16, color=(185, 195, 205, 240))
    c.draw_hand_text("원인 1호", 512, 790, size=38, color=COL_INK, bold=True)
    props["prop_sweetpotato"] = c.img

    # 12) prop_beans: 콩 한 봉지 (종이/마대 봉지에서 쏟아져 나온 초록 완두콩들)
    c = CrayonEngine(1024, 1024, seed=212)
    # Bulging burlap sack
    c.fill_wobbly_box(290, 310, 734, 840, fill_color=(235, 205, 155, 255), outline_color=COL_INK, outline_width=24, radius=65)
    # Tied string around sack neck
    c.draw_crayon_polyline([(310, 420), (714, 420)], width=18, color=(145, 105, 65, 255))
    # Green glossy peas rolling out
    for bx, by in [(410, 520), (512, 485), (614, 520), (450, 610), (574, 605), (380, 830), (640, 840)]:
        c.fill_wobbly_ellipse(bx, by, 45, 36, fill_color=(125, 205, 75, 255), outline_color=COL_INK, outline_width=14)
        c.fill_wobbly_ellipse(bx - 12, by - 10, 12, 8, fill_color=COL_WHITE, outline_color=None, outline_width=0)
    c.draw_hand_text("콩 (가스 제조)", 512, 720, size=46, color=COL_INK, bold=True)
    props["prop_beans"] = c.img

    # 13) prop_milk: 우유팩 (모서리 뜯어진 서울우유풍 파란 줄무늬 팩 + 튀는 우유방울)
    c = CrayonEngine(1024, 1024, seed=213)
    # Gable roof top
    roof = [(330, 380), (512, 220), (694, 380)]
    c.fill_polygon(roof, fill_color=(75, 175, 245, 255), outline_color=COL_INK, outline_width=22)
    # Spout opened flap on left
    c.fill_polygon([(330, 380), (250, 320), (330, 270)], fill_color=COL_WHITE, outline_color=COL_INK, outline_width=16)
    # Carton rectangular body
    c.fill_wobbly_box(330, 370, 694, 850, fill_color=COL_WHITE, outline_color=COL_INK, outline_width=24, radius=20)
    # Blue wave banner across middle
    c.fill_wobbly_box(330, 490, 694, 660, fill_color=(75, 175, 245, 255), outline_color=COL_INK, outline_width=16, radius=12)
    c.draw_hand_text("우유 100%", 512, 575, size=64, color=COL_WHITE, bold=True)
    # Spilled white milk drops
    for mx, my, mr in [(220, 310, 18), (170, 360, 22), (210, 410, 14)]:
        c.fill_wobbly_ellipse(mx, my, mr, mr, fill_color=COL_WHITE, outline_color=COL_INK, outline_width=10)
    c.draw_hand_text("유당불내증 주의", 512, 755, size=34, color=(225, 55, 55, 255), bold=True)
    props["prop_milk"] = c.img

    # 14) prop_warning: ⚠ 가스 주의 표지판 (노란 삼각형 + 해골/가스 구름 경고)
    c = CrayonEngine(1024, 1024, seed=214)
    # Big yellow caution triangle
    tri_pts = [(512, 160), (870, 810), (154, 810)]
    c.fill_polygon(tri_pts, fill_color=(255, 215, 45, 255), outline_color=COL_INK, outline_width=26)
    # Inner border
    c.draw_crayon_polyline([(512, 230), (810, 770), (214, 770)], width=14, color=COL_INK, closed=True)
    # Exclamation & Gas biohazard doodle
    c.draw_hand_text("!", 512, 450, size=180, color=COL_INK, bold=True)
    c.draw_hand_text("가스 방출 주의", 512, 690, size=52, color=(215, 35, 35, 255), bold=True)
    props["prop_warning"] = c.img

    # 15) prop_cctv: 벽에 달린 CCTV (빨간 감시 불빛이 껌뻑이는 보안 카메라)
    c = CrayonEngine(1024, 1024, seed=215)
    # Wall mount bracket in top-right
    c.fill_wobbly_box(780, 220, 900, 440, fill_color=(155, 165, 175, 255), outline_color=COL_INK, outline_width=20, radius=16)
    # Metal articulated arm
    c.draw_crayon_polyline([(800, 330), (640, 410)], width=28, color=COL_INK)
    # Camera cylinder pointing down-left
    cam_pts = [(660, 340), (430, 470), (490, 580), (720, 450)]
    c.fill_polygon(cam_pts, fill_color=(245, 248, 252, 255), outline_color=COL_INK, outline_width=22)
    # Front lens cone
    c.fill_wobbly_ellipse(435, 525, 45, 65, fill_color=(45, 52, 60, 255), outline_color=COL_INK, outline_width=18, angle_deg=-30)
    # Red blinking recording LED
    c.fill_wobbly_ellipse(470, 460, 18, 18, fill_color=(255, 45, 45, 255), outline_color=COL_INK, outline_width=8)
    # Dashed vision cone lines
    c.draw_crayon_polyline([(410, 540), (180, 720)], width=12, color=(255, 75, 75, 200))
    c.draw_crayon_polyline([(440, 570), (280, 820)], width=12, color=(255, 75, 75, 200))
    c.draw_hand_text("녹화중", 580, 390, size=32, color=(225, 45, 45, 255), bold=True)
    props["prop_cctv"] = c.img

    # 16) prop_chair: 바퀴 달린 회의 의자 (메쉬 등받이와 5발 바퀴가 달린 오피스 체어)
    c = CrayonEngine(1024, 1024, seed=216)
    # Mesh backrest
    c.fill_wobbly_box(350, 160, 674, 520, fill_color=(55, 62, 70, 255), outline_color=COL_INK, outline_width=24, radius=45)
    # Padded seat cushion
    c.fill_wobbly_ellipse(512, 570, 230, 75, fill_color=(45, 50, 58, 255), outline_color=COL_INK, outline_width=22)
    # Armrests
    c.draw_crayon_polyline([(310, 420), (310, 540), (360, 560)], width=18, color=COL_INK)
    c.draw_crayon_polyline([(714, 420), (714, 540), (664, 560)], width=18, color=COL_INK)
    # Center hydraulic cylinder
    c.fill_polygon([(490, 620), (534, 620), (524, 760), (500, 760)], fill_color=(185, 195, 205, 255), outline_color=COL_INK, outline_width=16)
    # 5-star wheeled base legs
    for lx, ly in [(280, 850), (400, 870), (512, 880), (624, 870), (744, 850)]:
        c.draw_crayon_polyline([(512, 760), (lx, ly)], width=20, color=COL_INK)
        c.fill_wobbly_ellipse(lx, ly + 14, 20, 20, fill_color=(35, 38, 42, 255), outline_color=COL_INK, outline_width=10)
    props["prop_chair"] = c.img

    # 17) prop_pumpkin (Seasonal): 할로윈 호박 (익살맞게 쪼개진 눈과 이빨)
    c = CrayonEngine(1024, 1024, seed=217)
    c.fill_wobbly_ellipse(512, 540, 260, 220, fill_color=(255, 145, 35, 255), outline_color=COL_INK, outline_width=24)
    # Green stem at top
    c.fill_polygon([(490, 340), (534, 340), (550, 250), (480, 260)], fill_color=(75, 165, 65, 255), outline_color=COL_INK, outline_width=18)
    # Carved glowing triangle eyes
    c.fill_polygon([(410, 460), (450, 520), (370, 520)], fill_color=(255, 240, 85, 255), outline_color=COL_INK, outline_width=14)
    c.fill_polygon([(614, 460), (654, 520), (574, 520)], fill_color=(255, 240, 85, 255), outline_color=COL_INK, outline_width=14)
    # Jagged smiling mouth
    mouth_pts = [(380, 610), (430, 650), (480, 610), (512, 660), (544, 610), (594, 650), (644, 610), (512, 700)]
    c.fill_polygon(mouth_pts, fill_color=(255, 240, 85, 255), outline_color=COL_INK, outline_width=16)
    props["prop_pumpkin"] = c.img

    # 18) prop_bok (Seasonal): 설날 복주머니 (전통 비단 복주머니 + 금빛 술)
    c = CrayonEngine(1024, 1024, seed=218)
    c.fill_wobbly_ellipse(512, 580, 240, 220, fill_color=(225, 55, 65, 255), outline_color=COL_INK, outline_width=24)
    # Frilled ruffled top opening
    frill = [(390, 390), (440, 340), (512, 370), (584, 340), (634, 390)]
    c.fill_polygon(frill, fill_color=(245, 185, 45, 255), outline_color=COL_INK, outline_width=18)
    # Tied golden cord & dangling tassels
    c.draw_crayon_polyline([(380, 420), (644, 420)], width=18, color=(255, 215, 55, 255))
    c.draw_crayon_polyline([(512, 420), (470, 540)], width=14, color=(255, 215, 55, 255))
    c.draw_crayon_polyline([(512, 420), (554, 540)], width=14, color=(255, 215, 55, 255))
    # Chinese character: 福
    c.draw_hand_text("福", 512, 600, size=90, color=(255, 225, 75, 255), bold=True)
    props["prop_bok"] = c.img

    # 19) prop_yeot (Seasonal): 수능 엿/찹쌀떡 (합격 기원 선물 상자)
    c = CrayonEngine(1024, 1024, seed=219)
    # Gift box base
    c.fill_wobbly_box(300, 380, 724, 820, fill_color=(250, 244, 230, 255), outline_color=COL_INK, outline_width=24, radius=35)
    # Red and gold ribbon wrap
    c.draw_crayon_polyline([(512, 380), (512, 820)], width=35, color=(225, 45, 55, 255))
    c.draw_crayon_polyline([(300, 600), (724, 600)], width=35, color=(225, 45, 55, 255))
    # Big calligraphy seal: "합격"
    c.fill_wobbly_ellipse(512, 600, 85, 85, fill_color=(255, 215, 55, 255), outline_color=COL_INK, outline_width=16)
    c.draw_hand_text("합격", 512, 600, size=52, color=(215, 35, 35, 255), bold=True)
    c.draw_hand_text("찰떡같이 참자", 512, 740, size=34, color=COL_INK, bold=True)
    props["prop_yeot"] = c.img

    return props


# =========================================================================
# 3. P0 + SEASONAL BACKGROUNDS (1080 x 2340 Vertical PNG)
#    Top 40% (y: 0..936) calm for "5번 남음" header
#    Middle (y: 936..1638) rich comedic illustration framing the characters
#    Bottom 30% (y: 1638..2340) calm for action buttons
# =========================================================================

def generate_background_pack():
    W, H = 1080, 2340
    bgs = {}

    # 1) bg_office: 사무실 책상 (모니터에 엑셀, 식은 커피, 포스트잇 "회의 2시")
    c = CrayonEngine(W, H, seed=301)
    # Calming wall top
    c.fill_polygon([(0, 0), (W, 0), (W, 1380), (0, 1380)], fill_color=(228, 234, 240, 255), outline_color=None, outline_width=0)
    # Office fabric partition line
    c.draw_crayon_polyline([(0, 1140), (W, 1140)], width=14, color=(185, 195, 208, 255))
    # Wooden desk surface (y: 1380..H)
    c.fill_polygon([(0, 1380), (W, 1380), (W, H), (0, H)], fill_color=(218, 192, 160, 255), outline_color=COL_INK, outline_width=22)
    # Desktop CRT/LCD Monitor on left-middle (y: 960..1320)
    c.fill_wobbly_box(60, 960, 480, 1320, fill_color=(45, 50, 58, 255), outline_color=COL_INK, outline_width=20, radius=20)
    c.fill_wobbly_box(85, 985, 455, 1285, fill_color=COL_WHITE, outline_color=COL_INK, outline_width=12, radius=10)
    # Green excel header
    c.fill_polygon([(85, 985), (455, 985), (455, 1035), (85, 1035)], fill_color=(35, 125, 75, 255), outline_color=None, outline_width=0)
    c.draw_hand_text("Q4_실적보고_최종_진짜최종.xlsx", 270, 1010, size=18, color=COL_WHITE, bold=True)
    # Spreadsheet grid lines
    for gy in (1080, 1125, 1170, 1215, 1260):
        c.draw_crayon_polyline([(85, gy), (455, gy)], width=4, color=(205, 215, 210, 255))
    # Yellow Post-it Note stuck on partition
    c.fill_wobbly_box(520, 1020, 710, 1210, fill_color=(255, 245, 115, 255), outline_color=COL_INK, outline_width=14, radius=8)
    c.draw_hand_text("회의 2시", 615, 1080, size=34, color=COL_INK, bold=True)
    c.draw_hand_text("(화장실 미리!)", 615, 1145, size=24, color=(215, 45, 45, 255), bold=True)
    # Steaming mug of iced/cold Americano on right desk
    c.fill_wobbly_box(860, 1260, 990, 1430, fill_color=COL_WHITE, outline_color=COL_INK, outline_width=16, radius=16)
    c.fill_wobbly_ellipse(925, 1270, 55, 22, fill_color=(68, 48, 38, 255), outline_color=COL_INK, outline_width=10)
    bgs["bg_office"] = c.img

    # 2) bg_meeting: 회의실 (화이트보드에 우상향/폭락 그래프, 마커, 빈 의자)
    c = CrayonEngine(W, H, seed=302)
    # Neutral grey meeting wall
    c.fill_polygon([(0, 0), (W, 0), (W, H), (0, H)], fill_color=(235, 238, 242, 255), outline_color=None, outline_width=0)
    # Big Whiteboard in middle (y: 880..1440)
    c.fill_wobbly_box(80, 880, 1000, 1440, fill_color=(254, 254, 252, 255), outline_color=(85, 95, 105, 255), outline_width=22, radius=18)
    # Whiteboard title
    c.draw_hand_text("[ 긴급 점검 ] 괄약근 유지율 현황", 540, 940, size=38, color=COL_INK, bold=True)
    # Red crash graph plunging down
    c.draw_crayon_polyline([(160, 1220), (340, 1100), (520, 1040), (700, 1340), (880, 1390)], width=18, color=(225, 45, 45, 255))
    c.draw_hand_text("폭락 ↘", 780, 1310, size=32, color=(225, 45, 45, 255), bold=True)
    # Whiteboard marker pen tray at bottom
    c.fill_wobbly_box(350, 1425, 730, 1465, fill_color=(195, 205, 215, 255), outline_color=COL_INK, outline_width=12, radius=6)
    # Meeting table in lower foreground
    c.fill_polygon([(0, 1580), (W, 1580), (W, H), (0, H)], fill_color=(175, 145, 110, 255), outline_color=COL_INK, outline_width=20)
    bgs["bg_meeting"] = c.img

    # 3) bg_subway: 지하철 (손잡이 줄줄이, 창밖 터널, 초록 의자)
    c = CrayonEngine(W, H, seed=303)
    # Metallic subway interior wall
    c.fill_polygon([(0, 0), (W, 0), (W, H), (0, H)], fill_color=(230, 234, 238, 255), outline_color=None, outline_width=0)
    # Dark tunnel window in center (y: 920..1360)
    c.fill_wobbly_box(110, 920, 970, 1360, fill_color=(24, 28, 36, 255), outline_color=COL_INK, outline_width=22, radius=24)
    # Passing yellow station blur lines outside window
    c.draw_crayon_polyline([(160, 1080), (450, 1080)], width=14, color=(255, 215, 55, 180))
    c.draw_crayon_polyline([(580, 1190), (910, 1190)], width=14, color=(255, 215, 55, 180))
    # Overhead silver handrail bar
    c.draw_crayon_polyline([(0, 890), (W, 890)], width=16, color=(165, 175, 185, 255))
    # Dangling yellow triangle strap handles
    for hx in (180, 420, 660, 900):
        c.draw_crayon_polyline([(hx, 890), (hx, 970)], width=12, color=COL_INK)
        tri = [(hx - 36, 970), (hx + 36, 970), (hx, 1035)]
        c.fill_polygon(tri, fill_color=(255, 195, 45, 255), outline_color=COL_INK, outline_width=14)
    # Green subway bench seat in foreground
    c.fill_wobbly_box(0, 1420, W, 1590, fill_color=(65, 155, 95, 255), outline_color=COL_INK, outline_width=20, radius=12)
    bgs["bg_subway"] = c.img

    # 4) bg_elevator: 엘리베이터 (거울 + 층수 7F + "정원 15명")
    c = CrayonEngine(W, H, seed=304)
    c.fill_polygon([(0, 0), (W, 0), (W, H), (0, H)], fill_color=(215, 220, 226, 255), outline_color=None, outline_width=0)
    # Center stainless steel sliding door split
    c.draw_crayon_polyline([(W // 2, 860), (W // 2, 1680)], width=12, color=(145, 152, 162, 255))
    # Red LED floor indicator display "7F ▲" (y: 890..980)
    c.fill_wobbly_box(410, 890, 670, 985, fill_color=(28, 30, 35, 255), outline_color=COL_INK, outline_width=16, radius=14)
    c.draw_hand_text("7F ▲", 540, 938, size=46, color=(255, 65, 45, 255), bold=True)
    # Mirror reflection panel on wall
    c.fill_wobbly_box(120, 1020, 960, 1440, fill_color=(235, 246, 255, 255), outline_color=COL_INK, outline_width=20, radius=18)
    c.draw_crayon_polyline([(180, 1380), (360, 1080)], width=24, color=(255, 255, 255, 200))
    # Capacity plaque: "정원 15명 (초과 주의)"
    c.fill_wobbly_box(710, 1045, 930, 1140, fill_color=(255, 250, 220, 255), outline_color=COL_INK, outline_width=12, radius=10)
    c.draw_hand_text("정원 15명", 820, 1092, size=28, color=COL_INK, bold=True)
    bgs["bg_elevator"] = c.img

    # 5) bg_library: 도서관 열람실 ("정숙" 표지판, 칸막이 독서실 책상, 스탠드 조명)
    c = CrayonEngine(W, H, seed=305)
    c.fill_polygon([(0, 0), (W, 0), (W, H), (0, H)], fill_color=(245, 240, 225, 255), outline_color=None, outline_width=0)
    # Wooden study carrel partition (y: 950..1520)
    c.fill_wobbly_box(60, 950, 1020, 1540, fill_color=(198, 164, 122, 255), outline_color=COL_INK, outline_width=22, radius=20)
    c.fill_polygon([(100, 1000), (980, 1000), (980, 1420), (100, 1420)], fill_color=(225, 192, 148, 255), outline_color=COL_INK, outline_width=16)
    # Big warning poster: "쉿! 정숙 (침묵의 공간)"
    c.fill_wobbly_box(340, 875, 740, 995, fill_color=(255, 250, 242, 255), outline_color=COL_INK, outline_width=18, radius=16)
    c.draw_hand_text("쉿! 정숙", 540, 935, size=48, color=(215, 45, 45, 255), bold=True)
    # Thick textbooks stacked on desk
    c.fill_wobbly_box(130, 1280, 350, 1350, fill_color=(65, 125, 195, 255), outline_color=COL_INK, outline_width=14, radius=8)
    c.fill_wobbly_box(120, 1350, 365, 1420, fill_color=(215, 75, 65, 255), outline_color=COL_INK, outline_width=14, radius=8)
    bgs["bg_library"] = c.img

    # 6) bg_toilet: 화장실 칸 (문 안쪽 낙서 "여기서 뀌어라 ㅋ", 화장실 타일)
    c = CrayonEngine(W, H, seed=306)
    c.fill_polygon([(0, 0), (W, 0), (W, H), (0, H)], fill_color=(220, 232, 226, 255), outline_color=None, outline_width=0)
    # Bathroom stall door panel
    c.fill_wobbly_box(90, 890, 990, 1620, fill_color=(238, 244, 238, 255), outline_color=COL_INK, outline_width=24, radius=18)
    # Hilarious stall graffiti scratched in crayon
    c.draw_hand_text("여기서 마음껏 뀌어라 ㅋ", 540, 1010, size=48, color=(75, 82, 88, 255), bold=True)
    c.draw_hand_text("방구 참으면 똥 된다 ★", 430, 1090, size=32, color=(55, 125, 215, 255), bold=True)
    c.draw_hand_text("낙서 금지!! -관리소장-", 680, 1160, size=28, color=(215, 55, 55, 255), bold=True)
    c.draw_hand_text("민수 왔다감 2026.10", 350, 1220, size=26, color=(145, 105, 85, 255), bold=False)
    # Toilet roll dispenser on left
    c.fill_wobbly_box(130, 1280, 270, 1420, fill_color=COL_WHITE, outline_color=COL_INK, outline_width=16, radius=22)
    bgs["bg_toilet"] = c.img

    # 7) bg_wedding: 결혼식장 하객석 (최악의 타이밍, 버진로드와 꽃장식 아치)
    c = CrayonEngine(W, H, seed=307)
    c.fill_polygon([(0, 0), (W, 0), (W, H), (0, H)], fill_color=(254, 246, 248, 255), outline_color=None, outline_width=0)
    # Red carpet virgin road
    c.fill_polygon([(360, 1140), (720, 1140), (960, H), (120, H)], fill_color=(215, 55, 68, 255), outline_color=COL_INK, outline_width=18)
    # Arching floral garland
    c.draw_crayon_polyline(bezier_interp((140, 1200), (320, 880), (760, 880), (940, 1200)), width=34, color=(245, 165, 185, 255))
    for fx in range(180, 920, 110):
        fy = int(1200 - 320 * math.sin(math.pi * (fx - 140) / 800.0))
        c.fill_wobbly_ellipse(fx, fy, 38, 38, fill_color=(255, 215, 225, 255), outline_color=COL_INK, outline_width=12)
    # Guest banquet chairs on sides
    c.fill_wobbly_box(80, 1310, 240, 1560, fill_color=COL_WHITE, outline_color=COL_INK, outline_width=16, radius=25)
    c.fill_wobbly_box(840, 1310, 1000, 1560, fill_color=COL_WHITE, outline_color=COL_INK, outline_width=16, radius=25)
    bgs["bg_wedding"] = c.img

    # 8) bg_chicken: 야식 테이블 (새벽 2시 시계, 치킨 상자, 콜라)
    c = CrayonEngine(W, H, seed=308)
    # Dark room wall
    c.fill_polygon([(0, 0), (W, 0), (W, H), (0, H)], fill_color=(38, 36, 52, 255), outline_color=None, outline_width=0)
    # Glowing digital/analog wall clock at 02:00
    c.fill_wobbly_ellipse(540, 950, 95, 95, fill_color=(255, 250, 235, 255), outline_color=COL_INK, outline_width=16)
    c.draw_crayon_polyline([(540, 950), (540, 885)], width=12, color=COL_INK)
    c.draw_crayon_polyline([(540, 950), (595, 920)], width=12, color=(225, 45, 45, 255))
    c.draw_hand_text("AM 02:00", 540, 1075, size=34, color=(255, 225, 125, 255), bold=True)
    # Late night snack table (y: 1360..H)
    c.fill_polygon([(0, 1360), (W, 1360), (W, H), (0, H)], fill_color=(215, 165, 115, 255), outline_color=COL_INK, outline_width=22)
    # Striped fried chicken box on left
    c.fill_wobbly_box(75, 1180, 415, 1440, fill_color=(245, 65, 55, 255), outline_color=COL_INK, outline_width=20, radius=18)
    c.draw_hand_text("바삭 치킨", 245, 1310, size=52, color=(255, 245, 215, 255), bold=True)
    # Red Cola bottle on right
    c.fill_wobbly_box(810, 1140, 970, 1440, fill_color=(52, 28, 25, 255), outline_color=COL_INK, outline_width=18, radius=26)
    c.fill_wobbly_box(810, 1245, 970, 1325, fill_color=(225, 45, 40, 255), outline_color=COL_INK, outline_width=10, radius=6)
    c.draw_hand_text("COLA", 890, 1285, size=34, color=COL_WHITE, bold=True)
    bgs["bg_chicken"] = c.img

    # 9) bg_minihompy: 2000년대 싸이월드 미니홈피 (미니룸, 투데이 숫자, 감성 탭)
    c = CrayonEngine(W, H, seed=309)
    # Dot/blue retro background
    c.fill_polygon([(0, 0), (W, 0), (W, H), (0, H)], fill_color=(175, 215, 238, 255), outline_color=None, outline_width=0)
    # White retro minihompy rounded container
    c.fill_wobbly_box(45, 860, 1035, 1680, fill_color=COL_WHITE, outline_color=COL_INK, outline_width=22, radius=40)
    # Top pink status banner
    c.fill_wobbly_box(75, 895, 1005, 985, fill_color=(255, 228, 238, 255), outline_color=COL_INK, outline_width=14, radius=18)
    c.draw_hand_text("TODAY 9999  |  TOTAL 486,000", 540, 940, size=34, color=(215, 45, 105, 255), bold=True)
    # BGM player bar
    c.fill_wobbly_box(75, 1005, 1005, 1075, fill_color=(235, 245, 255, 255), outline_color=COL_INK, outline_width=12, radius=12)
    c.draw_hand_text("♪ 프리스타일 - Y (방구 ver.)  [▶ 재생중]", 540, 1040, size=28, color=(45, 85, 185, 255), bold=True)
    # Miniroom parquet floor in lower box
    c.fill_polygon([(75, 1420), (1005, 1420), (1005, 1650), (75, 1650)], fill_color=(240, 215, 175, 255), outline_color=COL_INK, outline_width=14)
    bgs["bg_minihompy"] = c.img

    # 10) bg_error: 오류 창 ("엉덩이.exe가 응답하지 않습니다", 와르르 겹쳐진 윈도우 창들)
    c = CrayonEngine(W, H, seed=310)
    # Classic Windows teal/cyan wallpaper
    c.fill_polygon([(0, 0), (W, 0), (W, H), (0, H)], fill_color=(0, 128, 128, 255), outline_color=None, outline_width=0)
    # Cascading Windows 95/98 dialogs cascading diagonally down
    for ox, oy in [(-30, 860), (30, 940), (90, 1020), (150, 1100)]:
        bx0, by0, bx1, by1 = 120 + ox, 920 + oy, 840 + ox, 1240 + oy
        # Grey 3D dialog window
        c.fill_wobbly_box(bx0, by0, bx1, by1, fill_color=(198, 198, 198, 255), outline_color=COL_INK, outline_width=18, radius=8)
        # Blue title bar
        c.fill_polygon([(bx0, by0), (bx1, by0), (bx1, by0 + 55), (bx0, by0 + 55)], fill_color=(0, 0, 128, 255), outline_color=COL_INK, outline_width=10)
        c.draw_hand_text("엉덩이.exe - 응답 없음", (bx0 + bx1) // 2 - 30, by0 + 28, size=24, color=COL_WHITE, bold=True)
        # Red [X] close button
        c.fill_wobbly_box(bx1 - 50, by0 + 8, bx1 - 10, by0 + 48, fill_color=(215, 45, 45, 255), outline_color=COL_INK, outline_width=8, radius=4)
        c.draw_hand_text("X", bx1 - 30, by0 + 28, size=20, color=COL_WHITE, bold=True)
        # Error icon: Red stop sign
        c.fill_wobbly_ellipse(bx0 + 65, by0 + 130, 32, 32, fill_color=(225, 45, 45, 255), outline_color=COL_INK, outline_width=10)
        c.draw_hand_text("X", bx0 + 65, by0 + 130, size=32, color=COL_WHITE, bold=True)
        # Body text
        c.draw_hand_text("치명적인 오류: 괄약근 버퍼 오버플로우", (bx0 + bx1) // 2 + 35, by0 + 115, size=22, color=COL_INK, bold=True)
        c.draw_hand_text("지금 즉시 방출하지 않으면 폭발합니다.", (bx0 + bx1) // 2 + 35, by0 + 155, size=20, color=(185, 35, 35, 255), bold=False)
        # Windows button [확인]
        c.fill_wobbly_box((bx0 + bx1) // 2 - 80, by1 - 65, (bx0 + bx1) // 2 + 80, by1 - 15, fill_color=(215, 215, 215, 255), outline_color=COL_INK, outline_width=10, radius=6)
        c.draw_hand_text("확인", (bx0 + bx1) // 2, by1 - 40, size=24, color=COL_INK, bold=True)
    bgs["bg_error"] = c.img

    # 11) bg_vapor: 베이퍼웨이브 (보라/분홍 네온 석양 + 3D 원근 그리드 바닥)
    c = CrayonEngine(W, H, seed=311)
    # Magenta/purple sunset gradient sky
    c.fill_polygon([(0, 0), (W, 0), (W, 1420), (0, 1420)], fill_color=(52, 18, 72, 255), outline_color=None, outline_width=0)
    # Giant striped neon retro sun at horizon
    c.fill_wobbly_ellipse(W // 2, 1380, 240, 240, fill_color=(255, 105, 180, 255), outline_color=COL_INK, outline_width=20)
    # Perspective grid floor (y: 1380..H)
    c.fill_polygon([(0, 1380), (W, 1380), (W, H), (0, H)], fill_color=(24, 8, 42, 255), outline_color=COL_INK, outline_width=22)
    for px in range(-200, W + 400, 140):
        c.draw_crayon_polyline([(W // 2, 1380), (px, H)], width=8, color=(45, 225, 255, 200))
    for gy in (1410, 1450, 1510, 1590, 1700, 1840, 2020):
        c.draw_crayon_polyline([(0, gy), (W, gy)], width=8, color=(255, 65, 185, 200))
    c.draw_hand_text("Ａ Ｅ Ｓ Ｔ Ｈ Ｅ Ｔ Ｉ Ｃ", 540, 1020, size=46, color=(255, 135, 215, 255), bold=True)
    bgs["bg_vapor"] = c.img

    # 12) bg_space: 우주 (지구 뒤로 방구 추진 로켓, 성운과 반짝이는 별)
    c = CrayonEngine(W, H, seed=312)
    # Deep cosmic dark space
    c.fill_polygon([(0, 0), (W, 0), (W, H), (0, H)], fill_color=(12, 14, 28, 255), outline_color=None, outline_width=0)
    # Swirling colorful purple/cyan nebula dust
    c.fill_wobbly_ellipse(420, 1180, 360, 240, fill_color=(68, 28, 95, 160), outline_color=None, outline_width=0, angle_deg=25)
    c.fill_wobbly_ellipse(680, 1260, 290, 190, fill_color=(22, 65, 95, 160), outline_color=None, outline_width=0, angle_deg=-20)
    # Glowing Earth in corner
    c.fill_wobbly_ellipse(900, 1500, 220, 220, fill_color=(55, 145, 225, 255), outline_color=COL_INK, outline_width=20)
    c.fill_wobbly_ellipse(860, 1460, 95, 75, fill_color=(95, 195, 115, 255), outline_color=None, outline_width=0)
    # Twinkling hand-drawn yellow stars
    for sx, sy, ss in [(180, 950, 36), (340, 1040, 28), (780, 980, 42), (220, 1320, 32), (640, 1410, 26), (880, 1120, 38)]:
        c.draw_hand_text("✦", sx, sy, size=ss, color=(255, 235, 115, 255), bold=True)
    # Fart propulsion trajectory smoke stream
    c.draw_crayon_polyline(bezier_interp((140, 1500), (320, 1350), (450, 1180), (620, 960)), width=28, color=(255, 235, 115, 210))
    c.draw_crayon_polyline(bezier_interp((140, 1500), (320, 1350), (450, 1180), (620, 960)), width=14, color=COL_WHITE)
    bgs["bg_space"] = c.img

    # 13) bg_snow (Seasonal): 눈 내리는 크리스마스 겨울밤
    c = CrayonEngine(W, H, seed=313)
    c.fill_polygon([(0, 0), (W, 0), (W, H), (0, H)], fill_color=(24, 34, 58, 255), outline_color=None, outline_width=0)
    # Snowy hill drifts in lower section
    c.draw_crayon_polyline(bezier_interp((0, 1440), (360, 1380), (720, 1460), (W, 1400)), width=34, color=COL_WHITE)
    c.fill_polygon([(0, 1440), (W, 1400), (W, H), (0, H)], fill_color=(235, 245, 255, 255), outline_color=COL_INK, outline_width=20)
    # Falling fluffy snowflakes
    for sx, sy, sr in [(160, 960, 22), (320, 1120, 18), (512, 1020, 26), (740, 980, 20), (890, 1150, 24), (430, 1300, 18)]:
        c.fill_wobbly_ellipse(sx, sy, sr, sr, fill_color=COL_WHITE, outline_color=None, outline_width=0)
    c.draw_hand_text("MERRY CHRISTMAS", 540, 920, size=46, color=(255, 215, 65, 255), bold=True)
    bgs["bg_snow"] = c.img

    # 14) bg_hanbok (Seasonal): 설날 한옥 마루 (기와 지붕 처마와 붉은 청사초롱)
    c = CrayonEngine(W, H, seed=314)
    c.fill_polygon([(0, 0), (W, 0), (W, H), (0, H)], fill_color=(245, 238, 225, 255), outline_color=None, outline_width=0)
    # Hanok tile roof eaves curving across top-middle (y: 860..980)
    c.fill_polygon([(0, 860), (W, 860), (W, 950), (0, 950)], fill_color=(68, 72, 80, 255), outline_color=COL_INK, outline_width=22)
    # Red and blue traditional lanterns dangling from eaves
    for lx in (220, 860):
        c.draw_crayon_polyline([(lx, 950), (lx, 1030)], width=10, color=COL_INK)
        c.fill_wobbly_box(lx - 45, 1030, lx + 45, 1110, fill_color=(225, 45, 55, 255), outline_color=COL_INK, outline_width=14, radius=12)
        c.fill_wobbly_box(lx - 45, 1110, lx + 45, 1190, fill_color=(45, 105, 225, 255), outline_color=COL_INK, outline_width=14, radius=12)
    # Wooden hanok floor porch (y: 1380..H)
    c.fill_polygon([(0, 1380), (W, 1380), (W, H), (0, H)], fill_color=(195, 145, 95, 255), outline_color=COL_INK, outline_width=22)
    bgs["bg_hanbok"] = c.img

    # 15) bg_upsidedown (Seasonal): 만우절 거꾸로 뒤집힌 방
    c = CrayonEngine(W, H, seed=315)
    c.fill_polygon([(0, 0), (W, 0), (W, H), (0, H)], fill_color=(240, 235, 225, 255), outline_color=None, outline_width=0)
    # Ceiling lamp hanging from floor upwards / furniture on ceiling
    c.draw_hand_text("?! ǝsᴉɹdɹnS lᴉɹd∀", 540, 980, size=52, color=(215, 45, 45, 255), bold=True)
    c.draw_hand_text("세상이 뒤집혔다", 540, 1060, size=38, color=COL_INK, bold=True)
    # Upside down window
    c.fill_wobbly_box(260, 1140, 820, 1520, fill_color=(195, 235, 255, 255), outline_color=COL_INK, outline_width=22, radius=20)
    c.draw_crayon_polyline([(540, 1140), (540, 1520)], width=16, color=COL_INK)
    c.draw_crayon_polyline([(260, 1330), (820, 1330)], width=16, color=COL_INK)
    bgs["bg_upsidedown"] = c.img

    return bgs


# =========================================================================
# 4. P2 FX, BUBBLES & FRAMES
# =========================================================================

def generate_fx_pack():
    """8 sets of 256x256 transparent RGBA PNG explosive comic fart FX."""
    fxs = {}

    # 1) fx_rainbow: 무지개 방구 구름
    c = CrayonEngine(256, 256, seed=401)
    for r, col in [(95, (255, 85, 85, 255)), (80, (255, 185, 45, 255)), (65, (255, 245, 65, 255)), (50, (75, 215, 95, 255)), (35, (65, 165, 255, 255))]:
        c.fill_wobbly_ellipse(128, 140, r, r * 0.7, fill_color=col, outline_color=None, outline_width=0)
    c.draw_crayon_polyline(bezier_interp((40, 160), (128, 60), (128, 60), (216, 160)), width=10, color=COL_INK)
    fxs["fx_rainbow_1"] = c.img

    # 2) fx_hearts: 하트 뿅뿅
    c = CrayonEngine(256, 256, seed=402)
    for hx, hy, hr in [(128, 120, 42), (75, 80, 24), (190, 85, 28)]:
        pts = []
        for t in np.linspace(0, 2 * math.pi, 30):
            x = 16 * (math.sin(t) ** 3)
            y = -(13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t))
            pts.append((hx + x * (hr / 16.0), hy + y * (hr / 16.0)))
        c.fill_polygon(pts, fill_color=(255, 75, 125, 255), outline_color=COL_INK, outline_width=8)
    fxs["fx_hearts_1"] = c.img

    # 3) fx_skull: 독가스 해골
    c = CrayonEngine(256, 256, seed=403)
    c.fill_wobbly_ellipse(128, 115, 62, 55, fill_color=(195, 155, 235, 255), outline_color=COL_INK, outline_width=10)
    c.fill_wobbly_box(100, 150, 156, 195, fill_color=(195, 155, 235, 255), outline_color=COL_INK, outline_width=8, radius=8)
    # Eye sockets
    c.fill_wobbly_ellipse(108, 115, 14, 16, fill_color=COL_INK, outline_width=0)
    c.fill_wobbly_ellipse(148, 115, 14, 16, fill_color=COL_INK, outline_width=0)
    fxs["fx_skull_1"] = c.img

    # 4) fx_sparkle: 반짝이 별
    c = CrayonEngine(256, 256, seed=404)
    for sx, sy, ss in [(128, 128, 70), (65, 70, 35), (200, 80, 40), (80, 190, 32)]:
        c.draw_hand_text("★", sx, sy, size=ss, color=(255, 215, 45, 255), bold=True)
    fxs["fx_sparkle_1"] = c.img

    # 5) fx_poop: 귀여운 똥 이모지
    c = CrayonEngine(256, 256, seed=405)
    c.fill_wobbly_ellipse(128, 175, 75, 42, fill_color=(168, 105, 55, 255), outline_color=COL_INK, outline_width=10)
    c.fill_wobbly_ellipse(128, 125, 58, 36, fill_color=(185, 118, 65, 255), outline_color=COL_INK, outline_width=9)
    c.fill_wobbly_ellipse(128, 85, 38, 28, fill_color=(198, 130, 75, 255), outline_color=COL_INK, outline_width=8)
    # Cute smiling eyes
    c.fill_wobbly_ellipse(112, 125, 6, 6, fill_color=COL_INK, outline_width=0)
    c.fill_wobbly_ellipse(144, 125, 6, 6, fill_color=COL_INK, outline_width=0)
    fxs["fx_poop_1"] = c.img

    # 6) fx_beans: 콩 튀김
    c = CrayonEngine(256, 256, seed=406)
    for bx, by in [(80, 80), (180, 70), (128, 140), (70, 190), (195, 185)]:
        c.fill_wobbly_ellipse(bx, by, 22, 16, fill_color=(135, 215, 85, 255), outline_color=COL_INK, outline_width=6)
        c.draw_crayon_polyline([(bx, by), (bx + c.rng.integers(-25, 25), by + c.rng.integers(-25, 25))], width=4, color=COL_INK)
    fxs["fx_beans_1"] = c.img

    # 7) fx_pixel: 8비트 레트로 도트 구름
    c = CrayonEngine(256, 256, seed=407)
    for px, py, pw in [(100, 110, 45), (140, 90, 55), (80, 140, 60), (130, 140, 50), (170, 120, 45)]:
        c.fill_polygon([(px, py), (px + pw, py), (px + pw, py + pw), (px, py + pw)], fill_color=(255, 225, 85, 255), outline_color=COL_INK, outline_width=8)
    fxs["fx_pixel_1"] = c.img

    # 8) fx_petals: 흩날리는 벚꽃잎
    c = CrayonEngine(256, 256, seed=408)
    for px, py, ang in [(128, 120, 20), (75, 75, -45), (185, 80, 60), (80, 180, 15), (190, 185, -30)]:
        c.fill_wobbly_ellipse(px, py, 26, 14, fill_color=(255, 180, 195, 255), outline_color=COL_INK, outline_width=6, angle_deg=ang)
    fxs["fx_petals_1"] = c.img

    return fxs


def generate_bubble_pack():
    """4 items of 512x256 transparent RGBA PNG wobbly comic speech bubbles (9-slice compatible, bottom-left tail)."""
    bubbles = {}
    W, H = 512, 256

    # 1) bubble_katalk: 카톡풍 둥근 노란 말풍선
    c = CrayonEngine(W, H, seed=501)
    pts = [
        (40, 40), (472, 40), (472, 190), (120, 190), (60, 235), (80, 190), (40, 190)
    ]
    c.fill_polygon(pts, fill_color=(255, 235, 75, 255), outline_color=COL_INK, outline_width=14)
    bubbles["bubble_katalk"] = c.img

    # 2) bubble_shout: 만화 뾰족 외침 말풍선 (외침·비명용)
    c = CrayonEngine(W, H, seed=502)
    shout_pts = [
        (40, 50), (120, 30), (200, 45), (280, 25), (360, 45), (440, 30), (480, 70),
        (495, 130), (470, 180), (390, 190), (310, 180), (230, 195), (140, 185),
        (60, 240), (95, 190), (35, 165), (20, 110)
    ]
    c.fill_polygon(shout_pts, fill_color=COL_WHITE, outline_color=COL_INK, outline_width=16)
    bubbles["bubble_shout"] = c.img

    # 3) bubble_thought: 복슬복슬 생각 구름 말풍선
    c = CrayonEngine(W, H, seed=503)
    c.fill_wobbly_box(50, 40, 470, 190, fill_color=COL_WHITE, outline_color=COL_INK, outline_width=14, radius=45)
    # Floating thought bubbles to bottom-left
    c.fill_wobbly_ellipse(90, 205, 16, 16, fill_color=COL_WHITE, outline_color=COL_INK, outline_width=8)
    c.fill_wobbly_ellipse(65, 225, 10, 10, fill_color=COL_WHITE, outline_color=COL_INK, outline_width=6)
    bubbles["bubble_thought"] = c.img

    # 4) bubble_torn: 찢어진 메모지 말풍선
    c = CrayonEngine(W, H, seed=504)
    torn_pts = [(40, 40)]
    for tx in np.linspace(40, 472, 12):
        torn_pts.append((tx, 40 + c.rng.integers(-6, 6)))
    torn_pts.append((472, 190))
    for tx in np.linspace(472, 120, 8):
        torn_pts.append((tx, 190 + c.rng.integers(-6, 6)))
    torn_pts.extend([(60, 235), (85, 190), (40, 190)])
    c.fill_polygon(torn_pts, fill_color=(254, 248, 225, 255), outline_color=COL_INK, outline_width=14)
    bubbles["bubble_torn"] = c.img

    return bubbles


def generate_frame_pack():
    """6 items of 1080x1240 transparent RGBA PNG (center 1080x1080 transparent cutout for sharing)."""
    frames = {}
    W, H = 1080, 1240

    # 1) frame_polaroid: 폴라로이드 사진 테두리 (하단 넓은 흰 여백 + 손글씨)
    c = CrayonEngine(W, H, seed=601)
    # Polaroid thick white border
    c.fill_polygon([(0, 0), (W, 0), (W, H), (0, H)], fill_color=(252, 250, 246, 255), outline_color=COL_INK, outline_width=20)
    # Handwritten caption at bottom
    c.draw_hand_text("그날, 참지 못했던 우리... ★", 540, 1150, size=52, color=COL_INK, bold=True)
    # Clear center 1080x1080 cutout (with slight margin: 40..1040)
    arr = np.asarray(c.img).copy()
    arr[40:1040, 40:1040, 3] = 0
    frames["frame_polaroid"] = Image.fromarray(arr)

    # 2) frame_newspaper: 신문 1면 특종 프레임
    c = CrayonEngine(W, H, seed=602)
    c.fill_polygon([(0, 0), (W, 0), (W, H), (0, H)], fill_color=(242, 236, 222, 255), outline_color=COL_INK, outline_width=20)
    # Header headline banner
    c.draw_hand_text("【 뿡 뿡 일 보 】  제 2026 호", 540, 35, size=32, color=COL_INK, bold=True)
    c.draw_hand_text("[단독] 사상 초유의 괄약근 사태 발생!!", 540, 1150, size=48, color=(215, 35, 35, 255), bold=True)
    arr = np.asarray(c.img).copy()
    arr[65:1085, 40:1040, 3] = 0
    frames["frame_newspaper"] = Image.fromarray(arr)

    # 3) frame_vhs: 90년대 VHS 녹화 테두리 (REC 불빛, SP 재생, 날짜)
    c = CrayonEngine(W, H, seed=603)
    # Black camcorder letterbox bars
    c.fill_polygon([(0, 0), (W, 0), (W, 80), (0, 80)], fill_color=(15, 15, 18, 255), outline_color=None, outline_width=0)
    c.fill_polygon([(0, 1140), (W, 1140), (W, H), (0, H)], fill_color=(15, 15, 18, 255), outline_color=None, outline_width=0)
    c.fill_wobbly_ellipse(70, 40, 16, 16, fill_color=(255, 45, 45, 255), outline_width=0)
    c.draw_hand_text("● REC", 145, 40, size=32, color=COL_WHITE, bold=True)
    c.draw_hand_text("SP  0:14:28", 920, 40, size=30, color=COL_WHITE, bold=True)
    c.draw_hand_text("OCT 22 2026  PM 02:14", 540, 1190, size=34, color=(255, 225, 65, 255), bold=True)
    frames["frame_vhs"] = c.img

    # 4) frame_gold: 상장 금빛 장식 프레임
    c = CrayonEngine(W, H, seed=604)
    c.draw_crayon_polyline([(40, 40), (W - 40, 40), (W - 40, H - 40), (40, H - 40)], width=28, color=(255, 205, 45, 255), closed=True)
    c.draw_crayon_polyline([(60, 60), (W - 60, 60), (W - 60, H - 60), (60, H - 60)], width=14, color=COL_INK, closed=True)
    c.draw_hand_text("★ 대 한 민 국   괄 약 근   협 회 ★", 540, 1160, size=42, color=(215, 165, 25, 255), bold=True)
    arr = np.asarray(c.img).copy()
    arr[75:1095, 75:1005, 3] = 0
    frames["frame_gold"] = Image.fromarray(arr)

    # 5) frame_wanted: 현상수배 지명수배 포스터
    c = CrayonEngine(W, H, seed=605)
    c.fill_polygon([(0, 0), (W, 0), (W, H), (0, H)], fill_color=(235, 212, 175, 255), outline_color=COL_INK, outline_width=22)
    c.draw_hand_text("W A N T E D", 540, 45, size=58, color=(75, 45, 25, 255), bold=True)
    c.draw_hand_text("REWARD: $10,000,000 - DEAD OR ALIVE", 540, 1150, size=36, color=(165, 35, 25, 255), bold=True)
    arr = np.asarray(c.img).copy()
    arr[80:1100, 50:1030, 3] = 0
    frames["frame_wanted"] = Image.fromarray(arr)

    # 6) frame_museum: 미술관 액자 + "작품명: 뿡"
    c = CrayonEngine(W, H, seed=606)
    c.fill_polygon([(0, 0), (W, 0), (W, H), (0, H)], fill_color=(125, 82, 52, 255), outline_color=COL_INK, outline_width=24)
    # Brass plaque at bottom
    c.fill_wobbly_box(340, 1120, 740, 1200, fill_color=(255, 235, 145, 255), outline_color=COL_INK, outline_width=14, radius=10)
    c.draw_hand_text("작품명: 침묵의 암살자 (2026, 뿡)", 540, 1160, size=28, color=COL_INK, bold=True)
    arr = np.asarray(c.img).copy()
    arr[50:1090, 50:1030, 3] = 0
    frames["frame_museum"] = Image.fromarray(arr)

    return frames


# =========================================================================
# 5. MASTER EXECUTION & GALLERY COMPILATION
# =========================================================================

def save_and_compile_all():
    print(">>> 1. Generating P1 + Seasonal Wear items (13 files)...")
    wears = generate_wear_pack()
    for item_id, img in wears.items():
        if item_id == "wear_santa":
            path = os.path.join(BASE_SKIN_DIR, "season", f"{item_id}.png")
        else:
            path = os.path.join(BASE_SKIN_DIR, "wear", f"{item_id}.png")
        img.save(path)
        print(f"  Saved {path}")

    print(">>> 2. Generating P0 + Seasonal Props (19 files)...")
    props = generate_prop_pack()
    for item_id, img in props.items():
        if item_id in ("prop_pumpkin", "prop_bok", "prop_yeot"):
            path = os.path.join(BASE_SKIN_DIR, "season", f"{item_id}.png")
        else:
            path = os.path.join(BASE_SKIN_DIR, "prop", f"{item_id}.png")
        img.save(path)
        print(f"  Saved {path}")

    print(">>> 3. Generating P0 + Seasonal Backgrounds (15 files)...")
    bgs = generate_background_pack()
    for item_id, img in bgs.items():
        if item_id in ("bg_snow", "bg_hanbok", "bg_upsidedown"):
            path = os.path.join(BASE_SKIN_DIR, "season", f"{item_id}.png")
        else:
            path = os.path.join(BASE_SKIN_DIR, "bg", f"{item_id}.png")
        img.save(path)
        print(f"  Saved {path}")

    print(">>> 4. Generating P2 FX (8 items)...")
    fxs = generate_fx_pack()
    for item_id, img in fxs.items():
        path = os.path.join(BASE_SKIN_DIR, "fx", f"{item_id}.png")
        img.save(path)
        print(f"  Saved {path}")

    print(">>> 5. Generating P2 Bubbles (4 items)...")
    bubbles = generate_bubble_pack()
    for item_id, img in bubbles.items():
        path = os.path.join(BASE_SKIN_DIR, "bubble", f"{item_id}.png")
        img.save(path)
        print(f"  Saved {path}")

    print(">>> 6. Generating P2 Frames (6 items)...")
    frames = generate_frame_pack()
    for item_id, img in frames.items():
        path = os.path.join(BASE_SKIN_DIR, "frame", f"{item_id}.png")
        img.save(path)
        print(f"  Saved {path}")

    print(">>> 7. Creating Master Proof Sheet for Inspection...")
    sheet_w, sheet_h = 2400, 3200
    sheet = Image.new("RGBA", (sheet_w, sheet_h), (242, 240, 235, 255))
    sd = ImageDraw.Draw(sheet)

    def draw_header(title, y):
        sd.rectangle([40, y, sheet_w - 40, y + 50], fill=(42, 40, 48, 255))
        sd.text((60, y + 10), title, fill=(255, 255, 255, 255), font=ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 26))

    # Section 1: Wear items (13 items)
    draw_header("P1 WEAR ITEMS (Eye-Locked to 372,430 & 652,430)", 30)
    wear_keys = list(wears.keys())
    for idx, k in enumerate(wear_keys):
        col = idx % 7
        row = idx // 7
        x = 50 + col * 330
        y = 90 + row * 230
        sd.rectangle([x, y, x + 310, y + 210], fill=(255, 255, 255, 255), outline=(200, 200, 200, 255), width=2)
        thumb = wears[k].resize((180, 180), Image.Resampling.LANCZOS)
        sheet.paste(thumb, (x + 65, y + 10), thumb)
        sd.text((x + 10, y + 185), k, fill=(50, 50, 50, 255), font=ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", 16))

    # Section 2: Props (19 items)
    draw_header("P0 PROPS (Crayon Hand-Drawn / Meme Vibe)", 580)
    prop_keys = list(props.keys())
    for idx, k in enumerate(prop_keys):
        col = idx % 7
        row = idx // 7
        x = 50 + col * 330
        y = 640 + row * 220
        sd.rectangle([x, y, x + 310, y + 200], fill=(255, 255, 255, 255), outline=(200, 200, 200, 255), width=2)
        thumb = props[k].resize((160, 160), Image.Resampling.LANCZOS)
        sheet.paste(thumb, (x + 75, y + 10), thumb)
        sd.text((x + 10, y + 175), k, fill=(50, 50, 50, 255), font=ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", 15))

    # Section 3: Backgrounds (15 items)
    draw_header("P0 BACKGROUNDS (1080x2340 Vertical)", 1340)
    bg_keys = list(bgs.keys())
    for idx, k in enumerate(bg_keys):
        col = idx % 8
        row = idx // 8
        x = 50 + col * 285
        y = 1400 + row * 430
        sd.rectangle([x, y, x + 265, y + 410], fill=(255, 255, 255, 255), outline=(200, 200, 200, 255), width=2)
        thumb = bgs[k].resize((160, 346), Image.Resampling.LANCZOS)
        sheet.paste(thumb, (x + 52, y + 15))
        sd.text((x + 10, y + 375), k, fill=(50, 50, 50, 255), font=ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", 14))

    # Section 4: FX, Bubbles & Frames
    draw_header("P2 FX, BUBBLES & FRAMES", 2300)
    # FX
    fx_keys = list(fxs.keys())
    for idx, k in enumerate(fx_keys):
        x = 50 + idx * 280
        y = 2360
        sd.rectangle([x, y, x + 260, y + 200], fill=(255, 255, 255, 255), outline=(200, 200, 200, 255), width=2)
        thumb = fxs[k].resize((140, 140), Image.Resampling.LANCZOS)
        sheet.paste(thumb, (x + 60, y + 15), thumb)
        sd.text((x + 10, y + 165), k, fill=(50, 50, 50, 255), font=ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", 15))

    # Bubbles & Frames
    for idx, (bk, bi) in enumerate(bubbles.items()):
        x = 50 + idx * 360
        y = 2580
        sd.rectangle([x, y, x + 340, y + 180], fill=(240, 240, 240, 255), outline=(200, 200, 200, 255), width=2)
        thumb = bi.resize((260, 130), Image.Resampling.LANCZOS)
        sheet.paste(thumb, (x + 40, y + 15), thumb)
        sd.text((x + 10, y + 150), bk, fill=(50, 50, 50, 255), font=ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", 15))

    for idx, (fk, fi) in enumerate(frames.items()):
        x = 50 + idx * 380
        y = 2780
        sd.rectangle([x, y, x + 360, y + 380], fill=(240, 240, 240, 255), outline=(200, 200, 200, 255), width=2)
        thumb = fi.resize((250, 287), Image.Resampling.LANCZOS)
        sheet.paste(thumb, (x + 55, y + 25), thumb)
        sd.text((x + 10, y + 335), fk, fill=(50, 50, 50, 255), font=ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", 15))

    master_path = os.path.join(ARTIFACT_DIR, "skin_wishlist_master_sheet.png")
    sheet.save(master_path)
    print(f"\n>>> Master proof sheet saved to: {master_path}")


if __name__ == "__main__":
    save_and_compile_all()
