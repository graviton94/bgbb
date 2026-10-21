# -*- coding: utf-8 -*-
r"""
Generates TWO complete 21-image photorealistic expression packs (Hamster, Tit, Cat x 7 expressions):
  1. `c:\bgbb\assets\expressions_real\` (Original High-Res + Front-Camera Close-Up Convex Bulge)
  2. `c:\bgbb\assets\expressions_real_bgrade\` (Pre-baked Weathered B-Grade Meme Filter:
     Low-res downsample -> JPEG blocky/mosquito compression -> Upscale + Harsh Phone-Cam Contrast)

Key fixes & guarantees:
  - ZERO cross-species Frankenstein pasting (no hamster mouths or rodent fingers on Tit or Cat!).
  - ZERO erased eyes with drawn cartoon '> <' lines.
  - #5 터짐 (`5_burst`): Real straining squint + authentic B-grade meme '몸 들썩' vertical jolt & zoom motion blur.
  - #7 엄지척 (`7_thumbs_up`): Option A — Tit raises its own brown side wings proudly; Cat raises two round,
    toe-less fluffy white '솜방망이' cat paws textured directly from its own chest fur.
  - Eye centers for #1, #3, #4, #6, #7 are strictly locked at (372, 430) & (652, 430) AFTER the front-camera
    convex bulge, so `pixel_sunglasses.png` and `money_rain.png` overlay at (0, 0) with 0px error.
"""

import glob
import io
import math
import os
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont
from scipy import ndimage

ARTIFACT_DIR = r"C:\Users\ruahn49\.gemini\antigravity\brain\b2ce85ba-1f7b-478f-8be4-052d7e2dab69"
OUT_REAL_DIR = r"c:\bgbb\assets\expressions_real"
OUT_BGRADE_DIR = r"c:\bgbb\assets\expressions_real_bgrade"
EXP_DIR = r"c:\bgbb\assets\expressions"
os.makedirs(OUT_REAL_DIR, exist_ok=True)
os.makedirs(OUT_BGRADE_DIR, exist_ok=True)

TARGET_LEFT_EYE = (372.0, 430.0)
TARGET_RIGHT_EYE = (652.0, 430.0)


def find_raw_file(prefix):
    pattern = os.path.join(ARTIFACT_DIR, f"{prefix}_*.jpg")
    matches = sorted(glob.glob(pattern))
    if not matches:
        return None
    return matches[-1]


def gaussian_2d(xx, yy, cx, cy, sx, sy):
    return np.exp(-0.5 * (((xx - cx) / sx) ** 2 + ((yy - cy) / sy) ** 2))


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
    """Removes the contiguous studio white/off-white background from the outer border while protecting inner fur."""
    rgb_np = np.asarray(rgb_img, dtype=np.float32)
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

    h, w, _ = rgb_np.shape
    yy, xx = np.meshgrid(np.arange(h, dtype=np.float32), np.arange(w, dtype=np.float32), indexing="ij")
    if char_id == "tit":
        inner_body = (((xx - 512.0) / 345.0) ** 2 + ((yy - 560.0) / 385.0) ** 2) < 1.0
    elif char_id == "cat":
        inner_body = (((xx - 512.0) / 355.0) ** 2 + ((yy - 585.0) / 380.0) ** 2) < 1.0
    else:
        inner_body = (((xx - 512.0) / 315.0) ** 2 + ((yy - 560.0) / 345.0) ** 2) < 1.0

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


def apply_front_camera_bulge(rgba_img: Image.Image, char_id: str = "hamster", lock_eyes: bool = True, strength: float = 0.24) -> Image.Image:
    """
    Applies a funny 28mm front-facing phone-camera close-up convex barrel distortion
    centered on the animal's nose/muzzle (making the center face/nose bulge toward the lens).
    When `lock_eyes=True`, smoothly pins the displacement at the eye coordinates (372,430) & (652,430)
    to 0.0 so the pixel sunglasses and money-gun overlays remain 100% locked!
    """
    h, w = 1024, 1024
    yy, xx = np.meshgrid(np.arange(h, dtype=np.float32), np.arange(w, dtype=np.float32), indexing="ij")

    # Center of front-cam lens bulge (right on the nose/snout!)
    cx = 512.0
    cy = 472.0 if char_id == "tit" else (525.0 if char_id == "cat" else 545.0)
    radius = 390.0

    rx = (xx - cx) / radius
    ry = (yy - cy) / radius
    r2 = rx * rx + ry * ry

    # Smooth spherical/barrel magnification near center (r < 1), tapering to 0 at edges
    bulge_envelope = np.exp(-1.15 * r2)
    scale_factor = strength * bulge_envelope

    dx = (xx - cx) * scale_factor
    dy = (yy - cy) * scale_factor

    if lock_eyes:
        # Nullify displacement right at the two eye centers (372,430) and (652,430) so sunglasses lock at 0px
        eye_pin = 1.0 - np.clip(
            gaussian_2d(xx, yy, 372.0, 430.0, 44.0, 38.0) + gaussian_2d(xx, yy, 652.0, 430.0, 44.0, 38.0),
            0.0,
            1.0,
        )
        dx *= eye_pin
        dy *= eye_pin

    return apply_displacement_warp(rgba_img, dx, dy)


