# -*- coding: utf-8 -*-
r"""
Processes and synthesizes all 21 photorealistic character images (Hamster, Tit, Cat x 7 expressions):
  - Uses the 12 AI-generated photorealistic masters (`raw_hamster_1..7`, `raw_tit_1..3`, `raw_cat_1..2`)
  - Synthesizes the remaining Tit (#4..#7) and Cat (#3..#7) expressions via 2D continuous displacement
    fields (`scipy.ndimage.map_coordinates`) + photorealistic texture/feature cloning from the masters.
  - Extracts clean 1024x1024 transparent RGBA PNGs in `c:\bgbb\assets\expressions_real\`
  - Aligns all #1, #3, #4, #6, #7 eye coordinates to (372, 430) & (652, 430) for 0px sunglasses/money-gun overlay.
"""

import glob
import math
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage

ARTIFACT_DIR = r"C:\Users\ruahn49\.gemini\antigravity\brain\b2ce85ba-1f7b-478f-8be4-052d7e2dab69"
OUT_REAL_DIR = r"c:\bgbb\assets\expressions_real"
EXP_DIR = r"c:\bgbb\assets\expressions"
os.makedirs(OUT_REAL_DIR, exist_ok=True)

TARGET_LEFT_EYE = (372.0, 430.0)
TARGET_RIGHT_EYE = (652.0, 430.0)


def find_raw_file(prefix):
    pattern = os.path.join(ARTIFACT_DIR, f"{prefix}_*.jpg")
    matches = sorted(glob.glob(pattern))
    if not matches:
        return None
    return matches[-1]


def detect_eye_centers(rgb_np, char_id="hamster"):
    """Detects the left and right dark eye centroids in the upper-middle face region."""
    lum = 0.299 * rgb_np[..., 0] + 0.587 * rgb_np[..., 1] + 0.114 * rgb_np[..., 2]
    thresh = 68 if char_id == "cat" else 58
    dark = lum < thresh

    left_mask = np.zeros_like(dark)
    left_mask[270:540, 220:445] = True
    ly, lx = np.where(dark & left_mask)

    right_mask = np.zeros_like(dark)
    right_mask[270:540, 579:804] = True
    ry, rx = np.where(dark & right_mask)

    if len(lx) < 20 or len(rx) < 20:
        dark2 = lum < 95
        ly, lx = np.where(dark2 & left_mask)
        ry, rx = np.where(dark2 & right_mask)

    return (float(lx.mean()), float(ly.mean())), (float(rx.mean()), float(ry.mean()))


def extract_foreground_rgba(rgb_img: Image.Image, char_id: str = "hamster") -> Image.Image:
    """Removes the contiguous studio white/off-white background from the outer border."""
    rgb_np = np.asarray(rgb_img, dtype=np.float32)
    # Estimate background color from top-left and top-right corners
    bg_tl = rgb_np[:12, :12, :3].mean(axis=(0, 1))
    bg_tr = rgb_np[:12, -12:, :3].mean(axis=(0, 1))
    bg_col = 0.5 * (bg_tl + bg_tr)

    dist_bg = np.sqrt(np.sum((bg_col[None, None, :] - rgb_np) ** 2, axis=-1))
    dist_white = np.sqrt(np.sum((255.0 - rgb_np) ** 2, axis=-1))
    dist = np.minimum(dist_bg, dist_white)

    gray = rgb_np.mean(axis=-1)
    local_mean = ndimage.uniform_filter(gray, size=7)
    local_sq_mean = ndimage.uniform_filter(gray ** 2, size=7)
    local_std = np.sqrt(np.maximum(0.0, local_sq_mean - local_mean ** 2))

    # Tit and Cat have slightly softer studio vignette corners, so allow dist < 13.5 when local_std is flat,
    # while strictly protecting the interior head/cheek/body ellipse so bright white fur highlights are never eaten!
    h, w, _ = rgb_np.shape
    yy, xx = np.meshgrid(np.arange(h, dtype=np.float32), np.arange(w, dtype=np.float32), indexing="ij")
    if char_id == "tit":
        # Protect interior of round bird head & body
        inner_body = (((xx - 512.0) / 335.0) ** 2 + ((yy - 565.0) / 375.0) ** 2) < 1.0
    elif char_id == "cat":
        # Protect interior of cat face, cheeks, and chest
        inner_body = (((xx - 512.0) / 345.0) ** 2 + ((yy - 590.0) / 370.0) ** 2) < 1.0
    else:
        inner_body = (((xx - 512.0) / 310.0) ** 2 + ((yy - 560.0) / 340.0) ** 2) < 1.0

    dist_thresh = 13.5 if char_id in ("tit", "cat") else 9.5
    std_thresh = 2.8 if char_id in ("tit", "cat") else 2.6
    is_bg_candidate = (dist < dist_thresh) & (local_std < std_thresh) & (gray > 238.0) & (~inner_body)

    seeds = np.zeros_like(is_bg_candidate, dtype=bool)
    seeds[0:6, :] = is_bg_candidate[0:6, :]
    seeds[:880, 0:6] = is_bg_candidate[:880, 0:6]
    seeds[:880, -6:] = is_bg_candidate[:880, -6:]

    labeled, _ = ndimage.label(is_bg_candidate)
    border_labels = np.unique(labeled[seeds])
    border_labels = border_labels[border_labels > 0]
    exterior_bg = np.isin(labeled, border_labels)

    fg_mask = ~exterior_bg
    fg_mask = ndimage.binary_fill_holes(fg_mask)

    alpha_f = ndimage.gaussian_filter(fg_mask.astype(np.float32), sigma=1.4)
    alpha_u8 = np.clip(alpha_f * 255.0, 0, 255).astype(np.uint8)

    rgba = np.dstack([rgb_np.astype(np.uint8), alpha_u8])
    return Image.fromarray(rgba, "RGBA")


