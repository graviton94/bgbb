# -*- coding: utf-8 -*-
r"""
Generates the specific items that MUST look like an amateur 3D modeling beginner render
(as requested by user: vapor, space, trophy, medal, gasmask, skull, rainbow, poop, bubble 종류):
Uses a real 3D geometric ray/raster engine with faceted low-poly geometry, harsh Phong specular
highlights, glossy plastic/clay shaders, and vibrant beginner CGI aesthetic.
Optimized bounding-box blitting for fast generation.
"""

import math
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

SKIN_DIR = r"c:\bgbb\assets\skin"
for sub in ("bg", "prop", "wear", "fx", "bubble", "frame", "season"):
    os.makedirs(os.path.join(SKIN_DIR, sub), exist_ok=True)


def draw_phong_sphere(canvas_img, cx, cy, rx, ry, col_rgb, shininess=28.0, spec_strength=0.9, light_dir=(-0.577, -0.577, 0.577)):
    rx = max(2, int(rx))
    ry = max(2, int(ry))
    w = 2 * rx + 1
    h = 2 * ry + 1
    y, x = np.ogrid[0:h, 0:w]
    nx = (x - rx) / float(rx)
    ny = (y - ry) / float(ry)
    r2 = nx*nx + ny*ny
    mask = r2 <= 1.0
    if not np.any(mask):
        return
    z = np.zeros_like(r2)
    z[mask] = np.sqrt(np.maximum(0, 1.0 - r2[mask]))

    lx, ly, lz = light_dir
    norm_l = math.hypot(lx, ly, lz)
    lx, ly, lz = lx / norm_l, ly / norm_l, lz / norm_l

    diff = np.maximum(0, nx * lx + ny * ly + z * lz)
    rz_v = 2 * diff * z - lz
    spec = np.maximum(0, rz_v) ** shininess

    r = np.clip((col_rgb[0] / 255.0 * (0.2 + 0.8 * diff) + spec * spec_strength) * 255, 0, 255).astype(np.uint8)
    g = np.clip((col_rgb[1] / 255.0 * (0.2 + 0.8 * diff) + spec * spec_strength) * 255, 0, 255).astype(np.uint8)
    b = np.clip((col_rgb[2] / 255.0 * (0.2 + 0.8 * diff) + spec * spec_strength) * 255, 0, 255).astype(np.uint8)
    a = (mask * 255).astype(np.uint8)

    sub_img = Image.fromarray(np.stack([r, g, b, a], axis=-1), "RGBA")
    canvas_img.paste(sub_img, (int(cx - rx), int(cy - ry)), sub_img)


