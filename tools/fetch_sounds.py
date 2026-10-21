"""실제 녹음 후보 모으기 (자유 라이선스만).

GitHub Actions(fetch-sounds 워크플로)에서 돌린다:  python3 tools/fetch_sounds.py
후보를 tools/sound_candidates/<용도>/NN.ogg 로 받아 두고 manifest.json 에 출처를 적는다.
고르고 다듬는 건 tools/build_sounds.py.

1순위 Freesound: 검색 결과를 CC0(퍼블릭 도메인 기증) 으로만 걸러서 미리듣기 파일을 받는다.
2순위 Wikimedia Commons: CC0 · 퍼블릭 도메인 · CC BY 만. 단어 발음 녹음(LL-…, Xx-…)은 뺀다.
CC BY-SA · NC · ND · GFDL 은 받지 않는다.
"""
import html
import json
import os
import re
import subprocess
import sys
import time
import urllib.parse
import urllib.request

UA = "Mozilla/5.0 (X11; Linux x86_64) bgbb-sound-fetch/2.0 (+https://github.com/graviton94/bgbb; ruahn49@gmail.com)"
OUT = os.path.join(os.path.dirname(__file__), "sound_candidates")
PER_NEED = 6

# 용도 → (Freesound 검색어들, 길이 범위 초, Commons 검색어들)
NEEDS = {
    "fart_short":  (["fart", "fart short"], (0.3, 2.5), ["fart", "flatulence"]),
    "fart_squeak": (["squeaky fart", "small fart"], (0.2, 2.5), ["fart"]),
    "fart_long":   (["long fart", "big fart"], (1.2, 6), ["fart"]),
    "cat_meow":    (["cat meow", "meow"], (0.3, 3), ["cat meow"]),
    "cat_purr":    (["cat purr", "purring"], (2, 20), ["cat purring"]),
    "cat_hiss":    (["cat hiss", "cat hissing"], (0.3, 3), ["cat hissing"]),
    "bird_tweet":  (["small bird chirp", "tit bird call", "chickadee", "bird tweet"], (0.3, 4), ["Yellowstone sound library chickadee", "chickadee"]),
    "bird_alarm":  (["bird alarm call", "bird squawk", "bird distress call"], (0.3, 4), ["bird alarm call"]),
    "wings":       (["bird wings flap", "wing flap", "pigeon flutter"], (0.3, 3), ["wings flapping"]),
    "amb_day":     (["birds ambience meadow", "birdsong park ambience", "countryside birds"], (10, 90), ["birdsong"]),
    "amb_night":   (["crickets night", "night crickets ambience"], (10, 90), ["crickets", "cricket chirping"]),
    "amb_room":    (["clock ticking", "wall clock tick"], (5, 60), ["clock ticking"]),
    "ui_pop":      (["pop", "bubble pop", "mouth pop"], (0.05, 0.8), ["pop"]),
    "ui_coin":     (["coin", "coin pickup", "coins drop"], (0.1, 2), ["coin dropped"]),
    "ui_chime":    (["chime", "success chime", "glockenspiel"], (0.3, 3), ["chime", "bell"]),
    "ui_levelup":  (["level up", "achievement", "positive jingle"], (0.4, 3), ["fanfare"]),
    "ui_buy":      (["cash register", "purchase", "cha ching"], (0.3, 3), ["cash register"]),
    "ui_freeze":   (["ice freeze", "freeze magic", "ice crack"], (0.2, 3), ["ice"]),
}


def get(url, binary=False):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "en"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=40) as r:
                data = r.read()
                return data if binary else data.decode("utf-8", "replace")
        except Exception as e:  # noqa: BLE001 - 네트워크 재시도
            print(f"  retry {attempt} {url[:90]} {e}", file=sys.stderr)
            time.sleep(2 ** attempt)
    return None


# ---------------------------------------------------------------- Freesound (CC0)

def freesound(query, dur):
    lo, hi = dur
    filt = f'license:"Creative Commons 0" duration:[{lo} TO {hi}]'
    results = []
    for sort in ("num_downloads desc", "Downloads (most first)"):
        url = "https://freesound.org/search/?" + urllib.parse.urlencode({"q": query, "f": filt, "s": sort})
        page = get(url)
        if not page:
            continue
        mp3s = re.findall(r'data-mp3="([^"]+)"', page)
        titles = re.findall(r'data-title="([^"]*)"', page)
        ids = re.findall(r'data-sound-id="(\d+)"', page) or re.findall(r'/sounds/(\d+)/', page)
        users = re.findall(r'/people/([^/"]+)/sounds/\d+/', page)
        durs = re.findall(r'data-duration="([\d.]+)"', page)
        print(f"  freesound '{query}' sort='{sort}': page {len(page)}B, {len(mp3s)} players, {len(ids)} ids", file=sys.stderr)
        if not mp3s:
            print("   sample:", re.sub(r"\s+", " ", page[page.find("<body"):][:400]), file=sys.stderr)
            continue
        for i, mp3 in enumerate(mp3s):
            sid = re.search(r"/(\d+)_\d+-", mp3)
            sid = sid.group(1) if sid else (ids[i] if i < len(ids) else "")
            results.append({
                "source": "freesound",
                "title": html.unescape(titles[i]) if i < len(titles) else f"freesound {sid}",
                "url": html.unescape(mp3).replace("-lq.mp3", "-hq.mp3"),
                "page": f"https://freesound.org/s/{sid}/" if sid else "",
                "artist": users[i] if i < len(users) else "",
                "license": "CC0",
                "duration": float(durs[i]) if i < len(durs) else 0.0,
            })
        break
    return results


