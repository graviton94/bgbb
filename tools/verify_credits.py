"""tools/sound_credits.json 의 출처를 원본 페이지에서 확인해 제목·작성자·라이선스를 채운다.

GitHub Actions(sound-credits 워크플로)에서 돌린다 (Freesound 에 바로 접속할 수 있는 곳).
Freesound 페이지의 <title> "제목 by 작성자 | Freesound" 와 라이선스 링크를 읽는다.
"""
import html
import json
import os
import re
import sys
import urllib.request

UA = "Mozilla/5.0 (X11; Linux x86_64) bgbb-credits/1.0 (+https://github.com/graviton94/bgbb)"
PATH = os.path.join(os.path.dirname(__file__), "sound_credits.json")


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.geturl(), r.read().decode("utf-8", "replace")


def main():
    credits = json.load(open(PATH))
    bad = 0
    for c in credits:
        if c["source"] != "freesound":
            continue
        try:
            final, page = fetch(c["page"])
        except Exception as e:  # noqa: BLE001
            print("fail", c["page"], e, file=sys.stderr)
            bad += 1
            continue
        m = re.search(r"<title>\s*(.*?)\s*</title>", page, re.S)
        title = html.unescape(m.group(1)) if m else ""
        tm = re.match(r"(?:Freesound\s*-\s*)?\"?(.*?)\"?\s+by\s+(.+?)(?:\s*[|\-]\s*Freesound.*)?$", title)
        user = re.search(r"/people/([^/]+)/sounds/\d+", final)
        c["title"] = tm.group(1) if tm else c["title"]
        c["author"] = user.group(1) if user else (tm.group(2) if tm else "")
        c["page"] = final
        if "/publicdomain/zero/" in page or "Creative Commons 0" in page:
            c["license"] = "CC0"
        elif re.search(r"/licenses/by/\d", page):
            c["license"] = "CC BY"
        else:
            c["license"] = "UNKNOWN"
            bad += 1
        print(f'{c["license"]:7} {c["author"]:24} {c["title"][:50]}  → {", ".join(c["used_as"])}')
    with open(PATH, "w") as f:
        json.dump(credits, f, ensure_ascii=False, indent=1)
    if bad:
        print(f"확인 안 된 출처 {bad}개", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
