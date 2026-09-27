#!/usr/bin/env python3
"""
Procedural soundtrack + sound design for the Orin ad (no samples, no licences).

    python3 render/soundtrack.py out/cues.json out/soundtrack.wav

Music (120 BPM, grid starts at the logo impact):
  0–6 s    tension: ticking clock, heartbeat, dissonant drone, then a hopeful swell
  6 s      impact — beat drops: F  G  Am C  F  G  Am   (pads, bass, arp, drums)
  20–22 s  subject montage: chord stabs on every 8th note
  22–24 s  build: snare roll + riser
  24 s     impact — end card: C  F G  → final button at 28 s
Sound effects (typing, send, whooshes, pops, quiz success …) come from the cue
sheet the timeline exports, so they stay in sync if the animation changes.

Requires numpy, scipy; pyloudnorm (optional) for loudness normalisation.
"""
import json
import sys

import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
BPM = 120
BEAT = 60 / BPM
BAR = 4 * BEAT
rng = np.random.default_rng(11)


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tvec(dur):
    return np.arange(int(round(dur * SR))) / SR


# ───────────────────────────── filters ─────────────────────────────

def _sos(kind, f, order=2):
    return signal.butter(order, f, kind, fs=SR, output='sos')


def lp(x, f, order=2):
    return signal.sosfilt(_sos('low', f, order), x, axis=-1)


def hp(x, f, order=2):
    return signal.sosfilt(_sos('high', f, order), x, axis=-1)


def bp(x, lo, hi, order=2):
    return signal.sosfilt(_sos('band', [lo, hi], order), x, axis=-1)


def svf(x, fc, q=0.8, mode='bp'):
    """Time-varying state-variable filter (TPT). fc may be an array."""
    fc = np.broadcast_to(np.asarray(fc, float), x.shape)
    g = np.tan(np.pi * np.clip(fc, 20, SR * 0.45) / SR)
    k = 1.0 / q
    a1 = 1 / (1 + g * (g + k))
    a2 = g * a1
    a3 = g * a2
    ic1 = ic2 = 0.0
    out = np.empty(len(x))
    xs, A1, A2, A3 = x.tolist(), a1.tolist(), a2.tolist(), a3.tolist()
    for i in range(len(xs)):
        v3 = xs[i] - ic2
        v1 = A1[i] * ic1 + A2[i] * v3
        v2 = ic2 + A2[i] * ic1 + A3[i] * v3
        ic1 = 2 * v1 - ic1
        ic2 = 2 * v2 - ic2
        out[i] = v1 if mode == 'bp' else (v2 if mode == 'lp' else xs[i] - k * v1 - v2)
    return out


def _biquad(x, b, a):
    return signal.lfilter(b, a, x, axis=-1)


def shelf(x, f0, gain_db, kind):
    A = 10 ** (gain_db / 40)
    w = 2 * np.pi * f0 / SR
    al = np.sin(w) / 2 * np.sqrt(2)
    c = np.cos(w)
    sA = 2 * np.sqrt(A) * al
    if kind == 'low':
        b = [A * ((A + 1) - (A - 1) * c + sA), 2 * A * ((A - 1) - (A + 1) * c), A * ((A + 1) - (A - 1) * c - sA)]
        a = [(A + 1) + (A - 1) * c + sA, -2 * ((A - 1) + (A + 1) * c), (A + 1) + (A - 1) * c - sA]
    else:
        b = [A * ((A + 1) + (A - 1) * c + sA), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - sA)]
        a = [(A + 1) - (A - 1) * c + sA, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - sA]
    return _biquad(x, np.array(b) / a[0], np.array(a) / a[0])


def peak_eq(x, f0, gain_db, q):
    A = 10 ** (gain_db / 40)
    w = 2 * np.pi * f0 / SR
    al = np.sin(w) / (2 * q)
    c = np.cos(w)
    b = [1 + al * A, -2 * c, 1 - al * A]
    a = [1 + al / A, -2 * c, 1 - al / A]
    return _biquad(x, np.array(b) / a[0], np.array(a) / a[0])


