#!/usr/bin/env python3
"""
Soundtrack for ad v5 ("تحدّي 3 أسئلة" — the play-along quiz), built from the
instruments in soundtrack.py / soundtrack_v3.py.

    python3 render/soundtrack_v5.py out/cues-v5.json out/soundtrack-v5.wav

Game-show dramaturgy, driven entirely by the cue sheet and the per-question
times in T['q'] (s = question in, c0 = countdown, r = time's up, rv = reveal):

  * reading      a light, curious A-minor groove while the question lands
  * countdown    the groove drops out: clock tick + beep on every second, a
                 tremolo cluster whose filter opens, a heartbeat in the last
                 second and a riser that is cut dead at the reveal
  * reveal       "ding" + a bright major stab, then a major-key groove under
                 Orin's explanation (relief = the brand's sound)
  * the trap     Q3 hangs on a low suspense hit, the crowd's answer gets the
                 game-show buzzer, and only then the biggest "ding"
  * score        drum roll under the tiers, a rimshot for "0/3 تحتاج Orin"
  * end card     the same Cadd9/F/G brand groove as the other four ads
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from soundtrack import (  # noqa: E402
    ARP, BEAT, CHORDS, SR, Mix, bass, bell, bp, chirp, clap, crash, fades, hat, kick,
    lp, master, midi, noise_sweep, pad, paper_slap, pluck, rng, snare, svf, thump, tick, tvec,
)
from soundtrack_v3 import buzzer  # noqa: E402  (game-show wrong-answer tone)
import numpy as np  # noqa: E402
from scipy.io import wavfile  # noqa: E402


# ───────────────────────────── extra instruments ─────────────────────────────

def tom(f0=180, dur=0.45, tau=0.16):
    t = tvec(dur)
    f = f0 * (0.72 + 0.28 * np.exp(-t / 0.05))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / tau)
    x += 0.25 * bp(rng.standard_normal(len(t)), 800, 4000) * np.exp(-t / 0.012)
    return fades(np.tanh(1.6 * x), 0.0005, 0.04)


def beep(f=880, dur=0.11):
    """Clean quiz-clock beep (sine + a little 2nd harmonic)."""
    t = tvec(dur)
    x = np.sin(2 * np.pi * f * t) + 0.18 * np.sin(4 * np.pi * f * t)
    return fades(x * np.exp(-t / (dur * 0.9)), 0.002, 0.02)


def drumroll(dur, rate=24.0):
    """Snare roll that swells from nothing to full over `dur`."""
    n = int(dur * SR)
    out = np.zeros(n)
    k = 0
    while k / rate < dur - 0.02:
        t0 = k / rate
        hit = snare(0.12, tone=200) * (0.15 + 0.85 * (t0 / dur) ** 1.6) * (0.85 + 0.3 * rng.random())
        i0 = int(t0 * SR)
        m = min(len(hit), n - i0)
        out[i0:i0 + m] += hit[:m]
        k += 1
    return fades(out, 0.005, 0.03)


def tension_bed(dur):
    """Dissonant tremolo cluster whose low-pass opens and tremolo speeds up across the countdown."""
    x = pad([45, 46, 52, 58, 63], dur, cutoff=2400, cents=16, attack=0.2, release=0.03, level=1.0)
    m = x.shape[1]
    tt = np.arange(m) / SR
    p = np.clip(tt / dur, 0, 1)
    fc = 380 * (3600 / 380) ** p
    y = np.vstack([svf(x[c], fc, 0.95, 'lp') for c in range(2)])
    ph = 2 * np.pi * np.cumsum(5.0 + 9.0 * p) / SR
    y *= (0.55 + 0.45 * np.sin(ph)) * (0.25 + 0.75 * p ** 0.8)
    return fades(y / (np.max(np.abs(y)) + 1e-9), 0.01, 0.01)


def riser(dur, f0=300, f1=9000):
    """Noise riser + a sine glide an octave and a half up; ends at full level (cut by the hit)."""
    t = tvec(dur)
    nz = noise_sweep(dur, f0, f1, q=1.1, shape='rise')
    gl = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (1.5 * t / dur)) / SR) * (t / dur) ** 2
    return nz + 0.22 * np.vstack([gl, gl])


def sub_drop(dur=0.9, f0=110, f1=38):
    t = tvec(dur)
    f = f1 + (f0 - f1) * np.exp(-t / (dur * 0.35))
    return fades(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (dur * 0.45)), 0.002, 0.08)


def whoosh(dur=0.45, f0=350, f1=6000, q=0.9):
    return noise_sweep(dur, f0, f1, q=q, shape='swell')


def ding(add, t, gain=1.0, big=False):
    """Correct answer: a quick bright bell arpeggio (C6 E6 G6 C7 [+E7])."""
    notes = [84, 88, 91, 96] + ([100] if big else [])
    for k, m in enumerate(notes):
        pan = [-0.3, -0.1, 0.1, 0.3, 0.0][k]
        add('sfx', bell(midi(m), 1.8, bright=0.75), t + k * 0.045, 0.11 * gain, pan=pan)
        add('verb', bell(midi(m), 1.8, bright=0.75), t + k * 0.045, 0.07 * gain)


def chord_stab(add, name, t, gain=0.12, dur=0.9):
    c = CHORDS[name]
    for k, m in enumerate(c['arp']):
        add('music', pluck(m, dur, bright=0.9, decay=2.0), t + k * 0.012, gain, pan=(k - 1.5) * 0.2)
        add('verb', pluck(m, dur, bright=0.9, decay=2.0), t + k * 0.012, gain * 0.5)


# ───────────────────────────── score ─────────────────────────────

def groove(add, kicks, t0, t1, chords, step=1.0, level=1.0, clap_on=True, arp_gain=0.11, first_kick=True):
    """16th-note pluck groove over `chords` (cycled, `step` seconds each) with kick/hat/bass.
    `first_kick=False` when a cue already lands an impact on t0."""
    if t1 - t0 < 0.1:
        return
    t = t0
    ci = 0
    while t < t1 - 0.05:
        name = chords[ci % len(chords)]
        c = CHORDS[name]
        d = min(step, t1 - t)
        if t1 - (t + d) < 0.3:   # never leave a sliver of a chord at the end
            d = t1 - t
        add('music_sc', pad(c['pad'], d, cutoff=2000, attack=0.04, release=0.12), t, 0.42 * level)
        for j in range(int(round(d / (BEAT / 2)))):
            tb = t + j * BEAT / 2
            if tb < t1 - 0.02:
                add('music_sc', bass(c['bass'] - 12, BEAT / 2 * 0.85), tb, 0.24 * level)
        for j in range(int(round(d / (BEAT / 4)))):
            tb = t + j * BEAT / 4
            if tb >= t1 - 0.02:
                break
            m = c['arp'][ARP[j % 16] % 4]
            add('music_sc', pluck(m, 0.45, bright=0.85), tb, arp_gain * level * (1 if j % 4 == 0 else 0.72), pan=(-0.3 if j % 2 else 0.3))
            add('verb', pluck(m, 0.45, bright=0.85), tb, 0.025 * level)
        t += d
        ci += 1
    for tb in np.arange(t0, t1 - 0.02, BEAT):
        if tb > t0 or first_kick:
            kicks.append(tb)
            add('drums', kick(), tb, 0.6 * level)
        add('drums', hat(), tb + BEAT / 2, 0.24 * level, pan=0.25)
        for k in (1, 3):
            add('drums', hat(), tb + k * BEAT / 4, 0.09 * level, pan=-0.3)
        if clap_on and round((tb - t0) / BEAT) % 2 == 1:
            add('drums', clap(), tb, 0.36 * level, pan=0.05)
            add('verb', clap(), tb, 0.08 * level)


def build(cues, T, dur):
    mix = Mix(dur)
    add = mix.add
    kicks = []
    Q = T['q']
    S, E, L = T['score'], T['end'], T['logo']

    # ---------------- hook bed: dark A drone under the "3" ----------------
    q0 = Q[0]['s']
    dr = pad([33, 40, 45], q0 - 0.25, cutoff=700, cents=12, attack=0.4, release=0.3, level=1.0)
    add('music', dr, 0.1, 0.6)

    # ---------------- per-question music ----------------
    for qi, q in enumerate(Q):
        s, c0, r, rv, end = q['s'], q['c0'], q['r'], q['rv'], q['end']
        # reading: curious minor groove (no claps — lighter), a touch louder each round
        groove(add, kicks, s, c0 - 0.4, ['Am', 'F'], step=1.0, level=0.75 + 0.1 * qi, clap_on=False, arp_gain=0.09, first_kick=False)
        # countdown: tension bed + sub pulse + riser cut dead at the reveal
        cd = r - c0
        add('music', tension_bed(cd + 0.05), c0, 0.62)
        tt = tvec(cd)
        sub = np.sin(2 * np.pi * 55 * tt) * (0.3 + 0.7 * (tt / cd)) * (0.6 + 0.4 * np.sin(2 * np.pi * 2 * tt) ** 2)
        add('music', fades(sub, 0.05, 0.005), c0, 0.24)
        add('sfx', riser(1.6), r - 1.6, 0.26)
        for tb in np.arange(c0 + 0.5, r - 0.05, 1.0):
            add('sfx', tick(high=False), tb, 0.2, pan=-0.15)        # tock between the second ticks
        if q.get('trap'):
            # hanging on the mistake: low drone until the real reveal
            add('music', pad([33, 34, 40], rv - r, cutoff=600, cents=18, attack=0.05, release=0.05), r, 0.35)
        # explanation: relief in a major key
        groove(add, kicks, rv, end - 0.36, ['C', 'G', 'Am', 'F'] if q.get('trap') else ['C', 'G'], step=1.0, level=0.85, first_kick=False)

    # ---------------- score: drum roll under the tiers ----------------
    add('drums', drumroll(1.2), S + 0.05, 0.62)
    groove(add, kicks, S + 1.6, E - 0.3, ['F', 'G'], step=0.85, level=0.7, arp_gain=0.08)

    # ---------------- end: build, then the brand groove ----------------
    add('music_sc', pad(CHORDS['G']['pad'], L - E, cutoff=1600, attack=0.3, release=0.1), E, 0.5)
    for j in range(int((L - E) / (BEAT / 2))):
        add('music_sc', bass(CHORDS['G']['bass'] - 12, BEAT / 2 * 0.9), E + j * BEAT / 2, 0.18)
    for th in np.arange(E + BEAT / 4, L - 0.05, BEAT / 4):
        pr = (th - E) / (L - E)
        add('drums', hat(), th, 0.07 + 0.13 * pr, pan=0.2)
    add('sfx', riser(L - E - 0.1, 400, 8000), E + 0.1, 0.16)
    groove_chords = [('Cadd9', L, 4 * BEAT), ('F', L + 4 * BEAT, 2 * BEAT)]
    for name, t0, span in groove_chords:
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
    for cu in cues:
        t, ty = cu['t'], cu['type']
        if ty == 'slam':
            boom = kick(f0=130, f1=44, ptau=0.08, atau=0.5, dur=1.3, click=0.9, drive=2.2, knock=0.7)
            add('drums', boom, t, 0.85)
            add('drums', crash(), t, 0.26)
            add('verb', boom, t, 0.16)
            add('sfx', sub_drop(1.2), t, 0.35)
            nb = lp(rng.standard_normal(int(0.8 * SR)), 900) * np.exp(-tvec(0.8) / 0.15)
            add('sfx', nb / np.max(np.abs(nb)), t, 0.26)
        elif ty == 'word':
            add('sfx', whoosh(0.35, 500, 4000), t - 0.08, 0.14)
            add('sfx', thump(70), t + 0.05, 0.3)
        elif ty == 'tickTock':
            for k, tb in enumerate(np.arange(t, cu['until'] - 0.05, BEAT / 2)):
                add('sfx', tick(high=(k % 2 == 0)), tb, 0.3, pan=(0.2 if k % 2 else -0.2))
        elif ty == 'slap':
            add('sfx', paper_slap(), t, 0.5)
            add('drums', kick(f0=150, f1=60, dur=0.4, knock=0.6), t, 0.5)
            add('drums', clap(), t, 0.3)
            add('verb', clap(), t, 0.12)
        elif ty == 'zoom':
            d = cu['until'] - t
            add('sfx', riser(d, 250, 10000), t, 0.34)
            add('sfx', whoosh(d + 0.15, 200, 7000, q=0.7), t, 0.22)
        elif ty == 'qIn':
            big = cu.get('i', 0) == 0
            add('drums', kick(f0=150, f1=48, dur=0.8, knock=0.6, drive=2.0), t, 0.72 if big else 0.55)
            add('drums', crash(), t, 0.16 if big else 0.1)
            add('sfx', bell(midi(88), 1.2, bright=0.6), t + 0.02, 0.08, pan=-0.2)   # "bling" — question!
            add('sfx', bell(midi(93), 1.2, bright=0.6), t + 0.1, 0.08, pan=0.2)
            add('verb', bell(midi(93), 1.2, bright=0.6), t + 0.1, 0.06)
            if big:
                add('sfx', sub_drop(0.9), t, 0.3)
        elif ty == 'hard':
            add('drums', tom(110, 0.6, 0.22), t + 0.5, 0.35)
            add('drums', tom(92, 0.6, 0.22), t + 0.62, 0.35)
        elif ty == 'opt':
            k = cu.get('k', 0)
            add('sfx', chirp(700 + 180 * k, 1400 + 250 * k, 0.07, 0.03), t, 0.13, pan=[-0.25, 0, 0.25][k % 3])
        elif ty == 'charge':
            add('sfx', chirp(380, 1700, 0.35, 0.2), t, 0.10)
            add('sfx', whoosh(0.4, 400, 5000), t, 0.12)
        elif ty == 'count':
            n = cu.get('n', 3)
            add('sfx', tick(high=True), t, 0.42)
            add('sfx', beep(880 if n > 1 else 1175, 0.12), t, 0.24 if n > 1 else 0.3)
            add('verb', beep(880 if n > 1 else 1175, 0.12), t, 0.05)
        elif ty == 'heart':
            add('drums', thump(56, 0.3, 0.09), t, 0.75)
            add('drums', thump(50, 0.3, 0.09), t + 0.13, 0.55)
        elif ty == 'correct':
            big = cu.get('big', False)
            ding(add, t, 1.35 if big else 1.0, big=big)
            chord_stab(add, 'Cadd9' if big else 'C', t, 0.12 if big else 0.1)
            add('drums', kick(f0=140, f1=46, dur=0.9, knock=0.6), t, 0.7)
            add('drums', crash(), t, 0.22 if big else 0.12)
            if big:
                add('sfx', sub_drop(1.1), t, 0.35)
                add('verb', crash(), t, 0.08)
        elif ty == 'trapPick':
            add('drums', tom(82, 0.8, 0.3), t, 0.55)
            add('sfx', pluck(58, 0.9, bright=0.5, decay=2.5), t, 0.12)
            add('sfx', pluck(59, 0.9, bright=0.5, decay=2.5), t, 0.12)
        elif ty == 'wrong':
            add('sfx', buzzer(0.45), t, 0.3)
            add('drums', kick(f0=120, f1=40, dur=0.7, knock=0.8, drive=2.4), t, 0.7)
            add('sfx', sub_drop(0.7, 90, 34), t, 0.3)
        elif ty == 'collapse':
            add('sfx', whoosh(0.32, 2400, 400, q=0.8), t, 0.11)
        elif ty == 'card':
            add('sfx', chirp(900, 320, 0.09, 0.03), t, 0.18)
        elif ty == 'fly':
            add('sfx', whoosh(0.5, 600, 5200, q=1.0), t, 0.16)
        elif ty == 'land':
            add('sfx', bell(midi(96), 0.8, bright=0.5), t, 0.07)
            add('sfx', pluck(84, 0.3, bright=1.0), t, 0.08)
            add('verb', bell(midi(96), 0.8, bright=0.5), t, 0.05)
        elif ty == 'whip':
            add('sfx', whoosh(0.46, 300, 7000, q=0.8), t - 0.05, 0.32)
            add('drums', thump(62, 0.3, 0.08), t + 0.36, 0.45)
        elif ty == 'scoreIn':
            add('drums', kick(f0=140, f1=46, dur=0.9, knock=0.6), t, 0.7)
            add('drums', crash(), t, 0.16)
        elif ty == 'tier':
            n = cu.get('n', 0)
            add('sfx', pluck([72, 76, 79][n % 3], 0.5, bright=1.0), t, 0.14, pan=[-0.2, 0, 0.2][n % 3])
            add('sfx', hat(), t, 0.12)
        elif ty == 'rimshot':
            # "ba-dum-tss" for "0/3 تحتاج Orin"
            add('drums', kick(f0=150, f1=50, dur=0.6, knock=0.7), t, 0.6)
            add('drums', snare(0.25, 230), t, 0.4)
            add('drums', tom(170, 0.35, 0.12), t, 0.3)
            add('drums', tom(120, 0.45, 0.16), t + 0.15, 0.4)
            add('drums', kick(), t + 0.15, 0.45)
            add('drums', crash(1.6), t + 0.42, 0.24)
            add('drums', snare(0.2, 230), t + 0.42, 0.25)
            add('verb', crash(1.6), t + 0.42, 0.06)
        elif ty == 'prompt':
            add('sfx', chirp(600, 1500, 0.1, 0.05), t, 0.12)
            add('sfx', whoosh(0.4, 500, 4500), t - 0.1, 0.1)
        elif ty == 'endIn':
            add('sfx', whoosh(0.5, 300, 5000), t - 0.1, 0.2)
        elif ty == 'pop':
            add('sfx', chirp(900, 320, 0.09, 0.03), t, 0.18)
        elif ty == 'impact':
            boom = kick(f0=130, f1=44, ptau=0.08, atau=0.55, dur=1.5, click=0.9, drive=2.2, knock=0.7)
            add('drums', boom, t, 0.8)
            add('drums', crash(), t, 0.28)
            add('verb', boom, t, 0.22)
            add('sfx', sub_drop(1.2), t, 0.25)
        elif ty == 'cta':
            add('sfx', chirp(700, 1600, 0.12, 0.06), t, 0.14)
            fin = np.zeros((2, int(1.3 * SR)))
            for m in [48, 55, 60, 64, 67, 72, 76]:
                p = pluck(m, 1.3, bright=0.35, decay=4.0)
                fin[:, :len(p)] += p
            add('music', fin, t, 0.14)
            add('verb', fin, t, 0.08)
        elif ty == 'chime':
            for k, m in enumerate([84, 88, 91, 96]):
                add('sfx', bell(midi(m), 2.0, bright=0.6), t + k * 0.06, 0.08, pan=[-0.3, -0.1, 0.1, 0.3][k])
                add('verb', bell(midi(m), 2.0, bright=0.6), t + k * 0.06, 0.06)

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
