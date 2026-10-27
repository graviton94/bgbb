"""글꼴을 앱에 넣을 만큼만 잘라 woff2 로 만든다 (오프라인에서도 같은 글씨가 나오게).

    pip install fonttools brotli
    python3 tools/subset_fonts.py <원본 ttf 폴더>

Black Han Sans · Song Myung · Kirang Haerang · Black And White Picture · Gugi · East Sea Dokdo
(모두 SIL Open Font License 1.1, Google Fonts) 에서
영문·숫자·문장부호 + 자주 쓰는 한글 2,350자(KS X 1001) + 한글 자모만 남긴다.
그 밖의 글자(드문 한글, 이모지)는 기기 글꼴로 자연스럽게 넘어간다.
"""
import os
import sys

from fontTools import subset

SRC = sys.argv[1] if len(sys.argv) > 1 else "."
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "fonts")

FONTS = {
    "BlackHanSans-Regular.ttf": "blackhansans.woff2",
    # 일부러 구린 꾸밈 글씨 (궁서 · 양재와당 같은 느낌의 무료 대체, 모두 SIL OFL 1.1)
    "SongMyung.ttf": "songmyung.woff2",                       # 궁서 느낌 (근엄한 붓 명조)
    "KirangHaerang.ttf": "kiranghaerang.woff2",               # 양재와당 느낌 (촌스러운 장식체)
    "BlackAndWhitePicture.ttf": "blackandwhitepicture.woff2", # 옛날 영화 포스터
    "Gugi.ttf": "gugi.woff2",                                 # 각진 B급 간판
    "EastSeaDokdo.ttf": "eastseadokdo.woff2",                 # 붓글씨 손글씨
}


def charset():
    chars = set(chr(c) for c in range(0x20, 0x7F))                    # ASCII
    chars |= set("·…‘’“”–—~!?※★☆♥♡→←↑↓○●◎□■△▲▽▼%°")                   # 자주 쓰는 기호
    chars |= set(chr(c) for c in range(0x3131, 0x3164))                # 한글 호환 자모 ㄱ~ㅣ
    for hi in range(0xB0, 0xC9):                                       # KS X 1001 완성형 2,350자
        for lo in range(0xA1, 0xFF):
            try:
                chars.add(bytes([hi, lo]).decode("euc-kr"))
            except UnicodeDecodeError:
                pass
    return "".join(sorted(chars))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    text = charset()
    for src, dst in FONTS.items():
        if not os.path.exists(os.path.join(SRC, src)):
            print("없음:", src)
            continue
        opts = subset.Options()
        opts.flavor = "woff2"
        opts.layout_features = ["*"]
        opts.name_IDs = ["*"]
        font = subset.load_font(os.path.join(SRC, src), opts)
        sub = subset.Subsetter(opts)
        sub.populate(text=text)
        sub.subset(font)
        path = os.path.join(OUT, dst)
        subset.save_font(font, path, opts)
        print(f"{dst}: {os.path.getsize(path) // 1024}KB")
