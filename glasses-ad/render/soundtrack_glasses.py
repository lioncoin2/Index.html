#!/usr/bin/env python3
"""
Soundtrack for the blue-light glasses ad, built from the synth library in ../orin-ad/render.

    python3 render/soundtrack_glasses.py out/cues.json out/soundtrack.wav [--vo PATH]

Music: a ticking, uneasy hook while the screen time races up and the stamp lands; an electric
blue hum while the light floods out, which the glasses "filter" into a warm swell; a bright
groove for the product, the demo and the uses; a drum-roll break into the price (cash
register), a van and its horn for the free delivery, and a riser into the end card.

Voice-over (optional), exactly as in orin-ad v7: one continuous take at out/vo.wav, or one file
per line at vo/parts/01.wav … 10.wav (each placed at its line's start), or any file passed with
--vo. Music, drums and effects duck under the voice while it speaks.
"""
import glob
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..'))
sys.path.insert(0, os.path.abspath(os.path.join(ROOT, '..', 'orin-ad', 'render')))
from soundtrack import (  # noqa: E402
    ARP, BEAT, CHORDS, SR, Mix, bass, bell, bp, chirp, clap, crash, fades, hat, hp, kick,
    lp, master, midi, noise_sweep, pad, pluck, rng, snare, svf, thump, tick, tvec,
)
from soundtrack_v5 import drumroll, riser, sub_drop, tension_bed, tom, whoosh  # noqa: E402
from soundtrack_v6 import blip, ding, sparkle  # noqa: E402
from soundtrack_v7 import groove, load_wav, voice_chain  # noqa: E402
import numpy as np  # noqa: E402
from scipy.io import wavfile  # noqa: E402


# ───────────────────────────── instruments ─────────────────────────────

def hum(dur):
    """Electric screen hum: detuned saws through a band-pass, tremolo, slowly opening up."""
    t = tvec(dur)
    x = np.zeros(len(t))
    for f, a in ((110, 1.0), (110.7, 0.8), (165, 0.5), (220.4, 0.3)):
        ph = (f * t) % 1.0
        x += a * (2 * ph - 1)
    p = t / dur
    x = svf(bp(x, 180, 4000), 900 * (3500 / 900) ** p, 0.9, 'lp')  # the band opens as the light grows
    x *= (0.6 + 0.4 * np.sin(2 * np.pi * (6 + 4 * p) * t)) * (0.3 + 0.7 * p)
    return fades(x / (np.max(np.abs(x)) + 1e-9), 0.08, 0.04)


def clink():
    """Glass touching glass: two high partial-rich bells and a tiny transient."""
    t = tvec(0.03)
    tr = bp(rng.standard_normal(len(t)), 3000, 9000) * np.exp(-t / 0.006)
    x = np.zeros(int(0.9 * SR))
    for m, g in ((98, 1.0), (103, 0.7), (110, 0.35)):
        b = bell(midi(m), 0.9, bright=1.0)
        x[:len(b)] += b * g
    x[:len(tr)] += tr * 0.5
    return fades(x / (np.max(np.abs(x)) + 1e-9), 0.001, 0.05)


def laser(dur=0.2):
    t = tvec(dur)
    f = 2200 * (5200 / 2200) ** (t / dur)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.07)
    return fades(x, 0.002, 0.02)


def ka_ching():
    """Cash register: drawer rattle, then the two-bell 'ching' and a few coins."""
    t = tvec(0.12)
    rattle = bp(rng.standard_normal(len(t)), 1500, 7000) * np.exp(-t / 0.04) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 70 * t)))
    x = np.zeros(int(1.6 * SR))
    x[:len(rattle)] += rattle * 0.6
    for d, m in ((0.07, 100), (0.13, 105)):
        b = bell(midi(m), 1.3, bright=1.0)
        i0 = int(d * SR)
        x[i0:i0 + len(b)] += b[:len(x) - i0]
    for k in range(6):
        b = bell(midi(104 + int(rng.integers(0, 8))), 0.25, bright=1.0)
        i0 = int((0.2 + 0.05 * k + 0.02 * rng.random()) * SR)
        x[i0:i0 + len(b)] += 0.35 * b[:len(x) - i0]
    return fades(x / (np.max(np.abs(x)) + 1e-9), 0.001, 0.08)


def engine(dur):
    """A van pulling in: low rumble + tyre noise, pitch falling as it passes and slows."""
    t = tvec(dur)
    p = t / dur
    f = 70 - 28 * p
    ph = np.cumsum(f) / SR
    x = (2 * (ph % 1.0) - 1) + 0.5 * np.sin(2 * np.pi * ph * 2)
    x = lp(x, 600) + 0.5 * bp(rng.standard_normal(len(t)), 300, 2500) * (1 - p) ** 1.5
    env = np.minimum(1, p / 0.15) * (1 - 0.7 * p)
    return fades(x * env / (np.max(np.abs(x)) + 1e-9), 0.01, 0.06)


