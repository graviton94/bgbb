# -*- coding: utf-8 -*-
"""
Generates all Meme/FX overlays and Minihompy Decor Assets in the exact same
1024x1024 square transparent PNG Crayon Art Style (thick fibrous black wax-crayon
outlines + pastel paper-grain fill + front/centered deadpan composition).

NOTE: `assets/expressions/pixel_sunglasses.png` is intentionally kept as-is
in its 8-bit pixel/dot art style per user instructions.
"""

import math
import os
import shutil
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from generate_expansion_pack import (
    CrayonCanvas,
    bezier_curve,
    quad_curve,
    COL_BLACK,
    COL_WHITE,
    CANVAS_SIZE,
)

PROPS_DIR = r"c:\bgbb\assets\props"
EXP_DIR = r"c:\bgbb\assets\expressions"
COLLECT_DIR = r"c:\bgbb\assets\collectibles"
ARTIFACT_DIR = r"C:\Users\ruahn49\.gemini\antigravity\brain\b2ce85ba-1f7b-478f-8be4-052d7e2dab69"

os.makedirs(PROPS_DIR, exist_ok=True)
os.makedirs(EXP_DIR, exist_ok=True)
os.makedirs(COLLECT_DIR, exist_ok=True)
os.makedirs(ARTIFACT_DIR, exist_ok=True)

# Pastel Crayon Palette
COL_RED_GUN = (255, 102, 102, 255)
COL_RED_DARK = (224, 72, 72, 255)
COL_BILL_GREEN = (168, 228, 160, 255)
COL_BILL_DARK = (106, 176, 100, 255)
COL_BILL_CREAM = (246, 248, 232, 255)
COL_FART_CREAM = (250, 238, 138, 245)
COL_BUBBLE_WHITE = (254, 252, 246, 250)
COL_ORANGE = (255, 162, 88, 255)
COL_YELLOW = (255, 218, 102, 255)
COL_LEAF_GREEN = (142, 214, 118, 255)
COL_TREE_GREEN = (122, 198, 112, 255)
COL_SOIL_BROWN = (168, 124, 88, 255)
COL_WOOD_BROWN = (182, 134, 92, 255)
COL_WOOD_LIGHT = (232, 202, 164, 255)
COL_BOX_TAN = (234, 192, 138, 255)
COL_MINT = (166, 228, 208, 255)
COL_PINK = (255, 168, 182, 255)
COL_PINK_LIGHT = (255, 214, 222, 255)
COL_SKY_BLUE = (178, 224, 255, 255)


def draw_rotated_bill(cc: CrayonCanvas, cx, cy, w, h, angle_deg, wave_amp=14.0):
    """Draws a single crayon banknote centered at (cx, cy) rotated by angle_deg."""
    rad = math.radians(angle_deg)
    cos_a, sin_a = math.cos(rad), math.sin(rad)

    def rot(px, py):
        return (cx + px * cos_a - py * sin_a, cy + px * sin_a + py * cos_a)

    hw, hh = w / 2.0, h / 2.0
    # Wavy top and bottom edges for fluttering paper feel
    top_pts = []
    bot_pts = []
    steps = 20
    for i in range(steps + 1):
        t = i / steps
        lx = -hw + w * t
        wy = math.sin(t * math.pi * 2.0) * wave_amp
        top_pts.append(rot(lx, -hh + wy))
        bot_pts.append(rot(hw - w * t, hh + wy))

    poly = top_pts + bot_pts
    cc.fill_polygon(poly, COL_BILL_GREEN, COL_BLACK, outline_width=22)

    # Inner cream rectangle inset
    in_w, in_h = hw * 0.78, hh * 0.68
    inner_pts = [rot(-in_w, -in_h), rot(in_w, -in_h), rot(in_w, in_h), rot(-in_w, in_h)]
    cc.fill_polygon(inner_pts, COL_BILL_CREAM, COL_BLACK, outline_width=14)

    # Center oval emblem (green medallion)
    cc.fill_ellipse(
        (cx - hh * 0.42, cy - hh * 0.52, cx + hh * 0.42, cy + hh * 0.52),
        COL_BILL_DARK,
        COL_BLACK,
        outline_width=16,
        angle=angle_deg,
    )
    # Cute '₩' / '$' / acorn dash marks on left and right of medallion
    cc.draw_crayon_polyline([rot(-hw * 0.56, -12), rot(-hw * 0.42, -12)], width=14, color=COL_BLACK)
    cc.draw_crayon_polyline([rot(-hw * 0.56, 12), rot(-hw * 0.42, 12)], width=14, color=COL_BLACK)
    cc.draw_crayon_polyline([rot(hw * 0.42, -12), rot(hw * 0.56, -12)], width=14, color=COL_BLACK)
    cc.draw_crayon_polyline([rot(hw * 0.42, 12), rot(hw * 0.56, 12)], width=14, color=COL_BLACK)


