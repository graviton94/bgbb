"""고른 실제 녹음으로 앱 효과음 만들기.

    python3 tools/build_sounds.py        (numpy + ffmpeg)

tools/sound_candidates/ 의 후보(fetch_sounds.py 가 받아 둔 CC0 녹음) 중 CHOICES 에 적은 것을
가장 소리가 큰 구간만 잘라 → 앞뒤 무음 다듬고 → 페이드 → 스타일별 음량 맞추고 → assets/sounds/*.wav 로.
배경 소리는 끊김 없이 반복되게 끝을 앞에 겹쳐 둔다. 출처는 tools/sound_credits.json 에 남긴다.
"""
import json
import os
import subprocess
import wave

import numpy as np

SR = 22050
HERE = os.path.dirname(__file__)
CAND = os.path.join(HERE, "sound_candidates")
OUT = os.path.join(HERE, "..", "assets", "sounds")

# 결과 파일 → (후보 파일, 최대 길이 초, 음량 dB RMS)
# 캐릭터 소리는 <친구>_<스타일> · _2 · _3 = 서로 다른 녹음 3개 (재생할 때마다 하나를 고른다)
SOFT, MAIN, LOUD, UI = -21.0, -17.0, -14.0, -22.0
CHOICES = {
    "hamster_soft":   ("fart_squeak/01.ogg", 1.0, SOFT),
    "hamster_soft_2": ("fart_squeak/04.ogg", 1.0, SOFT),
    "hamster_soft_3": ("fart_squeak/06.ogg", 1.0, SOFT),
    "hamster_main":   ("fart_short/01.ogg", 1.4, MAIN),
    "hamster_main_2": ("fart_squeak/05.ogg", 1.4, MAIN),
    "hamster_main_3": ("fart_short/03.ogg", 1.4, MAIN),
    "hamster_loud":   ("fart_long/05.ogg", 2.6, LOUD),
    "hamster_loud_2": ("fart_long/06.ogg", 2.6, LOUD),
    "hamster_loud_3": ("fart_short/06.ogg", 1.0, LOUD),
    "tit_main":       ("bird_tweet/05.ogg", 1.6, MAIN),
    "tit_main_2":     ("bird_tweet/04.ogg", 1.6, MAIN),
    "tit_main_3":     ("bird_tweet/01.ogg", 1.6, MAIN),
    "tit_soft":       ("wings/03.ogg", 1.2, SOFT),
    "tit_soft_2":     ("wings/05.ogg", 1.2, SOFT),
    "tit_soft_3":     ("wings/01.ogg", 1.2, SOFT),
    "tit_loud":       ("bird_alarm/01.ogg", 1.6, LOUD),
    "tit_loud_2":     ("bird_alarm/03.ogg", 1.6, LOUD),
    "tit_loud_3":     ("bird_alarm/04.ogg", 1.6, LOUD),
    "cat_main":       ("cat_meow/01.ogg", 1.5, MAIN),
    "cat_main_2":     ("cat_meow/02.ogg", 1.5, MAIN),
    "cat_main_3":     ("cat_meow/05.ogg", 1.0, MAIN),
    "cat_soft":       ("cat_purr/02.ogg", 2.5, SOFT),
    "cat_soft_2":     ("cat_purr/03.ogg", 2.5, SOFT),
    "cat_soft_3":     ("cat_purr/05.ogg", 2.5, SOFT),
    "cat_loud":       ("cat_hiss/01.ogg", 1.5, LOUD),
    "cat_loud_2":     ("cat_hiss/04.ogg", 1.5, LOUD),
    "cat_loud_3":     ("cat_hiss/05.ogg", 1.5, LOUD),
    "ui_pop":         ("ui_pop/02.ogg", 0.25, UI),
    "ui_coin":        ("ui_coin/04.ogg", 0.8, UI),
    "ui_levelup":     ("ui_levelup/02.ogg", 1.0, UI),
    "ui_treasure":    ("ui_levelup/01.ogg", 1.8, UI),
    "ui_buy":         ("ui_buy/02.ogg", 1.4, UI),
    "ui_freeze":      ("ui_freeze/04.ogg", 1.2, UI),
}
# 배경 소리 → (후보 파일, 반복 길이 초)
AMBIENT = {
    "amb_day":   ("amb_day/02.ogg", 8.0),
    "amb_night": ("amb_night/05.ogg", 8.0),
    "amb_room":  ("amb_room/03.ogg", 6.0),
}
AMBIENT_DB = -30.0


