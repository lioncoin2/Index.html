#!/usr/bin/env python3
"""
Soundtrack for ad v2 ("problem → solution"), built from the instruments in soundtrack.py.

    python3 render/soundtrack_v2.py out/cues-v2.json out/soundtrack-v2.wav

  hook       slam on "وقف!", hit on the big 4, riser into the first problem
  problem    no beat: dissonant drone, heartbeat, glitch bursts, error buzz
  solution   beat drops: kick/clap/hats, bass, pads (F–G, Am–C …) and arp
  outro      snare-roll build → impact on the logo → bright C groove → final button
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from soundtrack import (  # noqa: E402
    ARP, BEAT, BAR, CHORDS, SR, Mix, bass, bell, bp, chirp, clap, crash, fades, hat, kick,
    lp, master, midi, noise_sweep, pad, paper_slap, pluck, rng, snare, thump, tick, tvec,
)
import numpy as np  # noqa: E402
from scipy.io import wavfile  # noqa: E402

SOL_CHORDS = [('F', 'G'), ('Am', 'C'), ('F', 'G'), ('Am', 'G')]


def glitch_burst():
    x = np.zeros(int(0.32 * SR))
    for k in range(6):
        n = int(rng.uniform(0.018, 0.035) * SR)
        i0 = int(k * 0.045 * SR)
        hold = int(rng.uniform(6, 30))                      # sample-and-hold → crunchy
        nz = np.repeat(rng.standard_normal(n // hold + 1), hold)[:n]
        lo = rng.uniform(300, 1500)
        seg = bp(nz, lo, lo * rng.uniform(2.5, 5))
        x[i0:i0 + n] += seg / (np.max(np.abs(seg)) + 1e-9) * rng.uniform(0.5, 1)
    return fades(x, 0.001, 0.02)


def buzz(dur=0.34):
    t = tvec(dur)
    x = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (110, 116.5)) / 2
    x = lp(x, 1600) * np.minimum(1, t / 0.005) * np.exp(-t / 0.25)
    return fades(x, 0.002, 0.04)


def build(cues, T, dur):
    mix = Mix(dur)
    add = mix.add
    pairs, SOL, PD, O, L = T['pairs'], T['sol'], T['pd'], T['outro'], T['logo']
    kicks = []

    # ---------------- hook bed ----------------
    d = pad([45, 52, 57, 60], pairs[0] - 0.3, cutoff=900, cents=14, attack=0.4, release=0.2)
    add('music', d, 0.3, 0.7)

    # ---------------- problems: drone + heartbeat ----------------
    for S in pairs:
        dr = pad([45, 52, 57, 58], SOL, cutoff=1000, cents=18, attack=0.12, release=0.05)
        add('music', dr, S, 0.8)
        tt = tvec(SOL)
        add('music', np.sin(2 * np.pi * midi(33) * tt) * np.minimum(1, tt / 0.2) * np.exp(-np.maximum(tt - SOL + 0.3, 0) / 0.1), S, 0.06)
        for hb in (S + 0.3, S + 1.3):
            add('sfx', thump(72), hb, 0.45)
            add('sfx', thump(64), hb + 0.19, 0.3)

    # ---------------- solutions: the beat drops ----------------
    for i, S in enumerate(pairs):
        S2, end = S + SOL, S + PD - 0.25
        for tk in np.arange(S2, end - 1e-6, BEAT):
            kicks.append(tk)
            add('drums', kick(), tk, 0.72)
        for tc in np.arange(S2 + BEAT, end - 1e-6, 2 * BEAT):
            add('drums', clap(), tc, 0.48, pan=0.05)
            add('verb', clap(), tc, 0.1)
        for th in np.arange(S2 + BEAT / 2, end - 1e-6, BEAT):
            add('drums', hat(), th, 0.28, pan=0.25)
        half = (PD - SOL) / 2
        for k, name in enumerate(SOL_CHORDS[i]):
            c, t0 = CHORDS[name], S2 + k * half
            add('music_sc', pad(c['pad'], half, cutoff=2600, attack=0.05, release=0.3), t0, 1.2)
            for j in range(int(half / (BEAT / 2))):
                add('music_sc', bass(c['bass'] - 12, BEAT / 2 * 0.9), t0 + j * BEAT / 2, 0.26)
            for j in range(int(half / (BEAT / 4))):
                m = c['arp'][ARP[j % 16] % 4]
                add('music_sc', pluck(m, 0.5, bright=0.9), t0 + j * BEAT / 4, 0.14 * (1 if j % 4 == 0 else 0.7), pan=(-0.35 if j % 2 else 0.35))
                add('verb', pluck(m, 0.5, bright=0.9), t0 + j * BEAT / 4, 0.03)

    # ---------------- outro ----------------
    for tk in np.arange(O, O + 0.6, BEAT):
        kicks.append(tk)
        add('drums', kick(), tk, 0.7)
    gp = pad(CHORDS['G']['pad'] + [67], L - O, cutoff=3000, attack=0.4, release=0.05)
    add('music', gp, O, 0.8)
    tr, span = O + 0.35, L - (O + 0.35)
    while tr < L - 0.01:
        pr = (tr - O - 0.35) / span
        add('drums', snare(), tr, 0.12 + 0.35 * pr ** 1.5)
        tr += BEAT / 2 if pr < 0.35 else (BEAT / 4 if pr < 0.7 else BEAT / 8)
    add('sfx', noise_sweep(span, 500, 9000, q=0.9, shape='rise'), O + 0.35, 0.16)

    c = CHORDS['Cadd9']
    groove_end = L + 2.6
    add('music', pad(c['pad'], groove_end - L, cutoff=2600, attack=0.03, release=1.2), L, 0.9)
    add('verb', pad(c['pad'], groove_end - L, cutoff=2600, attack=0.03, release=1.2), L, 0.2)
    for tk in np.arange(L, groove_end - 0.01, BEAT):
        kicks.append(tk)
        add('drums', kick(), tk, 0.62)
    for th in np.arange(L + BEAT / 2, groove_end - 0.01, BEAT):
        add('drums', hat(), th, 0.14, pan=0.25)
    for j in range(int((groove_end - L - 0.5) / (BEAT / 4))):
        m = c['arp'][ARP[j % 16] % 4]
        add('music_sc', pluck(m, 0.55, bright=0.7), L + 0.5 + j * BEAT / 4, 0.075, pan=(-0.4 if j % 2 else 0.4))
    for j in range(int((groove_end - L) / (BEAT / 2))):
        add('music_sc', bass(36, BEAT / 2 * 0.9), L + j * BEAT / 2, 0.26)
    add('drums', kick(f0=190, atau=0.4, dur=0.9, knock=0.6), groove_end, 0.8)
    add('drums', crash(), groove_end, 0.16)
    fin = np.zeros((2, int(1.6 * SR)))
    for m in [48, 55, 60, 64, 67, 72, 76]:
        p = pluck(m, 1.6, bright=0.35, decay=4.0)
        fin[:, :len(p)] += p
    add('music', fin, groove_end, 0.2)
    add('verb', fin, groove_end, 0.12)

    # ---------------- sound design ----------------
    for cu in cues:
        t, ty = cu['t'], cu['type']
        if ty in ('slam', 'impact', 'drop'):
            big = ty != 'drop'
            boom = kick(f0=130, f1=44, ptau=0.08, atau=0.55 if big else 0.3, dur=1.4, click=0.9, drive=2.2, knock=0.7)
            add('drums', boom, t, 0.85 if big else 0.55)
            add('drums', crash(), t, 0.3 if big else 0.16)
            add('verb', boom, t, 0.2 if big else 0.1)
            if ty == 'slam':
                nb = lp(rng.standard_normal(int(0.8 * SR)), 900) * np.exp(-tvec(0.8) / 0.15)
                add('sfx', nb / np.max(np.abs(nb)), t, 0.3)
        elif ty == 'hit':
            add('drums', kick(knock=0.8), t, 0.85)
            add('drums', snare(), t, 0.5)
            add('drums', crash(), t, 0.14)
            add('verb', snare(), t, 0.2)
        elif ty == 'riser':
            add('sfx', noise_sweep(cu['until'] - t, 300, 7000, q=0.9, shape='rise'), t, 0.24)
        elif ty == 'glitch':
            add('sfx', glitch_burst(), t, 0.3, pan=rng.uniform(-0.3, 0.3))
        elif ty == 'buzz':
            add('sfx', buzz(), t, 0.22)
        elif ty == 'stamp':
            add('sfx', thump(70, dur=0.3, tau=0.08), t, 0.8)
            add('sfx', paper_slap(), t, 0.25)
        elif ty == 'blipBad':
            add('sfx', chirp(760, 300, 0.12, 0.05), t, 0.14)
        elif ty == 'count':
            n = 18
            for k in range(n):
                tk = t + (cu['until'] - t) * (k / n) ** 1.4
                add('sfx', tick(high=k % 2 == 0), tk, 0.13, pan=0.1)
        elif ty == 'seen':
            for k in range(2):
                add('sfx', chirp(1800, 1600, 0.04, 0.012), t + k * 0.07, 0.08)
        elif ty == 'thud':
            add('sfx', thump(70, dur=0.3, tau=0.07), t, 0.7)
            add('sfx', paper_slap(), t, 0.16)
        elif ty == 'swipe':
            add('sfx', noise_sweep(0.4, 600, 6000, q=0.9, shape='swell'), t - 0.05, 0.2)
            add('sfx', chirp(500, 1600, 0.2, 0.1), t, 0.08)
        elif ty in ('whoosh', 'build'):
            if ty == 'whoosh':
                add('sfx', noise_sweep(0.5, 350, 3800, q=1.1, shape='swell'), t - 0.08, 0.2)
        elif ty == 'bubble':
            add('sfx', chirp(420, 1500, 0.16, 0.08), t, 0.2)
            add('verb', chirp(420, 1500, 0.16, 0.08), t, 0.05)
        elif ty == 'reply':
            add('sfx', chirp(1320, 990, 0.12, 0.05), t, 0.13)
        elif ty == 'blip':
            add('sfx', chirp(1500, 1700, 0.07, 0.025), t, 0.09, pan=rng.uniform(-0.3, 0.3))
        elif ty == 'warn':
            for k in range(2):
                add('sfx', chirp(620, 600, 0.08, 0.04), t + k * 0.1, 0.1)
        elif ty == 'pop':
            add('sfx', chirp(900, 320, 0.09, 0.03), t, 0.22)
        elif ty == 'ding':
            add('sfx', bell(midi(88), 1.5), t, 0.10)
            add('verb', bell(midi(88), 1.5), t, 0.06)
        elif ty in ('success', 'chime'):
            notes = [83, 88, 95] if ty == 'success' else [84, 88, 91, 96]
            for k, m in enumerate(notes):
                add('sfx', bell(midi(m), 1.8, bright=0.7), t + k * 0.07, 0.08)
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