# =========================================================================
# 1. MEME / FX OVERLAYS & BUBBLES (1024x1024 Transparent PNG)
# =========================================================================

def make_money_bill():
    """Single big centered 1024x1024 flying banknote."""
    cc = CrayonCanvas(seed=501)
    draw_rotated_bill(cc, cx=512, cy=512, w=680, h=350, angle_deg=-16, wave_amp=22.0)
    # Flutter speed lines around bill
    cc.draw_crayon_polyline([(140, 320), (235, 285)], width=18, color=COL_BLACK)
    cc.draw_crayon_polyline([(110, 385), (190, 355)], width=18, color=COL_BLACK)
    cc.draw_crayon_polyline([(790, 680), (885, 645)], width=18, color=COL_BLACK)
    cc.draw_crayon_polyline([(825, 745), (905, 715)], width=18, color=COL_BLACK)
    return cc.img


def make_money_gun():
    """
    1024x1024 Crayon Money Gun (Supreme / Cash Cannon style) with a stack of green bills
    loaded in the top slot and bills firing out the front!
    """
    cc = CrayonCanvas(seed=502)

    # 1) Green bill stack loaded in the top feeder slot
    bill_stack = [
        (360, 290),
        (615, 225),
        (645, 345),
        (385, 405),
    ]
    cc.fill_polygon(bill_stack, COL_BILL_GREEN, COL_BLACK, outline_width=22)
    cc.draw_crayon_polyline([(380, 325), (620, 265)], width=14, color=COL_BLACK)
    cc.draw_crayon_polyline([(390, 360), (630, 300)], width=14, color=COL_BLACK)

    # 2) Flying bill shooting out the left barrel nozzle!
    draw_rotated_bill(cc, cx=215, cy=325, w=290, h=155, angle_deg=-25, wave_amp=10.0)

    # 3) Trigger guard & black trigger
    guard_pts = [(520, 560), (540, 685), (665, 665), (660, 545)]
    cc.draw_crayon_polyline(guard_pts, width=22, color=COL_BLACK, closed=True)
    trigger_pts = [(595, 565), (575, 640), (615, 645)]
    cc.draw_crayon_polyline(trigger_pts, width=22, color=COL_BLACK, closed=False)

    # 4) Main red money gun body + angled handle grip
    gun_body = [
        (295, 375),   # front top nozzle
        (785, 285),   # rear top
        (825, 485),   # rear bottom corner
        (765, 510),   # grip back top
        (845, 835),   # grip bottom back
        (675, 875),   # grip bottom front
        (615, 555),   # under barrel / front of grip
        (315, 585),   # front bottom nozzle
    ]
    cc.fill_polygon(gun_body, COL_RED_GUN, COL_BLACK, outline_width=24)

    # 5) White banner stripe across barrel ('BGBB / $$$' logo box)
    stripe_pts = [
        (355, 420),
        (745, 350),
        (765, 445),
        (375, 515),
    ]
    cc.fill_polygon(stripe_pts, COL_WHITE, COL_BLACK, outline_width=18)
    # Bold '$' / '₩' crayon marks inside banner
    for bx, by in [(465, 452), (565, 434), (665, 416)]:
        cc.draw_crayon_polyline([(bx - 18, by - 18), (bx + 18, by - 18), (bx - 18, by + 18), (bx + 18, by + 18)], width=14, color=COL_BLACK)
        cc.draw_crayon_polyline([(bx, by - 28), (bx, by + 28)], width=14, color=COL_BLACK)

    # Firing action lines near nozzle
    cc.draw_crayon_polyline([(235, 465), (145, 485)], width=18, color=COL_BLACK)
    cc.draw_crayon_polyline([(255, 535), (165, 575)], width=18, color=COL_BLACK)

    return cc.img


def make_money_rain_overlay():
    """
    1024x1024 transparent overlay with fluttering banknotes around the frame + money gun at bottom-right,
    designed to overlay directly at (0,0) on top of #3 뻔뻔 + pixel_sunglasses!
    """
    cc = CrayonCanvas(seed=503)
    # Fluttering bills in top-left, top-right, mid-left, bottom-left
    draw_rotated_bill(cc, cx=185, cy=210, w=260, h=135, angle_deg=-28, wave_amp=8.0)
    draw_rotated_bill(cc, cx=825, cy=195, w=250, h=130, angle_deg=24, wave_amp=8.0)
    draw_rotated_bill(cc, cx=145, cy=560, w=240, h=125, angle_deg=18, wave_amp=8.0)
    draw_rotated_bill(cc, cx=215, cy=845, w=255, h=130, angle_deg=-15, wave_amp=8.0)

    # Compact money gun firing from bottom-right corner
    gun_img = make_money_gun().resize((460, 460), Image.Resampling.LANCZOS)
    cc.img.alpha_composite(gun_img, dest=(560, 545))
    return cc.img


