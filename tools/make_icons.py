"""앱 아이콘 만들기: 라임 햇살 + 선글라스 낀 뻔뻔 햄찌 + '뿡!' 도장.

    python3 tools/make_icons.py

android 적응형 아이콘(배경·전경·단색), 옛 방식 아이콘, Play 스토어 512px, 사이트용 128px 을 만든다.
"""
import math
import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..")
RES = os.path.join(ROOT, "android/app/src/main/res")
LIME = (215, 255, 61, 255)
RAY = (190, 240, 20, 255)
INK = (17, 17, 17, 255)
YELLOW = (255, 212, 0, 255)
# 얼굴 그림(1024) 위 선글라스 자리 — src/pixels.js 의 SHADES_BOX 와 같은 값
SHADES_BOX = (246 / 1024, 380 / 1024, 533 / 1024)
# woff2 는 PIL 이 바로 못 읽을 수 있어서 ttf 로 풀어 둔 것을 쓴다 (없으면 woff2 시도)
FONT = next(p for p in (os.path.join(ROOT, "assets/fonts/blackhansans.ttf"), os.path.join(ROOT, "assets/fonts/blackhansans.woff2")) if os.path.exists(p))


def background(size):
    """라임 바탕 + 가운데서 퍼지는 햇살 16줄"""
    im = Image.new("RGBA", (size, size), LIME)
    d = ImageDraw.Draw(im)
    c, R, n = size * 0.46, size * 1.2, 16
    for i in range(n):
        a0, a1 = (i / n) * 2 * math.pi, ((i + 0.5) / n) * 2 * math.pi
        d.polygon([(c, c), (c + R * math.cos(a0), c + R * math.sin(a0)), (c + R * math.cos(a1), c + R * math.sin(a1))], fill=RAY)
    return im


def hamster(box):
    face = Image.open(os.path.join(ROOT, "assets/faces/hamster_shameless.webp")).convert("RGBA")
    shades = Image.open(os.path.join(ROOT, "assets/faces/sunglasses.png")).convert("RGBA")
    W = face.width
    sw = round(SHADES_BOX[2] * W)
    shades = shades.resize((sw, round(shades.height * sw / shades.width)), Image.NEAREST)
    face.alpha_composite(shades, (round(SHADES_BOX[0] * W), round(SHADES_BOX[1] * W)))
    s = box / max(face.size)
    return face.resize((round(face.width * s), round(face.height * s)), Image.LANCZOS)


def stamp(size, text="뿡!"):
    """노랑 글자 + 굵은 검정 테두리, 살짝 기울임"""
    f = ImageFont.truetype(FONT, int(size * 0.62))
    pad = int(size * 0.2)
    layer = Image.new("RGBA", (size * 2, size), (0, 0, 0, 0))
    ImageDraw.Draw(layer).text((pad, size * 0.08), text, font=f, fill=YELLOW, stroke_width=max(2, int(size * 0.07)), stroke_fill=INK)
    layer = layer.crop(layer.getbbox())
    return layer.rotate(14, resample=Image.BICUBIC, expand=True)


def foreground(size, ham=0.86):
    """투명 바탕 위 햄찌 + 뿡! (size 칸 안에 꽉)"""
    fg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    h = hamster(int(size * ham))
    fg.alpha_composite(h, (int(size * 0.46 - h.width / 2), int(size * 0.56 - h.height / 2)))
    s = stamp(int(size * 0.34))
    fg.alpha_composite(s, (size - s.width - int(size * 0.0), int(size * 0.02)))
    return fg


def full(size):
    im = background(size)
    im.alpha_composite(foreground(int(size * 0.9)), (int(size * 0.05), int(size * 0.06)))
    return im


def rounded(img, radius):
    m = Image.new("L", img.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, img.width - 1, img.height - 1], radius, fill=255)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img, (0, 0), m)
    return out


if __name__ == "__main__":
    # 적응형 아이콘: 108dp(432px) 캔버스. 전경은 안쪽 안전 영역(가운데 ~72%)에 들어가게
    background(432).save(os.path.join(RES, "drawable-nodpi/ic_launcher_background.png"))
    fg = Image.new("RGBA", (432, 432), (0, 0, 0, 0))
    fg.alpha_composite(foreground(300), (66, 66))
    fg.save(os.path.join(RES, "drawable-nodpi/ic_launcher_foreground.png"))
    # 테마 아이콘용 단색 실루엣
    a = fg.getchannel("A").point(lambda v: 255 if v > 40 else 0)
    mono = Image.new("RGBA", fg.size, (255, 255, 255, 0))
    mono.putalpha(a)
    mono.save(os.path.join(RES, "drawable-nodpi/ic_launcher_monochrome.png"))
    rounded(full(192), 40).save(os.path.join(RES, "mipmap-xxxhdpi/ic_launcher.png"))
    full(512).convert("RGB").save(os.path.join(ROOT, "docs/store/icon-512.png"))
    rounded(full(128), 28).save(os.path.join(ROOT, "docs/store/icon-128.png"))
    print("아이콘을 만들었어요")
