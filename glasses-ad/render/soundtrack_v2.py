#!/usr/bin/env python3
"""
Soundtrack for glasses ad v2 (problem → solution, pop-cartoon), built from the synth library in
../orin-ad/render and the effects in soundtrack_glasses.py.

    python3 render/soundtrack_v2.py out/cues-v2.json out/soundtrack-v2.wav [--vo PATH]

Music: an eerie bed with a heartbeat under the burning-eye close-up; a sleepy 3 AM lo-fi loop
with a ticking clock for the problem (boing on the twitch, a drip for the tears, swishes for the
rubbing, a racing clock and a sad trombone for the cause); a ding for the idea, then a bright
bouncy groove for the fix (slide-whistle drop, boing landing, a soft harp when the eyes relax),
a cash register for the price, a van and its horn, and a riser into the end card.

Voice-over (optional), as in the first glasses ad: one continuous take at out/vo-v2.wav, or one
file per line at vo/parts-v2/01.wav …, or any file passed with --vo.
"""
import glob
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..'))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.abspath(os.path.join(ROOT, '..', 'orin-ad', 'render')))
from soundtrack import (  # noqa: E402
    ARP, BEAT, CHORDS, SR, Mix, bass, bell, bp, chirp, clap, crash, fades, hat, kick,
    lp, master, midi, noise_sweep, pad, pluck, rng, snare, thump, tick, tvec,
)
from soundtrack_v5 import ding, riser, sub_drop, tension_bed, whoosh  # noqa: E402
from soundtrack_v6 import blip, sparkle  # noqa: E402
from soundtrack_v7 import groove, load_wav, voice_chain  # noqa: E402
from soundtrack_glasses import brake, engine, horn, ka_ching  # noqa: E402
import numpy as np  # noqa: E402
from scipy.io import wavfile  # noqa: E402


# ───────────────────────────── cartoon instruments ─────────────────────────────

def boing(f0=330, dur=0.5, depth=0.35):
    """Spring: a sine whose pitch wobbles fast and settles."""
    t = tvec(dur)
    f = f0 * (1 + depth * np.exp(-t / 0.13) * np.sin(2 * np.pi * 15 * t)) * (1 + 0.25 * t / dur)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (dur * 0.45))
    return fades(x, 0.002, 0.03)


def plip():
    """A water drop."""
    t = tvec(0.14)
    f = 700 * (2400 / 700) ** np.minimum(1, t / 0.05)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.035)
    return fades(x, 0.001, 0.02)


def slide_whistle(f0, f1, dur):
    t = tvec(dur)
    f = f0 * (f1 / f0) ** (t / dur) * (1 + 0.012 * np.sin(2 * np.pi * 6 * t))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.12 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    x += 0.04 * bp(rng.standard_normal(len(t)), 1000, 5000)
    return fades(x * np.minimum(1, t / 0.03), 0.01, 0.05)


def swish():
    t = tvec(0.12)
    x = bp(rng.standard_normal(len(t)), 1800, 7000) * np.sin(np.pi * t / 0.12) ** 2
    return fades(x / (np.max(np.abs(x)) + 1e-9), 0.002, 0.01)


def womp():
    """Sad trombone: two drooping notes with a wah."""
    out = np.zeros(int(1.0 * SR))
    for d, m, dur in ((0.0, 58, 0.32), (0.36, 57, 0.6)):
        t = tvec(dur)
        f = midi(m) * (1 - 0.03 * t / dur) * (1 + 0.01 * np.sin(2 * np.pi * 5 * t))
        ph = np.cumsum(f) / SR
        x = 2 * (ph % 1.0) - 1
        x = lp(x, 900) * np.minimum(1, t / 0.04) * np.minimum(1, (dur - t) / 0.06)
        i0 = int(d * SR)
        out[i0:i0 + len(x)] += x
    return out / (np.max(np.abs(out)) + 1e-9)


def heartbeat():
    out = np.zeros(int(0.5 * SR))
    for d, g in ((0.0, 1.0), (0.17, 0.7)):
        k = thump(52, 0.22, 0.06) * g
        i0 = int(d * SR)
        out[i0:i0 + len(k)] += k[:len(out) - i0]
    return out


