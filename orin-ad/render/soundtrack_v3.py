#!/usr/bin/env python3
"""
Soundtrack for ad v3 ("الكتاب يقول… وOrin يقول"), built from the instruments in soundtrack.py.

    python3 render/soundtrack_v3.py out/cues-v3.json out/soundtrack-v3.wav

  textbook   quiz-show "thinking" pulse, highlighter squeaks, pen scribble,
             wrong-answer buzzer and a sad trombone when the student gives up
  flip       whoosh + snap, then the beat drops under Orin's explanation
  outro      warm pad → snare-roll build → impact on the logo → bright groove → button
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from soundtrack import (  # noqa: E402
    ARP, BEAT, CHORDS, SR, Mix, bass, bell, bp, chirp, clap, crash, fades, hat, kick,
    lp, master, midi, noise_sweep, osc, pad, paper_slap, pluck, rng, saw_weights, snare,
    svf, thump, tick, tvec,
)
import numpy as np  # noqa: E402
from scipy.io import wavfile  # noqa: E402

ROUND_CHORDS = [('F', 'G'), ('Am', 'C'), ('F', 'G')]


def squeak():
    """Highlighter on paper: a short squeaky swipe."""
    t = tvec(0.22)
    nz = bp(rng.standard_normal(len(t)), 2200, 6500) * np.exp(-((t - 0.09) / 0.06) ** 2)
    tone = np.sin(2 * np.pi * np.cumsum(2300 + 900 * t / 0.22) / SR) * np.exp(-((t - 0.1) / 0.05) ** 2)
    x = 0.8 * nz / (np.max(np.abs(nz)) + 1e-9) + 0.25 * tone
    return fades(x, 0.004, 0.03)


def scribble(dur=0.5):
    x = np.zeros(int(dur * SR))
    k = 0.0
    while k < dur - 0.05:
        n = int(rng.uniform(0.03, 0.07) * SR)
        i0 = int(k * SR)
        seg = bp(rng.standard_normal(n), 1500, 5000) * np.hanning(n)
        x[i0:i0 + n] += seg / (np.max(np.abs(seg)) + 1e-9) * rng.uniform(0.5, 1)
        k += rng.uniform(0.045, 0.08)
    return fades(x, 0.002, 0.02)


def buzzer(dur=0.55):
    """Game-show wrong answer."""
    t = tvec(dur)
    x = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (146, 154.5)) / 2
    x = lp(x, 2200) * np.minimum(1, t / 0.006) * np.where(t < dur - 0.08, 1, np.exp(-(t - dur + 0.08) / 0.03))
    return fades(x, 0.002, 0.03)


def trombone(notes, durs, vib_last=True):
    """Sad trombone: saw voice with a 'wah' filter per note and vibrato on the last one."""
    total = sum(durs)
    n = int((total + 0.15) * SR)
    t = np.arange(n) / SR
    f = np.zeros(n)
    cut = np.full(n, 350.0)
    amp = np.zeros(n)
    t0 = 0.0
    for k, (m, d) in enumerate(zip(notes, durs)):
        i0, i1 = int(t0 * SR), int((t0 + d) * SR)
        tt = t[i0:i1] - t0
        base = midi(m)
        if k == len(notes) - 1 and vib_last:
            depth = 0.035 * np.minimum(1, tt / 0.3)
            f[i0:i1] = base * (1 + depth * np.sin(2 * np.pi * 5.5 * tt)) * (1 - 0.03 * (tt / d) ** 2)
        else:
            f[i0:i1] = base
        cut[i0:i1] = 380 + 1500 * np.minimum(1, tt / 0.09) * np.exp(-tt / (0.5 if k == len(notes) - 1 else 0.2))
        a = np.minimum(1, tt / 0.03) * np.where(tt < d - 0.05, 1, np.maximum(0, (d - tt) / 0.05))
        if k == len(notes) - 1:
            a *= np.exp(-np.maximum(tt - d * 0.6, 0) / 0.25)
        amp[i0:i1] = a
        t0 += d
    f[f == 0] = midi(notes[-1])
    raw = osc(f, n, saw_weights(midi(notes[0]), 2600))
    x = svf(raw, cut, q=1.6, mode='lp') * amp
    x += 0.04 * bp(rng.standard_normal(n), 800, 3000) * amp      # a little breath
    return fades(x / (np.max(np.abs(x)) + 1e-9), 0.003, 0.05)


def build(cues, T, dur):
    mix = Mix(dur)
    add = mix.add
    R, O, L = T['rounds'], T['outro'], T['logo']
    kicks = []

    # ---------------- textbook phases: quiz-show thinking pulse ----------------
    for i, r in enumerate(R):
        start = 0.3 if i == 0 else r['s'] + 0.15
        stop = 3.42 if i == 0 else r['flip'] - 0.65
        k = 0
        for t8 in np.arange(start, stop, BEAT / 2):
            m = [45, 45, 52, 45, 48, 45, 52, 47][k % 8]
            add('music', pluck(m, 0.3, bright=0.35, decay=0.5), t8, 0.3)
            add('music', pluck(m + 12, 0.2, bright=0.25, decay=0.4), t8, 0.07)
            add('drums', hat(), t8 + BEAT / 4, 0.07, pan=0.3)
            k += 1
        dr = pad([45, 52, 57], stop - start, cutoff=700, cents=10, attack=0.3, release=0.15)
        add('music', dr, start, 0.35)

    # ---------------- Orin phases: the beat drops ----------------
    for i, r in enumerate(R):
        land, end = r['land'], r['end'] - 0.15
        for tk in np.arange(land, end, BEAT):
            kicks.append(tk)
            add('drums', kick(), tk, 0.7)
        for tc in np.arange(land + BEAT, end, 2 * BEAT):
            add('drums', clap(), tc, 0.46, pan=0.05)
            add('verb', clap(), tc, 0.1)
        for th in np.arange(land + BEAT / 2, end, BEAT):
            add('drums', hat(), th, 0.26, pan=0.25)
        half = (end - land) / 2
        for k, name in enumerate(ROUND_CHORDS[i]):
            c, t0 = CHORDS[name], land + k * half
            add('music_sc', pad(c['pad'], half, cutoff=2600, attack=0.04, release=0.35), t0, 1.2)
            for j in range(int(half / (BEAT / 2))):
                add('music_sc', bass(c['bass'] - 12, BEAT / 2 * 0.9), t0 + j * BEAT / 2, 0.26)
            for j in range(int(half / (BEAT / 4))):
                m = c['arp'][ARP[j % 16] % 4]
                add('music_sc', pluck(m, 0.5, bright=0.9), t0 + j * BEAT / 4, 0.13 * (1 if j % 4 == 0 else 0.7), pan=(-0.35 if j % 2 else 0.35))
                add('verb', pluck(m, 0.5, bright=0.9), t0 + j * BEAT / 4, 0.03)

    # ---------------- outro ----------------
    fp = pad(CHORDS['F']['pad'] + [72], L - O, cutoff=2400, attack=0.25, release=0.05)
    add('music', fp, O, 0.75)
    add('verb', fp, O, 0.15)
    tr, span = O + 0.8, L - (O + 0.8)
    while tr < L - 0.01:
        pr = (tr - O - 0.8) / span
        add('drums', snare(), tr, 0.12 + 0.35 * pr ** 1.5)
        tr += BEAT / 2 if pr < 0.35 else (BEAT / 4 if pr < 0.7 else BEAT / 8)
    add('sfx', noise_sweep(span, 500, 9000, q=0.9, shape='rise'), O + 0.8, 0.16)

    c = CHORDS['Cadd9']
    gend = L + 3.9
    add('music', pad(c['pad'], gend - L, cutoff=2600, attack=0.03, release=1.2), L, 0.9)
    add('verb', pad(c['pad'], gend - L, cutoff=2600, attack=0.03, release=1.2), L, 0.2)
    for tk in np.arange(L, gend - 0.01, BEAT):
        kicks.append(tk)
        add('drums', kick(), tk, 0.62)
    for tc in np.arange(L + BEAT, gend - 0.01, 2 * BEAT):
        add('drums', clap(), tc, 0.34)
    for th in np.arange(L + BEAT / 2, gend - 0.01, BEAT):
        add('drums', hat(), th, 0.14, pan=0.25)
    for j in range(int((gend - L - 0.5) / (BEAT / 4))):
        m = c['arp'][ARP[j % 16] % 4]
        add('music_sc', pluck(m, 0.55, bright=0.7), L + 0.5 + j * BEAT / 4, 0.075, pan=(-0.4 if j % 2 else 0.4))
    for j in range(int((gend - L) / (BEAT / 2))):
        add('music_sc', bass(36, BEAT / 2 * 0.9), L + j * BEAT / 2, 0.26)
    add('drums', kick(f0=190, atau=0.4, dur=0.9, knock=0.6), gend, 0.8)
    add('drums', crash(), gend, 0.16)
    fin = np.zeros((2, int(1.4 * SR)))
    for m in [48, 55, 60, 64, 67, 72, 76]:
        p = pluck(m, 1.4, bright=0.35, decay=4.0)
        fin[:, :len(p)] += p
    add('music', fin, gend, 0.2)
    add('verb', fin, gend, 0.12)

    # ---------------- sound design ----------------
    for cu in cues:
        t, ty = cu['t'], cu['type']
        if ty in ('slam', 'impact'):
            boom = kick(f0=130, f1=44, ptau=0.08, atau=0.5, dur=1.4, click=0.9, drive=2.2, knock=0.7)
            add('drums', boom, t, 0.8)
            add('drums', crash(), t, 0.26)
            add('verb', boom, t, 0.18)
            if ty == 'slam':
                add('sfx', paper_slap(), t, 0.45)
        elif ty == 'drop':
            add('drums', kick(knock=0.7), t, 0.5)
            add('drums', crash(), t, 0.14)
            add('verb', crash(), t, 0.04)
        elif ty == 'tickBig':
            add('sfx', tick(high=True), t, 0.45)
            add('sfx', thump(90, dur=0.2, tau=0.05), t, 0.35)
        elif ty == 'tick':
            add('sfx', tick(high=False), t, 0.22)
        elif ty == 'marker':
            add('sfx', squeak(), t, 0.16, pan=rng.uniform(-0.25, 0.25))
        elif ty == 'scribble':
            add('sfx', scribble(), t, 0.18, pan=-0.2)
        elif ty == 'buzzer':
            add('sfx', buzzer(), t, 0.2)
        elif ty == 'wahwah':
            if cu.get('short'):
                add('music', trombone([58, 55], [0.26, 0.55], vib_last=True), t, 0.26)
            else:
                add('music', trombone([58, 57, 56, 55], [0.28, 0.28, 0.28, 0.95]), t, 0.28)
        elif ty == 'flip':
            add('sfx', noise_sweep(0.5, 400, 5000, q=0.9, shape='swell'), t - 0.05, 0.24)
            add('sfx', paper_slap(), t + 0.62, 0.18)
        elif ty == 'swish':
            add('sfx', noise_sweep(0.4, 600, 4500, q=1.0, shape='swell'), t, 0.18)
        elif ty == 'whoosh':
            add('sfx', noise_sweep(0.5, 350, 3800, q=1.1, shape='swell'), t - 0.08, 0.2)
        elif ty == 'pop':
            add('sfx', chirp(900, 320, 0.09, 0.03), t, 0.22)
        elif ty == 'meterUp':
            n = 8
            for k in range(n):
                m = [72, 74, 76, 79, 81, 84, 86, 88][k]
                add('sfx', chirp(midi(m), midi(m) * 1.02, 0.08, 0.03), t + (cu['until'] - t) * k / n * 0.8, 0.07)
        elif ty in ('success', 'chime'):
            notes = [83, 88, 95] if ty == 'success' else [84, 88, 91, 96]
            for k, m in enumerate(notes):
                add('sfx', bell(midi(m), 1.8, bright=0.7), t + k * 0.07, 0.075)
                add('verb', bell(midi(m), 1.8, bright=0.7), t + k * 0.07, 0.06)

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