def make_fart_bubble_eq3():
    """
    1024x1024 Comic '=3' Fart Bubble (`fart_bubble.png`):
    Bold double horizontal speed bars ('=') on the left + giant fluffy 3-lobed fart cloud ('3') on the right!
    """
    cc = CrayonCanvas(seed=504)

    # 1) '=' Double speed wind bars on the left (with kleiner trailing dashes)
    bar1 = [(95, 425), (365, 425)]
    bar2 = [(115, 585), (365, 585)]
    cc.fill_polygon([(95, 398), (365, 398), (365, 452), (95, 452)], COL_FART_CREAM, COL_BLACK, outline_width=24)
    cc.fill_polygon([(115, 558), (365, 558), (365, 612), (115, 612)], COL_FART_CREAM, COL_BLACK, outline_width=24)
    # Little wind puff dots behind '='
    cc.fill_ellipse((35, 480, 82, 525), COL_FART_CREAM, COL_BLACK, outline_width=18)

    # 2) '3' Giant 3-lobed comic fart cloud on the right (x=390..930, y=180..845)
    # Fill unified yellow-cream cloud interior first, then draw bold '3' scalloped crayon contour!
    mask = Image.new("L", (CANVAS_SIZE, CANVAS_SIZE), 0)
    mdraw = ImageDraw.Draw(mask)
    mdraw.ellipse([430, 185, 865, 475], fill=255)   # Top lobe of '3'
    mdraw.ellipse([485, 365, 935, 660], fill=255)   # Middle lobe of '3'
    mdraw.ellipse([430, 545, 865, 835], fill=255)   # Bottom lobe of '3'
    mdraw.polygon([(395, 340), (550, 240), (550, 780), (395, 680)], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(radius=2.0))
    cc._apply_crayon_fill(mask, COL_FART_CREAM)

    # Draw the iconic bold '3' lobes outline + left opening curls
    top_lobe = bezier_curve((435, 345), (465, 155), (855, 165), (845, 375), 32)
    mid_lobe = bezier_curve((755, 385), (965, 395), (965, 630), (755, 640), 32)
    bot_lobe = bezier_curve((845, 645), (855, 855), (465, 865), (435, 675), 32)
    cc.draw_crayon_polyline(top_lobe, width=26, color=COL_BLACK)
    cc.draw_crayon_polyline(mid_lobe, width=26, color=COL_BLACK)
    cc.draw_crayon_polyline(bot_lobe, width=26, color=COL_BLACK)

    # Inner comic puff swirls for extra fart cloud texture
    cc.draw_arc_pts(645, 325, 75, 55, 200, 350, width=18, color=COL_BLACK)
    cc.draw_arc_pts(745, 512, 65, 55, -60, 80, width=18, color=COL_BLACK)
    cc.draw_arc_pts(645, 695, 75, 55, 10, 160, width=18, color=COL_BLACK)

    # Tiny escaping gas sparkles around cloud
    cc.draw_crayon_polyline([(885, 215), (945, 175)], width=18, color=COL_BLACK)
    cc.draw_crayon_polyline([(905, 805), (960, 845)], width=18, color=COL_BLACK)

    return cc.img


def make_speech_bubble():
    """1024x1024 Crayon Speech Bubble with bottom-left tail."""
    cc = CrayonCanvas(seed=505)
    # Main rounded speech balloon with tail pointing bottom-left
    top_c = bezier_curve((145, 455), (135, 165), (889, 165), (879, 455), 36)
    right_c = bezier_curve((879, 455), (889, 715), (620, 745), (435, 725), 28)
    tail_c = [(435, 725), (245, 865), (295, 695)]
    left_c = bezier_curve((295, 695), (165, 655), (145, 565), (145, 455), 24)

    pts = top_c[:-1] + right_c[:-1] + tail_c + left_c[:-1]
    cc.fill_polygon(pts, COL_BUBBLE_WHITE, COL_BLACK, outline_width=24)
    return cc.img


def make_thought_bubble():
    """1024x1024 Crayon Cloud / Thought Bubble with trailing mini bubbles."""
    cc = CrayonCanvas(seed=506)
    # Fluffy scalloped cloud mask
    centers = [
        (335, 355, 165, 135),
        (535, 315, 185, 150),
        (715, 375, 155, 135),
        (735, 535, 155, 130),
        (535, 585, 195, 140),
        (315, 545, 165, 130),
        (512, 455, 240, 160),
    ]
    mask = Image.new("L", (CANVAS_SIZE, CANVAS_SIZE), 0)
    mdraw = ImageDraw.Draw(mask)
    for cx, cy, rx, ry in centers:
        mdraw.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(radius=2.0))
    cc._apply_crayon_fill(mask, COL_BUBBLE_WHITE)

    # Scalloped crayon outline arcs around the cloud
    arc_specs = [
        (335, 355, 165, 135, 155, 295),
        (535, 315, 185, 150, 195, 345),
        (715, 375, 155, 135, 265, 405),
        (735, 535, 155, 130, -35, 105),
        (535, 585, 195, 140, 25, 155),
        (315, 545, 165, 130, 85, 225),
    ]
    for cx, cy, rx, ry, a0, a1 in arc_specs:
        cc.draw_arc_pts(cx, cy, rx, ry, a0, a1, width=24, color=COL_BLACK)

    # Two trailing thought bubble circles at bottom-left
    cc.fill_ellipse((235, 715, 345, 815), COL_BUBBLE_WHITE, COL_BLACK, outline_width=22)
    cc.fill_ellipse((155, 835, 225, 900), COL_BUBBLE_WHITE, COL_BLACK, outline_width=20)
    return cc.img


