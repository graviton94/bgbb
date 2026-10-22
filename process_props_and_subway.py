# -*- coding: utf-8 -*-
import os
import math
import numpy as np
from PIL import Image
from scipy import ndimage

ARTIFACT_DIR = r"C:\Users\ruahn49\.gemini\antigravity\brain\b2ce85ba-1f7b-478f-8be4-052d7e2dab69"
PROP_DIR = r"c:\bgbb\assets\skin\prop"
BG_DIR = r"c:\bgbb\assets\skin\bg"

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

def process_prop(raw_filename, out_filename, max_dim=820):
    raw_path = os.path.join(ARTIFACT_DIR, raw_filename)
    raw = Image.open(raw_path)
    cutout = extract_alpha_from_white(raw)
    bbox = get_tight_bbox(cutout)
    if bbox:
        cropped = cutout.crop(bbox)
    else:
        cropped = cutout

    cw, ch = cropped.size
    scale = max_dim / float(max(cw, ch))
    tw, th = int(cw * scale), int(ch * scale)
    resized = cropped.resize((tw, th), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    px = int((1024 - tw) / 2.0)
    py = int((1024 - th) / 2.0)
    canvas.paste(resized, (px, py), resized)

    out_path = os.path.join(PROP_DIR, out_filename)
    canvas.save(out_path, "PNG")
    print(f"Prop saved: {out_path} ({tw}x{th})")
    return canvas

def process_bg(raw_filename, out_filename):
    raw_path = os.path.join(ARTIFACT_DIR, raw_filename)
    raw = Image.open(raw_path).convert("RGBA")
    
    # Target is 1080x2340
    tw, th = 1080, 2340
    rw, rh = raw.size
    scale = max(tw / float(rw), th / float(rh))
    nw, nh = int(rw * scale), int(rh * scale)
    resized = raw.resize((nw, nh), Image.Resampling.LANCZOS)

    # Center crop
    left = int((nw - tw) / 2.0)
    top = int((nh - th) / 2.0)
    cropped = resized.crop((left, top, left + tw, top + th))

    out_path = os.path.join(BG_DIR, out_filename)
    cropped.save(out_path, "PNG")
    print(f"BG saved: {out_path} ({tw}x{th})")

# Process 5 props
props = [
    ("raw_prop_candle_1792655443040.jpg", "prop_candle.png", 760),
    ("raw_prop_fan_front_1792655478010.jpg", "prop_fan.png", 820),
    ("raw_prop_sweetpotato_1792655496475.jpg", "prop_sweetpotato.png", 820),
    ("raw_prop_beans_1792655515448.jpg", "prop_beans.png", 800),
    ("raw_prop_milk_1792655534468.jpg", "prop_milk.png", 760),
]

for rfn, ofn, mdim in props:
    process_prop(rfn, ofn, mdim)

# Process subway BG
process_bg("raw_bg_subway_1792655536929.jpg", "bg_subway.png")
print("Done processing props and subway BG!")
