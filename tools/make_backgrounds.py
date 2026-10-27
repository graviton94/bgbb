"""코드로 그린 꾸미기 배경 4종 (1080×2340): 뒤집힌 방 · 눈 오는 밤 · 엘리베이터 · 화장실 칸.

    python3 tools/make_backgrounds.py <원본 assets/skin 폴더 (bg_meeting.png 필요)> <출력 폴더>

출력 폴더를 tools/prepare_skins.py 의 원본 폴더로 쓰면 WebP 로 바뀐다 (<출력>/bg/*.png).
"""
import os
import random
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops
W, H = 1080, 2340
OUT = os.path.join(sys.argv[2], 'bg') + '/'
os.makedirs(OUT, exist_ok=True)
SK = sys.argv[1].rstrip('/') + '/'
FONT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'fonts', 'blackhansans.woff2')
random.seed(7)

def vgrad(top, bottom, size=(W, H)):
    g = Image.new('RGB', (1, 256))
    for y in range(256):
        t = y / 255
        g.putpixel((0, y), tuple(round(a + (b - a) * t) for a, b in zip(top, bottom)))
    return g.resize(size, Image.BICUBIC)

def noise(size, sigma, alpha):
    n = Image.effect_noise(size, sigma).convert('L')
    return n, alpha

# 1. 뒤집힌 방 (만우절): 회의실 사진을 180도
im = Image.open(SK + 'bg/bg_meeting.png').convert('RGB').rotate(180)
im.save(OUT + 'bg_upsidedown.png')

# 2. 눈 오는 밤 (크리스마스)
im = vgrad((14, 20, 48), (52, 60, 98))
d = ImageDraw.Draw(im)
glow = Image.new('L', (W, H), 0); gd = ImageDraw.Draw(glow)
lx, ly = 800, 1180
for r in range(520, 0, -8):
    gd.ellipse((lx - r, ly - r, lx + r, ly + r), fill=int(140 * (1 - r / 520) ** 1.6))
im = Image.composite(Image.new('RGB', (W, H), (255, 214, 140)), im, glow)
d = ImageDraw.Draw(im)
d.rectangle((790, 1180, 812, 2100), fill=(28, 30, 40))           # 가로등 기둥
d.polygon([(730, 1170), (870, 1170), (840, 1120), (760, 1120)], fill=(28, 30, 40))
d.ellipse((772, 1160, 828, 1205), fill=(255, 236, 190))
ground = Image.new('L', (W, H), 0); gd = ImageDraw.Draw(ground)
gd.ellipse((-500, 1960, 1600, 3000), fill=255)
im = Image.composite(vgrad((235, 240, 250), (205, 215, 235)), im, ground.filter(ImageFilter.GaussianBlur(6)))
for layer, (n, rr, blur) in enumerate([(260, (3, 7), 2), (120, (7, 13), 3), (40, (14, 24), 6)]):
    flakes = Image.new('L', (W, H), 0); fd = ImageDraw.Draw(flakes)
    for _ in range(n):
        x, y, r = random.randint(0, W), random.randint(0, H), random.randint(*rr)
        fd.ellipse((x - r, y - r, x + r, y + r), fill=random.randint(170, 255))
    im = Image.composite(Image.new('RGB', (W, H), (255, 255, 255)), im, flakes.filter(ImageFilter.GaussianBlur(blur)))
im.save(OUT + 'bg_snow.png')

