# -*- coding: utf-8 -*-
"""
Generates:
1. Base character images (`assets/hamster.png`, `assets/tit.png`, `assets/cat.png`)
   unified with the 3-character x 7-expression Expansion Pack design (1024x1024 transparent PNG).
2. All 21 Expression Pack images (`assets/expressions/{hamster,tit,cat}_{1..7}_*.png`, 1024x1024 transparent PNG).
3. All 9 Tamagotchi animation sprites (`assets/sprites/*.png`) using the EXACT SAME character design
   so characters never revert to the old design when walking, jumping, singing, flying, or sleeping.
4. Pixel sunglasses prop (`assets/expressions/pixel_sunglasses.png`).
"""

import math
import os
import shutil
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ASSETS_DIR = r"c:\bgbb\assets"
OUT_DIR = r"c:\bgbb\assets\expressions"
SPRITES_DIR = r"c:\bgbb\assets\sprites"
ARTIFACT_DIR = r"C:\Users\ruahn49\.gemini\antigravity\brain\b2ce85ba-1f7b-478f-8be4-052d7e2dab69"

os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(SPRITES_DIR, exist_ok=True)
os.makedirs(ARTIFACT_DIR, exist_ok=True)

CANVAS_SIZE = 1024

# Locked Eye Coordinates for #1, #3, #4, #6, #7 (strictly locked on #3, #4, #6)
LEFT_EYE_XY = (372, 430)
RIGHT_EYE_XY = (652, 430)


