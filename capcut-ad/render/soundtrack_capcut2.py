#!/usr/bin/env python3
"""
Soundtrack for the كاب كات برو ad v2 — a phonk-style beat (distorted 808, cowbell riff, trap hats)
on the same 120 BPM grid the kinetic type slams on.

    python3 render/soundtrack_capcut2.py out/cues-v2.json out/soundtrack-v2.wav

Hook: no beat, just a hit per word, a buzzer on 🚫 and a riser into the eyes; the reveal drops the
beat; the "without pro" bar thins out for the strikes; the beat runs to the end with a hit on
every perk, a cash register on the price and a riser + hit into the call to action. A VO at
out/vo-v2.wav ducks the music.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..'))
sys.path.insert(0, os.path.abspath(os.path.join(ROOT, '..', 'glasses-ad', 'render')))
sys.path.insert(0, os.path.abspath(os.path.join(ROOT, '..', 'orin-ad', 'render')))
from soundtrack import BEAT, SR, Mix, bp, clap, crash, fades, hat, kick, lp, master, midi, noise_sweep, rng, snare, thump, tvec  # noqa: E402
from soundtrack_v3 import buzzer  # noqa: E402
from soundtrack_v5 import riser, sub_drop, whoosh  # noqa: E402
from soundtrack_v6 import blip, sparkle  # noqa: E402
from soundtrack_v7 import load_wav, voice_chain  # noqa: E402
from soundtrack_glasses import ka_ching  # noqa: E402
import numpy as np  # noqa: E402
from scipy.io import wavfile  # noqa: E402


def cowbell(f, dur=0.32):
    """The phonk cowbell: two detuned square partials through a band-pass, quick decay."""
    t = tvec(dur)
    x = np.sign(np.sin(2 * np.pi * f * t)) + 0.8 * np.sign(np.sin(2 * np.pi * f * 1.48 * t))
    x = bp(x, f * 0.9, f * 3.2) * np.exp(-t / 0.09)
    return fades(x / (np.max(np.abs(x)) + 1e-9), 0.001, 0.02)


def b808(m, dur=0.9):
    """Distorted 808: sine with a fast pitch drop into the note, long tail, tanh drive."""
    t = tvec(dur)
    f0 = midi(m)
    f = f0 * (1 + 1.2 * np.exp(-t / 0.03))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (dur * 0.55))
    return fades(np.tanh(2.6 * x) * 0.9, 0.002, 0.05)


def hit(size):
    """One word slam: a punchy kick + a short noise crack, heavier for big words."""
    g = {'big': 1.0, 'mid': 0.75, 'small': 0.55, 'ban': 0.9, 'stamp': 0.85}.get(size, 0.7)
    k = kick(f0=150, f1=45, ptau=0.05, atau=0.25, dur=0.6, click=0.9, drive=2.4, knock=0.7) * g
    t = tvec(0.09)
    crack = bp(rng.standard_normal(len(t)), 1500, 8000) * np.exp(-t / 0.02) * 0.5 * g
    out = np.zeros(len(k))
    out[:len(k)] += k
    out[:len(crack)] += crack
    return out


def scratch():
    """Two strokes of a vinyl scratch."""
    out = np.zeros(int(0.3 * SR))
    for d, up in ((0.0, True), (0.13, False)):
        t = tvec(0.12)
        f = (900 + 2600 * (t / 0.12 if up else 1 - t / 0.12))
        x = bp(rng.standard_normal(len(t)), 600, 5000) * np.sin(2 * np.pi * np.cumsum(f) / SR * 0.02) ** 2
        x *= np.sin(np.pi * t / 0.12)
        i0 = int(d * SR)
        out[i0:i0 + len(x)] += x
    return out / (np.max(np.abs(out)) + 1e-9)


# A minor-ish phonk loop: one bar = 4 beats
BASS = [45, 45, 41, 43]            # A1 A1 F1 G1 per beat
BELL = [76, 0, 76, 79, 0, 76, 74, 0, 72, 0, 72, 74, 0, 72, 69, 0]   # 16ths over one bar (0 = rest)


def beat(add, kicks, t0, t1, level=1.0, thin=False):
    step = BEAT / 4
    n = int(round((t1 - t0) / step))
    for i in range(n):
        tb = t0 + i * step
        pos = i % 16
        if pos in (0, 7, 10) and not (thin and pos != 0):
            kicks.append(tb)
            add('drums', kick(f0=140, f1=44, dur=0.45, click=0.6, drive=2.0), tb, 0.62 * level)
        if pos in (4, 12):
            add('drums', clap(), tb, 0.42 * level, pan=0.05)
            add('drums', snare(0.2, 200), tb, 0.22 * level)
            add('verb', clap(), tb, 0.1 * level)
        if not thin and (pos % 2 == 0 or pos in (13, 15)):
            add('drums', hat(), tb, (0.16 if pos % 4 == 2 else 0.1) * level, pan=0.3)
        if pos % 4 == 0:
            m = BASS[(pos // 4) % 4]
            add('music_sc', b808(m, BEAT * (1.8 if pos in (0, 8) else 0.95)), tb, 0.42 * level)
        note = BELL[pos]
        if note and not thin:
            add('music_sc', cowbell(midi(note)), tb, 0.14 * level, pan=(-0.25 if pos % 2 else 0.25))
            add('verb', cowbell(midi(note)), tb, 0.03 * level)


def build(cues, T, dur):
    mix = Mix(dur)
    add = mix.add
    kicks = []
    beat(add, kicks, T['reveal'], T['nopro'], 1.0)
    beat(add, kicks, T['nopro'], T['demo'], 0.8, thin=True)
    beat(add, kicks, T['demo'], dur - 0.1, 1.0)
    for cu in cues:
        t, ty = cu['t'], cu['type']
        if ty == 'slam':
            add('drums', hit(cu.get('size', 'mid')), t, 0.55)
        elif ty == 'ban':
            add('sfx', buzzer(), t, 0.22)
        elif ty == 'rise':
            add('sfx', riser(cu['until'] - t, 300, 9000), t, 0.3)
            add('sfx', noise_sweep(cu['until'] - t, 500, 9000, q=1.2, shape='rise'), t, 0.1)
        elif ty == 'drop':
            boom = kick(f0=130, f1=40, ptau=0.08, atau=0.6, dur=1.6, click=1.0, drive=2.6, knock=0.8)
            add('drums', boom, t, 0.9)
            add('drums', crash(), t, 0.3)
            add('verb', boom, t, 0.2)
            add('sfx', sub_drop(1.4), t, 0.35)
        elif ty == 'stamp':
            add('drums', thump(60, 0.3, 0.07), t, 0.4)
        elif ty == 'strike':
            add('sfx', scratch(), t - 0.05, 0.2)
        elif ty == 'swipe':
            add('sfx', whoosh(cu['until'] - t, 400, 8000, q=0.8), t, 0.25)
        elif ty == 'pop':
            sparkle(add, t, 1.0)
        elif ty == 'perk':
            add('sfx', whoosh(0.25, 800, 7000), t - 0.12, 0.1)
        elif ty == 'price':
            add('sfx', ka_ching(), t, 0.3)
        elif ty == 'cta':
            add('sfx', riser(0.5, 500, 8000), t - 0.5, 0.25)
            add('drums', crash(), t, 0.26)
        elif ty == 'btn':
            add('sfx', blip(1400 + 300 * cu.get('k', 0), 0.06, 0.02), t, 0.1)
        elif ty == 'pulse':
            add('sfx', blip(1800, 0.05, 0.02), t, 0.05)
        elif ty == 'final':
            add('drums', crash(), t, 0.22)
            add('sfx', sub_drop(1.0), t, 0.2)

    duck = np.ones(mix.n)
    seg_t = tvec(0.4)
    seg = 1 - 0.65 * np.exp(-seg_t / 0.1) * np.minimum(1, seg_t / 0.004 + 0.3)
    for tk in kicks:
        i0 = int(round(tk * SR)); m = min(len(seg), mix.n - i0)
        if m > 0:
            duck[i0:i0 + m] = np.minimum(duck[i0:i0 + m], seg[:m])
    mix.bus('verb')
    vo_file = os.path.join(ROOT, 'out', 'vo-v2.wav')
    if os.path.exists(vo_file):
        vo = voice_chain(load_wav(vo_file)[:, :mix.n])
        if vo.shape[1] < mix.n:
            vo = np.hstack([vo, np.zeros((2, mix.n - vo.shape[1]))])
        on = np.convolve((np.abs(vo).max(axis=0) > 0.02).astype(float), np.ones(int(0.25 * SR)) / int(0.25 * SR), 'same')
        for name in ('music', 'music_sc', 'drums', 'verb'):
            if name in mix.b:
                mix.b[name] *= 1 - 0.65 * np.clip(on, 0, 1)
        mix.b['sfx'] = mix.bus('sfx') + vo * 0.9
        print('voice-over mixed')
    return mix, duck


def main():
    cues_path, out = sys.argv[1], sys.argv[2]
    meta = json.load(open(cues_path, encoding='utf-8'))
    mix, duck = build(meta['cues'], meta['T'], meta['duration'])
    x = master(mix, duck)
    wavfile.write(out, SR, (x.T * 32767).astype(np.int16))
    print(f'soundtrack → {out}  ({x.shape[1] / SR:.2f}s)')


if __name__ == '__main__':
    main()
