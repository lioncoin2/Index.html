#!/usr/bin/env python3
"""
Soundtrack for ad v7 ("إنت تذاكر غلط 😬"), built from the instruments in soundtrack.py /
soundtrack_v5.py / soundtrack_v6.py.

    python3 render/soundtrack_v7.py out/cues-v7.json out/soundtrack-v7.wav [--vo PATH]

Music: an alarm-and-glitch hook (error alerts, a hard "stop", the stamp), then each of the
three mistakes plays over a tense, filtered minor groove that flips to a bright major one
the instant Orin's fix lands; a flip-cascade payoff and the brand groove to finish.

Voice-over (optional): the timeline exports its VO script with a start/end for every line
(T['vo'] in the cue sheet). A recording is mixed in when one is found, either
  * one continuous take   → out/vo-v7.wav   (starts at 0:00, recorded along with the video), or
  * one file per line     → vo/v7/01.wav … 10.wav (each placed at its line's start time),
or any file passed with --vo. Everything under the voice (music, drums, effects) is ducked
while it speaks, so the words stay on top.
"""
import glob
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from soundtrack import (  # noqa: E402
    ARP, BEAT, CHORDS, SR, Mix, bass, bell, bp, chirp, clap, crash, fades, hat, hp, kick,
    lp, master, midi, noise_sweep, pad, paper_slap, peak_eq, pluck, rng, shelf, snare, thump, tvec,
)
from soundtrack_v5 import riser, sub_drop, tom, whoosh  # noqa: E402
from soundtrack_v6 import blip, ding, sparkle  # noqa: E402
import numpy as np  # noqa: E402
from scipy import signal  # noqa: E402
from scipy.io import wavfile  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))


# ───────────────────────────── extra instruments ─────────────────────────────

def alert(f=880, dur=0.34):
    """Generic two-tone UI error alert (not any OS's sound): a falling minor third."""
    t = tvec(dur)
    x = np.zeros(len(t))
    for d, ff in ((0.0, f), (0.12, f * 0.84)):
        tt = t - d
        on = tt >= 0
        env = np.where(on, np.exp(-np.maximum(tt, 0) / 0.09), 0)
        x += (np.sin(2 * np.pi * ff * np.maximum(tt, 0)) + 0.3 * np.sin(4 * np.pi * ff * np.maximum(tt, 0))) * env
    return fades(x, 0.002, 0.03)


def glitch(dur=0.18):
    t = tvec(dur)
    x = bp(rng.standard_normal(len(t)), 1200, 6000) * (np.sign(np.sin(2 * np.pi * 37 * t)) * 0.5 + 0.5)
    return fades(x / (np.max(np.abs(x)) + 1e-9) * np.exp(-t / (dur * 0.6)), 0.001, 0.02)


def tape_stop(dur=0.45, f0=220):
    """Pitch dive for the hard 'وقف!' freeze."""
    t = tvec(dur)
    f = f0 * (1 - t / dur) ** 2 + 30
    x = np.tanh(2 * np.sin(2 * np.pi * np.cumsum(f) / SR)) * (1 - t / dur)
    return fades(lp(x, 1800), 0.002, 0.03)


def page_flip():
    t = tvec(0.09)
    x = bp(rng.standard_normal(len(t)), 1500, 7000) * np.exp(-t / 0.02) * (0.6 + 0.4 * np.sin(2 * np.pi * 60 * t))
    return fades(x / (np.max(np.abs(x)) + 1e-9), 0.001, 0.01)


def slide_down(dur=1.2, f0=900, f1=160):
    """Sad synth glide for things being forgotten."""
    t = tvec(dur)
    f = f0 * (f1 / f0) ** (t / dur)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.35 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    return fades(x * (1 - 0.6 * t / dur), 0.01, 0.1)


def squawk():
    t = tvec(0.28)
    f = 1400 + 900 * np.sin(2 * np.pi * 9 * t) * np.exp(-t / 0.12)
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.exp(-t / 0.1)
    return fades(bp(x, 800, 5000), 0.002, 0.03)


