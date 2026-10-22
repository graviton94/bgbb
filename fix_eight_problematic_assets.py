# -*- coding: utf-8 -*-
r"""
Surgically fixes the 8 problematic assets per user requirements:
1. `wear_mask`: Clean transparent alpha cutout around pleated surgical mask (light blue/cyan with white earloops, NO square white box).
2. `wear_heart`: Complete removal of ground shadow / cheek smudge beneath red heart sunglasses.
3. `wear_eyepatch`: Positioned directly over Left Eye (372, 430) with DIAGONAL strap across forehead/cheek, right eye completely open.
4. `wear_gasmask` & `prop_gasmask`: Authentic recognizable military gas mask (dual goggle eyepieces over Left 372,430 and Right 652,430, snout filter canister with ribbed vents, harness straps - NOT a giant black ball).
5. `prop_extinguisher` & `prop_spray`: Absolute clean removal of right-side background smudge and floor contact shadow.
6. `wear_party`: Remove chin strap completely (only the glossy 3D cone hat with embossed dots and pom-pom).
"""

import math
import os
import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage

SKIN_DIR = r"c:\bgbb\assets\skin"
SCRATCH_DIR = r"C:\Users\ruahn49\.gemini\antigravity\brain\b2ce85ba-1f7b-478f-8be4-052d7e2dab69\scratch"
ARTIFACT_DIR = r"C:\Users\ruahn49\.gemini\antigravity\brain\b2ce85ba-1f7b-478f-8be4-052d7e2dab69"

LEFT_EYE = (372, 430)
RIGHT_EYE = (652, 430)


# =========================================================================
# 1. FIX wear_heart (Remove all bottom ground shadow/cheek smudge)
# =========================================================================
def fix_wear_heart():
    raw_path = r"C:\Users\ruahn49\.gemini\antigravity\brain\b2ce85ba-1f7b-478f-8be4-052d7e2dab69\test_quota_check_1792637249976.jpg"
    raw = Image.open(raw_path).convert("RGBA")
    arr = np.asarray(raw, dtype=np.float32)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]

    # Red frame
    is_red = (r > 125) & (g < 105) & (b < 105)
    # Dark tinted lens
    is_dark = (r < 95) & (g < 95) & (b < 95)
    # Lens glint
    is_highlight = (r > 150) & (g > 150) & (b > 150) & (ndimage.binary_dilation(is_dark, iterations=6))

    valid = is_red | is_dark | is_highlight
    valid = ndimage.binary_fill_holes(valid)
    valid = ndimage.binary_opening(valid, iterations=1)

    # Keep only largest connected component (the glasses)
    labeled, num_features = ndimage.label(valid)
    if num_features > 0:
        sizes = ndimage.sum(valid, labeled, range(1, num_features + 1))
        largest = np.argmax(sizes) + 1
        valid = (labeled == largest)

    alpha = np.where(valid, 255, 0).astype(np.uint8)
    alpha_im = Image.fromarray(alpha, "L").filter(ImageFilter.GaussianBlur(1.2))

    cutout = Image.new("RGBA", raw.size)
    cutout.paste(raw, (0, 0))
    cutout.putalpha(alpha_im)

    # Crop tight bbox
    bbox = cutout.getbbox()
    cropped = cutout.crop(bbox)
    cw, ch = cropped.size

    # Position at eyes (372, 430) and (652, 430)
    canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    target_w = 490
    target_h = int(ch * (target_w / float(cw)))
    resized = cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)
    canvas.paste(resized, (int(512 - target_w / 2.0), int(430 - target_h / 2.0)), resized)

    out_path = os.path.join(SKIN_DIR, "wear", "wear_heart.png")
    canvas.save(out_path)
    print(f"Fixed: {out_path}")


