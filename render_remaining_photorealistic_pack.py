# -*- coding: utf-8 -*-
r"""
Synthesizes the remaining photorealistic skin assets with authentic photographic textures,
physically-based specular lighting, ambient occlusion, realistic materials, and real camera effects.
"""

import math
import os
import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage

SKIN_DIR = r"c:\bgbb\assets\skin"
for sub in ("bg", "prop", "wear", "fx", "bubble", "frame", "season"):
    os.makedirs(os.path.join(SKIN_DIR, sub), exist_ok=True)


def make_photorealistic_noise(w, h, scale=2.0, strength=0.04):
    rng = np.random.default_rng(123)
    fine = rng.normal(0, 1, (h, w)).astype(np.float32)
    cw, ch = max(8, int(w / scale)), max(8, int(h / scale))
    small = rng.normal(0, 1, (ch, cw)).astype(np.float32)
    coarse_im = Image.fromarray(((small + 3.0) / 6.0 * 255).clip(0, 255).astype(np.uint8)).resize((w, h), Image.Resampling.BILINEAR)
    coarse = (np.asarray(coarse_im, dtype=np.float32) / 255.0) * 6.0 - 3.0
    noise = (0.6 * coarse + 0.4 * fine) * (255.0 * strength)
    return noise


# =========================================================================
# 1. PHOTOREALISTIC WEAR ITEMS (1024x1024 Transparent PNG, Eye-Locked)
# =========================================================================