# =========================================================================
# 2. MINIHOMPY DECOR ASSETS (14 Props in 1024x1024 Transparent PNG)
# =========================================================================

def make_prop_carrot():
    cc = CrayonCanvas(seed=601)
    # 3 leafy green fronds at top
    cc.fill_ellipse((310, 110, 465, 420), COL_LEAF_GREEN, COL_BLACK, outline_width=22, angle=-22)
    cc.fill_ellipse((559, 110, 714, 420), COL_LEAF_GREEN, COL_BLACK, outline_width=22, angle=22)
    cc.fill_ellipse((435, 75, 589, 415), COL_LEAF_GREEN, COL_BLACK, outline_width=22)
    # Plump orange carrot body
    carrot_pts = bezier_curve((325, 410), (320, 345), (704, 345), (699, 410), 20) + \
                 bezier_curve((699, 410), (690, 680), (575, 855), (512, 875), 24) + \
                 bezier_curve((512, 875), (449, 855), (334, 680), (325, 410), 24)
    cc.fill_polygon(carrot_pts, COL_ORANGE, COL_BLACK, outline_width=24)
    # Cute horizontal carrot ridges
    cc.draw_crayon_polyline([(385, 515), (485, 515)], width=18, color=COL_BLACK)
    cc.draw_crayon_polyline([(545, 610), (635, 610)], width=18, color=COL_BLACK)
    cc.draw_crayon_polyline([(415, 710), (505, 710)], width=18, color=COL_BLACK)
    # Cozy soil mound at base
    soil_pts = bezier_curve((165, 895), (245, 765), (779, 765), (859, 895), 28) + [(785, 935), (235, 935)]
    cc.fill_polygon(soil_pts, COL_SOIL_BROWN, COL_BLACK, outline_width=22)
    return cc.img


def make_prop_sunflower():
    cc = CrayonCanvas(seed=602)
    # Stem and two leaves
    cc.draw_crayon_polyline([(512, 520), (512, 920)], width=34, color=COL_LEAF_GREEN)
    cc.draw_crayon_polyline([(512, 520), (512, 920)], width=24, color=COL_BLACK)
    cc.fill_ellipse((275, 650, 495, 785), COL_LEAF_GREEN, COL_BLACK, outline_width=22, angle=-25)
    cc.fill_ellipse((529, 650, 749, 785), COL_LEAF_GREEN, COL_BLACK, outline_width=22, angle=25)
    # 12 yellow petals around center (512, 390)
    cx, cy = 512, 390
    for i in range(12):
        ang = i * 30
        rad = math.radians(ang)
        px = cx + math.cos(rad) * 215
        py = cy + math.sin(rad) * 215
        cc.fill_ellipse((px - 75, py - 115, px + 75, py + 115), COL_YELLOW, COL_BLACK, outline_width=20, angle=ang + 90)
    # Brown center seed disc with cute deadpan face/crosshatch
    cc.fill_ellipse((cx - 145, cy - 145, cx + 145, cy + 145), COL_SOIL_BROWN, COL_BLACK, outline_width=24)
    cc.draw_crayon_polyline([(cx - 75, cy - 35), (cx + 75, cy - 35)], width=14, color=COL_BLACK)
    cc.draw_crayon_polyline([(cx - 85, cy + 35), (cx + 85, cy + 35)], width=14, color=COL_BLACK)
    cc.draw_crayon_polyline([(cx - 35, cy - 75), (cx - 35, cy + 75)], width=14, color=COL_BLACK)
    cc.draw_crayon_polyline([(cx + 35, cy - 75), (cx + 35, cy + 75)], width=14, color=COL_BLACK)
    return cc.img


def make_prop_box():
    cc = CrayonCanvas(seed=603)
    # Open cardboard box front-facing
    box_front = [(215, 420), (809, 420), (775, 865), (249, 865)]
    flap_l = [(215, 420), (105, 295), (415, 285), (512, 420)]
    flap_r = [(512, 420), (609, 285), (919, 295), (809, 420)]
    cc.fill_polygon(flap_l, COL_WOOD_LIGHT, COL_BLACK, outline_width=22)
    cc.fill_polygon(flap_r, COL_WOOD_LIGHT, COL_BLACK, outline_width=22)
    cc.fill_polygon(box_front, COL_BOX_TAN, COL_BLACK, outline_width=24)
    # Center seam & cute cat paw stamp on box front
    cc.draw_crayon_polyline([(512, 420), (512, 560)], width=20, color=COL_BLACK)
    cc.fill_ellipse((465, 645, 559, 725), COL_SOIL_BROWN, COL_BLACK, outline_width=16)
    for px, py in [(445, 610), (490, 590), (535, 590), (579, 610)]:
        cc.fill_ellipse((px - 18, py - 18, px + 18, py + 18), COL_SOIL_BROWN, COL_BLACK, outline_width=14)
    return cc.img


