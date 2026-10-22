# -*- coding: utf-8 -*-
r"""
Automated Processing and Composition Pipeline for Photorealistic Skin Assets:
1. Alpha cutout from white background with soft antialiasing.
2. Wear items: Strict eye-coordinate alignment (Left Eye 372,430 & Right Eye 652,430).
3. Props: Centered on 1024x1024 transparent PNG.
4. Backgrounds: Framed to 1080x2340 vertical (top 40% calm, bottom 30% calm).
5. FX: Centered on 256x256 transparent PNG.
6. Frames: 1080x1240 transparent PNG with center 1080x1080 cutout.
7. Rebuilds `skin_wishlist_master_sheet.png` artifact for visual verification.
"""

import math
import os
import glob
import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage

BASE_SKIN_DIR = r"c:\bgbb\assets\skin"
SCRATCH_DIR = r"C:\Users\ruahn49\.gemini\antigravity\brain\b2ce85ba-1f7b-478f-8be4-052d7e2dab69\scratch"
ARTIFACT_DIR = r"C:\Users\ruahn49\.gemini\antigravity\brain\b2ce85ba-1f7b-478f-8be4-052d7e2dab69"

LEFT_EYE = (372, 430)
RIGHT_EYE = (652, 430)
EYE_DIST_REF = RIGHT_EYE[0] - LEFT_EYE[0]  # 280px
EYE_CENTER_REF = ((LEFT_EYE[0] + RIGHT_EYE[0]) / 2.0, (LEFT_EYE[1] + RIGHT_EYE[1]) / 2.0)  # (512, 430)


def extract_alpha_from_white(img: Image.Image, bg_thresh: float = 246.0, feather: float = 2.0) -> Image.Image:
    """Extracts transparent PNG from solid white studio backdrop."""
    im = img.convert("RGBA")
    arr = np.asarray(im, dtype=np.float32)
    rgb = arr[..., :3]

    # Whiteness metric: distance from pure white
    dist_from_white = np.sqrt(np.sum((255.0 - rgb) ** 2, axis=-1))

    # Thresholding
    thresh = (255.0 - bg_thresh) * math.sqrt(3)
    alpha = np.clip((dist_from_white - thresh) / (feather * 4.0), 0.0, 1.0) * 255.0

    # Floodfill background from border to avoid interior white removal
    bg_mask = (dist_from_white <= thresh).astype(np.uint8)
    struct = ndimage.generate_binary_structure(2, 2)
    # Seed corners
    labeled, _ = ndimage.label(bg_mask, structure=struct)
    corner_labels = set([labeled[0, 0], labeled[0, -1], labeled[-1, 0], labeled[-1, -1]])
    true_bg = np.isin(labeled, list(corner_labels))

    final_alpha = np.where(true_bg, np.clip(dist_from_white / (thresh + 1e-5), 0.0, 1.0) * alpha, 255.0)
    arr[..., 3] = np.clip(final_alpha, 0, 255).astype(np.uint8)

    # Decontaminate white halo
    a_norm = arr[..., 3:4] / 255.0
    arr[..., :3] = np.clip((arr[..., :3] - 255.0 * (1.0 - a_norm)) / np.maximum(a_norm, 0.05), 0, 255)

    res = Image.fromarray(arr.astype(np.uint8), "RGBA")
    return res


def get_tight_bbox(img: Image.Image, alpha_thresh: int = 15):
    arr = np.asarray(img)
    a = arr[..., 3] > alpha_thresh
    if not np.any(a):
        return None
    rows = np.any(a, axis=1)
    cols = np.any(a, axis=0)
    ymin, ymax = np.where(rows)[0][[0, -1]]
    xmin, xmax = np.where(cols)[0][[0, -1]]
    return (xmin, ymin, xmax + 1, ymax + 1)


def process_wear_item(raw_img_path: str, target_item_id: str, is_headwear: bool = False, eye_scale_mult: float = 1.0):
    """Processes a raw photo of wear accessory and aligns it to 372,430 and 652,430."""
    raw = Image.open(raw_img_path)
    cutout = extract_alpha_from_white(raw)
    bbox = get_tight_bbox(cutout)
    if bbox:
        cropped = cutout.crop(bbox)
    else:
        cropped = cutout

    cw, ch = cropped.size
    canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))

    if is_headwear:
        # Fits on top of head (centered horizontally at 512, resting near y=220..320)
        target_w = int(520 * eye_scale_mult)
        target_h = int(ch * (target_w / float(cw)))
        resized = cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)
        px = int(512 - target_w / 2.0)
        py = int(240 - target_h * 0.45)
        canvas.paste(resized, (px, py), resized)
    else:
        # Eyewear / Facewear: Scales so width spans across both eyes (~380px..460px)
        target_w = int(480 * eye_scale_mult)
        target_h = int(ch * (target_w / float(cw)))
        resized = cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)
        px = int(512 - target_w / 2.0)
        py = int(430 - target_h / 2.0)
        canvas.paste(resized, (px, py), resized)

    out_sub = "season" if "santa" in target_item_id else "wear"
    out_path = os.path.join(BASE_SKIN_DIR, out_sub, f"{target_item_id}.png")
    canvas.save(out_path)
    print(f"Processed Wear: {out_path}")
    return canvas