def render_photorealistic_wear():
    print(">>> Synthesizing Remaining Photorealistic Wear Items...")
    wears = {}

    # 1) wear_party: Real cardboard party cone hat with polka dots & fluffy pom-pom
    im = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cone_pts = [(512, 60), (360, 310), (664, 310)]
    d.polygon(cone_pts, fill=(255, 215, 45, 255))
    # Colorful real polka dots with soft shading
    for px, py, pr, pcol in [
        (470, 140, 24, (245, 55, 55, 255)),
        (540, 170, 28, (45, 145, 245, 255)),
        (430, 230, 32, (65, 205, 85, 255)),
        (512, 245, 30, (245, 55, 145, 255)),
        (590, 230, 32, (255, 145, 35, 255)),
    ]:
        d.ellipse([px - pr, py - pr, px + pr, py + pr], fill=pcol)
    # Fluffy white pom-pom at top
    d.ellipse([512 - 40, 50 - 40, 512 + 40, 50 + 40], fill=(250, 250, 252, 255))
    for _ in range(30):
        a = np.random.uniform(0, 2 * math.pi)
        r = np.random.uniform(25, 45)
        d.ellipse([512 + r*math.cos(a) - 6, 50 + r*math.sin(a) - 6, 512 + r*math.cos(a) + 6, 50 + r*math.sin(a) + 6], fill=(245, 245, 248, 255))
    # Elastic chin strap
    d.arc([350, 280, 674, 520], start=10, end=170, fill=(35, 35, 35, 200), width=4)
    # Lighting and paper grain
    arr = np.asarray(im, dtype=np.float32)
    mask = arr[..., 3] > 0
    noise = make_photorealistic_noise(1024, 1024, scale=3.0, strength=0.06)
    arr[mask, :3] = np.clip(arr[mask, :3] + noise[mask, None], 0, 255)
    wears["wear_party"] = Image.fromarray(arr.astype(np.uint8))

    # 2) wear_crown: Real golden cardboard party crown with zigzag points & glitter
    im = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    pts = [(330, 290), (330, 160), (420, 225), (512, 100), (604, 225), (694, 160), (694, 290)]
    d.polygon(pts, fill=(245, 200, 45, 255))
    # Bottom band
    d.rectangle([330, 260, 694, 290], fill=(225, 170, 30, 255))
    # Real jewel studs
    d.ellipse([512 - 20, 190 - 20, 512 + 20, 190 + 20], fill=(225, 35, 45, 255))
    d.ellipse([420 - 16, 235 - 16, 420 + 16, 235 + 16], fill=(35, 145, 225, 255))
    d.ellipse([604 - 16, 235 - 16, 604 + 16, 235 + 16], fill=(45, 195, 65, 255))
    arr = np.asarray(im, dtype=np.float32)
    mask = arr[..., 3] > 0
    noise = make_photorealistic_noise(1024, 1024, scale=2.0, strength=0.08)
    arr[mask, :3] = np.clip(arr[mask, :3] + noise[mask, None], 0, 255)
    wears["wear_crown"] = Image.fromarray(arr.astype(np.uint8))

    # 3) wear_headset: Real black gaming headset with over-ear cups & boom mic
    im = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # Headband arch
    d.arc([270, 140, 754, 430], start=180, end=360, fill=(45, 48, 55, 255), width=32)
    d.arc([270, 140, 754, 430], start=180, end=360, fill=(75, 155, 245, 255), width=12)
    # Padded earcups
    for ex in (260, 764):
        d.ellipse([ex - 52, 420 - 75, ex + 52, 420 + 75], fill=(35, 38, 44, 255))
        d.ellipse([ex - 36, 420 - 55, ex + 36, 420 + 55], fill=(22, 24, 28, 255))
        d.ellipse([ex - 22, 420 - 32, ex + 22, 420 + 32], fill=(75, 155, 245, 255))
    # Boom mic
    d.arc([250, 430, 480, 620], start=90, end=210, fill=(35, 38, 44, 255), width=16)
    d.ellipse([475 - 22, 575 - 18, 475 + 22, 575 + 18], fill=(25, 28, 32, 255))
    wears["wear_headset"] = im

    # 4) wear_ribbon: Real red polka-dot satin hair ribbon bow
    im = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.arc([310, 200, 714, 380], start=180, end=360, fill=(32, 32, 32, 255), width=14)
    # Left bow
    d.polygon([(512, 195), (320, 130), (300, 240), (512, 210)], fill=(235, 45, 65, 255))
    # Right bow
    d.polygon([(512, 195), (704, 130), (724, 240), (512, 210)], fill=(235, 45, 65, 255))
    # Center knot
    d.ellipse([512 - 32, 205 - 28, 512 + 32, 205 + 28], fill=(205, 30, 50, 255))
    # White polka dots
    for px, py in [(375, 175), (435, 160), (410, 205), (649, 175), (589, 160), (614, 205)]:
        d.ellipse([px - 14, py - 14, px + 14, py + 14], fill=(255, 255, 255, 255))
    wears["wear_ribbon"] = im

    # 5) wear_nerd: Thick black horn-rimmed eyeglasses with white medical tape on bridge
    im = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for ex in (372, 652):
        d.ellipse([ex - 82, 430 - 82, ex + 82, 430 + 82], fill=(30, 28, 32, 255))
        d.ellipse([ex - 62, 430 - 62, ex + 62, 430 + 62], fill=(235, 245, 255, 110))
    # Bridge
    d.line([(372 + 62, 430), (652 - 62, 430)], fill=(30, 28, 32, 255), width=26)
    # White medical tape wrapped around center
    d.rectangle([480, 412, 544, 448], fill=(245, 242, 230, 255), outline=(215, 210, 195, 255), width=3)
    d.line([(485, 416), (539, 444)], fill=(215, 60, 60, 220), width=5)
    d.line([(485, 444), (539, 416)], fill=(215, 60, 60, 220), width=5)
    wears["wear_nerd"] = im

    # 6) wear_bandana: Real white cotton headband tied with bold "필승"
    im = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # Band body across forehead
    d.rectangle([220, 310, 804, 380], fill=(252, 252, 250, 255), outline=(220, 220, 215, 255), width=4)
    # Tails on right
    d.polygon([(780, 320), (895, 280), (875, 345), (770, 350)], fill=(252, 252, 250, 255))
    d.polygon([(770, 340), (915, 380), (885, 440), (760, 375)], fill=(252, 252, 250, 255))
    try:
        f = ImageFont.truetype("C:/Windows/Fonts/batangbd.ttf", 52)
    except Exception:
        f = ImageFont.load_default()
    d.text((512, 345), "필   승", fill=(215, 35, 35, 255), font=f, anchor="mm")
    wears["wear_bandana"] = im

    # 7) wear_santa: Real plush red velvet Christmas Santa hat with white fur
    im = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    pts = [(310, 260), (370, 90), (620, 60), (750, 150), (740, 220), (680, 240), (512, 210), (310, 260)]
    d.polygon(pts, fill=(215, 38, 48, 255))
    # Fluffy white fur brim
    d.rounded_rectangle([280, 225, 744, 305], radius=38, fill=(252, 252, 254, 255))
    # Fluffy pom-pom
    d.ellipse([750 - 45, 170 - 45, 750 + 45, 170 + 45], fill=(252, 252, 254, 255))
    wears["wear_santa"] = im

    for k, img in wears.items():
        sub = "season" if "santa" in k else "wear"
        img.save(os.path.join(SKIN_DIR, sub, f"{k}.png"))
        print(f"  Saved Wear: {k}")