def load(rel):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", os.path.join(CAND, rel), "-ac", "1", "-ar", str(SR),
                          "-f", "s16le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float64) / 32768


def loudest_window(x, seconds):
    """길이 seconds 짜리 창 중 에너지가 가장 큰 구간."""
    n = int(seconds * SR)
    if len(x) <= n:
        return x
    e = np.convolve(x ** 2, np.ones(n), mode="valid")
    i = int(np.argmax(e[:: max(1, SR // 200)]) * max(1, SR // 200))
    return x[i:i + n]


def trim(x, rel_db=-38.0, pad=0.02):
    """앞뒤 무음 자르기 (가장 큰 부분 대비 rel_db 보다 조용한 곳)."""
    hop = 256
    frames = np.array([np.sqrt(np.mean(x[i:i + hop] ** 2)) for i in range(0, len(x) - hop, hop)] or [0])
    loud = np.where(frames > frames.max() * 10 ** (rel_db / 20))[0]
    if not len(loud):
        return x
    a = max(0, loud[0] * hop - int(pad * SR))
    b = min(len(x), (loud[-1] + 1) * hop + int(pad * SR))
    return x[a:b]


def master(x, rms_db, fades=True):
    x = x - np.mean(x)
    if fades:
        fi, fo = min(len(x), int(0.005 * SR)), min(len(x), int(0.04 * SR))
        x[:fi] *= np.linspace(0, 1, fi)
        x[-fo:] *= np.linspace(1, 0, fo)
    # 음량은 소리가 나는 부분 기준으로 맞춘다 (긴 꼬리 때문에 작아지지 않게)
    hop = 512
    frames = np.array([np.sqrt(np.mean(x[i:i + hop] ** 2)) for i in range(0, max(1, len(x) - hop), hop)])
    active = frames[frames > frames.max() * 0.1] if len(frames) else np.array([1e-9])
    level = np.sqrt(np.mean(active ** 2)) + 1e-9
    x = x * (10 ** (rms_db / 20) / level)
    peak = 10 ** (-1.0 / 20)
    return np.tanh(x / peak) * peak


def seamless(x, seconds, xf=0.8):
    n, k = int(seconds * SR), int(xf * SR)
    x = loudest_window(x, seconds + xf)
    if len(x) < n + k:
        n = len(x) - k
    out = x[:n].copy()
    ramp = np.linspace(0, 1, k)
    out[:k] = out[:k] * ramp + x[n:n + k] * (1 - ramp)
    return out


def save(name, x):
    os.makedirs(OUT, exist_ok=True)
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    path = os.path.join(OUT, name + ".wav")
    with wave.open(path, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(pcm.tobytes())
    print(f"{name}.wav  {len(pcm) / SR:.2f}s  {os.path.getsize(path) // 1024}KB")


def main():
    manifest = json.load(open(os.path.join(CAND, "manifest.json")))
    by_file = {c["file"]: c for items in manifest.values() for c in items}
    for old in os.listdir(OUT) if os.path.isdir(OUT) else []:
        if old.endswith(".wav"):
            os.remove(os.path.join(OUT, old))
    credits = {}
    for name, (rel, seconds, db) in CHOICES.items():
        x = trim(loudest_window(trim(load(rel)), seconds))
        save(name, master(x, db))
        credits[name] = rel
    for name, (rel, seconds) in AMBIENT.items():
        save(name, master(seamless(load(rel), seconds), AMBIENT_DB, fades=False))
        credits[name] = rel
    # 출처 (파일별로 어느 녹음인지). 작성자·제목은 verify_credits.py 가 원본 페이지에서 확인해 채운다.
    used = {}
    for name, rel in credits.items():
        c = by_file[rel]
        entry = used.setdefault(c["page"] or c["url"], {"source": c["source"], "page": c["page"], "license": c["license"],
                                                        "title": c["title"], "used_as": []})
        entry["used_as"].append(name)
    with open(os.path.join(HERE, "sound_credits.json"), "w") as f:
        json.dump(sorted(used.values(), key=lambda e: e["used_as"][0]), f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