def apply_bgrade_weathered_filter(rgba_img: Image.Image) -> Image.Image:
    """
    Applies an authentic B-grade '풍화된 짤방' (weathered re-uploaded internet meme) filter:
      1. Downsamples RGB to 280x280 (simulating low-res phone capture / community re-upload)
      2. Compresses through lossy JPEG (quality=26, 4:2:0 chroma subsampling) for authentic block/mosquito artifacts
      3. Upscales back to 1024x1024 with BILINEAR + mild unsharp crunch & slightly harsh phone-cam contrast
      4. Preserves clean alpha silhouette so it drops directly into the app UI.
    """
    arr = np.asarray(rgba_img, dtype=np.uint8)
    alpha = Image.fromarray(arr[..., 3], "L")

    # Composite onto white before JPEG compression so edges get authentic meme ringing without black halos
    white_bg = Image.new("RGB", (1024, 1024), (255, 255, 255))
    white_bg.paste(rgba_img.convert("RGB"), mask=alpha)

    # 1) Slight phone-camera harsh contrast & warm indoor tint
    rgb_low = white_bg.resize((280, 280), Image.Resampling.BILINEAR)
    rgb_low = ImageEnhance.Contrast(rgb_low).enhance(1.14)
    rgb_low = ImageEnhance.Color(rgb_low).enhance(1.08)

    # 2) Lossy JPEG roundtrip at quality=26 (4:2:0 subsampling)
    buf = io.BytesIO()
    rgb_low.save(buf, format="JPEG", quality=26, subsampling=2)
    buf.seek(0)
    jpeg_crunched = Image.open(buf).convert("RGB")

    # 3) Upscale back to 1024x1024 (mix of bilinear and nearest for that crispy screenshotted meme texture)
    up_bilinear = jpeg_crunched.resize((1024, 1024), Image.Resampling.BILINEAR)
    up_nearest = jpeg_crunched.resize((1024, 1024), Image.Resampling.NEAREST)
    blended_rgb = Image.blend(up_bilinear, up_nearest, alpha=0.22)

    out_rgba = np.dstack([np.asarray(blended_rgb, dtype=np.uint8), np.asarray(alpha, dtype=np.uint8)])
    return Image.fromarray(out_rgba, "RGBA")


# =========================================================================
# NATURAL ANATOMICAL EXPRESSION SYNTHESIZERS (ZERO FRANKENSTEIN PASTING!)
# =========================================================================

def synth_cat_3_shameless(base_cat: Image.Image) -> Image.Image:
    """
    #3 뻔뻔 for Cat: half-closed heavy eyelids + sly asymmetric smirk
    using pure 2D warp on base_cat (eyes locked at (372,430) & (652,430)).
    """
    h, w = 1024, 1024
    yy, xx = np.meshgrid(np.arange(h, dtype=np.float32), np.arange(w, dtype=np.float32), indexing="ij")
    dx = np.zeros((h, w), dtype=np.float32)
    dy = np.zeros((h, w), dtype=np.float32)

    # Pull upper eyelid down over the top half of each eye
    for ex, ey in [(372.0, 430.0), (652.0, 430.0)]:
        lid_mask = gaussian_2d(xx, yy, ex, ey - 18.0, 46.0, 24.0)
        dy += lid_mask * 30.0

    # Pull right corner of mouth up and right into a sly cat smirk
    smirk_mask = gaussian_2d(xx, yy, 575.0, 540.0, 62.0, 42.0)
    dy -= smirk_mask * 26.0
    dx += smirk_mask * 14.0

    warped = apply_displacement_warp(base_cat, dx, dy)
    arr = np.asarray(warped, dtype=np.float32)

    for ex, ey in [(372.0, 430.0), (652.0, 430.0)]:
        crease = gaussian_2d(xx, yy, ex, ey - 8.0, 38.0, 3.2)
        arr[..., :3] *= (1.0 - 0.55 * crease[..., None])

    smirk_crease = gaussian_2d(xx, yy - (538.0 - 0.28 * (xx - 512.0)), 565.0, 524.0, 42.0, 3.5)
    arr[..., :3] *= (1.0 - 0.35 * smirk_crease[..., None])

    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")


def synth_4_hold(base_rgba: Image.Image, hamster_4_rgba: Image.Image, char_id: str) -> Image.Image:
    """
    #4 웃참: Giant puffed-up cheeks, tightly clamped lips/beak, watery eyes + brimming teardrop,
    keeping eye centers strictly at (372, 430) & (652, 430).
    """
    h, w = 1024, 1024
    yy, xx = np.meshgrid(np.arange(h, dtype=np.float32), np.arange(w, dtype=np.float32), indexing="ij")
    dx = np.zeros((h, w), dtype=np.float32)
    dy = np.zeros((h, w), dtype=np.float32)

    eye_protect = 1.0 - np.clip(
        gaussian_2d(xx, yy, 372.0, 430.0, 52.0, 45.0) + gaussian_2d(xx, yy, 652.0, 430.0, 52.0, 45.0),
        0.0,
        1.0,
    )

    # Giant outward cheek puff on left and right
    for sign, cx, cy in [(-1.0, 275.0, 545.0), (1.0, 749.0, 545.0)]:
        puff = gaussian_2d(xx, yy, cx, cy, 125.0, 110.0) * eye_protect
        dx += sign * puff * 46.0
        dy += puff * 14.0

    # Clamp mouth/beak tightly shut
    mouth_y = 485.0 if char_id == "tit" else 545.0
    clamp = gaussian_2d(xx, yy, 512.0, mouth_y + 25.0, 75.0, 32.0) * eye_protect
    dy -= clamp * 18.0

    warped = apply_displacement_warp(base_rgba, dx, dy)
    arr = np.asarray(warped, dtype=np.float32)

    # Boost rosy pink blush on puffed cheeks
    blush_l = gaussian_2d(xx, yy, 275.0, 525.0, 78.0, 55.0)
    blush_r = gaussian_2d(xx, yy, 749.0, 525.0, 78.0, 55.0)
    blush = (blush_l + blush_r) * (arr[..., 3] / 255.0)
    arr[..., 0] = np.clip(arr[..., 0] + blush * 18.0, 0, 255)
    arr[..., 1] = np.clip(arr[..., 1] - blush * 16.0, 0, 255)
    arr[..., 2] = np.clip(arr[..., 2] - blush * 14.0, 0, 255)

    # Watery eye gloss & brimming crystal teardrop at eye corner
    h4_np = np.asarray(hamster_4_rgba, dtype=np.float32)
    tear_mask = gaussian_2d(xx, yy, 676.0, 468.0, 24.0, 16.0)
    arr[..., :3] = arr[..., :3] * (1.0 - 0.72 * tear_mask[..., None]) + h4_np[..., :3] * (0.72 * tear_mask[..., None])

    rim_r = gaussian_2d(xx, yy, 672.0, 462.0, 12.0, 5.0) + gaussian_2d(xx, yy, 688.0, 476.0, 6.0, 6.0)
    rim_l = gaussian_2d(xx, yy, 352.0, 462.0, 11.0, 4.5)
    rim = np.clip(rim_r + rim_l, 0.0, 1.0)
    arr[..., :3] = arr[..., :3] * (1.0 - 0.85 * rim[..., None]) + 252.0 * (0.85 * rim[..., None])

    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")


