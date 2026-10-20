"""방구뿡 효과음 굽기.

    python3 tools/bake_sounds.py

assets/sounds/ 에 22.05kHz 모노 16bit WAV 를 굽는다. 필요한 건 numpy 뿐.
WAV 는 모든 브라우저·WebView·Android MediaPlayer 가 코덱 걱정 없이 재생하고,
22.05kHz 모노라 1초에 44KB 남짓이다.

캐릭터 소리는 <캐릭터>_<스타일>.wav (main / soft / loud), UI 소리는 ui_*.wav.
같은 시드로 구우므로 매번 같은 소리가 나온다.
"""
import os
import wave

import numpy as np

SR = 22050
NYQ = SR / 2
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "sounds")


# ---------------------------------------------------------------- DSP 기본기

def t_axis(dur):
    return np.arange(int(SR * dur)) / SR


def curve(t, *points):
    """(시각, 값) 꺾은선을 t 위에 펼친다."""
    xs, ys = zip(*points)
    return np.interp(t, xs, ys)


def svf(x, fc, q=0.707):
    """시간가변 상태변수 필터 (TPT). (lowpass, bandpass, highpass) 를 돌려준다."""
    n = len(x)
    fc = np.clip(np.broadcast_to(np.asarray(fc, dtype=float), (n,)), 20, NYQ * 0.95)
    g = np.tan(np.pi * fc / SR)
    k = 1.0 / q
    a1 = 1.0 / (1.0 + g * (g + k))
    a2 = g * a1
    a3 = g * a2
    lp = np.empty(n)
    bp = np.empty(n)
    ic1 = ic2 = 0.0
    for i in range(n):
        v3 = x[i] - ic2
        v1 = a1[i] * ic1 + a2[i] * v3
        v2 = ic2 + a2[i] * ic1 + a3[i] * v3
        ic1 = 2 * v1 - ic1
        ic2 = 2 * v2 - ic2
        lp[i] = v2
        bp[i] = v1
    hp = x - k * bp - lp
    return lp, bp, hp


def lowpass(x, fc, q=0.707, stages=1):
    for _ in range(stages):
        x = svf(x, fc, q)[0]
    return x


def bandpass(x, fc, q=1.0):
    return svf(x, fc, q)[1]


def highpass(x, fc, q=0.707):
    return svf(x, fc, q)[2]


def phase_of(freq):
    return 2 * np.pi * np.cumsum(freq) / SR


def harmonic_source(f0, tilt=1.0, max_harm=60):
    """앨리어싱 없는 톱니파 계열 (배음을 나이퀴스트 아래까지만 더한다)."""
    ph = phase_of(f0)
    out = np.zeros_like(f0)
    for k in range(1, max_harm + 1):
        mask = (k * f0) < NYQ * 0.9
        if not mask.any():
            break
        out += mask * np.sin(k * ph) / k ** tilt
    return out


def wobble(rng, n, rate_hz, depth):
    """느린 무작위 흔들림 (지터)."""
    steps = max(2, int(n / SR * rate_hz) + 2)
    pts = rng.standard_normal(steps)
    return 1 + depth * np.interp(np.linspace(0, steps - 1, n), np.arange(steps), pts)


def env_adsr(t, attack, release, total=None):
    total = total if total is not None else t[-1]
    e = np.ones_like(t)
    e = np.minimum(e, t / max(attack, 1e-4))
    e = np.minimum(e, np.clip((total - t) / max(release, 1e-4), 0, 1))
    return e


def master(x, rms_db=-16.0, peak_db=-1.0):
    """DC 제거 → 끝 클릭 방지 페이드 → 체감 음량 맞춤 → 부드러운 리미터."""
    x = x - np.mean(x)
    fade_in = min(len(x), int(0.003 * SR))
    fade_out = min(len(x), int(0.02 * SR))
    x[:fade_in] *= np.linspace(0, 1, fade_in)
    x[-fade_out:] *= np.linspace(1, 0, fade_out)
    rms = np.sqrt(np.mean(x ** 2)) + 1e-9
    x = x * (10 ** (rms_db / 20) / rms)
    peak = 10 ** (peak_db / 20)
    return np.tanh(x / peak) * peak


