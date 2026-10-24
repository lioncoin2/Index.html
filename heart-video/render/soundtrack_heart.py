#!/usr/bin/env python3
"""Heart explainer soundtrack: a soft warm pad, a real-ish "lub-dub" on every beat cue, gentle pops on labels
and steps, a ticking count in the hook.
    python3 render/soundtrack_heart.py out/cues.json out/soundtrack.wav
"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, '..', '..', 'orin-ad', 'render')))
from soundtrack import SR, Mix, lp, master, midi, pad, rng, tick, tvec  # noqa: E402
from soundtrack_v5 import whoosh  # noqa: E402
from soundtrack_v6 import blip, sparkle  # noqa: E402
import numpy as np  # noqa: E402
from scipy.io import wavfile  # noqa: E402


def heart_sound(f0, dur, tau, level):
    """A heart sound: a low damped thud with a short noisy attack, through a low-pass (like a stethoscope)."""
    t = tvec(dur)
    f = f0 * (1 + 0.6 * np.exp(-t / 0.015))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / tau)
    x += 0.35 * lp(rng.standard_normal(len(t)), 300) * np.exp(-t / 0.02)
    return np.tanh(2.2 * x) * level


def build(cues, T, dur):
    mix = Mix(dur)
    add = mix.add
    for t0, t1, notes in [(0, T['open'], [45, 52, 57, 61]), (T['open'], T['end'], [45, 52, 57, 60, 64]), (T['end'], dur, [45, 52, 57, 61, 64])]:
        add('music', pad(notes, t1 - t0, cutoff=1100, attack=1.0, release=1.4, cents=10), t0, 0.12)
    for cu in cues:
        t, ty = cu['t'], cu['type']
        if ty == 'lub':
            add('drums', heart_sound(55, 0.28, 0.06, 1.0), t, 0.7)
        elif ty == 'dub':
            add('drums', heart_sound(75, 0.22, 0.045, 0.8), t, 0.6)
        elif ty == 'count':
            n = int((cu['until'] - t) / 0.06)
            for k in range(n): add('sfx', tick(True), t + k * 0.06 * (1 - 0.4 * k / n), 0.05)
        elif ty in ('label', 'step'):
            sparkle(add, t, 0.6)
        elif ty == 'cap':
            add('sfx', whoosh(0.3, 600, 6000), t - 0.1, 0.06)
    mix.bus('verb')
    return mix, np.ones(mix.n)


def main():
    meta = json.load(open(sys.argv[1], encoding='utf-8'))
    mix, duck = build(meta['cues'], meta['T'], meta['duration'])
    x = master(mix, duck)
    wavfile.write(sys.argv[2], SR, (x.T * 32767).astype(np.int16))
    print(f'soundtrack → {sys.argv[2]}  ({x.shape[1] / SR:.2f}s)')


if __name__ == '__main__':
    main()
