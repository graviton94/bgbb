# -*- coding: utf-8 -*-
import os
import math
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ARTIFACT_DIR = r"C:\Users\ruahn49\.gemini\antigravity\brain\b2ce85ba-1f7b-478f-8be4-052d7e2dab69"
TARGET_DIR = r"c:\bgbb\assets\skin\wear"
HAMSTER_BASE = r"c:\bgbb\assets\expressions_real\hamster_1_blank.png"

def extract_alpha_from_white(img: Image.Image, bg_thresh: float = 246.0, feather: float = 1.5) -> Image.Image:
    im = img.convert("RGBA")
    arr = np.asarray(im, dtype=np.float32)
    rgb = arr[..., :3]

    dist_from_white = np.sqrt(np.sum((255.0 - rgb) ** 2, axis=-1))
    thresh = (255.0 - bg_thresh) * math.sqrt(3)

    bg_mask = (dist_from_white <= thresh).astype(np.uint8)
    struct = ndimage.generate_binary_structure(2, 2)
    labeled, _ = ndimage.label(bg_mask, structure=struct)
    corner_labels = set([labeled[0, 0], labeled[0, -1], labeled[-1, 0], labeled[-1, -1]])
    true_bg = np.isin(labeled, list(corner_labels))

    alpha = np.ones((img.height, img.width), dtype=np.float32) * 255.0
    alpha_soft = np.clip(dist_from_white / (thresh + 1e-5), 0.0, 1.0) * 255.0
    alpha[true_bg] = alpha_soft[true_bg]

    arr[..., 3] = np.clip(alpha, 0, 255).astype(np.uint8)
    a_norm = arr[..., 3:4] / 255.0
    arr[..., :3] = np.clip((arr[..., :3] - 255.0 * (1.0 - a_norm)) / np.maximum(a_norm, 0.05), 0, 255)

    return Image.fromarray(arr.astype(np.uint8), "RGBA")

def get_tight_bbox(img: Image.Image, alpha_thresh: int = 20):
    arr = np.asarray(img)
    a = arr[..., 3] > alpha_thresh
    if not np.any(a):
        return None
    rows = np.any(a, axis=1)
    cols = np.any(a, axis=0)
    ymin, ymax = np.where(rows)[0][[0, -1]]
    xmin, xmax = np.where(cols)[0][[0, -1]]
    return (xmin, ymin, xmax + 1, ymax + 1)

def process_item(raw_filename, out_filename, target_w, center_x, center_y):
    raw_path = os.path.join(ARTIFACT_DIR, raw_filename)
    raw = Image.open(raw_path)
    cutout = extract_alpha_from_white(raw)
    bbox = get_tight_bbox(cutout)
    if bbox:
        cropped = cutout.crop(bbox)
    else:
        cropped = cutout

    cw, ch = cropped.size
    scale = target_w / float(cw)
    target_h = int(ch * scale)
    resized = cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    px = int(center_x - target_w / 2.0)
    py = int(center_y - target_h / 2.0)
    canvas.paste(resized, (px, py), resized)

    out_path = os.path.join(TARGET_DIR, out_filename)
    canvas.save(out_path, "PNG")
    print(f"Saved: {out_path} ({target_w}x{target_h} at {px},{py})")
    return canvas

items = [
    # (raw_file, target_file, target_w, center_x, center_y)
    ("raw_wear_crown_1792655285335.jpg", "wear_crown.png", 460, 512, 175),
    ("raw_wear_headset_1792655306115.jpg", "wear_headset.png", 620, 512, 380),
    ("raw_wear_ribbon_1792655325790.jpg", "wear_ribbon.png", 480, 512, 190),
    ("raw_wear_nerd_1792655348739.jpg", "wear_nerd.png", 490, 512, 430),
    ("raw_wear_bandana_1792655369982.jpg", "wear_bandana.png", 540, 512, 330),
    ("raw_wear_santa_1792655396323.jpg", "wear_santa.png", 520, 525, 170),
]

canvases = []
for raw_fn, out_fn, tw, cx, cy in items:
    c = process_item(raw_fn, out_fn, tw, cx, cy)
    canvases.append((out_fn, c))

# Build proof sheet with hamster base
hamster = Image.open(HAMSTER_BASE).convert("RGBA")
proof = Image.new("RGBA", (1024 * 3, 1024 * 2), (240, 243, 246, 255))

for idx, (name, wear_img) in enumerate(canvases):
    r = idx // 3
    col = idx % 3
    comp = Image.alpha_composite(hamster, wear_img)
    proof.paste(comp, (col * 1024, r * 1024))

proof_path = os.path.join(ARTIFACT_DIR, "wear_batch2_proof.png")
proof.save(proof_path, "PNG")
print("Proof saved to:", proof_path)