class CrayonCanvas:
    """Renders shapes and strokes with an authentic rough wax-crayon texture on a 1024x1024 RGBA image."""

    def __init__(self, size=CANVAS_SIZE, seed=42):
        self.size = size
        self.rng = np.random.default_rng(seed)
        self.img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        self.grain = self._make_paper_grain(size)

    def _make_paper_grain(self, size):
        fine = self.rng.normal(0.0, 1.0, (size, size)).astype(np.float32)
        coarse_small = self.rng.normal(0.0, 1.0, (size // 3, size // 3)).astype(np.float32)
        coarse_img = Image.fromarray(((coarse_small + 3.0) / 6.0 * 255).clip(0, 255).astype(np.uint8))
        coarse_img = coarse_img.resize((size, size), Image.Resampling.BILINEAR)
        coarse = (np.asarray(coarse_img, dtype=np.float32) / 255.0) * 6.0 - 3.0
        return 0.55 * coarse + 0.45 * fine

    def _apply_crayon_fill(self, mask_img, color, roughness=0.18):
        mask_np = np.asarray(mask_img, dtype=np.float32) / 255.0
        if mask_np.max() <= 0:
            return
        perturbed = mask_np + self.grain * (roughness * 1.4)
        alpha = np.clip((perturbed - 0.32) / 0.35, 0.0, 1.0) * mask_np
        r, g, b = color[:3]
        a_mult = (color[3] / 255.0) if len(color) > 3 else 1.0
        tooth = np.clip(1.0 + self.grain * 0.025, 0.94, 1.05)

        layer = np.zeros((self.size, self.size, 4), dtype=np.uint8)
        layer[..., 0] = np.clip(r * tooth, 0, 255).astype(np.uint8)
        layer[..., 1] = np.clip(g * tooth, 0, 255).astype(np.uint8)
        layer[..., 2] = np.clip(b * tooth, 0, 255).astype(np.uint8)
        layer[..., 3] = np.clip(alpha * 255.0 * a_mult, 0, 255).astype(np.uint8)
        self.img = Image.alpha_composite(self.img, Image.fromarray(layer, "RGBA"))

    def _apply_crayon_stroke_mask(self, stroke_mask, color=(22, 20, 19, 255), grain_strength=0.52):
        mask_np = np.asarray(stroke_mask, dtype=np.float32) / 255.0
        if mask_np.max() <= 0:
            return
        wax = mask_np + self.grain * grain_strength * (1.0 - 0.55 * mask_np)
        alpha = np.clip((wax - 0.38) / 0.28, 0.0, 1.0)
        alpha = np.where(mask_np > 0.03, alpha, 0.0)

        r, g, b = color[:3]
        a_mult = (color[3] / 255.0) if len(color) > 3 else 1.0
        layer = np.zeros((self.size, self.size, 4), dtype=np.uint8)
        layer[..., 0] = r
        layer[..., 1] = g
        layer[..., 2] = b
        layer[..., 3] = np.clip(alpha * 255.0 * a_mult, 0, 255).astype(np.uint8)
        self.img = Image.alpha_composite(self.img, Image.fromarray(layer, "RGBA"))

    def draw_crayon_polyline(self, points, width=22, color=(22, 20, 19, 255), closed=False, jitter=1.8):
        if len(points) < 2:
            return
        pts = list(points)
        if closed:
            pts.append(pts[0])

        mask = Image.new("L", (self.size, self.size), 0)
        draw = ImageDraw.Draw(mask)
        r_base = width / 2.0
        for i in range(len(pts) - 1):
            x0, y0 = pts[i]
            x1, y1 = pts[i + 1]
            dist = math.hypot(x1 - x0, y1 - y0)
            steps = max(2, int(dist / 2.2))
            for s in range(steps + 1):
                t = s / steps
                px = x0 + (x1 - x0) * t + self.rng.normal(0, jitter * 0.45)
                py = y0 + (y1 - y0) * t + self.rng.normal(0, jitter * 0.45)
                rad = r_base * (0.92 + 0.16 * self.rng.random())
                draw.ellipse([px - rad, py - rad, px + rad, py + rad], fill=235)
                for _ in range(2):
                    bx = px + self.rng.normal(0, r_base * 0.48)
                    by = py + self.rng.normal(0, r_base * 0.48)
                    brad = rad * 0.52
                    draw.ellipse([bx - brad, by - brad, bx + brad, by + brad], fill=165)

        mask = mask.filter(ImageFilter.GaussianBlur(radius=1.1))
        self._apply_crayon_stroke_mask(mask, color=color)

    def fill_polygon(self, points, fill_color, outline_color=(22, 20, 19, 255), outline_width=22, jitter=1.8):
        mask = Image.new("L", (self.size, self.size), 0)
        draw = ImageDraw.Draw(mask)
        draw.polygon(points, fill=255)
        mask = mask.filter(ImageFilter.GaussianBlur(radius=1.5))
        self._apply_crayon_fill(mask, fill_color)
        if outline_width and outline_width > 0:
            self.draw_crayon_polyline(points, width=outline_width, color=outline_color, closed=True, jitter=jitter)

    def fill_ellipse(self, bbox, fill_color, outline_color=(22, 20, 19, 255), outline_width=22, angle=0.0, segments=72):
        x0, y0, x1, y1 = bbox
        cx = (x0 + x1) / 2.0
        cy = (y0 + y1) / 2.0
        rx = (x1 - x0) / 2.0
        ry = (y1 - y0) / 2.0
        rad_a = math.radians(angle)
        cos_a, sin_a = math.cos(rad_a), math.sin(rad_a)
        pts = []
        for i in range(segments):
            th = 2.0 * math.pi * i / segments
            px = rx * math.cos(th)
            py = ry * math.sin(th)
            rx_p = cx + px * cos_a - py * sin_a
            ry_p = cy + px * sin_a + py * cos_a
            pts.append((rx_p, ry_p))
        if fill_color is not None:
            mask = Image.new("L", (self.size, self.size), 0)
            draw = ImageDraw.Draw(mask)
            draw.polygon(pts, fill=255)
            mask = mask.filter(ImageFilter.GaussianBlur(radius=1.5))
            self._apply_crayon_fill(mask, fill_color)
        if outline_width and outline_width > 0:
            self.draw_crayon_polyline(pts, width=outline_width, color=outline_color, closed=True)

    def draw_arc_pts(self, cx, cy, rx, ry, deg_start, deg_end, width=20, color=(22, 20, 19, 255), segments=40):
        pts = []
        for i in range(segments + 1):
            t = i / segments
            th = math.radians(deg_start + (deg_end - deg_start) * t)
            pts.append((cx + rx * math.cos(th), cy + ry * math.sin(th)))
        self.draw_crayon_polyline(pts, width=width, color=color, closed=False)


def bezier_curve(p0, p1, p2, p3, steps=40):
    pts = []
    for i in range(steps + 1):
        t = i / steps
        mt = 1.0 - t
        x = (mt**3)*p0[0] + 3*(mt**2)*t*p1[0] + 3*mt*(t**2)*p2[0] + (t**3)*p3[0]
        y = (mt**3)*p0[1] + 3*(mt**2)*t*p1[1] + 3*mt*(t**2)*p2[1] + (t**3)*p3[1]
        pts.append((x, y))
    return pts


def quad_curve(p0, p1, p2, steps=30):
    pts = []
    for i in range(steps + 1):
        t = i / steps
        mt = 1.0 - t
        x = (mt**2)*p0[0] + 2*mt*t*p1[0] + (t**2)*p2[0]
        y = (mt**2)*p0[1] + 2*mt*t*p1[1] + (t**2)*p2[1]
        pts.append((x, y))
    return pts


COL_BLACK = (22, 20, 19, 255)
COL_DARK_CHARCOAL = (42, 38, 36, 255)
COL_WHITE = (252, 250, 246, 255)
COL_HAMSTER_HAIR = (254, 211, 106, 255)   # #FED36A
COL_CHEEK_PINK = (255, 168, 164, 255)     # #FFA8A4
COL_CHEEK_HOT = (255, 132, 132, 255)
COL_TIT_WING = (141, 103, 72, 255)        # #8D6748
COL_CAT_ORANGE = (255, 183, 125, 255)     # #FFB77D
COL_TEAR_BLUE = (130, 212, 255, 255)
COL_SWEAT_BLUE = (155, 222, 255, 255)
COL_FART_YELLOW = (242, 228, 118, 235)
COL_MOUTH_RED = (228, 108, 108, 255)


def make_body_silhouette_pts(cx=512, top_y=150, bot_y=950, half_w_top=325, half_w_bot=385, cheek_bulge=0.0):
    """Creates a big, front-facing, frame-filling chubby mochi silhouette."""
    c1 = bezier_curve(
        (cx, top_y),
        (cx + half_w_top * 0.68, top_y),
        (cx + half_w_top * (1.02 + cheek_bulge * 0.14), top_y + 120),
        (cx + half_w_top * (1.06 + cheek_bulge * 0.22), top_y + 310),
        steps=28,
    )
    c2 = bezier_curve(
        c1[-1],
        (cx + half_w_bot * (1.04 + cheek_bulge * 0.18), top_y + 470),
        (cx + half_w_bot * 1.02, bot_y - 95),
        (cx + half_w_bot * 0.55, bot_y),
        steps=28,
    )
    c3 = bezier_curve(
        c2[-1],
        (cx + half_w_bot * 0.20, bot_y + 18),
        (cx - half_w_bot * 0.20, bot_y + 18),
        (cx - half_w_bot * 0.55, bot_y),
        steps=20,
    )
    c4 = bezier_curve(
        c3[-1],
        (cx - half_w_bot * 1.02, bot_y - 95),
        (cx - half_w_bot * (1.04 + cheek_bulge * 0.18), top_y + 470),
        (cx - half_w_top * (1.06 + cheek_bulge * 0.22), top_y + 310),
        steps=28,
    )
    c5 = bezier_curve(
        c4[-1],
        (cx - half_w_top * (1.02 + cheek_bulge * 0.14), top_y + 120),
        (cx - half_w_top * 0.68, top_y),
        (cx, top_y),
        steps=28,
    )
    return c1[:-1] + c2[:-1] + c3[:-1] + c4[:-1] + c5[:-1]


def draw_character_base(cc: CrayonCanvas, char_id: str, exp_id: int, pose_variant: str = "normal"):
    """
    Draws the unified character base design.
    pose_variant can be: 'normal' | 'walk' | 'fly' | 'sleep'
    """
    is_closeup = (exp_id == 2)
    is_hold = (exp_id == 4)
    is_burst = (exp_id == 5)
    is_fly = (pose_variant == "fly")
    is_walk = (pose_variant == "walk")

    if is_closeup:
        cx, top_y, bot_y = 512, 35, 1060
        hw_top, hw_bot = 465, 505
        cheek_bulge = 0.10
    elif is_burst or is_fly:
        cx, top_y, bot_y = 512, 135, 920
        hw_top, hw_bot = 335, 375
        cheek_bulge = 0.05
    else:
        cx, top_y, bot_y = 512, 155, 955
        hw_top, hw_bot = 335, 390
        cheek_bulge = 0.22 if is_hold else 0.0

    # --- 1. EARS (for Hamster) ---
    if char_id == "hamster":
        if is_closeup:
            ear_l = (55, 12, 265, 210)
            ear_r = (759, 12, 969, 210)
            inner_l = (95, 50, 225, 175)
            inner_r = (799, 50, 929, 175)
        else:
            ear_l = (185, 115, 335, 265)
            ear_r = (689, 115, 839, 265)
            inner_l = (215, 145, 305, 235)
            inner_r = (719, 145, 809, 235)
        cc.fill_ellipse(ear_l, COL_WHITE, COL_BLACK, outline_width=24)
        cc.fill_ellipse(ear_r, COL_WHITE, COL_BLACK, outline_width=24)
        cc.fill_ellipse(inner_l, COL_CHEEK_PINK, outline_color=None, outline_width=0)
        cc.fill_ellipse(inner_r, COL_CHEEK_PINK, outline_color=None, outline_width=0)

    # --- 2. MAIN CHUBBY BODY / HEAD SILHOUETTE ---
    body_pts = make_body_silhouette_pts(cx, top_y, bot_y, hw_top, hw_bot, cheek_bulge=cheek_bulge)

    if char_id == "cat":
        mask = Image.new("L", (CANVAS_SIZE, CANVAS_SIZE), 0)
        d = ImageDraw.Draw(mask)
        d.polygon(body_pts, fill=255)
        if is_closeup:
            ear_l_poly = [(85, 240), (95, 10), (335, 95)]
            ear_r_poly = [(689, 95), (929, 10), (939, 240)]
        else:
            ear_l_poly = [(210, 290), (205, 85), (375, 175)]
            ear_r_poly = [(649, 175), (819, 85), (814, 290)]
        d.polygon(ear_l_poly, fill=255)
        d.polygon(ear_r_poly, fill=255)
        mask = mask.filter(ImageFilter.GaussianBlur(radius=1.5))
        cc._apply_crayon_fill(mask, COL_WHITE)

        patch_mask = Image.new("L", (CANVAS_SIZE, CANVAS_SIZE), 0)
        pd = ImageDraw.Draw(patch_mask)
        if is_closeup:
            pd.polygon(ear_l_poly, fill=255)
            pd.ellipse([55, 25, 435, 365], fill=255)
            pd.ellipse([375, 835, 649, 1045], fill=255)
        else:
            pd.polygon(ear_l_poly, fill=255)
            pd.ellipse([175, 120, 445, 375], fill=255)
            pd.ellipse([415, 680, 625, 875], fill=255)
        patch_np = np.minimum(np.asarray(patch_mask), np.asarray(mask))
        cc._apply_crayon_fill(Image.fromarray(patch_np), COL_CAT_ORANGE)

        cc.draw_crayon_polyline(ear_l_poly, width=24, color=COL_BLACK, closed=False)
        cc.draw_crayon_polyline(ear_r_poly, width=24, color=COL_BLACK, closed=False)
        cc.draw_crayon_polyline(body_pts, width=24, color=COL_BLACK, closed=True)
    else:
        cc.fill_polygon(body_pts, COL_WHITE, COL_BLACK, outline_width=24)

    # --- 3. CHARACTER TOP DETAILS & WINGS ---
    if char_id == "hamster":
        if is_closeup:
            hy_top = 34
            hy_bot = 205
            hx_l, hx_r = 290, 734
        else:
            hy_top = 152
            hy_bot = 278
            hx_l, hx_r = 355, 669
        hair_pts = [
            (hx_l, hy_top + 35),
            (512, hy_top - 8),
            (hx_r, hy_top + 35),
            (hx_r - 20, hy_bot - 15),
            (595, hy_bot + 10),
            (545, hy_bot - 18),
            (512, hy_bot + 14),
            (475, hy_bot - 18),
            (425, hy_bot + 10),
            (hx_l + 20, hy_bot - 15),
        ]
        cc.fill_polygon(hair_pts, COL_HAMSTER_HAIR, outline_color=None, outline_width=0)
        wave1 = quad_curve((hx_l + 10, hy_bot - 22), (430, hy_bot + 22), (485, hy_bot - 14), 16)
        wave2 = quad_curve((485, hy_bot - 14), (512, hy_bot + 24), (545, hy_bot - 14), 14)
        wave3 = quad_curve((545, hy_bot - 14), (600, hy_bot + 22), (hx_r - 10, hy_bot - 22), 16)
        cc.draw_crayon_polyline(wave1 + wave2[1:] + wave3[1:], width=20, color=COL_BLACK, closed=False)
        top_arc = quad_curve((hx_l - 5, hy_top + 35), (512, hy_top - 15), (hx_r + 5, hy_top + 35), 24)
        cc.draw_crayon_polyline(top_arc, width=22, color=COL_BLACK, closed=False)

    elif char_id == "tit":
        tuft_y = 35 if is_closeup else (135 if is_fly else 155)
        cc.draw_crayon_polyline([(465, tuft_y + 8), (495, tuft_y - 24), (515, tuft_y + 4)], width=20, color=COL_BLACK)
        cc.draw_crayon_polyline([(512, tuft_y + 4), (542, tuft_y - 20), (558, tuft_y + 10)], width=20, color=COL_BLACK)

        if not is_closeup and exp_id != 7:
            if is_fly:
                # Raised flapping brown wings for fly sprite!
                wing_l_pts = (
                    bezier_curve((215, 460), (65, 340), (45, 510), (165, 595), 20)
                    + bezier_curve((165, 595), (225, 595), (255, 520), (215, 460), 20)[1:]
                )
                wing_r_pts = (
                    bezier_curve((809, 460), (959, 340), (979, 510), (859, 595), 20)
                    + bezier_curve((859, 595), (799, 595), (769, 520), (809, 460), 20)[1:]
                )
                cc.fill_polygon(wing_l_pts, COL_TIT_WING, COL_BLACK, outline_width=22)
                cc.fill_polygon(wing_r_pts, COL_TIT_WING, COL_BLACK, outline_width=22)
                cc.draw_crayon_polyline([(110, 465), (195, 515)], width=18, color=COL_WHITE)
                cc.draw_crayon_polyline([(914, 465), (829, 515)], width=18, color=COL_WHITE)
            else:
                wy = -40 if is_burst else 0
                wing_l_pts = (
                    bezier_curve((215, 510 + wy), (115, 520 + wy), (95, 675 + wy), (165, 755 + wy), 20)
                    + bezier_curve((165, 755 + wy), (235, 765 + wy), (265, 635 + wy), (215, 510 + wy), 20)[1:]
                )
                wing_r_pts = (
                    bezier_curve((809, 510 + wy), (909, 520 + wy), (929, 675 + wy), (859, 755 + wy), 20)
                    + bezier_curve((859, 755 + wy), (789, 765 + wy), (759, 635 + wy), (809, 510 + wy), 20)[1:]
                )
                cc.fill_polygon(wing_l_pts, COL_TIT_WING, COL_BLACK, outline_width=22)
                cc.fill_polygon(wing_r_pts, COL_TIT_WING, COL_BLACK, outline_width=22)
                cc.draw_crayon_polyline([(142, 625 + wy), (218, 665 + wy)], width=18, color=COL_WHITE)
                cc.draw_crayon_polyline([(882, 625 + wy), (806, 665 + wy)], width=18, color=COL_WHITE)

    # --- 4. CHEEK BLUSH & ARMS/FEET ---
    if is_closeup:
        cheek_l = (95, 535, 285, 650)
        cheek_r = (739, 535, 929, 650)
    elif is_hold:
        cheek_l = (165, 455, 355, 595)
        cheek_r = (669, 455, 859, 595)
    else:
        cheek_l = (210, 470, 345, 555)
        cheek_r = (679, 470, 814, 555)

    cheek_col = COL_CHEEK_HOT if (is_hold or is_burst) else COL_CHEEK_PINK
    cc.fill_ellipse(cheek_l, cheek_col, outline_color=None, outline_width=0)
    cc.fill_ellipse(cheek_r, cheek_col, outline_color=None, outline_width=0)

    if is_hold:
        cc.draw_arc_pts(245, 520, 72, 62, 135, 235, width=20, color=COL_BLACK)
        cc.draw_arc_pts(779, 520, 72, 62, -55, 45, width=20, color=COL_BLACK)

    if not is_closeup:
        foot_y = 918 if (is_burst or is_fly) else 945
        step_l = -22 if is_walk else 0
        step_r = 18 if is_walk else 0
        if char_id == "tit":
            cc.draw_crayon_polyline([(385, foot_y - 10 + step_l), (365, foot_y + 28 + step_l), (395, foot_y + 15 + step_l), (410, foot_y + 30 + step_l)], width=18, color=COL_BLACK)
            cc.draw_crayon_polyline([(639, foot_y - 10 + step_r), (615, foot_y + 30 + step_r), (630, foot_y + 15 + step_r), (659, foot_y + 28 + step_r)], width=18, color=COL_BLACK)
        else:
            cc.draw_arc_pts(370, foot_y + step_l, 52, 28, 10, 170, width=22, color=COL_BLACK)
            cc.draw_arc_pts(654, foot_y + step_r, 52, 28, 10, 170, width=22, color=COL_BLACK)

    if not is_closeup and exp_id != 7 and char_id != "tit":
        if is_burst:
            arm_l = bezier_curve((215, 560), (110, 510), (95, 595), (195, 625), 24)
            arm_r = bezier_curve((809, 560), (914, 510), (929, 595), (829, 625), 24)
            cc.fill_polygon(arm_l, COL_WHITE, COL_BLACK, outline_width=20)
            cc.fill_polygon(arm_r, COL_WHITE, COL_BLACK, outline_width=20)
        elif is_hold:
            arm_l = bezier_curve((250, 620), (325, 600), (350, 675), (265, 690), 22)
            arm_r = bezier_curve((774, 620), (699, 600), (674, 675), (759, 690), 22)
            cc.fill_polygon(arm_l, COL_WHITE, COL_BLACK, outline_width=20)
            cc.fill_polygon(arm_r, COL_WHITE, COL_BLACK, outline_width=20)
        elif is_walk:
            arm_l = bezier_curve((225, 565), (305, 610), (285, 685), (205, 645), 20)
            arm_r = bezier_curve((799, 605), (729, 655), (749, 730), (819, 685), 20)
            cc.draw_crayon_polyline(arm_l, width=20, color=COL_BLACK, closed=False)
            cc.draw_crayon_polyline(arm_r, width=20, color=COL_BLACK, closed=False)
        else:
            arm_l = bezier_curve((225, 585), (295, 635), (275, 710), (205, 665), 20)
            arm_r = bezier_curve((799, 585), (729, 635), (749, 710), (819, 665), 20)
            cc.draw_crayon_polyline(arm_l, width=20, color=COL_BLACK, closed=False)
            cc.draw_crayon_polyline(arm_r, width=20, color=COL_BLACK, closed=False)


def draw_nose_or_beak(cc: CrayonCanvas, char_id: str, cx: int, cy: int, scale: float = 1.0):
    if char_id == "tit":
        w = int(22 * scale)
        h = int(26 * scale)
        pts = [(cx - w, cy - h // 2), (cx + w, cy - h // 2), (cx, cy + h)]
        cc.fill_polygon(pts, COL_BLACK, COL_BLACK, outline_width=int(12 * scale))
    elif char_id == "cat":
        w = int(18 * scale)
        h = int(14 * scale)
        pts = [(cx - w, cy - h // 2), (cx + w, cy - h // 2), (cx, cy + h)]
        cc.fill_polygon(pts, COL_BLACK, COL_BLACK, outline_width=int(10 * scale))
    else:
        r = int(10 * scale)
        cc.fill_ellipse((cx - r * 1.3, cy - r, cx + r * 1.3, cy + r), COL_BLACK, COL_BLACK, outline_width=6)


def draw_thumbs_up_hand(cc: CrayonCanvas, side: str, char_id: str):
    is_left = (side == "left")
    fx = 185 if is_left else 839
    fy = 645
    sign = 1 if is_left else -1

    thumb_pts = [
        (fx - sign * 55, fy + 95),
        (fx - sign * 85, fy + 20),
        (fx - sign * 75, fy - 55),
        (fx - sign * 58, fy - 165),
        (fx - sign * 18, fy - 195),
        (fx + sign * 22, fy - 160),
        (fx + sign * 18, fy - 75),
        (fx + sign * 78, fy - 65),
        (fx + sign * 92, fy + 10),
        (fx + sign * 78, fy + 85),
        (fx + sign * 20, fy + 105),
    ]
    hand_col = COL_TIT_WING if char_id == "tit" else COL_WHITE
    cc.fill_polygon(thumb_pts, hand_col, COL_BLACK, outline_width=22)

    for y_off in [-32, 12, 54]:
        x_start = fx + sign * 12
        x_end = fx + sign * 76
        cc.draw_crayon_polyline([(x_start, fy + y_off), (x_end, fy + y_off)], width=16, color=COL_BLACK)
    if char_id != "tit":
        cc.fill_ellipse((fx - 28, fy - 10, fx + 28, fy + 42), COL_CHEEK_PINK, outline_color=None, outline_width=0)


def draw_expression_features(cc: CrayonCanvas, char_id: str, exp_id: int):
    lx, ly = LEFT_EYE_XY
    rx, ry = RIGHT_EYE_XY

    if exp_id == 1:
        # #1 멍 (무표정 정면, 초점 없는 눈 - 홈 기본)
        er = 23
        cc.fill_ellipse((lx - er, ly - er, lx + er, ly + er), COL_BLACK, COL_BLACK, outline_width=10)
        cc.fill_ellipse((rx - er, ry - er, rx + er, ry + er), COL_BLACK, COL_BLACK, outline_width=10)
        cc.fill_ellipse((lx - 9, ly - 9, lx - 1, ly - 1), COL_WHITE, outline_color=None, outline_width=0)
        cc.fill_ellipse((rx + 1, ry - 9, rx + 9, ry - 1), COL_WHITE, outline_color=None, outline_width=0)

        draw_nose_or_beak(cc, char_id, 512, 470, scale=1.0)
        if char_id != "tit":
            cc.draw_crayon_polyline([(468, 518), (556, 518)], width=20, color=COL_BLACK)
        else:
            cc.draw_crayon_polyline([(485, 512), (539, 512)], width=16, color=COL_BLACK)

    elif exp_id == 2:
        # #2 엥? (얼굴 클로즈업, 동공 확대, 정면 - 터짐 직후, 시안 1)
        elx, ely = 325, 445
        erx, ery = 699, 445
        cc.fill_ellipse((elx - 62, ely - 66, elx + 62, ely + 66), COL_DARK_CHARCOAL, COL_BLACK, outline_width=22)
        cc.fill_ellipse((erx - 62, ery - 66, erx + 62, ery + 66), COL_DARK_CHARCOAL, COL_BLACK, outline_width=22)
        cc.fill_ellipse((elx - 44, ely - 48, elx + 44, ely + 48), COL_BLACK, COL_BLACK, outline_width=8)
        cc.fill_ellipse((erx - 44, ery - 48, erx + 44, ery + 48), COL_BLACK, COL_BLACK, outline_width=8)
        cc.fill_ellipse((elx - 24, ely - 26, elx - 10, ely - 12), COL_WHITE, outline_color=None, outline_width=0)
        cc.fill_ellipse((erx - 24, ery - 26, erx - 10, ery - 12), COL_WHITE, outline_color=None, outline_width=0)

        draw_nose_or_beak(cc, char_id, 512, 520, scale=1.35)
        mouth_pts = [(472, 595), (512, 572), (552, 595), (512, 616)]
        cc.fill_polygon(mouth_pts, COL_MOUTH_RED, COL_BLACK, outline_width=18)

    elif exp_id == 3:
        # #3 뻔뻔 (반쯤 감은 눈, 입꼬리 살짝, 정면 - 선글라스 씌우는 짤, 시안 3·4)
        for ex, ey in [(lx, ly), (rx, ry)]:
            cc.draw_arc_pts(ex, ey - 2, 34, 32, 8, 172, width=20, color=COL_BLACK)
            cc.fill_ellipse((ex - 20, ey - 10, ex + 20, ey + 24), COL_BLACK, outline_color=None, outline_width=0)
            cc.fill_polygon(
                [(ex - 44, ey - 38), (ex + 44, ey - 38), (ex + 44, ey - 6), (ex - 44, ey - 6)],
                COL_WHITE if (char_id != "cat" or ex > 500) else COL_CAT_ORANGE,
                outline_color=None,
                outline_width=0,
            )
            cc.draw_crayon_polyline([(ex - 44, ey - 6), (ex + 44, ey - 6)], width=22, color=COL_BLACK)

        draw_nose_or_beak(cc, char_id, 512, 472, scale=1.0)
        smirk_pts = bezier_curve((455, 528), (505, 532), (555, 520), (582, 492), 24)
        cc.draw_crayon_polyline(smirk_pts, width=20, color=COL_BLACK)
        cc.draw_crayon_polyline([(578, 480), (595, 502)], width=16, color=COL_BLACK)

    elif exp_id == 4:
        # #4 웃참 (볼 빵빵, 입 꾹, 눈물 찔끔 - 앱의 핵심 감정, 홈·알림)
        for is_left, (ex, ey) in [(True, (lx, ly)), (False, (rx, ry))]:
            cc.fill_ellipse((ex - 27, ey - 27, ex + 27, ey + 27), COL_BLACK, COL_BLACK, outline_width=10)
            cc.fill_ellipse((ex - 14, ey - 16, ex + 2, ey), COL_WHITE, outline_color=None, outline_width=0)
            cc.fill_ellipse((ex + 4, ey + 4, ex + 14, ey + 14), COL_WHITE, outline_color=None, outline_width=0)
            cc.draw_arc_pts(ex, ey + 12, 34, 22, 20, 160, width=14, color=COL_BLACK)

            tx = ex - 38 if is_left else ex + 38
            ty = ey + 24
            tear_pts = [
                (ex - 22 if is_left else ex + 22, ey + 6),
                (tx - 16, ty + 14),
                (tx, ty + 32),
                (tx + 16, ty + 14),
            ]
            cc.fill_polygon(tear_pts, COL_TEAR_BLUE, COL_BLACK, outline_width=14)

        cc.draw_crayon_polyline([(lx - 32, ly - 48), (lx + 28, ly - 62)], width=18, color=COL_BLACK)
        cc.draw_crayon_polyline([(rx - 28, ry - 62), (rx + 32, ry - 48)], width=18, color=COL_BLACK)

        draw_nose_or_beak(cc, char_id, 512, 472, scale=1.0)

        wavy_mouth = [
            (438, 522),
            (468, 534),
            (498, 518),
            (526, 534),
            (556, 518),
            (586, 522),
        ]
        cc.draw_crayon_polyline(wavy_mouth, width=20, color=COL_BLACK)
        cc.draw_arc_pts(432, 522, 22, 28, -70, 70, width=18, color=COL_BLACK)
        cc.draw_arc_pts(592, 522, 22, 28, 110, 250, width=18, color=COL_BLACK)

    elif exp_id == 5:
        # #5 터짐 (힘준 얼굴 또는 시원한 얼굴, 몸 들썩 - 소리 모드 결과)
        cc.fill_ellipse((75, 735, 235, 885), COL_FART_YELLOW, COL_BLACK, outline_width=18)
        cc.fill_ellipse((145, 795, 285, 925), COL_FART_YELLOW, COL_BLACK, outline_width=18)
        cc.fill_ellipse((765, 745, 925, 895), COL_FART_YELLOW, COL_BLACK, outline_width=18)

        cc.draw_crayon_polyline([(105, 255), (65, 215)], width=18, color=COL_BLACK)
        cc.draw_crayon_polyline([(85, 325), (38, 310)], width=18, color=COL_BLACK)
        cc.draw_crayon_polyline([(919, 255), (959, 215)], width=18, color=COL_BLACK)
        cc.draw_crayon_polyline([(939, 325), (986, 310)], width=18, color=COL_BLACK)
        cc.draw_arc_pts(512, 115, 140, 28, 200, 340, width=16, color=COL_BLACK)
        cc.draw_arc_pts(512, 82, 95, 20, 205, 335, width=14, color=COL_BLACK)

        cc.draw_crayon_polyline([(lx - 38, ly - 28), (lx + 24, ly), (lx - 38, ly + 28)], width=24, color=COL_BLACK)
        cc.draw_crayon_polyline([(rx + 38, ry - 28), (rx - 24, ry), (rx + 38, ry + 28)], width=24, color=COL_BLACK)

        draw_nose_or_beak(cc, char_id, 512, 462, scale=1.0)

        mouth_poly = bezier_curve((442, 510), (512, 502), (582, 510), (572, 575), 18) + \
                     bezier_curve((572, 575), (512, 605), (452, 575), (442, 510), 18)
        cc.fill_polygon(mouth_poly, COL_MOUTH_RED, COL_BLACK, outline_width=20)
        cc.fill_polygon([(165, 340), (135, 375), (155, 395), (175, 375)], COL_SWEAT_BLUE, COL_BLACK, outline_width=14)
        cc.fill_polygon([(855, 340), (885, 375), (865, 395), (845, 375)], COL_SWEAT_BLUE, COL_BLACK, outline_width=14)

    elif exp_id == 6:
        # #6 모른 척 (고개 돌리고 휘파람, 곁눈질 - 진동·참음 결과)
        for ex, ey in [(lx, ly), (rx, ry)]:
            cc.fill_ellipse((ex - 36, ey - 28, ex + 36, ey + 28), COL_WHITE, COL_BLACK, outline_width=20)
            cc.fill_ellipse((ex + 4, ey - 20, ex + 34, ey + 14), COL_BLACK, COL_BLACK, outline_width=8)
            cc.fill_ellipse((ex + 14, ey - 14, ex + 24, ey - 4), COL_WHITE, outline_color=None, outline_width=0)

        cc.draw_arc_pts(lx + 6, ly - 52, 34, 14, 195, 345, width=16, color=COL_BLACK)
        cc.draw_arc_pts(rx + 6, ry - 52, 34, 14, 195, 345, width=16, color=COL_BLACK)

        draw_nose_or_beak(cc, char_id, 520, 472, scale=1.0)

        cc.fill_ellipse((542, 508, 582, 548), COL_MOUTH_RED, COL_BLACK, outline_width=18)
        cc.draw_crayon_polyline([(595, 518), (632, 505)], width=12, color=COL_BLACK)
        cc.draw_crayon_polyline([(598, 536), (636, 538)], width=12, color=COL_BLACK)
        cc.fill_ellipse((668, 500, 702, 528), COL_BLACK, COL_BLACK, outline_width=6)
        cc.draw_crayon_polyline([(698, 512), (698, 448), (736, 462)], width=16, color=COL_BLACK)

        cc.fill_polygon([(235, 305), (212, 355), (235, 378), (258, 355)], COL_SWEAT_BLUE, COL_BLACK, outline_width=16)

    elif exp_id == 7:
        # #7 엄지척 (양손 엄지, 뿌듯 무표정 - 새 칭호 받았을 때)
        er = 25
        cc.fill_ellipse((lx - er, ly - er, lx + er, ly + er), COL_BLACK, COL_BLACK, outline_width=10)
        cc.fill_ellipse((rx - er, ry - er, rx + er, ry + er), COL_BLACK, COL_BLACK, outline_width=10)
        cc.fill_ellipse((lx - 11, ly - 12, lx + 3, ly + 2), COL_WHITE, outline_color=None, outline_width=0)
        cc.fill_ellipse((rx - 11, ry - 12, rx + 3, ry + 2), COL_WHITE, outline_color=None, outline_width=0)

        cc.draw_arc_pts(lx, ly - 48, 30, 10, 195, 345, width=16, color=COL_BLACK)
        cc.draw_arc_pts(rx, ry - 48, 30, 10, 195, 345, width=16, color=COL_BLACK)

        draw_nose_or_beak(cc, char_id, 512, 470, scale=1.0)

        w_left = quad_curve((462, 520), (487, 538), (512, 515), 16)
        w_right = quad_curve((512, 515), (537, 538), (562, 520), 16)
        cc.draw_crayon_polyline(w_left + w_right[1:], width=20, color=COL_BLACK)

        draw_thumbs_up_hand(cc, "left", char_id)
        draw_thumbs_up_hand(cc, "right", char_id)

    elif exp_id == 8:
        # Sleep face (for hamster_sleep.png / cat_sit.png) using the exact same character design
        cc.draw_arc_pts(lx, ly - 6, 32, 22, 15, 165, width=20, color=COL_BLACK)
        cc.draw_arc_pts(rx, ry - 6, 32, 22, 15, 165, width=20, color=COL_BLACK)
        draw_nose_or_beak(cc, char_id, 512, 472, scale=1.0)
        cc.draw_crayon_polyline([(478, 518), (546, 518)], width=18, color=COL_BLACK)
        # Cute 'Zzz' above right ear
        cc.draw_crayon_polyline([(785, 115), (835, 115), (785, 165), (835, 165)], width=16, color=COL_BLACK)
        cc.draw_crayon_polyline([(855, 55), (915, 55), (855, 115), (915, 115)], width=18, color=COL_BLACK)


def generate_pixel_sunglasses():
    img = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    p = 14
    grid = [
        "11111111111111111111111111111111111111",
        "11111111111111111111111111111111111111",
        "11112211211111111100111122112111111111",
        "11111221121111111000011112211211111111",
        "00111122112111110000001111221121111100",
        "00011112211211100000000111122112111000",
        "00001111111111000000000011111111110000",
        "00000111111110000000000001111111100000",
    ]
    rows = len(grid)
    cols = len(grid[0])
    start_x = 512 - (cols * p) // 2
    start_y = 430 - (rows * p) // 2 + 6

    for r_idx, row in enumerate(grid):
        for c_idx, ch in enumerate(row):
            if ch == "0":
                continue
            x0 = start_x + c_idx * p
            y0 = start_y + r_idx * p
            col = (18, 18, 18, 255) if ch == "1" else (248, 248, 248, 255)
            draw.rectangle([x0, y0, x0 + p, y0 + p], fill=col)

    out_path = os.path.join(OUT_DIR, "pixel_sunglasses.png")
    img.save(out_path, "PNG")
    return img


def main():
    characters = [
        ("hamster", "방구 햄찌"),
        ("tit", "솜뭉치 오목눈이"),
        ("cat", "시크 뚱냥이"),
    ]
    expressions = [
        (1, "1_blank", "#1 멍 (홈 기본)"),
        (2, "2_eng", "#2 엥? (터짐 직후)"),
        (3, "3_shameless", "#3 뻔뻔 (선글라스)"),
        (4, "4_hold", "#4 웃참 (핵심 감정)"),
        (5, "5_burst", "#5 터짐 (소리 결과)"),
        (6, "6_whistle", "#6 모른 척 (진동 결과)"),
        (7, "7_thumbs_up", "#7 엄지척 (칭호 획득)"),
    ]

    generated = {}
    for c_idx, (char_id, char_kr) in enumerate(characters):
        for exp_id, exp_slug, exp_kr in expressions:
            seed = 1000 + c_idx * 100 + exp_id * 13
            cc = CrayonCanvas(size=CANVAS_SIZE, seed=seed)
            draw_character_base(cc, char_id, exp_id)
            draw_expression_features(cc, char_id, exp_id)

            fname = f"{char_id}_{exp_slug}.png"
            fpath = os.path.join(OUT_DIR, fname)
            cc.img.save(fpath, "PNG")
            generated[(char_id, exp_id)] = cc.img
            print(f"[OK] Saved {fpath}")

        # 1) Update base character image (assets/hamster.png, assets/tit.png, assets/cat.png)
        #    using the exact same unified design (#1 멍 홈 기본)!
        base_path = os.path.join(ASSETS_DIR, f"{char_id}.png")
        generated[(char_id, 1)].save(base_path, "PNG")
        print(f"[OK] Updated base character image: {base_path} (1024x1024 RGBA)")

    # 2) Update all 9 Tamagotchi animation sprites in assets/sprites/ with the exact same unified character design!
    for c_idx, (char_id, _) in enumerate(characters):
        # Walk / Hop sprite
        cc_walk = CrayonCanvas(size=CANVAS_SIZE, seed=2000 + c_idx * 100)
        draw_character_base(cc_walk, char_id, 1, pose_variant="walk")
        draw_expression_features(cc_walk, char_id, 1)
        walk_name = "tit_hop.png" if char_id == "tit" else f"{char_id}_walk.png"
        cc_walk.img.save(os.path.join(SPRITES_DIR, walk_name), "PNG")

        # React / Jump / Sing / Play sprite -> uses #5 터짐 or #7 엄지척 energy with unified character design
        react_name = "hamster_jump.png" if char_id == "hamster" else ("tit_sing.png" if char_id == "tit" else "cat_play.png")
        generated[(char_id, 5)].save(os.path.join(SPRITES_DIR, react_name), "PNG")

        # Sleep / Sit / Fly sprite
        if char_id == "tit":
            cc_fly = CrayonCanvas(size=CANVAS_SIZE, seed=3000 + c_idx * 100)
            draw_character_base(cc_fly, char_id, 1, pose_variant="fly")
            draw_expression_features(cc_fly, char_id, 1)
            cc_fly.img.save(os.path.join(SPRITES_DIR, "tit_fly.png"), "PNG")
        else:
            cc_sleep = CrayonCanvas(size=CANVAS_SIZE, seed=3000 + c_idx * 100)
            draw_character_base(cc_sleep, char_id, 1, pose_variant="sleep")
            draw_expression_features(cc_sleep, char_id, 8)
            sleep_name = "hamster_sleep.png" if char_id == "hamster" else "cat_sit.png"
            cc_sleep.img.save(os.path.join(SPRITES_DIR, sleep_name), "PNG")

    print("[OK] Updated all 9 animation sprites in assets/sprites/ to unified design.")

    # Copy base character images to artifact directory for preview
    for char_id, _ in characters:
        shutil.copyfile(
            os.path.join(ASSETS_DIR, f"{char_id}.png"),
            os.path.join(ARTIFACT_DIR, f"base_{char_id}.png"),
        )


if __name__ == "__main__":
    main()