def apply_jolt_motion_blur(rgba_img: Image.Image, v_shift: int = 18, zoom_pct: float = 0.032) -> Image.Image:
    """
    Creates the classic B-grade animal meme '몸 들썩 / 영혼 가출 흔들림' (vertical jolt + radial zoom vibration)
    using premultiplied alpha so there is ZERO grey outline halo on the transparent background.
    """
    base_np = np.asarray(rgba_img, dtype=np.float32)
    h, w, _ = base_np.shape

    # Premultiply RGB by alpha before blending motion ghosts
    a0 = base_np[..., 3:4] / 255.0
    pre_base = np.dstack([base_np[..., :3] * a0, a0])

    up_ghost = np.roll(pre_base, -v_shift, axis=0)
    dn_ghost = np.roll(pre_base, v_shift, axis=0)

    zw, zh = int(w * (1.0 + zoom_pct)), int(h * (1.0 + zoom_pct))
    zoomed_pil = rgba_img.resize((zw, zh), Image.Resampling.BILINEAR)
    ox, oy = (zw - w) // 2, (zh - h) // 2
    zoom_np = np.asarray(zoomed_pil.crop((ox, oy, ox + w, oy + h)), dtype=np.float32)
    az = zoom_np[..., 3:4] / 255.0
    pre_zoom = np.dstack([zoom_np[..., :3] * az, az])

    pre_out = 0.56 * pre_base + 0.15 * up_ghost + 0.13 * dn_ghost + 0.16 * pre_zoom
    out_a = np.clip(pre_out[..., 3:4], 0.0, 1.0)
    out_rgb = np.where(out_a > 1e-4, pre_out[..., :3] / np.maximum(out_a, 1e-4), 255.0)

    out = np.dstack([np.clip(out_rgb, 0, 255).astype(np.uint8), np.clip(out_a[..., 0] * 255.0, 0, 255).astype(np.uint8)])
    return Image.fromarray(out, "RGBA")


def synth_natural_5_burst(base_rgba: Image.Image, eng_rgba: Image.Image, char_id: str) -> Image.Image:
    """
    #5 터짐 (힘준 얼굴 또는 시원한 얼굴, 몸 들썩) for Tit and Cat:
      - ZERO pasted hamster mouths! ZERO erased eyes or cartoon '> <' lines!
      - Uses the animal's OWN face (`base_rgba`), warps its own upper & lower eyelids into a
        tightly squinted straining/relieved face ('힘준 실눈'), warps its own cheeks/shoulders upward,
        opens its OWN mouth/beak naturally by blending ONLY its own open beak/mouth from `eng_rgba`
        (after exact coordinate alignment), and applies the hilarious B-grade '몸 들썩' jolt motion blur!
    """
    h, w = 1024, 1024
    yy, xx = np.meshgrid(np.arange(h, dtype=np.float32), np.arange(w, dtype=np.float32), indexing="ij")
    dx = np.zeros((h, w), dtype=np.float32)
    dy = np.zeros((h, w), dtype=np.float32)

    # 1) Tightly squint the animal's OWN upper and lower eyelids (just like #3, which looks 100% natural,
    #    plus upward lower-cheek/eyelid push for a straining '힘준 얼굴' squint!)
    for sign, (ex, ey) in [(-1.0, (372.0, 430.0)), (1.0, (652.0, 430.0))]:
        upper_lid = gaussian_2d(xx, yy, ex, ey - 18.0, 46.0, 24.0)
        lower_lid = gaussian_2d(xx, yy, ex, ey + 20.0, 46.0, 24.0)
        dy += upper_lid * 28.0 - lower_lid * 20.0
        # Slight inward scrunch toward the nose bridge when straining hard!
        dx -= sign * (upper_lid + lower_lid) * 8.0

    # 2) Scrunch cheeks & shoulders/wings upward ('몸 들썩' tension)
    if char_id == "tit":
        wing_l = gaussian_2d(xx, yy, 195.0, 565.0, 95.0, 125.0)
        wing_r = gaussian_2d(xx, yy, 829.0, 565.0, 95.0, 125.0)
        dy -= (wing_l + wing_r) * 58.0
        dx -= wing_l * 24.0
        dx += wing_r * 24.0
        # Open the bird's own lower beak slightly downward
        beak_drop = gaussian_2d(xx, yy, 512.0, 482.0, 26.0, 18.0)
        dy += beak_drop * 16.0
    else:
        # Cat: scrunch whisker pads upward and drop the cat's OWN lower jaw slightly into an '아악/뿌웅' straining meow
        whisker_l = gaussian_2d(xx, yy, 395.0, 525.0, 55.0, 38.0)
        whisker_r = gaussian_2d(xx, yy, 629.0, 525.0, 55.0, 38.0)
        dy -= (whisker_l + whisker_r) * 16.0
        jaw_drop = gaussian_2d(xx, yy, 512.0, 585.0, 52.0, 38.0)
        dy += jaw_drop * 26.0
        # Lift shoulders slightly
        sh_l = gaussian_2d(xx, yy, 240.0, 720.0, 110.0, 120.0)
        sh_r = gaussian_2d(xx, yy, 784.0, 720.0, 110.0, 120.0)
        dy -= (sh_l + sh_r) * 38.0

    warped = apply_displacement_warp(base_rgba, dx, dy)
    arr = np.asarray(warped, dtype=np.float32)

    # Add natural squinting eyelid crease shadow across each eye (same proven technique as #3)
    for ex, ey in [(372.0, 430.0), (652.0, 430.0)]:
        crease = gaussian_2d(xx, yy, ex, ey - 4.0, 40.0, 4.0)
        arr[..., :3] *= (1.0 - 0.58 * crease[..., None])

    # For Cat, deepen the cat's own parted mouth opening right under the philtrum (x=512, y=566)
    # using a small natural dark-pink feline mouth interior (NO hamster teeth/mouth!)
    if char_id == "cat":
        mouth_open = gaussian_2d(xx, yy, 512.0, 568.0, 22.0, 14.0)
        tongue_glow = gaussian_2d(xx, yy, 512.0, 573.0, 14.0, 8.0) * mouth_open
        arr[..., :3] = arr[..., :3] * (1.0 - 0.82 * mouth_open[..., None]) + np.array([52.0, 24.0, 28.0])[None, None, :] * (0.82 * mouth_open[..., None])
        arr[..., :3] = arr[..., :3] * (1.0 - 0.75 * tongue_glow[..., None]) + np.array([188.0, 96.0, 104.0])[None, None, :] * (0.75 * tongue_glow[..., None])
    else:
        # For Tit, slightly deepen the parted beak slit at (512, 476)
        beak_open = gaussian_2d(xx, yy, 512.0, 474.0, 14.0, 9.0)
        arr[..., :3] = arr[..., :3] * (1.0 - 0.78 * beak_open[..., None]) + np.array([38.0, 22.0, 25.0])[None, None, :] * (0.78 * beak_open[..., None])

    # Boost rosy strained cheeks
    blush_y = 495.0 if char_id == "tit" else 515.0
    blush = gaussian_2d(xx, yy, 285.0, blush_y, 70.0, 48.0) + gaussian_2d(xx, yy, 739.0, blush_y, 70.0, 48.0)
    arr[..., 0] = np.clip(arr[..., 0] + blush * 24.0, 0, 255)
    arr[..., 1] = np.clip(arr[..., 1] - blush * 15.0, 0, 255)
    arr[..., 2] = np.clip(arr[..., 2] - blush * 13.0, 0, 255)

    strained_img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")
    # 3) Apply authentic B-grade '몸 들썩' vertical jolt + radial zoom vibration blur!
    return apply_jolt_motion_blur(strained_img, v_shift=16, zoom_pct=0.028)


