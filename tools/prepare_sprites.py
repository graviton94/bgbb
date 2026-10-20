"""캐릭터 그림 손질 (한 번 돌리면 assets/ 를 고쳐 쓴다).

    python3 tools/prepare_sprites.py

1. 테두리 밖 흰 띠 없애기: 배경을 지울 때 남은 밝은 테두리를 검은 외곽선 바깥쪽에서만 걷어 낸다.
   투명한 곳에서 시작해 '밝은 픽셀' 로만 최대 6px 번져 나가므로, 외곽선 안쪽 몸통은 건드리지 않는다.
2. 뚱냥이 기본 그림의 푸른 회색 몸통을 다른 동작 그림과 같은 흰색으로.
3. 아지트용 동작 그림을 캐릭터마다 같은 크기의 캔버스에 맞춘다
   (보이는 면적이 같도록 크기를 맞추고 발바닥을 바닥선에 붙인다) → 걷거나 뛸 때 몸 크기가 들쭉날쭉하지 않다.
   결과: assets/sprites/<캐릭터>_<동작>.webp (기본자세는 <캐릭터>_idle.webp)
   큰 기본 그림 assets/<캐릭터>.webp 는 그림일기·친구 창용으로 그대로 둔다 (1·2번만 적용).
"""
import os

import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..", "assets")
FRAMES = {
    "hamster": {"idle": "hamster.webp", "walk": "sprites/hamster_walk.webp",
                "react": "sprites/hamster_jump.webp", "sleep": "sprites/hamster_sleep.webp"},
    "tit": {"idle": "tit.webp", "walk": "sprites/tit_hop.webp",
            "react": "sprites/tit_sing.webp", "fly": "sprites/tit_fly.webp"},
    "cat": {"idle": "cat.webp", "walk": "sprites/cat_walk.webp",
            "react": "sprites/cat_play.webp", "sleep": "sprites/cat_sit.webp"},
}
CANVAS_H = 300   # 아지트용 그림 높이(px). 화면에서는 이보다 작게 그려진다.


def defringe(im, reach=6):
    a = np.array(im.convert("RGBA")).astype(np.int32)
    lum = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]
    outside = a[..., 3] < 24
    light = (a[..., 3] >= 24) & (lum > 150)
    grown = outside.copy()
    for _ in range(reach):
        d = grown.copy()
        d[1:] |= grown[:-1]; d[:-1] |= grown[1:]; d[:, 1:] |= grown[:, :-1]; d[:, :-1] |= grown[:, 1:]
        grown |= d & light
    fringe = grown & ~outside
    a[fringe, 3] = 0
    # 외곽선 바로 바깥 반투명 픽셀은 검은 선 색으로 (흰 테두리 대신 부드러운 가장자리)
    soft = (a[..., 3] > 0) & (a[..., 3] < 200)
    a[soft, :3] = np.minimum(a[soft, :3], 60)
    return Image.fromarray(a.astype(np.uint8), "RGBA"), int(fringe.sum())


def whiten_cat(im):
    a = np.array(im).astype(np.int32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    bluish = (a[..., 3] > 0) & (r > 205) & (b - r >= 3) & (b - r <= 22) & (np.abs(g - (r + b) / 2) < 10)
    shade = (255 - b[bluish]) // 2          # 원래 명암은 살짝 남긴다
    a[bluish, 0] = 250 - shade
    a[bluish, 1] = 249 - shade
    a[bluish, 2] = 248 - shade
    return Image.fromarray(a.astype(np.uint8), "RGBA")


def opaque_area(im):
    return int((np.array(im.getchannel("A")) > 128).sum())


def main():
    for char, frames in FRAMES.items():
        cleaned = {}
        for pose, rel in frames.items():
            path = os.path.join(ROOT, rel)
            im, removed = defringe(Image.open(path))
            if char == "cat" and pose == "idle":
                im = whiten_cat(im)
            im = im.crop(im.getbbox())
            cleaned[pose] = im
            if pose == "idle":
                im.save(path, "WEBP", quality=90, method=6)   # 큰 기본 그림 (일기·친구 창용)
            print(f"{rel}: 흰 띠 {removed}px 제거")

        # 보이는 면적을 기본자세에 맞춘 뒤 공통 캔버스에 발바닥 정렬
        base_area = opaque_area(cleaned["idle"])
        scaled = {}
        for pose, im in cleaned.items():
            s = (base_area / max(1, opaque_area(im))) ** 0.5
            scaled[pose] = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
        cw = max(i.width for i in scaled.values())
        ch = max(i.height for i in scaled.values())
        k = CANVAS_H / ch
        cw, ch = round(cw * k) + 8, CANVAS_H + 8
        for pose, im in scaled.items():
            im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
            canvas = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
            canvas.alpha_composite(im, ((cw - im.width) // 2, ch - 4 - im.height))
            out = os.path.join(ROOT, "sprites", f"{char}_{pose}.webp")
            canvas.save(out, "WEBP", quality=90, method=6)
        print(f"{char}: 캔버스 {cw}×{ch}")

    # 옛 이름(동작 그림 원본)은 새 이름으로 대체됐으니 지운다
    for old in ["hamster_jump", "tit_hop", "tit_sing", "cat_play", "cat_sit"]:
        p = os.path.join(ROOT, "sprites", old + ".webp")
        if os.path.exists(p):
            os.remove(p)


if __name__ == "__main__":
    main()
