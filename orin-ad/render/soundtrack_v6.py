#!/usr/bin/env python3
"""
Soundtrack for ad v6 ("دزّ أي شي… Orin يفهّمك ياه" — student features), built from the
instruments in soundtrack.py / soundtrack_v5.py.

    python3 render/soundtrack_v6.py out/cues-v6.json out/soundtrack-v6.wav

  * hook        no groove: every file that lands on the pile is a paper-and-sub thud,
                then the vortex is a rising swirl that ends in one big hit and a
                fly-through whoosh
  * features    one continuous, bright 120 BPM groove (C–G–Am–F) under all three
                features, so the ad feels like a single ride; each section entry gets a
                fill + crash, and the UI is fully voiced: upload, taps, chips, typing-
                speed plucks, a camera shutter, a scanner sweep, success dings, a rating
                counter and "makeover" sparkles
  * end         the groove folds into the same Cadd9/F brand groove as the other ads
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from soundtrack import (  # noqa: E402
    ARP, BEAT, CHORDS, SR, Mix, bass, bell, bp, chirp, clap, crash, fades, hat, kick,
    master, midi, noise_sweep, pad, paper_slap, pluck, rng, thump, tick, tvec,
)
from soundtrack_v5 import beep, riser, sub_drop, tom, whoosh  # noqa: E402
import numpy as np  # noqa: E402
from scipy.io import wavfile  # noqa: E402


# ───────────────────────────── extra instruments ─────────────────────────────

def shutter():
    """Camera shutter: two fast mechanical clicks with a short noise body."""
    out = np.zeros(int(0.16 * SR))
    for d, g in ((0.0, 1.0), (0.055, 0.7)):
        t = tvec(0.05)
        x = bp(rng.standard_normal(len(t)), 1800, 9000) * np.exp(-t / 0.006)
        x += 0.5 * np.sin(2 * np.pi * 2400 * t) * np.exp(-t / 0.004)
        i0 = int(d * SR)
        out[i0:i0 + len(x)] += g * x / (np.max(np.abs(x)) + 1e-9)
    return fades(out, 0.0005, 0.02)


def scanner(dur):
    """Soft scanning sweep: a band-passed noise bed with a slowly rising sine shimmer."""
    t = tvec(dur)
    nz = noise_sweep(dur, 900, 5200, q=2.2, shape='swell', stereo=False)
    sh = np.sin(2 * np.pi * np.cumsum(1300 + 900 * t / dur) / SR) * (0.5 + 0.5 * np.sin(2 * np.pi * 14 * t))
    x = 0.8 * nz + 0.25 * sh * np.sin(np.pi * np.clip(t / dur, 0, 1))
    return fades(x, 0.02, 0.05)


def blip(f, dur=0.06, tau=0.02):
    t = tvec(dur)
    return fades(np.sin(2 * np.pi * f * t) * np.exp(-t / tau), 0.001, 0.01)


def sparkle(add, t, gain=1.0):
    for k, m in enumerate([96, 100, 103, 108, 103]):
        add('sfx', bell(midi(m), 0.7, bright=0.9), t + k * 0.045, 0.045 * gain, pan=[-0.4, 0.3, -0.1, 0.4, 0.0][k])
        add('verb', bell(midi(m), 0.7, bright=0.9), t + k * 0.045, 0.03 * gain)


def ding(add, t, gain=1.0):
    for k, m in enumerate([84, 88, 91, 96]):
        add('sfx', bell(midi(m), 1.6, bright=0.75), t + k * 0.045, 0.1 * gain, pan=[-0.3, -0.1, 0.1, 0.3][k])
        add('verb', bell(midi(m), 1.6, bright=0.75), t + k * 0.045, 0.06 * gain)


def groove(add, kicks, t0, t1, chords, step=2.0, level=1.0):
    """The bright feature groove: pad + 8th bass + 16th plucks, four-on-the-floor, claps on 2 & 4."""
    t = t0
    ci = 0
    while t < t1 - 0.05:
        c = CHORDS[chords[ci % len(chords)]]
        d = min(step, t1 - t)
        if t1 - (t + d) < 0.3:
            d = t1 - t
        add('music_sc', pad(c['pad'], d, cutoff=2200, attack=0.04, release=0.15), t, 0.4 * level)
        add('verb', pad(c['pad'], d, cutoff=2200, attack=0.04, release=0.15), t, 0.06 * level)
        for j in range(int(round(d / (BEAT / 2)))):
            tb = t + j * BEAT / 2
            if tb < t1 - 0.02:
                add('music_sc', bass(c['bass'] - 12, BEAT / 2 * 0.85), tb, 0.21 * level)
        for j in range(int(round(d / (BEAT / 4)))):
            tb = t + j * BEAT / 4
            if tb >= t1 - 0.02:
                break
            m = c['arp'][ARP[j % 16] % 4]
            add('music_sc', pluck(m, 0.45, bright=0.9), tb, 0.1 * level * (1 if j % 4 == 0 else 0.7), pan=(-0.3 if j % 2 else 0.3))
            add('verb', pluck(m, 0.45, bright=0.9), tb, 0.022 * level)
        t += d
        ci += 1
    for tb in np.arange(t0, t1 - 0.02, BEAT):
        kicks.append(tb)
        add('drums', kick(), tb, 0.6 * level)
        add('drums', hat(), tb + BEAT / 2, 0.3 * level, pan=0.25)
        for k in (1, 3):
            add('drums', hat(), tb + k * BEAT / 4, 0.12 * level, pan=-0.3)
        if round((tb - t0) / BEAT) % 2 == 1:
            add('drums', clap(), tb, 0.36 * level, pan=0.05)
            add('verb', clap(), tb, 0.08 * level)


# ───────────────────────────── score ─────────────────────────────

def build(cues, T, dur):
    mix = Mix(dur)
    add = mix.add
    kicks = []
    F, E, L = T['files'], T['end'], T['logo']

    # hook bed: low, uneasy drone under the pile (no rhythm yet)
    dr = pad([36, 43, 48, 49], T['vortex'] + 0.8, cutoff=700, cents=14, attack=0.2, release=0.3)
    add('music', dr, 0.0, 0.55)

    # the three features ride one groove; small breaths (drop the drums) at each section change
    sections = [(F, T['images'] - 0.36), (T['images'], T['opinion'] - 0.36), (T['opinion'], E - 0.45)]
    progs = [['C', 'G', 'Am', 'F'], ['Am', 'F', 'C', 'G'], ['F', 'G', 'C', 'Am']]
    for (a, b), pr in zip(sections, progs):
        groove(add, kicks, a, b, pr, step=2.0, level=0.9)

    # recap: a quick build into the logo
    add('music_sc', pad(CHORDS['G']['pad'], L - E, cutoff=1600, attack=0.2, release=0.1), E, 0.45)
    for j in range(int((L - E) / (BEAT / 2))):
        add('music_sc', bass(CHORDS['G']['bass'] - 12, BEAT / 2 * 0.9), E + j * BEAT / 2, 0.2)
    for th in np.arange(E + BEAT / 4, L - 0.05, BEAT / 4):
        pr = (th - E) / (L - E)
        add('drums', hat(), th, 0.07 + 0.14 * pr, pan=0.2)

    # brand groove under the end card
    for name, t0, span in (('Cadd9', L, 4 * BEAT), ('F', L + 4 * BEAT, 4 * BEAT)):
        c = CHORDS[name]
        d = min(span, dur - t0)
        if d <= 0.05:
            continue
        add('music', pad(c['pad'], d, cutoff=2600, attack=0.03, release=1.0), t0, 0.7)
        add('verb', pad(c['pad'], d, cutoff=2600, attack=0.05, release=1.0), t0, 0.15)
        for j in range(int(d / (BEAT / 2))):
            tk = t0 + j * BEAT / 2
            if tk < dur - 0.02:
                add('music_sc', bass(c['bass'] - 12, BEAT / 2 * 0.9), tk, 0.28)
        for j in range(int(d / (BEAT / 4))):
            tk = t0 + j * BEAT / 4
            if tk >= dur - 0.02:
                break
            m = c['arp'][ARP[j % 16] % 4]
            add('music_sc', pluck(m, 0.5, bright=0.85), tk, 0.13 * (1 if j % 4 == 0 else 0.7), pan=(-0.35 if j % 2 else 0.35))
            add('verb', pluck(m, 0.5, bright=0.85), tk, 0.03)
    for tk in np.arange(L, dur - 0.02, BEAT):
        kicks.append(tk)
        add('drums', kick(), tk, 0.6)
    for tc in np.arange(L + BEAT, dur - 0.02, 2 * BEAT):
        add('drums', clap(), tc, 0.44, pan=0.05)
        add('verb', clap(), tc, 0.1)
    for th in np.arange(L + BEAT / 2, dur - 0.02, BEAT):
        add('drums', hat(), th, 0.22, pan=0.25)

    # ---------------- sound design from cues ----------------
    chip_n = 0
    for cu in cues:
        t, ty = cu['t'], cu['type']
        pan = float(cu.get('pan', 0.0) or 0.0)
        if ty == 'hit':
            boom = kick(f0=130, f1=44, ptau=0.08, atau=0.45, dur=1.1, click=0.9, drive=2.2, knock=0.7)
            add('drums', boom, t, 0.75)
            add('drums', crash(), t, 0.2)
            add('sfx', paper_slap(), t, 0.4)
            add('sfx', sub_drop(1.0), t, 0.3)
        elif ty == 'slam':
            add('sfx', paper_slap(), t, 0.42, pan=pan * 0.7)
            add('drums', thump(60 + 6 * (cu.get('i', 0) % 3), 0.3, 0.08), t, 0.55, pan=pan * 0.3)
            add('sfx', whoosh(0.22, 800, 5000, q=1.0), t - 0.2, 0.08, pan=pan)
        elif ty == 'word':
            add('sfx', whoosh(0.3, 500, 3500), t - 0.06, 0.1)
        elif ty == 'ringIn':
            add('sfx', chirp(300, 1400, 0.4, 0.25), t, 0.1)
            add('sfx', bell(midi(84), 1.2, bright=0.5), t + 0.05, 0.06)
        elif ty == 'vortex':
            d = cu['until'] - t
            add('sfx', riser(d, 300, 9000), t, 0.46)
            sw = noise_sweep(d, 200, 4000, q=1.4, shape='rise')
            tt = np.arange(sw.shape[1]) / SR
            sw *= 0.6 + 0.4 * np.sin(2 * np.pi * np.cumsum(3 + 14 * tt / d) / SR)   # the swirl speeding up
            add('sfx', sw, t, 0.26)
        elif ty == 'impact':
            boom = kick(f0=130, f1=44, ptau=0.08, atau=0.55, dur=1.5, click=0.9, drive=2.2, knock=0.7)
            add('drums', boom, t, 0.82)
            add('drums', crash(), t, 0.28)
            add('verb', boom, t, 0.2)
            add('sfx', sub_drop(1.2), t, 0.3)
        elif ty == 'zoom':
            add('sfx', whoosh(cu['until'] - t + 0.2, 300, 8000, q=0.8), t, 0.28)
        elif ty == 'section':
            add('drums', crash(), t, 0.16)
            add('drums', kick(f0=150, f1=48, dur=0.7, knock=0.6), t, 0.4)
            if cu.get('i', 1) > 1:   # little tom fill into sections 02/03
                for k, f in enumerate((190, 150, 115)):
                    add('drums', tom(f, 0.3, 0.1), t - 0.3 + k * 0.1, 0.22)
        elif ty == 'chip':
            add('sfx', blip(1100 + 140 * (chip_n % 6), 0.05, 0.015), t, 0.12, pan=((chip_n % 3) - 1) * 0.3)
            chip_n += 1
        elif ty == 'send':
            add('sfx', whoosh(0.3, 700, 5000, q=1.1), t - 0.05, 0.14)
            add('sfx', chirp(500, 1200, 0.08, 0.04), t + 0.12, 0.12)
        elif ty == 'upload':
            d = cu['until'] - t
            n = int(d / 0.1)
            for k in range(n):
                add('sfx', tick(high=(k % 2 == 0)), t + k * 0.1, 0.07 + 0.05 * k / max(1, n - 1))
        elif ty == 'uploaded':
            add('sfx', bell(midi(91), 1.0, bright=0.7), t, 0.09)
            add('sfx', bell(midi(96), 1.0, bright=0.7), t + 0.06, 0.08)
            add('verb', bell(midi(96), 1.0, bright=0.7), t + 0.06, 0.05)
        elif ty == 'msg':
            add('sfx', chirp(900, 320, 0.09, 0.03), t, 0.16)
        elif ty == 'tap':
            add('sfx', tick(high=True), t, 0.2)
            add('sfx', blip(1600, 0.05, 0.012), t + 0.005, 0.1)
        elif ty == 'swap':
            add('sfx', whoosh(0.28, 1200, 4800, q=1.2), t - 0.04, 0.1)
        elif ty == 'brake':
            sq = bp(rng.standard_normal(int(0.35 * SR)), 2400, 5200) * np.exp(-tvec(0.35) / 0.12)
            add('sfx', fades(sq / np.max(np.abs(sq)), 0.01, 0.05), t - 0.2, 0.06)
            add('drums', thump(70, 0.3, 0.08), t + 0.02, 0.45)
        elif ty == 'draw':
            for k in range(3):
                add('sfx', chirp(600 + 200 * k, 1400 + 300 * k, 0.18, 0.1), t + k * 0.1, 0.06)
        elif ty in ('correct', 'answer'):
            ding(add, t)
        elif ty == 'whip':
            add('sfx', whoosh(0.46, 300, 7000, q=0.8), t - 0.05, 0.3)
        elif ty == 'focus':
            add('sfx', beep(2093 if cu.get('k', 0) else 1760, 0.07), t, 0.1)
        elif ty == 'shutter':
            add('sfx', shutter(), t, 0.5)
            add('drums', thump(80, 0.25, 0.06), t, 0.3)
        elif ty == 'scan':
            add('sfx', scanner(cu['until'] - t), t, 0.16)
        elif ty == 'detect':
            add('sfx', blip(1800 + 250 * cu.get('k', 0), 0.07, 0.02), t, 0.12)
        elif ty == 'step':
            add('sfx', pluck([76, 79, 84][cu.get('k', 0) % 3], 0.5, bright=1.0), t, 0.13)
        elif ty == 'rate':
            d = cu['until'] - t
            for k in range(int(d / 0.06)):
                p = k * 0.06 / d
                add('sfx', blip(900 + 900 * p, 0.03, 0.01), t + k * 0.06 * (1 + 0.6 * p), 0.06)
        elif ty == 'rateDone':
            ding(add, t, 1.1)
        elif ty == 'tip':
            add('sfx', chirp(700, 1300, 0.07, 0.03), t, 0.12)
        elif ty == 'morph':
            sparkle(add, t)
            add('sfx', whoosh(0.4, 1500, 9000, q=1.0), t - 0.05, 0.1)
        elif ty == 'pop':
            add('sfx', chirp(900, 320, 0.09, 0.03), t, 0.18)
            add('drums', kick(f0=140, f1=50, dur=0.4, knock=0.5), t, 0.3)
        elif ty == 'out':
            add('sfx', whoosh(0.45, 5000, 400, q=0.8), t, 0.16)
        elif ty == 'recap':
            add('sfx', pluck([72, 76, 79][cu.get('k', 0) % 3], 0.6, bright=1.0), t, 0.15, pan=[-0.3, 0.3, 0.0][cu.get('k', 0) % 3])
            add('sfx', whoosh(0.3, 600, 4000), t - 0.05, 0.08)
        elif ty == 'converge':
            add('sfx', riser(cu['until'] - t, 400, 8000), t, 0.22)
        elif ty == 'chime':
            for k, m in enumerate([84, 88, 91, 96]):
                add('sfx', bell(midi(m), 2.0, bright=0.6), t + k * 0.06, 0.08, pan=[-0.3, -0.1, 0.1, 0.3][k])
                add('verb', bell(midi(m), 2.0, bright=0.6), t + k * 0.06, 0.06)
        elif ty == 'cta':
            add('sfx', chirp(700, 1600, 0.12, 0.06), t, 0.14)
            fin = np.zeros((2, int(1.3 * SR)))
            for m in [48, 55, 60, 64, 67, 72, 76]:
                p = pluck(m, 1.3, bright=0.35, decay=4.0)
                fin[:, :len(p)] += p
            add('music', fin, t, 0.14)
            add('verb', fin, t, 0.08)

    duck = np.ones(mix.n)
    seg_t = tvec(0.45)
    seg = 1 - 0.6 * np.exp(-seg_t / 0.11) * np.minimum(1, seg_t / 0.004 + 0.3)
    for tk in kicks:
        i0 = int(round(tk * SR))
        m = min(len(seg), mix.n - i0)
        if m > 0:
            duck[i0:i0 + m] = np.minimum(duck[i0:i0 + m], seg[:m])
    mix.bus('verb')
    return mix, duck


def main():
    cues_path, out = sys.argv[1], sys.argv[2]
    meta = json.load(open(cues_path, encoding='utf-8'))
    mix, duck = build(meta['cues'], meta['T'], meta['duration'])
    x = master(mix, duck)
    wavfile.write(out, SR, (x.T * 32767).astype(np.int16))
    print(f'soundtrack → {out}  ({x.shape[1] / SR:.2f}s, peak {20 * np.log10(np.max(np.abs(x)) + 1e-9):.1f} dBFS)')


if __name__ == '__main__':
    main()