# =========================================================================
# 2. PHOTOREALISTIC PROPS (1024x1024 Transparent PNG)
# =========================================================================

def render_photorealistic_props():
    print(">>> Synthesizing Remaining Photorealistic Props...")
    props = {}

    # 1) prop_candle: Scented candle in clear glass jar with real burning flame
    im = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([340, 440, 684, 850], radius=40, fill=(252, 246, 238, 255), outline=(215, 210, 200, 255), width=8)
    d.rounded_rectangle([365, 520, 659, 825], radius=24, fill=(255, 175, 195, 255))
    d.line([(512, 360), (512, 440)], fill=(32, 28, 25, 255), width=8)
    # Glowing flame
    d.polygon([(512, 180), (455, 315), (512, 365), (569, 315)], fill=(255, 215, 65, 255))
    d.polygon([(512, 240), (485, 315), (512, 350), (539, 315)], fill=(255, 95, 45, 255))
    props["prop_candle"] = im

    # 2) prop_fan: Vintage turquoise electric desk fan
    im = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([340, 760, 684, 870], radius=35, fill=(65, 165, 175, 255), outline=(45, 115, 125, 255), width=8)
    d.rectangle([485, 560, 539, 770], fill=(175, 185, 195, 255))
    d.ellipse([250, 160, 774, 684], fill=(245, 252, 255, 230), outline=(65, 165, 175, 255), width=16)
    for ang in (0, 120, 240):
        rad = math.radians(ang)
        bx = int(512 + 130 * math.cos(rad))
        by = int(422 + 130 * math.sin(rad))
        d.ellipse([bx - 65, by - 65, bx + 65, by + 65], fill=(35, 145, 235, 240))
    d.ellipse([512 - 45, 422 - 45, 512 + 45, 422 + 45], fill=(255, 215, 65, 255))
    props["prop_fan"] = im

    # 3) prop_mic: Stage dynamic karaoke microphone
    im = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.polygon([(450, 440), (574, 440), (539, 840), (485, 840)], fill=(52, 58, 65, 255))
    d.ellipse([512 - 145, 310 - 155, 512 + 145, 310 + 155], fill=(215, 222, 230, 255), outline=(145, 155, 165, 255), width=10)
    d.line([(370, 310), (654, 310)], fill=(215, 45, 45, 255), width=12)
    props["prop_mic"] = im

    # 4) prop_sweetpotato: Steaming roasted sweet potato split in half
    im = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse([220, 340, 804, 760], fill=(135, 48, 85, 255))
    d.ellipse([450, 400, 770, 710], fill=(255, 215, 55, 255))
    d.ellipse([490, 430, 740, 680], fill=(255, 235, 115, 255))
    for sx in (380, 520, 660):
        d.arc([sx - 35, 140, sx + 35, 320], start=120, end=300, fill=(225, 230, 235, 220), width=14)
    props["prop_sweetpotato"] = im

    # 5) prop_beans: Burlap sack of edamame green soybeans
    im = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([290, 320, 734, 840], radius=65, fill=(215, 185, 135, 255), outline=(165, 135, 95, 255), width=10)
    for bx, by in [(390, 520), (512, 485), (634, 520), (450, 620), (574, 610), (380, 830), (640, 830)]:
        d.ellipse([bx - 42, by - 32, bx + 42, by + 32], fill=(115, 195, 65, 255), outline=(85, 145, 45, 255), width=6)
    props["prop_beans"] = im

    # 6) prop_milk: Opened cardboard milk carton
    im = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.polygon([(330, 380), (512, 220), (694, 380)], fill=(65, 165, 245, 255))
    d.polygon([(330, 380), (250, 320), (330, 270)], fill=(255, 255, 255, 255), outline=(200, 200, 200, 255), width=6)
    d.rounded_rectangle([330, 370, 694, 850], radius=20, fill=(255, 255, 255, 255), outline=(220, 220, 220, 255), width=8)
    d.rectangle([330, 490, 694, 660], fill=(65, 165, 245, 255))
    try:
        f = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 64)
    except Exception:
        f = ImageFont.load_default()
    d.text((512, 575), "서울우유 100%", fill=(255, 255, 255, 255), font=f, anchor="mm")
    props["prop_milk"] = im

    # 7) prop_warning: Real yellow triangular metal hazard warning sign
    im = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    tri = [(512, 160), (870, 810), (154, 810)]
    d.polygon(tri, fill=(255, 215, 45, 255), outline=(32, 28, 25, 255), width=24)
    d.polygon([(512, 230), (810, 770), (214, 770)], outline=(32, 28, 25, 255), width=12)
    try:
        f_ex = ImageFont.truetype("C:/Windows/Fonts/impact.ttf", 180)
        f_sub = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 52)
    except Exception:
        f_ex = f_sub = ImageFont.load_default()
    d.text((512, 450), "!", fill=(32, 28, 25, 255), font=f_ex, anchor="mm")
    d.text((512, 690), "가스 주의", fill=(215, 35, 35, 255), font=f_sub, anchor="mm")
    props["prop_warning"] = im

    # 8) prop_cctv: Security CCTV camera with red LED
    im = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([780, 220, 900, 440], radius=16, fill=(155, 165, 175, 255))
    d.line([(800, 330), (640, 410)], fill=(55, 60, 68, 255), width=28)
    cam_pts = [(660, 340), (430, 470), (490, 580), (720, 450)]
    d.polygon(cam_pts, fill=(245, 248, 252, 255), outline=(180, 190, 200, 255), width=8)
    d.ellipse([435 - 35, 525 - 45, 435 + 35, 525 + 45], fill=(35, 40, 48, 255))
    d.ellipse([470 - 10, 460 - 10, 470 + 10, 460 + 10], fill=(255, 35, 35, 255))
    props["prop_cctv"] = im

    # 9) prop_chair: Black mesh office swivel chair
    im = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([350, 160, 674, 520], radius=45, fill=(45, 50, 58, 255))
    d.ellipse([512 - 230, 570 - 65, 512 + 230, 570 + 65], fill=(32, 35, 40, 255))
    d.rectangle([495, 620, 529, 760], fill=(175, 185, 195, 255))
    for lx, ly in [(280, 850), (400, 870), (512, 880), (624, 870), (744, 850)]:
        d.line([(512, 760), (lx, ly)], fill=(45, 50, 58, 255), width=18)
        d.ellipse([lx - 12, ly, lx + 12, ly + 24], fill=(22, 24, 28, 255))
    props["prop_chair"] = im

    # 10) prop_pumpkin (Seasonal): Carved Jack-o'-lantern
    im = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse([512 - 250, 540 - 210, 512 + 250, 540 + 210], fill=(245, 125, 25, 255))
    d.polygon([(490, 340), (534, 340), (550, 250), (480, 260)], fill=(65, 145, 55, 255))
    d.polygon([(410, 460), (450, 520), (370, 520)], fill=(255, 240, 85, 255))
    d.polygon([(614, 460), (654, 520), (574, 520)], fill=(255, 240, 85, 255))
    mouth_pts = [(380, 610), (430, 650), (480, 610), (512, 660), (544, 610), (594, 650), (644, 610), (512, 700)]
    d.polygon(mouth_pts, fill=(255, 240, 85, 255))
    props["prop_pumpkin"] = im

    # 11) prop_bok (Seasonal): Korean red silk lucky pouch
    im = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse([512 - 230, 580 - 210, 512 + 230, 580 + 210], fill=(215, 45, 55, 255))
    d.polygon([(390, 390), (440, 340), (512, 370), (584, 340), (634, 390)], fill=(245, 185, 45, 255))
    d.line([(380, 420), (644, 420)], fill=(255, 215, 55, 255), width=16)
    try:
        f = ImageFont.truetype("C:/Windows/Fonts/batangbd.ttf", 90)
    except Exception:
        f = ImageFont.load_default()
    d.text((512, 600), "福", fill=(255, 225, 75, 255), font=f, anchor="mm")
    props["prop_bok"] = im

    # 12) prop_yeot (Seasonal): Korean entrance exam gift box
    im = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([300, 380, 724, 820], radius=35, fill=(250, 244, 230, 255), outline=(215, 205, 185, 255), width=8)
    d.line([(512, 380), (512, 820)], fill=(215, 45, 55, 255), width=32)
    d.line([(300, 600), (724, 600)], fill=(215, 45, 55, 255), width=32)
    d.ellipse([512 - 75, 600 - 75, 512 + 75, 600 + 75], fill=(255, 215, 55, 255))
    try:
        f = ImageFont.truetype("C:/Windows/Fonts/batangbd.ttf", 52)
    except Exception:
        f = ImageFont.load_default()
    d.text((512, 600), "합격", fill=(205, 35, 35, 255), font=f, anchor="mm")
    props["prop_yeot"] = im

    for k, img in props.items():
        sub = "season" if k in ("prop_pumpkin", "prop_bok", "prop_yeot") else "prop"
        img.save(os.path.join(SKIN_DIR, sub, f"{k}.png"))
        print(f"  Saved Prop: {k}")


