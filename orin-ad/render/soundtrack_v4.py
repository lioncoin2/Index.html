#!/usr/bin/env python3
"""
Soundtrack for ad v4 ("نفس الطالب، فرق واحد" — split screen), built from the
instruments in soundtrack.py / soundtrack_v3.py.

    python3 render/soundtrack_v4.py out/cues-v4.json out/soundtrack-v4.wav

The mix is literally split like the picture: every "chaos" cue (right side,
بدون Orin) is panned hard right, every "calm" cue (left side, مع Orin) hard
left — using the exact `pan` value each cue carries — so even with the sound
alone, muted-except-one-earbud, you can tell which side is playing. No
rhythm section during the split (arrhythmic dissonant bed + panned accents
only); the wipe collapses the stereo image to centre, then a bright, fully
rhythmic "victory" groove (the same Cadd9/F/G brand chords as the other
three ads) carries the logo reveal and end card.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from soundtrack import (  # noqa: E402
    ARP, BEAT, BAR, CHORDS, SR, Mix, bass, bell, bp, chirp, clap, crash, fades, hat, kick,
    lp, master, midi, noise_sweep, pad, paper_slap, pluck, rng, snare, thump, tick, tvec,
)
from soundtrack_v3 import buzzer  # noqa: E402  (harsh game-show wrong-answer tone)
import numpy as np  # noqa: E402
from scipy.io import wavfile  # noqa: E402


def crunch(dur=0.05, lo=900, hi=4200):
    """A single harsh, slightly-detuned tick — the chaos side's accent."""
    t = tvec(dur)
    x = bp(rng.standard_normal(len(t)), lo, hi) * np.exp(-t / (dur * 0.4))
    return fades(x / (np.max(np.abs(x)) + 1e-9), 0.001, 0.01)