def draw_phong_cylinder(canvas_img, cx, cy, rx, height_px, col_rgb, shininess=24.0, spec_strength=0.85):
    rx = max(2, int(rx))
    w = 2 * rx + 1
    h = max(2, int(height_px))
    y, x = np.ogrid[0:h, 0:w]
    nx = (x - rx) / float(rx)
    mask = np.abs(nx) <= 1.0
    z = np.zeros_like(nx)
    z[mask] = np.sqrt(np.maximum(0, 1.0 - nx[mask]**2))

    lx, ly, lz = -0.6, -0.4, 0.7
    diff = np.maximum(0, nx * lx + z * lz)
    rz_v = 2 * diff * z - lz
    spec = np.maximum(0, rz_v) ** shininess

    r = np.clip((col_rgb[0] / 255.0 * (0.25 + 0.75 * diff) + spec * spec_strength) * 255, 0, 255).astype(np.uint8)
    g = np.clip((col_rgb[1] / 255.0 * (0.25 + 0.75 * diff) + spec * spec_strength) * 255, 0, 255).astype(np.uint8)
    b = np.clip((col_rgb[2] / 255.0 * (0.25 + 0.75 * diff) + spec * spec_strength) * 255, 0, 255).astype(np.uint8)
    a = (mask * 255).astype(np.uint8)

    sub_img = Image.fromarray(np.stack([r, g, b, a], axis=-1), "RGBA")
    canvas_img.paste(sub_img, (int(cx - rx), int(cy - h // 2)), sub_img)


# =========================================================================
# 1. 3D BEGINNER BACKGROUNDS: bg_vapor, bg_space
# =========================================================================

def make_3d_bg_vapor():
    W, H = 1080, 2340
    y = np.linspace(0, 1, H)[:, None]
    sky_arr = np.zeros((H, W, 4), dtype=np.uint8)
    sky_arr[..., 0] = np.clip(30 + 190 * (y**1.8), 0, 255).astype(np.uint8)
    sky_arr[..., 1] = np.clip(10 + 40 * (y**1.5), 0, 255).astype(np.uint8)
    sky_arr[..., 2] = np.clip(60 + 120 * (y**1.2), 0, 255).astype(np.uint8)
    sky_arr[..., 3] = 255
    img = Image.fromarray(sky_arr, "RGBA")
    d = ImageDraw.Draw(img)

    # 3D Wireframe Grid Floor (y: 1380..H)
    floor_y = 1380
    d.rectangle([0, floor_y, W, H], fill=(12, 6, 28, 255))
    horizon_x = W // 2
    for px in range(-600, W + 800, 120):
        d.line([(horizon_x, floor_y), (px, H)], fill=(0, 240, 255, 230), width=4)
    for i in range(1, 22):
        t = (i / 22.0) ** 2.2
        gy = int(floor_y + (H - floor_y) * t)
        d.line([(0, gy), (W, gy)], fill=(255, 40, 180, 230), width=4)

    # 3D Beginner Sun with horizontal scanline slats
    sun_cx, sun_cy, sun_r = W // 2, 1380, 260
    sun_img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw_phong_sphere(sun_img, sun_cx, sun_cy, sun_r, sun_r, (255, 110, 180), shininess=16.0, spec_strength=0.7)
    sun_arr = np.asarray(sun_img).copy()
    for sy in range(sun_cy - sun_r, sun_cy + 20, 24):
        sun_arr[sy:sy + 10, :, 3] = 0
    img.paste(Image.fromarray(sun_arr), (0, 0), Image.fromarray(sun_arr))

    # 3D Floating Chrome & Cyan Spheres
    draw_phong_sphere(img, 240, 1140, 120, 120, (140, 240, 255), shininess=64.0, spec_strength=1.2)
    draw_phong_sphere(img, 840, 1200, 95, 95, (255, 140, 220), shininess=50.0, spec_strength=1.1)

    # 3D Text rendered with extruded amateur bevel
    d = ImageDraw.Draw(img)
    try:
        f = ImageFont.truetype("C:/Windows/Fonts/impact.ttf", 64)
    except Exception:
        f = ImageFont.load_default()
    text = "V A P O R W A V E   3 D"
    for off in range(12, 0, -2):
        d.text((W // 2 - off, 1020 + off), text, fill=(60, 10, 80, 255), font=f, anchor="mm")
    d.text((W // 2, 1020), text, fill=(0, 255, 240, 255), font=f, anchor="mm")

    return img


def make_3d_bg_space():
    W, H = 1080, 2340
    img = Image.new("RGBA", (W, H), (8, 10, 22, 255))

    # 3D Low-poly Starfield
    rng = np.random.default_rng(777)
    for _ in range(80):
        sx = int(rng.integers(40, W - 40))
        sy = int(rng.integers(60, H - 60))
        sr = int(rng.integers(4, 12))
        draw_phong_sphere(img, sx, sy, sr, sr, (255, 245, 180), shininess=18.0)

    # 3D Low-poly Planet Earth in lower-right
    draw_phong_sphere(img, 860, 1480, 240, 240, (40, 120, 240), shininess=24.0, spec_strength=0.85)
    draw_phong_sphere(img, 810, 1420, 90, 70, (60, 195, 80), shininess=12.0, spec_strength=0.3)
    draw_phong_sphere(img, 920, 1530, 80, 60, (70, 205, 90), shininess=12.0, spec_strength=0.3)

    # 3D Amateur Space Rocket / Gas Thruster
    rx, ry = 360, 1120
    draw_phong_cylinder(img, rx, ry, 55, 180, (240, 240, 245), shininess=35.0)
    draw_phong_sphere(img, rx, ry - 90, 55, 75, (235, 45, 45), shininess=30.0)

    # 3D Comic Puffy Smoke Balls streaming out rocket rear
    for bx, by, br in [(rx + 50, ry + 120, 35), (rx + 110, ry + 170, 48), (rx + 180, ry + 240, 65), (rx + 270, ry + 330, 85)]:
        draw_phong_sphere(img, bx, by, br, br, (255, 230, 80), shininess=14.0, spec_strength=0.5)

    return img


# =========================================================================
# 2. 3D BEGINNER PROPS: prop_trophy, prop_medal, prop_gasmask
# =========================================================================

def make_3d_prop_trophy():
    W, H = 1024, 1024
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    # Faceted marble pedestal at bottom
    draw_phong_cylinder(img, 512, 790, 220, 130, (85, 70, 60), shininess=20.0, spec_strength=0.5)
    # Golden trophy stem
    draw_phong_cylinder(img, 512, 650, 45, 180, (255, 205, 40), shininess=45.0, spec_strength=1.2)

    # Golden goblet body
    gob_img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw_phong_sphere(gob_img, 512, 430, 210, 210, (255, 215, 45), shininess=55.0, spec_strength=1.4)
    arr = np.asarray(gob_img).copy()
    arr[:340, :, 3] = 0
    img.paste(Image.fromarray(arr), (0, 0), Image.fromarray(arr))

    # Top golden rim cylinder
    draw_phong_cylinder(img, 512, 340, 210, 45, (255, 225, 65), shininess=50.0, spec_strength=1.3)

    # Torus 3D handles
    for hx in (280, 744):
        h_img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        draw_phong_sphere(h_img, hx, 430, 65, 110, (255, 205, 40), shininess=45.0, spec_strength=1.2)
        hdl_arr = np.asarray(h_img).copy()
        y, x = np.ogrid[0:H, 0:W]
        hollow = ((x - hx)**2 / 35.0**2 + (y - 430)**2 / 70.0**2) <= 1.0
        hdl_arr[hollow, 3] = 0
        img.paste(Image.fromarray(hdl_arr), (0, 0), Image.fromarray(hdl_arr))

    # Shiny golden plaque with 3D text
    draw_phong_cylinder(img, 512, 790, 160, 60, (255, 240, 160), shininess=60.0, spec_strength=1.1)

    d = ImageDraw.Draw(img)
    try:
        f = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 36)
    except Exception:
        f = ImageFont.load_default()
    d.text((512, 790), "괄약근 대상", fill=(65, 45, 15, 255), font=f, anchor="mm")

    return img


def make_3d_prop_medal():
    W, H = 1024, 1024
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    # Extruded ribbon straps
    draw_phong_cylinder(img, 430, 320, 65, 340, (225, 45, 45), shininess=18.0, spec_strength=0.4)
    draw_phong_cylinder(img, 594, 320, 65, 340, (45, 115, 235), shininess=18.0, spec_strength=0.4)

    # 3D Gold Medal coin
    draw_phong_cylinder(img, 512, 620, 240, 80, (255, 195, 35), shininess=40.0, spec_strength=1.1)
    draw_phong_sphere(img, 512, 620, 230, 230, (255, 220, 55), shininess=55.0, spec_strength=1.3)
    draw_phong_sphere(img, 512, 620, 185, 185, (255, 235, 75), shininess=60.0, spec_strength=1.4)

    # 3D Number 1 embossed
    d = ImageDraw.Draw(img)
    try:
        f = ImageFont.truetype("C:/Windows/Fonts/impact.ttf", 150)
    except Exception:
        f = ImageFont.load_default()
    for off in range(8, 0, -2):
        d.text((512 - off, 610 + off), "1", fill=(165, 115, 15, 255), font=f, anchor="mm")
    d.text((512, 610), "1", fill=(255, 255, 255, 255), font=f, anchor="mm")

    return img


def make_3d_gasmask(is_wear: bool = False):
    W, H = 1024, 1024
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    cy = 460 if is_wear else 510
    draw_phong_sphere(img, 512, cy, 240, 260, (75, 95, 80), shininess=20.0, spec_strength=0.6)

    # Eye positions
    lex, rex, ey = (372, 652, 430) if is_wear else (410, 614, 460)
    for ex in (lex, rex):
        draw_phong_cylinder(img, ex, ey, 78, 30, (40, 48, 42), shininess=35.0, spec_strength=0.9)
        draw_phong_sphere(img, ex, ey, 68, 68, (185, 240, 255), shininess=70.0, spec_strength=1.5)

    fy = cy + 130
    draw_phong_cylinder(img, 512, fy, 85, 90, (45, 52, 46), shininess=30.0, spec_strength=0.8)
    draw_phong_sphere(img, 512, fy, 80, 50, (32, 38, 34), shininess=25.0, spec_strength=0.7)

    return img


# =========================================================================
# 3. 3D BEGINNER FX: fx_skull, fx_rainbow, fx_poop
# =========================================================================

def make_3d_fx_skull():
    W, H = 256, 256
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw_phong_sphere(img, 128, 110, 72, 65, (230, 215, 245), shininess=18.0, spec_strength=0.7)
    draw_phong_cylinder(img, 128, 160, 45, 45, (220, 205, 235), shininess=16.0, spec_strength=0.6)

    arr = np.asarray(img).copy()
    y, x = np.ogrid[0:H, 0:W]
    arr[((x - 105)**2 + (y - 115)**2 <= 16**2), :3] = 20
    arr[((x - 151)**2 + (y - 115)**2 <= 16**2), :3] = 20
    arr[((x - 128)**2 + (y - 142)**2 <= 8**2), :3] = 20
    return Image.fromarray(arr)


def make_3d_fx_rainbow():
    W, H = 256, 256
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    layers = [
        (105, (255, 60, 60)),
        (90, (255, 165, 40)),
        (75, (255, 235, 50)),
        (60, (60, 220, 80)),
        (45, (50, 160, 255)),
        (30, (160, 60, 240)),
    ]
    for r, col in layers:
        ring = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        draw_phong_sphere(ring, 128, 160, r, r, col, shininess=35.0, spec_strength=0.9)
        ring_arr = np.asarray(ring).copy()
        ring_arr[160:, :, 3] = 0
        img.paste(Image.fromarray(ring_arr), (0, 0), Image.fromarray(ring_arr))

    return img


def make_3d_fx_poop():
    W, H = 256, 256
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw_phong_sphere(img, 128, 175, 80, 48, (145, 85, 45), shininess=45.0, spec_strength=1.1)
    draw_phong_sphere(img, 128, 130, 62, 40, (160, 95, 50), shininess=45.0, spec_strength=1.1)
    draw_phong_sphere(img, 128, 90, 42, 32, (175, 105, 55), shininess=45.0, spec_strength=1.1)
    draw_phong_sphere(img, 128, 65, 20, 20, (190, 115, 60), shininess=50.0, spec_strength=1.2)

    # 3D Plastic Googly eyes
    draw_phong_sphere(img, 110, 130, 15, 15, (255, 255, 255), shininess=60.0, spec_strength=1.3)
    draw_phong_sphere(img, 146, 130, 15, 15, (255, 255, 255), shininess=60.0, spec_strength=1.3)
    draw_phong_sphere(img, 112, 130, 6, 6, (20, 20, 20), shininess=40.0)
    draw_phong_sphere(img, 148, 130, 6, 6, (20, 20, 20), shininess=40.0)

    return img


# =========================================================================
# 4. 3D BEGINNER BUBBLES: bubble_katalk, bubble_shout, bubble_thought, bubble_torn
# =========================================================================

def make_3d_bubble(bubble_type: str):
    W, H = 512, 256
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    if bubble_type == "katalk":
        draw_phong_sphere(img, 256, 115, 215, 80, (255, 235, 65), shininess=50.0, spec_strength=1.1)
        draw_phong_sphere(img, 110, 185, 45, 45, (255, 235, 65), shininess=40.0, spec_strength=0.9)

    elif bubble_type == "shout":
        d = ImageDraw.Draw(img)
        pts = [
            (50, 60), (140, 30), (230, 50), (320, 25), (410, 50), (475, 75),
            (490, 130), (460, 175), (380, 185), (290, 175), (200, 190), (120, 180),
            (60, 235), (95, 185), (35, 155), (25, 105)
        ]
        d.polygon(pts, fill=(255, 65, 65, 255), outline=(40, 20, 20, 255), width=8)
        arr = np.asarray(img).copy()
        arr[..., :3] = np.clip(arr[..., :3] * 1.1 + 40, 0, 255)
        img = Image.fromarray(arr)

    elif bubble_type == "thought":
        for cx, cy, rx, ry in [(180, 110, 80, 65), (260, 95, 95, 75), (340, 110, 85, 65), (256, 135, 140, 60)]:
            draw_phong_sphere(img, cx, cy, rx, ry, (245, 248, 255), shininess=45.0, spec_strength=1.0)
        draw_phong_sphere(img, 110, 195, 22, 22, (245, 248, 255), shininess=45.0)
        draw_phong_sphere(img, 80, 225, 14, 14, (245, 248, 255), shininess=45.0)

    elif bubble_type == "torn":
        d = ImageDraw.Draw(img)
        d.rounded_rectangle([45, 35, 467, 185], radius=18, fill=(245, 238, 215, 255), outline=(145, 125, 95, 255), width=8)
        d.polygon([(90, 185), (55, 235), (135, 185)], fill=(245, 238, 215, 255), outline=(145, 125, 95, 255), width=6)
        arr = np.asarray(img).copy()
        arr[35:55, 45:467, :3] = np.clip(arr[35:55, 45:467, :3] + 35, 0, 255)
        img = Image.fromarray(arr)

    return img


def render_all_3d_beginner_assets():
    print(">>> Generating 3D Beginner Model Assets...")

    # Backgrounds
    print("  -> bg_vapor")
    make_3d_bg_vapor().save(os.path.join(SKIN_DIR, "bg", "bg_vapor.png"))
    print("  -> bg_space")
    make_3d_bg_space().save(os.path.join(SKIN_DIR, "bg", "bg_space.png"))

    # Props
    print("  -> prop_trophy")
    make_3d_prop_trophy().save(os.path.join(SKIN_DIR, "prop", "prop_trophy.png"))
    print("  -> prop_medal")
    make_3d_prop_medal().save(os.path.join(SKIN_DIR, "prop", "prop_medal.png"))
    print("  -> prop_gasmask")
    make_3d_gasmask(is_wear=False).save(os.path.join(SKIN_DIR, "prop", "prop_gasmask.png"))

    # Wear
    print("  -> wear_gasmask")
    make_3d_gasmask(is_wear=True).save(os.path.join(SKIN_DIR, "wear", "wear_gasmask.png"))

    # FX
    print("  -> fx_skull_1")
    make_3d_fx_skull().save(os.path.join(SKIN_DIR, "fx", "fx_skull_1.png"))
    print("  -> fx_rainbow_1")
    make_3d_fx_rainbow().save(os.path.join(SKIN_DIR, "fx", "fx_rainbow_1.png"))
    print("  -> fx_poop_1")
    make_3d_fx_poop().save(os.path.join(SKIN_DIR, "fx", "fx_poop_1.png"))

    # Bubbles
    for b in ("katalk", "shout", "thought", "torn"):
        print(f"  -> bubble_{b}")
        make_3d_bubble(b).save(os.path.join(SKIN_DIR, "bubble", f"bubble_{b}.png"))

    print(">>> All 3D Beginner Model Assets Rendered Successfully!")


if __name__ == "__main__":
    render_all_3d_beginner_assets()