def make_fluffy_cat_paw_patch(base_cat: Image.Image, paw_w: int = 230, paw_h: int = 310, with_thumb_nub: bool = True, is_left: bool = True) -> Image.Image:
    """
    Builds a plump, bright snow-white '고양이 솜방망이' (furry cat paw emerging from the bottom of the frame)
    with soft-pink feline jelly pads (분홍 육구) and real cat fur texture (ZERO rodent fingers, ZERO dark grey halo!).
    """
    # Sample bright white fur texture from the cat's cheek/chest and brighten slightly so it pops cleanly
    chest_crop = base_cat.crop((390, 620, 634, 880)).resize((paw_w, paw_h), Image.Resampling.BICUBIC)
    fur_np = np.asarray(chest_crop, dtype=np.float32)[..., :3]
    fur_np = np.clip(fur_np * 0.85 + np.array([252.0, 249.0, 246.0])[None, None, :] * 0.15, 0, 255)

    yy, xx = np.meshgrid(np.arange(paw_h, dtype=np.float32), np.arange(paw_w, dtype=np.float32), indexing="ij")

    cx = paw_w * (0.48 if is_left else 0.52)
    cy = paw_h * 0.42
    rx = paw_w * 0.36
    ry = paw_h * 0.30

    # Continuous column extending down to the bottom of the cat's body (no floating oval!)
    y_clamped = np.maximum(yy, cy)
    dist_main = np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2)
    dist_arm = np.sqrt(((xx - cx) / (rx * 0.92)) ** 2 + ((yy - y_clamped) / (ry * 1.15)) ** 2)
    dist = np.minimum(dist_main, dist_arm)

    if with_thumb_nub:
        # Plump furry thumb-paw nub rising proudly from the top-inner side of the 솜방망이
        tx = cx + (rx * 0.48 if is_left else -rx * 0.48)
        ty = cy - ry * 0.78
        trx = rx * 0.42
        try_ = ry * 0.58
        dist_thumb = np.sqrt(((xx - tx) / trx) ** 2 + ((yy - ty) / try_) ** 2)
        k = 0.22
        h_smooth = np.maximum(k - np.abs(dist - dist_thumb), 0.0) / k
        dist_union = np.minimum(dist, dist_thumb) - h_smooth * h_smooth * k * 0.25
    else:
        dist_union = dist

    alpha = np.clip((1.04 - dist_union) / 0.18, 0.0, 1.0)
    # Soft fade only at the very bottom 25px so it merges into the cat's lower chest edge
    bottom_fade = np.clip((paw_h - 4.0 - yy) / 28.0, 0.0, 1.0)
    alpha *= bottom_fade

    # Very subtle warm fur shadow under the paw contour so it separates cleanly from the chest without a grey ring
    edge_band = np.clip(1.0 - np.abs(dist_union - 0.88) / 0.14, 0.0, 1.0)
    rgb = fur_np * (1.0 - 0.06 * edge_band[..., None])

    # Add cute soft-pink feline paw pads (분홍 젤리 육구: 1 central palm pad + 3 tiny toe beans!)
    pad_col = np.array([238.0, 168.0, 176.0])[None, None, :]
    main_pad = gaussian_2d(xx, yy, cx, cy + ry * 0.12, rx * 0.34, ry * 0.26)
    bean_1 = gaussian_2d(xx, yy, cx - rx * 0.34, cy - ry * 0.32, rx * 0.14, ry * 0.16)
    bean_2 = gaussian_2d(xx, yy, cx, cy - ry * 0.42, rx * 0.14, ry * 0.16)
    bean_3 = gaussian_2d(xx, yy, cx + rx * 0.34, cy - ry * 0.32, rx * 0.14, ry * 0.16)
    pads_mask = np.clip((main_pad + bean_1 + bean_2 + bean_3) * 0.82, 0.0, 0.85)

    rgb = rgb * (1.0 - pads_mask[..., None]) + pad_col * pads_mask[..., None]

    rgba = np.dstack([np.clip(rgb, 0, 255).astype(np.uint8), np.clip(alpha * 255.0, 0, 255).astype(np.uint8)])
    return Image.fromarray(rgba, "RGBA")


