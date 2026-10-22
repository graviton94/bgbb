# -*- coding: utf-8 -*-
r"""
Generate crisp, flat, direct-screenshot style backgrounds (NO CRT bezel, NO vignette/4-corner shadow, NO barrel distortion):
1. `bg_minihompy.png`: Direct screen capture of 2000s Cyworld Minihompy with IE6 browser, minihompy window, tabs, profile, BGM, miniroom, and Windows taskbar.
2. `bg_error.png`: Direct screen capture of Windows 98 BSOD (pure blue #0000AA) with cascading 20-window error waterfall avalanche meme.
"""

import os
from PIL import Image, ImageDraw, ImageFont

SKIN_BG_DIR = r"c:\bgbb\assets\skin\bg"
ARTIFACT_DIR = r"C:\Users\ruahn49\.gemini\antigravity\brain\b2ce85ba-1f7b-478f-8be4-052d7e2dab69"
W, H = 1080, 2340


def get_fonts():
    try:
        f_gulim_16 = ImageFont.truetype("C:/Windows/Fonts/gulim.ttc", 16)
        f_gulim_18 = ImageFont.truetype("C:/Windows/Fonts/gulim.ttc", 18)
        f_gulim_20 = ImageFont.truetype("C:/Windows/Fonts/gulim.ttc", 20)
        f_gulim_22 = ImageFont.truetype("C:/Windows/Fonts/gulim.ttc", 22)
        f_gulim_24 = ImageFont.truetype("C:/Windows/Fonts/gulim.ttc", 24)
        f_gulim_28 = ImageFont.truetype("C:/Windows/Fonts/gulim.ttc", 28)
        f_malgun_bd_20 = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 20)
        f_malgun_bd_24 = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 24)
        f_malgun_bd_28 = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 28)
        f_fixed_22 = ImageFont.truetype("C:/Windows/Fonts/lucon.ttf", 22)
        f_fixed_24 = ImageFont.truetype("C:/Windows/Fonts/lucon.ttf", 24)
    except Exception:
        f = ImageFont.load_default()
        return (f,) * 11
    return (
        f_gulim_16, f_gulim_18, f_gulim_20, f_gulim_22, f_gulim_24, f_gulim_28,
        f_malgun_bd_20, f_malgun_bd_24, f_malgun_bd_28,
        f_fixed_22, f_fixed_24
    )