def make_prop_tent():
    cc = CrayonCanvas(seed=604)
    # Crossed wooden poles at top
    cc.draw_crayon_polyline([(445, 95), (565, 245)], width=24, color=COL_BLACK)
    cc.draw_crayon_polyline([(579, 95), (459, 245)], width=24, color=COL_BLACK)
    # Main teepee triangle
    tent_poly = [(512, 175), (885, 865), (139, 865)]
    cc.fill_polygon(tent_poly, COL_MINT, COL_BLACK, outline_width=24)
    # Decorative orange stripes
    s1 = [(415, 355), (465, 265), (755, 865), (665, 865)]
    cc.fill_polygon(s1, COL_ORANGE, COL_BLACK, outline_width=18)
    # Front entrance opening + rolled flaps
    door_inner = [(512, 465), (645, 865), (379, 865)]
    cc.fill_polygon(door_inner, COL_SOIL_BROWN, COL_BLACK, outline_width=22)
    flap_l = [(512, 465), (379, 865), (295, 785)]
    flap_r = [(512, 465), (645, 865), (729, 785)]
    cc.fill_polygon(flap_l, COL_ORANGE, COL_BLACK, outline_width=20)
    cc.fill_polygon(flap_r, COL_ORANGE, COL_BLACK, outline_width=20)
    return cc.img


def make_prop_balloon():
    cc = CrayonCanvas(seed=605)
    # Wavy balloon string at bottom
    string_pts = bezier_curve((512, 650), (435, 745), (589, 825), (495, 935), 28)
    cc.draw_crayon_polyline(string_pts, width=18, color=COL_BLACK)
    # Knot triangle
    cc.fill_polygon([(475, 655), (549, 655), (512, 605)], COL_PINK, COL_BLACK, outline_width=20)
    # Big round pastel balloon
    cc.fill_ellipse((235, 105, 789, 625), COL_PINK, COL_BLACK, outline_width=24)
    # Shiny highlight arc + cute '=3' mini puff mark
    cc.fill_ellipse((315, 185, 425, 325), COL_WHITE, outline_color=None, outline_width=0, angle=-25)
    return cc.img


def make_prop_bench():
    cc = CrayonCanvas(seed=606)
    # 2 sturdy log legs
    cc.fill_polygon([(235, 560), (335, 560), (335, 795), (235, 795)], COL_SOIL_BROWN, COL_BLACK, outline_width=24)
    cc.fill_polygon([(689, 560), (789, 560), (789, 795), (689, 795)], COL_SOIL_BROWN, COL_BLACK, outline_width=24)
    # Backrest log bar
    cc.fill_polygon([(145, 345), (879, 345), (879, 465), (145, 465)], COL_WOOD_BROWN, COL_BLACK, outline_width=24)
    # Seat log plank
    cc.fill_polygon([(105, 510), (919, 510), (939, 635), (85, 635)], COL_WOOD_LIGHT, COL_BLACK, outline_width=24)
    # Wood grain lines
    cc.draw_crayon_polyline([(245, 405), (465, 405)], width=14, color=COL_BLACK)
    cc.draw_crayon_polyline([(565, 405), (765, 405)], width=14, color=COL_BLACK)
    cc.draw_crayon_polyline([(215, 572), (515, 572)], width=14, color=COL_BLACK)
    cc.draw_crayon_polyline([(615, 572), (815, 572)], width=14, color=COL_BLACK)
    return cc.img


def make_prop_campfire():
    cc = CrayonCanvas(seed=607)
    # Crossed logs at base
    cc.fill_ellipse((145, 665, 879, 825), COL_WOOD_BROWN, COL_BLACK, outline_width=22, angle=-18)
    cc.fill_ellipse((145, 665, 879, 825), COL_WOOD_BROWN, COL_BLACK, outline_width=22, angle=18)
    cc.fill_ellipse((415, 685, 609, 915), COL_SOIL_BROWN, COL_BLACK, outline_width=22)
    # Outer orange flame
    outer_flame = (
        bezier_curve((265, 675), (195, 445), (365, 325), (345, 255), 20)
        + bezier_curve((345, 255), (415, 315), (465, 165), (512, 95), 20)[1:]
        + bezier_curve((512, 95), (575, 185), (615, 315), (685, 265), 20)[1:]
        + bezier_curve((685, 265), (675, 355), (825, 455), (759, 675), 20)[1:]
        + bezier_curve((759, 675), (615, 735), (409, 735), (265, 675), 16)[1:]
    )
    cc.fill_polygon(outer_flame, COL_ORANGE, COL_BLACK, outline_width=24)
    # Inner bright yellow flame
    inner_flame = (
        bezier_curve((365, 665), (335, 515), (455, 365), (512, 245), 20)
        + bezier_curve((512, 245), (575, 365), (689, 515), (659, 665), 20)[1:]
        + bezier_curve((659, 665), (565, 705), (459, 705), (365, 665), 14)[1:]
    )
    cc.fill_polygon(inner_flame, COL_YELLOW, COL_BLACK, outline_width=20)
    return cc.img