def fades(x, fin=0.002, fout=0.01):
    x = np.array(x, float)
    n = x.shape[-1]
    a, b = min(n, int(fin * SR)), min(n, int(fout * SR))
    if a:
        x[..., :a] *= np.linspace(0, 1, a)
    if b:
        x[..., n - b:] *= np.linspace(1, 0, b)
    return x


# ───────────────────────────── oscillators ─────────────────────────────

_TABLES = {}


def table(weights, N=4096):
    key = tuple(np.round(weights, 5))
    if key not in _TABLES:
        k = np.arange(1, len(weights) + 1)[:, None]
        ph = np.arange(N)[None, :] / N
        _TABLES[key] = (np.asarray(weights)[:, None] * np.sin(2 * np.pi * k * ph)).sum(0)
    return _TABLES[key]


def osc(freq, n, weights, phase=0.0):
    """Wavetable oscillator; freq is a scalar or per-sample array."""
    tab = table(weights)
    N = len(tab)
    if np.isscalar(freq):
        ph = phase + freq * np.arange(n) / SR
    else:
        ph = phase + np.cumsum(freq) / SR
    p = (ph % 1.0) * N
    i = p.astype(int)
    fr = p - i
    return tab[i] * (1 - fr) + tab[(i + 1) % N] * fr


def saw_weights(f, cutoff, maxk=64):
    w = []
    for k in range(1, maxk + 1):
        if k * f > min(cutoff * 3, SR * 0.45):
            break
        w.append((1 / k) / np.sqrt(1 + (k * f / cutoff) ** 4))
    return np.array(w if w else [1.0])


# ───────────────────────────── instruments ─────────────────────────────

def kick(f0=170, f1=52, ptau=0.03, atau=0.2, dur=0.5, click=0.5, drive=1.8, knock=0.45):
    t = tvec(dur)
    f = f1 + (f0 - f1) * np.exp(-t / ptau)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / atau)
    kn = np.sin(2 * np.pi * np.cumsum(f * 2.6) / SR) * np.exp(-t / 0.035)
    ck = hp(rng.standard_normal(len(t)) * np.exp(-t / 0.003), 2500)
    x = np.tanh(drive * (body + knock * kn + click * 0.3 * ck)) / np.tanh(drive)
    return fades(x, 0.0005, 0.05)


def clap(dur=0.4):
    t = tvec(dur)
    e = np.zeros(len(t))
    for d in (0.0, 0.008, 0.017, 0.025):
        e += (t >= d) * np.exp(-np.maximum(t - d, 0) / 0.0055)
    tail = (t >= 0.025) * np.exp(-np.maximum(t - 0.025, 0) / 0.11)
    x = bp(rng.standard_normal(len(t)), 850, 3200) * (e + 0.6 * tail)
    return fades(x / np.max(np.abs(x)), 0.0005, 0.05)


def snare(dur=0.3, tone=185):
    t = tvec(dur)
    nz = bp(rng.standard_normal(len(t)), 1300, 8000) * np.exp(-t / 0.08)
    body = np.sin(2 * np.pi * tone * t) * np.exp(-t / 0.045)
    x = 0.85 * nz / np.max(np.abs(nz)) + 0.5 * body
    return fades(x, 0.0005, 0.03)


def hat(open_=False):
    dur = 0.35 if open_ else 0.07
    t = tvec(dur)
    x = hp(rng.standard_normal(len(t)), 7200, 2) * np.exp(-t / (0.11 if open_ else 0.02))
    return fades(x / np.max(np.abs(x)), 0.0003, 0.01)


def crash(dur=2.6):
    t = tvec(dur)
    x = hp(rng.standard_normal((2, len(t))), 3800) * np.exp(-t / 0.75)
    x += 0.4 * bp(rng.standard_normal((2, len(t))), 5500, 11000) * np.exp(-t / 0.35)
    return fades(x / np.max(np.abs(x)), 0.0005, 0.2)