def lofi(add, kicks, t0, t1):
    """A sleepy 3 AM loop: lowpassed minor 7ths, lazy kick/snare, soft hats, a ticking clock."""
    t, ci = t0, 0
    for name in ['Am', 'F', 'Am', 'F', 'Am', 'F']:
        if t >= t1 - 0.05:
            break
        c = CHORDS[name]
        d = min(2.0, t1 - t)
        add('music', pad(c['pad'] + [c['pad'][0] + 10], d, cutoff=700, cents=14, attack=0.2, release=0.3), t, 0.44)
        for j in range(int(round(d / BEAT))):
            tb = t + j * BEAT
            if j % 2 == 0 and tb < t1 - 0.02:
                add('music_sc', bass(c['bass'] - 12, BEAT * 0.9), tb, 0.2)
        t += d
        ci += 1
    for tb in np.arange(t0, t1 - 0.02, BEAT):
        k = round((tb - t0) / BEAT)
        if k % 4 == 0:
            kicks.append(tb)
            add('drums', kick(f0=120, f1=48, dur=0.4, click=0.2), tb, 0.45)
        if k % 4 == 2:
            add('drums', snare(0.25, 170), tb, 0.16)
            add('verb', snare(0.25, 170), tb, 0.05)
        add('drums', hat(), tb + BEAT / 2, 0.06, pan=0.3)
        add('sfx', tick(high=k % 2 == 0), tb, 0.06, pan=0.45)
    n = int((t1 - t0) * SR)
    crackle = (rng.random(n) < 0.0009) * rng.standard_normal(n)
    add('music', lp(crackle, 5000) * 0.6, t0, 0.5)


# ───────────────────────────── voice-over ─────────────────────────────

def find_vo(vo_lines, cli_path=None):
    if cli_path:
        return [(0.0, load_wav(cli_path))]
    single = os.path.join(ROOT, 'out', 'vo-v2.wav')
    if os.path.exists(single):
        return [(0.0, load_wav(single))]
    clips = []
    for p in sorted(glob.glob(os.path.join(ROOT, 'vo', 'parts-v2', '*.wav'))):
        try:
            i = int(os.path.splitext(os.path.basename(p))[0]) - 1
        except ValueError:
            continue
        if 0 <= i < len(vo_lines):
            clips.append((vo_lines[i]['t0'], load_wav(p)))
    return clips


# ───────────────────────────── score ─────────────────────────────