# 3. 엘리베이터: 헤어라인 스테인리스 문 + 빨간 7F
streak = Image.effect_noise((W, 40), 40).convert('L').resize((W, H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(1))
steel = Image.merge('RGB', [ImageChops.add(streak, Image.new('L', (W, H), 0), 1, -10)] * 3)
im = ImageChops.blend(vgrad((200, 204, 210), (150, 155, 162)), steel, 0.35)
sheen = Image.new('L', (W, H), 0); sd = ImageDraw.Draw(sheen)
for x0, w in [(180, 90), (690, 60)]:
    sd.rectangle((x0, 0, x0 + w, H), fill=70)
im = Image.composite(Image.new('RGB', (W, H), (245, 247, 250)), im, sheen.filter(ImageFilter.GaussianBlur(40)))
d = ImageDraw.Draw(im)
d.rectangle((0, 0, W, 300), fill=(120, 124, 130))                  # 위 테두리
d.rectangle((538, 300, 542, H), fill=(80, 84, 90))                  # 문 가운데 틈
d.rectangle((0, 300, 18, H), fill=(110, 114, 120)); d.rectangle((W - 18, 300, W, H), fill=(110, 114, 120))
d.rounded_rectangle((390, 90, 690, 240), 18, fill=(12, 12, 14))      # 층 표시
f = ImageFont.truetype(FONT, 120)
led = Image.new('L', (W, H), 0); ld = ImageDraw.Draw(led)
ld.text((540, 166), '7F', font=f, fill=255, anchor='mm'); ld.polygon([(430, 190), (470, 190), (450, 150)], fill=255)
im = Image.composite(Image.new('RGB', (W, H), (255, 40, 30)), im, led.filter(ImageFilter.GaussianBlur(5)))
im = Image.composite(Image.new('RGB', (W, H), (255, 120, 100)), im, led)
d = ImageDraw.Draw(im)
d.rectangle((0, 2180, W, H), fill=(70, 72, 78))                      # 바닥 문턱
d.rectangle((0, 2180, W, 2196), fill=(170, 174, 180))
im.save(OUT + 'bg_elevator.png')

# 4. 화장실 칸: 칸막이 문 + 매직 낙서
im = vgrad((214, 206, 190), (190, 182, 166))
n = Image.effect_noise((W // 2, H // 2), 25).convert('L').resize((W, H))
im = ImageChops.blend(im, Image.merge('RGB', [n] * 3), 0.08)
d = ImageDraw.Draw(im)
d.rectangle((0, 0, 60, H), fill=(170, 162, 146)); d.rectangle((W - 60, 0, W, H), fill=(170, 162, 146))
d.rounded_rectangle((W - 230, 1250, W - 90, 1330), 14, fill=(150, 152, 158))   # 걸쇠
d.rounded_rectangle((W - 300, 1272, W - 160, 1308), 10, fill=(190, 192, 198))
d.ellipse((W - 205, 1320, W - 175, 1350), fill=(200, 40, 40))                  # 사용중 빨간 표시
d.rounded_rectangle((500, 360, 580, 420), 12, fill=(150, 152, 158)); d.rectangle((530, 300, 550, 380), fill=(150, 152, 158))  # 옷걸이
def scrawl(text, xy, size, color, rot):
    t = Image.new('RGBA', (W, 400), (0, 0, 0, 0)); td = ImageDraw.Draw(t)
    td.text((20, 20), text, font=ImageFont.truetype(FONT, size), fill=color)
    t = t.crop(t.getbbox()).rotate(rot, expand=True, resample=Image.BICUBIC)
    im.paste(t, xy, t)
scrawl('여기서 뀌어라 ㅋ', (130, 820), 96, (20, 20, 20, 235), 8)
scrawl('방구 금지 (진짜임)', (260, 1060), 64, (200, 30, 30, 220), -6)
scrawl('누가 뀜???', (120, 1480), 80, (30, 60, 170, 225), 14)
scrawl('↑ 얘가 뀜', (560, 1660), 56, (20, 20, 20, 210), -10)
scrawl('뿡 뿡 뿡', (180, 1880), 70, (20, 120, 50, 220), 4)
scrawl('♥ 괄약근 ♥', (600, 1960), 52, (210, 40, 120, 220), -14)
d = ImageDraw.Draw(im)
for _ in range(14):   # 낙서 선 찍찍
    x, y = random.randint(100, 950), random.randint(760, 2150)
    d.line([(x + random.randint(-60, 60), y + random.randint(-20, 20)) for _ in range(4)], fill=(30, 30, 30), width=4)
im.save(OUT + 'bg_toilet.png')
print('done')
