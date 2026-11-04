"""방구 소리 팩: 방구에 겹쳐 나오는 짧은 효과음 (assets/sounds/pack_<id>.ogg). 숫자만으로 합성한다.

    python3 tools/make_packs.py

방구와 동시에 재생되므로 앞쪽 0.2~0.7초는 비워 두고 방구 뒤를 따라오게 만든다.
  drum       바둠츠 (림샷): 톰 두 번 + 심벌
  xmas       썰매 방울 + 징글벨 세 음
  halloween  오르간 단조 화음 + 유령 '우우~'
  seollal    꽹과리 네 번 + 징
  chuseok    대금 같은 피리 오음계 한 소절
  aprilfool  슬라이드 휘슬 올라갔다 내려감 + 띠용
"""
import os
import subprocess
import tempfile

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "sounds")
RNG = np.random.default_rng(3)


def silence(sec):
    return np.zeros(int(sec * SR))


def env(n, attack=0.004, decay=None):
    t = np.arange(n) / SR
    e = np.minimum(1, t / attack) if attack else np.ones(n)
    if decay:
        e *= np.exp(-t / decay)
    return e


def tone(freq, sec, partials=((1, 1),), decay=None, attack=0.004, vib=0, vib_hz=5.5):
    n = int(sec * SR)
    t = np.arange(n) / SR
    f = freq * (1 + vib * np.sin(2 * np.pi * vib_hz * t)) if vib else np.full(n, float(freq))
    phase = 2 * np.pi * np.cumsum(f) / SR
    x = sum(a * np.sin(phase * r) for r, a in partials)
    return x * env(n, attack, decay)


def sweep(f0, f1, sec, curve=1.0):
    n = int(sec * SR)
    k = np.linspace(0, 1, n) ** curve
    f = f0 * (f1 / f0) ** k
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def noise(sec, lo=None, hi=None, decay=None):
    x = RNG.standard_normal(int(sec * SR))
    if lo:
        x = sosfilt(butter(4, lo, "highpass", fs=SR, output="sos"), x)
    if hi:
        x = sosfilt(butter(4, hi, "lowpass", fs=SR, output="sos"), x)
    return x * env(len(x), 0.002, decay)


def add(a, b):
    """길이가 다른 두 소리를 겹치기"""
    out = np.zeros(max(len(a), len(b)))
    out[:len(a)] += a
    out[:len(b)] += b
    return out


def mix(parts, total):
    out = np.zeros(int(total * SR))
    for at, x, g in parts:
        i = int(at * SR)
        x = x[: len(out) - i]
        out[i:i + len(x)] += x * g
    return out


def master(x, peak=0.8):
    x = x / (np.abs(x).max() + 1e-9)
    f = min(len(x), int(0.05 * SR))
    x[-f:] *= np.linspace(1, 0, f)
    return x * peak


BELL = ((1, 1), (2.76, 0.4), (5.4, 0.15), (8.9, 0.05))
METAL = ((1, 1), (1.47, 0.7), (2.31, 0.5), (3.89, 0.3), (5.2, 0.2))
GONG = ((1, 1), (1.52, 0.5), (2.13, 0.35), (2.94, 0.2), (4.1, 0.1))


def drum():
    tom = lambda f: add(tone(f, 0.35, ((1, 1), (1.6, 0.3)), decay=0.09), noise(0.05, 800, 4000, 0.02) * 0.3)
    crash = noise(1.2, 3000, None, 0.35)
    return mix([(0.55, tom(190), 0.9), (0.72, tom(150), 1.0), (0.9, crash, 0.55), (0.9, tom(90), 0.5)], 2.1)


def xmas():
    parts = []
    for i in range(10):   # 썰매 방울: 8분음표 흔들기
        parts.append((0.2 + i * 0.12, noise(0.09, 6000, 12000, 0.03), 0.35 if i % 2 else 0.5))
    for i, f in enumerate([659.3, 659.3, 659.3]):   # 징 글 벨
        parts.append((0.35 + i * (0.22 if i < 2 else 0.25), tone(f, 0.7, BELL, decay=0.35), 0.6))
    parts.append((1.0, tone(1318.5, 0.9, BELL, decay=0.4), 0.25))
    return mix(parts, 1.9)


def halloween():
    trem = lambda x: x * (0.7 + 0.3 * np.sin(2 * np.pi * 6 * np.arange(len(x)) / SR))
    organ = sum(trem(tone(f, 1.1, ((1, 1), (2, 0.5), (3, 0.3), (4, 0.2)), attack=0.03)) for f in (146.8, 174.6, 220.0))
    organ *= np.linspace(1, 0.2, len(organ))
    n = int(1.1 * SR)
    t = np.arange(n) / SR
    f = 620 * np.exp(-t * 0.8) * (1 + 0.025 * np.sin(2 * np.pi * 6.5 * t))
    ghost = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.15) * np.linspace(1, 0, n) ** 0.6
    return mix([(0.25, organ, 0.45), (0.45, ghost, 0.5)], 1.8)


def seollal():
    hit = lambda: add(tone(820, 0.25, METAL, decay=0.06), noise(0.08, 2500, 9000, 0.03) * 0.4)
    parts = [(0.3 + i * 0.13, hit(), 0.55 if i < 3 else 0.7) for i in range(4)]
    parts.append((0.9, tone(110, 1.4, GONG, decay=0.6, attack=0.01), 0.9))
    return mix(parts, 2.3)


def chuseok():
    notes = [440.0, 523.3, 587.3, 659.3, 587.3]
    parts = []
    at = 0.3
    for i, f in enumerate(notes):
        d = 0.32 if i < 4 else 0.7
        x = tone(f, d + 0.05, ((1, 1), (2, 0.25), (3, 0.08)), attack=0.03, vib=0.012 if i == 4 else 0.004)
        x *= np.concatenate([np.ones(len(x) - int(0.06 * SR)), np.linspace(1, 0, int(0.06 * SR))])
        parts.append((at, x, 0.5))
        parts.append((at, noise(d, 1500, 6000, d) * 0.08, 1))   # 숨소리
        at += d
    parts.append((at - 0.2, tone(1760, 0.8, BELL, decay=0.3), 0.15))
    return mix(parts, at + 0.7)


def aprilfool():
    up = sweep(450, 1500, 0.4, 0.7)
    down = sweep(1500, 380, 0.35, 1.3)
    whistle = np.concatenate([up, down]) * env(len(up) + len(down), 0.02)
    n = int(0.7 * SR)
    t = np.arange(n) / SR
    f = 160 * (1 + 0.35 * np.exp(-t * 4) * np.sin(2 * np.pi * 9 * t))
    boing = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.003, 0.22)
    return mix([(0.3, whistle, 0.4), (1.05, boing, 0.8)], 1.9)


PACKS = {"drum": drum, "xmas": xmas, "halloween": halloween, "seollal": seollal, "chuseok": chuseok, "aprilfool": aprilfool}

if __name__ == "__main__":
    with tempfile.TemporaryDirectory() as d:
        for name, fn in PACKS.items():
            x = master(fn())
            wav = os.path.join(d, f"{name}.wav")
            wavfile.write(wav, SR, (x * 32767).astype(np.int16))
            out = os.path.join(OUT, f"pack_{name}.ogg")
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-ac", "1", "-c:a", "libvorbis", "-q:a", "4", out], check=True)
            print(out, f"{len(x) / SR:.2f}s")
