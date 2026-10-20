"""실제 녹음 후보 모으기 (Wikimedia Commons, 자유 라이선스만).

GitHub Actions(fetch-sounds 워크플로)에서 돌린다:  python3 tools/fetch_sounds.py
후보를 tools/sound_candidates/<용도>/NN.ogg 로 받아 두고 manifest.json 에 출처를 적는다.
고르고 다듬는 건 tools/build_sounds.py.

받는 라이선스: CC0, 퍼블릭 도메인, CC BY (저작자 표시만 하면 상업적 사용 가능).
CC BY-SA 는 앱 전체에 동일 조건이 번질 수 있어 받지 않고, NC · ND · GFDL 도 받지 않는다.
"""
import json
import os
import re
import subprocess
import sys
import time
import urllib.parse
import urllib.request

API = "https://commons.wikimedia.org/w/api.php"
UA = "bgbb-sound-fetch/1.0 (https://github.com/graviton94/bgbb; ruahn49@gmail.com)"
OUT = os.path.join(os.path.dirname(__file__), "sound_candidates")
PER_NEED = 6
MAX_SECONDS = 90   # 너무 긴 녹음(한 시간짜리 숲 소리 등)은 건너뛴다

# 용도 → 검색어들 (앞쪽 검색어 결과를 먼저 고른다)
NEEDS = {
    "fart":        ["fart", "flatulence", "farting sound", "whoopee cushion"],
    "cat_meow":    ["cat meow", "meowing cat", "kitten meow", "cat miaow"],
    "cat_purr":    ["cat purring", "purr cat", "purring"],
    "cat_hiss":    ["cat hissing", "hiss cat", "cat growl hiss"],
    "bird_call":   ["Aegithalos caudatus", "long-tailed tit call", "Parus major call", "chickadee call", "sparrow chirp"],
    "bird_alarm":  ["bird alarm call", "Aegithalos caudatus alarm", "blackbird alarm call", "tit alarm call"],
    "wings":       ["bird wings flapping", "wings flapping", "pigeon wings take off", "flapping wings"],
    "amb_day":     ["birdsong meadow ambience", "dawn chorus", "countryside birds ambience", "park ambience birds"],
    "amb_night":   ["crickets night", "cricket chirping", "night insects ambience"],
    "amb_room":    ["clock ticking", "wall clock tick"],
    "ui_pop":      ["pop sound", "bubble pop", "cork pop", "mouth pop"],
    "ui_coin":     ["coin drop", "coins", "coin clink"],
    "ui_chime":    ["chime", "glockenspiel", "bell ding", "xylophone"],
}

OK_LICENSE = re.compile(r"^(cc0|public domain|pd|cc[- ]by[- ]\d|cc[- ]by \d|cc by$|cc-by$)", re.I)
BAD_LICENSE = re.compile(r"(sa|nc|nd|gfdl|fair use)", re.I)


def api(params):
    params = {**params, "format": "json", "formatversion": "2"}
    req = urllib.request.Request(API + "?" + urllib.parse.urlencode(params), headers={"User-Agent": UA})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except Exception as e:  # noqa: BLE001 - 네트워크 재시도
            print("  retry", e, file=sys.stderr)
            time.sleep(2 ** attempt)
    return {}


def license_ok(name):
    name = (name or "").strip()
    if not name or BAD_LICENSE.search(name.replace("Public domain", "")):
        return False
    return bool(OK_LICENSE.search(name))


def strip_html(s):
    return re.sub(r"<[^>]+>", "", s or "").strip()


def search(query):
    data = api({"action": "query", "list": "search", "srnamespace": 6, "srlimit": 40,
                "srsearch": f"{query} filetype:audio"})
    return [h["title"] for h in data.get("query", {}).get("search", [])]


def info(titles):
    data = api({"action": "query", "prop": "imageinfo|videoinfo", "titles": "|".join(titles),
                "iiprop": "url|extmetadata|mime|size", "viprop": "derivatives"})
    out = []
    for page in data.get("query", {}).get("pages", []):
        ii = (page.get("imageinfo") or [{}])[0]
        meta = ii.get("extmetadata", {})
        out.append({
            "title": page.get("title"),
            "url": ii.get("url"),
            "page": ii.get("descriptionurl"),
            "mime": ii.get("mime"),
            "duration": float(ii.get("duration") or 0),
            "license": strip_html(meta.get("LicenseShortName", {}).get("value")),
            "artist": strip_html(meta.get("Artist", {}).get("value")),
            "credit": strip_html(meta.get("Credit", {}).get("value"))[:200],
            "desc": strip_html(meta.get("ImageDescription", {}).get("value"))[:300],
        })
    return out


def to_preview(src_url, dst):
    """원본을 받아 22.05kHz 모노 ogg (앞쪽 최대 30초) 로."""
    tmp = dst + ".src"
    req = urllib.request.Request(src_url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as r, open(tmp, "wb") as f:
        f.write(r.read())
    ok = subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", tmp, "-t", "30", "-ac", "1", "-ar", "22050",
                         "-c:a", "libvorbis", "-q:a", "4", dst]).returncode == 0
    os.remove(tmp)
    return ok


def main():
    os.makedirs(OUT, exist_ok=True)
    manifest = {}
    for need, queries in NEEDS.items():
        seen, chosen = set(), []
        for q in queries:
            titles = [t for t in search(q) if t not in seen]
            seen.update(titles)
            for i in range(0, len(titles), 20):
                for c in info(titles[i:i + 20]):
                    if len(chosen) >= PER_NEED:
                        break
                    if not c["url"] or not license_ok(c["license"]):
                        continue
                    if c["duration"] and c["duration"] > MAX_SECONDS:
                        continue
                    chosen.append(c)
            if len(chosen) >= PER_NEED:
                break
        os.makedirs(os.path.join(OUT, need), exist_ok=True)
        kept = []
        for n, c in enumerate(chosen, 1):
            dst = os.path.join(OUT, need, f"{n:02d}.ogg")
            try:
                if to_preview(c["url"], dst):
                    kept.append({**c, "file": f"{need}/{n:02d}.ogg"})
            except Exception as e:  # noqa: BLE001
                print("  skip", c["title"], e, file=sys.stderr)
        manifest[need] = kept
        print(f"{need}: {len(kept)} 개")
        for k in kept:
            print(f"   {k['file']}  {k['duration']:.1f}s  [{k['license']}]  {k['title']}  — {k['artist'][:60]}")
    with open(os.path.join(OUT, "manifest.json"), "w") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
