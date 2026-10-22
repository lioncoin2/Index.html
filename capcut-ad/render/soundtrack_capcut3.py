#!/usr/bin/env python3
"""Ad v3 soundtrack: phonk beat (shared with v2) that only drops when the box bursts; hits on every slam,
wooden knocks on the box, a riser into the burst, a cash register on the price.
    python3 render/soundtrack_capcut3.py out/cues-v3.json out/soundtrack-v3.wav
"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.abspath(os.path.join(HERE, '..', '..', 'glasses-ad', 'render')))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, '..', '..', 'orin-ad', 'render')))
from soundtrack import SR, Mix, bp, crash, kick, master, noise_sweep, rng, thump, tvec  # noqa: E402
from soundtrack_v3 import buzzer  # noqa: E402
from soundtrack_v5 import riser, sub_drop, whoosh  # noqa: E402
from soundtrack_v6 import blip, sparkle  # noqa: E402
from soundtrack_glasses import ka_ching  # noqa: E402
from soundtrack_capcut2 import beat, hit, scratch  # noqa: E402
import numpy as np  # noqa: E402
from scipy.io import wavfile  # noqa: E402


def knock():
    t = tvec(0.25)
    body = np.sin(2 * np.pi * 180 * t) * np.exp(-t / 0.04) + 0.6 * np.sin(2 * np.pi * 95 * t) * np.exp(-t / 0.07)
    click = bp(rng.standard_normal(len(t)), 800, 4000) * np.exp(-t / 0.01) * 0.6
    return np.tanh(1.5 * (body + click))


def build(cues, T, dur):
    mix = Mix(dur)
    add = mix.add
    kicks = []
    beat(add, kicks, T['prob'], T['reveal'], 0.55, thin=True)
    beat(add, kicks, T['burst'], dur - 0.3, 1.0)
    for cu in cues:
        t, ty = cu['t'], cu['type']
        if ty == 'slam':
            add('drums', hit(cu.get('size', 'mid')), t, 0.55)
        elif ty == 'knock':
            add('sfx', knock(), t, 0.5); add('verb', knock(), t, 0.15)
        elif ty == 'pop':
            sparkle(add, t, 0.8)
        elif ty == 'whoosh':
            add('sfx', whoosh(0.35, 500, 7000), t, 0.22)
        elif ty == 'stamp':
            add('drums', thump(60, 0.3, 0.07), t, 0.45); add('sfx', scratch(), t, 0.15)
        elif ty == 'lock':
            add('sfx', blip(700, 0.06, 0.02), t, 0.12); add('sfx', blip(500, 0.08, 0.03), t + 0.04, 0.1)
        elif ty == 'rise':
            add('sfx', riser(cu['until'] - t, 250, 9000), t, 0.32)
            add('sfx', noise_sweep(cu['until'] - t, 400, 9000, q=1.2, shape='rise'), t, 0.12)
        elif ty == 'drop':
            boom = kick(f0=130, f1=36, ptau=0.09, atau=0.7, dur=1.8, click=1.0, drive=2.8, knock=0.9)
            add('drums', boom, t, 1.0); add('drums', crash(), t, 0.35); add('verb', boom, t, 0.25); add('sfx', sub_drop(1.6), t, 0.4)
        elif ty == 'price':
            add('sfx', ka_ching(), t, 0.32); add('drums', hit('big'), t, 0.5)
        elif ty == 'btn':
            add('sfx', blip(1300, 0.06, 0.02), t, 0.12)
        elif ty == 'pulse':
            add('sfx', blip(1800, 0.05, 0.02), t, 0.06)
    duck = np.ones(mix.n)
    seg_t = tvec(0.4)
    seg = 1 - 0.6 * np.exp(-seg_t / 0.1) * np.minimum(1, seg_t / 0.004 + 0.3)
    for tk in kicks:
        i0 = int(round(tk * SR)); m = min(len(seg), mix.n - i0)
        if m > 0: duck[i0:i0 + m] = np.minimum(duck[i0:i0 + m], seg[:m])
    mix.bus('verb')
    return mix, duck


def main():
    meta = json.load(open(sys.argv[1], encoding='utf-8'))
    mix, duck = build(meta['cues'], meta['T'], meta['duration'])
    x = master(mix, duck)
    wavfile.write(sys.argv[2], SR, (x.T * 32767).astype(np.int16))
    print(f'soundtrack → {sys.argv[2]}  ({x.shape[1] / SR:.2f}s)')


if __name__ == '__main__':
    main()
