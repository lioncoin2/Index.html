#!/usr/bin/env python3
"""Part 1 soundtrack: dark ambient bed + sound design on the composition's cues + the Kokoro voice-over
(vo/part1/line-NN.wav placed at each 'vo' cue). Music ducks under the voice.
    python3 render/soundtrack_part1.py out/cues-part1.json out/soundtrack-part1.wav
"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..'))
sys.path.insert(0, os.path.abspath(os.path.join(ROOT, '..', 'orin-ad', 'render')))
from soundtrack import SR, Mix, bp, crash, fades, kick, lp, master, midi, noise_sweep, pad, rng, thump, tick, tvec  # noqa: E402
from soundtrack_v5 import riser, sub_drop, whoosh  # noqa: E402
from soundtrack_v6 import blip, sparkle  # noqa: E402
import numpy as np  # noqa: E402
from scipy.io import wavfile  # noqa: E402
from scipy.signal import resample_poly  # noqa: E402


def heartbeat(add, t0, t1, bpm=60, level=0.3):
    t = t0
    while t < t1:
        add('drums', thump(48, 0.35, 0.09), t, level)
        add('drums', thump(44, 0.3, 0.08), t + 0.22, level * 0.7)
        t += 60 / bpm


def build(cues, dur, T):
    mix = Mix(dur)
    add = mix.add
    # bed: a slow minor drone that changes colour per scene
    for t0, t1, notes in [(0, T['s2'], [38, 45, 50, 53]), (T['s2'], T['s3'], [41, 48, 53, 57]), (T['s3'], T['s4'], [36, 43, 50, 51]), (T['s4'], dur, [38, 45, 50, 53])]:
        add('music', pad(notes, t1 - t0, cutoff=900, attack=1.2, release=1.5, cents=14), t0, 0.16)
    heartbeat(add, 0.9, T['s2'] - 0.5, 56, 0.2)
    heartbeat(add, T['s4'] + 0.2, T['title'] - 0.2, 64, 0.24)
    for cu in cues:
        t, ty = cu['t'], cu['type']
        if ty == 'slam':
            add('drums', kick(f0=120, f1=36, ptau=0.08, atau=0.6, dur=1.6, click=1.0, drive=2.6, knock=0.8), t, 0.8)
            add('drums', crash(), t, 0.22); add('sfx', sub_drop(1.4), t, 0.3)
        elif ty == 'open':
            add('sfx', riser(cu['until'] - t + 0.3, 200, 5000), t - 0.3, 0.16)
        elif ty == 'blink':
            add('sfx', whoosh(0.35, 3000, 400), t, 0.18)
        elif ty == 'whoosh':
            add('sfx', whoosh(0.5, 400, 7000), t, 0.2)
        elif ty == 'pop':
            sparkle(add, t, 0.8)
        elif ty == 'ding':
            for k, m in enumerate([84, 88, 91]):
                add('sfx', blip(midi(m), 0.25, 0.12), t + k * 0.06, 0.12)
        elif ty == 'beep':
            add('sfx', blip(1500, 0.08, 0.03), t, 0.12); add('sfx', blip(1900, 0.1, 0.04), t + 0.1, 0.12)
        elif ty == 'roll':
            n = int((cu['until'] - t) / 0.12)
            for k in range(n): add('sfx', tick(k % 2 == 0), t + k * 0.12, 0.05)
        elif ty == 'type':
            k, tt = 0, t
            while tt < cu['until']:
                add('sfx', tick(True), tt, 0.06 + 0.03 * rng.random()); tt += 0.07 + 0.06 * rng.random(); k += 1
        elif ty == 'grow':
            n = int((cu['until'] - t) / 0.22)
            for k in range(n): add('sfx', blip(900 + 60 * (k % 9), 0.05, 0.02), t + k * 0.22, 0.04)
        elif ty == 'hit':
            add('drums', thump(55, 0.5, 0.15), t, 0.5); add('sfx', sub_drop(0.9), t, 0.2)
        elif ty == 'servo':
            tt = t
            while tt < cu['until']:
                add('sfx', noise_sweep(0.28, 600, 1800, q=3, shape='swell'), tt, 0.05); tt += 0.6
        elif ty == 'buzz':
            from soundtrack_v3 import buzzer
            add('sfx', buzzer(), t, 0.14)
        elif ty == 'line':
            add('sfx', noise_sweep(1.0, 300, 6000, q=1.2, shape='rise'), t, 0.18)
    mix.bus('verb')
    duck = np.ones(mix.n)
    # voice-over
    vo = np.zeros(mix.n)
    for cu in cues:
        if cu['type'] != 'vo': continue
        sr, x = wavfile.read(os.path.join(ROOT, 'vo', 'part1', f"line-{cu['i']:02d}.wav"))
        x = x.astype(float) / (32768.0 if x.dtype == np.int16 else 1.0)
        if x.ndim > 1: x = x.mean(axis=1)
        if sr != SR: x = resample_poly(x, SR, sr)
        i0 = int(cu['t'] * SR); m = min(len(x), mix.n - i0)
        vo[i0:i0 + m] += x[:m]
    vo = vo / (np.max(np.abs(vo)) + 1e-9) * 0.8
    on = np.convolve((np.abs(vo) > 0.02).astype(float), np.ones(int(0.3 * SR)) / int(0.3 * SR), 'same')
    for name in ('music', 'music_sc', 'drums', 'verb', 'sfx'):
        if name in mix.b: mix.b[name] *= 1 - (0.7 if name.startswith('music') else 0.45) * np.clip(on, 0, 1)
    mix.b['sfx'] = mix.bus('sfx') + np.vstack([vo, vo]) * 1.6
    return mix, duck


def main():
    meta = json.load(open(sys.argv[1], encoding='utf-8'))
    mix, duck = build(meta['cues'], meta['duration'], meta['T'])
    x = master(mix, duck)
    wavfile.write(sys.argv[2], SR, (x.T * 32767).astype(np.int16))
    print(f'soundtrack → {sys.argv[2]}  ({x.shape[1] / SR:.2f}s)')


if __name__ == '__main__':
    main()
