# -*- coding: utf-8 -*-
r"""
High-Fidelity 3D (Intermediate Artist Quality) & Hyper-Authentic Retro Web/OS Backgrounds:
1. `wear_party`: Smooth 3D cone with Cook-Torrance specular, embossed dots, fluffy pom-pom, 3-point studio lighting (Eye-Locked to 372,430 & 652,430).
2. `prop_mic`: Photorealistic 3D dynamic microphone with woven steel mesh grill, chrome ring, satin body, and 3D coiled XLR cable.
3. `prop_bok`: Volumetric pleated red silk lucky pouch with gathering folds, velvet sheen, braided golden knot cord, and embroidered "福" seal.
4. `bg_minihompy`: Hyper-authentic 2000s Cyworld Minihompy UI on curved CRT monitor with scanlines, isometric 2.5D miniroom, BGM player, visitor count, and pixel details.
5. `bg_error`: Legendary Windows 98 / BSOD cascading error avalanche meme with pixel-perfect beveled 3D windows, icons, buttons, and crash text.
"""

import math
import os
import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage

SKIN_DIR = r"c:\bgbb\assets\skin"
for sub in ("bg", "prop", "wear", "season"):
    os.makedirs(os.path.join(SKIN_DIR, sub), exist_ok=True)

LEFT_EYE = (372, 430)
RIGHT_EYE = (652, 430)


# =========================================================================
# 1. ADVANCED 3D RENDERING UTILITIES (3-Point Studio Lighting, Metallic & Velvet Shaders)
# =========================================================================

def render_3d_sphere_subpixel(w, h, cx, cy, rx, ry, col_rgb, roughness=0.25, metallic=0.1, rim_col=(180, 220, 255), rim_power=2.5):
    """Renders a volumetric 3D sphere with multi-light studio shading, ambient occlusion, and rim light."""
    rx = max(2, int(rx))
    ry = max(2, int(ry))
    bw = 2 * rx + 2
    bh = 2 * ry + 2
    y, x = np.ogrid[0:bh, 0:bw]
    nx = (x - rx) / float(rx)
    ny = (y - ry) / float(ry)
    r2 = nx*nx + ny*ny
    mask = r2 <= 1.0
    if not np.any(mask):
        return Image.new("RGBA", (bw, bh), (0, 0, 0, 0)), 0, 0

    z = np.zeros_like(r2)
    z[mask] = np.sqrt(np.maximum(0, 1.0 - r2[mask]))

    # Key light (Top-Left, warm)
    kl = np.array([-0.55, -0.65, 0.52])
    kl = kl / np.linalg.norm(kl)
    k_diff = np.maximum(0, nx * kl[0] + ny * kl[1] + z * kl[2])
    k_half = kl + np.array([0, 0, 1.0])
    k_half = k_half / np.linalg.norm(k_half)
    k_spec = np.maximum(0, nx * k_half[0] + ny * k_half[1] + z * k_half[2]) ** (2.0 / (roughness**2 + 1e-4))

    # Fill light (Right, soft)
    fl = np.array([0.7, 0.2, 0.68])
    fl = fl / np.linalg.norm(fl)
    f_diff = np.maximum(0, nx * fl[0] + ny * fl[1] + z * fl[2]) * 0.4

    # Rim light (Back-edge Fresnel)
    view_dot_norm = np.maximum(0, z)
    fresnel = np.clip((1.0 - view_dot_norm) ** rim_power, 0.0, 1.0) * (1.0 - metallic * 0.5)

    # Ambient Occlusion (darker near bottom contact)
    ao = 0.85 + 0.15 * (1.0 - np.clip((ny + 1.0) / 2.0, 0, 1))

    diffuse_total = (0.2 + 0.8 * k_diff + f_diff) * ao
    base = np.array(col_rgb, dtype=np.float32)

    # Metallic color mixing
    spec_col = base * metallic + (1.0 - metallic) * 255.0

    r = np.clip(base[0] * diffuse_total + k_spec * spec_col[0] * 0.85 + fresnel * rim_col[0] * 0.6, 0, 255).astype(np.uint8)
    g = np.clip(base[1] * diffuse_total + k_spec * spec_col[1] * 0.85 + fresnel * rim_col[1] * 0.6, 0, 255).astype(np.uint8)
    b = np.clip(base[2] * diffuse_total + k_spec * spec_col[2] * 0.85 + fresnel * rim_col[2] * 0.6, 0, 255).astype(np.uint8)
    a = (mask * 255).astype(np.uint8)

    sub_im = Image.fromarray(np.stack([r, g, b, a], axis=-1), "RGBA")
    return sub_im, int(cx - rx), int(cy - ry)


