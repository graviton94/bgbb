"""기상 알람 음악: 우리 효과음만으로 만든 30초짜리 웅장 · 시끄러움 · 정신없음 (끌 때까지 반복 재생).

    python3 tools/make_alarm.py            → assets/sounds/alarm_wake.ogg

128 BPM · 16마디 = 정확히 30초 (반복해도 박자가 안 어긋나게).
  1~2마디   팡파레 + 레어 방구 + 고양이 사이렌 (인트로)
  3~6마디   방구 킥 · 고양이 스네어 · 새 하이햇 + 방구 베이스
  7~10마디  고양이 멜로디 (A 단조 영웅 테마) + 새 리드
  11~14마디 전부 + 하이햇 두 배 + 방구 오케스트라 히트 + 레벨업 효과음
  15~16마디 피날레: 화음 방구 · 보물 효과음 · 사이렌 상승
"""
import os
import subprocess
import tempfile

import numpy as np
from scipy.io import wavfile
from scipy.signal import resample_poly, fftconvolve

ROOT = os.path.join(os.path.dirname(__file__), "..")
SND = os.path.join(ROOT, "assets/sounds")
OUT = os.path.join(SND, "alarm_wake.ogg")
SR = 44100
BPM = 128
BEAT = 60 / BPM
BAR = 4 * BEAT
LEN = 16 * BAR                      # 30.0초
RNG = np.random.default_rng(42)

mix = np.zeros((int(LEN * SR) + SR, 2))
hall = np.zeros_like(mix)           # 웅장함용 잔향 버스


def load(name):
    sr, x = wavfile.read(os.path.join(SND, name + ".wav"))
    x = x.astype(float)
    if x.ndim > 1:
        x = x.mean(axis=1)
    x /= np.abs(x).max() + 1e-9
    return resample_poly(x, SR, sr)


def pitch(x, semis):
    """재생 속도로 음높이 바꾸기 (길이도 같이 변함 = 다람쥐 · 괴물 목소리)"""
    if semis == 0:
        return x
    r = 2 ** (semis / 12)
    up, down = int(round(1000 / r)), 1000
    return resample_poly(x, up, down)


def cut(x, sec, fade=0.02):
    n = min(len(x), int(sec * SR))
    y = x[:n].copy()
    f = min(int(fade * SR), n)
    if f:
        y[-f:] *= np.linspace(1, 0, f)
    return y


def env(x, attack=0.005):
    a = min(int(attack * SR), len(x))
    y = x.copy()
    y[:a] *= np.linspace(0, 1, a)
    return y


def place(x, t, gain=1.0, pan=0.0, wet=0.0):
    i = int(t * SR)
    if i >= len(mix):
        return
    x = x[: len(mix) - i]
    l, r = np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)
    mix[i:i + len(x), 0] += x * gain * l
    mix[i:i + len(x), 1] += x * gain * r
    if wet:
        hall[i:i + len(x), 0] += x * gain * wet * l
        hall[i:i + len(x), 1] += x * gain * wet * r


def bar(n, beat=0.0):
    """n 마디(1부터)의 beat 박(0부터) 시각"""
    return (n - 1) * BAR + beat * BEAT


# ---- 재료 ----
toot = {k: load(k) for k in ["hamster_loud", "hamster_loud_2", "hamster_main", "hamster_main_2", "hamster_main_3",
                             "hamster_epic", "hamster_epic_2", "hamster_soft", "hamster_soft_2"]}
cat = {k: load(k) for k in ["cat_main", "cat_main_2", "cat_loud", "cat_loud_2", "cat_soft"]}
bird = {k: load(k) for k in ["tit_main", "tit_main_2", "tit_loud", "tit_soft", "tit_soft_2"]}
ui = {k: load(k) for k in ["ui_treasure", "ui_levelup", "ui_pop", "ui_freeze"]}


def onset(x, thr=0.25):
    """소리가 실제로 시작하는 곳부터 (앞 무음 잘라 박자에 딱 맞게)"""
    i = np.argmax(np.abs(x) > thr)
    return x[max(0, i - int(0.003 * SR)):]