def make_prop_churu():
    cc = CrayonCanvas(seed=608)
    # Golden churu stick & creamy swirl inside bowl
    stick_pts = [(485, 185), (795, 115), (835, 265), (525, 365)]
    cc.fill_polygon(stick_pts, COL_YELLOW, COL_BLACK, outline_width=22)
    # Creamy treat mound in bowl
    cc.fill_ellipse((275, 395, 749, 645), COL_WOOD_LIGHT, COL_BLACK, outline_width=22)
    # Cute pink pet bowl
    bowl_pts = [(195, 525), (829, 525), (895, 815), (129, 815)]
    cc.fill_polygon(bowl_pts, COL_PINK, COL_BLACK, outline_width=24)
    # Fish icon on front of bowl
    cc.fill_ellipse((425, 635, 575, 725), COL_YELLOW, COL_BLACK, outline_width=18)
    cc.fill_polygon([(565, 680), (635, 635), (635, 725)], COL_YELLOW, COL_BLACK, outline_width=18)
    return cc.img


def make_prop_mat():
    cc = CrayonCanvas(seed=609)
    # Perspective picnic mat diamond/rhombus
    mat_pts = [(512, 265), (925, 535), (512, 815), (99, 535)]
    cc.fill_polygon(mat_pts, COL_PINK_LIGHT, COL_BLACK, outline_width=24)
    # Checkered stripes
    cc.fill_polygon([(375, 355), (465, 295), (875, 565), (785, 625)], COL_PINK, outline_color=None, outline_width=0)
    cc.fill_polygon([(235, 445), (325, 385), (735, 655), (645, 715)], COL_PINK, outline_color=None, outline_width=0)
    cc.draw_crayon_polyline(mat_pts, width=24, color=COL_BLACK, closed=True)
    return cc.img


def make_prop_tree():
    cc = CrayonCanvas(seed=610)
    # Sturdy brown trunk
    trunk = [(415, 525), (609, 525), (655, 915), (369, 915)]
    cc.fill_polygon(trunk, COL_WOOD_BROWN, COL_BLACK, outline_width=24)
    # Fluffy 4-lobe green crown
    for cx, cy, rx, ry in [(335, 415, 185, 165), (689, 415, 185, 165), (512, 255, 215, 175), (512, 445, 235, 165)]:
        cc.fill_ellipse((cx - rx, cy - ry, cx + rx, cy + ry), COL_TREE_GREEN, outline_color=None, outline_width=0)
    cc.draw_arc_pts(512, 255, 215, 175, 175, 365, width=24, color=COL_BLACK)
    cc.draw_arc_pts(335, 415, 185, 165, 85, 245, width=24, color=COL_BLACK)
    cc.draw_arc_pts(689, 415, 185, 165, -65, 95, width=24, color=COL_BLACK)
    cc.draw_arc_pts(512, 485, 235, 135, 15, 165, width=24, color=COL_BLACK)
    # Cute red apples/berries on tree
    for ax, ay in [(365, 345), (635, 325), (512, 445)]:
        cc.fill_ellipse((ax - 32, ay - 32, ax + 32, ay + 32), COL_RED_GUN, COL_BLACK, outline_width=16)
    return cc.img


def make_prop_sun():
    cc = CrayonCanvas(seed=611)
    cx, cy = 512, 512
    for i in range(8):
        rad = math.radians(i * 45)
        x0, y0 = cx + math.cos(rad) * 265, cy + math.sin(rad) * 265
        x1, y1 = cx + math.cos(rad) * 385, cy + math.sin(rad) * 385
        cc.draw_crayon_polyline([(x0, y0), (x1, y1)], width=28, color=COL_ORANGE)
        cc.draw_crayon_polyline([(x0, y0), (x1, y1)], width=20, color=COL_BLACK)
    cc.fill_ellipse((cx - 215, cy - 215, cx + 215, cy + 215), COL_YELLOW, COL_BLACK, outline_width=24)
    return cc.img


