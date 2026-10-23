"""꾸미기 에셋 (assets/skin/<slot>/<id>.png 원본) → 앱용 WebP (assets/skin/<slot>/<id>.webp).

    python3 tools/prepare_skins.py <원본 assets/skin 폴더>     (Pillow)

슬롯마다 크기: bg 720×1560 (세로 9:19.5) · prop 512 · wear 640 (표정 그림과 같은 크기 = 같은 눈 좌표) · fx 256 ·
bubble 512×256 · frame 1080×1240 (공유 이미지에 그대로 덮음). 시즌 것(season/)은 이름 앞부분으로 슬롯을 정한다.
목록에 없는 옛 이름(fx_bean 등)은 건너뛴다.
"""
import os
import sys

from PIL import Image

SRC = sys.argv[1]


# 착용 위치 보정: {id: (크기 배율, 물건 바닥을 몇 px 올릴지)} — 1024 캔버스 기준, 물건 바닥 가운데를 축으로
ADJUST = {"wear_crown": (0.8, 70), "wear_party": (0.85, 62)}


def adjust(im, scale, up):
    box = im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    if not box:
        return im
    part = im.crop(box)
    part = part.resize((max(1, round(part.width * scale)), max(1, round(part.height * scale))), Image.LANCZOS)
    cx, bottom = (box[0] + box[2]) / 2, box[3] - up
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    out.alpha_composite(part, (round(cx - part.width / 2), max(0, round(bottom - part.height))))
    return out


def drop_strays(im):
    """소품 아래 · 위에 떨어져 있는 자잘한 찌꺼기 줄 (누끼 잔여물)을 지운다: 가장 큰 덩어리 행 구간만 남김"""
    a = im.getchannel("A")
    w, h = im.size
    px = a.load()
    rows = [sum(1 for x in range(0, w, 2) if px[x, y] > 8) for y in range(h)]
    runs, start = [], None
    for y, n in enumerate(rows + [0]):
        if n and start is None:
            start = y
        elif not n and start is not None:
            runs.append((sum(rows[start:y]), start, y))
            start = None
    if len(runs) < 2:
        return im
    _, top, bottom = max(runs)
    out = im.copy()
    clear = Image.new("RGBA", (w, 1), (0, 0, 0, 0))
    for y in list(range(0, top)) + list(range(bottom, h)):
        out.paste(clear, (0, y))
    return out
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "skin")
SIZE = {"bg": (720, 1560), "prop": (512, 512), "wear": (640, 640), "fx": (256, 256), "bubble": (512, 256), "frame": (1080, 1240)}
QUALITY = {"bg": 78, "frame": 85}
WANT = {
    "bg": "office meeting subway elevator library toilet wedding chicken minihompy error vapor space snow hanbok upsidedown",
    "prop": "whoopee megaphone extinguisher spray trophy medal gasmask candle fan mic sweetpotato beans milk warning cctv chair pumpkin bok yeot",
    # 안대 · 마스크 · 방독면 · 리본 · 필승 은 tools/draw_wear.py 로 직접 그림, 뿔테 · 산타는 손으로 고친 파일이라 여기서 다시 만들지 않는다 (헤드셋은 뺌)
    "wear": "heart 3d groucho party crown",
    "fx": "hearts_1 sparkle_1 skull_1 rainbow_1 poop_1 beans_1 pixel_1 petals_1",
    "bubble": "katalk shout thought torn",
    "frame": "polaroid newspaper vhs gold wanted museum",
}

for slot, names in WANT.items():
    os.makedirs(os.path.join(OUT, slot), exist_ok=True)
    for name in names.split():
        id_ = f"{slot}_{name}"
        src = next((p for p in (os.path.join(SRC, slot, f"{id_}.png"), os.path.join(SRC, "season", f"{id_}.png")) if os.path.exists(p)), None)
        if not src:
            print("없음:", id_)
            continue
        im = Image.open(src).convert("RGBA" if slot != "bg" else "RGB")
        if slot == "prop":
            im = drop_strays(im)
        if id_ in ADJUST:
            im = adjust(im, *ADJUST[id_])
        im = im.resize(SIZE[slot], Image.LANCZOS)
        out = os.path.join(OUT, slot, f"{id_.removesuffix('_1')}.webp")
        im.save(out, "WEBP", quality=QUALITY.get(slot, 84), method=6)
        print(f"{out}: {os.path.getsize(out) // 1024}KB")
