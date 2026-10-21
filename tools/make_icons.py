"""앱 아이콘 만들기: 햄찌 + 민트색 방구 구름.

    python3 tools/make_icons.py

android 적응형 아이콘(전경·단색), 옛 방식 아이콘, Play 스토어 512px, 사이트용 128px 을 만든다.
"""
import os

from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), "..")
RES = os.path.join(ROOT, "android/app/src/main/res")
BG = (255, 244, 194, 255)
INK = (40, 37, 35, 255)


def puff(size, scale):
    """크레용 방구 구름: 동그라미 몇 개를 합친 모양 + 그 둘레에만 외곽선."""
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    circles = [(0.15, 0.70, 0.085), (0.25, 0.62, 0.07), (0.25, 0.79, 0.07), (0.07, 0.80, 0.055), (0.32, 0.71, 0.05), (0.2, 0.72, 0.07)]
    for cx, cy, r in circles:
        R = r * size * scale
        d.ellipse([cx * size - R, cy * size - R, cx * size + R, cy * size + R], fill=255)
    line = max(3, int(size * 0.016)) | 1
    ring = mask.filter(ImageFilter.MaxFilter(line * 2 + 1))
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    layer.paste(Image.new("RGBA", (size, size), INK), (0, 0), ring)
    layer.paste(Image.new("RGBA", (size, size), (191, 232, 207, 255)), (0, 0), mask)
    return layer


def hamster(box):
    im = Image.open(os.path.join(ROOT, "assets/faces/hamster_blank.webp")).convert("RGBA")
    s = box / max(im.size)
    return im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)


def compose(size, ham_box, background):
    canvas = Image.new("RGBA", (size, size), BG if background else (0, 0, 0, 0))
    canvas.alpha_composite(puff(size, 1.0))
    h = hamster(int(size * ham_box))
    canvas.alpha_composite(h, (int(size * 0.62 - h.width / 2), int(size * 0.5 - h.height / 2)))
    return canvas


def rounded(img, radius):
    m = Image.new("L", img.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, img.width - 1, img.height - 1], radius, fill=255)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img, (0, 0), m)
    return out


if __name__ == "__main__":
    # 적응형 아이콘 전경: 108dp(432px) 캔버스, 안쪽 66% 안전 영역에 들어가게
    fg = Image.new("RGBA", (432, 432), (0, 0, 0, 0))
    fg.alpha_composite(compose(288, 0.72, False), (72, 72))
    fg.save(os.path.join(RES, "drawable-nodpi/ic_launcher_foreground.png"))
    # 테마 아이콘용 단색 실루엣
    a = fg.getchannel("A").point(lambda v: 255 if v > 40 else 0)
    mono = Image.new("RGBA", fg.size, (255, 255, 255, 0))
    mono.putalpha(a)
    mono.save(os.path.join(RES, "drawable-nodpi/ic_launcher_monochrome.png"))
    rounded(compose(192, 0.68, True), 40).save(os.path.join(RES, "mipmap-xxxhdpi/ic_launcher.png"))
    compose(512, 0.68, True).convert("RGB").save(os.path.join(ROOT, "docs/store/icon-512.png"))
    rounded(compose(128, 0.68, True), 28).save(os.path.join(ROOT, "docs/store/icon-128.png"))
    print("아이콘을 만들었어요")