# ---------------------------------------------------------------- Wikimedia Commons

COMMONS = "https://commons.wikimedia.org/w/api.php"
OK_LICENSE = re.compile(r"^(cc0|public domain|pd|cc[- ]by[- ]\d|cc[- ]by \d|cc by$|cc-by$)", re.I)
BAD_LICENSE = re.compile(r"(sa|nc|nd|gfdl|fair use)", re.I)
PRONUNCIATION = re.compile(r"^File:(LL-|[A-Z][a-z]{1,2}(-[a-z]{2})?-)|pronunciation|\((?:[a-z]{2,3})\)\.", re.I)


def license_ok(name):
    name = (name or "").strip()
    if not name or BAD_LICENSE.search(name.replace("Public domain", "")):
        return False
    return bool(OK_LICENSE.search(name))


def strip_html(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s or "")).strip()


def commons_api(params):
    raw = get(COMMONS + "?" + urllib.parse.urlencode({**params, "format": "json", "formatversion": "2"}))
    return json.loads(raw) if raw else {}


def commons(query, dur):
    data = commons_api({"action": "query", "list": "search", "srnamespace": 6, "srlimit": 40,
                        "srsearch": f"{query} filetype:audio"})
    titles = [h["title"] for h in data.get("query", {}).get("search", []) if not PRONUNCIATION.search(h["title"])]
    out = []
    for i in range(0, len(titles), 20):
        info = commons_api({"action": "query", "prop": "imageinfo", "titles": "|".join(titles[i:i + 20]),
                            "iiprop": "url|extmetadata|size"})
        for page in info.get("query", {}).get("pages", []):
            ii = (page.get("imageinfo") or [{}])[0]
            meta = ii.get("extmetadata", {})
            lic = strip_html(meta.get("LicenseShortName", {}).get("value"))
            d = float(ii.get("duration") or 0)
            if not ii.get("url") or not license_ok(lic) or (d and not dur[0] <= d <= max(dur[1], 30)):
                continue
            out.append({"source": "commons", "title": page["title"], "url": ii["url"], "page": ii.get("descriptionurl"),
                        "artist": strip_html(meta.get("Artist", {}).get("value"))[:120], "license": lic, "duration": d})
    return out


# ---------------------------------------------------------------- 받기

def to_preview(src_url, dst):
    """원본을 받아 22.05kHz 모노 ogg (앞쪽 최대 40초) 로."""
    data = get(src_url, binary=True)
    if not data:
        return False
    tmp = dst + ".src"
    with open(tmp, "wb") as f:
        f.write(data)
    ok = subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", tmp, "-t", "40", "-ac", "1", "-ar", "22050",
                         "-c:a", "libvorbis", "-q:a", "5", dst]).returncode == 0
    os.remove(tmp)
    return ok


def main():
    only = set(sys.argv[1:])
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, "manifest.json")
    manifest = json.load(open(path)) if os.path.exists(path) else {}
    for need, (fs_queries, dur, cm_queries) in NEEDS.items():
        if only and need not in only:
            continue
        chosen, seen = [], set()
        for q in fs_queries:
            for c in freesound(q, dur):
                if c["url"] not in seen and len(chosen) < PER_NEED:
                    seen.add(c["url"]); chosen.append(c)
            time.sleep(1)
        for q in cm_queries:
            if len(chosen) >= PER_NEED:
                break
            for c in commons(q, dur):
                if c["url"] not in seen and len(chosen) < PER_NEED:
                    seen.add(c["url"]); chosen.append(c)
        folder = os.path.join(OUT, need)
        os.makedirs(folder, exist_ok=True)
        for old in os.listdir(folder):
            os.remove(os.path.join(folder, old))
        kept = []
        for n, c in enumerate(chosen, 1):
            dst = os.path.join(folder, f"{n:02d}.ogg")
            try:
                if to_preview(c["url"], dst):
                    kept.append({**c, "file": f"{need}/{n:02d}.ogg"})
            except Exception as e:  # noqa: BLE001
                print("  skip", c["title"], e, file=sys.stderr)
        manifest[need] = kept
        print(f"{need}: {len(kept)}")
        for k in kept:
            print(f"   {k['file']}  {k['duration']:.1f}s  [{k['source']} {k['license']}]  {k['title'][:60]} — {k['artist'][:40]}")
    # 이번 목록에 없는 옛 용도(fart, bird_call 등)는 정리
    for old in [k for k in manifest if k not in NEEDS]:
        manifest.pop(old)
        folder = os.path.join(OUT, old)
        if os.path.isdir(folder):
            for f in os.listdir(folder):
                os.remove(os.path.join(folder, f))
            os.rmdir(folder)
    with open(path, "w") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