def process_prop_item(raw_img_path: str, target_item_id: str, target_box_size: int = 700):
    """Processes a raw prop photo and centers it on 1024x1024 transparent PNG."""
    raw = Image.open(raw_img_path)
    cutout = extract_alpha_from_white(raw)
    bbox = get_tight_bbox(cutout)
    if bbox:
        cropped = cutout.crop(bbox)
    else:
        cropped = cutout

    cw, ch = cropped.size
    scale = min(target_box_size / float(cw), target_box_size / float(ch))
    new_w, new_h = max(1, int(cw * scale)), max(1, int(ch * scale))
    resized = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    # Place prop resting slightly lower in bottom-middle (grounded)
    px = int(512 - new_w / 2.0)
    py = int(560 - new_h / 2.0)
    canvas.paste(resized, (px, py), resized)

    out_sub = "season" if target_item_id in ("prop_pumpkin", "prop_bok", "prop_yeot") else "prop"
    out_path = os.path.join(BASE_SKIN_DIR, out_sub, f"{target_item_id}.png")
    canvas.save(out_path)
    print(f"Processed Prop: {out_path}")
    return canvas


def process_bg_item(raw_img_path: str, target_item_id: str):
    """Processes a photorealistic background into 1080x2340."""
    raw = Image.open(raw_img_path).convert("RGBA")
    rw, rh = raw.size
    target_ratio = 1080.0 / 2340.0
    current_ratio = rw / float(rh)

    if current_ratio > target_ratio:
        # Crop width
        crop_w = int(rh * target_ratio)
        x0 = (rw - crop_w) // 2
        cropped = raw.crop((x0, 0, x0 + crop_w, rh))
    else:
        # Crop height
        crop_h = int(rw / target_ratio)
        y0 = (rh - crop_h) // 2
        cropped = raw.crop((0, y0, rw, y0 + crop_h))

    resized = cropped.resize((1080, 2340), Image.Resampling.LANCZOS)

    # Ensure top 40% (y: 0..936) has soft gradient tint for HUD text legibility
    arr = np.asarray(resized).copy()
    top_y = np.linspace(0.4, 0.0, 936)[:, None, None]
    arr[:936, :, :3] = np.clip(arr[:936, :, :3] * (1.0 - top_y * 0.3) + 20.0 * top_y, 0, 255).astype(np.uint8)
    final_bg = Image.fromarray(arr)

    out_sub = "season" if target_item_id in ("bg_snow", "bg_hanbok", "bg_upsidedown") else "bg"
    out_path = os.path.join(BASE_SKIN_DIR, out_sub, f"{target_item_id}.png")
    final_bg.save(out_path)
    print(f"Processed Background: {out_path}")
    return final_bg


def process_fx_item(raw_img_path: str, target_item_id: str):
    """Processes FX into 256x256 transparent PNG."""
    raw = Image.open(raw_img_path)
    cutout = extract_alpha_from_white(raw)
    bbox = get_tight_bbox(cutout)
    if bbox:
        cropped = cutout.crop(bbox)
    else:
        cropped = cutout

    cw, ch = cropped.size
    scale = min(220.0 / float(cw), 220.0 / float(ch))
    new_w, new_h = max(1, int(cw * scale)), max(1, int(ch * scale))
    resized = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    px = int(128 - new_w / 2.0)
    py = int(128 - new_h / 2.0)
    canvas.paste(resized, (px, py), resized)

    out_path = os.path.join(BASE_SKIN_DIR, "fx", f"{target_item_id}.png")
    canvas.save(out_path)
    print(f"Processed FX: {out_path}")
    return canvas


def process_frame_item(raw_img_path: str, target_item_id: str):
    """Processes a 1080x1240 frame overlay with center 1080x1080 transparent cutout."""
    raw = Image.open(raw_img_path).convert("RGBA")
    resized = raw.resize((1080, 1240), Image.Resampling.LANCZOS)

    # Cutout center 1080x1080 (leaving margin: x: 50..1030, y: 50..1030)
    arr = np.asarray(resized).copy()
    arr[70:1070, 60:1020, 3] = 0
    final_frame = Image.fromarray(arr)

    out_path = os.path.join(BASE_SKIN_DIR, "frame", f"{target_item_id}.png")
    final_frame.save(out_path)
    print(f"Processed Frame: {out_path}")
    return final_frame