def synth_6_whistle(base_rgba: Image.Image, char_id: str) -> Image.Image:
    """
    #6 모른 척 (고개 살짝·곁눈질·휘파람):
      - Eyes remain strictly locked at (372,430) & (652,430) for 0px sunglasses overlay!
      - NO creepy human white sclera, and NO fake pasted stamp paw on the cat's chest!
      - Natural sideways glance (shifting the dark pupil & corneal specular highlight inside the eye)
        + asymmetric whisker/cheek tilt + cute puckered whistling 'o' mouth/beak.
    """
    h, w = 1024, 1024
    yy, xx = np.meshgrid(np.arange(h, dtype=np.float32), np.arange(w, dtype=np.float32), indexing="ij")
    dx = np.zeros((h, w), dtype=np.float32)
    dy = np.zeros((h, w), dtype=np.float32)

    # Strictly protect the eye centers (372,430) & (652,430)
    eye_protect = 1.0 - np.clip(
        gaussian_2d(xx, yy, 372.0, 430.0, 64.0, 58.0) + gaussian_2d(xx, yy, 652.0, 430.0, 64.0, 58.0),
        0.0,
        1.0,
    )

    if char_id == "tit":
        # Subtle innocent head/cheek tilt + left wing-tip slightly raised without touching the eyes
        face_protect = 1.0 - np.clip(gaussian_2d(xx, yy, 512.0, 415.0, 220.0, 140.0), 0.0, 1.0)
        wing_lift = gaussian_2d(xx, yy, 175.0, 575.0, 75.0, 95.0) * face_protect
        dx += wing_lift * 42.0
        dy -= wing_lift * 68.0
        warped = apply_displacement_warp(base_rgba, dx, dy)
        arr = np.asarray(warped, dtype=np.float32)

        # Shift corneal catchlights inside both eyes slightly to the right for a cute '곁눈질' glance
        for ex, ey in [(372.0, 430.0), (652.0, 430.0)]:
            old_hl = gaussian_2d(xx, yy, ex - 6.0, ey - 6.0, 7.0, 7.0)
            new_hl = gaussian_2d(xx, yy, ex + 9.0, ey - 5.0, 5.5, 5.5)
            arr[..., :3] *= (1.0 - 0.75 * old_hl[..., None])
            arr[..., :3] = arr[..., :3] * (1.0 - 0.85 * new_hl[..., None]) + 250.0 * (0.85 * new_hl[..., None])

        # Tiny whistling 'o' at the tip of the beak (512, 480)
        whistle_dot = gaussian_2d(xx, yy, 512.0, 480.0, 8.5, 10.5)
        arr[..., :3] *= (1.0 - 0.78 * whistle_dot[..., None])
        return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")
    else:
        # Cat (#6 모른 척):
        # 1) Pucker the cat's own mouth inward toward (518, 558) into a cute whistling 'o'
        rx = xx - 518.0
        ry = yy - 558.0
        pucker = gaussian_2d(xx, yy, 518.0, 558.0, 52.0, 34.0) * eye_protect
        dx += rx * 0.25 * pucker
        dy += ry * 0.25 * pucker

        # 2) Subtle asymmetric cheek/whisker shift (feigning ignorance '휘파람~') and slight ear twitch
        cheek_shift = gaussian_2d(xx, yy, 625.0, 545.0, 85.0, 55.0) * eye_protect
        dx += cheek_shift * 16.0
        dy -= cheek_shift * 10.0
        ear_twitch = gaussian_2d(xx, yy, 710.0, 225.0, 85.0, 75.0) * eye_protect
        dx += ear_twitch * 18.0
        dy += ear_twitch * 12.0

        # 3) Shift the interior iris/pupil & catchlight 11px to the right INSIDE the fixed eye sockets for a natural '곁눈질'
        for ex, ey in [(372.0, 430.0), (652.0, 430.0)]:
            inner_eye = gaussian_2d(xx, yy, ex, ey, 22.0, 20.0)
            dx += inner_eye * 11.0
            dy -= inner_eye * 3.0

        warped = apply_displacement_warp(base_rgba, dx, dy)
        arr = np.asarray(warped, dtype=np.float32)

        # Small natural whistling 'o' opening right at the puckered mouth center (518, 558)
        whistle_o = gaussian_2d(xx, yy, 518.0, 558.0, 10.0, 12.0)
        whistle_inner = gaussian_2d(xx, yy, 518.0, 559.0, 5.5, 7.0)
        arr[..., :3] = arr[..., :3] * (1.0 - 0.80 * whistle_o[..., None]) + np.array([52.0, 28.0, 32.0])[None, None, :] * (0.80 * whistle_o[..., None])
        arr[..., :3] = arr[..., :3] * (1.0 - 0.65 * whistle_inner[..., None]) + np.array([150.0, 78.0, 84.0])[None, None, :] * (0.65 * whistle_inner[..., None])

        return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")