def brake(dur=0.35):
    t = tvec(dur)
    f = 3200 - 900 * t / dur
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4 + 0.3 * bp(rng.standard_normal(len(t)), 2500, 6000)
    return fades(x * np.exp(-t / 0.18), 0.01, 0.04)


def horn():
    """Two friendly beeps."""
    out = np.zeros(int(0.42 * SR))
    for d in (0.0, 0.2):
        t = tvec(0.15)
        x = np.zeros(len(t))
        for f in (415, 523):
            x += np.tanh(3 * np.sin(2 * np.pi * f * t))
        x = lp(x, 2600) * np.minimum(1, t / 0.008) * np.minimum(1, (0.15 - t) / 0.02)
        i0 = int(d * SR)
        out[i0:i0 + len(x)] += x
    return out / (np.max(np.abs(out)) + 1e-9)


# ───────────────────────────── voice-over ─────────────────────────────

def find_vo(vo_lines, cli_path=None):
    """Returns a list of (start_time, stereo signal) clips, or []."""
    if cli_path:
        return [(0.0, load_wav(cli_path))]
    single = os.path.join(ROOT, 'out', 'vo.wav')
    if os.path.exists(single):
        return [(0.0, load_wav(single))]
    clips = []
    for p in sorted(glob.glob(os.path.join(ROOT, 'vo', 'parts', '*.wav'))):
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
    by = {}
    for cu in cues:
        by.setdefault(cu['type'], []).append(cu)

    # hook: an uneasy bed under the racing counter, cut by the stamp
    add('music', tension_bed(T['stamp'] + 0.05), 0.0, 0.26)
    for tb in np.arange(0.0, T['stamp'] - 0.05, BEAT / 2):
        add('music_sc', bass(33, BEAT / 2 * 0.8), tb, 0.26)
        add('drums', thump(56, 0.22, 0.06), tb, 0.18 if round(tb / (BEAT / 2)) % 2 else 0.3)
    # blue light: dark pulse + the hum, until the glasses land
    groove(add, kicks, T['blue'], T['land'], ['Am', 'F'], level=0.6, dark=True)
    add('sfx', hum(T['land'] - T['blue'] + 0.1), T['blue'], 0.07)
    add('sfx', noise_sweep(T['land'] - T['blue'], 2000, 9000, q=1.2, shape='rise'), T['blue'], 0.05)
    for tb in np.arange(T['blue'] + 0.1, T['land'] - 0.05, 0.085):
        f = 2400 + 2600 * rng.random()
        add('sfx', blip(f, 0.04, 0.012), tb, 0.025 + 0.03 * (tb - T['blue']) / (T['land'] - T['blue']), pan=float(rng.uniform(-0.7, 0.7)))
    # the filter: a warm swell that breathes until the reveal
    add('music', pad([53, 57, 60, 64, 67], T['reveal'] - T['land'] + 0.3, cutoff=1400, attack=0.25, release=0.2), T['land'], 0.32)
    add('verb', pad([53, 57, 60, 64, 67], T['reveal'] - T['land'] + 0.3, cutoff=1400, attack=0.25, release=0.2), T['land'], 0.1)
    add('sfx', riser(0.65, 600, 8000), T['reveal'] - 0.65, 0.16)  # into the reveal

    # product → demo → uses: one bright groove
    brk = by['break'][0]
    groove(add, kicks, T['reveal'], brk['t'], ['C', 'G', 'Am', 'F'], level=0.9, step=2.0)
    # offer: the beat drops for the roll, comes back on the price
    groove(add, kicks, brk['until'], T['end'] - 0.5, ['F', 'G', 'C', 'G'], level=0.95, step=1.0)
    # end card
    I = T['end'] + 0.15
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
        if ty == 'tick':
            h = cu.get('h', 1)
            add('sfx', tick(high=h % 2 == 0), t, 0.3 + 0.03 * h, pan=(0.15 if h % 2 else -0.15))
            add('sfx', blip(1500 + 90 * h, 0.05, 0.015), t, 0.05)
        elif ty == 'stamp':
            boom = kick(f0=130, f1=42, ptau=0.08, atau=0.5, dur=1.3, click=0.9, drive=2.4, knock=0.8)
            add('drums', boom, t, 0.9)
            add('drums', crash(), t, 0.24)
            add('verb', boom, t, 0.18)
            add('sfx', sub_drop(1.2), t, 0.35)
        elif ty == 'whoosh':
            add('sfx', whoosh(0.42, 300, 6500, q=0.8), t - 0.05, 0.2)
        elif ty == 'swoop':
            add('sfx', whoosh(0.5, 250, 7000, q=0.7), t, 0.24)
        elif ty == 'land':
            add('sfx', clink(), t, 0.2)
            add('drums', thump(64, 0.3, 0.08), t, 0.4)
            add('sfx', noise_sweep(0.6, 6000, 900, q=1.0, shape='fall'), t, 0.05)
        elif ty == 'reveal':
            boom = kick(f0=130, f1=44, ptau=0.08, atau=0.55, dur=1.5, click=0.9, drive=2.2, knock=0.7)
            add('drums', boom, t, 0.8)
            add('drums', crash(), t, 0.28)
            add('verb', boom, t, 0.2)
            add('sfx', sub_drop(1.2), t, 0.25)
            sparkle(add, t + 0.05, 1.2)
        elif ty == 'title':
            add('sfx', whoosh(0.35, 500, 5000), t - 0.05, 0.1)
        elif ty in ('pop', 'chip'):
            add('sfx', chirp(900, 320, 0.09, 0.03), t, 0.16)
            add('sfx', pluck([72, 76, 79, 84, 79, 84][cu.get('k', 0) % 6], 0.45, bright=1.0), t, 0.1)
        elif ty == 'shine':
            sparkle(add, t, 0.7)
        elif ty == 'move':
            add('sfx', whoosh(0.4, 400, 5000, q=0.9), t, 0.12)
        elif ty == 'drop':
            add('drums', thump(70, 0.25, 0.06), t, 0.35)
        elif ty == 'ray':
            add('sfx', laser(), t, 0.05, pan=(-0.25 if cu.get('k', 0) < 3 else 0.25))
        elif ty == 'ping':
            kk = cu.get('k', 0)
            add('sfx', bell(midi([96, 98, 100, 99, 101, 103][kk % 6]), 0.6, bright=1.0), t, 0.08, pan=(-0.4 if kk < 3 else 0.4))
            add('verb', bell(midi(96 + kk), 0.6, bright=1.0), t, 0.03)
        elif ty == 'pass':
            add('sfx', pluck(64, 0.9, bright=0.4), t, 0.1)
            add('music', pad([60, 64, 67], 0.9, cutoff=900, attack=0.05, release=0.5), t, 0.08)
        elif ty == 'break':
            add('drums', drumroll(cu['until'] - t), t, 0.32)
            add('sfx', riser(cu['until'] - t, 500, 7000), t, 0.12)
        elif ty == 'price':
            add('sfx', ka_ching(), t, 0.3)
            add('drums', kick(f0=140, f1=46, dur=0.9, knock=0.7), t, 0.6)
            add('drums', crash(), t, 0.22)
        elif ty == 'van':
            add('sfx', engine(cu['until'] - t + 0.25), t, 0.22)
            add('sfx', brake(), cu['until'] - 0.12, 0.05)
        elif ty == 'horn':
            add('sfx', horn(), t, 0.12, pan=0.1)
        elif ty == 'badge':
            add('drums', thump(60, 0.3, 0.07), t, 0.4)
            add('sfx', chirp(1200, 400, 0.1, 0.03), t, 0.14)
            ding(add, t + 0.04, 0.6)
        elif ty == 'vanout':
            add('sfx', whoosh(0.45, 200, 3000, q=0.8), t, 0.18)
        elif ty == 'riser':
            add('sfx', riser(cu['until'] - t, 400, 8000), t, 0.32)
        elif ty == 'impact':
            boom = kick(f0=130, f1=44, ptau=0.08, atau=0.55, dur=1.5, click=0.9, drive=2.2, knock=0.7)
            add('drums', boom, t, 0.8)
            add('drums', crash(), t, 0.28)
            add('verb', boom, t, 0.2)
            add('sfx', sub_drop(1.2), t, 0.25)
        elif ty == 'chime':
            for j, m in enumerate([84, 88, 91, 96]):
                add('sfx', bell(midi(m), 2.0, bright=0.6), t + j * 0.06, 0.08, pan=[-0.3, -0.1, 0.1, 0.3][j])
                add('verb', bell(midi(m), 2.0, bright=0.6), t + j * 0.06, 0.06)
        elif ty == 'cta':
            add('sfx', chirp(700, 1600, 0.12, 0.06), t, 0.14)
            sparkle(add, t + 0.1, 0.8)
        elif ty == 'pulse':
            add('sfx', blip(1800, 0.05, 0.02), t, 0.05)

    duck = np.ones(mix.n)
    seg_t = tvec(0.45)
    seg = 1 - 0.6 * np.exp(-seg_t / 0.11) * np.minimum(1, seg_t / 0.004 + 0.3)
    for tk in kicks:
        i0 = int(round(tk * SR))
        m = min(len(seg), mix.n - i0)
        if m > 0:
            duck[i0:i0 + m] = np.minimum(duck[i0:i0 + m], seg[:m])
    mix.bus('verb')

    # ---------------- voice-over (if a recording is present) ----------------
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