# =========================================================================
# 2. FIX wear_mask (Clean surgical mask with pleats and loops, NO white square box)
# =========================================================================
def fix_wear_mask():
    W, H = 1024, 1024
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    # Mask covers mouth/snout below eyes: x: 310..714, y: 460..670
    x0, y0, x1, y1 = 310, 470, 714, 675

    # Curved elastic earloops extending outward to ears
    d.arc([190, 480, 340, 660], start=90, end=270, fill=(250, 252, 255, 230), width=6)
    d.arc([684, 480, 834, 660], start=270, end=90, fill=(250, 252, 255, 230), width=6)
    # Loop contact shadows
    d.arc([192, 482, 342, 662], start=90, end=270, fill=(180, 195, 205, 120), width=3)
    d.arc([682, 482, 832, 662], start=270, end=90, fill=(180, 195, 205, 120), width=3)

    # Surgical Mask Body: Realistic light cyan-blue medical non-woven fabric
    mask_poly = [
        (x0 + 15, y0 + 10), (512, y0), (x1 - 15, y0 + 10),
        (x1, y0 + 40), (x1 - 10, y1 - 20), (512, y1),
        (x0 + 10, y1 - 20), (x0, y0 + 40)
    ]
    d.polygon(mask_poly, fill=(185, 228, 240, 255), outline=(135, 195, 215, 255), width=4)

    # Horizontal medical pleats (with realistic shadow & highlight fold lines)
    for py, fold_depth in [(y0 + 50, 6), (y0 + 95, 8), (y0 + 140, 8)]:
        # Shadow fold
        d.line([(x0 + 12, py), (x1 - 12, py)], fill=(125, 185, 205, 255), width=5)
        # Highlight fold edge
        d.line([(x0 + 12, py - 3), (x1 - 12, py - 3)], fill=(235, 248, 255, 240), width=3)

    # Top nose bridge wire strip
    d.line([(x0 + 60, y0 + 8), (x1 - 60, y0 + 8)], fill=(155, 210, 228, 255), width=6)
    # Border piping seams on left and right
    d.line([(x0 + 8, y0 + 20), (x0 + 8, y1 - 15)], fill=(155, 210, 228, 255), width=5)
    d.line([(x1 - 8, y0 + 20), (x1 - 8, y1 - 15)], fill=(155, 210, 228, 255), width=5)

    # Soft fabric texture noise
    arr = np.asarray(im, dtype=np.float32)
    mask = arr[..., 3] > 0
    rng = np.random.default_rng(55)
    noise = rng.normal(0, 4.0, (H, W))
    for ch in range(3):
        arr[mask, ch] = np.clip(arr[mask, ch] + noise[mask], 0, 255)

    final_mask = Image.fromarray(arr.astype(np.uint8), "RGBA")
    out_path = os.path.join(SKIN_DIR, "wear", "wear_mask.png")
    final_mask.save(out_path)
    print(f"Fixed: {out_path}")


# =========================================================================
# 3. FIX wear_eyepatch (Over Left Eye 372,430, Diagonal Strap, Right Eye Open)
# =========================================================================
def fix_wear_eyepatch():
    W, H = 1024, 1024
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    lex, ley = LEFT_EYE  # (372, 430)

    # DIAGONAL STRAP: Passes from top-left (200, 280) through left eye down across to bottom-right (780, 580)
    # Behind the patch
    strap_pts = [(190, 260), (840, 570)]
    d.line(strap_pts, fill=(28, 26, 26, 255), width=16)
    d.line([(190, 258), (840, 568)], fill=(65, 60, 60, 255), width=4)  # Highlight

    # Eyepatch Cup: Centered exactly over Left Eye (372, 430)
    patch_pts = [
        (lex - 82, ley - 68),
        (lex + 78, ley - 58),
        (lex + 68, ley + 78),
        (lex - 72, ley + 72),
    ]
    d.polygon(patch_pts, fill=(35, 32, 32, 255), outline=(18, 16, 16, 255), width=6)
    # Stitched leather border
    d.polygon([(lex - 75, ley - 62), (lex + 71, ley - 52), (lex + 61, ley + 71), (lex - 65, ley + 65)], outline=(75, 68, 65, 255), width=2)

    # Embossed Pirate Skull & Crossed Bones on Eyepatch Cup
    d.ellipse([lex - 24, ley - 15 - 20, lex + 24, ley - 15 + 20], fill=(245, 245, 245, 255), outline=(150, 150, 150, 255), width=2)
    # Eye holes in skull
    d.ellipse([lex - 14, ley - 18, lex - 4, ley - 6], fill=(30, 28, 28, 255))
    d.ellipse([lex + 4, ley - 18, lex + 14, ley - 6], fill=(30, 28, 28, 255))
    # Teeth
    d.rectangle([lex - 12, ley + 5, lex + 12, ley + 18], fill=(245, 245, 245, 255))
    for tx in (-6, 0, 6):
        d.line([(lex + tx, ley + 5), (lex + tx, ley + 18)], fill=(40, 40, 40, 255), width=2)
    # Crossbones beneath skull
    d.line([(lex - 36, ley + 28), (lex + 36, ley + 28)], fill=(245, 245, 245, 255), width=6)

    # Leather grain noise
    arr = np.asarray(im, dtype=np.float32)
    mask = arr[..., 3] > 0
    rng = np.random.default_rng(77)
    noise = rng.normal(0, 5.0, (H, W))
    for ch in range(3):
        arr[mask, ch] = np.clip(arr[mask, ch] + noise[mask], 0, 255)

    final_patch = Image.fromarray(arr.astype(np.uint8), "RGBA")
    out_path = os.path.join(SKIN_DIR, "wear", "wear_eyepatch.png")
    final_patch.save(out_path)
    print(f"Fixed: {out_path}")