def build(cues, T, dur, vo_path=None):
    mix = Mix(dur)
    add = mix.add
    kicks = []

    # hook: eerie bed under the burning eye
    add('music', tension_bed(T['pull'] + 0.4), 0.0, 0.3)
    # the problem: 3 AM lo-fi
    lofi(add, kicks, T['night'] - 0.2, T['wipe'] + 0.1)
    # the fix: bright and bouncy
    groove(add, kicks, T['wipe'] + 0.35, T['price'] - 0.05, ['C', 'G', 'Am', 'F'], level=0.85, step=2.0)
    # offer
    groove(add, kicks, T['price'] + 0.52, T['end'] - 0.1, ['F', 'G', 'C', 'G'], level=0.95, step=1.0)
    # end card
    I = T['end'] + 0.25
    for name, t0, span in (('Cadd9', I, 4 * BEAT), ('F', I + 4 * BEAT, 2 * BEAT), ('G', I + 6 * BEAT, 2 * BEAT)):
        c = CHORDS[name]
        d = min(span, dur - t0)
        if d <= 0.05:
            continue
        add('music', pad(c['pad'], d, cutoff=2600, attack=0.03, release=1.0), t0, 0.7)
        add('verb', pad(c['pad'], d, cutoff=2600, attack=0.05, release=1.0), t0, 0.15)
        for j in range(int(d / (BEAT / 2))):
            tk = t0 + j * BEAT / 2
            if tk < dur - 0.02:
                add('music_sc', bass(c['bass'] - 12, BEAT / 2 * 0.9), tk, 0.26)
        for j in range(int(d / (BEAT / 4))):
            tk = t0 + j * BEAT / 4
            if tk >= dur - 0.02:
                break
            m = c['arp'][ARP[j % 16] % 4]
            add('music_sc', pluck(m, 0.5, bright=0.85), tk, 0.12 * (1 if j % 4 == 0 else 0.7), pan=(-0.35 if j % 2 else 0.35))
            add('verb', pluck(m, 0.5, bright=0.85), tk, 0.03)
    for tk in np.arange(I, dur - 0.02, BEAT):
        kicks.append(tk)
        add('drums', kick(), tk, 0.6)
    for tc in np.arange(I + BEAT, dur - 0.02, 2 * BEAT):
        add('drums', clap(), tc, 0.42, pan=0.05)
        add('verb', clap(), tc, 0.1)
    for th in np.arange(I + BEAT / 2, dur - 0.02, BEAT):
        add('drums', hat(), th, 0.22, pan=0.25)

    # ---------------- sound design from cues ----------------
    for cu in cues:
        t, ty = cu['t'], cu['type']
        k = cu.get('k', 0)
        if ty == 'cap':
            add('sfx', chirp(1100, 500, 0.07, 0.025), t, 0.08)
        elif ty == 'veins':
            add('sfx', slide_whistle(260, 760, cu['until'] - t), t, 0.05)
            add('sfx', noise_sweep(cu['until'] - t, 2500, 9000, q=1.4, shape='rise'), t, 0.04)
        elif ty == 'burn':
            add('drums', heartbeat(), t, 0.85)
        elif ty == 'tear':
            add('sfx', plip(), t, 0.3)
            add('verb', plip(), t, 0.1)
        elif ty == 'twitch':
            add('sfx', boing(520 + 60 * k, 0.28, 0.5), t, 0.16, pan=-0.2)
        elif ty == 'pull':
            add('sfx', whoosh(0.7, 5000, 300, q=0.8), t, 0.22)
        elif ty == 'yawn':
            add('sfx', slide_whistle(620, 260, 0.7), t, 0.07)
        elif ty == 'chip':
            add('sfx', boing([300, 360, 420, 480, 520, 600][k % 6], 0.42, 0.3), t, 0.16, pan=(-0.3 if k % 2 == 0 else 0.3))
            add('sfx', chirp(900, 320, 0.09, 0.03), t, 0.1)
        elif ty == 'rub':
            for tb in np.arange(t, cu['until'], 1 / 5.5):
                add('sfx', swish(), tb, 0.12, pan=-0.25)
        elif ty == 'clock':
            tb, gap = t, 0.16
            while tb < cu['until']:
                add('sfx', tick(high=True), tb, 0.18, pan=0.4)
                tb += gap
                gap = max(0.045, gap * 0.9)
        elif ty == 'womp':
            add('sfx', womp(), t, 0.16)
        elif ty == 'idea':
            ding(add, t, 1.0, big=True)
            sparkle(add, t + 0.08, 0.8)
        elif ty == 'wipe':
            add('sfx', whoosh(0.55, 300, 7000, q=0.8), t - 0.05, 0.22)
            add('sfx', noise_sweep(0.5, 800, 9000, q=1.0, shape='swell'), t, 0.06)
        elif ty == 'drop':
            add('sfx', slide_whistle(1400, 420, 0.42), t, 0.12)
        elif ty == 'land':
            add('sfx', boing(240, 0.55, 0.4), t, 0.24)
            add('drums', thump(70, 0.25, 0.06), t, 0.45)
            ding(add, t + 0.06, 0.7)
        elif ty == 'filter':
            add('sfx', noise_sweep(0.9, 1500, 9000, q=1.3, shape='swell'), t, 0.05)
            add('music', pad([60, 64, 67, 71], 1.4, cutoff=1800, attack=0.2, release=0.6), t + 0.2, 0.2)
            for j, m in enumerate([72, 76, 79]):
                add('sfx', bell(midi(m), 0.9, bright=0.6), t + 0.25 + j * 0.08, 0.05)
        elif ty == 'sparkle':
            sparkle(add, t, 1.0)
        elif ty == 'brow':
            for j in range(2):
                add('sfx', boing(700, 0.18, 0.2), t + j * 0.35, 0.08)
        elif ty == 'window':
            add('sfx', chirp(600, 1500, 0.1, 0.05), t, 0.14)
            add('sfx', boing(380, 0.35, 0.25), t, 0.1)
        elif ty == 'timer':
            n = int((cu['until'] - t) / 0.25)
            for j in range(n):
                add('sfx', blip(1400 + 40 * j, 0.04, 0.012), t + j * 0.25, 0.05, pan=-0.35)
            ding(add, cu['until'], 0.6)
        elif ty == 'relax':
            for j, m in enumerate([60, 64, 67, 72, 76, 79, 84]):
                add('sfx', pluck(m, 1.2, bright=0.7, decay=1.6), t + j * 0.09, 0.09, pan=-0.4 + j * 0.13)
                add('verb', pluck(m, 1.2, bright=0.7, decay=1.6), t + j * 0.09, 0.05)
            add('sfx', noise_sweep(0.9, 400, 2500, q=0.7, shape='swell'), t, 0.05)
        elif ty == 'price':
            add('sfx', ka_ching(), t, 0.3)
            add('drums', kick(f0=140, f1=46, dur=0.9, knock=0.7), t, 0.6)
            add('drums', crash(), t, 0.22)
        elif ty == 'bas':
            add('sfx', boing(450, 0.3, 0.3), t, 0.14)
        elif ty == 'van':
            add('sfx', engine(cu['until'] - t + 0.25), t, 0.22)
            add('sfx', brake(), cu['until'] - 0.12, 0.05)
        elif ty == 'horn':
            add('sfx', horn(), t, 0.12, pan=0.1)
        elif ty == 'vanout':
            add('sfx', whoosh(0.45, 200, 3000, q=0.8), t, 0.18)
        elif ty == 'impact':
            boom = kick(f0=130, f1=44, ptau=0.08, atau=0.55, dur=1.5, click=0.9, drive=2.2, knock=0.7)
            add('drums', boom, t, 0.8)
            add('drums', crash(), t, 0.28)
            add('verb', boom, t, 0.2)
            add('sfx', sub_drop(1.2), t, 0.25)
            add('sfx', riser(0.5, 500, 7000), t - 0.5, 0.18)
        elif ty == 'cta':
            add('sfx', chirp(700, 1600, 0.12, 0.06), t, 0.14)
            sparkle(add, t + 0.1, 0.8)
        elif ty == 'pulse':
            add('sfx', boing(600, 0.2, 0.2), t, 0.06)

    duck = np.ones(mix.n)
    seg_t = tvec(0.45)
    seg = 1 - 0.6 * np.exp(-seg_t / 0.11) * np.minimum(1, seg_t / 0.004 + 0.3)
    for tk in kicks:
        i0 = int(round(tk * SR))
        m = min(len(seg), mix.n - i0)
        if m > 0:
            duck[i0:i0 + m] = np.minimum(duck[i0:i0 + m], seg[:m])
    mix.bus('verb')

    clips = find_vo(T.get('vo', []), vo_path)
    if clips:
        vo = np.zeros((2, mix.n))
        for t0, x in clips:
            i0 = int(round(t0 * SR))
            m = min(x.shape[1], mix.n - i0)
            if m > 0:
                vo[:, i0:i0 + m] += x[:, :m]
        vo = voice_chain(vo)
        lvl = np.abs(vo).max(axis=0)
        win = int(0.05 * SR)
        env = np.sqrt(np.convolve(lvl ** 2, np.ones(win) / win, 'same'))
        on = (env > 0.02).astype(float)
        a, r = np.exp(-1 / (0.04 * SR)), np.exp(-1 / (0.3 * SR))
        sm = np.zeros_like(on)
        prev = 0.0
        for i, v in enumerate(on.tolist()):
            prev = (a if v > prev else r) * prev + (1 - (a if v > prev else r)) * v
            sm[i] = prev
        g = 1 - 0.65 * sm
        for name in ('music', 'music_sc', 'drums', 'verb'):
            if name in mix.b:
                mix.b[name] *= g
        mix.b['sfx'] = mix.bus('sfx') * (1 - 0.4 * sm) + vo * 0.9
        print(f'voice-over: {len(clips)} clip(s) mixed')
    return mix, duck


def main():
    args = sys.argv[1:]
    vo_path = None
    if '--vo' in args:
        k = args.index('--vo')
        vo_path = args[k + 1]
        del args[k:k + 2]
    cues_path, out = args[0], args[1]
    meta = json.load(open(cues_path, encoding='utf-8'))
    mix, duck = build(meta['cues'], meta['T'], meta['duration'], vo_path)
    x = master(mix, duck)
    wavfile.write(out, SR, (x.T * 32767).astype(np.int16))
    print(f'soundtrack → {out}  ({x.shape[1] / SR:.2f}s, peak {20 * np.log10(np.max(np.abs(x)) + 1e-9):.1f} dBFS)')


if __name__ == '__main__':
    main()