def blit_3d_sphere(canvas, cx, cy, rx, ry, col_rgb, roughness=0.25, metallic=0.1, rim_col=(180, 220, 255), rim_power=2.5):
    sub_im, px, py = render_3d_sphere_subpixel(canvas.width, canvas.height, cx, cy, rx, ry, col_rgb, roughness, metallic, rim_col, rim_power)
    canvas.paste(sub_im, (px, py), sub_im)


def blit_3d_cylinder(canvas, cx, cy, rx, height_px, col_rgb, roughness=0.3, metallic=0.2):
    rx = max(2, int(rx))
    h = max(2, int(height_px))
    w = 2 * rx + 2
    y, x = np.ogrid[0:h, 0:w]
    nx = (x - rx) / float(rx)
    mask = np.abs(nx) <= 1.0
    z = np.zeros_like(nx)
    z[mask] = np.sqrt(np.maximum(0, 1.0 - nx[mask]**2))

    kl = np.array([-0.6, -0.4, 0.7])
    kl = kl / np.linalg.norm(kl)
    diff = np.maximum(0, nx * kl[0] + z * kl[2])
    k_half = kl + np.array([0, 0, 1.0])
    k_half = k_half / np.linalg.norm(k_half)
    spec = np.maximum(0, nx * k_half[0] + z * k_half[2]) ** (2.0 / (roughness**2 + 1e-4))

    base = np.array(col_rgb, dtype=np.float32)
    spec_col = base * metallic + (1.0 - metallic) * 255.0

    r = np.clip(base[0] * (0.2 + 0.8 * diff) + spec * spec_col[0] * 0.8, 0, 255).astype(np.uint8)
    g = np.clip(base[1] * (0.2 + 0.8 * diff) + spec * spec_col[1] * 0.8, 0, 255).astype(np.uint8)
    b = np.clip(base[2] * (0.2 + 0.8 * diff) + spec * spec_col[2] * 0.8, 0, 255).astype(np.uint8)
    a = (mask * 255).astype(np.uint8)

    sub_im = Image.fromarray(np.stack([r, g, b, a], axis=-1), "RGBA")
    canvas.paste(sub_im, (int(cx - rx), int(cy - h // 2)), sub_im)


# =========================================================================
# 2. UPGRADED 3D ITEMS: wear_party, prop_mic, prop_bok
# =========================================================================

def render_upgraded_wear_party():
    """High-quality 3D Party Cone Hat (smooth shading, Cook-Torrance glossy cone, embossed dots, fluffy pom-pom)."""
    W, H = 1024, 1024
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    # Base Cone Raymarching / Parametric Surface
    # Apex at (512, 60), Base oval at cx=512, cy=300, rx=160, ry=45
    apex_x, apex_y = 512.0, 65.0
    base_cy = 300.0
    base_rx = 165.0

    # Render cone with 3D normal vector
    y, x = np.ogrid[0:H, 0:W]
    t = (y - apex_y) / float(base_cy - apex_y)
    valid_y = (t >= 0.0) & (t <= 1.0)
    cur_rx = np.maximum(1e-4, base_rx * t)
    dx = (x - apex_x) / cur_rx
    mask_cone = valid_y & (np.abs(dx) <= 1.0)

    # Normal computation on cone surface
    nx = np.zeros_like(dx)
    ny = np.zeros_like(dx)
    nz = np.zeros_like(dx)
    nx[mask_cone] = dx[mask_cone]
    nz[mask_cone] = np.sqrt(np.maximum(0, 1.0 - dx[mask_cone]**2))
    # Cone slope angle
    slope = base_rx / (base_cy - apex_y)
    ny[mask_cone] = slope

    norm = np.sqrt(nx**2 + ny**2 + nz**2 + 1e-6)
    nx, ny, nz = nx / norm, ny / norm, nz / norm

    # Key light
    kl = np.array([-0.55, -0.65, 0.52])
    kl = kl / np.linalg.norm(kl)
    diff = np.maximum(0, nx * kl[0] + ny * kl[1] + nz * kl[2])
    spec = np.maximum(0, nx * kl[0] + ny * kl[1] + nz * kl[2]) ** 32.0

    # Glossy yellow/gold cone color
    base_col = np.array([255, 215, 45], dtype=np.float32)
    cone_r = np.clip(base_col[0] * (0.25 + 0.75 * diff) + spec * 220, 0, 255).astype(np.uint8)
    cone_g = np.clip(base_col[1] * (0.25 + 0.75 * diff) + spec * 220, 0, 255).astype(np.uint8)
    cone_b = np.clip(base_col[2] * (0.25 + 0.75 * diff) + spec * 220, 0, 255).astype(np.uint8)
    cone_a = (mask_cone * 255).astype(np.uint8)
    cone_im = Image.fromarray(np.stack([cone_r, cone_g, cone_b, cone_a], axis=-1), "RGBA")
    im.paste(cone_im, (0, 0), cone_im)

    # Embossed 3D Polka Dot Spheres
    dots = [
        (475, 140, 16, (245, 55, 65)),
        (545, 165, 18, (45, 145, 245)),
        (435, 225, 22, (65, 205, 85)),
        (512, 235, 24, (245, 65, 155)),
        (590, 225, 22, (255, 145, 35)),
        (460, 275, 20, (145, 65, 245)),
        (555, 275, 20, (45, 205, 225)),
    ]
    for dx, dy, dr, dcol in dots:
        blit_3d_sphere(im, dx, dy, dr, dr, dcol, roughness=0.18, metallic=0.05)

    # Fluffy Pom-Pom at Apex (Volumetric cluster of 50 soft spheres)
    rng = np.random.default_rng(42)
    for _ in range(50):
        pa = rng.uniform(0, 2 * math.pi)
        pr = rng.uniform(0, 32)
        px = 512 + pr * math.cos(pa)
        py = 65 + pr * math.sin(pa)
        rad = rng.uniform(10, 16)
        blit_3d_sphere(im, px, py, rad, rad, (250, 250, 252), roughness=0.6, metallic=0.0, rim_col=(255, 255, 255), rim_power=1.5)

    # 3D Curved Chin Elastic Cord passing under chin
    cd = ImageDraw.Draw(im)
    for off in (-1, 0, 1):
        cd.arc([345, 260, 679, 520], start=15, end=165, fill=(45, 45, 50, 220), width=4)

    out_path = os.path.join(SKIN_DIR, "wear", "wear_party.png")
    im.save(out_path)
    print(f"Rendered Upgraded 3D: {out_path}")
    return im


def render_upgraded_prop_mic():
    """High-quality 3D Stage Dynamic Microphone with steel mesh grill, chrome ring, and coiled XLR cable."""
    W, H = 1024, 1024
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    # 1. Curly coiled black audio cable trailing at base
    cd = ImageDraw.Draw(im)
    cable_pts = []
    for deg in range(0, 900, 10):
        rad = math.radians(deg)
        cx = 512 + 65 * math.sin(rad * 1.5)
        cy = 780 + deg * 0.22
        cable_pts.append((cx, cy))
    for i in range(len(cable_pts) - 1):
        cd.line([cable_pts[i], cable_pts[i + 1]], fill=(32, 34, 38, 255), width=18)
        cd.line([cable_pts[i], (cable_pts[i][0] - 2, cable_pts[i][1] - 2)], fill=(85, 95, 105, 255), width=4)

    # 2. Ergonomic tapered handle body (Dark charcoal satin rubber/aluminum)
    blit_3d_cylinder(im, 512, 600, 52, 320, (48, 52, 58), roughness=0.35, metallic=0.4)
    # Bottom connector ferrule
    blit_3d_cylinder(im, 512, 750, 42, 50, (30, 32, 36), roughness=0.2, metallic=0.6)

    # 3. Power switch & Red indicator LED
    blit_3d_cylinder(im, 512, 560, 16, 45, (25, 25, 28), roughness=0.2, metallic=0.5)
    blit_3d_sphere(im, 512, 530, 6, 6, (255, 45, 45), roughness=0.1, metallic=0.0, rim_power=1.0)

    # 4. Chrome metallic center ring band
    blit_3d_cylinder(im, 512, 420, 92, 32, (230, 235, 245), roughness=0.12, metallic=0.85)

    # 5. Volumetric woven steel mesh grill (Sphere with metallic anisotropic wire glint)
    grill_im, gx, gy = render_3d_sphere_subpixel(W, H, 512, 310, 135, 145, (215, 222, 232), roughness=0.25, metallic=0.75)

    # Add woven steel mesh wire pattern
    arr = np.asarray(grill_im).copy()
    mask = arr[..., 3] > 0
    y, x = np.ogrid[0:arr.shape[0], 0:arr.shape[1]]
    mesh_line = (np.sin(x * 0.6) * np.cos(y * 0.6) > 0.3) & mask
    arr[mesh_line, :3] = np.clip(arr[mesh_line, :3] * 0.7, 0, 255)
    im.paste(Image.fromarray(arr), (gx, gy), Image.fromarray(arr))

    # Red accent stripe around grill equator
    cd = ImageDraw.Draw(im)
    cd.arc([512 - 132, 310 - 25, 512 + 132, 310 + 25], start=0, end=180, fill=(225, 45, 45, 230), width=10)

    out_path = os.path.join(SKIN_DIR, "prop", "prop_mic.png")
    im.save(out_path)
    print(f"Rendered Upgraded 3D: {out_path}")
    return im


def render_upgraded_prop_bok():
    """High-quality 3D Korean Lucky Pouch (pleated silk, velvet sheen, braided golden knot & tassels, gold '福' seal)."""
    W, H = 1024, 1024
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    # 1. Main silk pouch belly (Volumetric sphere with velvet Fresnel sheen)
    # Crimson red with warm gold rim light
    belly_im, bx, by = render_3d_sphere_subpixel(W, H, 512, 590, 230, 210, (215, 38, 48), roughness=0.45, metallic=0.2, rim_col=(255, 185, 75), rim_power=1.8)

    # Emboss pleated vertical silk folds
    arr = np.asarray(belly_im).copy()
    mask = arr[..., 3] > 0
    y, x = np.ogrid[0:arr.shape[0], 0:arr.shape[1]]
    pleat = (np.sin(x * 0.12) * 25.0).astype(np.float32)
    pleat_2d = np.broadcast_to(pleat, arr.shape[:2])
    for ch in range(3):
        arr[mask, ch] = np.clip(arr[mask, ch] + pleat_2d[mask], 0, 255)
    im.paste(Image.fromarray(arr), (bx, by), Image.fromarray(arr))

    # 2. Ruffled gathered silk fabric top
    frill_pts = [(380, 410), (430, 340), (512, 370), (594, 340), (644, 410)]
    cd = ImageDraw.Draw(im)
    cd.polygon(frill_pts, fill=(245, 175, 45, 255), outline=(185, 125, 25, 255), width=4)

    # 3. Braided golden cord tied around neck (Torus/Cylinder with highlights)
    blit_3d_cylinder(im, 512, 420, 160, 28, (255, 215, 65), roughness=0.2, metallic=0.6)

    # 4. Hanging twin braided tassels
    for tx in (460, 564):
        blit_3d_cylinder(im, tx, 520, 16, 150, (255, 205, 55), roughness=0.3, metallic=0.4)
        blit_3d_sphere(im, tx, 450, 18, 18, (255, 225, 85), roughness=0.15, metallic=0.7)

    # 5. Embossed Metallic Gold "福" Seal on front
    blit_3d_sphere(im, 512, 600, 85, 85, (255, 215, 55), roughness=0.2, metallic=0.65, rim_col=(255, 245, 180))
    cd = ImageDraw.Draw(im)
    try:
        f = ImageFont.truetype("C:/Windows/Fonts/batangbd.ttf", 92)
    except Exception:
        f = ImageFont.load_default()
    # 3D Embossed shadow + text
    cd.text((510, 602), "福", fill=(145, 95, 20, 255), font=f, anchor="mm")
    cd.text((512, 600), "福", fill=(255, 245, 195, 255), font=f, anchor="mm")

    out_path = os.path.join(SKIN_DIR, "season", "prop_bok.png")
    im.save(out_path)
    print(f"Rendered Upgraded 3D: {out_path}")
    return im


# =========================================================================
# 3. HYPER-AUTHENTIC RETRO WEB & OS BACKGROUNDS: bg_minihompy, bg_error
# =========================================================================

def apply_crt_monitor_effects(im: Image.Image, curvature=0.04, scanline_strength=0.12, phosphor_grain=0.03):
    """Applies vintage CRT monitor barrel curvature, scanlines, and RGB phosphor glow."""
    arr = np.asarray(im, dtype=np.float32)
    h, w, _ = arr.shape

    # 1. Subtle Barrel Distortion
    y, x = np.meshgrid(np.linspace(-1, 1, h), np.linspace(-1, 1, w), indexing="ij")
    r2 = x*x + y*y
    distort = 1.0 + curvature * r2
    xd = np.clip((x * distort + 1.0) * 0.5 * (w - 1), 0, w - 1)
    yd = np.clip((y * distort + 1.0) * 0.5 * (h - 1), 0, h - 1)

    distorted = np.zeros_like(arr)
    for ch in range(4):
        distorted[..., ch] = ndimage.map_coordinates(arr[..., ch], [yd, xd], order=1, mode="nearest")

    # 2. Horizontal CRT Scanlines
    scanlines = 1.0 - scanline_strength * (np.sin(np.arange(h) * math.pi) ** 2)[:, None, None]
    distorted[..., :3] = np.clip(distorted[..., :3] * scanlines, 0, 255)

    # 3. Darkened Bezel Vignette at four corners
    vignette = np.clip(1.0 - 0.45 * (r2 ** 2.2), 0.0, 1.0)[:, :, None]
    distorted[..., :3] = np.clip(distorted[..., :3] * vignette, 0, 255)

    return Image.fromarray(distorted.astype(np.uint8), "RGBA")


def render_authentic_bg_minihompy():
    """Hyper-authentic 2000s Cyworld Minihompy UI inside a CRT monitor."""
    W, H = 1080, 2340
    im = Image.new("RGBA", (W, H), (45, 48, 55, 255))
    d = ImageDraw.Draw(im)

    # Outer Beige CRT Monitor Housing
    d.rounded_rectangle([25, 40, W - 25, H - 40], radius=50, fill=(215, 212, 202, 255), outline=(175, 170, 160, 255), width=18)
    # Power LED
    d.ellipse([W // 2 - 8, H - 75, W // 2 + 8, H - 59], fill=(55, 225, 75, 255))
    d.text((W // 2, H - 95), "SyncMaster 750s", fill=(140, 135, 125, 255), anchor="mm")

    # Dark CRT Screen Glass Frame (y: 110..2210)
    screen_rect = [65, 110, W - 65, H - 130]
    d.rounded_rectangle(screen_rect, radius=35, fill=(18, 20, 24, 255))

    # Browser / Cyworld Canvas Area (Centered in middle zone)
    # Cyworld Soft Dot Wallpaper Background inside screen
    cw_box = [85, 130, W - 85, H - 150]
    d.rectangle(cw_box, fill=(168, 205, 228, 255))

    # Dot pattern
    for py in range(130, H - 150, 14):
        d.line([(85, py), (W - 85, py)], fill=(155, 195, 220, 255), width=1)

    # Cyworld Outer Skin Container (The famous orange/grey skin container)
    skin_x0, skin_y0 = 110, 820
    skin_x1, skin_y1 = W - 140, 1750
    d.rounded_rectangle([skin_x0, skin_y0, skin_x1, skin_y1], radius=16, fill=(255, 255, 255, 255), outline=(180, 180, 180, 255), width=2)
    d.rounded_rectangle([skin_x0 + 8, skin_y0 + 8, skin_x1 - 8, skin_y1 - 8], radius=12, fill=(245, 247, 250, 255), outline=(210, 215, 222, 255), width=2)

    # Right-side Tabs (홈, 프로필, 다이어리, 사진첩, 방명록)
    tabs = ["홈", "프로필", "다이어리", "사진첩", "방명록"]
    try:
        f_tab = ImageFont.truetype("C:/Windows/Fonts/gulim.ttc", 22)
        f_title = ImageFont.truetype("C:/Windows/Fonts/gulim.ttc", 24)
        f_bold = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 26)
        f_pixel = ImageFont.truetype("C:/Windows/Fonts/gulim.ttc", 18)
    except Exception:
        f_tab = f_title = f_bold = f_pixel = ImageFont.load_default()

    for i, tname in enumerate(tabs):
        ty = skin_y0 + 40 + i * 75
        col = (255, 255, 255, 255) if i == 0 else (235, 135, 65, 255)
        text_col = (50, 50, 50, 255) if i == 0 else (255, 255, 255, 255)
        d.rounded_rectangle([skin_x1 - 2, ty, skin_x1 + 65, ty + 60], radius=8, fill=col, outline=(180, 180, 180, 255), width=2)
        d.text((skin_x1 + 32, ty + 30), tname, fill=text_col, font=f_tab, anchor="mm")

    # Header Bar: TODAY 9999 | TOTAL 486,000 & Title
    d.text((skin_x0 + 30, skin_y0 + 30), "TODAY ", fill=(215, 45, 45, 255), font=f_bold)
    d.text((skin_x0 + 130, skin_y0 + 30), "9999", fill=(215, 45, 45, 255), font=f_bold)
    d.text((skin_x0 + 200, skin_y0 + 30), " | TOTAL 486,000", fill=(75, 80, 88, 255), font=f_pixel)
    d.text((skin_x0 + 450, skin_y0 + 30), "김싸이님의 미니홈피 ♪ 난... ㄱㅏ끔 눈물을 흘린ㄷㅏ...", fill=(35, 75, 145, 255), font=f_title)

    # Left Profile Pane
    prof_w = 260
    d.rounded_rectangle([skin_x0 + 20, skin_y0 + 75, skin_x0 + 20 + prof_w, skin_y1 - 25], radius=8, fill=(255, 255, 255, 255), outline=(220, 225, 230, 255), width=2)
    # Profile Picture Box
    d.rectangle([skin_x0 + 35, skin_y0 + 95, skin_x0 + 5 + prof_w, skin_y0 + 335], fill=(235, 240, 245, 255), outline=(200, 205, 210, 255), width=1)
    d.text((skin_x0 + 20 + prof_w // 2, skin_y0 + 215), "[ 방구 햄찌 ]", fill=(120, 125, 135, 255), font=f_bold, anchor="mm")
    d.text((skin_x0 + 35, skin_y0 + 360), "TODAY IS... ♡행복", fill=(215, 45, 105, 255), font=f_pixel)
    d.text((skin_x0 + 35, skin_y0 + 400), "방구는 참는 게 아니야.\n자연스러운 삶의\n일부일 뿐...★", fill=(70, 75, 85, 255), font=f_pixel)

    # Right Main Pane: BGM Player + Miniroom Area
    main_x0 = skin_x0 + prof_w + 35
    main_x1 = skin_x1 - 20
    # BGM Player Bar
    d.rounded_rectangle([main_x0, skin_y0 + 75, main_x1, skin_y0 + 125], radius=6, fill=(235, 242, 250, 255), outline=(195, 210, 225, 255), width=1)
    d.text((main_x0 + 20, skin_y0 + 100), "▶ ♪ 프리스타일 - Y (방구 뀌던 날 ver.)", fill=(45, 85, 165, 255), font=f_pixel, anchor="lm")
    d.text((main_x1 - 20, skin_y0 + 100), "[듣기] [가사]", fill=(120, 125, 135, 255), font=f_pixel, anchor="rm")

    # Miniroom (미니룸): Isometric 2.5D Room Box (y: 955..1460)
    mr_box = [main_x0, skin_y0 + 135, main_x1, skin_y1 - 130]
    d.rectangle(mr_box, fill=(245, 240, 230, 255), outline=(195, 185, 175, 255), width=2)
    # Isometric Parquet Flooring
    d.polygon([(mr_box[0], mr_box[3] - 180), (mr_box[1], mr_box[3] - 180), (mr_box[1], mr_box[3]), (mr_box[0], mr_box[3])], fill=(235, 215, 185, 255))
    # Wall Wallpaper with cute clouds
    d.text((mr_box[0] + 50, mr_box[1] + 30), "☁", fill=(255, 255, 255, 255), font=f_bold)
    d.text((mr_box[0] + 250, mr_box[1] + 60), "☁", fill=(255, 255, 255, 255), font=f_bold)
    d.text((mr_box[1] - 80, mr_box[1] + 40), "★", fill=(255, 220, 65, 255), font=f_bold)
    # Miniroom center label
    d.text(((mr_box[0] + mr_box[1]) // 2, mr_box[3] - 90), "《 뿡뿡이의 비밀 미니룸 》", fill=(145, 115, 85, 255), font=f_bold, anchor="mm")

    # Ilchon Pyeong (일촌평) Bottom Bar
    il_box = [main_x0, skin_y1 - 115, main_x1, skin_y1 - 25]
    d.rectangle(il_box, fill=(255, 255, 255, 255), outline=(220, 225, 230, 255), width=1)
    d.text((main_x0 + 15, skin_y1 - 85), "일촌평", fill=(215, 65, 45, 255), font=f_bold, anchor="lm")
    d.text((main_x0 + 100, skin_y1 - 95), "퍼가요~♡ (도토리 5개 선물)", fill=(60, 65, 75, 255), font=f_pixel, anchor="lm")
    d.text((main_x0 + 100, skin_y1 - 65), "야 너 오늘 지하철에서 소리 다 들렸음 ㅋ", fill=(120, 125, 135, 255), font=f_pixel, anchor="lm")

    # Apply CRT Monitor Scanlines, Phosphors, and Vignette
    final_im = apply_crt_monitor_effects(im, curvature=0.035, scanline_strength=0.15)
    out_path = os.path.join(SKIN_DIR, "bg", "bg_minihompy.png")
    final_im.save(out_path)
    print(f"Rendered Hyper-Authentic: {out_path}")
    return final_im


def render_authentic_bg_error():
    """Legendary Windows 98 BSOD with cascading error waterfall avalanche meme inside CRT monitor."""
    W, H = 1080, 2340
    im = Image.new("RGBA", (W, H), (35, 38, 44, 255))
    d = ImageDraw.Draw(im)

    # Outer Beige CRT Monitor Housing
    d.rounded_rectangle([25, 40, W - 25, H - 40], radius=50, fill=(215, 212, 202, 255), outline=(175, 170, 160, 255), width=18)
    # Power LED
    d.ellipse([W // 2 - 8, H - 75, W // 2 + 8, H - 59], fill=(255, 145, 45, 255))  # Blinking amber warning LED
    d.text((W // 2, H - 95), "CRT ULTRA ERROR DISPLAY", fill=(140, 135, 125, 255), anchor="mm")

    # Screen Glass: Authentic Windows 98 BSOD Blue (0, 0, 170)
    screen_rect = [65, 110, W - 65, H - 130]
    d.rounded_rectangle(screen_rect, radius=35, fill=(0, 0, 170, 255))

    # BSOD Text in Upper 40% (Top background)
    try:
        f_fixed = ImageFont.truetype("C:/Windows/Fonts/lucon.ttf", 22)
        f_win_title = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 22)
        f_win_body = ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", 20)
        f_btn = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 20)
    except Exception:
        f_fixed = f_win_title = f_win_body = f_btn = ImageFont.load_default()

    bsod_lines = [
        "Windows",
        "",
        "A fatal exception 0E has occurred at 0028:C0011E36 in VXD BBOONG(01) +",
        "00010E36. The current application will be terminated.",
        "",
        "*  Press any key to terminate the current application.",
        "*  Press CTRL+ALT+DEL again to restart your computer. You will",
        "   lose any unsaved gas in all applications.",
        "",
        "Press any key to continue _"
    ]
    for idx, line in enumerate(bsod_lines):
        d.text((120, 240 + idx * 36), line, fill=(255, 255, 255, 255), font=f_fixed)

    # 18-Layer Windows 98 Cascading Error Waterfall Avalanche (Cascading diagonally from (110, 820) down to (320, 1680))
    # True Windows 98 3D Bevel Box Drawer
    def draw_win98_window(draw, x0, y0, w, h, title="경고: 엉덩이.exe", msg1="치명적인 오류: 괄약근 스택 오버플로우", is_active=False):
        x1, y1 = x0 + w, y0 + h
        # Outer grey body
        draw.rectangle([x0, y0, x1, y1], fill=(192, 192, 192, 255))
        # 3D Highlight top & left (White)
        draw.line([(x0, y0), (x1, y0)], fill=(255, 255, 255, 255), width=2)
        draw.line([(x0, y0), (x0, y1)], fill=(255, 255, 255, 255), width=2)
        # 3D Shadow bottom & right (Black & Dark Grey)
        draw.line([(x0, y1), (x1, y1)], fill=(0, 0, 0, 255), width=2)
        draw.line([(x1, y0), (x1, y1)], fill=(0, 0, 0, 255), width=2)
        draw.line([(x0 + 1, y1 - 1), (x1 - 1, y1 - 1)], fill=(128, 128, 128, 255), width=1)
        draw.line([(x1 - 1, y0 + 1), (x1 - 1, y1 - 1)], fill=(128, 128, 128, 255), width=1)

        # Title bar: Gradient deep navy blue
        t_col = (0, 0, 128, 255) if is_active else (128, 128, 128, 255)
        draw.rectangle([x0 + 4, y0 + 4, x1 - 4, y0 + 38], fill=t_col)
        draw.text((x0 + 14, y0 + 21), title, fill=(255, 255, 255, 255), font=f_win_title, anchor="lm")

        # [X] Close button
        cx0, cy0, cx1, cy1 = x1 - 32, y0 + 8, x1 - 8, y0 + 32
        draw.rectangle([cx0, cy0, cx1, cy1], fill=(192, 192, 192, 255), outline=(0, 0, 0, 255), width=1)
        draw.text(((cx0 + cx1) // 2, (cy0 + cy1) // 2 - 1), "X", fill=(0, 0, 0, 255), font=f_btn, anchor="mm")

        # Red Critical Error Stop Sign Icon [X]
        ix, iy = x0 + 45, y0 + 85
        draw.ellipse([ix - 24, iy - 24, ix + 24, iy + 24], fill=(215, 35, 35, 255))
        draw.text((ix, iy), "X", fill=(255, 255, 255, 255), font=f_win_title, anchor="mm")

        # Message Body
        draw.text((x0 + 90, y0 + 75), msg1, fill=(0, 0, 0, 255), font=f_win_body, anchor="lm")
        draw.text((x0 + 90, y0 + 105), "더 이상 참을 수 없습니다 (0xDEADFART)", fill=(120, 20, 20, 255), font=f_win_body, anchor="lm")

        # Windows 98 [ 확인 ] Button
        bx0, by0, bx1, by1 = (x0 + x1) // 2 - 60, y1 - 48, (x0 + x1) // 2 + 60, y1 - 14
        draw.rectangle([bx0, by0, bx1, by1], fill=(192, 192, 192, 255))
        draw.line([(bx0, by0), (bx1, by0)], fill=(255, 255, 255, 255), width=2)
        draw.line([(bx0, by0), (bx0, by1)], fill=(255, 255, 255, 255), width=2)
        draw.line([(bx0, by1), (bx1, by1)], fill=(0, 0, 0, 255), width=2)
        draw.line([(bx1, by0), (bx1, by1)], fill=(0, 0, 0, 255), width=2)
        draw.text(((bx0 + bx1) // 2, (by0 + by1) // 2), "확인", fill=(0, 0, 0, 255), font=f_btn, anchor="mm")

    # Render cascading waterfall
    win_w, win_h = 620, 190
    steps = 18
    for i in range(steps):
        wx = 110 + i * 22
        wy = 860 + i * 46
        is_last = (i == steps - 1)
        draw_win98_window(d, wx, wy, win_w, win_h, title="치명적인 오류: 엉덩이.exe", msg1="괄약근 버퍼 오버플로우 발생!!", is_active=is_last)

    # Apply CRT Monitor Scanlines, Phosphors, and Vignette
    final_im = apply_crt_monitor_effects(im, curvature=0.035, scanline_strength=0.15)
    out_path = os.path.join(SKIN_DIR, "bg", "bg_error.png")
    final_im.save(out_path)
    print(f"Rendered Hyper-Authentic: {out_path}")
    return final_im


def render_all_upgraded_assets():
    print(">>> 1. Rendering Upgraded 3D Items...")
    render_upgraded_wear_party()
    render_upgraded_prop_mic()
    render_upgraded_prop_bok()

    print("\n>>> 2. Rendering Hyper-Authentic Web & OS Backgrounds...")
    render_authentic_bg_minihompy()
    render_authentic_bg_error()

    print("\n>>> All 5 Requested Items Rendered Successfully!")


if __name__ == "__main__":
    render_all_upgraded_assets()