# =========================================================================
# 4. FIX wear_gasmask & prop_gasmask (Distinct dual goggles, snout filter, straps - NOT a giant black ball)
# =========================================================================
def fix_wear_gasmask():
    W, H = 1024, 1024
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    lex, ley = LEFT_EYE   # (372, 430)
    rex, rey = RIGHT_EYE  # (652, 430)
    snout_x, snout_y = 512, 570

    # 1. Adjustable Rubber Head Harness Straps (Running outward from goggles & snout)
    d.line([(lex - 60, ley), (160, 390)], fill=(38, 42, 44, 255), width=16)
    d.line([(rex + 60, rey), (864, 390)], fill=(38, 42, 44, 255), width=16)
    d.line([(snout_x, snout_y), (220, 660)], fill=(38, 42, 44, 255), width=14)
    d.line([(snout_x, snout_y), (804, 660)], fill=(38, 42, 44, 255), width=14)

    # 2. Nose bridge connector piece between goggles
    d.rectangle([lex + 40, ley - 15, rex - 40, ley + 15], fill=(55, 68, 58, 255), outline=(25, 30, 26, 255), width=3)

    # 3. Triangular Snout/Mouthpiece Body (Connecting goggles down to filter)
    snout_poly = [(lex + 30, ley + 20), (rex - 30, rey + 20), (580, snout_y + 40), (444, snout_y + 40)]
    d.polygon(snout_poly, fill=(58, 72, 62, 255), outline=(25, 32, 28, 255), width=4)

    # 4. Two Large Circular Goggle Eyepieces (Transparent reflective glass with metal/rubber rims)
    for ex in (lex, rex):
        # Outer heavy rubber bezel
        d.ellipse([ex - 75, ley - 75, ex + 75, ley + 75], fill=(35, 40, 38, 255), outline=(18, 22, 20, 255), width=6)
        # Metallic inner rim
        d.ellipse([ex - 62, ley - 62, ex + 62, ley + 62], fill=(65, 75, 70, 255), outline=(140, 155, 145, 255), width=3)
        # Reflective glass lens (Translucent cyan-green glass so eyes partially peek through)
        d.ellipse([ex - 52, ley - 52, ex + 52, ley + 52], fill=(165, 225, 240, 160))
        # White specular glare arc on glass
        d.arc([ex - 42, ley - 42, ex + 42, ley + 42], start=210, end=320, fill=(255, 255, 255, 220), width=6)

    # 5. Protruding Military Snout Filter Canister at Bottom (With horizontal ribs and air vents)
    # Heavy cylindrical canister
    fx0, fy0, fx1, fy1 = snout_x - 85, snout_y - 20, snout_x + 85, snout_y + 110
    d.rounded_rectangle([fx0, fy0, fx1, fy1], radius=24, fill=(45, 55, 48, 255), outline=(20, 26, 22, 255), width=5)
    # Ribbed canister bands
    for ry in range(fy0 + 25, fy1 - 15, 20):
        d.line([(fx0 + 8, ry), (fx1 - 8, ry)], fill=(75, 90, 80, 255), width=4)
        d.line([(fx0 + 8, ry + 3), (fx1 - 8, ry + 3)], fill=(25, 32, 28, 255), width=2)
    # Front circular intake grill
    d.ellipse([snout_x - 45, snout_y + 40, snout_x + 45, snout_y + 95], fill=(30, 36, 32, 255), outline=(65, 78, 70, 255), width=3)
    for vy in range(snout_y + 52, snout_y + 85, 8):
        d.line([(snout_x - 30, vy), (snout_x + 30, vy)], fill=(15, 18, 16, 255), width=3)

    out_path = os.path.join(SKIN_DIR, "wear", "wear_gasmask.png")
    im.save(out_path)
    print(f"Fixed: {out_path}")


