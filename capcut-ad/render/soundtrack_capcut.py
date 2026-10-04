#!/usr/bin/env python3
"""
Soundtrack for the كاب كات برو ad, from the synth library in ../orin-ad/render and the effects in
../glasses-ad/render.

    python3 render/soundtrack_capcut.py out/cues.json out/soundtrack.wav

Music: a tense dark pulse under the problem (export, watermark stamp, locks, denied tap, card
declined); a ding for "الحل عدنا", a big unlock hit into a bright confident groove for the account,
the perks and the call to action. A VO at out/vo.wav is mixed in and ducks the music, as in the
other ads.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..'))
sys.path.insert(0, os.path.abspath(os.path.join(ROOT, '..', 'glasses-ad', 'render')))
sys.path.insert(0, os.path.abspath(os.path.join(ROOT, '..', 'orin-ad', 'render')))
from soundtrack import ARP, BEAT, CHORDS, SR, Mix, bass, bell, chirp, clap, crash, hat, kick, master, midi, noise_sweep, pad, pluck, thump, tick, tvec  # noqa: E402
from soundtrack_v5 import ding, riser, sub_drop, whoosh  # noqa: E402
from soundtrack_v6 import blip, sparkle  # noqa: E402
from soundtrack_v7 import alert, glitch, groove, load_wav, voice_chain  # noqa: E402
from soundtrack_glasses import ka_ching  # noqa: E402
import numpy as np  # noqa: E402
from scipy.io import wavfile  # noqa: E402


def boing(f0=330, dur=0.5, depth=0.35):
    t = tvec(dur)
    f = f0 * (1 + depth * np.exp(-t / 0.13) * np.sin(2 * np.pi * 15 * t))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (dur * 0.45))


def lock_click():
    t = tvec(0.12)
    x = np.sin(2 * np.pi * 1800 * t) * np.exp(-t / 0.01) + 0.6 * np.sin(2 * np.pi * 900 * t) * np.exp(-t / 0.03)
    return x / np.max(np.abs(x))


def build(cues, T, dur):
    mix = Mix(dur)
    add = mix.add
    kicks = []
    groove(add, kicks, 0.0, T['idea'] - 0.05, ['Am', 'F'], level=0.7, dark=True)
    groove(add, kicks, T['unlock'], T['end'], ['C', 'G', 'Am', 'F'], level=0.95, step=2.0)
    groove(add, kicks, T['end'], dur - 0.1, ['F', 'G', 'C', 'G'], level=1.0, step=1.0)
    add('music', pad(CHORDS['F']['pad'], T['unlock'] - T['idea'], cutoff=1500, attack=0.1, release=0.1), T['idea'], 0.35)
    for cu in cues:
        t, ty, k = cu['t'], cu['type'], cu.get('k', 0)
        if ty == 'cap':
            add('sfx', whoosh(0.3, 500, 4000), t - 0.05, 0.07)
        elif ty == 'tap':
            add('sfx', blip(1600, 0.05, 0.015), t, 0.14)
        elif ty == 'export':
            n = int((cu['until'] - t) / 0.08)
            for j in range(n):
                add('sfx', blip(900 + 60 * j, 0.03, 0.01), t + j * 0.08, 0.05)
        elif ty == 'stamp':
            boom = kick(f0=130, f1=42, ptau=0.08, atau=0.5, dur=1.2, click=0.9, drive=2.4, knock=0.8)
            add('drums', boom, t, 0.85); add('drums', crash(), t, 0.22); add('sfx', sub_drop(1.0), t, 0.3)
            add('sfx', alert(640), t + 0.05, 0.14)
        elif ty == 'lock':
            add('sfx', lock_click(), t, 0.25, pan=(-0.3 if k % 2 else 0.3))
            add('drums', thump(70 - 4 * k, 0.25, 0.06), t, 0.3)
        elif ty == 'denied':
            add('sfx', alert(520), t, 0.2); add('sfx', glitch(), t, 0.12)
        elif ty == 'whoosh':
            add('sfx', whoosh(0.45, 300, 6000, q=0.8), t, 0.2)
        elif ty == 'card':
            add('sfx', whoosh(0.4, 600, 5000), t, 0.14)
        elif ty == 'spin':
            n = int((cu['until'] - t) / 0.18)
            for j in range(n):
                add('sfx', tick(high=j % 2 == 0), t + j * 0.18, 0.12)
        elif ty == 'declined':
            boom = kick(f0=120, f1=40, ptau=0.08, atau=0.5, dur=1.0, click=0.8, drive=2.2, knock=0.7)
            add('drums', boom, t, 0.8); add('sfx', alert(440), t, 0.22); add('sfx', glitch(0.25), t, 0.15)
        elif ty == 'idea':
            ding(add, t, 1.0, big=True); sparkle(add, t + 0.06, 0.8)
            add('sfx', riser(T['unlock'] - t, 400, 9000), t, 0.2)
        elif ty == 'unlock':
            boom = kick(f0=130, f1=44, ptau=0.08, atau=0.55, dur=1.5, click=0.9, drive=2.2, knock=0.7)
            add('drums', boom, t, 0.9); add('drums', crash(), t, 0.3); add('verb', boom, t, 0.2)
            add('sfx', sub_drop(1.2), t, 0.3); add('sfx', noise_sweep(0.8, 9000, 800, q=1.0, shape='swell'), t, 0.08)
        elif ty == 'ok':
            add('sfx', pluck([72, 76, 79, 84][k % 4], 0.5, bright=1.0), t, 0.13)
            add('sfx', blip(1500 + 200 * k, 0.05, 0.02), t, 0.06)
        elif ty == 'crown':
            for j, m in enumerate([84, 88, 91, 96, 100]):
                add('sfx', bell(midi(m), 1.6, bright=0.8), t + j * 0.05, 0.08, pan=-0.4 + j * 0.2)
                add('verb', bell(midi(m), 1.6, bright=0.8), t + j * 0.05, 0.05)
        elif ty == 'perk':
            add('sfx', whoosh(0.3, 800, 6000), t - 0.05, 0.1); add('sfx', boing(380 + 60 * k, 0.3, 0.25), t + 0.15, 0.07)
        elif ty == 'price':
            add('sfx', ka_ching(), t, 0.26)
        elif ty == 'btn':
            add('sfx', chirp(700, 1600, 0.12, 0.06), t, 0.14); sparkle(add, t + 0.08, 0.6)
        elif ty == 'pulse':
            add('sfx', blip(1800, 0.05, 0.02), t, 0.05)

    duck = np.ones(mix.n)
    seg_t = tvec(0.45)
    seg = 1 - 0.6 * np.exp(-seg_t / 0.11) * np.minimum(1, seg_t / 0.004 + 0.3)
    for tk in kicks:
        i0 = int(round(tk * SR)); m = min(len(seg), mix.n - i0)
        if m > 0:
            duck[i0:i0 + m] = np.minimum(duck[i0:i0 + m], seg[:m])
    mix.bus('verb')
    vo_file = os.path.join(ROOT, 'out', 'vo.wav')
    if os.path.exists(vo_file):
        vo = voice_chain(load_wav(vo_file)[:, :mix.n])
        pad_n = mix.n - vo.shape[1]
        if pad_n > 0:
            vo = np.hstack([vo, np.zeros((2, pad_n))])
        env = np.abs(vo).max(axis=0)
        sm = np.convolve((env > 0.02).astype(float), np.ones(int(0.25 * SR)) / int(0.25 * SR), 'same')
        for name in ('music', 'music_sc', 'drums', 'verb'):
            if name in mix.b:
                mix.b[name] *= 1 - 0.65 * np.clip(sm, 0, 1)
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