def tick(high=True):
    t = tvec(0.09)
    f = 3100 if high else 2350
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.009) + 0.5 * np.sin(2 * np.pi * f * 0.51 * t) * np.exp(-t / 0.014)
    x += 0.35 * bp(rng.standard_normal(len(t)), 2000, 7000) * np.exp(-t / 0.003)
    return fades(x, 0.0003, 0.02)


def thump(f=58, dur=0.35, tau=0.11):
    t = tvec(dur)
    fr = f + 45 * np.exp(-t / 0.03)
    x = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t / tau)
    return fades(lp(x, 400), 0.002, 0.05)


def paper_slap():
    t = tvec(0.18)
    x = bp(rng.standard_normal(len(t)), 700, 3500) * np.exp(-t / 0.03)
    return fades(x / np.max(np.abs(x)), 0.0005, 0.02)


def bell(f, dur=2.0, bright=1.0):
    t = tvec(dur)
    parts = [(1.0, 1.0, 1.4), (2.0, 0.42, 0.8), (2.76, 0.30, 0.55), (4.07, 0.16 * bright, 0.35),
             (5.40, 0.10 * bright, 0.22), (8.93, 0.05 * bright, 0.12)]
    x = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / d) for r, a, d in parts if f * r < SR * 0.45)
    return fades(x, 0.0015, 0.2)


def pluck(m, dur=0.6, bright=1.0, decay=1.0):
    f = midi(m)
    t = tvec(dur)
    x = np.zeros(len(t))
    for k in range(1, 30):
        if k * f > 9000:
            break
        x += (1 / k ** 1.15) * np.sin(2 * np.pi * k * f * t + k * 0.7) * np.exp(-t * (3.0 + 2.6 * k * bright) / decay)
    return fades(x, 0.0012, 0.05)


def pad(notes, dur, cutoff=1500, cents=11, attack=0.3, release=0.7, voices=3, level=1.0):
    n = int(round((dur + release) * SR))
    t = np.arange(n) / SR
    out = np.zeros((2, n))
    for m in notes:
        for v in range(voices):
            c = (v - (voices - 1) / 2) * cents
            for ch in range(2):
                f = midi(m) * 2 ** ((c + (ch - 0.5) * 3.0) / 1200)
                out[ch] += osc(f, n, saw_weights(f, cutoff), phase=rng.uniform())
    env = np.minimum(1, t / attack) * np.where(t < dur, 1.0, np.exp(-(t - dur) / (release / 4)))
    out *= env / (len(notes) * voices)
    return fades(out * level, 0.002, 0.05)


def bass(m, dur):
    n = int(round(dur * SR))
    t = np.arange(n) / SR
    f = midi(m)
    sub = np.sin(2 * np.pi * f * t)
    mid = osc(2 * f, n, saw_weights(2 * f, 1500))
    env = np.minimum(1, t / 0.004) * (0.75 + 0.25 * np.exp(-t / 0.06))
    x = np.tanh(1.8 * (0.5 * sub + 0.8 * mid) * env)
    return fades(x, 0.002, 0.018)


def noise_sweep(dur, f0, f1, q=1.0, shape='rise', stereo=True):
    t = tvec(dur)
    fc = f0 * (f1 / f0) ** (t / dur)
    nz = rng.standard_normal(len(t))
    x = svf(nz, fc, q, 'bp')
    if shape == 'rise':
        env = (t / dur) ** 2.2
    else:  # 'swell' peaks at 55%
        p = 0.55 * dur
        env = np.where(t < p, (t / p) ** 1.6, np.exp(-(t - p) / (0.22 * dur)))
    x = x * env
    x /= np.max(np.abs(x)) + 1e-9
    if not stereo:
        return x
    pan = np.linspace(-0.7, 0.7, len(t))
    return np.vstack([x * np.clip(1 - pan, 0, 1), x * np.clip(1 + pan, 0, 1)])