def make_prop_moon():
    cc = CrayonCanvas(seed=612)
    outer = bezier_curve((565, 155), (215, 195), (215, 829), (565, 869), 36)
    inner = bezier_curve((565, 869), (385, 715), (385, 309), (565, 155), 36)
    cc.fill_polygon(outer + inner[1:], COL_YELLOW, COL_BLACK, outline_width=24)
    # Little star next to moon
    star = [(735, 265), (765, 335), (835, 355), (765, 385), (735, 455), (705, 385), (635, 355), (705, 335)]
    cc.fill_polygon(star, COL_YELLOW, COL_BLACK, outline_width=18)
    return cc.img


def make_prop_cloud():
    cc = CrayonCanvas(seed=613)
    for cx, cy, rx, ry in [(345, 545, 175, 125), (512, 455, 215, 155), (689, 545, 175, 125)]:
        cc.fill_ellipse((cx - rx, cy - ry, cx + rx, cy + ry), COL_WHITE, outline_color=None, outline_width=0)
    cc.draw_arc_pts(512, 455, 215, 155, 185, 355, width=24, color=COL_BLACK)
    cc.draw_arc_pts(345, 545, 175, 125, 95, 235, width=24, color=COL_BLACK)
    cc.draw_arc_pts(689, 545, 175, 125, -55, 85, width=24, color=COL_BLACK)
    cc.draw_crayon_polyline([(325, 670), (705, 670)], width=24, color=COL_BLACK)
    return cc.img


def make_prop_stars():
    cc = CrayonCanvas(seed=614)
    for sx, sy, sr in [(285, 345, 95), (725, 285, 115), (525, 685, 85)]:
        pts = [
            (sx, sy - sr),
            (sx + sr * 0.3, sy - sr * 0.3),
            (sx + sr, sy),
            (sx + sr * 0.3, sy + sr * 0.3),
            (sx, sy + sr),
            (sx - sr * 0.3, sy + sr * 0.3),
            (sx - sr, sy),
            (sx - sr * 0.3, sy - sr * 0.3),
        ]
        cc.fill_polygon(pts, COL_YELLOW, COL_BLACK, outline_width=20)
    return cc.img