def synth_7_thumbs_up_option_a(base_rgba: Image.Image, hamster_7_rgba: Image.Image, char_id: str) -> Image.Image:
    """
    #7 엄지척 — Option A (방안 A):
      - Tit (`tit_7_thumbs_up`):
          1. Face & eyes (`y < 470` and `250 < x < 774`) are 100% UNTOUCHED (zero glaring eyes!).
          2. Original downward-sloping brown side wings are smoothly tucked/covered by the bird's own white belly plumage.
          3. The bird's real brown-and-white wings are rotated UPWARD (+58 deg / -58 deg) on the left and right sides
             so the brown feathered wing-tips point proudly UP like wing-thumbs (`👍 👍`)!
      - Cat (`cat_7_thumbs_up`):
          Takes the real 3D photographic raised thumbs-up pose & chest shadow from `hamster_7_rgba`,
          inflates/thickens the thin fingers into plump, rounded cat paws (`두툼한 고양이 솜방망이 따봉`),
          and re-textures 100% of the pink skin into fluffy snow-white cat fur matching `base_rgba`'s chest fur
          (with real 3D fur shading and chest occlusion shadow so it stands out naturally in 3D!).
    """
    h, w = 1024, 1024
    yy, xx = np.meshgrid(np.arange(h, dtype=np.float32), np.arange(w, dtype=np.float32), indexing="ij")

    if char_id == "tit":
        # Pure continuous 2D warp of `base_rgba` (ZERO hamster hands, ZERO seams, ZERO eye distortion!):
        #   - Strictly lock the entire central face & eyes (245 < x < 779) with a smooth gate so eyes NEVER move.
        #   - In the upper-outer shoulder zone (y = 330..520), sample from (x + 58, y + 148) on left
        #     and (x - 58, y + 148) on right, which pulls the real dark-brown wings UPWARD & OUTWARD into a proud raised-wing pose!
        #   - In the lower-outer side zone (y = 525..740), sample from the white chest interior (x + 135 on left, x - 135 on right)
        #     so the original downward-sloping brown wings are tucked into fluffy white chest feathers!
        dx = np.zeros((h, w), dtype=np.float32)
        dy = np.zeros((h, w), dtype=np.float32)

        # Gate that is 1.0 only on the outer sides (x < 235 or x > 789), 0.0 everywhere on the face/eyes/beak
        left_side_gate = np.clip((242.0 - xx) / 38.0, 0.0, 1.0)
        right_side_gate = np.clip((xx - 782.0) / 38.0, 0.0, 1.0)

        # 1) Upper wing-raise field (y around 330..525): pulls brown wing from y~560 up to y~410!
        up_env_l = gaussian_2d(xx, yy, 115.0, 425.0, 78.0, 75.0) * left_side_gate
        up_env_r = gaussian_2d(xx, yy, 909.0, 425.0, 78.0, 75.0) * right_side_gate

        dx -= up_env_l * 62.0
        dy -= up_env_l * 155.0
        dx += up_env_r * 62.0
        dy -= up_env_r * 155.0

        # 2) Lower wing-tuck field (y around 535..730): pulls white chest feathers outward over the old downward wing
        tuck_env_l = gaussian_2d(xx, yy, 145.0, 605.0, 72.0, 85.0) * left_side_gate * np.clip((yy - 505.0) / 35.0, 0.0, 1.0)
        tuck_env_r = gaussian_2d(xx, yy, 879.0, 605.0, 72.0, 85.0) * right_side_gate * np.clip((yy - 505.0) / 35.0, 0.0, 1.0)

        dx -= tuck_env_l * 140.0
        dy -= tuck_env_l * 25.0
        dx += tuck_env_r * 140.0
        dy -= tuck_env_r * 25.0

        return apply_displacement_warp(base_rgba, dx, dy)
    else:
        # Cat (#7 엄지척):
        # Use the real 3D photographic thumbs-up geometry & chest shadow from `hamster_7_rgba`,
        # plump/inflate the hands into thick furry cat paws, and re-texture the pink skin into fluffy white cat fur!
        h7_np = np.asarray(hamster_7_rgba, dtype=np.float32)

        # 1) Plump/widen the thumbs-up hands outward by 14px so they look like thick, round furry cat paws instead of thin rodent fingers
        paw_dx = np.zeros((h, w), dtype=np.float32)
        paw_dy = np.zeros((h, w), dtype=np.float32)
        for cx_p in (148.0, 876.0):
            rx = xx - cx_p
            ry = yy - 680.0
            env = gaussian_2d(xx, yy, cx_p, 680.0, 85.0, 115.0)
            paw_dx += rx * 0.22 * env
            paw_dy += ry * 0.12 * env

        plump_h7 = np.asarray(apply_displacement_warp(hamster_7_rgba, paw_dx, paw_dy), dtype=np.float32)

        # 2) Convert any pink skin tint (where R > G + 8) on the raised paws into fluffy warm-white cat fur
        #    while preserving 100% of the real 3D photographic shading, knuckle creases, and fur texture!
        r, g, b = plump_h7[..., 0], plump_h7[..., 1], plump_h7[..., 2]
        lum = 0.299 * r + 0.587 * g + 0.114 * b
        # Sample high-frequency fur grain from the cat's own chest
        cat_np = np.asarray(base_rgba, dtype=np.float32)
        fur_grain = cat_np[..., 0] - ndimage.gaussian_filter(cat_np[..., 0], sigma=3.5)

        # Brighten dark shadows slightly and map luminance to warm snow-white cat fur + real fur grain
        fur_lum = np.clip((lum - 135.0) * 0.78 + 205.0 + fur_grain * 0.65, 130.0, 252.0)
        furry_paw_rgb = np.dstack([
            np.clip(fur_lum * 1.00, 0, 255),
            np.clip(fur_lum * 0.985, 0, 255),
            np.clip(fur_lum * 0.965, 0, 255),
        ])

        # 3) Shift the left paw 38px right (inward onto the cat's chest) and the right paw 38px left
        #    so both paws sit naturally in front of the cat's chest with real 3D occlusion shadow!
        left_paw_rgb = np.roll(furry_paw_rgb, 38, axis=1)
        left_paw_a = np.roll(plump_h7[..., 3], 38, axis=1)
        right_paw_rgb = np.roll(furry_paw_rgb, -38, axis=1)
        right_paw_a = np.roll(plump_h7[..., 3], -38, axis=1)

        # Erode outer silhouette edge by 4px so there is zero white cutout halo
        left_a_clean = ndimage.gaussian_filter(ndimage.grey_erosion(left_paw_a, size=(5, 5)).astype(np.float32) / 255.0, sigma=2.0)
        right_a_clean = ndimage.gaussian_filter(ndimage.grey_erosion(right_paw_a, size=(5, 5)).astype(np.float32) / 255.0, sigma=2.0)

        mask_l = np.clip(gaussian_2d(xx, yy, 186.0, 682.0, 62.0, 102.0) * 1.45, 0.0, 1.0) * left_a_clean
        mask_r = np.clip(gaussian_2d(xx, yy, 838.0, 682.0, 62.0, 102.0) * 1.45, 0.0, 1.0) * right_a_clean

        # Add soft natural 3D drop shadow on the cat's chest right behind each raised paw so it pops in 3D!
        shadow_l = gaussian_2d(xx, yy, 204.0, 695.0, 68.0, 108.0) * (1.0 - mask_l * 0.7)
        shadow_r = gaussian_2d(xx, yy, 820.0, 695.0, 68.0, 108.0) * (1.0 - mask_r * 0.7)
        chest_shadow = np.clip(shadow_l + shadow_r, 0.0, 1.0)

        out = cat_np.copy()
        out[..., :3] *= (1.0 - 0.24 * chest_shadow[..., None])
        out[..., :3] = out[..., :3] * (1.0 - mask_l[..., None]) + left_paw_rgb * mask_l[..., None]
        out[..., :3] = out[..., :3] * (1.0 - mask_r[..., None]) + right_paw_rgb * mask_r[..., None]
        out[..., 3] = np.maximum(out[..., 3], np.maximum(mask_l, mask_r) * 255.0)

        # Also give the cat a subtle proud uptick at the corners of its mouth!
        sm_dx = np.zeros((h, w), dtype=np.float32)
        sm_dy = -(gaussian_2d(xx, yy, 455.0, 555.0, 32.0, 22.0) + gaussian_2d(xx, yy, 569.0, 555.0, 32.0, 22.0)) * 10.0
        return apply_displacement_warp(Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA"), sm_dx, sm_dy)


def build_contact_sheet(image_dict, out_path, title_prefix=""):
    characters = [
        ("hamster", f"방구 햄찌 {title_prefix}"),
        ("tit", f"솜뭉치 오목눈이 {title_prefix}"),
        ("cat", f"시크 뚱냥이 {title_prefix}"),
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
    try:
        font_title = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 22)
        font_sub = ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", 17)
    except Exception:
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()

    thumb_w = 260
    pad = 20
    header_h = 85
    row_label_w = 225
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
            thumb = image_dict[(char_id, exp_id)].resize((thumb_w, thumb_w), Image.Resampling.LANCZOS)
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

    sheet.save(out_path, "PNG")
    print(f"[OK] Saved {out_path}")


def main():
    expressions = [
        (1, "1_blank", "#1 멍 (홈 기본)"),
        (2, "2_eng", "#2 엥? (터짐 직후)"),
        (3, "3_shameless", "#3 뻔뻔 (선글라스)"),
        (4, "4_hold", "#4 웃참 (핵심 감정)"),
        (5, "5_burst", "#5 터짐 (소리 결과)"),
        (6, "6_whistle", "#6 모른 척 (진동 결과)"),
        (7, "7_thumbs_up", "#7 엄지척 (칭호 획득)"),
    ]

    clean_generated = {}
    bgrade_generated = {}

    # 1) Hamster (all 7 raw AI files + front-camera close-up convex bulge + jolt blur on #5)
    raw_h1 = Image.open(find_raw_file("raw_hamster_1_blank")).convert("RGB").resize((1024, 1024), Image.Resampling.LANCZOS)
    h_ref_l, h_ref_r = detect_eye_centers(np.asarray(raw_h1), "hamster")
    for exp_id, exp_slug, _ in expressions:
        raw_path = find_raw_file(f"raw_hamster_{exp_slug}")
        rgb_img = Image.open(raw_path).convert("RGB").resize((1024, 1024), Image.Resampling.LANCZOS)
        rgba_img = extract_foreground_rgba(rgb_img, "hamster")
        if exp_id in (1, 3, 4, 6, 7):
            cur_l, cur_r = detect_eye_centers(np.asarray(rgb_img), "hamster")
            rgba_img = align_image_by_eyes(rgba_img, cur_l, cur_r)
            rgba_img = apply_front_camera_bulge(rgba_img, "hamster", lock_eyes=True, strength=0.22)
        elif exp_id == 5:
            rgba_img = align_image_by_eyes(rgba_img, h_ref_l, h_ref_r)
            rgba_img = apply_front_camera_bulge(rgba_img, "hamster", lock_eyes=False, strength=0.25)
            rgba_img = apply_jolt_motion_blur(rgba_img, v_shift=14, zoom_pct=0.024)
        else:
            rgba_img = apply_front_camera_bulge(rgba_img, "hamster", lock_eyes=False, strength=0.26)
        clean_generated[("hamster", exp_id)] = rgba_img

    # 2) Tit (#1, #2, #3 from AI raw files; #4..#7 natural 2D warps with ZERO foreign body parts!)
    raw_t1 = Image.open(find_raw_file("raw_tit_1_blank")).convert("RGB").resize((1024, 1024), Image.Resampling.LANCZOS)
    t_ref_l, t_ref_r = detect_eye_centers(np.asarray(raw_t1), "tit")

    for exp_id, exp_slug, _ in expressions[:3]:
        raw_path = find_raw_file(f"raw_tit_{exp_slug}")
        rgb_img = Image.open(raw_path).convert("RGB").resize((1024, 1024), Image.Resampling.LANCZOS)
        rgba_img = extract_foreground_rgba(rgb_img, "tit")
        if exp_id in (1, 3):
            cur_l, cur_r = detect_eye_centers(np.asarray(rgb_img), "tit")
            if abs(cur_l[0] - t_ref_l[0]) > 35 or abs(cur_r[0] - t_ref_r[0]) > 35:
                cur_l, cur_r = t_ref_l, t_ref_r
            rgba_img = align_image_by_eyes(rgba_img, cur_l, cur_r)
            rgba_img = apply_front_camera_bulge(rgba_img, "tit", lock_eyes=True, strength=0.24)
        else:
            rgba_img = apply_front_camera_bulge(rgba_img, "tit", lock_eyes=False, strength=0.26)
        clean_generated[("tit", exp_id)] = rgba_img

    # Synthesize Tit #4, #5, #6, #7 directly from the front-camera-bulged Tit #1
    tit_base = clean_generated[("tit", 1)]
    clean_generated[("tit", 4)] = synth_4_hold(tit_base, clean_generated[("hamster", 4)], "tit")
    clean_generated[("tit", 5)] = synth_natural_5_burst(tit_base, clean_generated[("tit", 2)], "tit")
    clean_generated[("tit", 6)] = synth_6_whistle(tit_base, "tit")
    clean_generated[("tit", 7)] = synth_7_thumbs_up_option_a(tit_base, clean_generated[("hamster", 7)], "tit")

    # 3) Cat (#1, #2 from AI raw files; #3..#7 natural 2D warps + fluffy 솜방망이 paws with ZERO foreign body parts!)
    raw_c1 = Image.open(find_raw_file("raw_cat_1_blank")).convert("RGB").resize((1024, 1024), Image.Resampling.LANCZOS)
    c_ref_l, c_ref_r = detect_eye_centers(np.asarray(raw_c1), "cat")

    for exp_id, exp_slug, _ in expressions[:2]:
        raw_path = find_raw_file(f"raw_cat_{exp_slug}")
        rgb_img = Image.open(raw_path).convert("RGB").resize((1024, 1024), Image.Resampling.LANCZOS)
        rgba_img = extract_foreground_rgba(rgb_img, "cat")
        if exp_id == 1:
            rgba_img = align_image_by_eyes(rgba_img, c_ref_l, c_ref_r)
            rgba_img = apply_front_camera_bulge(rgba_img, "cat", lock_eyes=True, strength=0.24)
        else:
            rgba_img = apply_front_camera_bulge(rgba_img, "cat", lock_eyes=False, strength=0.26)
        clean_generated[("cat", exp_id)] = rgba_img

    cat_base = clean_generated[("cat", 1)]
    clean_generated[("cat", 3)] = synth_cat_3_shameless(cat_base)
    clean_generated[("cat", 4)] = synth_4_hold(cat_base, clean_generated[("hamster", 4)], "cat")
    clean_generated[("cat", 5)] = synth_natural_5_burst(cat_base, clean_generated[("cat", 2)], "cat")
    clean_generated[("cat", 6)] = synth_6_whistle(cat_base, "cat")
    clean_generated[("cat", 7)] = synth_7_thumbs_up_option_a(cat_base, clean_generated[("hamster", 7)], "cat")

    # Save both Original (Front-Cam Bulge) AND Pre-baked B-Grade Weathered versions!
    for char_id in ("hamster", "tit", "cat"):
        for exp_id, exp_slug, _ in expressions:
            clean_img = clean_generated[(char_id, exp_id)]
            clean_path = os.path.join(OUT_REAL_DIR, f"{char_id}_{exp_slug}.png")
            clean_img.save(clean_path, "PNG")

            bgrade_img = apply_bgrade_weathered_filter(clean_img)
            bgrade_generated[(char_id, exp_id)] = bgrade_img
            bgrade_path = os.path.join(OUT_BGRADE_DIR, f"{char_id}_{exp_slug}.png")
            bgrade_img.save(bgrade_path, "PNG")
            print(f"[OK] Saved {clean_path} & {bgrade_path}")

    # Build Contact Sheets for both Original and Weathered B-Grade versions
    build_contact_sheet(clean_generated, os.path.join(ARTIFACT_DIR, "real_all_characters_sheet.png"), "(실사 원본)")
    build_contact_sheet(bgrade_generated, os.path.join(ARTIFACT_DIR, "real_all_bgrade_sheet.png"), "(B급 풍화본)")

    # Build Sunglasses & Money-Gun Alignment Proof Sheet on the B-grade weathered versions
    shades = Image.open(os.path.join(EXP_DIR, "pixel_sunglasses.png")).convert("RGBA")
    money_rain = Image.open(os.path.join(EXP_DIR, "money_rain.png")).convert("RGBA")

    try:
        font_title = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 22)
        font_sub = ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", 17)
    except Exception:
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()

    characters = [
        ("hamster", "방구 햄찌 (B급 풍화)"),
        ("tit", "솜뭉치 오목눈이 (B급 풍화)"),
        ("cat", "시크 뚱냥이 (B급 풍화)"),
    ]
    align_cols = [
        (3, False, "#3 뻔뻔 + 도트 선글라스"),
        (4, False, "#4 웃참 + 도트 선글라스"),
        (6, False, "#6 모른 척 + 도트 선글라스"),
        (3, True, "★ #3 뻔뻔 + 선글라스 + 머니건"),
    ]
    thumb_w = 260
    pad = 20
    header_h = 85
    row_label_w = 235
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
            comp = Image.alpha_composite(bgrade_generated[(char_id, exp_id)], shades)
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