def chirp(f0, f1, dur, tau):
    t = tvec(dur)
    fr = f0 * (f1 / f0) ** (t / dur)
    return fades(np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t / tau), 0.002, 0.01)


# ───────────────────────────── mixer ─────────────────────────────

class Mix:
    def __init__(self, dur):
        self.n = int(round(dur * SR))
        self.b = {}

    def bus(self, name):
        if name not in self.b:
            self.b[name] = np.zeros((2, self.n))
        return self.b[name]

    def add(self, name, sig, t, gain=1.0, pan=0.0):
        sig = np.asarray(sig, float)
        if sig.ndim == 1:
            sig = np.vstack([sig * min(1, 1 - pan), sig * min(1, 1 + pan)])
        i0 = int(round(t * SR))
        if i0 >= self.n:
            return
        s0 = max(0, -i0)
        i0 = max(0, i0)
        m = min(sig.shape[1] - s0, self.n - i0)
        if m > 0:
            self.bus(name)[:, i0:i0 + m] += sig[:, s0:s0 + m] * gain


def make_ir(rt60, pre=0.015, damp=6500):
    t = tvec(rt60 * 1.1)
    ir = rng.standard_normal((2, len(t))) * 10 ** (-3 * t / rt60)
    ir = lp(ir, damp)
    ir[:, :int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))
    ir = np.concatenate([np.zeros((2, int(pre * SR))), ir], axis=1)
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


def convolve(x, ir):
    return np.vstack([signal.fftconvolve(x[c], ir[c])[:x.shape[1]] for c in range(2)])


# ───────────────────────────── score ─────────────────────────────

CHORDS = {
    'F':  dict(pad=[53, 57, 60, 64], bass=41, arp=[65, 69, 72, 76]),
    'G':  dict(pad=[55, 59, 62, 69], bass=43, arp=[67, 71, 74, 79]),
    'Am': dict(pad=[57, 60, 64, 67], bass=45, arp=[69, 72, 76, 79]),
    'C':  dict(pad=[55, 60, 64, 71], bass=48, arp=[72, 76, 79, 83]),
    'Cadd9': dict(pad=[48, 55, 60, 64, 67, 74], bass=36, arp=[72, 76, 79, 86]),
}
ARP = [0, 2, 1, 3, 2, 1, 3, 0, 1, 2, 3, 1, 2, 0, 3, 2]