KICK = env(cut(pitch(onset(toot["hamster_loud"]), -14), 0.32, 0.12))
KICK2 = env(cut(pitch(onset(toot["hamster_loud_2"]), -12), 0.28, 0.1))
SNARE = env(cut(onset(cat["cat_soft"]), 0.18, 0.08))
SNARE_T = env(cut(pitch(onset(toot["hamster_main"]), 5), 0.12, 0.05))
HAT = [env(cut(pitch(onset(bird[k]), 7), 0.06, 0.03)) for k in ["tit_main", "tit_soft", "tit_soft_2"]]
CRASH = cut(pitch(onset(cat["cat_loud"]), 3), 1.4, 0.8)

# A 단조: 마디마다 Am · F · C · G (방구 베이스 반음 차이)
CHORDS = [0, -4, 3, -2]


def bass(n, root):
    b = cut(pitch(onset(toot["hamster_main_2"]), -17 + root), BAR * 0.95, 0.25)
    place(env(b, 0.02), bar(n), 0.55, 0, 0.15)
    place(cut(pitch(onset(toot["hamster_soft"]), -12 + root), BEAT * 1.6, 0.1), bar(n, 2.5), 0.35, -0.2)


def drums(n, hats=8, fill=False):
    for b in (0, 2):
        place(KICK, bar(n, b), 0.95)
    place(KICK2, bar(n, 2.75), 0.6)
    for b in (1, 3):
        place(SNARE, bar(n, b), 0.55, 0.15, 0.25)
        place(SNARE_T, bar(n, b), 0.45, -0.1)
    for i in range(hats):
        place(HAT[i % 3], bar(n, i * 4 / hats), 0.28 if i % 2 else 0.4, 0.6 if i % 2 else -0.6)
    if fill:
        for i in range(6):
            place(SNARE_T, bar(n, 2.5 + i * 0.25), 0.3 + i * 0.08, (-1) ** i * 0.5, 0.2)


def hit(n, beat, root, gain=0.6):
    """방구 오케스트라 히트: 1 · 3 · 5도 방구를 한꺼번에"""
    for k, iv, pan in [("hamster_epic", 0, 0), ("hamster_loud", 3, -0.5), ("hamster_loud_2", 7, 0.5), ("hamster_epic_2", 12, 0)]:
        place(env(cut(pitch(onset(toot[k]), root + iv - 5), 0.55, 0.3)), bar(n, beat), gain, pan, 0.6)


# 고양이 영웅 테마 (반음, 박 길이)
THEME = [(0, 1), (3, 0.5), (7, 0.5), (12, 1), (10, 0.5), (7, 0.5),
         (5, 1), (3, 0.5), (5, 0.5), (7, 2), (0, 1), (3, 0.5), (7, 0.5), (12, 1), (15, 0.5), (14, 0.5), (12, 2), (7, 2)]


def melody(n0, voice, base, gain, pan, wet=0.35):
    t = bar(n0)
    for i, (iv, d) in enumerate(THEME):
        src = voice[i % len(voice)]
        place(env(cut(pitch(onset(src), base + iv), d * BEAT * 0.95, 0.06), 0.01), t, gain, pan, wet)
        t += d * BEAT


def siren(t0, dur, start, end, gain):
    """고양이 사이렌: 짧게 썬 야옹을 반음씩 올리며 연타"""
    steps = int(dur / (BEAT / 4))
    for i in range(steps):
        s = start + (end - start) * i / max(1, steps - 1)
        place(env(cut(pitch(onset(cat["cat_main"]), s), BEAT / 4 * 0.9, 0.02)), t0 + i * BEAT / 4, gain, (-1) ** i * 0.4, 0.3)


# ---- 1~2 인트로 ----
place(ui["ui_treasure"], bar(1), 0.9, 0, 0.5)
place(onset(toot["hamster_epic"]), bar(1, 0.5), 0.9, 0, 0.6)
place(CRASH, bar(1), 0.5, 0.3, 0.6)
for i in range(8):   # 방구 팀파니 롤 (점점 크게)
    place(KICK, bar(1, 2 + i * 0.25), 0.25 + i * 0.08, (-1) ** i * 0.3, 0.3)