def save(name, x, **kw):
    os.makedirs(OUT, exist_ok=True)
    pcm = (master(x, **kw) * 32767).astype(np.int16)
    path = os.path.join(OUT, name + ".wav")
    with wave.open(path, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(pcm.tobytes())
    print(f"{name}.wav  {len(pcm) / SR:.2f}s  {os.path.getsize(path) // 1024}KB")


# ---------------------------------------------------------------- 방구 햄찌
# 괄약근이 떨리며 만드는 압력 펄스열 → 몸통 공명(저역 포먼트) → 공기 난류 섞기.
# 폰 스피커는 300Hz 아래를 거의 못 내므로 '부르륵' 하는 버즈 배음(300~1500Hz)에 힘을 싣는다.

def flutter_pulses(rng, f0, duty):
    """괄약근 한 번 펄럭일 때마다 짧은 압력 펄스 + 그 순간의 공기 난류.

    duty 는 한 주기 중 열려 있는 비율. 좁을수록(0.08~0.15) 배음이 많아져 '부르륵' 버즈가 되고,
    넓을수록(0.4) 순음에 가까운 '삐익' 이 된다. 펄스 모양은 모서리가 없어 고역이 새지 않는다.
    """
    ph = phase_of(f0)
    cycle = np.floor(ph / (2 * np.pi)).astype(int)
    shimmer = np.clip(1 + 0.3 * rng.standard_normal(cycle.max() + 2), 0.3, 2)
    pos = (ph / (2 * np.pi)) % 1.0
    duty = np.broadcast_to(duty, pos.shape)
    pulse = np.where(pos < duty, 0.5 - 0.5 * np.cos(2 * np.pi * np.minimum(pos / duty, 1)), 0.0)
    pulse = pulse * shimmer[cycle]
    turbulence = bandpass(rng.standard_normal(len(pos)), 1100, q=0.8) * pulse
    return pulse - pulse.mean() + 0.35 * turbulence


def sputter(rng, t, start, rate=14, depth=0.9):
    """끝부분에 '뿌드득' 끊기는 느낌: start 이후 무작위로 숨이 끊긴다."""
    gate = np.ones_like(t)
    n = len(t)
    steps = int(t[-1] * rate) + 2
    holes = (rng.random(steps) < 0.45).astype(float)
    holes = np.interp(np.linspace(0, steps - 1, n), np.arange(steps), holes)
    tail = np.clip((t - start) / max(t[-1] - start, 1e-3), 0, 1)
    return gate - depth * holes * tail


def hamster_main(rng):
    t = t_axis(0.6)
    f0 = curve(t, (0, 118), (0.12, 104), (0.4, 84), (0.6, 70)) * wobble(rng, len(t), 30, 0.06)
    src = flutter_pulses(rng, f0, duty=0.12)
    body = lowpass(src, curve(t, (0, 2600), (0.2, 1800), (0.6, 900)), q=1.0, stages=2)
    cavity = bandpass(src, 260, q=2.5) * 0.5 + bandpass(src, curve(t, (0, 650), (0.6, 480)), q=2.0) * 1.4
    air = lowpass(bandpass(rng.standard_normal(len(t)), 700, q=0.8), 1500) * 0.06
    env = env_adsr(t, 0.015, 0.18) * sputter(rng, t, 0.38)
    return (body + cavity + air) * env


def hamster_soft(rng):
    # 소심한 '삐용~ 피식': 좁게 조인 고음 삑 + 바람 새는 소리
    t = t_axis(0.5)
    f0 = curve(t, (0, 290), (0.08, 420), (0.22, 380), (0.5, 210)) * wobble(rng, len(t), 25, 0.04)
    squeak = flutter_pulses(rng, f0, duty=0.4)
    squeak = lowpass(bandpass(squeak, curve(t, (0, 900), (0.15, 1300), (0.5, 600)), q=2.0), 2500, stages=2)
    hiss = lowpass(bandpass(rng.standard_normal(len(t)), curve(t, (0, 2200), (0.5, 1300)), q=1.2), 4000)
    env_sq = env_adsr(t, 0.02, 0.25) * curve(t, (0, 1), (0.3, 0.7), (0.5, 0.2))
    env_hs = env_adsr(t, 0.05, 0.12) * curve(t, (0, 0.2), (0.2, 0.6), (0.5, 1.0))
    return squeak * env_sq + hiss * env_hs * 0.18


def hamster_loud(rng):
    # 우렁찬 2단 '부르르르릉!': 굵은 저음, 덜덜 떨리는 압력, 중간 재가속, 끝은 뿌득뿌득
    t = t_axis(1.15)
    f0 = curve(t, (0, 92), (0.35, 62), (0.42, 58), (0.47, 86), (0.8, 55), (1.15, 40))
    f0 = f0 * wobble(rng, len(t), 40, 0.09)
    src = flutter_pulses(rng, f0, duty=curve(t, (0, 0.1), (0.45, 0.14), (0.5, 0.08), (1.15, 0.12)))
    rattle = 1 + 0.45 * np.sin(phase_of(curve(t, (0, 19), (1.15, 11))))
    body = lowpass(src * rattle, curve(t, (0, 2800), (0.4, 1300), (0.47, 2400), (1.15, 700)), q=1.2, stages=2)
    cavity = bandpass(src, 200, q=3.0) * 0.6 + bandpass(src * rattle, curve(t, (0, 520), (1.15, 380)), q=2.2) * 1.5
    sub = np.sin(phase_of(f0 * 0.5)) * 0.25
    air = lowpass(bandpass(rng.standard_normal(len(t)), 600, q=0.7), 1400) * 0.07
    swell = curve(t, (0, 0.8), (0.38, 0.65), (0.45, 1.0), (1.15, 0.75))
    env = env_adsr(t, 0.01, 0.2) * swell * sputter(rng, t, 0.75, rate=11)
    return (body + cavity + sub + air) * env


# ---------------------------------------------------------------- 솜뭉치 오목눈이
# 작은 새의 울음관(syrinx)은 거의 순음: 빠른 주파수 스윕 + 트릴. 배음은 나이퀴스트 아래만.

def chirp(t, start, dur, f_from, f_to, level=1.0, curve_pow=0.6):
    out = np.zeros_like(t)
    m = (t >= start) & (t < start + dur)
    if not m.any():
        return out
    u = (t[m] - start) / dur
    f = f_from + (f_to - f_from) * u ** curve_pow
    ph = phase_of(f)
    tone = np.sin(ph) + (0.18 * np.sin(2 * ph) if f.max() * 2 < NYQ * 0.9 else 0)
    out[m] = tone * np.sin(np.pi * u) ** 1.5 * level
    return out


def trill(t, start, dur, center, depth, rate, level=1.0):
    out = np.zeros_like(t)
    m = (t >= start) & (t < start + dur)
    u = (t[m] - start) / dur
    f = center + depth * np.sin(2 * np.pi * rate * (t[m] - start))
    am = 0.6 + 0.4 * np.sin(2 * np.pi * rate * (t[m] - start) + 1.2)
    out[m] = np.sin(phase_of(f)) * am * np.sin(np.pi * u) ** 0.8 * level
    return out


def tit_main(rng):
    # '쮸리릿 쮸릿!' : 짧은 하강 스윕 3번 + 트릴 + 마무리 스윕
    t = t_axis(0.62)
    x = np.zeros_like(t)
    for i, start in enumerate((0.0, 0.065, 0.13)):
        x += chirp(t, start, 0.045, 7600 - i * 200, 5200, level=0.9)
    x += trill(t, 0.2, 0.17, 5600, 650, 42, level=0.8)
    x += chirp(t, 0.42, 0.06, 6800, 4600, level=1.0)
    x += chirp(t, 0.51, 0.07, 7000, 4300, level=0.85)
    return x


def tit_soft(rng):
    # '파닥파닥': 날갯짓마다 짧은 공기 덩어리 + 깃털 스침, 끝에 작은 '찌'
    t = t_axis(0.55)
    noise = rng.standard_normal(len(t))
    beats = np.zeros_like(t)
    for i in range(7):
        s = 0.02 + i * 0.058
        d = t - s
        beats += np.where(d > 0, np.exp(-d / 0.018) * (1 - np.exp(-d / 0.002)), 0) * (1 - i * 0.07)
    whoosh = bandpass(noise, 1400, q=0.9) * beats
    feather = highpass(noise, 3500) * beats * 0.25
    x = whoosh + feather
    x += chirp(t, 0.47, 0.05, 7400, 6000, level=0.25)
    return x


def tit_loud(rng):
    # 경계음 '째애액!': 거칠게 떨리는 고음 + 짧은 째깍 반복
    t = t_axis(0.5)
    f = curve(t, (0, 4800), (0.06, 6200), (0.4, 5600), (0.5, 4800))
    f = f + 500 * np.sin(2 * np.pi * 63 * t) + 120 * rng.standard_normal(len(t)).cumsum() / np.sqrt(len(t))
    rough = 0.55 + 0.45 * np.abs(np.sin(2 * np.pi * 31 * t))
    call = np.sin(phase_of(f)) * rough * env_adsr(t, 0.008, 0.12)
    clicks = sum(chirp(t, s, 0.02, 8200, 6500, level=0.5) for s in (0.0, 0.03))
    return call + clicks


# ---------------------------------------------------------------- 시크 뚱냥이
# 성대 배음 + 입 모양에 따라 움직이는 포먼트 (m → i → a → u: "먀아-옹")

def formant_voice(t, f0, formants, breath=0.06, rng=None):
    src = harmonic_source(f0, tilt=1.3)
    if rng is not None:
        src = src + breath * rng.standard_normal(len(t))
    out = np.zeros_like(t)
    for fc, q, gain in formants:
        out += bandpass(src, fc, q=q) * gain
    return out


def cat_main(rng):
    t = t_axis(0.8)
    f0 = curve(t, (0, 470), (0.18, 640), (0.32, 690), (0.6, 520), (0.8, 410))
    f0 = f0 * (1 + 0.012 * np.sin(2 * np.pi * 6 * t)) * wobble(rng, len(t), 12, 0.01)
    f1 = curve(t, (0, 420), (0.12, 760), (0.3, 1050), (0.55, 820), (0.8, 560))
    f2 = curve(t, (0, 2100), (0.12, 1900), (0.3, 1600), (0.55, 1250), (0.8, 950))
    voice = formant_voice(t, f0, [(f1, 4.0, 1.0), (f2, 6.0, 0.6), (3200, 8.0, 0.18)], rng=rng)
    nasal = lowpass(voice, curve(t, (0, 900), (0.1, 4500)), stages=2)   # 다문 입 'ㅁ' 으로 시작
    env = env_adsr(t, 0.05, 0.22) * curve(t, (0, 0.7), (0.3, 1.0), (0.8, 0.8))
    return nasal * env


def cat_soft(rng):
    # 골골송: 숨 내쉴 때·들이쉴 때 모두 약 26Hz 로 떨리는 저음
    t = t_axis(1.3)
    pulses = (0.5 - 0.5 * np.cos(phase_of(26 * wobble(rng, len(t), 3, 0.04)))) ** 3
    noise = rng.standard_normal(len(t))
    rumble = lowpass(noise, 520, q=1.0, stages=2) * 3 + bandpass(noise, 380, q=2.0) * 2 + np.sin(phase_of(np.full_like(t, 52))) * 0.3
    breath = curve(t, (0, 0), (0.05, 1.0), (0.55, 0.85), (0.62, 0.15), (0.68, 0.6), (1.2, 0.5), (1.3, 0))
    airy = lowpass(bandpass(rng.standard_normal(len(t)), 600, q=0.7), 1200) * 0.05
    return lowpass(rumble * pulses + airy, 1300, stages=2) * breath


def cat_loud(rng):
    # '캬아악!': 침 튀는 파열 → 넓은 하악 난류, 밑에 깔리는 으르렁
    t = t_axis(0.7)
    noise = rng.standard_normal(len(t))
    spit = bandpass(noise, 1700, q=1.0) * np.exp(-((t - 0.02) / 0.018) ** 2) * 2.2
    hiss = bandpass(noise, curve(t, (0, 4200), (0.7, 3600)), q=0.6) + 0.5 * highpass(noise, 6000)
    hiss *= (0.75 + 0.25 * np.sin(2 * np.pi * 33 * t)) * env_adsr(t, 0.02, 0.3)
    growl_f0 = curve(t, (0, 230), (0.7, 160)) * (1 + 0.08 * np.sin(2 * np.pi * 27 * t))
    growl = formant_voice(t, growl_f0, [(650, 3.0, 1.0), (1500, 4.0, 0.5)]) * env_adsr(t, 0.05, 0.3) * 0.35
    return spit + hiss * 0.8 + growl


# ---------------------------------------------------------------- UI

def ui_pop(rng):
    t = t_axis(0.09)
    f = curve(t, (0, 420), (0.09, 1300))
    return np.sin(phase_of(f)) * np.exp(-t / 0.025)


def ui_coin(rng):
    t = t_axis(0.42)
    x = np.zeros_like(t)
    for start, f in ((0.0, 1318.5), (0.07, 1760.0)):
        d = np.clip(t - start, 0, None)
        on = (t >= start)
        bell = np.sin(2 * np.pi * f * d) + 0.35 * np.sin(2 * np.pi * f * 2.76 * d) * np.exp(-d / 0.04)
        x += on * bell * np.exp(-d / 0.12)
    return x


def ui_freeze(rng):
    # 긴급탈출: '쉿-' 하고 소리가 얼어붙는 느낌 (하강하는 바람 + 유리 같은 고음)
    t = t_axis(0.5)
    shh = bandpass(rng.standard_normal(len(t)), curve(t, (0, 5000), (0.5, 2500)), q=1.5)
    shh *= env_adsr(t, 0.03, 0.25)
    glass = sum(np.sin(2 * np.pi * f * t) * np.exp(-t / 0.15) for f in (2093, 3136)) * 0.25
    return shh + glass


SOUNDS = {
    "hamster_main": hamster_main, "hamster_soft": hamster_soft, "hamster_loud": hamster_loud,
    "tit_main": tit_main, "tit_soft": tit_soft, "tit_loud": tit_loud,
    "cat_main": cat_main, "cat_soft": cat_soft, "cat_loud": cat_loud,
    "ui_pop": ui_pop, "ui_coin": ui_coin, "ui_freeze": ui_freeze,
}

QUIET_UI = {"ui_pop", "ui_coin", "ui_freeze"}

if __name__ == "__main__":
    for i, (name, fn) in enumerate(SOUNDS.items()):
        rng = np.random.default_rng(1000 + i)
        save(name, fn(rng), rms_db=-24.0 if name in QUIET_UI else -16.0)