def align_image_by_eyes(rgba_img: Image.Image, src_left, src_right, dst_left=TARGET_LEFT_EYE, dst_right=TARGET_RIGHT_EYE) -> Image.Image:
    sx0, sy0 = src_left
    sx1, sy1 = src_right
    dx0, dy0 = dst_left
    dx1, dy1 = dst_right

    src_dx, src_dy = sx1 - sx0, sy1 - sy0
    dst_dx, dst_dy = dx1 - dx0, dy1 - dy0

    src_dist = math.hypot(src_dx, src_dy)
    dst_dist = math.hypot(dst_dx, dst_dy)
    scale = src_dist / dst_dist

    src_ang = math.atan2(src_dy, src_dx)
    dst_ang = math.atan2(dst_dy, dst_dx)
    d_ang = src_ang - dst_ang

    cos_a = scale * math.cos(d_ang)
    sin_a = scale * math.sin(d_ang)

    src_mx, src_my = (sx0 + sx1) / 2.0, (sy0 + sy1) / 2.0
    dst_mx, dst_my = (dx0 + dx1) / 2.0, (dy0 + dy1) / 2.0

    a = cos_a
    b = -sin_a
    c = src_mx - a * dst_mx - b * dst_my
    d = sin_a
    e = cos_a
    f = src_my - d * dst_mx - e * dst_my

    return rgba_img.transform(
        (1024, 1024),
        Image.Transform.AFFINE,
        (a, b, c, d, e, f),
        resample=Image.Resampling.BICUBIC,
    )


def apply_displacement_warp(rgba_img: Image.Image, dx_field: np.ndarray, dy_field: np.ndarray) -> Image.Image:
    """Warps an RGBA image using smooth 2D inverse displacement fields (dx_field, dy_field)."""
    arr = np.asarray(rgba_img, dtype=np.float32)
    h, w, c = arr.shape
    yy, xx = np.meshgrid(np.arange(h, dtype=np.float32), np.arange(w, dtype=np.float32), indexing="ij")
    sample_y = np.clip(yy - dy_field, 0, h - 1)
    sample_x = np.clip(xx - dx_field, 0, w - 1)
    out = np.zeros_like(arr)
    for ch in range(c):
        out[..., ch] = ndimage.map_coordinates(arr[..., ch], [sample_y, sample_x], order=1, mode="nearest")
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")


def gaussian_2d(xx, yy, cx, cy, sx, sy):
    return np.exp(-0.5 * (((xx - cx) / sx) ** 2 + ((yy - cy) / sy) ** 2))


# =========================================================================
# PHOTOREALISTIC EXPRESSION SYNTHESIZERS (from aligned 1024x1024 base RGBA)
# =========================================================================

def synth_cat_3_shameless(base_cat: Image.Image) -> Image.Image:
    """
    Synthesizes #3 뻔뻔 (half-closed heavy eyelids + sly asymmetric smirk)
    from aligned base_cat where eyes are at (372, 430) & (652, 430).
    """
    h, w = 1024, 1024
    yy, xx = np.meshgrid(np.arange(h, dtype=np.float32), np.arange(w, dtype=np.float32), indexing="ij")
    dx = np.zeros((h, w), dtype=np.float32)
    dy = np.zeros((h, w), dtype=np.float32)

    # 1) Pull upper eyelid fur/skin down over the top half of each eye (ey = 430)
    for ex, ey in [(372.0, 430.0), (652.0, 430.0)]:
        lid_mask = gaussian_2d(xx, yy, ex, ey - 18.0, 46.0, 24.0)
        dy += lid_mask * 30.0

    # 2) Pull right corner of mouth (around x=575, y=545) up and right into a sly cat smirk
    smirk_mask = gaussian_2d(xx, yy, 575.0, 540.0, 62.0, 42.0)
    dy -= smirk_mask * 26.0
    dx += smirk_mask * 14.0

    warped = apply_displacement_warp(base_cat, dx, dy)
    arr = np.asarray(warped, dtype=np.float32)

    # Add subtle natural eyelid crease line at y = 420 across each eye
    for ex, ey in [(372.0, 430.0), (652.0, 430.0)]:
        crease = gaussian_2d(xx, yy, ex, ey - 8.0, 38.0, 3.2)
        arr[..., :3] *= (1.0 - 0.55 * crease[..., None])

    # Deepen smirk corner shadow line slightly
    smirk_crease = gaussian_2d(xx, yy - (538.0 - 0.28 * (xx - 512.0)), 565.0, 524.0, 42.0, 3.5)
    arr[..., :3] *= (1.0 - 0.35 * smirk_crease[..., None])

    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")