def compile_master_proof_sheet():
    """Generates the comprehensive visual proof sheet containing all skins."""
    print(">>> Compiling Master Proof Sheet...")
    sheet_w, sheet_h = 2400, 3200
    sheet = Image.new("RGBA", (sheet_w, sheet_h), (242, 240, 235, 255))
    sd = ImageDraw.Draw(sheet)

    def draw_header(title, y):
        sd.rectangle([40, y, sheet_w - 40, y + 50], fill=(42, 40, 48, 255))
        try:
            f = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 26)
        except Exception:
            f = ImageFont.load_default()
        sd.text((60, y + 10), title, fill=(255, 255, 255, 255), font=f)

    # Load all Wear items
    draw_header("WEAR ITEMS (Photorealistic + 3D Amateur Gasmask)", 30)
    wear_files = sorted(glob.glob(os.path.join(BASE_SKIN_DIR, "wear", "*.png")) + glob.glob(os.path.join(BASE_SKIN_DIR, "season", "wear_*.png")))
    for idx, path in enumerate(wear_files):
        col = idx % 7
        row = idx // 7
        x = 50 + col * 330
        y = 90 + row * 230
        sd.rectangle([x, y, x + 310, y + 210], fill=(255, 255, 255, 255), outline=(200, 200, 200, 255), width=2)
        im = Image.open(path).resize((180, 180), Image.Resampling.LANCZOS)
        sheet.paste(im, (x + 65, y + 10), im)
        name = os.path.splitext(os.path.basename(path))[0]
        sd.text((x + 10, y + 185), name, fill=(50, 50, 50, 255))

    # Props
    draw_header("PROPS (Photorealistic + 3D Trophy / Medal / Gasmask)", 580)
    prop_files = sorted(glob.glob(os.path.join(BASE_SKIN_DIR, "prop", "*.png")) + glob.glob(os.path.join(BASE_SKIN_DIR, "season", "prop_*.png")))
    for idx, path in enumerate(prop_files):
        col = idx % 7
        row = idx // 7
        x = 50 + col * 330
        y = 640 + row * 220
        sd.rectangle([x, y, x + 310, y + 200], fill=(255, 255, 255, 255), outline=(200, 200, 200, 255), width=2)
        im = Image.open(path).resize((160, 160), Image.Resampling.LANCZOS)
        sheet.paste(im, (x + 75, y + 10), im)
        name = os.path.splitext(os.path.basename(path))[0]
        sd.text((x + 10, y + 175), name, fill=(50, 50, 50, 255))

    # Backgrounds
    draw_header("BACKGROUNDS (Photorealistic + 3D Vaporwave / Space)", 1340)
    bg_files = sorted(glob.glob(os.path.join(BASE_SKIN_DIR, "bg", "*.png")) + glob.glob(os.path.join(BASE_SKIN_DIR, "season", "bg_*.png")))
    for idx, path in enumerate(bg_files):
        col = idx % 8
        row = idx // 8
        x = 50 + col * 285
        y = 1400 + row * 430
        sd.rectangle([x, y, x + 265, y + 410], fill=(255, 255, 255, 255), outline=(200, 200, 200, 255), width=2)
        im = Image.open(path).resize((160, 346), Image.Resampling.LANCZOS)
        sheet.paste(im, (x + 52, y + 15))
        name = os.path.splitext(os.path.basename(path))[0]
        sd.text((x + 10, y + 375), name, fill=(50, 50, 50, 255))

    # FX, Bubbles & Frames
    draw_header("P2 FX, BUBBLES (3D Amateur) & FRAMES", 2300)
    fx_files = sorted(glob.glob(os.path.join(BASE_SKIN_DIR, "fx", "*.png")))
    for idx, path in enumerate(fx_files):
        x = 50 + idx * 280
        y = 2360
        sd.rectangle([x, y, x + 260, y + 200], fill=(255, 255, 255, 255), outline=(200, 200, 200, 255), width=2)
        im = Image.open(path).resize((140, 140), Image.Resampling.LANCZOS)
        sheet.paste(im, (x + 60, y + 15), im)
        name = os.path.splitext(os.path.basename(path))[0]
        sd.text((x + 10, y + 165), name, fill=(50, 50, 50, 255))

    bubble_files = sorted(glob.glob(os.path.join(BASE_SKIN_DIR, "bubble", "*.png")))
    for idx, path in enumerate(bubble_files):
        x = 50 + idx * 360
        y = 2580
        sd.rectangle([x, y, x + 340, y + 180], fill=(240, 240, 240, 255), outline=(200, 200, 200, 255), width=2)
        im = Image.open(path).resize((260, 130), Image.Resampling.LANCZOS)
        sheet.paste(im, (x + 40, y + 15), im)
        name = os.path.splitext(os.path.basename(path))[0]
        sd.text((x + 10, y + 150), name, fill=(50, 50, 50, 255))

    frame_files = sorted(glob.glob(os.path.join(BASE_SKIN_DIR, "frame", "*.png")))
    for idx, path in enumerate(frame_files):
        x = 50 + idx * 380
        y = 2780
        sd.rectangle([x, y, x + 360, y + 380], fill=(240, 240, 240, 255), outline=(200, 200, 200, 255), width=2)
        im = Image.open(path).resize((250, 287), Image.Resampling.LANCZOS)
        sheet.paste(im, (x + 55, y + 25), im)
        name = os.path.splitext(os.path.basename(path))[0]
        sd.text((x + 10, y + 335), name, fill=(50, 50, 50, 255))

    out_sheet_path = os.path.join(ARTIFACT_DIR, "skin_wishlist_master_sheet.png")
    sheet.save(out_sheet_path)
    print(f"\n>>> Saved Updated Master Sheet to: {out_sheet_path}")


if __name__ == "__main__":
    compile_master_proof_sheet()