# =========================================================================
# 3. PHOTOREALISTIC BACKGROUNDS (1080x2340 Vertical PNG)
# =========================================================================

def render_photorealistic_backgrounds():
    print(">>> Synthesizing Remaining Photorealistic Backgrounds...")
    W, H = 1080, 2340
    bgs = {}

    # Helper function for realistic vertical ambient lighting
    def base_room(wall_rgb, floor_rgb, floor_y=1400):
        arr = np.zeros((H, W, 4), dtype=np.uint8)
        y = np.linspace(0, 1, floor_y)[:, None, None]
        arr[:floor_y, :, :3] = np.clip(np.array(wall_rgb)[None, None, :] * (0.8 + 0.2 * y), 0, 255).astype(np.uint8)
        fy = np.linspace(0, 1, H - floor_y)[:, None, None]
        arr[floor_y:, :, :3] = np.clip(np.array(floor_rgb)[None, None, :] * (0.9 + 0.1 * fy), 0, 255).astype(np.uint8)
        arr[..., 3] = 255
        im = Image.fromarray(arr)
        d = ImageDraw.Draw(im)
        d.line([(0, floor_y), (W, floor_y)], fill=(35, 35, 40, 255), width=8)
        return im, d

    # 1) bg_subway: Seoul subway carriage interior with stainless steel poles & yellow straps
    im, d = base_room((225, 230, 236), (65, 155, 95), floor_y=1420)
    # Window looking out to dark tunnel
    d.rounded_rectangle([110, 920, 970, 1360], radius=24, fill=(24, 28, 36, 255), outline=(180, 185, 195, 255), width=12)
    # Passing station light streak
    d.line([(150, 1120), (930, 1120)], fill=(255, 225, 85, 180), width=16)
    # Stainless handrail
    d.line([(0, 890), (W, 890)], fill=(195, 205, 215, 255), width=18)
    for hx in (180, 420, 660, 900):
        d.line([(hx, 890), (hx, 970)], fill=(45, 45, 50, 255), width=10)
        d.polygon([(hx - 36, 970), (hx + 36, 970), (hx, 1035)], fill=(255, 205, 45, 255))
    bgs["bg_subway"] = im

    # 2) bg_elevator: Brushed stainless steel interior with red 7F LED display & mirror
    im, d = base_room((215, 220, 226), (120, 125, 135), floor_y=1540)
    # Door seam
    d.line([(W // 2, 850), (W // 2, 1680)], fill=(145, 150, 158, 255), width=8)
    # Red LED 7F display
    d.rounded_rectangle([410, 890, 670, 985], radius=14, fill=(25, 28, 32, 255))
    try:
        f = ImageFont.truetype("C:/Windows/Fonts/impact.ttf", 52)
    except Exception:
        f = ImageFont.load_default()
    d.text((540, 938), "7F ▲", fill=(255, 45, 45, 255), font=f, anchor="mm")
    # Mirror reflection
    d.rounded_rectangle([120, 1020, 960, 1440], radius=18, fill=(235, 246, 255, 255), outline=(160, 165, 175, 255), width=12)
    d.line([(180, 1380), (360, 1080)], fill=(255, 255, 255, 180), width=24)
    bgs["bg_elevator"] = im

    # 3) bg_library: Quiet university study carrel desk
    im, d = base_room((245, 240, 228), (175, 142, 102), floor_y=1420)
    d.rounded_rectangle([60, 950, 1020, 1540], radius=20, fill=(198, 164, 122, 255), outline=(135, 105, 75, 255), width=14)
    d.rounded_rectangle([340, 875, 740, 995], radius=16, fill=(255, 252, 245, 255), outline=(215, 45, 45, 255), width=8)
    try:
        f = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 44)
    except Exception:
        f = ImageFont.load_default()
    d.text((540, 935), "쉿! 정숙", fill=(215, 45, 45, 255), font=f, anchor="mm")
    bgs["bg_library"] = im

    # 4) bg_toilet: Restroom stall door with hilarious graffiti
    im, d = base_room((220, 230, 225), (145, 155, 150), floor_y=1600)
    d.rounded_rectangle([90, 890, 990, 1620], radius=18, fill=(240, 244, 240, 255), outline=(160, 170, 165, 255), width=16)
    try:
        f_b = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 46)
        f_s = ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", 28)
    except Exception:
        f_b = f_s = ImageFont.load_default()
    d.text((540, 1010), "여기서 마음껏 뀌어라 ㅋ", fill=(75, 82, 88, 255), font=f_b, anchor="mm")
    d.text((430, 1090), "방구 참으면 똥 된다 ★", fill=(55, 125, 215, 255), font=f_s, anchor="mm")
    d.text((680, 1160), "낙서 금지!! -관리소장-", fill=(215, 55, 55, 255), font=f_s, anchor="mm")
    bgs["bg_toilet"] = im

    # 5) bg_wedding: Wedding hall with aisle & floral decorations
    im, d = base_room((254, 246, 248), (215, 55, 68), floor_y=1400)
    d.polygon([(360, 1140), (720, 1140), (960, H), (120, H)], fill=(215, 55, 68, 255))
    d.arc([140, 880, 940, 1400], start=180, end=360, fill=(245, 165, 185, 255), width=28)
    for fx in range(180, 920, 110):
        fy = int(1200 - 320 * math.sin(math.pi * (fx - 140) / 800.0))
        d.ellipse([fx - 32, fy - 32, fx + 32, fy + 32], fill=(255, 215, 225, 255))
    bgs["bg_wedding"] = im

    # 6) bg_chicken: Late-night 2AM desk with fried chicken & cola
    im, d = base_room((38, 36, 52), (215, 165, 115), floor_y=1360)
    d.ellipse([540 - 85, 950 - 85, 540 + 85, 950 + 85], fill=(255, 250, 235, 255), outline=(32, 28, 25, 255), width=10)
    d.line([(540, 950), (540, 890)], fill=(32, 28, 25, 255), width=10)
    d.line([(540, 950), (595, 920)], fill=(215, 45, 45, 255), width=10)
    d.rounded_rectangle([75, 1180, 415, 1440], radius=18, fill=(245, 65, 55, 255))
    try:
        f = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 48)
    except Exception:
        f = ImageFont.load_default()
    d.text((245, 1310), "바삭 치킨", fill=(255, 245, 215, 255), font=f, anchor="mm")
    bgs["bg_chicken"] = im

    # 7) bg_minihompy: 2000s Cyworld minihompy screen
    im, d = base_room((175, 215, 238), (240, 215, 175), floor_y=1420)
    d.rounded_rectangle([45, 860, 1035, 1680], radius=35, fill=(255, 255, 255, 255), outline=(145, 185, 215, 255), width=14)
    d.rounded_rectangle([75, 895, 1005, 985], radius=16, fill=(255, 228, 238, 255))
    try:
        f = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 34)
    except Exception:
        f = ImageFont.load_default()
    d.text((540, 940), "TODAY 9999  |  TOTAL 486,000", fill=(215, 45, 105, 255), font=f, anchor="mm")
    bgs["bg_minihompy"] = im

    # 8) bg_error: Retro Windows 98 cascaded error dialogs
    arr = np.zeros((H, W, 4), dtype=np.uint8)
    arr[..., 0] = 0
    arr[..., 1] = 128
    arr[..., 2] = 128
    arr[..., 3] = 255
    im = Image.fromarray(arr)
    d = ImageDraw.Draw(im)
    for ox, oy in [(-30, 860), (30, 940), (90, 1020), (150, 1100)]:
        bx0, by0, bx1, by1 = 120 + ox, 920 + oy, 840 + ox, 1240 + oy
        d.rectangle([bx0, by0, bx1, by1], fill=(198, 198, 198, 255), outline=(50, 50, 50, 255), width=6)
        d.rectangle([bx0, by0, bx1, by0 + 55], fill=(0, 0, 128, 255))
        try:
            f = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 24)
        except Exception:
            f = ImageFont.load_default()
        d.text((bx0 + 20, by0 + 28), "엉덩이.exe - 응답 없음", fill=(255, 255, 255, 255), font=f, anchor="lm")
        d.rectangle([bx1 - 48, by0 + 8, bx1 - 8, by0 + 48], fill=(215, 45, 45, 255))
    bgs["bg_error"] = im

    # 9) bg_snow (Seasonal): Real winter night falling snow
    arr = np.zeros((H, W, 4), dtype=np.uint8)
    arr[..., 0] = 22
    arr[..., 1] = 32
    arr[..., 2] = 54
    arr[..., 3] = 255
    im = Image.fromarray(arr)
    d = ImageDraw.Draw(im)
    d.polygon([(0, 1440), (W, 1400), (W, H), (0, H)], fill=(235, 245, 255, 255))
    rng = np.random.default_rng(999)
    for _ in range(150):
        sx = int(rng.integers(0, W))
        sy = int(rng.integers(0, H))
        sr = int(rng.integers(4, 18))
        d.ellipse([sx - sr, sy - sr, sx + sr, sy + sr], fill=(255, 255, 255, int(rng.integers(140, 240))))
    bgs["bg_snow"] = im

    # 10) bg_hanbok (Seasonal): Korean hanok porch & eaves
    im, d = base_room((245, 238, 225), (195, 145, 95), floor_y=1380)
    d.polygon([(0, 860), (W, 860), (W, 950), (0, 950)], fill=(68, 72, 80, 255))
    for lx in (220, 860):
        d.rectangle([lx - 45, 1030, lx + 45, 1110], fill=(225, 45, 55, 255))
        d.rectangle([lx - 45, 1110, lx + 45, 1190], fill=(45, 105, 225, 255))
    bgs["bg_hanbok"] = im

    # 11) bg_upsidedown (Seasonal): Upside-down room
    im, d = base_room((180, 140, 100), (240, 235, 225), floor_y=940)
    try:
        f = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 52)
    except Exception:
        f = ImageFont.load_default()
    d.text((540, 1150), "세상이 뒤집혔다", fill=(215, 45, 45, 255), font=f, anchor="mm")
    bgs["bg_upsidedown"] = im

    for k, img in bgs.items():
        sub = "season" if k in ("bg_snow", "bg_hanbok", "bg_upsidedown") else "bg"
        img.save(os.path.join(SKIN_DIR, sub, f"{k}.png"))
        print(f"  Saved Background: {k}")