def synth_4_hold(base_rgba: Image.Image, hamster_4_rgba: Image.Image, char_id: str) -> Image.Image:
    """
    Synthesizes #4 웃참 (giant puffed-up cheeks, tightly clamped lips/beak, watery eyes + teardrop)
    while keeping eye centers strictly at (372, 430) & (652, 430).
    """
    h, w = 1024, 1024
    yy, xx = np.meshgrid(np.arange(h, dtype=np.float32), np.arange(w, dtype=np.float32), indexing="ij")
    dx = np.zeros((h, w), dtype=np.float32)
    dy = np.zeros((h, w), dtype=np.float32)

    # Protect eye centers so (372, 430) and (652, 430) do not move
    eye_protect = 1.0 - np.clip(
        gaussian_2d(xx, yy, 372.0, 430.0, 52.0, 45.0) + gaussian_2d(xx, yy, 652.0, 430.0, 52.0, 45.0),
        0.0,
        1.0,
    )

    # 1) Giant outward cheek puff on left (cx=285, cy=545) and right (cx=739, cy=545)
    for sign, cx, cy in [(-1.0, 275.0, 545.0), (1.0, 749.0, 545.0)]:
        puff = gaussian_2d(xx, yy, cx, cy, 125.0, 110.0) * eye_protect
        dx += sign * puff * 44.0
        dy += puff * 12.0

    # 2) Clamp mouth/beak tightly shut (upward pinch on lower lip/chin)
    mouth_y = 485.0 if char_id == "tit" else 545.0
    clamp = gaussian_2d(xx, yy, 512.0, mouth_y + 25.0, 75.0, 32.0) * eye_protect
    dy -= clamp * 18.0

    warped = apply_displacement_warp(base_rgba, dx, dy)
    arr = np.asarray(warped, dtype=np.float32)

    # 3) Boost rosy pink blush on puffed cheeks
    blush_l = gaussian_2d(xx, yy, 275.0, 525.0, 78.0, 55.0)
    blush_r = gaussian_2d(xx, yy, 749.0, 525.0, 78.0, 55.0)
    blush = (blush_l + blush_r) * (arr[..., 3] / 255.0)
    arr[..., 0] = np.clip(arr[..., 0] + blush * 18.0, 0, 255)
    arr[..., 1] = np.clip(arr[..., 1] - blush * 16.0, 0, 255)
    arr[..., 2] = np.clip(arr[..., 2] - blush * 14.0, 0, 255)

    # 4) Clone the photorealistic watery eye gloss & brimming crystal teardrop from hamster_4_rgba
    #    around the right eye outer-bottom corner (x in 620..735, y in 425..505)
    h4_np = np.asarray(hamster_4_rgba, dtype=np.float32)
    tear_mask = gaussian_2d(xx, yy, 676.0, 468.0, 26.0, 18.0)
    # Also add a tiny glossy tear droplet on the left eye bottom corner
    tear_mask_l = gaussian_2d(xx, yy, 348.0, 466.0, 20.0, 14.0)
    arr[..., :3] = arr[..., :3] * (1.0 - 0.78 * tear_mask[..., None]) + h4_np[..., :3] * (0.78 * tear_mask[..., None])

    # Add bright specular tear rim highlight on both eyes
    rim_r = gaussian_2d(xx, yy, 672.0, 462.0, 12.0, 5.0) + gaussian_2d(xx, yy, 688.0, 476.0, 6.0, 6.0)
    rim_l = gaussian_2d(xx, yy, 352.0, 462.0, 11.0, 4.5)
    rim = np.clip(rim_r + rim_l, 0.0, 1.0)
    arr[..., :3] = arr[..., :3] * (1.0 - 0.85 * rim[..., None]) + 252.0 * (0.85 * rim[..., None])

    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")


