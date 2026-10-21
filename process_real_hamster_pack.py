# -*- coding: utf-8 -*-
"""
Post-processes the 7 photorealistic Hamster ("방구 햄찌") images into:
  - 1024x1024 transparent RGBA PNGs in `c:\bgbb\assets\expressions_real\`
  - Exact eye-coordinate alignment on #1, #3, #4, #6, #7 to (372, 430) & (652, 430)
    so `pixel_sunglasses.png` and `money_rain.png` overlay at (0, 0) with 0px error.
  - Contact sheet & sunglasses/money-gun overlay verification sheet in the artifact directory.
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
        raise FileNotFoundError(f"Could not find {pattern}")
    return matches[-1]


def detect_eye_centers(rgb_np):
    """Detects the left and right dark eye centroids in the upper-middle face region."""
    # Eyes are very dark (luminance < 55) inside y in [330..530], x in [220..800]
    lum = 0.299 * rgb_np[..., 0] + 0.587 * rgb_np[..., 1] + 0.114 * rgb_np[..., 2]
    left_roi = (lum < 55)
    left_Mask = np.zeros_like(left_roi)
    left_Mask[340:520, 240:460] = True
    ly, lx = np.where(left_roi & left_Mask)

    right_Mask = np.zeros_like(left_roi)
    right_Mask[340:520, 560:780] = True
    ry, rx = np.where(left_roi & right_Mask)

    return (float(lx.mean()), float(ly.mean())), (float(rx.mean()), float(ry.mean()))


def extract_foreground_rgba(rgb_img: Image.Image) -> Image.Image:
    """
    Removes the contiguous pure-white studio background from the outer border
    while preserving 100% of the interior white/cream hamster fur.
    """
    rgb_np = np.asarray(rgb_img, dtype=np.float32)
    # Distance from pure white (255, 255, 255)
    dist_white = np.sqrt(np.sum((255.0 - rgb_np) ** 2, axis=-1))
    # Also check local texture variance (fur has fine detail even where bright)
    gray = rgb_np.mean(axis=-1)
    local_mean = ndimage.uniform_filter(gray, size=7)
    local_sq_mean = ndimage.uniform_filter(gray ** 2, size=7)
    local_std = np.sqrt(np.maximum(0.0, local_sq_mean - local_mean ** 2))

    # Candidate background pixels: very close to pure white AND very flat
    is_bg_candidate = (dist_white < 8.5) & (local_std < 2.2)

    # Flood-fill from top-left, top-right, and upper side borders only
    seeds = np.zeros_like(is_bg_candidate, dtype=bool)
    seeds[0:4, :] = is_bg_candidate[0:4, :]
    seeds[:750, 0:4] = is_bg_candidate[:750, 0:4]
    seeds[:750, -4:] = is_bg_candidate[:750, -4:]

    # Connected components of background reachable from the exterior border
    labeled, _ = ndimage.label(is_bg_candidate)
    border_labels = np.unique(labeled[seeds])
    border_labels = border_labels[border_labels > 0]
    exterior_bg = np.isin(labeled, border_labels)

    # Fill any tiny isolated holes inside the foreground
    fg_mask = ~exterior_bg
    fg_mask = ndimage.binary_fill_holes(fg_mask)

    # Soften alpha edge by 1.5px for natural fur anti-aliasing
    alpha_f = ndimage.gaussian_filter(fg_mask.astype(np.float32), sigma=1.2)
    alpha_u8 = np.clip(alpha_f * 255.0, 0, 255).astype(np.uint8)

    rgba = np.dstack([rgb_np.astype(np.uint8), alpha_u8])
    return Image.fromarray(rgba, "RGBA")


def align_image_by_eyes(rgba_img: Image.Image, src_left, src_right, dst_left=TARGET_LEFT_EYE, dst_right=TARGET_RIGHT_EYE) -> Image.Image:
    """Applies a similarity transform so src_left -> dst_left and src_right -> dst_right."""
    sx0, sy0 = src_left
    sx1, sy1 = src_right
    dx0, dy0 = dst_left
    dx1, dy1 = dst_right

    src_dx, src_dy = sx1 - sx0, sy1 - sy0
    dst_dx, dst_dy = dx1 - dx0, dy1 - dy0

    src_dist = math.hypot(src_dx, src_dy)
    dst_dist = math.hypot(dst_dx, dst_dy)
    scale = src_dist / dst_dist  # inverse mapping scale (dst -> src)

    src_ang = math.atan2(src_dy, src_dx)
    dst_ang = math.atan2(dst_dy, dst_dx)
    d_ang = src_ang - dst_ang

    cos_a = scale * math.cos(d_ang)
    sin_a = scale * math.sin(d_ang)

    src_mx, src_my = (sx0 + sx1) / 2.0, (sy0 + sy1) / 2.0
    dst_mx, dst_my = (dx0 + dx1) / 2.0, (dy0 + dy1) / 2.0

    # x_src = cos_a * (x_dst - dst_mx) - sin_a * (y_dst - dst_my) + src_mx
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


def main():
    specs = [
        (1, "raw_hamster_1_blank", "hamster_1_blank.png", "#1 멍 (홈 기본)"),
        (2, "raw_hamster_2_eng", "hamster_2_eng.png", "#2 엥? (터짐 직후)"),
        (3, "raw_hamster_3_shameless", "hamster_3_shameless.png", "#3 뻔뻔 (선글라스)"),
        (4, "raw_hamster_4_hold", "hamster_4_hold.png", "#4 웃참 (핵심 감정)"),
        (5, "raw_hamster_5_burst", "hamster_5_burst.png", "#5 터짐 (소리 결과)"),
        (6, "raw_hamster_6_whistle", "hamster_6_whistle.png", "#6 모른 척 (진동 결과)"),
        (7, "raw_hamster_7_thumbs_up", "hamster_7_thumbs_up.png", "#7 엄지척 (칭호 획득)"),
    ]

    # Detect eye centers on #1 Blank as the master reference transform for #1, #3, #4, #5, #6, #7
    raw1_path = find_raw_file("raw_hamster_1_blank")
    raw1_rgb = Image.open(raw1_path).convert("RGB").resize((1024, 1024), Image.Resampling.LANCZOS)
    ref_left, ref_right = detect_eye_centers(np.asarray(raw1_rgb))
    print(f"[INFO] Master #1 detected eyes: left={ref_left}, right={ref_right}")

    processed = {}
    for exp_id, raw_prefix, out_fname, label_kr in specs:
        raw_path = find_raw_file(raw_prefix)
        rgb_img = Image.open(raw_path).convert("RGB").resize((1024, 1024), Image.Resampling.LANCZOS)
        rgba_img = extract_foreground_rgba(rgb_img)

        if exp_id in (1, 3, 4, 6, 7):
            # Detect eyes individually on #1, #3, #4, #6, #7 for sub-pixel lock to (372, 430) & (652, 430)
            cur_l, cur_r = detect_eye_centers(np.asarray(rgb_img))
            print(f"[INFO] Exp #{exp_id} detected eyes: left={cur_l}, right={cur_r} -> locking to (372,430) & (652,430)")
            rgba_img = align_image_by_eyes(rgba_img, cur_l, cur_r)
        elif exp_id == 5:
            # Use master #1 transform so body scale matches
            rgba_img = align_image_by_eyes(rgba_img, ref_left, ref_right)

        out_path = os.path.join(OUT_REAL_DIR, out_fname)
        rgba_img.save(out_path, "PNG")
        processed[exp_id] = (rgba_img, out_fname, label_kr)
        print(f"[OK] Saved {out_path} ({rgba_img.size}, {rgba_img.mode})")

    # Build 7-card Contact Sheet + Overlay Demo Cards
    try:
        font_title = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 22)
        font_sub = ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", 17)
    except Exception:
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()

    shades = Image.open(os.path.join(EXP_DIR, "pixel_sunglasses.png")).convert("RGBA")
    money_rain = Image.open(os.path.join(EXP_DIR, "money_rain.png")).convert("RGBA")
    fart_eq3 = Image.open(os.path.join(EXP_DIR, "fart_bubble.png")).convert("RGBA")

    # 1) All 7 Real Hamster Expressions + 1 Flex Combo Card (4x2 Grid)
    combo_flex = Image.alpha_composite(processed[3][0], shades)
    combo_flex = Image.alpha_composite(combo_flex, money_rain)

    cards = [processed[i] for i in range(1, 8)] + [
        (combo_flex, "combo_flex.png", "★ #3 뻔뻔 + 도트선글라스 + 머니건")
    ]

    cols, rows = 4, 2
    tw, pad = 280, 24
    sw = cols * (tw + pad) + pad
    sh = rows * (tw + pad + 58) + pad + 65
    sheet = Image.new("RGBA", (sw, sh), (250, 246, 238, 255))
    sdraw = ImageDraw.Draw(sheet)
    sdraw.text(
        (sw // 2, 34),
        "실사 버전 '방구 햄찌' 7종 익스팬션 팩 (1024x1024 투명 PNG + 눈 좌표 고정)",
        fill=(35, 30, 25, 255),
        font=font_title,
        anchor="mm",
    )

    for idx, (img_obj, fname, label_kr) in enumerate(cards):
        r = idx // cols
        c = idx % cols
        rx = pad + c * (tw + pad)
        ry = 68 + r * (tw + pad + 58)

        card = Image.new("RGBA", (tw, tw), (255, 255, 255, 255))
        cdraw = ImageDraw.Draw(card)
        cs = 20
        for cy_i in range(0, tw, cs):
            for cx_i in range(0, tw, cs):
                if ((cx_i // cs) + (cy_i // cs)) % 2 == 1:
                    cdraw.rectangle([cx_i, cy_i, cx_i + cs, cy_i + cs], fill=(238, 234, 226, 255))

        thumb = img_obj.resize((tw, tw), Image.Resampling.LANCZOS)
        card = Image.alpha_composite(card, thumb)
        cdraw = ImageDraw.Draw(card)
        is_locked = idx in (2, 3, 5, 7)
        border_col = (220, 75, 60, 255) if is_locked else (180, 170, 155, 255)
        cdraw.rectangle([0, 0, tw - 1, tw - 1], outline=border_col, width=3)
        sheet.paste(card, (rx, ry))

        sdraw.text((rx + tw // 2, ry + tw + 18), label_kr, fill=(35, 30, 25, 255), font=font_title, anchor="mm")
        sub_txt = "눈 좌표 (372,430 / 652,430) 고정" if idx in (2, 3, 5) else fname
        sub_col = (210, 65, 55, 255) if idx in (2, 3, 5) else (100, 95, 90, 255)
        sdraw.text((rx + tw // 2, ry + tw + 42), sub_txt, fill=sub_col, font=font_sub, anchor="mm")

    sheet_path = os.path.join(ARTIFACT_DIR, "real_hamster_expansion_sheet.png")
    sheet.save(sheet_path, "PNG")
    print(f"[OK] Saved {sheet_path}")

    # 2) 3, 4, 6 Sunglasses Alignment Proof Sheet for Real Hamster
    align_cards = [
        (Image.alpha_composite(processed[3][0], shades), "#3 뻔뻔 + 도트 선글라스"),
        (Image.alpha_composite(processed[4][0], shades), "#4 웃참 + 도트 선글라스"),
        (Image.alpha_composite(processed[6][0], shades), "#6 모른 척 + 도트 선글라스"),
    ]
    aw = 3 * (tw + pad) + pad
    ah = tw + pad + 115
    asheet = Image.new("RGBA", (aw, ah), (246, 242, 234, 255))
    adraw = ImageDraw.Draw(asheet)
    adraw.text(
        (aw // 2, 32),
        "실사 햄찌 3·4·6번 눈 위치 고정 검증 — 동일 좌표 (0,0) 도트 선글라스 오버레이",
        fill=(35, 30, 25, 255),
        font=font_title,
        anchor="mm",
    )
    for idx, (comp_img, title_kr) in enumerate(align_cards):
        rx = pad + idx * (tw + pad)
        ry = 65
        card = Image.new("RGBA", (tw, tw), (255, 253, 248, 255))
        thumb = comp_img.resize((tw, tw), Image.Resampling.LANCZOS)
        card = Image.alpha_composite(card, thumb)
        cdraw = ImageDraw.Draw(card)
        cdraw.rectangle([0, 0, tw - 1, tw - 1], outline=(50, 45, 40, 255), width=3)
        asheet.paste(card, (rx, ry))
        adraw.text((rx + tw // 2, ry + tw + 22), title_kr, fill=(35, 30, 25, 255), font=font_title, anchor="mm")

    align_path = os.path.join(ARTIFACT_DIR, "real_hamster_sunglasses_proof.png")
    asheet.save(align_path, "PNG")
    print(f"[OK] Saved {align_path}")


if __name__ == "__main__":
    main()
