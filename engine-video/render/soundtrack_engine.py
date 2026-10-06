#!/usr/bin/env python3
"""
Soundtrack for the engine explainer — a dark techno-documentary bed with mechanical sound design
locked to the animation's cues.

    python3 render/soundtrack_engine.py out/cues.json out/soundtrack.wav

Every 'fire' cue (a combustion in the cylinder) gets a thump; the slow-motion power stroke gets a
spark zap + a big boom. Intake sucks (falling noise sweep), compression rises, exhaust whooshes.
The 'rev' section adds an engine drone whose pitch follows the crank speed. A VO at out/vo.wav
ducks the music.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..'))
sys.path.insert(0, os.path.abspath(os.path.join(ROOT, '..', 'orin-ad', 'render')))
from soundtrack import BEAT, SR, Mix, bp, crash, fades, hat, kick, lp, master, midi, noise_sweep, pad, bass, rng, svf, thump, tick, tvec  # noqa: E402
from soundtrack_v5 import riser, sub_drop, whoosh  # noqa: E402
from soundtrack_v6 import blip  # noqa: E402
from soundtrack_v7 import load_wav, voice_chain  # noqa: E402
import numpy as np  # noqa: E402
from scipy.io import wavfile  # noqa: E402


def zap(dur=0.22):
    """Spark plug: a crackle of band-passed noise bursts with a high buzz."""
    t = tvec(dur)
    nz = bp(rng.standard_normal(len(t)), 2500, 12000)
    gate = (rng.random(len(t)) < 0.35).astype(float)
    gate = np.convolve(gate, np.ones(60) / 60, 'same')
    buzz = np.sign(np.sin(2 * np.pi * 3200 * t)) * 0.3
    x = (nz * gate + buzz) * np.exp(-t / 0.07)
    return fades(x / (np.max(np.abs(x)) + 1e-9), 0.001, 0.02)


def boom():
    k = kick(f0=120, f1=34, ptau=0.09, atau=0.7, dur=1.8, click=1.0, drive=2.8, knock=0.9)
    t = tvec(0.6)
    rumble = lp(rng.standard_normal(len(t)), 400) * np.exp(-t / 0.18)
    out = k.copy()
    out[:len(rumble)] += rumble * 0.6
    return out


def suck(dur):
    """Air being drawn in: a falling, slightly resonant noise sweep."""
    return noise_sweep(dur, 3500, 300, q=1.4, shape='swell')


def drone(dur, speed):
    """Engine drone: a buzzy pulse train whose firing rate follows the crank speed (deg/s array)."""
    n = len(speed)
    fire_hz = speed / 720.0 * 4  # pretend 4 cylinders → 4 fires per 720°
    ph = 2 * np.pi * np.cumsum(np.maximum(fire_hz, 1e-3)) / SR
    pulses = np.maximum(0, np.sin(ph)) ** 6
    body = np.sin(2 * np.pi * np.cumsum(fire_hz * 2 + 40) / SR)
    x = np.tanh(2.2 * (pulses * 0.9 + body * 0.35))
    x = svf(x, 200 + 4 * fire_hz * 20, 0.7, 'lp')
    return fades(x / (np.max(np.abs(x)) + 1e-9), 0.05, 0.1)


# A minor, techy: Am – F – C – G (two beats = one chord at 120 BPM → each chord one bar)
CHORDS = [[57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62]]
ROOTS = [33, 29, 36, 31]


def groove(add, kicks, t0, t1, level=1.0, full=True):
    step = BEAT / 4
    n = int(round((t1 - t0) / step))
    for i in range(n):
        tb = t0 + i * step
        pos = i % 16
        bar = (i // 16) % 4
        if pos in (0, 8) or (full and pos in (4, 12)):
            kicks.append(tb)
            add('drums', kick(f0=130, f1=46, dur=0.4, click=0.5), tb, 0.5 * level)
        if full and pos in (4, 12):
            add('drums', tick(True), tb, 0.12 * level, pan=-0.1)
        if pos % 2 == 1:
            add('drums', hat(), tb, 0.07 * level, pan=0.3)
        if pos % 2 == 0:
            add('music_sc', bass(ROOTS[bar] + (12 if pos % 8 == 6 else 0), step * 1.6), tb, 0.16 * level)
        if pos == 0:
            add('music', pad(CHORDS[bar], BEAT * 4, cutoff=1400, attack=0.4, release=0.8), tb, 0.13 * level)


def build(cues, T, dur):
    mix = Mix(dur)
    add = mix.add
    kicks = []
    # Hook + opening: a low tension pad, no drums
    add('music', pad([45, 52, 57], T['strokes'], cutoff=900, attack=1.0, release=1.0), 0, 0.14)
    # Strokes: sparse groove (kick on 1 and 3) so the sound design reads
    groove(add, kicks, T['strokes'], T['fast'], 0.75, full=False)
    # Fast + wheels: full groove
    groove(add, kicks, T['fast'], dur - 0.2, 1.0, full=True)

    for cu in cues:
        t, ty = cu['t'], cu['type']
        if ty == 'fire':
            if cu.get('slow'):
                add('sfx', zap(), t - 0.04, 0.35)
                add('drums', boom(), t, 0.9)
                add('drums', crash(), t, 0.2)
                add('verb', boom(), t, 0.2)
                add('sfx', sub_drop(1.2), t, 0.3)
            else:
                add('drums', thump(55, 0.3, 0.08), t, 0.45)
                add('sfx', zap(0.08), t, 0.08)
        elif ty == 'cap':
            add('sfx', whoosh(0.35, 600, 7000), t - 0.12, 0.12)
        elif ty == 'label':
            add('sfx', blip(1200 + 160 * cu.get('k', 0), 0.07, 0.025), t, 0.12)
        elif ty == 'intake':
            add('sfx', suck(cu['until'] - t), t, 0.22)
        elif ty == 'compress':
            add('sfx', riser(cu['until'] - t, 200, 5000), t, 0.2)
        elif ty == 'power':
            pass  # the slow 'fire' cue carries the boom
        elif ty == 'exhaust':
            add('sfx', whoosh(cu['until'] - t, 2500, 250, q=0.7), t, 0.28)
            add('sfx', noise_sweep(cu['until'] - t, 300, 1200, q=0.6, shape='swell'), t, 0.12)
        elif ty == 'rev':
            t1 = dur
            tt = np.arange(int((t1 - t) * SR)) / SR
            sp = np.where(tt < cu['until'] - t, 800 * tt, 1800.0)
            d = drone(t1 - t, sp)
            env = np.minimum(1, tt / 0.8) * np.where(tt < (t1 - t) - 1.5, 1, np.clip(((t1 - t) - tt) / 1.5, 0, 1))
            add('sfx', d * env, t, 0.22)
            add('sfx', riser(cu['until'] - t, 150, 6000), t, 0.12)
        elif ty == 'end':
            add('drums', crash(), t, 0.24)
            add('sfx', sub_drop(1.0), t, 0.25)

    duck = np.ones(mix.n)
    seg_t = tvec(0.4)
    seg = 1 - 0.55 * np.exp(-seg_t / 0.1) * np.minimum(1, seg_t / 0.004 + 0.3)
    for tk in kicks:
        i0 = int(round(tk * SR)); m = min(len(seg), mix.n - i0)
        if m > 0:
            duck[i0:i0 + m] = np.minimum(duck[i0:i0 + m], seg[:m])
    mix.bus('verb')
    vo_file = os.path.join(ROOT, 'out', 'vo.wav')
    if os.path.exists(vo_file):
        vo = voice_chain(load_wav(vo_file)[:, :mix.n])
        if vo.shape[1] < mix.n:
            vo = np.hstack([vo, np.zeros((2, mix.n - vo.shape[1]))])
        on = np.convolve((np.abs(vo).max(axis=0) > 0.02).astype(float), np.ones(int(0.25 * SR)) / int(0.25 * SR), 'same')
        for name in ('music', 'music_sc', 'drums', 'verb'):
            if name in mix.b:
                mix.b[name] *= 1 - 0.6 * np.clip(on, 0, 1)
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