def build(cues, T, dur):
    mix = Mix(dur)
    add = mix.add
    t_imp, t_mont, t_all, t_end = T['impact'], T['montage'], T['allInOne'], T['end']

    # ---------------- intro: tension ----------------
    hush = next(c['t'] for c in cues if c['type'] == 'hush')
    drone_d = hush + 0.25
    d = pad([45, 52, 57, 58, 64], drone_d, cutoff=1150, cents=16, attack=1.8, release=0.25, level=1.0)
    n = d.shape[1]
    tt = np.arange(n) / SR
    d *= (0.35 + 0.65 * np.clip(tt / 4.4, 0, 1)) * np.where(tt < hush, 1.0, np.exp(-(tt - hush) / 0.05))
    add('music', d, 0.0, 0.95)
    sub = np.sin(2 * np.pi * midi(33) * tt) * np.minimum(1, tt / 2) * np.where(tt < hush, 1, np.exp(-(tt - hush) / 0.05))
    add('music', sub, 0.0, 0.07)
    for t in np.arange(1.0, hush - 0.1, 1.0):
        add('sfx', thump(72), t, 0.42)
        add('sfx', thump(64), t + 0.19, 0.28)

    # hopeful swell after "don't worry…" (reverse-envelope pad into the impact)
    sw_t0 = hush + 0.1
    sw = pad(CHORDS['F']['pad'] + [72], t_imp - sw_t0, cutoff=2600, attack=0.05, release=0.01, level=1.0)
    n = sw.shape[1]
    tt = np.arange(n) / SR
    sw *= np.clip((tt / (t_imp - sw_t0)), 0, 1) ** 2.4
    add('music', sw, sw_t0, 0.9)
    add('verb', sw, sw_t0, 0.25)

    # ---------------- groove sections ----------------
    prog = []  # (start, chord, bars)
    t = t_imp
    for name in ['F', 'G', 'Am', 'C', 'F', 'G', 'Am']:
        prog.append((t, name))
        t += BAR
    # t == montage start
    montage_chord, build_chord = 'F', 'G'

    kicks = []
    # kicks: impact → build (4 on the floor), none during the roll
    for tk in np.arange(t_imp, t_all + BAR * 0.25 + 1e-6, BEAT):
        kicks.append(tk)
    for tk in np.arange(t_end, t_end + 2 * BAR - 1e-6, BEAT):
        kicks.append(tk)
    for tk in kicks:
        add('drums', kick(), tk, 0.72)

    # sidechain envelope from kicks
    duck = np.ones(mix.n)
    seg_t = tvec(0.45)
    seg = 1 - 0.62 * np.exp(-seg_t / 0.11) * np.minimum(1, seg_t / 0.004 + 0.3)
    for tk in kicks:
        i0 = int(round(tk * SR))
        m = min(len(seg), mix.n - i0)
        duck[i0:i0 + m] = np.minimum(duck[i0:i0 + m], seg[:m])

    # claps on 2 & 4 once the phone is on screen
    for bs in np.arange(t_imp + BAR, t_all + BAR - 1e-6, BAR):
        for off in (BEAT, 3 * BEAT):
            add('drums', clap(), bs + off, 0.5, pan=0.05)
            add('verb', clap(), bs + off, 0.10)
    # hats
    for t8 in np.arange(t_imp, t_all + BAR - 1e-6, BEAT / 2):
        on_off = abs(((t8 - t_imp) / BEAT) % 1 - 0.5) < 1e-6
        if on_off:
            add('drums', hat(open_=(abs(((t8 - t_imp) / BAR) % 1 - 0.875) < 1e-6)), t8, 0.30, pan=0.25)
        elif t8 >= T['f3']:
            add('drums', hat(), t8, 0.12, pan=0.25)
    for t16 in np.arange(T['f3'], t_mont - 1e-6, BEAT / 4):
        if abs(((t16 - T['f3']) / (BEAT / 2)) % 1 - 0.5) < 1e-6:
            add('drums', hat(), t16, 0.08, pan=-0.2)

    # pads, bass, arp through the feature section
    for (bs, name) in prog:
        c = CHORDS[name]
        add('music_sc', pad(c['pad'], BAR, cutoff=2600, attack=0.12, release=0.5), bs, 1.25)
        for i in range(8):
            add('music_sc', bass(c['bass'] - 12, BEAT / 2 * 0.92), bs + i * BEAT / 2, 0.26)
        if bs >= T['f1'] - 1e-6:
            for i in range(16):
                m = c['arp'][ARP[i] % 4] + (12 if i in (6, 14) else 0)
                vel = 1.0 if i % 4 == 0 else 0.7
                add('music_sc', pluck(m, 0.5, bright=0.9), bs + i * BEAT / 4, 0.16 * vel, pan=(-0.35 if i % 2 else 0.35))
                add('verb', pluck(m, 0.5, bright=0.9), bs + i * BEAT / 4, 0.03 * vel)
    # lockup bar gets a bright pluck motif announcing the brand
    for i, m in enumerate([72, 76, 79, 84]):
        add('music', pluck(m, 0.9, bright=0.6, decay=1.5), t_imp + 0.25 + i * BEAT / 2, 0.16)
        add('verb', pluck(m, 0.9, bright=0.6, decay=1.5), t_imp + 0.25 + i * BEAT / 2, 0.08)

    # montage: chord stabs on every 8th + bass
    c = CHORDS[montage_chord]
    stab_times = [cc['t'] for cc in cues if cc['type'] == 'stab']
    for i, ts in enumerate(stab_times):
        ch = np.zeros((2, int(0.5 * SR)))
        for m in c['pad'] + [c['pad'][0] + 24]:
            p = pluck(m + 12, 0.5, bright=0.7, decay=0.8)
            ch[:, :len(p)] += p
        add('music', ch, ts, 0.11 * (1.15 if i % 2 == 0 else 0.9))
        add('verb', ch, ts, 0.03)
        add('music_sc', bass(c['bass'] - 12, BEAT / 2 * 0.9), ts, 0.30)
    add('music_sc', pad(c['pad'], BAR, cutoff=2400, attack=0.05, release=0.3), t_mont, 0.55)

    # build: G chord with opening filter, snare roll, riser
    c = CHORDS[build_chord]
    bpad = np.zeros((2, int((BAR + 0.3) * SR)))
    for k, cut in enumerate([1400, 2000, 2800, 4200]):
        seg_p = pad(c['pad'] + [c['pad'][0] + 12], BAR / 4, cutoff=cut, attack=0.02, release=0.08)
        i0 = int(k * BAR / 4 * SR)
        bpad[:, i0:i0 + seg_p.shape[1]] += seg_p[:, :bpad.shape[1] - i0]
    add('music_sc', bpad, t_all, 0.8)
    for i in range(8):
        add('music_sc', bass(c['bass'] - 12, BEAT / 2 * 0.9), t_all + i * BEAT / 2, 0.30)
    roll = []
    tr = t_all + BEAT
    while tr < t_end - 0.01:
        prog_r = (tr - t_all - BEAT) / (t_end - t_all - BEAT)
        roll.append((tr, prog_r))
        step = BEAT / 2 if prog_r < 0.34 else (BEAT / 4 if prog_r < 0.72 else BEAT / 8)
        tr += step
    for tr, pr in roll:
        add('drums', snare(), tr, 0.12 + 0.35 * pr ** 1.5, pan=0.0)
    add('sfx', noise_sweep(t_end - (t_all + BEAT), 500, 9000, q=0.9, shape='rise'), t_all + BEAT, 0.16)

    # ---------------- end card ----------------
    c = CHORDS['Cadd9']
    add('music', pad(c['pad'], 2 * BAR, cutoff=2600, attack=0.03, release=1.2), t_end, 0.9)
    add('verb', pad(c['pad'], 2 * BAR, cutoff=2600, attack=0.03, release=1.2), t_end, 0.2)
    for i, m in enumerate([36] * 8 + [29] * 4 + [31] * 4):
        add('music_sc', bass(m, BEAT / 2 * 0.9), t_end + i * BEAT / 2, 0.28)
    for i in range(28):
        m = c['arp'][ARP[i % 16] % 4]
        add('music_sc', pluck(m, 0.55, bright=0.7), t_end + 0.5 + i * BEAT / 4, 0.075, pan=(-0.4 if i % 2 else 0.4))
        add('verb', pluck(m, 0.55, bright=0.7), t_end + 0.5 + i * BEAT / 4, 0.03)
    for t8 in np.arange(t_end + BEAT / 2, t_end + 2 * BAR - 1e-6, BEAT):
        add('drums', hat(), t8, 0.13, pan=0.25)
    for bs in (t_end, t_end + BAR):
        for off in (BEAT, 3 * BEAT):
            add('drums', clap(), bs + off, 0.3)
    # F → G turnaround pads in the second end bar
    add('music_sc', pad(CHORDS['F']['pad'], BAR / 2, cutoff=2200, attack=0.05, release=0.3), t_end + BAR, 0.5)
    add('music_sc', pad(CHORDS['G']['pad'], BAR / 2, cutoff=2400, attack=0.05, release=0.3), t_end + BAR * 1.5, 0.5)
    # final button at 28 s
    t_btn = t_end + 2 * BAR
    add('drums', kick(f0=190, atau=0.4, dur=0.9, knock=0.6), t_btn, 0.8)
    add('drums', crash(), t_btn, 0.16)
    add('verb', crash(), t_btn, 0.05)
    fin = np.zeros((2, int(2.2 * SR)))
    for m in [48, 55, 60, 64, 67, 72, 76]:
        p = pluck(m, 2.2, bright=0.35, decay=4.0)
        fin[:, :len(p)] += p
    add('music', fin, t_btn, 0.20)
    add('verb', fin, t_btn, 0.12)
    add('music', pad(c['pad'], 0.4, cutoff=2000, attack=0.02, release=1.6), t_btn, 0.5)

    # ---------------- sound design from cues ----------------
    tick_i = 0
    for cu in cues:
        t, ty = cu['t'], cu['type']
        if ty == 'tick':
            add('sfx', tick(high=(tick_i % 2 == 0)), t, 0.40, pan=0.1)
            add('verb', tick(high=(tick_i % 2 == 0)), t, 0.06)
            tick_i += 1
        elif ty == 'roll':
            for k in range(7):
                add('sfx', tick(high=True) * 0.6, t + k * 0.035, 0.14, pan=-0.1)
        elif ty == 'textIn':
            add('sfx', noise_sweep(0.45, 300, 2400, q=1.2, shape='swell'), t - 0.1, 0.10)
        elif ty == 'thud':
            add('sfx', thump(70, dur=0.3, tau=0.07), t, 0.75)
            add('sfx', paper_slap(), t, 0.16, pan=[0.3, 0, -0.3][cu.get('i', 1)])
        elif ty == 'riser':
            dur = cu['until'] - t
            add('sfx', noise_sweep(dur, 300, 7000, q=0.9, shape='rise'), t, 0.22)
            tt = tvec(dur)
            sine = np.sin(2 * np.pi * np.cumsum(180 * (7 ** (tt / dur))) / SR) * (tt / dur) ** 2
            add('sfx', sine, t, 0.06)
        elif ty == 'impact':
            big = cu.get('big', False)
            boom = kick(f0=130, f1=44, ptau=0.08, atau=0.55, dur=1.6, click=0.9, drive=2.2, knock=0.7)
            add('drums', boom, t, 0.8 if big else 0.75)
            add('drums', crash(), t, 0.3)
            add('verb', crash(), t, 0.08)
            nb = lp(rng.standard_normal(int(0.9 * SR)), 900) * np.exp(-tvec(0.9) / 0.18)
            add('sfx', nb / np.max(np.abs(nb)), t, 0.25)
            add('verb', boom, t, 0.25)
        elif ty == 'drop2':
            add('drums', crash(), t, 0.16)
            add('verb', crash(), t, 0.05)
        elif ty in ('whoosh', 'whooshBig'):
            dur = (cu['until'] - t) if 'until' in cu else 0.5
            if ty == 'whooshBig':
                add('sfx', noise_sweep(dur + 0.05, 250, 6000, q=0.8, shape='rise'), t, 0.34)
            else:
                add('sfx', noise_sweep(dur, 350, 3800, q=1.1, shape='swell'), t - 0.08, 0.22 * cu.get('v', 1) / 0.6)
        elif ty in ('key', 'space'):
            k = bp(rng.standard_normal(int(0.03 * SR)), 1800 if ty == 'key' else 900, 6500 if ty == 'key' else 3500)
            k *= np.exp(-tvec(0.03) / (0.004 if ty == 'key' else 0.006))
            k = k / np.max(np.abs(k))
            add('sfx', fades(k, 0.0003, 0.005), t, (0.10 if ty == 'key' else 0.08) * rng.uniform(0.75, 1.1), pan=rng.uniform(-0.15, 0.15))
        elif ty == 'send':
            add('sfx', chirp(420, 1500, 0.16, 0.08), t, 0.22)
            add('sfx', noise_sweep(0.25, 800, 5000, q=1.0, shape='swell'), t - 0.03, 0.10)
            add('verb', chirp(420, 1500, 0.16, 0.08), t, 0.05)
        elif ty == 'reply':
            add('sfx', chirp(1320, 990, 0.12, 0.05), t, 0.13)
            add('verb', chirp(1320, 990, 0.12, 0.05), t, 0.04)
        elif ty == 'blip':
            add('sfx', chirp(1500, 1700, 0.07, 0.025), t, 0.09, pan=rng.uniform(-0.3, 0.3))
        elif ty == 'pop':
            add('sfx', chirp(900, 320, 0.09, 0.03), t, 0.22)
        elif ty == 'ding':
            add('sfx', bell(midi(88), 1.5), t, 0.10)
            add('verb', bell(midi(88), 1.5), t, 0.06)
        elif ty == 'tap':
            add('sfx', chirp(1900, 1200, 0.04, 0.01), t, 0.14)
        elif ty == 'success':
            for k, m in enumerate([83, 88, 95]):
                add('sfx', bell(midi(m), 1.4, bright=0.7), t + k * 0.075, 0.08)
                add('verb', bell(midi(m), 1.4, bright=0.7), t + k * 0.075, 0.05)
        elif ty == 'chime':
            for k, m in enumerate([84, 88, 91, 96]):
                add('sfx', bell(midi(m), 2.2, bright=0.6), t + k * 0.06, 0.08, pan=[-0.3, -0.1, 0.1, 0.3][k])
                add('verb', bell(midi(m), 2.2, bright=0.6), t + k * 0.06, 0.07)

    return mix, duck