def zap(dur=0.4):
    t = tvec(dur)
    x = np.sin(2 * np.pi * 110 * t) * (np.sign(np.sin(2 * np.pi * 17 * t)) * 0.5 + 0.5)
    x += 0.4 * bp(rng.standard_normal(len(t)), 2000, 8000) * (np.sin(2 * np.pi * 23 * t) > 0.3)
    return fades(np.tanh(2 * x) * np.exp(-t / 0.25), 0.002, 0.03)


def alarm_clock(dur=0.9):
    t = tvec(dur)
    x = np.sin(2 * np.pi * 2600 * t) * (np.sin(2 * np.pi * 22 * t) > 0) * np.minimum(1, (dur - t) / 0.1)
    return fades(x, 0.003, 0.03)


def groove(add, kicks, t0, t1, chords, level=1.0, dark=False, step=1.0):
    """Four-on-the-floor + 16th plucks. dark=True: filtered, no claps, sparser plucks (the mistakes)."""
    t = t0
    ci = 0
    while t < t1 - 0.05:
        c = CHORDS[chords[ci % len(chords)]]
        d = min(step, t1 - t)
        if t1 - (t + d) < 0.3:
            d = t1 - t
        add('music_sc', pad(c['pad'], d, cutoff=900 if dark else 2200, attack=0.04, release=0.12), t, (0.5 if dark else 0.4) * level)
        for j in range(int(round(d / (BEAT / 2)))):
            tb = t + j * BEAT / 2
            if tb < t1 - 0.02:
                add('music_sc', bass(c['bass'] - 12, BEAT / 2 * 0.85), tb, 0.22 * level)
        for j in range(int(round(d / (BEAT / 4)))):
            tb = t + j * BEAT / 4
            if tb >= t1 - 0.02:
                break
            if dark and j % 2:
                continue
            m = c['arp'][ARP[j % 16] % 4]
            add('music_sc', pluck(m, 0.45, bright=0.45 if dark else 0.9), tb, (0.08 if dark else 0.1) * level * (1 if j % 4 == 0 else 0.7), pan=(-0.3 if j % 2 else 0.3))
            add('verb', pluck(m, 0.45, bright=0.9), tb, 0.02 * level)
        t += d
        ci += 1
    for tb in np.arange(t0, t1 - 0.02, BEAT):
        kicks.append(tb)
        add('drums', kick(), tb, 0.58 * level)
        add('drums', hat(), tb + BEAT / 2, (0.14 if dark else 0.28) * level, pan=0.25)
        if not dark:
            for k in (1, 3):
                add('drums', hat(), tb + k * BEAT / 4, 0.11 * level, pan=-0.3)
            if round((tb - t0) / BEAT) % 2 == 1:
                add('drums', clap(), tb, 0.36 * level, pan=0.05)
                add('verb', clap(), tb, 0.08 * level)


# ───────────────────────────── voice-over ─────────────────────────────