def build(cues, T, dur):
    mix = Mix(dur)
    add = mix.add
    wipe, unified, logo = T['wipe'], T['unified'], T['logo']
    kicks = []

    # ---------------- tension bed, split-screen section (0 → wipe) ----------------
    # a minor-2nd clash (45 vs 46) keeps it subtly "wrong" without reading as a chord
    drone_d = wipe - 0.25
    dr = pad([45, 46, 52, 58], drone_d, cutoff=950, cents=14, attack=1.1, release=0.15, level=1.0)
    n = dr.shape[1]
    tt = np.arange(n) / SR
    dr *= 0.4 + 0.6 * np.clip(tt / 3.0, 0, 1)
    add('music', dr, 0.25, 0.34)
    add('music', np.sin(2 * np.pi * midi(33) * tt) * np.minimum(1, tt / 2), 0.25, 0.05)
    for hb in np.arange(1.0, drone_d - 0.2, 1.0):
        add('sfx', thump(58), hb, 0.28)

    # ---------------- victory groove, unified → end (rhythmic, centred/bright) ----------------
    build_start = unified + 0.15
    add('music_sc', pad(CHORDS['G']['pad'], logo - build_start, cutoff=1600, attack=0.3, release=0.1), build_start, 0.55)
    for j in range(int((logo - build_start) / (BEAT / 2))):
        add('music_sc', bass(CHORDS['G']['bass'] - 12, BEAT / 2 * 0.9), build_start + j * BEAT / 2, 0.2)
    for th in np.arange(build_start + BEAT / 4, logo - 0.05, BEAT / 4):
        pr = (th - build_start) / (logo - build_start)
        add('drums', hat(), th, 0.08 + 0.14 * pr, pan=0.2)

    groove_chords = [('Cadd9', logo, 2 * BAR), ('F', logo + 2 * BAR, BAR), ('G', logo + 3 * BAR, BAR)]
    for name, t0, span in groove_chords:
        t0e = min(t0, dur - 0.05)
        c = CHORDS[name]
        d = min(span, dur - t0e)
        if d <= 0:
            continue
        add('music', pad(c['pad'], d, cutoff=2600, attack=0.05 if t0 > logo else 0.02, release=1.0), t0e, 0.85)
        add('verb', pad(c['pad'], d, cutoff=2600, attack=0.05, release=1.0), t0e, 0.15)
        for j in range(int(d / (BEAT / 2))):
            tk = t0e + j * BEAT / 2
            if tk >= dur - 0.02:
                break
            add('music_sc', bass(c['bass'] - 12, BEAT / 2 * 0.9), tk, 0.28)
        for j in range(int(d / (BEAT / 4))):
            tk = t0e + j * BEAT / 4
            if tk >= dur - 0.02:
                break
            m = c['arp'][ARP[j % 16] % 4]
            add('music_sc', pluck(m, 0.5, bright=0.85), tk, 0.13 * (1 if j % 4 == 0 else 0.7), pan=(-0.35 if j % 2 else 0.35))
            add('verb', pluck(m, 0.5, bright=0.85), tk, 0.03)
    for tk in np.arange(logo, dur - 0.02, BEAT):
        kicks.append(tk)
        add('drums', kick(), tk, 0.68)
    for tc in np.arange(logo + BEAT, dur - 0.02, 2 * BEAT):
        add('drums', clap(), tc, 0.44, pan=0.05)
        add('verb', clap(), tc, 0.1)
    for th in np.arange(logo + BEAT / 2, dur - 0.02, BEAT):
        add('drums', hat(), th, 0.22, pan=0.25)
    # final button flourish
    t_btn = min(logo + 3.6, dur - 1.6)
    add('drums', kick(f0=190, atau=0.4, dur=0.9, knock=0.6), t_btn, 0.75)
    add('drums', crash(), t_btn, 0.15)
    fin = np.zeros((2, int(1.4 * SR)))
    for m in [48, 55, 60, 64, 67, 72, 76]:
        p = pluck(m, 1.4, bright=0.35, decay=4.0)
        fin[:, :len(p)] += p
    add('music', fin, t_btn, 0.18)
    add('verb', fin, t_btn, 0.1)

    # ---------------- sound design from cues (the split-screen half) ----------------
    for cu in cues:
        t, ty = cu['t'], cu['type']
        pan = cu.get('pan', 0.0) or 0.0
        if ty == 'slam':
            boom = kick(f0=130, f1=44, ptau=0.08, atau=0.5, dur=1.3, click=0.9, drive=2.2, knock=0.7)
            add('drums', boom, t, 0.8)
            add('drums', crash(), t, 0.26)
            add('verb', boom, t, 0.16)
            nb = lp(rng.standard_normal(int(0.8 * SR)), 900) * np.exp(-tvec(0.8) / 0.15)
            add('sfx', nb / np.max(np.abs(nb)), t, 0.28)
        elif ty == 'splitOpen':
            add('sfx', noise_sweep(0.4, 1400, 8000, q=1.0, shape='rise'), t, 0.22)
            add('sfx', bell(midi(96), 1.0, bright=0.4), t + 0.05, 0.09)
            add('verb', bell(midi(96), 1.0, bright=0.4), t + 0.05, 0.05)
        elif ty in ('chaosWhoosh', 'calmWhoosh'):
            f0, f1 = (550, 4400) if ty == 'chaosWhoosh' else (350, 2400)
            q = 1.15 if ty == 'chaosWhoosh' else 0.85
            add('sfx', noise_sweep(0.42, f0, f1, q=q, shape='swell', stereo=False), t - 0.04, 0.30, pan=pan)
        elif ty == 'chaosPulse':
            add('sfx', crunch(), t, 0.24, pan=pan)
        elif ty == 'calmPulse':
            add('sfx', chirp(1500, 1700, 0.07, 0.028), t, 0.20, pan=pan)
        elif ty == 'chaosHit':
            add('drums', kick(f0=150, f1=50, dur=0.6, knock=0.8), t, 0.75, pan=pan * 0.5)
            add('sfx', buzzer(0.5), t, 0.22, pan=pan)
            add('sfx', paper_slap(), t, 0.16, pan=pan)
        elif ty == 'calmHit':
            for k, m in enumerate([79, 84, 88, 95]):
                add('sfx', bell(midi(m), 1.7, bright=0.7), t + k * 0.07, 0.09, pan=pan)
                add('verb', bell(midi(m), 1.7, bright=0.7), t + k * 0.07, 0.06)
        elif ty == 'riser':
            add('sfx', noise_sweep(max(0.2, wipe - t), 300, 8000, q=0.9, shape='rise'), t, 0.24)
        elif ty == 'collapse':
            boom = kick(f0=128, f1=40, ptau=0.09, atau=0.6, dur=1.6, click=0.9, drive=2.3, knock=0.75)
            add('drums', boom, t, 0.9)
            add('drums', crash(), t, 0.3)
            add('verb', boom, t, 0.2)
        elif ty == 'pop':
            add('sfx', chirp(900, 320, 0.09, 0.03), t, 0.2)
        elif ty == 'impact':
            boom = kick(f0=130, f1=44, ptau=0.08, atau=0.55, dur=1.5, click=0.9, drive=2.2, knock=0.7)
            add('drums', boom, t, 0.8)
            add('drums', crash(), t, 0.28)
            add('verb', boom, t, 0.22)
        elif ty == 'chime':
            for k, m in enumerate([84, 88, 91, 96]):
                add('sfx', bell(midi(m), 2.0, bright=0.6), t + k * 0.06, 0.08, pan=[-0.3, -0.1, 0.1, 0.3][k])
                add('verb', bell(midi(m), 2.0, bright=0.6), t + k * 0.06, 0.06)

    duck = np.ones(mix.n)
    seg_t = tvec(0.45)
    seg = 1 - 0.62 * np.exp(-seg_t / 0.11) * np.minimum(1, seg_t / 0.004 + 0.3)
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