def master(mix, duck):
    b = mix.b
    music = b.get('music', 0) + b.get('music_sc', np.zeros((2, mix.n))) * duck
    dry = music + b.get('drums', 0) + b.get('sfx', 0)
    wet = convolve(b['verb'], make_ir(2.2)) * 0.9 + convolve(b['verb'], make_ir(0.6, damp=8000)) * 0.4
    x = hp(dry + wet, 30)
    x = shelf(x, 80, -4.0, 'low')
    x = peak_eq(x, 2800, 2.0, 0.9)
    x = shelf(x, 7000, 2.5, 'high')

    # loudness → −14 LUFS (streaming / social target)
    try:
        import pyloudnorm as pyln
        loud = pyln.Meter(SR).integrated_loudness(x.T)
        x *= 10 ** ((-14.0 - loud) / 20)
    except Exception:
        x *= 0.25 / (np.sqrt(np.mean(x ** 2)) + 1e-9)

    # look-ahead peak limiter at −1.2 dBFS
    thr = 10 ** (-1.2 / 20)
    peak = np.max(np.abs(x), axis=0)
    need = np.minimum(1.0, thr / (peak + 1e-12))
    la = int(0.004 * SR)
    from scipy.ndimage import minimum_filter1d
    g = minimum_filter1d(need, size=2 * la + 1)
    rel = np.exp(-1 / (0.08 * SR))
    gs = g.copy()
    gl = gs.tolist()
    for i in range(1, len(gl)):
        gl[i] = min(gl[i], gl[i - 1] * rel + (1 - rel) * gl[i])
    g = np.minimum(np.array(gl), g)
    x *= g
    x = np.clip(x, -1, 1)

    # tail fade so the video ends on silence
    n = x.shape[1]
    f = int(0.6 * SR)
    x[:, n - f:] *= np.linspace(1, 0, f) ** 2
    return x


def main():
    cues_path, out = sys.argv[1], sys.argv[2]
    meta = json.load(open(cues_path, encoding='utf-8'))
    mix, duck = build(meta['cues'], meta['T'], meta['duration'])
    x = master(mix, duck)
    wavfile.write(out, SR, (x.T * 32767).astype(np.int16))
    print(f'soundtrack → {out}  ({x.shape[1] / SR:.2f}s, peak {20 * np.log10(np.max(np.abs(x)) + 1e-9):.1f} dBFS)')


if __name__ == '__main__':
    main()