def synth_tit_5_burst(base_tit: Image.Image, eng_tit: Image.Image) -> Image.Image:
    """
    Synthesizes #5 터짐 for Tit:
      - Tightly squeezed '> <' shut eyes using real shifted forehead feather texture
      - Wide open chirping/straining beak + raised jolting brown side wings!
    """
    h, w = 1024, 1024
    yy, xx = np.meshgrid(np.arange(h, dtype=np.float32), np.arange(w, dtype=np.float32), indexing="ij")
    dx = np.zeros((h, w), dtype=np.float32)
    dy = np.zeros((h, w), dtype=np.float32)

    # 1) Jolt brown side wings upward & outward and puff body slightly
    wing_l = gaussian_2d(xx, yy, 185.0, 560.0, 95.0, 130.0)
    wing_r = gaussian_2d(xx, yy, 839.0, 560.0, 95.0, 130.0)
    dy -= (wing_l + wing_r) * 68.0
    dx -= wing_l * 28.0
    dx += wing_r * 28.0

    # Pull upper and lower beak apart vertically around (512, 470)
    beak_up = gaussian_2d(xx, yy, 512.0, 452.0, 34.0, 18.0)
    beak_dn = gaussian_2d(xx, yy, 512.0, 492.0, 34.0, 20.0)
    dy -= beak_up * 16.0
    dy += beak_dn * 22.0

    warped = apply_displacement_warp(base_tit, dx, dy)
    arr = np.asarray(warped, dtype=np.float32)

    # 2) Cover both open eyes seamlessly using real textured feathers shifted down by 88px from high forehead
    shifted_feathers = np.roll(arr[..., :3], 88, axis=0)
    for ex, ey in [(372.0, 430.0), (652.0, 430.0)]:
        eye_cov = np.clip(gaussian_2d(xx, yy, ex, ey, 36.0, 34.0) * 1.55, 0.0, 1.0)
        arr[..., :3] = arr[..., :3] * (1.0 - eye_cov[..., None]) + shifted_feathers * eye_cov[..., None]

    # 3) Render realistic open straining beak mouth cavity at (512, 474)
    # Dark oral interior + warm pink tongue inside the parted beak
    cavity_mask = np.clip(gaussian_2d(xx, yy, 512.0, 476.0, 20.0, 17.0) * 1.6, 0.0, 1.0)
    tongue_mask = np.clip(gaussian_2d(xx, yy, 512.0, 483.0, 13.0, 9.0) * 1.4, 0.0, 1.0) * cavity_mask
    beak_rim = np.clip(gaussian_2d(xx, yy, 512.0, 475.0, 26.0, 22.0) * 1.4, 0.0, 1.0) - cavity_mask
    beak_rim = np.clip(beak_rim, 0.0, 1.0)

    arr[..., :3] = arr[..., :3] * (1.0 - beak_rim[..., None]) + np.array([32.0, 30.0, 33.0])[None, None, :] * beak_rim[..., None]
    arr[..., :3] = arr[..., :3] * (1.0 - cavity_mask[..., None]) + np.array([48.0, 22.0, 26.0])[None, None, :] * cavity_mask[..., None]
    arr[..., :3] = arr[..., :3] * (1.0 - tongue_mask[..., None]) + np.array([185.0, 92.0, 98.0])[None, None, :] * tongue_mask[..., None]

    # Boost rosy cheeks
    blush = (gaussian_2d(xx, yy, 295.0, 495.0, 68.0, 48.0) + gaussian_2d(xx, yy, 729.0, 495.0, 68.0, 48.0))
    arr[..., 0] = np.clip(arr[..., 0] + blush * 24.0, 0, 255)
    arr[..., 1] = np.clip(arr[..., 1] - blush * 16.0, 0, 255)
    arr[..., 2] = np.clip(arr[..., 2] - blush * 14.0, 0, 255)

    # 4) Draw natural feathered '> <' squeezed eye creases with soft shadow + lower-lid puff highlight
    mask_dark = Image.new("L", (1024, 1024), 0)
    mdraw = ImageDraw.Draw(mask_dark)
    mdraw.line([(330, 412), (402, 430), (330, 448)], fill=235, width=10, joint="curve")
    mdraw.line([(694, 412), (622, 430), (694, 448)], fill=235, width=10, joint="curve")
    mask_dark = mask_dark.filter(ImageFilter.GaussianBlur(radius=3.8))
    m_np = np.asarray(mask_dark, dtype=np.float32) / 255.0
    arr[..., :3] *= (1.0 - 0.62 * m_np[..., None])

    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")


