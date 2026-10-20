import os
import wave
import numpy as np

os.makedirs("assets/sounds", exist_ok=True)
SR = 44100

def save_wav(filename, data):
    # Normalize to prevent clipping while keeping punchy loudness
    peak = np.max(np.abs(data))
    if peak > 0:
        data = data / peak * 0.92
    pcm = (data * 32767).astype(np.int16)
    path = os.path.join("assets/sounds", filename)
    with wave.open(path, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(pcm.tobytes())
    print(f"Saved {path} ({len(pcm)/SR:.2f}s)")

def biquad_bandpass(signal, f0, q, sr=SR):
    w0 = 2 * np.pi * f0 / sr
    alpha = np.sin(w0) / (2 * q)
    b0 = alpha
    b1 = 0.0
    b2 = -alpha
    a0 = 1.0 + alpha
    a1 = -2.0 * np.cos(w0)
    a2 = 1.0 - alpha
    b0, b1, b2, a1, a2 = b0/a0, b1/a0, b2/a0, a1/a0, a2/a0
    out = np.zeros_like(signal)
    x1 = x2 = y1 = y2 = 0.0
    for i in range(len(signal)):
        x0 = signal[i]
        y0 = b0*x0 + b1*x1 + b2*x2 - a1*y1 - a2*y2
        out[i] = y0
        x2, x1 = x1, x0
        y2, y1 = y1, y0
    return out

def biquad_lowpass(signal, f0, q=1.2, sr=SR):
    w0 = 2 * np.pi * f0 / sr
    alpha = np.sin(w0) / (2 * q)
    cosw = np.cos(w0)
    b0 = (1 - cosw) / 2
    b1 = 1 - cosw
    b2 = (1 - cosw) / 2
    a0 = 1 + alpha
    a1 = -2 * cosw
    a2 = 1 - alpha
    b0, b1, b2, a1, a2 = b0/a0, b1/a0, b2/a0, a1/a0, a2/a0
    out = np.zeros_like(signal)
    x1 = x2 = y1 = y2 = 0.0
    for i in range(len(signal)):
        x0 = signal[i]
        y0 = b0*x0 + b1*x1 + b2*x2 - a1*y1 - a2*y2
        out[i] = y0
        x2, x1 = x1, x0
        y2, y1 = y1, y0
    return out

np.random.seed(42)

# ==========================================================
# 1. FART SOUNDS (Mucosal valve slap + acoustic tube formants + micro-bubbles)
# ==========================================================
def make_fart_main():
    dur = 0.68
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    # Pitch contour: starts tight at 145Hz, drops to 58Hz with organic wobble
    f_base = 142 * np.exp(-1.5 * t) + 12 * np.sin(2 * np.pi * 19 * t)
    # Random mucosal jitter
    jitter = np.cumsum(np.random.randn(len(t)) * 0.08)
    jitter = np.clip(jitter, -12, 12)
    freq = np.clip(f_base + jitter, 38, 220)
    phase = 2 * np.pi * np.cumsum(freq) / SR

    # Non-linear sphincter pulse train (sharp opening slap + harmonic richness)
    pulse = np.exp(-3.5 * (np.mod(phase, 2*np.pi) / (2*np.pi))) * np.sin(phase)
    pulse += 0.65 * np.sin(2 * phase + 0.4) + 0.4 * np.sin(3 * phase) + 0.25 * np.sin(4 * phase)

    # Turbulent air + wet micro-bubbles gated by valve opening
    air = np.random.randn(len(t)) * (0.45 + 0.55 * np.maximum(0, np.sin(phase)))
    wet_bubbles = biquad_bandpass(air, 620, 3.5) + 0.7 * biquad_bandpass(air, 1150, 4.5)

    raw = 0.75 * biquad_lowpass(pulse, 580, 2.2) + 0.55 * wet_bubbles
    # Envelope with realistic sputtering bursts
    env = np.ones_like(t)
    env[:int(0.025*SR)] = np.linspace(0, 1, int(0.025*SR))
    env[int(0.45*SR):] = np.exp(-10 * (t[int(0.45*SR):] - 0.45))
    sputter = 0.78 + 0.22 * np.sin(2 * np.pi * 27 * t + np.sin(2 * np.pi * 7 * t))
    save_wav("fart_main.wav", raw * env * sputter)

def make_fart_soft():
    dur = 0.52
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    # High-pressure tight squeak ("삐이이익~ 피식...")
    f_squeak = 480 + 180 * np.sin(np.pi * t / dur) + 22 * np.sin(2 * np.pi * 34 * t)
    phase = 2 * np.pi * np.cumsum(f_squeak) / SR
    squeak = np.sin(phase) + 0.45 * np.sin(2 * phase) + 0.2 * np.sin(3 * phase)

    # Air leak hiss at the end
    hiss = biquad_bandpass(np.random.randn(len(t)), 1950, 2.5)
    env_squeak = np.exp(-((t - 0.16) / 0.13) ** 2)
    env_hiss = np.exp(-((t - 0.34) / 0.14) ** 2) * 0.7

    out = 0.75 * squeak * env_squeak + 0.65 * hiss * env_hiss
    save_wav("fart_soft.wav", out)

def make_fart_loud():
    dur = 1.05
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    # 3-stage explosive rumble ("부르르르릉~ 푸드득~ 뿡!!")
    f_curve = np.piecewise(
        t,
        [t < 0.35, (t >= 0.35) & (t < 0.68), t >= 0.68],
        [
            lambda x: 128 * np.exp(-1.8 * x) + 18 * np.sin(2 * np.pi * 28 * x),
            lambda x: 105 * np.exp(-1.5 * (x - 0.35)) + 22 * np.sin(2 * np.pi * 33 * x),
            lambda x: 155 * np.exp(-3.2 * (x - 0.68))
        ]
    )
    phase = 2 * np.pi * np.cumsum(np.clip(f_curve, 32, 220)) / SR
    brass = np.tanh(2.6 * (np.sin(phase) + 0.7 * np.sin(2 * phase) + 0.4 * np.sin(3 * phase)))

    # Wet bubble pops
    noise = np.random.randn(len(t)) * (0.5 + 0.5 * np.maximum(0, np.sin(phase)))
    bubbles = biquad_bandpass(noise, 480, 3.0) + 0.8 * biquad_bandpass(noise, 980, 4.0)

    # 3-stage amplitude envelope
    env = (
        0.95 * np.exp(-((t - 0.18) / 0.16) ** 2) +
        1.00 * np.exp(-((t - 0.50) / 0.15) ** 2) +
        1.15 * np.exp(-((t - 0.78) / 0.14) ** 2)
    )
    out = (0.8 * biquad_lowpass(brass, 680, 2.0) + 0.65 * bubbles) * env
    save_wav("fart_loud.wav", out)

# ==========================================================
# 2. TIT BIRD SOUNDS (Avian syrinx dual-voice + real wing-flap physics)
# ==========================================================
def make_tit_main():
    dur = 0.62
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    out = np.zeros_like(t)
    # 3 lively syllables: "포로롱~ 짹! 짹!"
    syllables = [
        (0.02, 0.20, 2700, 3900, 35.0),
        (0.25, 0.40, 3200, 4300, 12.0),
        (0.43, 0.59, 3500, 2600, 8.0),
    ]
    for s_start, s_end, f_start, f_end, fm_rate in syllables:
        mask = (t >= s_start) & (t < s_end)
        ts = t[mask] - s_start
        sdur = s_end - s_start
        f_inst = np.linspace(f_start, f_end, len(ts)) + 220 * np.sin(2 * np.pi * fm_rate * ts)
        ph = 2 * np.pi * np.cumsum(f_inst) / SR
        voice = np.sin(ph) + 0.28 * np.sin(2 * ph)
        env = np.sin(np.pi * ts / sdur) ** 1.4
        out[mask] += voice * env
    save_wav("tit_main.wav", out)

def make_tit_soft():
    dur = 0.50
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    # 4 rapid soft feather wing-beats ("파닥파닥") + tiny peep
    noise = np.random.randn(len(t))
    whoosh = biquad_bandpass(noise, 780, 1.4) + 0.6 * biquad_bandpass(noise, 1850, 1.8)
    flap_env = np.zeros_like(t)
    for center in [0.07, 0.17, 0.27, 0.37]:
        flap_env += np.exp(-((t - center) / 0.032) ** 2)
    # Tiny soft peep at 0.22s
    peep_env = np.exp(-((t - 0.22) / 0.04) ** 2) * 0.35
    peep = np.sin(2 * np.pi * 3400 * t) * peep_env
    save_wav("tit_soft.wav", whoosh * flap_env + peep)

def make_tit_loud():
    dur = 0.55
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    # Characteristic Long-tailed Tit excited rapid trill ("째애애액- 찌르르르!")
    f_carrier = 3600 + 650 * np.sin(np.pi * t / dur) + 480 * np.sin(2 * np.pi * 64 * t)
    ph = 2 * np.pi * np.cumsum(f_carrier) / SR
    sig = np.sin(ph) + 0.45 * np.sin(2 * ph) + 0.2 * np.sin(3 * ph)
    am = 0.65 + 0.35 * np.sin(2 * np.pi * 64 * t)
    env = np.ones_like(t)
    env[:int(0.02*SR)] = np.linspace(0, 1, int(0.02*SR))
    env[int(0.42*SR):] = np.linspace(1, 0, len(t) - int(0.42*SR))
    save_wav("tit_loud.wav", sig * am * env)

# ==========================================================
# 3. CAT SOUNDS (Feline vocal cord formants "냐아옹~", 26Hz purr, realistic hiss)
# ==========================================================
def make_cat_main():
    dur = 0.72
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    # Fundamental pitch arch of a real cat meow: 380Hz -> 640Hz -> 310Hz
    f0 = (
        360
        + 280 * np.sin(np.pi * (t / dur) ** 0.75)
        + 8 * np.sin(2 * np.pi * 6.5 * t)
    )
    ph = 2 * np.pi * np.cumsum(f0) / SR
    # Glottal harmonic series
    glottal = np.zeros_like(t)
    for k in range(1, 14):
        glottal += (1.0 / (k ** 0.85)) * np.sin(k * ph)

    # Time-varying vowel formant "/n-ya-a-ong/" (F1 sweeps 700 -> 1350 -> 550 Hz, F2 sweeps 1600 -> 2300 -> 950 Hz)
    part1 = biquad_bandpass(glottal, 1280, 2.4)
    part2 = biquad_bandpass(glottal, 720, 2.2)
    w_open = np.exp(-((t - 0.24) / 0.18) ** 2)
    voiced = w_open * part1 + (1 - 0.5 * w_open) * part2

    env = np.sin(np.pi * (t / dur) ** 0.8) ** 1.2
    save_wav("cat_main.wav", voiced * env)

def make_cat_soft():
    dur = 0.90
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    # Realistic 26.5Hz feline purr with cyclic laryngeal clicks + warm resonance
    f_purr = 26.5 + 1.2 * np.sin(2 * np.pi * 1.5 * t)
    ph = 2 * np.pi * np.cumsum(f_purr) / SR
    # Impulse-like laryngeal click train
    clicks = np.exp(4.0 * np.cos(ph)) / np.exp(4.0)
    carrier = (
        np.sin(2 * np.pi * 115 * t)
        + 0.6 * np.sin(2 * np.pi * 230 * t)
        + 0.35 * biquad_bandpass(np.random.randn(len(t)), 320, 2.0)
    )
    env = np.sin(np.pi * t / dur) ** 0.6
    save_wav("cat_soft.wav", clicks * carrier * env)

def make_cat_loud():
    dur = 0.58
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    # Sharp explosive spit ("크하-") + aggressive turbulent hiss ("아악!!")
    noise = np.random.randn(len(t))
    spit_burst = biquad_bandpass(noise, 1800, 1.2) * np.exp(-((t - 0.04) / 0.025) ** 2) * 1.5
    hiss_body = (
        0.7 * biquad_bandpass(noise, 2900, 1.5)
        + 0.5 * biquad_bandpass(noise, 4800, 2.0)
    )
    # Angry throat growl underneath
    f_growl = 490 * np.exp(-0.9 * t) + 35 * np.sin(2 * np.pi * 48 * t)
    ph = 2 * np.pi * np.cumsum(f_growl) / SR
    growl = biquad_bandpass(np.sin(ph) + 0.6 * np.sin(2 * ph), 1100, 2.0) * 0.45

    env = np.ones_like(t)
    env[:int(0.015*SR)] = np.linspace(0, 1, int(0.015*SR))
    env[int(0.35*SR):] = np.exp(-8.5 * (t[int(0.35*SR):] - 0.35))
    save_wav("cat_loud.wav", spit_burst + (hiss_body + growl) * env)

if __name__ == "__main__":
    make_fart_main()
    make_fart_soft()
    make_fart_loud()
    make_tit_main()
    make_tit_soft()
    make_tit_loud()
    make_cat_main()
    make_cat_soft()
    make_cat_loud()