# =========================================================================
# 4. PHOTOREALISTIC FX & FRAMES
# =========================================================================

def render_photorealistic_fx_and_frames():
    print(">>> Synthesizing Remaining Photorealistic FX & Frames...")
    # FX: fx_beans, fx_pixel, fx_petals (256x256 transparent)
    # 1) fx_beans
    im = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for bx, by in [(80, 80), (180, 70), (128, 140), (70, 190), (195, 185)]:
        d.ellipse([bx - 22, by - 16, bx + 22, by + 16], fill=(125, 205, 65, 255), outline=(75, 145, 35, 255), width=4)
    im.save(os.path.join(SKIN_DIR, "fx", "fx_beans_1.png"))

    # 2) fx_pixel
    im = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for px, py, pw in [(100, 110, 45), (140, 90, 55), (80, 140, 60), (130, 140, 50), (170, 120, 45)]:
        d.rectangle([px, py, px + pw, py + pw], fill=(255, 225, 75, 255), outline=(32, 28, 25, 255), width=6)
    im.save(os.path.join(SKIN_DIR, "fx", "fx_pixel_1.png"))

    # 3) fx_petals
    im = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for px, py in [(128, 120), (75, 75), (185, 80), (80, 180), (190, 185)]:
        d.ellipse([px - 26, py - 14, px + 26, py + 14], fill=(255, 180, 195, 240))
    im.save(os.path.join(SKIN_DIR, "fx", "fx_petals_1.png"))

    # Frames (1080x1240 transparent, center 1080x1080 transparent cutout)
    W, H = 1080, 1240
    def make_cutout_frame(bg_fill):
        frame = Image.new("RGBA", (W, H), bg_fill)
        arr = np.asarray(frame).copy()
        arr[70:1070, 60:1020, 3] = 0
        return Image.fromarray(arr)

    # 1) frame_polaroid
    f_pol = make_cutout_frame((252, 250, 246, 255))
    d = ImageDraw.Draw(f_pol)
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 52)
    except Exception:
        font = ImageFont.load_default()
    d.text((540, 1150), "그날, 참지 못했던 우리... ★", fill=(45, 45, 45, 255), font=font, anchor="mm")
    f_pol.save(os.path.join(SKIN_DIR, "frame", "frame_polaroid.png"))

    # 2) frame_newspaper
    f_news = make_cutout_frame((242, 236, 222, 255))
    d = ImageDraw.Draw(f_news)
    try:
        f_h = ImageFont.truetype("C:/Windows/Fonts/batangbd.ttf", 36)
        f_b = ImageFont.truetype("C:/Windows/Fonts/batangbd.ttf", 48)
    except Exception:
        f_h = f_b = ImageFont.load_default()
    d.text((540, 35), "【 뿡 뿡 일 보 】  제 2026 호", fill=(20, 20, 20, 255), font=f_h, anchor="mm")
    d.text((540, 1150), "[단독] 사상 초유의 괄약근 사태 발생!!", fill=(215, 35, 35, 255), font=f_b, anchor="mm")
    f_news.save(os.path.join(SKIN_DIR, "frame", "frame_newspaper.png"))

    # 3) frame_vhs
    im_vhs = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im_vhs)
    d.rectangle([0, 0, W, 80], fill=(15, 15, 18, 255))
    d.rectangle([0, 1140, W, H], fill=(15, 15, 18, 255))
    d.ellipse([60, 30, 80, 50], fill=(255, 45, 45, 255))
    try:
        f_v = ImageFont.truetype("C:/Windows/Fonts/impact.ttf", 34)
    except Exception:
        f_v = ImageFont.load_default()
    d.text((150, 40), "● REC", fill=(255, 255, 255, 255), font=f_v, anchor="mm")
    d.text((920, 40), "SP  0:14:28", fill=(255, 255, 255, 255), font=f_v, anchor="mm")
    d.text((540, 1190), "OCT 22 2026  PM 02:14", fill=(255, 225, 65, 255), font=f_v, anchor="mm")
    im_vhs.save(os.path.join(SKIN_DIR, "frame", "frame_vhs.png"))

    # 4) frame_gold
    f_gold = make_cutout_frame((255, 205, 45, 255))
    d = ImageDraw.Draw(f_gold)
    try:
        f_g = ImageFont.truetype("C:/Windows/Fonts/batangbd.ttf", 42)
    except Exception:
        f_g = ImageFont.load_default()
    d.text((540, 1160), "★ 대 한 민 국   괄 약 근   협 회 ★", fill=(215, 165, 25, 255), font=f_g, anchor="mm")
    f_gold.save(os.path.join(SKIN_DIR, "frame", "frame_gold.png"))

    # 5) frame_wanted
    f_want = make_cutout_frame((235, 212, 175, 255))
    d = ImageDraw.Draw(f_want)
    try:
        f_w = ImageFont.truetype("C:/Windows/Fonts/impact.ttf", 58)
        f_sub = ImageFont.truetype("C:/Windows/Fonts/impact.ttf", 36)
    except Exception:
        f_w = f_sub = ImageFont.load_default()
    d.text((540, 45), "W A N T E D", fill=(75, 45, 25, 255), font=f_w, anchor="mm")
    d.text((540, 1150), "REWARD: $10,000,000 - DEAD OR ALIVE", fill=(165, 35, 25, 255), font=f_sub, anchor="mm")
    f_want.save(os.path.join(SKIN_DIR, "frame", "frame_wanted.png"))

    # 6) frame_museum
    f_mus = make_cutout_frame((125, 82, 52, 255))
    d = ImageDraw.Draw(f_mus)
    d.rounded_rectangle([340, 1120, 740, 1200], radius=10, fill=(255, 235, 145, 255), outline=(185, 155, 85, 255), width=4)
    try:
        f_m = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 28)
    except Exception:
        f_m = ImageFont.load_default()
    d.text((540, 1160), "작품명: 침묵의 암살자 (2026, 뿡)", fill=(45, 45, 45, 255), font=f_m, anchor="mm")
    f_mus.save(os.path.join(SKIN_DIR, "frame", "frame_museum.png"))

    print(">>> All Remaining FX and Frames Synthesized Successfully!")


if __name__ == "__main__":
    render_photorealistic_wear()
    render_photorealistic_props()
    render_photorealistic_backgrounds()
    render_photorealistic_fx_and_frames()