def synth_cat_5_burst(base_cat: Image.Image, hamster_5_rgba: Image.Image) -> Image.Image:
    """
    Synthesizes #5 터짐 for Cat:
      - Tightly squeezed '> <' shut eyes using real shifted forehead fur texture (preserving orange/white patch!)
      - Wide-open relieved/explosive yowling mouth + raised fluffy white paws
    """
    h, w = 1024, 1024
    yy, xx = np.meshgrid(np.arange(h, dtype=np.float32), np.arange(w, dtype=np.float32), indexing="ij")
    arr = np.asarray(base_cat, dtype=np.float32).copy()

    # 1) Cover both open eyes with real textured fur shifted down by 92px from high forehead
    #    This automatically preserves the ginger-orange fur texture on the left eye and cream-white fur on the right eye!
    shifted_fur = np.roll(arr[..., :3], 92, axis=0)
    for ex, ey in [(372.0, 430.0), (652.0, 430.0)]:
        cov = np.clip(gaussian_2d(xx, yy, ex, ey, 46.0, 40.0) * 1.55, 0.0, 1.0)
        arr[..., :3] = arr[..., :3] * (1.0 - cov[..., None]) + shifted_fur * cov[..., None]

    # 2) Blend the photorealistic wide-open yowling mouth & raised paws from hamster_5_rgba
    h5_np = np.asarray(hamster_5_rgba, dtype=np.float32)
    # Shift h5 up by 38px so the open mouth sits naturally right under the cat's pink nose (y=582)
    h5_shifted = np.roll(h5_np, -38, axis=0)
    mouth_mask = np.clip(gaussian_2d(xx, yy, 512.0, 595.0, 74.0, 64.0) * 1.35, 0.0, 1.0)
    arr[..., :3] = arr[..., :3] * (1.0 - mouth_mask[..., None]) + h5_shifted[..., :3] * mouth_mask[..., None]

    # Blend raised little paws on lower chest (x=320, y=685 and x=704, y=685), whitened to match cat fur
    paws_mask = np.clip(
        (gaussian_2d(xx, yy, 325.0, 675.0, 65.0, 55.0) + gaussian_2d(xx, yy, 700.0, 675.0, 65.0, 55.0)) * 1.15,
        0.0,
        1.0,
    )
    cat_paws_rgb = h5_shifted[..., :3] * 0.78 + np.array([246.0, 243.0, 240.0])[None, None, :] * 0.22
    arr[..., :3] = arr[..., :3] * (1.0 - paws_mask[..., None]) + cat_paws_rgb * paws_mask[..., None]

    # Boost rosy pink cheeks
    blush = (gaussian_2d(xx, yy, 275.0, 515.0, 70.0, 50.0) + gaussian_2d(xx, yy, 749.0, 515.0, 70.0, 50.0))
    arr[..., 0] = np.clip(arr[..., 0] + blush * 24.0, 0, 255)
    arr[..., 1] = np.clip(arr[..., 1] - blush * 16.0, 0, 255)
    arr[..., 2] = np.clip(arr[..., 2] - blush * 14.0, 0, 255)

    # 3) Draw natural fur-creased '> <' squeezed eyes (dark Multiplicative fur crease, no flat halo!)
    mask_dark = Image.new("L", (1024, 1024), 0)
    mdraw = ImageDraw.Draw(mask_dark)
    mdraw.line([(318, 410), (412, 432), (322, 454)], fill=240, width=11, joint="curve")
    mdraw.line([(706, 410), (612, 432), (702, 454)], fill=240, width=11, joint="curve")
    mask_dark = mask_dark.filter(ImageFilter.GaussianBlur(radius=4.0))
    m_np = np.asarray(mask_dark, dtype=np.float32) / 255.0
    arr[..., :3] *= (1.0 - 0.65 * m_np[..., None])

    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")


def synth_6_whistle(base_rgba: Image.Image, hamster_6_rgba: Image.Image, char_id: str) -> Image.Image:
    """
    Synthesizes #6 모른 척 (natural glossy dark eyes, NO creepy white sclera, tiny whistling 'o' mouth,
    and a cute innocent wing-tip or fluffy paw on the cheek) with eyes locked at (372,430) & (652,430).
    """
    h, w = 1024, 1024
    yy, xx = np.meshgrid(np.arange(h, dtype=np.float32), np.arange(w, dtype=np.float32), indexing="ij")
    arr = np.asarray(base_rgba, dtype=np.float32).copy()
    h6_np = np.asarray(hamster_6_rgba, dtype=np.float32)

    if char_id == "cat":
        # 1) Blend cute whistling 'o' mouth under cat's nose (x=502, y=565)
        mouth_mask = np.clip(gaussian_2d(xx, yy, 502.0, 565.0, 38.0, 28.0) * 1.25, 0.0, 1.0)
        shifted_h6 = np.roll(h6_np, -165, axis=0)
        arr[..., :3] = arr[..., :3] * (1.0 - mouth_mask[..., None]) + shifted_h6[..., :3] * mouth_mask[..., None]

        # 2) Add cute innocent paw on left-lower cheek (shifted up by 110px and softened into fluffy white cat paw)
        paw_shifted = np.roll(h6_np, -110, axis=0)
        paw_mask = np.clip(gaussian_2d(xx, yy, 315.0, 645.0, 58.0, 85.0) * 1.2, 0.0, 1.0)
        cat_paw_rgb = paw_shifted[..., :3] * 0.72 + np.array([248.0, 244.0, 242.0])[None, None, :] * 0.28
        arr[..., :3] = arr[..., :3] * (1.0 - paw_mask[..., None]) + cat_paw_rgb * paw_mask[..., None]
    else:
        # Tit (#6 모른 척): bring left wing-tip up toward the left rosy cheek via smooth 2D displacement warp
        # + soft elliptical feather patch with ZERO rectangular crop border!
        dx = np.zeros((h, w), dtype=np.float32)
        dy = np.zeros((h, w), dtype=np.float32)
        eye_protect = 1.0 - np.clip(gaussian_2d(xx, yy, 372.0, 430.0, 55.0, 50.0), 0.0, 1.0)
        wing_lift = gaussian_2d(xx, yy, 245.0, 555.0, 85.0, 95.0) * eye_protect
        dx -= wing_lift * 65.0
        dy += wing_lift * 75.0
        warped_tit = apply_displacement_warp(base_rgba, dx, dy)
        arr = np.asarray(warped_tit, dtype=np.float32)

        # Also blend a soft elliptical brown-and-white wing tip resting on the cheek at (310, 525)
        wing_src = np.asarray(base_rgba.crop((745, 420, 895, 620)), dtype=np.float32)
        sh, sw, _ = wing_src.shape
        syy, sxx = np.meshgrid(np.arange(sh, dtype=np.float32), np.arange(sw, dtype=np.float32), indexing="ij")
        # Multiply alpha by smooth elliptical Gaussian BEFORE rotating so borders are 0% alpha!
        ell_mask = gaussian_2d(sxx, syy, sw * 0.5, sh * 0.5, sw * 0.28, sh * 0.28)
        wing_src[..., 3] = wing_src[..., 3] * ell_mask
        wing_pil = Image.fromarray(np.clip(wing_src, 0, 255).astype(np.uint8), "RGBA")
        wing_pil = wing_pil.transpose(Image.Transpose.FLIP_LEFT_RIGHT).rotate(-32, resample=Image.Resampling.BICUBIC, expand=True)

        wing_layer = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
        wing_layer.paste(wing_pil, (215, 445))
        w_np = np.asarray(wing_layer, dtype=np.float32)
        cheek_gate = np.clip((yy - 468.0) / 22.0, 0.0, 1.0)
        w_alpha = (w_np[..., 3] / 255.0) * cheek_gate * 0.92
        arr[..., :3] = arr[..., :3] * (1.0 - w_alpha[..., None]) + w_np[..., :3] * w_alpha[..., None]

        # Tiny round whistling 'o' dark tip right at bottom of beak (512, 480)
        whistle_dot = gaussian_2d(xx, yy, 512.0, 480.0, 8.5, 10.5)
        arr[..., :3] *= (1.0 - 0.78 * whistle_dot[..., None])

    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")


