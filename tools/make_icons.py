"""앱 아이콘 만들기: 라임 햇살 + 정중앙에 아주 큰 '뿡' (노랑 + 검정 테두리 + 빨간 그림자).

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


def big_toot(size, text="뿡"):
    """size 칸 정중앙에 꽉 차는 '뿡': 빨간 그림자를 오른쪽 아래로 밀고, 그 위에 노랑 + 굵은 검정 테두리"""
    f = ImageFont.truetype(FONT, size)
    sw = max(2, int(size * 0.028))
    probe = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    l, t, r, b = probe.textbbox((0, 0), text, font=f, stroke_width=sw)
    w, h = r - l, b - t
    off = int(size * 0.07)
    layer = Image.new("RGBA", (w + off, h + off), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.text((-l + off, -t + off), text, font=f, fill=(224, 38, 43, 255), stroke_width=sw, stroke_fill=INK)
    d.text((-l, -t), text, font=f, fill=YELLOW, stroke_width=sw, stroke_fill=INK)
    return layer.rotate(-6, resample=Image.BICUBIC, expand=True)


def foreground(size, fill=0.92):
    """투명 바탕 정중앙에 '뿡' (size 칸의 fill 만큼)"""
    fg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    toot = big_toot(size)
    k = size * fill / max(toot.size)
    toot = toot.resize((round(toot.width * k), round(toot.height * k)), Image.LANCZOS)
    fg.alpha_composite(toot, ((size - toot.width) // 2, (size - toot.height) // 2))
    return fg


def full(size):
    im = background(size)
    fg = foreground(int(size * 0.84))
    im.alpha_composite(fg, ((size - fg.width) // 2, (size - fg.height) // 2))
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
    fg.alpha_composite(foreground(296), (68, 68))
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