def fix_prop_gasmask():
    W, H = 1024, 1024
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    # Recognizable military gas mask resting on the ground
    cx, cy = 512, 510

    # Harness straps trailing onto floor
    for sx, sy in [(280, 420), (744, 420), (320, 720), (704, 720)]:
        d.line([(cx, cy), (sx, sy)], fill=(35, 40, 38, 255), width=16)

    # Olive drab rubber mask hood
    hood = [(400, 340), (624, 340), (690, 520), (590, 710), (434, 710), (334, 520)]
    d.polygon(hood, fill=(62, 78, 68, 255), outline=(25, 32, 28, 255), width=6)

    # Two prominent circular goggle eyepieces
    for gx in (430, 594):
        d.ellipse([gx - 65, 430 - 65, gx + 65, 430 + 65], fill=(32, 38, 35, 255), outline=(15, 20, 18, 255), width=6)
        d.ellipse([gx - 50, 430 - 50, gx + 50, 430 + 50], fill=(165, 225, 240, 200), outline=(140, 165, 150, 255), width=3)
        d.arc([gx - 40, 430 - 40, gx + 40, 430 + 40], start=210, end=320, fill=(255, 255, 255, 240), width=6)

    # Screw-in cylindrical filter canister on snout
    d.rounded_rectangle([cx - 95, 590, cx + 95, 760], radius=28, fill=(42, 52, 45, 255), outline=(18, 24, 20, 255), width=6)
    for ry in range(620, 740, 22):
        d.line([(cx - 85, ry), (cx + 85, ry)], fill=(75, 92, 80, 255), width=5)
    d.ellipse([cx - 50, 670, cx + 50, 735], fill=(25, 32, 28, 255), outline=(65, 80, 70, 255), width=3)

    out_path = os.path.join(SKIN_DIR, "prop", "prop_gasmask.png")
    im.save(out_path)
    print(f"Fixed: {out_path}")


# =========================================================================
# 5. FIX prop_extinguisher & prop_spray (Clean right-side smudge and floor shadow)
# =========================================================================
def fix_clean_prop(raw_filename: str, target_id: str):
    raw_path = os.path.join(ARTIFACT_DIR, raw_filename)
    raw = Image.open(raw_path).convert("RGBA")
    arr = np.asarray(raw, dtype=np.float32)
    rgb = arr[..., :3]

    # Calculate distance from white
    dist = np.sqrt(np.sum((255.0 - rgb)**2, axis=-1))

    # Stricter threshold to eliminate soft ground shadows (dist must be > 45)
    valid = dist > 45.0

    # Fill internal holes (so white labels on extinguisher/spray aren't hollowed out)
    valid = ndimage.binary_fill_holes(valid)

    # Remove small noise speckles / smudges on the sides
    labeled, num_features = ndimage.label(valid)
    if num_features > 0:
        sizes = ndimage.sum(valid, labeled, range(1, num_features + 1))
        largest = np.argmax(sizes) + 1
        valid = (labeled == largest)

    # Apply morphological opening to shave off fuzzy edge shadows
    valid = ndimage.binary_opening(valid, iterations=2)
    valid = ndimage.binary_fill_holes(valid)

    alpha = np.where(valid, 255, 0).astype(np.uint8)
    alpha_im = Image.fromarray(alpha, "L").filter(ImageFilter.GaussianBlur(1.0))

    cutout = Image.new("RGBA", raw.size)
    cutout.paste(raw, (0, 0))
    cutout.putalpha(alpha_im)

    # Crop tight bbox
    bbox = cutout.getbbox()
    cropped = cutout.crop(bbox)
    cw, ch = cropped.size

    # Fit cleanly on 1024x1024
    canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    scale = min(720.0 / float(cw), 720.0 / float(ch))
    new_w, new_h = max(1, int(cw * scale)), max(1, int(ch * scale))
    resized = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)
    canvas.paste(resized, (int(512 - new_w / 2.0), int(560 - new_h / 2.0)), resized)

    out_path = os.path.join(SKIN_DIR, "prop", f"{target_id}.png")
    canvas.save(out_path)
    print(f"Fixed: {out_path}")


# =========================================================================
# 6. FIX wear_party (Remove chin strap completely)
# =========================================================================
def fix_wear_party():
    # Load the upgraded 3D party hat and remove any chin strap pixels (y > 330)
    current_path = os.path.join(SKIN_DIR, "wear", "wear_party.png")
    im = Image.open(current_path).convert("RGBA")
    arr = np.asarray(im).copy()

    # The hat itself is in y: 40..315. Erase anything below y=318 (the chin strap)
    arr[318:, :, :] = 0

    clean_hat = Image.fromarray(arr, "RGBA")
    clean_hat.save(current_path)
    print(f"Fixed (removed chin strap): {current_path}")


def fix_all_eight():
    print(">>> Fixing the 8 problematic assets...")
    fix_wear_heart()
    fix_wear_mask()
    fix_wear_eyepatch()
    fix_wear_gasmask()
    fix_prop_gasmask()
    fix_clean_prop("raw_prop_extinguisher_1792637636206.jpg", "prop_extinguisher")
    fix_clean_prop("raw_prop_spray_1792637654799.jpg", "prop_spray")
    fix_wear_party()
    print(">>> All 8 problematic assets fixed with surgical precision!")


if __name__ == "__main__":
    fix_all_eight()