def synth_7_thumbs_up(base_rgba: Image.Image, hamster_7_rgba: Image.Image, char_id: str) -> Image.Image:
    """
    Synthesizes #7 엄지척 (deadpan proud front-facing portrait + double thumbs-up in front)
    with eyes locked at (372, 430) & (652, 430).
    """
    h, w = 1024, 1024
    yy, xx = np.meshgrid(np.arange(h, dtype=np.float32), np.arange(w, dtype=np.float32), indexing="ij")
    arr = np.asarray(base_rgba, dtype=np.float32).copy()
    h7_np = np.asarray(hamster_7_rgba, dtype=np.float32)

    # Smoothly isolate the two thumbs-up paws without the bright outer studio edge halo
    h7_alpha_eroded = ndimage.grey_erosion(h7_np[..., 3], size=(5, 5))
    h7_alpha_smooth = ndimage.gaussian_filter(h7_alpha_eroded.astype(np.float32) / 255.0, sigma=2.0)

    thumb_l_mask = np.clip(gaussian_2d(xx, yy, 148.0, 685.0, 68.0, 118.0) * 1.5, 0.0, 1.0) * h7_alpha_smooth
    thumb_r_mask = np.clip(gaussian_2d(xx, yy, 876.0, 685.0, 68.0, 118.0) * 1.5, 0.0, 1.0) * h7_alpha_smooth
    thumbs_mask = np.clip(thumb_l_mask + thumb_r_mask, 0.0, 1.0)

    if char_id == "tit":
        # Match the bird's soft fluffy white-and-warm-taupe plumage so the double thumbs-up look like cute bird paws/wings!
        paw_rgb = h7_np[..., :3] * 0.82 + np.array([245.0, 240.0, 236.0])[None, None, :] * 0.18
        arr[..., :3] = arr[..., :3] * (1.0 - thumbs_mask[..., None]) + paw_rgb * thumbs_mask[..., None]
        arr[..., 3] = np.maximum(arr[..., 3], thumbs_mask * 255.0)
    else:
        # Cat (#7 엄지척): match the cat's soft warm-white chest fur luminance so there is zero seam
        paw_rgb = h7_np[..., :3] * 0.80 + np.array([236.0, 233.0, 229.0])[None, None, :] * 0.20
        arr[..., :3] = arr[..., :3] * (1.0 - thumbs_mask[..., None]) + paw_rgb * thumbs_mask[..., None]
        arr[..., 3] = np.maximum(arr[..., 3], thumbs_mask * 255.0)

    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")