def build_preview_sheets(fx_items, prop_items):
    try:
        font_title = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 22)
        font_sub = ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", 17)
    except Exception:
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()

    # 1) Meme FX & Bubbles Sheet (including a full combo demo with #3 뻔뻔 + dot sunglasses + money gun + =3 bubble!)
    hamster_3 = Image.open(os.path.join(EXP_DIR, "hamster_3_shameless.png")).convert("RGBA")
    shades = Image.open(os.path.join(EXP_DIR, "pixel_sunglasses.png")).convert("RGBA")
    combo = Image.alpha_composite(hamster_3, shades)
    combo = Image.alpha_composite(combo, fx_items["money_rain.png"][0])

    all_fx_cards = list(fx_items.items()) + [
        ("pixel_sunglasses.png", (shades, "도트 선글라스 (유지)")),
        ("combo_preview.png", (combo, "시안 3·4 합성 예시")),
    ]

    cols = 4
    rows = 2
    tw = 260
    pad = 24
    sw = cols * (tw + pad) + pad
    sh = rows * (tw + pad + 56) + pad + 60
    sheet = Image.new("RGBA", (sw, sh), (250, 246, 238, 255))
    sdraw = ImageDraw.Draw(sheet)
    sdraw.text((sw // 2, 32), "신규 이펙트·버블 에셋 & 도트 선글라스·머니건 조합 프리뷰 (1024x1024 투명 PNG)", fill=(35, 30, 25, 255), font=font_title, anchor="mm")

    for idx, (fname, (img_obj, label_kr)) in enumerate(all_fx_cards):
        r = idx // cols
        c = idx % cols
        rx = pad + c * (tw + pad)
        ry = 65 + r * (tw + pad + 56)
        card = Image.new("RGBA", (tw, tw), (255, 255, 255, 255))
        cdraw = ImageDraw.Draw(card)
        cs = 20
        for cy_i in range(0, tw, cs):
            for cx_i in range(0, tw, cs):
                if ((cx_i // cs) + (cy_i // cs)) % 2 == 1:
                    cdraw.rectangle([cx_i, cy_i, cx_i + cs, cy_i + cs], fill=(240, 236, 228, 255))
        thumb = img_obj.resize((tw, tw), Image.Resampling.LANCZOS)
        card = Image.alpha_composite(card, thumb)
        cdraw = ImageDraw.Draw(card)
        cdraw.rectangle([0, 0, tw - 1, tw - 1], outline=(70, 65, 60, 255), width=3)
        sheet.paste(card, (rx, ry))
        sdraw.text((rx + tw // 2, ry + tw + 16), label_kr, fill=(35, 30, 25, 255), font=font_title, anchor="mm")
        sdraw.text((rx + tw // 2, ry + tw + 40), fname, fill=(100, 95, 90, 255), font=font_sub, anchor="mm")

    fx_sheet_path = os.path.join(ARTIFACT_DIR, "meme_fx_and_bubbles_sheet.png")
    sheet.save(fx_sheet_path, "PNG")
    print(f"[OK] Saved FX preview sheet: {fx_sheet_path}")

    # 2) Decor Props Sheet (14 items)
    p_cols = 5
    p_rows = 3
    p_tw = 220
    p_sw = p_cols * (p_tw + pad) + pad
    p_sh = p_rows * (p_tw + pad + 50) + pad + 60
    psheet = Image.new("RGBA", (p_sw, p_sh), (250, 246, 238, 255))
    pdraw = ImageDraw.Draw(psheet)
    pdraw.text((p_sw // 2, 32), "아지트 꾸미기 에셋 14종 디자인 통일 (1024x1024 정사각 투명 PNG)", fill=(35, 30, 25, 255), font=font_title, anchor="mm")

    for idx, (fname, (img_obj, label_kr)) in enumerate(prop_items.items()):
        r = idx // p_cols
        c = idx % p_cols
        rx = pad + c * (p_tw + pad)
        ry = 65 + r * (p_tw + pad + 50)
        card = Image.new("RGBA", (p_tw, p_tw), (255, 255, 255, 255))
        cdraw = ImageDraw.Draw(card)
        cs = 20
        for cy_i in range(0, p_tw, cs):
            for cx_i in range(0, p_tw, cs):
                if ((cx_i // cs) + (cy_i // cs)) % 2 == 1:
                    cdraw.rectangle([cx_i, cy_i, cx_i + cs, cy_i + cs], fill=(240, 236, 228, 255))
        thumb = img_obj.resize((p_tw, p_tw), Image.Resampling.LANCZOS)
        card = Image.alpha_composite(card, thumb)
        cdraw = ImageDraw.Draw(card)
        cdraw.rectangle([0, 0, p_tw - 1, p_tw - 1], outline=(180, 170, 155, 255), width=3)
        psheet.paste(card, (rx, ry))
        pdraw.text((rx + p_tw // 2, ry + p_tw + 15), label_kr, fill=(35, 30, 25, 255), font=font_title, anchor="mm")
        pdraw.text((rx + p_tw // 2, ry + p_tw + 38), fname, fill=(100, 95, 90, 255), font=font_sub, anchor="mm")

    prop_sheet_path = os.path.join(ARTIFACT_DIR, "decor_props_sheet.png")
    psheet.save(prop_sheet_path, "PNG")
    print(f"[OK] Saved Decor Props preview sheet: {prop_sheet_path}")


def main():
    fx_items = {
        "money_gun.png": (make_money_gun(), "머니건 (Money Gun)"),
        "money_bill.png": (make_money_bill(), "돈/지폐 단품 (Bill)"),
        "money_rain.png": (make_money_rain_overlay(), "머니건+지폐 오버레이"),
        "fart_bubble.png": (make_fart_bubble_eq3(), "방구버블 (=3 스타일)"),
        "speech_bubble.png": (make_speech_bubble(), "말풍선 버블"),
        "thought_bubble.png": (make_thought_bubble(), "구름/생각 버블"),
    }

    for fname, (img_obj, _) in fx_items.items():
        p1 = os.path.join(EXP_DIR, fname)
        p2 = os.path.join(PROPS_DIR, fname)
        img_obj.save(p1, "PNG")
        img_obj.save(p2, "PNG")
        print(f"[OK] Saved FX asset: {p1} & {p2} ({img_obj.size}, {img_obj.mode})")

    prop_items = {
        "carrot.png": (make_prop_carrot(), "당근 텃밭"),
        "sunflower.png": (make_prop_sunflower(), "황금 해바라기"),
        "box.png": (make_prop_box(), "뚱냥이 상자"),
        "tent.png": (make_prop_tent(), "인디언 텐트"),
        "balloon.png": (make_prop_balloon(), "방구 풍선"),
        "bench.png": (make_prop_bench(), "통나무 벤치"),
        "campfire.png": (make_prop_campfire(), "모닥불"),
        "churu.png": (make_prop_churu(), "황금 츄르"),
        "mat.png": (make_prop_mat(), "피크닉 돗자리"),
        "tree.png": (make_prop_tree(), "크레용 큰나무"),
        "sun.png": (make_prop_sun(), "태양"),
        "moon.png": (make_prop_moon(), "초승달"),
        "cloud.png": (make_prop_cloud(), "뭉게구름"),
        "stars.png": (make_prop_stars(), "별빛"),
    }

    for fname, (img_obj, _) in prop_items.items():
        p_out = os.path.join(PROPS_DIR, fname)
        img_obj.save(p_out, "PNG")
        print(f"[OK] Saved Decor Prop: {p_out} ({img_obj.size}, {img_obj.mode})")

    # Also sync mat.png and tree.png into collectibles so collectibles match too
    prop_items["mat.png"][0].save(os.path.join(COLLECT_DIR, "mat.png"), "PNG")
    prop_items["tree.png"][0].save(os.path.join(COLLECT_DIR, "tree.png"), "PNG")

    build_preview_sheets(fx_items, prop_items)


if __name__ == "__main__":
    main()