def render_screenshot_bg_minihompy():
    """Flat, direct digital screen capture of 2000s Cyworld Minihompy in Windows IE."""
    (
        f_gulim_16, f_gulim_18, f_gulim_20, f_gulim_22, f_gulim_24, f_gulim_28,
        f_malgun_bd_20, f_malgun_bd_24, f_malgun_bd_28,
        _, _
    ) = get_fonts()

    im = Image.new("RGBA", (W, H), (165, 202, 228, 255))  # Cyworld soft sky-blue wallpaper
    d = ImageDraw.Draw(im)

    # 1. Subtle horizontal wallpaper pinstripes
    for py in range(0, H, 14):
        d.line([(0, py), (W, py)], fill=(152, 192, 220, 255), width=1)

    # 2. Top Windows XP / 2000 Internet Explorer 6 Window Bar (y: 0..140)
    # IE Title Bar
    d.rectangle([0, 0, W, 42], fill=(0, 85, 225, 255))
    d.text((16, 21), "싸이월드 - 사이좋은 사람들, 싸이월드 - Microsoft Internet Explorer", fill=(255, 255, 255, 255), font=f_gulim_18, anchor="lm")
    # Window controls [ _ ] [ □ ] [ X ]
    for idx, sym in enumerate(["_", "□", "X"]):
        bx = W - 110 + idx * 34
        d.rectangle([bx, 6, bx + 28, 34], fill=(225, 230, 240, 255), outline=(0, 40, 120, 255), width=1)
        d.text((bx + 14, 19), sym, fill=(20, 20, 20, 255), font=f_malgun_bd_20, anchor="mm")

    # IE Menu Bar
    d.rectangle([0, 42, W, 82], fill=(236, 233, 216, 255))
    d.line([(0, 82), (W, 82)], fill=(200, 195, 180, 255), width=1)
    menus = ["파일(F)", "편집(E)", "보기(V)", "즐겨찾기(A)", "도구(T)", "도움말(H)"]
    mx = 18
    for m in menus:
        d.text((mx, 62), m, fill=(40, 40, 40, 255), font=f_gulim_18, anchor="lm")
        mx += 115

    # IE Address Bar
    d.rectangle([0, 83, W, 132], fill=(245, 243, 235, 255))
    d.text((18, 107), "주소(D)", fill=(80, 80, 80, 255), font=f_gulim_18, anchor="lm")
    d.rectangle([95, 92, W - 90, 124], fill=(255, 255, 255, 255), outline=(122, 138, 153, 255), width=1)
    d.text((105, 107), "http://minihp.cyworld.com/pims/main/pims_main.asp?tid=20048600", fill=(20, 20, 20, 255), font=f_gulim_18, anchor="lm")
    d.rectangle([W - 75, 92, W - 15, 124], fill=(230, 228, 220, 255), outline=(122, 138, 153, 255), width=1)
    d.text((W - 45, 107), "이동", fill=(30, 30, 30, 255), font=f_gulim_18, anchor="mm")

    # 3. Minihompy Main Window Container (Positioned in vertical center: y: 440..1960)
    # The famous orange/grey skin container
    skin_x0 = 60
    skin_y0 = 440
    skin_x1 = W - 110
    skin_y1 = 1960

    # Shadow beneath minihompy window (soft clean drop shadow)
    d.rounded_rectangle([skin_x0 + 8, skin_y0 + 8, skin_x1 + 8, skin_y1 + 8], radius=18, fill=(130, 168, 195, 160))

    # White Outer Border Box
    d.rounded_rectangle([skin_x0, skin_y0, skin_x1, skin_y1], radius=18, fill=(255, 255, 255, 255), outline=(170, 175, 185, 255), width=2)
    # Soft Grey Inner Container
    d.rounded_rectangle([skin_x0 + 10, skin_y0 + 10, skin_x1 - 10, skin_y1 - 10], radius=14, fill=(245, 247, 250, 255), outline=(215, 220, 228, 255), width=2)

    # 4. Right-side Tabs (홈, 프로필, 다이어리, 사진첩, 방명록)
    tabs = ["홈", "프로필", "다이어리", "사진첩", "방명록"]
    for i, tname in enumerate(tabs):
        ty = skin_y0 + 60 + i * 85
        col = (255, 255, 255, 255) if i == 0 else (240, 138, 55, 255)
        text_col = (45, 45, 45, 255) if i == 0 else (255, 255, 255, 255)
        # Tab tab shape
        d.rounded_rectangle([skin_x1 - 2, ty, skin_x1 + 75, ty + 70], radius=8, fill=col, outline=(175, 180, 190, 255), width=2)
        d.text((skin_x1 + 38, ty + 35), tname, fill=text_col, font=f_gulim_22, anchor="mm")

    # 5. Header Area: TODAY 9999 | TOTAL 486,000 & Homepage Title
    d.text((skin_x0 + 35, skin_y0 + 38), "TODAY ", fill=(225, 45, 45, 255), font=f_malgun_bd_24)
    d.text((skin_x0 + 145, skin_y0 + 38), "9999", fill=(225, 45, 45, 255), font=f_malgun_bd_28)
    d.text((skin_x0 + 225, skin_y0 + 40), " | TOTAL 486,000", fill=(80, 85, 95, 255), font=f_gulim_20)
    d.text((skin_x0 + 430, skin_y0 + 40), "김싸이님의 미니홈피 ♪ 난... ㄱㅏ끔 눈물을 흘린ㄷㅏ...", fill=(35, 80, 155, 255), font=f_gulim_22)

    # 6. Left Profile Pane (Width: 290)
    prof_w = 290
    prof_x0 = skin_x0 + 25
    prof_x1 = prof_x0 + prof_w
    d.rounded_rectangle([prof_x0, skin_y0 + 85, prof_x1, skin_y1 - 30], radius=10, fill=(255, 255, 255, 255), outline=(225, 230, 238, 255), width=2)

    # Profile Picture Box
    d.rectangle([prof_x0 + 18, skin_y0 + 110, prof_x1 - 18, skin_y0 + 430], fill=(238, 242, 248, 255), outline=(205, 212, 222, 255), width=1)
    d.text(((prof_x0 + prof_x1) // 2, skin_y0 + 265), "🐹 [ 방구 햄찌 ]", fill=(110, 115, 130, 255), font=f_malgun_bd_24, anchor="mm")
    d.text(((prof_x0 + prof_x1) // 2, skin_y0 + 300), "BBOONG MASTER", fill=(160, 165, 175, 255), font=f_gulim_18, anchor="mm")

    d.text((prof_x0 + 20, skin_y0 + 460), "TODAY IS... ♡행복", fill=(225, 45, 115, 255), font=f_gulim_20)
    d.text((prof_x0 + 20, skin_y0 + 510), "방구는 참는 게 아니야.\n자연스러운 삶의\n일부일 뿐...★\n\n내 괄약근은\n언제나 살아 숨쉰다.", fill=(70, 75, 85, 255), font=f_gulim_20)

    # 일촌 파도타기 dropdown box
    d.rectangle([prof_x0 + 18, skin_y1 - 110, prof_x1 - 18, skin_y1 - 50], fill=(245, 247, 250, 255), outline=(205, 212, 222, 255), width=1)
    d.text(((prof_x0 + prof_x1) // 2, skin_y1 - 80), "▼ 파도타기 (일촌 목록)", fill=(80, 85, 95, 255), font=f_gulim_18, anchor="mm")

    # 7. Right Main Pane: BGM Player + Miniroom + Ilchon Comments
    main_x0 = prof_x1 + 25
    main_x1 = skin_x1 - 25

    # BGM Player Bar
    d.rounded_rectangle([main_x0, skin_y0 + 85, main_x1, skin_y0 + 145], radius=6, fill=(238, 244, 252, 255), outline=(195, 212, 230, 255), width=1)
    d.text((main_x0 + 20, skin_y0 + 115), "▶ ♪ 프리스타일 - Y (방구 뀌던 날 ver.)", fill=(45, 90, 175, 255), font=f_gulim_20, anchor="lm")
    d.text((main_x1 - 20, skin_y0 + 115), "[듣기] [가사] [설정]", fill=(120, 125, 135, 255), font=f_gulim_18, anchor="rm")

    # Miniroom Box (Isometric 2.5D Room, y: skin_y0+160..skin_y1-170)
    mr_y0 = skin_y0 + 160
    mr_y1 = skin_y1 - 165
    d.rectangle([main_x0, mr_y0, main_x1, mr_y1], fill=(248, 243, 232, 255), outline=(200, 190, 178, 255), width=2)

    # Isometric Wooden Floor (Bottom 35% of room)
    floor_h = int((mr_y1 - mr_y0) * 0.38)
    floor_y0 = mr_y1 - floor_h
    d.polygon([(main_x0, floor_y0), (main_x1, floor_y0), (main_x1, mr_y1), (main_x0, mr_y1)], fill=(238, 218, 185, 255))
    # Parquet floor lines
    for fx in range(main_x0, main_x1 + 100, 45):
        d.line([(fx, floor_y0), (fx - 40, mr_y1)], fill=(220, 198, 165, 255), width=1)
    d.line([(main_x0, floor_y0), (main_x1, floor_y0)], fill=(195, 170, 135, 255), width=2)

    # Miniroom Cute Wall Elements
    d.text((main_x0 + 40, mr_y0 + 40), "☁", fill=(255, 255, 255, 255), font=f_malgun_bd_28)
    d.text((main_x0 + 260, mr_y0 + 70), "☁", fill=(255, 255, 255, 255), font=f_malgun_bd_28)
    d.text((main_x1 - 80, mr_y0 + 50), "★", fill=(255, 220, 65, 255), font=f_malgun_bd_28)
    d.text((main_x1 - 160, mr_y0 + 90), "♪", fill=(255, 120, 150, 255), font=f_malgun_bd_28)

    # Miniroom Title Label
    d.text(((main_x0 + main_x1) // 2, floor_y0 + floor_h // 2), "《 뿡뿡이의 비밀 미니룸 》", fill=(145, 115, 85, 255), font=f_malgun_bd_24, anchor="mm")

    # 8. Ilchon Pyeong (일촌평) Box
    il_y0 = mr_y1 + 15
    il_y1 = skin_y1 - 30
    d.rectangle([main_x0, il_y0, main_x1, il_y1], fill=(255, 255, 255, 255), outline=(225, 230, 238, 255), width=1)
    d.text((main_x0 + 18, (il_y0 + il_y1) // 2), "일촌평", fill=(225, 65, 45, 255), font=f_malgun_bd_20, anchor="lm")
    d.text((main_x0 + 110, il_y0 + 26), "퍼가요~♡ (도토리 5개 선물합니다)", fill=(60, 65, 75, 255), font=f_gulim_18, anchor="lm")
    d.text((main_x0 + 110, il_y0 + 64), "야 너 오늘 지하철에서 소리 다 들렸음 ㅋㅋㅋ", fill=(115, 120, 130, 255), font=f_gulim_18, anchor="lm")
    d.text((main_x0 + 110, il_y0 + 102), "괄약근 대상 수상을 진심으로 축하드립니다!!", fill=(55, 110, 195, 255), font=f_gulim_18, anchor="lm")

    # 9. Bottom Windows Taskbar (y: 2280..2340)
    d.rectangle([0, H - 60, W, H], fill=(36, 94, 220, 255))
    d.line([(0, H - 60), (W, H - 60)], fill=(70, 140, 255, 255), width=2)
    # Start Button
    d.rounded_rectangle([0, H - 60, 140, H], radius=4, fill=(56, 160, 56, 255))
    d.text((70, H - 30), "시작", fill=(255, 255, 255, 255), font=f_malgun_bd_24, anchor="mm")
    # Task Button: Cyworld
    d.rounded_rectangle([150, H - 54, 460, H - 6], radius=4, fill=(30, 75, 185, 255), outline=(70, 130, 240, 255), width=1)
    d.text((170, H - 30), "싸이월드 - 사이좋은 사람...", fill=(255, 255, 255, 255), font=f_gulim_18, anchor="lm")
    # System Tray
    d.rectangle([W - 160, H - 54, W - 10, H - 6], fill=(15, 65, 180, 255))
    d.text((W - 85, H - 30), "오후 4:20", fill=(255, 255, 255, 255), font=f_gulim_18, anchor="mm")

    out_path = os.path.join(SKIN_BG_DIR, "bg_minihompy.png")
    im.save(out_path, "PNG")
    print(f"Direct Screenshot Saved: {out_path}")
    return im


def render_screenshot_bg_error():
    """Flat, direct digital screen capture of Windows 98 BSOD and cascading error waterfall avalanche meme."""
    (
        f_gulim_16, f_gulim_18, f_gulim_20, f_gulim_22, f_gulim_24, f_gulim_28,
        f_malgun_bd_20, f_malgun_bd_24, f_malgun_bd_28,
        f_fixed_22, f_fixed_24
    ) = get_fonts()

    # Pure classic Windows BSOD Royal Blue (0, 0, 170)
    im = Image.new("RGBA", (W, H), (0, 0, 170, 255))
    d = ImageDraw.Draw(im)

    # 1. BSOD Monospace Header & Text in Top 35% (y: 80..680)
    # Centered blue block banner: " Windows "
    d.rectangle([W // 2 - 120, 90, W // 2 + 120, 140], fill=(192, 192, 192, 255))
    d.text((W // 2, 115), "Windows", fill=(0, 0, 170, 255), font=f_fixed_24, anchor="mm")

    bsod_lines = [
        "",
        "A fatal exception 0E has occurred at 0028:C0011E36 in VXD BBOONG(01) +",
        "00010E36. The current application will be terminated.",
        "",
        "*  Press any key to terminate the current application.",
        "*  Press CTRL+ALT+DEL again to restart your computer. You will",
        "   lose any unsaved gas in all applications.",
        "",
        "Press any key to continue _"
    ]
    for idx, line in enumerate(bsod_lines):
        d.text((70, 160 + idx * 42), line, fill=(255, 255, 255, 255), font=f_fixed_22)

    # 2. Windows 98 3D-Beveled Window Drawing Function
    def draw_win98_window(draw, x0, y0, w, h, title="치명적인 오류: 엉덩이.exe", msg="괄약근 버퍼 오버플로우 발생!!", is_active=False):
        x1, y1 = x0 + w, y0 + h
        # Body
        draw.rectangle([x0, y0, x1, y1], fill=(192, 192, 192, 255))
        # 3D Highlight top & left (White)
        draw.line([(x0, y0), (x1, y0)], fill=(255, 255, 255, 255), width=2)
        draw.line([(x0, y0), (x0, y1)], fill=(255, 255, 255, 255), width=2)
        # 3D Shadow bottom & right (Black & Dark Grey)
        draw.line([(x0, y1), (x1, y1)], fill=(0, 0, 0, 255), width=2)
        draw.line([(x1, y0), (x1, y1)], fill=(0, 0, 0, 255), width=2)
        draw.line([(x0 + 1, y1 - 1), (x1 - 1, y1 - 1)], fill=(128, 128, 128, 255), width=1)
        draw.line([(x1 - 1, y0 + 1), (x1 - 1, y1 - 1)], fill=(128, 128, 128, 255), width=1)

        # Title bar: Gradient deep navy blue (#000080) for active, dark grey (#808080) for inactive
        t_col = (0, 0, 128, 255) if is_active else (128, 128, 128, 255)
        draw.rectangle([x0 + 4, y0 + 4, x1 - 4, y0 + 42], fill=t_col)
        draw.text((x0 + 16, y0 + 23), title, fill=(255, 255, 255, 255), font=f_malgun_bd_20, anchor="lm")

        # [X] Close button
        cx0, cy0, cx1, cy1 = x1 - 36, y0 + 7, x1 - 7, y0 + 36
        draw.rectangle([cx0, cy0, cx1, cy1], fill=(192, 192, 192, 255))
        draw.line([(cx0, cy0), (cx1, cy0)], fill=(255, 255, 255, 255), width=1)
        draw.line([(cx0, cy0), (cx0, cy1)], fill=(255, 255, 255, 255), width=1)
        draw.line([(cx0, cy1), (cx1, cy1)], fill=(0, 0, 0, 255), width=1)
        draw.line([(cx1, cy0), (cx1, cy1)], fill=(0, 0, 0, 255), width=1)
        draw.text(((cx0 + cx1) // 2, (cy0 + cy1) // 2), "X", fill=(0, 0, 0, 255), font=f_malgun_bd_20, anchor="mm")

        # Red Critical Error Stop Sign Icon [ (X) ]
        ix, iy = x0 + 55, y0 + 95
        draw.ellipse([ix - 26, iy - 26, ix + 26, iy + 26], fill=(220, 30, 30, 255))
        draw.text((ix, iy), "X", fill=(255, 255, 255, 255), font=f_malgun_bd_24, anchor="mm")

        # Message Body
        draw.text((x0 + 105, y0 + 82), msg, fill=(0, 0, 0, 255), font=f_gulim_22, anchor="lm")
        draw.text((x0 + 105, y0 + 116), "더 이상 참을 수 없습니다 (0xDEADFART)", fill=(120, 20, 20, 255), font=f_gulim_20, anchor="lm")

        # Windows 98 [ 확인 ] Button
        bx0, by0, bx1, by1 = (x0 + x1) // 2 - 70, y1 - 54, (x0 + x1) // 2 + 70, y1 - 16
        draw.rectangle([bx0, by0, bx1, by1], fill=(192, 192, 192, 255))
        draw.line([(bx0, by0), (bx1, by0)], fill=(255, 255, 255, 255), width=2)
        draw.line([(bx0, by0), (bx0, by1)], fill=(255, 255, 255, 255), width=2)
        draw.line([(bx0, by1), (bx1, by1)], fill=(0, 0, 0, 255), width=2)
        draw.line([(bx1, by0), (bx1, by1)], fill=(0, 0, 0, 255), width=2)
        draw.text(((bx0 + bx1) // 2, (by0 + by1) // 2), "확인", fill=(0, 0, 0, 255), font=f_malgun_bd_20, anchor="mm")

    # 3. Cascading Avalanche Meme: 22 cascading dialog boxes!
    win_w, win_h = 660, 205
    steps = 22
    for i in range(steps):
        wx = 70 + i * 20
        wy = 720 + i * 48
        is_last = (i == steps - 1)
        draw_win98_window(
            d, wx, wy, win_w, win_h,
            title="치명적인 오류: 엉덩이.exe",
            msg="괄약근 버퍼 오버플로우 발생!!",
            is_active=is_last
        )

    # 4. Windows 98 Bottom Taskbar (y: 2280..2340)
    d.rectangle([0, H - 60, W, H], fill=(192, 192, 192, 255))
    d.line([(0, H - 60), (W, H - 60)], fill=(255, 255, 255, 255), width=2)
    # Start button
    d.rectangle([4, H - 56, 120, H - 4], fill=(192, 192, 192, 255))
    d.line([(4, H - 56), (120, H - 56)], fill=(255, 255, 255, 255), width=2)
    d.line([(4, H - 56), (4, H - 4)], fill=(255, 255, 255, 255), width=2)
    d.line([(4, H - 4), (120, H - 4)], fill=(0, 0, 0, 255), width=2)
    d.line([(120, H - 56), (120, H - 4)], fill=(0, 0, 0, 255), width=2)
    d.text((62, H - 30), "시작", fill=(0, 0, 0, 255), font=f_malgun_bd_20, anchor="mm")

    # Error task buttons in taskbar
    for t_idx in range(4):
        tx0 = 130 + t_idx * 160
        tx1 = tx0 + 150
        d.rectangle([tx0, H - 54, tx1, H - 6], fill=(192, 192, 192, 255))
        d.line([(tx0, H - 54), (tx1, H - 54)], fill=(0, 0, 0, 255), width=1)
        d.line([(tx0, H - 54), (tx0, H - 6)], fill=(0, 0, 0, 255), width=1)
        d.line([(tx0, H - 6), (tx1, H - 6)], fill=(255, 255, 255, 255), width=1)
        d.line([(tx1, H - 54), (tx1, H - 6)], fill=(255, 255, 255, 255), width=1)
        d.text((tx0 + 10, H - 30), "엉덩이.exe", fill=(0, 0, 0, 255), font=f_gulim_16, anchor="lm")

    # Tray clock
    d.rectangle([W - 120, H - 54, W - 6, H - 6], fill=(192, 192, 192, 255))
    d.line([(W - 120, H - 54), (W - 6, H - 54)], fill=(128, 128, 128, 255), width=1)
    d.line([(W - 120, H - 54), (W - 120, H - 6)], fill=(128, 128, 128, 255), width=1)
    d.line([(W - 120, H - 6), (W - 6, H - 6)], fill=(255, 255, 255, 255), width=1)
    d.line([(W - 6, H - 54), (W - 6, H - 6)], fill=(255, 255, 255, 255), width=1)
    d.text((W - 63, H - 30), "오후 4:20", fill=(0, 0, 0, 255), font=f_gulim_16, anchor="mm")

    out_path = os.path.join(SKIN_BG_DIR, "bg_error.png")
    im.save(out_path, "PNG")
    print(f"Direct Screenshot Saved: {out_path}")
    return im


if __name__ == "__main__":
    print(">>> Generating Direct Screenshot-Style Backgrounds...")
    render_screenshot_bg_minihompy()
    render_screenshot_bg_error()
    print(">>> Finished rendering flat screenshot backgrounds!")