def load_wav(path):
    """Any wav → float stereo @ SR (mp3/m4a: convert with ffmpeg first, see add_vo.py)."""
    sr, raw = wavfile.read(path)
    scale = {np.dtype('int16'): 32768.0, np.dtype('int32'): 2147483648.0}.get(raw.dtype, 1.0)
    x = (raw.astype(float) - (128 if raw.dtype == np.uint8 else 0)) / (128.0 if raw.dtype == np.uint8 else scale)
    if x.ndim == 1:
        x = np.vstack([x, x])
    else:
        x = x.T[:2]
        if x.shape[0] == 1:
            x = np.vstack([x[0], x[0]])
    if sr != SR:
        g = np.gcd(sr, SR)
        x = signal.resample_poly(x, SR // g, sr // g, axis=1)
    return x


def find_vo(vo_lines, cli_path=None):
    """Returns a list of (start_time, stereo signal) clips, or []."""
    if cli_path:
        return [(0.0, load_wav(cli_path))]
    single = os.path.join(ROOT, 'out', 'vo-v7.wav')
    if os.path.exists(single):
        return [(0.0, load_wav(single))]
    parts = sorted(glob.glob(os.path.join(ROOT, 'vo', 'v7', '*.wav')))
    clips = []
    for p in parts:
        try:
            i = int(os.path.splitext(os.path.basename(p))[0]) - 1
        except ValueError:
            continue
        if 0 <= i < len(vo_lines):
            clips.append((vo_lines[i]['t0'], load_wav(p)))
    return clips


def voice_chain(x):
    """Light broadcast polish: rumble cut, presence lift, gentle compression, even level."""
    x = hp(x, 90)
    x = peak_eq(x, 3200, 3.0, 0.9)
    x = shelf(x, 9000, 2.0, 'high')
    x /= np.max(np.abs(x)) + 1e-9
    env = np.abs(x).max(axis=0)
    rms = np.sqrt(np.convolve(env ** 2, np.ones(int(0.03 * SR)) / int(0.03 * SR), 'same')) + 1e-6
    thr = 0.25
    gain = np.where(rms > thr, (thr / rms) ** 0.6, 1.0)
    x *= gain
    return x / (np.max(np.abs(x)) + 1e-9) * 0.9


# ───────────────────────────── score ─────────────────────────────

def build(cues, T, dur, vo_path=None):
    mix = Mix(dur)
    add = mix.add
    kicks = []

    # hook bed: an uneasy, detuned drone that the "وقف!" freeze cuts
    dr = pad([33, 40, 45, 46], T['stop'] + 0.1, cutoff=800, cents=18, attack=0.05, release=0.05)
    add('music', dr, 0.0, 0.5)
    # "and most students are like you… let me prove it"
    add('music', pad(CHORDS['Am']['pad'], T['m1'] - T['prove'], cutoff=1200, attack=0.3, release=0.2), T['prove'], 0.4)

    # three mistakes: dark groove → the fix flips it bright
    for m, f, nxt in (('m1', 'f1', 'm2'), ('m2', 'f2', 'm3'), ('m3', 'f3', 'pay')):
        groove(add, kicks, T[m], T[f], ['Am', 'F'], level=0.85, dark=True)
        groove(add, kicks, T[f], T[nxt] - 0.3, ['C', 'G', 'Am', 'F'], level=0.9)
    # payoff: a fuller bar that builds into the logo
    groove(add, kicks, T['pay'], T['end'] - 0.2, ['F', 'G', 'C', 'G'], level=0.95, step=0.85)

    # brand groove under the end card
    L = T['logo']
    for name, t0, span in (('Cadd9', L, 4 * BEAT), ('F', L + 4 * BEAT, 4 * BEAT), ('G', L + 8 * BEAT, 2 * BEAT)):
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
    for tk in np.arange(L, dur - 0.02, BEAT):
        kicks.append(tk)
        add('drums', kick(), tk, 0.6)
    for tc in np.arange(L + BEAT, dur - 0.02, 2 * BEAT):
        add('drums', clap(), tc, 0.42, pan=0.05)
        add('verb', clap(), tc, 0.1)
    for th in np.arange(L + BEAT / 2, dur - 0.02, BEAT):
        add('drums', hat(), th, 0.22, pan=0.25)

    # ---------------- sound design from cues ----------------
    for cu in cues:
        t, ty = cu['t'], cu['type']
        if ty == 'error':
            i = cu.get('i', 0)
            add('sfx', alert(760 + 60 * (i % 3)), t, 0.2, pan=[-0.3, 0.3, 0.0][i % 3])
            add('sfx', glitch(), t, 0.14, pan=[0.4, -0.4, 0.0][i % 3])
            add('drums', thump(62, 0.28, 0.07), t, 0.4)
        elif ty == 'stop':
            add('sfx', tape_stop(), t - 0.1, 0.3)
            add('drums', kick(f0=140, f1=46, dur=0.8, knock=0.7), t + 0.02, 0.6)
        elif ty == 'word':
            add('sfx', whoosh(0.3, 500, 3500), t - 0.05, 0.1)
        elif ty == 'stamp':
            boom = kick(f0=130, f1=42, ptau=0.08, atau=0.5, dur=1.3, click=0.9, drive=2.4, knock=0.8)
            add('drums', boom, t, 0.9)
            add('drums', crash(), t, 0.26)
            add('verb', boom, t, 0.18)
            add('sfx', sub_drop(1.2), t, 0.35)
            add('sfx', alert(640), t + 0.05, 0.16)
        elif ty in ('whoosh', 'swoosh'):
            add('sfx', whoosh(0.42, 300, 6500, q=0.8), t - 0.05, 0.22)
        elif ty == 'pop':
            add('sfx', chirp(900, 320, 0.09, 0.03), t, 0.18)
        elif ty == 'mistake':
            add('drums', tom(92, 0.5, 0.18), t, 0.45)
            add('sfx', alert(700), t, 0.14)
        elif ty == 'fix':
            ding(add, t)
            add('drums', crash(), t, 0.12)
            add('sfx', noise_sweep(0.5, 800, 9000, q=1.0, shape='swell'), t - 0.3, 0.08)
        elif ty == 'count':
            n = 10
            for k in range(n):
                add('sfx', page_flip(), t + (cu['until'] - t) * (k / n) ** 1.3, 0.16, pan=(0.2 if k % 2 else -0.2))
        elif ty == 'fall':
            add('sfx', slide_down(cu['until'] - t), t, 0.1)
        elif ty == 'quiz':
            add('sfx', blip(1200 + 300 * cu.get('k', 0), 0.08, 0.03), t, 0.14)
            add('sfx', pluck([79, 84, 88][cu.get('k', 0) % 3], 0.4, bright=1.0), t, 0.1)
        elif ty == 'good':
            for k, m in enumerate([84, 88, 91]):
                add('sfx', bell(midi(m), 1.2, bright=0.7), t + k * 0.05, 0.06)
        elif ty == 'parrot':
            add('sfx', squawk(), t, 0.1)
        elif ty == 'msg':
            add('sfx', chirp(900, 320, 0.09, 0.03), t, 0.15)
        elif ty == 'row':
            add('sfx', pluck([72, 76, 79][cu.get('k', 0) % 3], 0.5, bright=1.0), t, 0.13)
        elif ty == 'zap':
            add('sfx', zap(), t, 0.14)
            # the power-cut joke gets its rimshot
            tr = t + 0.9
            add('drums', snare(0.2, 230), tr, 0.28)
            add('drums', tom(150, 0.3, 0.1), tr + 0.13, 0.3)
            add('drums', crash(1.2), tr + 0.34, 0.14)
        elif ty == 'drop':
            add('drums', thump(70 - 2 * cu.get('k', 0), 0.25, 0.06), t, 0.4)
            add('sfx', paper_slap(), t, 0.14)
        elif ty == 'clock':
            add('sfx', alarm_clock(), t, 0.07)
        elif ty == 'place':
            add('sfx', pluck([72, 74, 76, 77, 79, 81, 84][cu.get('k', 0) % 7], 0.5, bright=1.0), t, 0.13)
        elif ty == 'flip':
            add('sfx', blip(1500 + 250 * cu.get('k', 0), 0.06, 0.02), t, 0.1)
            ding(add, t, 0.6)
        elif ty == 'riser':
            add('sfx', riser(cu['until'] - t, 400, 8000), t, 0.22)
        elif ty == 'impact':
            boom = kick(f0=130, f1=44, ptau=0.08, atau=0.55, dur=1.5, click=0.9, drive=2.2, knock=0.7)
            add('drums', boom, t, 0.8)
            add('drums', crash(), t, 0.28)
            add('verb', boom, t, 0.2)
            add('sfx', sub_drop(1.2), t, 0.25)
        elif ty == 'chime':
            for k, m in enumerate([84, 88, 91, 96]):
                add('sfx', bell(midi(m), 2.0, bright=0.6), t + k * 0.06, 0.08, pan=[-0.3, -0.1, 0.1, 0.3][k])
                add('verb', bell(midi(m), 2.0, bright=0.6), t + k * 0.06, 0.06)
        elif ty == 'cta':
            add('sfx', chirp(700, 1600, 0.12, 0.06), t, 0.14)
            sparkle(add, t + 0.1, 0.8)

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
        # duck everything under the voice (~ -9 dB), 40 ms attack / 300 ms release
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