def main():
    characters = [
        ("hamster", "방구 햄찌 (실사)"),
        ("tit", "솜뭉치 오목눈이 (실사)"),
        ("cat", "시크 뚱냥이 (실사)"),
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

    # 1) Process all 7 Hamster images first (all 7 raw files exist)
    raw_h1 = Image.open(find_raw_file("raw_hamster_1_blank")).convert("RGB").resize((1024, 1024), Image.Resampling.LANCZOS)
    h_ref_l, h_ref_r = detect_eye_centers(np.asarray(raw_h1), "hamster")
    for exp_id, exp_slug, _ in expressions:
        raw_path = find_raw_file(f"raw_hamster_{exp_slug}")
        rgb_img = Image.open(raw_path).convert("RGB").resize((1024, 1024), Image.Resampling.LANCZOS)
        rgba_img = extract_foreground_rgba(rgb_img)
        if exp_id in (1, 3, 4, 6, 7):
            cur_l, cur_r = detect_eye_centers(np.asarray(rgb_img), "hamster")
            rgba_img = align_image_by_eyes(rgba_img, cur_l, cur_r)
        elif exp_id == 5:
            rgba_img = align_image_by_eyes(rgba_img, h_ref_l, h_ref_r)
        out_path = os.path.join(OUT_REAL_DIR, f"hamster_{exp_slug}.png")
        rgba_img.save(out_path, "PNG")
        generated[("hamster", exp_id)] = rgba_img
        print(f"[OK] Saved {out_path}")

    # 2) Process Tit (#1, #2, #3 from AI raw files; #4, #5, #6, #7 synthesized from aligned #1 & #2)
    raw_t1 = Image.open(find_raw_file("raw_tit_1_blank")).convert("RGB").resize((1024, 1024), Image.Resampling.LANCZOS)
    t_ref_l, t_ref_r = detect_eye_centers(np.asarray(raw_t1), "tit")
    print(f"[INFO] Tit Master #1 eyes: left={t_ref_l}, right={t_ref_r}")

    for exp_id, exp_slug, _ in expressions[:3]:
        raw_path = find_raw_file(f"raw_tit_{exp_slug}")
        rgb_img = Image.open(raw_path).convert("RGB").resize((1024, 1024), Image.Resampling.LANCZOS)
        rgba_img = extract_foreground_rgba(rgb_img, "tit")
        if exp_id in (1, 3):
            cur_l, cur_r = detect_eye_centers(np.asarray(rgb_img), "tit")
            if abs(cur_l[0] - t_ref_l[0]) > 35 or abs(cur_r[0] - t_ref_r[0]) > 35:
                cur_l, cur_r = t_ref_l, t_ref_r
            rgba_img = align_image_by_eyes(rgba_img, cur_l, cur_r)
        generated[("tit", exp_id)] = rgba_img

    generated[("tit", 4)] = synth_4_hold(generated[("tit", 1)], generated[("hamster", 4)], "tit")
    generated[("tit", 5)] = synth_tit_5_burst(generated[("tit", 1)], generated[("tit", 2)])
    generated[("tit", 6)] = synth_6_whistle(generated[("tit", 1)], generated[("hamster", 6)], "tit")
    generated[("tit", 7)] = synth_7_thumbs_up(generated[("tit", 1)], generated[("hamster", 7)], "tit")

    for exp_id, exp_slug, _ in expressions:
        out_path = os.path.join(OUT_REAL_DIR, f"tit_{exp_slug}.png")
        generated[("tit", exp_id)].save(out_path, "PNG")
        print(f"[OK] Saved {out_path}")

    # 3) Process Cat (#1, #2 from AI raw files; #3, #4, #5, #6, #7 synthesized from aligned #1)
    raw_c1 = Image.open(find_raw_file("raw_cat_1_blank")).convert("RGB").resize((1024, 1024), Image.Resampling.LANCZOS)
    c_ref_l, c_ref_r = detect_eye_centers(np.asarray(raw_c1), "cat")
    print(f"[INFO] Cat Master #1 eyes: left={c_ref_l}, right={c_ref_r}")

    for exp_id, exp_slug, _ in expressions[:2]:
        raw_path = find_raw_file(f"raw_cat_{exp_slug}")
        rgb_img = Image.open(raw_path).convert("RGB").resize((1024, 1024), Image.Resampling.LANCZOS)
        rgba_img = extract_foreground_rgba(rgb_img, "cat")
        if exp_id == 1:
            rgba_img = align_image_by_eyes(rgba_img, c_ref_l, c_ref_r)
        generated[("cat", exp_id)] = rgba_img

    generated[("cat", 3)] = synth_cat_3_shameless(generated[("cat", 1)])
    generated[("cat", 4)] = synth_4_hold(generated[("cat", 1)], generated[("hamster", 4)], "cat")
    generated[("cat", 5)] = synth_cat_5_burst(generated[("cat", 1)], generated[("hamster", 5)])
    generated[("cat", 6)] = synth_6_whistle(generated[("cat", 1)], generated[("hamster", 6)], "cat")
    generated[("cat", 7)] = synth_7_thumbs_up(generated[("cat", 1)], generated[("hamster", 7)], "cat")

    for exp_id, exp_slug, _ in expressions:
        out_path = os.path.join(OUT_REAL_DIR, f"cat_{exp_slug}.png")
        generated[("cat", exp_id)].save(out_path, "PNG")
        print(f"[OK] Saved {out_path}")

    # --- Build 3x7 Full Photorealistic Contact Sheet ---
    try:
        font_title = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 22)
        font_sub = ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", 17)
    except Exception:
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()

    thumb_w = 260
    pad = 20
    header_h = 85
    row_label_w = 210
    sheet_w = row_label_w + 7 * (thumb_w + pad) + pad
    sheet_h = header_h + 3 * (thumb_w + pad + 36) + pad

    sheet = Image.new("RGBA", (sheet_w, sheet_h), (250, 246, 238, 255))
    sdraw = ImageDraw.Draw(sheet)

    for col_i, (exp_id, exp_slug, exp_kr) in enumerate(expressions):
        cx = row_label_w + pad + col_i * (thumb_w + pad) + thumb_w // 2
        sdraw.text((cx, 25), exp_kr, fill=(40, 35, 30, 255), font=font_title, anchor="mm")
        if exp_id in (3, 4, 6):
            sdraw.text((cx, 54), "★ 눈 좌표 고정 (372,430 / 652,430)", fill=(210, 65, 55, 255), font=font_sub, anchor="mm")

    for row_i, (char_id, char_kr) in enumerate(characters):
        ry = header_h + row_i * (thumb_w + pad + 36)
        sdraw.text((row_label_w // 2, ry + thumb_w // 2), char_kr, fill=(40, 35, 30, 255), font=font_title, anchor="mm")
        for col_i, (exp_id, exp_slug, _) in enumerate(expressions):
            rx = row_label_w + pad + col_i * (thumb_w + pad)
            card = Image.new("RGBA", (thumb_w, thumb_w), (255, 255, 255, 255))
            cdraw = ImageDraw.Draw(card)
            cs = 20
            for cy_i in range(0, thumb_w, cs):
                for cx_i in range(0, thumb_w, cs):
                    if ((cx_i // cs) + (cy_i // cs)) % 2 == 1:
                        cdraw.rectangle([cx_i, cy_i, cx_i + cs, cy_i + cs], fill=(238, 234, 226, 255))
            thumb = generated[(char_id, exp_id)].resize((thumb_w, thumb_w), Image.Resampling.LANCZOS)
            card = Image.alpha_composite(card, thumb)
            cdraw = ImageDraw.Draw(card)
            border_col = (225, 80, 65, 255) if exp_id in (3, 4, 6) else (210, 200, 185, 255)
            cdraw.rectangle([0, 0, thumb_w - 1, thumb_w - 1], outline=border_col, width=3)
            sheet.paste(card, (rx, ry))
            sdraw.text(
                (rx + thumb_w // 2, ry + thumb_w + 16),
                f"{char_id}_{exp_slug}.png",
                fill=(90, 85, 80, 255),
                font=font_sub,
                anchor="mm",
            )

    all_sheet_path = os.path.join(ARTIFACT_DIR, "real_all_characters_sheet.png")
    sheet.save(all_sheet_path, "PNG")
    print(f"[OK] Saved {all_sheet_path}")

    # --- Build 3x4 Sunglasses & Money-Gun Alignment Proof Sheet for all 3 Real Animals ---
    shades = Image.open(os.path.join(EXP_DIR, "pixel_sunglasses.png")).convert("RGBA")
    money_rain = Image.open(os.path.join(EXP_DIR, "money_rain.png")).convert("RGBA")

    align_cols = [
        (3, False, "#3 뻔뻔 + 도트 선글라스"),
        (4, False, "#4 웃참 + 도트 선글라스"),
        (6, False, "#6 모른 척 + 도트 선글라스"),
        (3, True, "★ #3 뻔뻔 + 선글라스 + 머니건"),
    ]
    align_w = row_label_w + 4 * (thumb_w + pad) + pad
    align_h = header_h + 3 * (thumb_w + pad) + pad
    align_sheet = Image.new("RGBA", (align_w, align_h), (246, 242, 234, 255))
    adraw = ImageDraw.Draw(align_sheet)

    for col_i, (_, _, title_txt) in enumerate(align_cols):
        cx = row_label_w + pad + col_i * (thumb_w + pad) + thumb_w // 2
        adraw.text((cx, 32), title_txt, fill=(35, 30, 25, 255), font=font_title, anchor="mm")
        adraw.text((cx, 60), "동일 좌표 (0,0) 오버레이", fill=(200, 60, 50, 255), font=font_sub, anchor="mm")

    for row_i, (char_id, char_kr) in enumerate(characters):
        ry = header_h + row_i * (thumb_w + pad)
        adraw.text((row_label_w // 2, ry + thumb_w // 2), char_kr, fill=(35, 30, 25, 255), font=font_title, anchor="mm")
        for col_i, (exp_id, with_money, _) in enumerate(align_cols):
            rx = row_label_w + pad + col_i * (thumb_w + pad)
            comp = Image.alpha_composite(generated[(char_id, exp_id)], shades)
            if with_money:
                comp = Image.alpha_composite(comp, money_rain)
            thumb = comp.resize((thumb_w, thumb_w), Image.Resampling.LANCZOS)
            card = Image.new("RGBA", (thumb_w, thumb_w), (255, 253, 248, 255))
            card = Image.alpha_composite(card, thumb)
            cdraw = ImageDraw.Draw(card)
            cdraw.rectangle([0, 0, thumb_w - 1, thumb_w - 1], outline=(50, 45, 40, 255), width=3)
            align_sheet.paste(card, (rx, ry))

    align_path = os.path.join(ARTIFACT_DIR, "real_all_sunglasses_proof.png")
    align_sheet.save(align_path, "PNG")
    print(f"[OK] Saved {align_path}")


if __name__ == "__main__":
    main()