siren(bar(2), BAR, -5, 12, 0.35)
hit(2, 0, CHORDS[0], 0.5)
drums(2, hats=4, fill=True)

# ---- 3~6 그루브 ----
for n in range(3, 7):
    root = CHORDS[(n - 3) % 4]
    drums(n, fill=(n == 6))
    bass(n, root)
    place(cut(onset(bird["tit_loud"]), 0.6), bar(n, 1.5), 0.3, 0.7, 0.4)
place(ui["ui_levelup"], bar(5), 0.45, -0.3, 0.3)

# ---- 7~10 고양이 테마 + 새 리드 ----
for n in range(7, 11):
    root = CHORDS[(n - 7) % 4]
    drums(n)
    bass(n, root)
melody(7, [cat["cat_main"], cat["cat_main_2"], cat["cat_loud"]], 0, 0.55, -0.15)
melody(9, [bird["tit_main"], bird["tit_main_2"]], 12, 0.25, 0.4, 0.5)
hit(7, 0, CHORDS[0], 0.45)
hit(9, 0, CHORDS[2], 0.45)

# ---- 11~14 다 같이 (하이햇 두 배 + 히트 + 레벨업) ----
for n in range(11, 15):
    root = CHORDS[(n - 11) % 4]
    drums(n, hats=16, fill=(n == 14))
    bass(n, root)
    hit(n, 0, root, 0.55)
    hit(n, 2.5, root, 0.35)
    place(ui["ui_levelup"], bar(n, 3), 0.35, (-1) ** n * 0.5, 0.3)
melody(11, [cat["cat_loud"], cat["cat_loud_2"]], 0, 0.6, 0, 0.4)
melody(11, [bird["tit_loud"], bird["tit_main"]], 12, 0.3, 0.5, 0.5)
melody(13, [toot["hamster_main_3"], toot["hamster_main"]], -12, 0.4, -0.5, 0.3)

# ---- 15~16 피날레 ----
drums(15, hats=16)
bass(15, 0)
hit(15, 0, 0, 0.7)
hit(15, 1, 3, 0.6)
hit(15, 2, 7, 0.6)
hit(15, 3, 12, 0.7)
place(ui["ui_treasure"], bar(15, 2), 0.7, 0, 0.6)
siren(bar(16), BAR * 0.75, 0, 24, 0.4)
place(onset(toot["hamster_epic_2"]), bar(16), 0.9, 0, 0.6)
for i in range(12):
    place(KICK, bar(16, i * 0.25), 0.4 + i * 0.03, (-1) ** i * 0.4)
hit(16, 3, 0, 0.6)

# ---- 잔향 (웅장) + 마스터 ----
ir_len = int(1.8 * SR)
decay = np.exp(-np.linspace(0, 6, ir_len))
ir = np.stack([RNG.standard_normal(ir_len) * decay, RNG.standard_normal(ir_len) * decay], 1)
ir /= np.abs(ir).sum(axis=0).max() / 6
for ch in range(2):
    mix[:, ch] += fftconvolve(hall[:, ch], ir[:, ch])[: len(mix)] * 0.6

# 30초 넘은 꼬리는 앞에 겹쳐서 반복할 때 끊김 없이
n = int(LEN * SR)
tail = mix[n:]
mix = mix[:n]
mix[: len(tail)] += tail

mix /= np.percentile(np.abs(mix), 99.7)
mix = np.tanh(mix * 1.3) / np.tanh(1.3)   # 시끄럽게 꽉 채우기 (소프트 클립)
mix *= 0.95

with tempfile.TemporaryDirectory() as d:
    wav = os.path.join(d, "alarm.wav")
    wavfile.write(wav, SR, (mix * 32767).astype(np.int16))
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-c:a", "libvorbis", "-q:a", "5", OUT], check=True)
print(OUT, f"{LEN:.2f}s")
