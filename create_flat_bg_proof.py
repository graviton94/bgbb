# -*- coding: utf-8 -*-
import os
from PIL import Image

ARTIFACT_DIR = r"C:\Users\ruahn49\.gemini\antigravity\brain\b2ce85ba-1f7b-478f-8be4-052d7e2dab69"
BG_DIR = r"c:\bgbb\assets\skin\bg"

im_hompy = Image.open(os.path.join(BG_DIR, "bg_minihompy.png"))
im_error = Image.open(os.path.join(BG_DIR, "bg_error.png"))

# Scale down for proof inspection: 540x1170 each
w, h = 540, 1170
p_hompy = im_hompy.resize((w, h), Image.Resampling.LANCZOS)
p_error = im_error.resize((w, h), Image.Resampling.LANCZOS)

proof = Image.new("RGBA", (w * 2 + 40, h + 40), (20, 24, 30, 255))
proof.paste(p_hompy, (15, 20))
proof.paste(p_error, (w + 25, 20))

proof_path = os.path.join(ARTIFACT_DIR, "flat_screenshot_bgs_proof.png")
proof.save(proof_path, "PNG")
print("Saved proof to:", proof_path)
